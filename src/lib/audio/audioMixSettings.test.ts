import { beforeEach, describe, expect, it } from 'vitest';
import {
  MUSIC_LEVEL_CAP,
  effectiveChannelVolume,
  getAudioMixSettings,
  isChannelAudible,
  resetAudioMixCacheForTests,
  setAudioChannel,
} from './audioMixSettings';

describe('audioMixSettings', () => {
  beforeEach(() => {
    localStorage.clear();
    resetAudioMixCacheForTests();
  });

  it('defaults every channel to enabled', () => {
    const mix = getAudioMixSettings();
    expect(mix.master.enabled).toBe(true);
    expect(mix.music.enabled).toBe(true);
    expect(mix.atmosphere.enabled).toBe(true);
    expect(mix.cues.enabled).toBe(true);
  });

  it('migrates the legacy scattered keys on first read', () => {
    localStorage.setItem('seihouse-audio-muted', 'true');
    localStorage.setItem('seihouse-audio-volume', '0.35');
    localStorage.setItem('seihouse-bgm-volume', '0.2');

    const mix = getAudioMixSettings();
    // Old single mute switch becomes the master switch.
    expect(mix.master.enabled).toBe(false);
    // Old shared volume seeds both atmosphere and cues.
    expect(mix.atmosphere.volume).toBeCloseTo(0.35);
    expect(mix.cues.volume).toBeCloseTo(0.35);
    // Old BGM gain (0..cap) rescales onto the 0..1 slider so the effective
    // loudness is unchanged.
    expect(mix.music.volume).toBeCloseTo(0.2 / MUSIC_LEVEL_CAP);
    expect(effectiveChannelVolume('music', { ...mix, master: { enabled: true, volume: 1 } }) * MUSIC_LEVEL_CAP)
      .toBeCloseTo(0.2);
  });

  it('persists channel updates and broadcasts a change event', () => {
    const events: unknown[] = [];
    const listener = (e: Event) => events.push((e as CustomEvent).detail);
    window.addEventListener('seihouse-audio-mix-changed', listener);
    try {
      setAudioChannel('atmosphere', { volume: 0.8 });
      resetAudioMixCacheForTests();
      expect(getAudioMixSettings().atmosphere.volume).toBeCloseTo(0.8);
      expect(events).toHaveLength(1);
    } finally {
      window.removeEventListener('seihouse-audio-mix-changed', listener);
    }
  });

  it('master off silences every channel without erasing their settings', () => {
    setAudioChannel('music', { volume: 0.3 });
    setAudioChannel('atmosphere', { volume: 0.6 });

    setAudioChannel('master', { enabled: false });
    expect(effectiveChannelVolume('music')).toBe(0);
    expect(effectiveChannelVolume('atmosphere')).toBe(0);
    expect(effectiveChannelVolume('cues')).toBe(0);
    expect(isChannelAudible('atmosphere')).toBe(false);

    // Turning master back on restores the exact same individual levels.
    setAudioChannel('master', { enabled: true });
    expect(effectiveChannelVolume('music')).toBeCloseTo(0.3);
    expect(effectiveChannelVolume('atmosphere')).toBeCloseTo(0.6);
  });

  it('composes channel volume with the master level', () => {
    setAudioChannel('master', { volume: 0.5 });
    setAudioChannel('cues', { volume: 0.8 });
    expect(effectiveChannelVolume('cues')).toBeCloseTo(0.4);

    setAudioChannel('cues', { enabled: false });
    expect(effectiveChannelVolume('cues')).toBe(0);
    // The channel's own switch never leaks into other channels.
    expect(effectiveChannelVolume('atmosphere')).toBeGreaterThan(0);
  });

  it('clamps volumes into 0..1', () => {
    setAudioChannel('music', { volume: 4 });
    expect(getAudioMixSettings().music.volume).toBe(1);
    setAudioChannel('music', { volume: -2 });
    expect(getAudioMixSettings().music.volume).toBe(0);
  });
});
