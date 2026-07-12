import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { AtmosphericAudio } from './AtmosphericAudio';

const storeState = {
  currentScreen: 'reader',
  immersion: { master: true, audioCues: true, imagePopups: true, sceneMusic: true, autoScroll: true },
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

vi.mock('@seihouse/audio-player', () => ({
  createSceneMixEngine: () => sceneMixEngine,
}));

const makeParam = () => ({
  value: 0,
  setValueAtTime: vi.fn(),
  linearRampToValueAtTime: vi.fn(),
  exponentialRampToValueAtTime: vi.fn(),
  setTargetAtTime: vi.fn(),
});

const makeNode = () => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  type: '',
  loop: false,
  buffer: null as unknown,
  frequency: makeParam(),
  Q: makeParam(),
  gain: makeParam(),
});

class MockAudioContext {
  static created = 0;
  static lastInstance: MockAudioContext | null = null;
  currentTime = 0;
  state = 'running';
  sampleRate = 44100;
  destination = {};
  oscillatorsStarted = 0;
  resume = vi.fn(() => Promise.resolve());
  createGain = vi.fn(() => makeNode());
  createBufferSource = vi.fn(() => makeNode());
  createBiquadFilter = vi.fn(() => makeNode());
  createBuffer = vi.fn(() => ({ getChannelData: () => new Float32Array(128) }));
  createOscillator = vi.fn(() => {
    const node = makeNode();
    node.start = vi.fn(() => { this.oscillatorsStarted += 1; });
    return node;
  });
  constructor() {
    MockAudioContext.created += 1;
    MockAudioContext.lastInstance = this;
  }
}

const dispatchCue = (detail: Record<string, unknown>) => {
  act(() => {
    window.dispatchEvent(new CustomEvent('narrative-cue', { detail }));
  });
};

beforeEach(() => {
  localStorage.clear();
  MockAudioContext.created = 0;
  MockAudioContext.lastInstance = null;
  sceneMixEngine.crossfadeTo.mockClear();
  vi.stubGlobal('AudioContext', MockAudioContext);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AtmosphericAudio', () => {
  it('renders without crashing', () => {
    const { container } = render(<AtmosphericAudio />);
    expect(container).toBeDefined();
  });

  it('no longer plays automatic footsteps or environment Foley cues', () => {
    render(<AtmosphericAudio />);
    for (const legacy of ['footsteps', 'footsteps_snow', 'footsteps_wood', 'footsteps_stone', 'wind howling', 'territory ambience']) {
      dispatchCue({ id: `fx-${legacy}`, type: 'narrative.fx.play', value: legacy });
    }
    // Suppressed cues never even open an AudioContext, let alone synthesize.
    expect(MockAudioContext.created).toBe(0);
  });

  it('still plays high-confidence one-shot cues', () => {
    render(<AtmosphericAudio />);
    dispatchCue({ id: 'fx-alert', type: 'narrative.fx.play', value: 'system_alert' });
    expect(MockAudioContext.created).toBe(1);
    expect(MockAudioContext.lastInstance?.oscillatorsStarted).toBeGreaterThan(0);
  });

  it('no longer fires one-shot effects from broad metadata signatures', () => {
    render(<AtmosphericAudio />);
    // These payloads used to trigger qi-surge / major-hit / fate-shift /
    // chime one-shots straight from metadata, in every reader mode and with
    // no governor budget. That path is gone.
    dispatchCue({ id: 'meta-1', type: 'narrative.metadata.signature', metadata: { powerShift: 0.9 } });
    dispatchCue({ id: 'meta-2', type: 'narrative.metadata.signature', metadata: { playChime: true } });
    expect(MockAudioContext.created).toBe(0);
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

  it('keeps the atmosphere bed reacting to environment metadata', async () => {
    const states: Array<{ atmosphere?: string }> = [];
    const onState = (e: Event) => states.push((e as CustomEvent).detail);
    window.addEventListener('seihouse-audio-state', onState);

    render(<AtmosphericAudio />);
    dispatchCue({
      id: 'meta-rain',
      type: 'narrative.metadata.signature',
      metadata: { environment: ['rain'] },
    });

    await waitFor(() =>
      expect(states.some((s) => s.atmosphere === 'rain')).toBe(true),
    );
    window.removeEventListener('seihouse-audio-state', onState);
  });
});
