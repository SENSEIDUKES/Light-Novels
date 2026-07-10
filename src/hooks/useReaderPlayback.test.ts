import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useReaderPlayback, extractSFXCues } from './useReaderPlayback';
import { useAppStore } from '../store/useAppStore';

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
