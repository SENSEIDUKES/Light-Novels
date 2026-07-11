import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useVoicePreferences } from './useVoicePreferences';
import { pickDefaultSideVoice } from '../../lib/voice/webSpeechCast';

vi.mock('../../lib/voice/webSpeechCast', () => ({ pickDefaultSideVoice: vi.fn() }));

describe('useVoicePreferences', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('selects distinct narrator, dialogue, and side voice defaults when voices load', () => {
    const voices = [
      { name: 'Daniel', lang: 'en-US', voiceURI: 'narrator' },
      { name: 'Rishi', lang: 'en-US', voiceURI: 'dialogue' },
      { name: 'Maya', lang: 'en-GB', voiceURI: 'side' },
    ] as SpeechSynthesisVoice[];
    const speechSynthesis = { getVoices: vi.fn(() => voices), onvoiceschanged: null as any };
    vi.stubGlobal('speechSynthesis', speechSynthesis);
    vi.mocked(pickDefaultSideVoice).mockReturnValue(voices[2]);

    const { result, unmount } = renderHook(() => useVoicePreferences());

    expect(result.current.availableVoices).toEqual(voices);
    expect(result.current.selectedVoiceURI).toBe('narrator');
    expect(result.current.selectedDialogueVoiceURI).toBe('dialogue');
    expect(result.current.selectedSideVoiceURI).toBe('side');
    expect(pickDefaultSideVoice).toHaveBeenCalledWith(voices, 'narrator', 'dialogue');
    expect(typeof speechSynthesis.onvoiceschanged).toBe('function');

    unmount();
    expect(speechSynthesis.onvoiceschanged).toBeUndefined();
  });

  it('leaves defaults empty when the browser has no voices yet', () => {
    const speechSynthesis = { getVoices: vi.fn(() => []), onvoiceschanged: null as any };
    vi.stubGlobal('speechSynthesis', speechSynthesis);

    const { result, unmount } = renderHook(() => useVoicePreferences());

    expect(result.current.availableVoices).toEqual([]);
    expect(result.current.selectedVoiceURI).toBe('');
    expect(result.current.selectedDialogueVoiceURI).toBe('');
    expect(result.current.selectedSideVoiceURI).toBe('');
    unmount();
  });
});
