import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { AtmosphericAudio } from './AtmosphericAudio';
import { resetAudioMixCacheForTests, setAudioChannel } from '../lib/audio/audioMixSettings';
import { dispatchNarration } from '../lib/narrativeCues';

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

type EngineMock = {
  setMuted: ReturnType<typeof vi.fn>;
  setLevel: ReturnType<typeof vi.fn>;
  crossfadeTo: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
};

// The hook creates the score engine first, the atmosphere engine second.
const engines: EngineMock[] = [];
const makeEngine = (): EngineMock => ({
  setMuted: vi.fn(),
  setLevel: vi.fn(),
  crossfadeTo: vi.fn(),
  stop: vi.fn(),
  dispose: vi.fn(),
});

vi.mock('@seihouse/audio-player', () => ({
  createSceneMixEngine: () => {
    const engine = makeEngine();
    engines.push(engine);
    return engine;
  },
}));

const playCardSound = vi.fn((..._args: unknown[]) => Promise.resolve({} as HTMLAudioElement));
vi.mock('../lib/audio/cardSoundPlayer', () => ({
  playCardSound: (...args: unknown[]) => playCardSound(...args),
}));

// Curated catalog stand-in: tests provide a few tagged catalog entries without
// making production ship a fixed variation list.
vi.mock('../lib/audio/ambienceSoundCatalog', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/audio/ambienceSoundCatalog')>();
  return {
    ...original,
    ATMOSPHERE_BED_CATALOG: [
      { id: 'atmosphere.rain.steady', category: 'rain', tags: ['rain'], url: 'https://cdn.test/rain.mp3' },
    ],
    resolveAtmosphereBed: (metadata?: { environment?: string[]; sceneType?: string }) => {
      if (metadata?.environment?.includes('rain')) {
        return { id: 'atmosphere.rain.steady', category: 'rain', tags: ['rain'], url: 'https://cdn.test/rain.mp3' };
      }
      if (metadata?.environment?.some(tag => ['coast', 'sea', 'ocean'].includes(tag))) {
        return { id: 'atmosphere.waves.coast', category: 'waves', tags: ['coast'], url: 'https://cdn.test/waves.mp3' };
      }
      if (metadata?.environment?.includes('mountain')) {
        return { id: 'atmosphere.wind.mountain', category: 'wind', tags: ['mountain'], url: 'https://cdn.test/wind.mp3' };
      }
      return null;
    },
    resolveNarrativeCueSound: (name: string) =>
      name === 'system_alert' ? { id: 'cue.system_alert', url: 'https://cdn.test/alert.mp3' } : null,
  };
});

const scoreEngine = () => engines[0];
const atmoEngine = () => engines[1];

const dispatchCue = (detail: Record<string, unknown>) => {
  act(() => {
    window.dispatchEvent(new CustomEvent('narrative-cue', { detail }));
  });
};

beforeEach(() => {
  localStorage.clear();
  resetAudioMixCacheForTests();
  engines.length = 0;
  playCardSound.mockClear();
});

describe('AtmosphericAudio', () => {
  it('renders without crashing and creates the SAP engines', () => {
    const { container } = render(<AtmosphericAudio />);
    expect(container).toBeDefined();
    expect(engines).toHaveLength(2);
  });

  it('restores a persisted curated atmosphere asset after reload', async () => {
    localStorage.setItem('seihouse-audio-atmosphere', 'atmosphere.rain.steady');
    render(<AtmosphericAudio />);

    await waitFor(() => expect(atmoEngine().crossfadeTo).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'atmosphere.rain.steady', audioFile: 'https://cdn.test/rain.mp3' }),
    ));
  });

  it('no longer plays automatic footsteps or environment Foley cues', () => {
    render(<AtmosphericAudio />);
    for (const legacy of ['footsteps', 'footsteps_snow', 'footsteps_wood', 'footsteps_stone', 'wind howling', 'territory ambience']) {
      dispatchCue({ id: `fx-${legacy}`, type: 'narrative.fx.play', value: legacy });
    }
    // Suppressed cues never reach the curated one-shot player.
    expect(playCardSound).not.toHaveBeenCalled();
  });

  it('plays high-confidence one-shot cues from the curated catalog', () => {
    render(<AtmosphericAudio />);
    dispatchCue({ id: 'fx-alert', type: 'narrative.fx.play', value: 'system_alert' });
    expect(playCardSound).toHaveBeenCalledWith(
      { id: 'cue.system_alert', url: 'https://cdn.test/alert.mp3' },
      { volume: expect.any(Number) },
    );
  });

  it('stays silent for cues without a curated asset', () => {
    render(<AtmosphericAudio />);
    // breakthrough is high-confidence but has no URL in the test catalog.
    dispatchCue({ id: 'fx-surge', type: 'narrative.fx.play', value: 'breakthrough' });
    expect(playCardSound).not.toHaveBeenCalled();
  });

  it('suppresses one-shot cues while Audio Cues (or Master Audio) is off', () => {
    render(<AtmosphericAudio />);

    act(() => { setAudioChannel('cues', { enabled: false }); });
    dispatchCue({ id: 'fx-alert-1', type: 'narrative.fx.play', value: 'system_alert' });
    expect(playCardSound).not.toHaveBeenCalled();

    act(() => {
      setAudioChannel('cues', { enabled: true });
      setAudioChannel('master', { enabled: false });
    });
    dispatchCue({ id: 'fx-alert-2', type: 'narrative.fx.play', value: 'system_alert' });
    expect(playCardSound).not.toHaveBeenCalled();
  });

  it('no longer fires one-shot effects from broad metadata signatures', () => {
    render(<AtmosphericAudio />);
    // These payloads used to trigger qi-surge / major-hit / fate-shift /
    // chime one-shots straight from metadata, in every reader mode and with
    // no governor budget. That path is gone.
    dispatchCue({ id: 'meta-1', type: 'narrative.metadata.signature', metadata: { powerShift: 0.9 } });
    dispatchCue({ id: 'meta-2', type: 'narrative.metadata.signature', metadata: { playChime: true } });
    expect(playCardSound).not.toHaveBeenCalled();
  });

  it('keeps scene-score music driven by metadata signatures', async () => {
    render(<AtmosphericAudio />);
    dispatchCue({
      id: 'meta-music',
      type: 'narrative.metadata.signature',
      metadata: { music: { mood: 'adventure' }, intensity: 0.5 },
    });
    await waitFor(() => expect(scoreEngine().crossfadeTo).toHaveBeenCalled());
  });

  it('selects the chapter opening atmosphere from tagged metadata', async () => {
    const states: Array<{ atmosphere?: string }> = [];
    const onState = (e: Event) => states.push((e as CustomEvent).detail);
    window.addEventListener('seihouse-audio-state', onState);

    render(<AtmosphericAudio />);
    dispatchCue({
      id: 'chapter-rain',
      type: 'narrative.chapter.enter',
      value: { environment: ['rain'] },
    });

    await waitFor(() => expect(states.some((s) => s.atmosphere === 'rain')).toBe(true));
    expect(atmoEngine().crossfadeTo).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'atmosphere.rain.steady', audioFile: 'https://cdn.test/rain.mp3' }),
    );
    window.removeEventListener('seihouse-audio-state', onState);
  });

  it('does not change the chapter atmosphere while manually reading', async () => {
    render(<AtmosphericAudio />);
    dispatchCue({ id: 'chapter-rain', type: 'narrative.chapter.enter', value: { environment: ['rain'] } });
    await waitFor(() => expect(atmoEngine().crossfadeTo).toHaveBeenCalled());
    atmoEngine().crossfadeTo.mockClear();

    dispatchCue({ id: 'meta-mountain', type: 'narrative.metadata.signature', metadata: { environment: ['mountain'] } });
    expect(atmoEngine().crossfadeTo).not.toHaveBeenCalled();
  });

  it('honors a manual choice to silence the atmosphere', async () => {
    render(<AtmosphericAudio />);
    dispatchCue({ id: 'chapter-rain', type: 'narrative.chapter.enter', value: { environment: ['rain'] } });
    await waitFor(() => expect(atmoEngine().crossfadeTo).toHaveBeenCalled());

    act(() => {
      window.dispatchEvent(new CustomEvent('seihouse-audio-control', { detail: { atmosphere: 'none' } }));
    });

    await waitFor(() => expect(atmoEngine().stop).toHaveBeenCalled());
  });

  it('crossfades to a stronger tagged scene match while narration is playing', async () => {
    render(<AtmosphericAudio />);
    dispatchCue({ id: 'chapter-rain', type: 'narrative.chapter.enter', value: { environment: ['rain'] } });
    await waitFor(() => expect(atmoEngine().crossfadeTo).toHaveBeenCalled());
    atmoEngine().crossfadeTo.mockClear();

    act(() => { dispatchNarration({ status: 'start' }); });
    dispatchCue({ id: 'meta-coast', type: 'narrative.metadata.signature', metadata: { environment: ['coast', 'sea'] } });

    await waitFor(() => expect(atmoEngine().crossfadeTo).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'atmosphere.waves.coast', audioFile: 'https://cdn.test/waves.mp3' }),
    ));
    act(() => { dispatchNarration({ status: 'end' }); });
  });

  it('does not turn travel into rain without matching environment tags', async () => {
    render(<AtmosphericAudio />);
    dispatchCue({
      id: 'chapter-travel-coast',
      type: 'narrative.chapter.enter',
      value: { sceneType: 'travel', environment: ['coast'] },
    });

    await waitFor(() => expect(atmoEngine().crossfadeTo).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'atmosphere.waves.coast', audioFile: 'https://cdn.test/waves.mp3' }),
    ));
  });

  it('re-levels the engines from the audio mix without erasing settings', () => {
    render(<AtmosphericAudio />);
    act(() => { setAudioChannel('master', { enabled: false }); });
    expect(scoreEngine().setMuted).toHaveBeenLastCalledWith(true);
    expect(scoreEngine().setLevel).toHaveBeenLastCalledWith(0);
    expect(atmoEngine().setMuted).toHaveBeenLastCalledWith(true);

    act(() => { setAudioChannel('master', { enabled: true }); });
    expect(scoreEngine().setMuted).toHaveBeenLastCalledWith(false);
    const lastLevel = scoreEngine().setLevel.mock.calls.at(-1)?.[0] as number;
    expect(lastLevel).toBeGreaterThan(0);
  });
});
