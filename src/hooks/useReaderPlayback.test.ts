import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
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
      containerRef: { current: null },
    }));

    expect(result.current.isPlayingText).toBe(false);
    expect(result.current.isPausedText).toBe(false);
    expect(result.current.speechRate).toBe(1.0);
  });
});
