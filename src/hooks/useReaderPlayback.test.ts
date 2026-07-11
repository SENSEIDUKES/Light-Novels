import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useReaderPlayback, extractSFXCues } from './useReaderPlayback';
import { useAppStore } from '../store/useAppStore';
import { dispatchNarration } from '../lib/narrativeCues';

vi.mock('../lib/narrativeCues', () => ({
  dispatchNarration: vi.fn(),
  dispatchNarrativeCue: vi.fn(),
}));

describe('useReaderPlayback', () => {
  it('extractSFXCues extracts SFX from text', () => {
    const rawText = "The dragon roared [SFX: roar_loud] and flew away.";
    const result = extractSFXCues(rawText);
    expect(result.sfxList).toContain('roar_loud');
    expect(result.cleanText).toContain('The dragon roared  and flew away.');
  });

  it('initializes playback state correctly', () => {
    const { result } = renderHook(() => useReaderPlayback({
      selectedChapter: {} as any,
      activeTranslationContent: null,
    }));

    expect(result.current.isPlayingText).toBe(false);
    expect(result.current.isPausedText).toBe(false);
    expect(result.current.speechRate).toBe(1.0);
  });

  describe('auto-continue (listening mode)', () => {
    afterEach(() => {
      useAppStore.getState().setAutoPlayNarration(false);
      useAppStore.setState({ readerMode: 'teleprompter', isGenerating: false, streamingChapter: null });
    });

    it('auto-starts narration for a ready chapter when listening mode is on', () => {
      vi.useFakeTimers();
      try {
        useAppStore.setState({ readerMode: 'teleprompter', isGenerating: false, streamingChapter: null });
        useAppStore.getState().setAutoPlayNarration(true);

        renderHook(() => useReaderPlayback({
          selectedChapter: { number: 3, generatedContent: 'Some chapter prose to narrate.' } as any,
          activeTranslationContent: null,

        }));

        // The auto-start is deferred — nothing should happen before its timer.
        expect(useAppStore.getState().readerMode).toBe('teleprompter');

        act(() => { vi.advanceTimersByTime(600); });

        // handleTogglePlayback was invoked → left teleprompter for a narration mode.
        expect(useAppStore.getState().readerMode).not.toBe('teleprompter');
      } finally {
        vi.useRealTimers();
      }
    });

    it('does NOT auto-start when listening mode is off', () => {
      vi.useFakeTimers();
      try {
        useAppStore.setState({ readerMode: 'teleprompter', isGenerating: false, streamingChapter: null });
        useAppStore.getState().setAutoPlayNarration(false);

        renderHook(() => useReaderPlayback({
          selectedChapter: { number: 4, generatedContent: 'Prose that should stay silent.' } as any,
          activeTranslationContent: null,

        }));

        act(() => { vi.advanceTimersByTime(600); });

        expect(useAppStore.getState().readerMode).toBe('teleprompter');
      } finally {
        vi.useRealTimers();
      }
    });

    it('does NOT re-loop a manually started chapter when its narration ends', () => {
      vi.useFakeTimers();
      // Minimal Web Speech stubs so handleTogglePlayback takes the TTS path.
      const spoken: any[] = [];
      class FakeUtterance {
        text: string;
        onend: (() => void) | null = null;
        onerror: ((e: any) => void) | null = null;
        voice: any; rate = 1; pitch = 1; volume = 1;
        constructor(text: string) { this.text = text; }
      }
      vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance as any);
      vi.stubGlobal('speechSynthesis', {
        cancel: vi.fn(),
        speak: (u: any) => spoken.push(u),
        speaking: false,
        getVoices: () => [],
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        onvoiceschanged: undefined,
      });
      try {
        useAppStore.setState({ readerMode: 'teleprompter', isGenerating: false, streamingChapter: null });
        useAppStore.getState().setAutoPlayNarration(false);

        const { result, unmount } = renderHook(() => useReaderPlayback({
          selectedChapter: { number: 6, title: 'Finale', generatedContent: 'One line of prose.' } as any,
          activeTranslationContent: null,
        }));

        // User presses play — enters listening mode and starts narration.
        act(() => { result.current.handleTogglePlayback(); });
        expect(useAppStore.getState().autoPlayNarration).toBe(true);
        expect(result.current.isPlayingText).toBe(true);

        // Drive every queued utterance to completion.
        for (let i = 0; i < 30 && result.current.isPlayingText; i++) {
          const u = spoken.find((s) => !s.done);
          if (u) { u.done = true; act(() => { u.onend?.(); }); }
          act(() => { vi.advanceTimersByTime(100); });
        }
        expect(result.current.isPlayingText).toBe(false);

        // Listening mode stays on for the NEXT chapter, but the finished
        // chapter must not restart from the top.
        const startsBefore = (dispatchNarration as any).mock.calls
          .filter((c: any[]) => c[0]?.status === 'start').length;
        act(() => { vi.advanceTimersByTime(1000); });
        const startsAfter = (dispatchNarration as any).mock.calls
          .filter((c: any[]) => c[0]?.status === 'start').length;
        expect(useAppStore.getState().autoPlayNarration).toBe(true);
        expect(startsAfter).toBe(startsBefore);
        expect(result.current.isPlayingText).toBe(false);
        unmount(); // before unstubbing — cleanup effects touch speechSynthesis
      } finally {
        vi.useRealTimers();
        vi.unstubAllGlobals();
      }
    });

    it('does NOT re-loop when play is pressed manually while an auto-start is pending', () => {
      vi.useFakeTimers();
      const spoken: any[] = [];
      class FakeUtterance {
        text: string;
        onend: (() => void) | null = null;
        onerror: ((e: any) => void) | null = null;
        voice: any; rate = 1; pitch = 1; volume = 1;
        constructor(text: string) { this.text = text; }
      }
      vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance as any);
      vi.stubGlobal('speechSynthesis', {
        cancel: vi.fn(),
        speak: (u: any) => spoken.push(u),
        speaking: false,
        getVoices: () => [],
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        onvoiceschanged: undefined,
      });
      try {
        useAppStore.setState({ readerMode: 'teleprompter', isGenerating: false, streamingChapter: null });
        // Listening mode already on: the auto-continue effect schedules its
        // deferred start for this chapter as soon as it renders.
        useAppStore.getState().setAutoPlayNarration(true);

        const { result, unmount } = renderHook(() => useReaderPlayback({
          selectedChapter: { number: 8, title: 'Race', generatedContent: 'Prose for the race window.' } as any,
          activeTranslationContent: null,
        }));

        // Inside the 500ms window, the user presses play manually. The pending
        // auto-start's cleanup must NOT wipe the started-chapter marker.
        act(() => { vi.advanceTimersByTime(100); });
        act(() => { result.current.handleTogglePlayback(); });
        expect(result.current.isPlayingText).toBe(true);

        // Drive narration to completion.
        for (let i = 0; i < 30 && result.current.isPlayingText; i++) {
          const u = spoken.find((s) => !s.done);
          if (u) { u.done = true; act(() => { u.onend?.(); }); }
          act(() => { vi.advanceTimersByTime(100); });
        }
        expect(result.current.isPlayingText).toBe(false);

        // The finished chapter must not auto-restart.
        const startsBefore = (dispatchNarration as any).mock.calls
          .filter((c: any[]) => c[0]?.status === 'start').length;
        act(() => { vi.advanceTimersByTime(1000); });
        const startsAfter = (dispatchNarration as any).mock.calls
          .filter((c: any[]) => c[0]?.status === 'start').length;
        expect(startsAfter).toBe(startsBefore);
        expect(result.current.isPlayingText).toBe(false);
        unmount();
      } finally {
        vi.useRealTimers();
        vi.unstubAllGlobals();
      }
    });

    it('does NOT auto-start while the chapter is still generating', () => {
      vi.useFakeTimers();
      try {
        useAppStore.setState({ readerMode: 'teleprompter', isGenerating: true, streamingChapter: null });
        useAppStore.getState().setAutoPlayNarration(true);

        renderHook(() => useReaderPlayback({
          selectedChapter: { number: 5, generatedContent: 'Partially streamed prose...' } as any,
          activeTranslationContent: null,

        }));

        act(() => { vi.advanceTimersByTime(600); });

        expect(useAppStore.getState().readerMode).toBe('teleprompter');
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
