import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { AtmosphericAudio } from './AtmosphericAudio';
import { resetAudioMixCacheForTests, setAudioChannel } from '../lib/audio/audioMixSettings';

const storeState = {
  currentScreen: 'reader',
  immersion: { master: true, imagePopups: true, autoScroll: true },
};

vi.mock('../store/useAppStore', () => {
  const useAppStore = (selector?: (state: typeof storeState) => unknown) =>
    selector ? selector(storeState) : storeState;
  useAppStore.getState = () => storeState;
  return { useAppStore };
});

const sceneMixEngine = {
  setMuted: vi.fn(),
  setLevel: vi.fn(),
  crossfadeTo: vi.fn(),
  dispose: vi.fn(),
};

const spriteEngine = {
  load: vi.fn(() => Promise.resolve()),
  ready: vi.fn(() => Promise.resolve()),
  play: vi.fn(() => 'instance-1'),
  stop: vi.fn(),
  fade: vi.fn(),
  fadeOut: vi.fn(),
  stopAll: vi.fn(),
  setMasterVolume: vi.fn(),
  getMasterVolume: vi.fn(() => 1),
  dispose: vi.fn(),
};

vi.mock('@seihouse/audio-player', () => ({
  createSceneMixEngine: () => sceneMixEngine,
  createAudioSpriteEngine: () => spriteEngine,
}));

// The pack is rendered through OfflineAudioContext, which jsdom lacks; the
// engines above are mocks anyway, so a stub manifest is all that's needed.
vi.mock('../lib/audio/proceduralAudioPack', () => ({
  ensureProceduralAudioPack: vi.fn(() =>
    Promise.resolve({ src: 'blob:pack', clips: {} }),
  ),
}));

const dispatchCue = (detail: Record<string, unknown>) => {
  act(() => {
    window.dispatchEvent(new CustomEvent('narrative-cue', { detail }));
  });
};

const flushAsync = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  localStorage.clear();
  resetAudioMixCacheForTests();
  sceneMixEngine.crossfadeTo.mockClear();
  sceneMixEngine.setLevel.mockClear();
  sceneMixEngine.setMuted.mockClear();
  spriteEngine.play.mockClear();
  spriteEngine.load.mockClear();
  spriteEngine.setMasterVolume.mockClear();
  spriteEngine.fadeOut.mockClear();
});

describe('AtmosphericAudio', () => {
  it('renders without crashing', () => {
    const { container } = render(<AtmosphericAudio />);
    expect(container).toBeDefined();
  });

  it('no longer plays automatic footsteps or environment Foley cues', async () => {
    render(<AtmosphericAudio />);
    for (const legacy of ['footsteps', 'footsteps_snow', 'footsteps_wood', 'footsteps_stone', 'wind howling', 'territory ambience']) {
      dispatchCue({ id: `fx-${legacy}`, type: 'narrative.fx.play', value: legacy });
    }
    await flushAsync();
    // Suppressed cues never even touch the SAP sprite engine.
    expect(spriteEngine.play).not.toHaveBeenCalled();
  });

  it('plays high-confidence one-shot cues through the SAP sprite engine', async () => {
    render(<AtmosphericAudio />);
    dispatchCue({ id: 'fx-alert', type: 'narrative.fx.play', value: 'system_alert' });
    await waitFor(() => expect(spriteEngine.play).toHaveBeenCalledWith('system_alert'));
  });

  it('suppresses one-shot cues while Audio Cues (or Master Audio) is off', async () => {
    render(<AtmosphericAudio />);

    act(() => { setAudioChannel('cues', { enabled: false }); });
    dispatchCue({ id: 'fx-alert-1', type: 'narrative.fx.play', value: 'system_alert' });
    await flushAsync();
    expect(spriteEngine.play).not.toHaveBeenCalled();

    act(() => {
      setAudioChannel('cues', { enabled: true });
      setAudioChannel('master', { enabled: false });
    });
    dispatchCue({ id: 'fx-alert-2', type: 'narrative.fx.play', value: 'system_alert' });
    await flushAsync();
    expect(spriteEngine.play).not.toHaveBeenCalled();
  });

  it('no longer fires one-shot effects from broad metadata signatures', async () => {
    render(<AtmosphericAudio />);
    // These payloads used to trigger qi-surge / major-hit / fate-shift /
    // chime one-shots straight from metadata, in every reader mode and with
    // no governor budget. That path is gone.
    dispatchCue({ id: 'meta-1', type: 'narrative.metadata.signature', metadata: { powerShift: 0.9 } });
    dispatchCue({ id: 'meta-2', type: 'narrative.metadata.signature', metadata: { playChime: true } });
    await flushAsync();
    expect(spriteEngine.play).not.toHaveBeenCalled();
  });

  it('keeps scene-score music driven by metadata signatures', async () => {
    render(<AtmosphericAudio />);
    dispatchCue({
      id: 'meta-music',
      type: 'narrative.metadata.signature',
      metadata: { music: { mood: 'adventure' }, intensity: 0.5 },
    });
    await waitFor(() => expect(sceneMixEngine.crossfadeTo).toHaveBeenCalled());
  });

  it('starts the atmosphere bed loop on the SAP sprite engine from environment metadata', async () => {
    const states: Array<{ atmosphere?: string }> = [];
    const onState = (e: Event) => states.push((e as CustomEvent).detail);
    window.addEventListener('seihouse-audio-state', onState);

    render(<AtmosphericAudio />);
    dispatchCue({
      id: 'meta-rain',
      type: 'narrative.metadata.signature',
      metadata: { environment: ['rain'] },
    });

    await waitFor(() => expect(states.some((s) => s.atmosphere === 'rain')).toBe(true));
    await waitFor(() => expect(spriteEngine.play).toHaveBeenCalledWith('rain', { loop: true }));
    window.removeEventListener('seihouse-audio-state', onState);
  });

  it('re-levels the music engine from the audio mix without erasing settings', () => {
    render(<AtmosphericAudio />);
    act(() => { setAudioChannel('master', { enabled: false }); });
    expect(sceneMixEngine.setMuted).toHaveBeenLastCalledWith(true);
    expect(sceneMixEngine.setLevel).toHaveBeenLastCalledWith(0);

    act(() => { setAudioChannel('master', { enabled: true }); });
    expect(sceneMixEngine.setMuted).toHaveBeenLastCalledWith(false);
    const lastLevel = sceneMixEngine.setLevel.mock.calls.at(-1)?.[0] as number;
    expect(lastLevel).toBeGreaterThan(0);
  });
});
