import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAudioSettings } from './useAudioSettings';

describe('useAudioSettings', () => {
  beforeEach(() => localStorage.clear());

  it('hydrates persisted settings and broadcasts user changes to the audio player', () => {
    localStorage.setItem('seihouse-audio-muted', 'true');
    localStorage.setItem('seihouse-audio-atmosphere', 'rain');
    localStorage.setItem('seihouse-audio-volume', '0.35');
    const controlEvents: any[] = [];
    const listener = (event: Event) => controlEvents.push((event as CustomEvent).detail);
    window.addEventListener('seihouse-audio-control', listener);
    let unmount: (() => void) | undefined;
    try {
      const rendered = renderHook(() => useAudioSettings());
      unmount = rendered.unmount;

      expect(rendered.result.current).toMatchObject({ isMuted: true, atmosphere: 'rain', volume: 0.35 });

      act(() => {
        rendered.result.current.handleMuteToggle(false);
        rendered.result.current.handleAtmosphereChange('forest');
        rendered.result.current.handleVolumeChange(0.8);
      });

      expect(localStorage.getItem('seihouse-audio-muted')).toBe('false');
      expect(localStorage.getItem('seihouse-audio-atmosphere')).toBe('forest');
      expect(localStorage.getItem('seihouse-audio-volume')).toBe('0.8');
      expect(controlEvents).toEqual([{ isMuted: false }, { atmosphere: 'forest' }, { volume: 0.8 }]);
    } finally {
      unmount?.();
      window.removeEventListener('seihouse-audio-control', listener);
    }
  });

  it('reacts to state changes sent by the audio player', () => {
    const { result } = renderHook(() => useAudioSettings());

    act(() => {
      window.dispatchEvent(new CustomEvent('seihouse-audio-state', {
        detail: { isMuted: true, atmosphere: 'thunder', volume: 0.2 },
      }));
    });

    expect(result.current).toMatchObject({ isMuted: true, atmosphere: 'thunder', volume: 0.2 });
  });
});
