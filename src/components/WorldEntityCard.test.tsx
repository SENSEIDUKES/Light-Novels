import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorldEntityCard } from './WorldEntityCard';
import { WorldCardEvent } from '../types';
import { cinematicEffectGovernor } from '../lib/effects/cinematicEffectGovernor';
import { resetCardSoundCacheForTests } from '../lib/audio/cardSoundPlayer';
import { resetAudioMixCacheForTests, setAudioChannel } from '../lib/audio/audioMixSettings';

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, className }: any) => <div className={className}>{children}</div>,
  }
}));

class MockAudio {
  static instances: MockAudio[] = [];
  src: string;
  volume = 1;
  currentTime = 0;
  preload = '';
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
  constructor(src: string) {
    this.src = src;
    MockAudio.instances.push(this);
  }
}

const speechSynthesisMock = {
  cancel: vi.fn(),
  speak: vi.fn(),
  getVoices: vi.fn(() => []),
};

class MockUtterance {
  text: string;
  voice: unknown;
  rate = 1;
  pitch = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

const beastCard: WorldCardEvent = {
  entityName: 'Test Beast',
  entityType: 'creature',
  displayTitle: 'Beast Title',
  quote: 'A loud roar.',
  imageUrl: 'http://test',
  audioText: 'Roar',
  audioType: 'roar',
};

beforeEach(() => {
  MockAudio.instances = [];
  vi.stubGlobal('Audio', MockAudio);
  vi.stubGlobal('speechSynthesis', speechSynthesisMock);
  vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);
  resetCardSoundCacheForTests();
  localStorage.clear();
  resetAudioMixCacheForTests();
});

afterEach(() => {
  resetCardSoundCacheForTests();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('WorldEntityCard', () => {
  it('renders correctly', () => {
    const { getByText } = render(<WorldEntityCard card={beastCard} />);
    expect(getByText('Beast Title')).toBeDefined();
    expect(getByText('"A loud roar."')).toBeDefined();
    expect(getByText('Tap to Listen')).toBeDefined();
  });

  it('plays the curated catalog asset for an SFX card on tap', async () => {
    const { getByText } = render(<WorldEntityCard card={beastCard} />);
    fireEvent.click(getByText('Tap to Listen'));

    await waitFor(() => expect(getByText('Resonating...')).toBeDefined());
    expect(MockAudio.instances).toHaveLength(1);
    expect(MockAudio.instances[0].src).toBe(
      'https://celestialaudio.seihouse.org/AUDIO/SFX/BEAST/GENERIC_ROAR.mp3',
    );
  });

  it('replays the same cached asset on repeated taps', async () => {
    const { getByText } = render(<WorldEntityCard card={beastCard} />);

    fireEvent.click(getByText('Tap to Listen'));
    await waitFor(() => expect(getByText('Resonating...')).toBeDefined());
    const element = MockAudio.instances[0];

    act(() => element.onended?.());
    await waitFor(() => expect(getByText('Tap to Listen')).toBeDefined());

    fireEvent.click(getByText('Tap to Listen'));
    await waitFor(() => expect(getByText('Resonating...')).toBeDefined());

    expect(MockAudio.instances).toHaveLength(1);
    expect(element.play).toHaveBeenCalledTimes(2);
  });

  it('applies the Audio Cues volume to card playback', async () => {
    setAudioChannel('cues', { volume: 0.3 });
    const { getByText } = render(<WorldEntityCard card={beastCard} />);
    fireEvent.click(getByText('Tap to Listen'));
    await waitFor(() => expect(MockAudio.instances).toHaveLength(1));
    expect(MockAudio.instances[0].volume).toBe(0.3);
  });

  it('does not play while Master Audio is off', async () => {
    setAudioChannel('master', { enabled: false });
    const toasts: string[] = [];
    const onToast = (e: Event) => toasts.push((e as CustomEvent).detail?.message);
    window.addEventListener('seihouse-toast', onToast);

    const { getByText } = render(<WorldEntityCard card={beastCard} />);
    fireEvent.click(getByText('Tap to Listen'));
    await waitFor(() => expect(toasts.length).toBe(1));

    expect(MockAudio.instances).toHaveLength(0);
    window.removeEventListener('seihouse-toast', onToast);
  });

  it('never consumes the automatic cue budget or dispatches narrative cues', async () => {
    // Simulate a running narration session so the governor WOULD grant cues —
    // card playback still must not ask it for one.
    cinematicEffectGovernor.setSignal('narration', true);
    cinematicEffectGovernor.resetChapter(1);
    const budgetSpy = vi.spyOn(cinematicEffectGovernor, 'requestAudioCue');
    const cueEvents: Event[] = [];
    const onCue = (e: Event) => cueEvents.push(e);
    window.addEventListener('narrative-cue', onCue);

    const { getByText } = render(<WorldEntityCard card={beastCard} />);
    fireEvent.click(getByText('Tap to Listen'));
    await waitFor(() => expect(getByText('Resonating...')).toBeDefined());

    expect(budgetSpy).not.toHaveBeenCalled();
    expect(cueEvents).toHaveLength(0);
    // The chapter's full automatic budget is still available after card playback.
    expect(
      cinematicEffectGovernor.requestAudioCue({ id: 'post-card-cue', chapterNumber: 1 }),
    ).toBe(true);

    window.removeEventListener('narrative-cue', onCue);
    cinematicEffectGovernor.setSignal('narration', false);
    cinematicEffectGovernor.resetChapter(null);
  });

  it('keeps card SFX independent from TTS narration', async () => {
    const { getByText } = render(<WorldEntityCard card={beastCard} />);
    fireEvent.click(getByText('Tap to Listen'));
    await waitFor(() => expect(getByText('Resonating...')).toBeDefined());
    // Playing an entity sound must never cancel or start speech synthesis.
    expect(speechSynthesisMock.cancel).not.toHaveBeenCalled();
    expect(speechSynthesisMock.speak).not.toHaveBeenCalled();
  });

  it('shows a clear unavailable state when no curated asset is mapped', () => {
    const unmapped: WorldCardEvent = {
      ...beastCard,
      audioType: 'sneeze' as WorldCardEvent['audioType'],
    };
    const { getByText, queryByText } = render(<WorldEntityCard card={unmapped} />);
    expect(getByText('Echo Unavailable')).toBeDefined();
    expect(queryByText('Tap to Listen')).toBeNull();
  });

  it('fails visibly (no silent replacement) when playback is rejected', async () => {
    vi.stubGlobal(
      'Audio',
      class extends MockAudio {
        play = vi.fn(() => Promise.reject(new Error('NotAllowedError')));
      },
    );
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const toasts: string[] = [];
    const onToast = (e: Event) => toasts.push((e as CustomEvent).detail?.message);
    window.addEventListener('seihouse-toast', onToast);

    const { getByText } = render(<WorldEntityCard card={beastCard} />);
    fireEvent.click(getByText('Tap to Listen'));

    await waitFor(() => expect(getByText('Echo Unavailable')).toBeDefined());
    expect(toasts.length).toBe(1);
    // Exactly one attempt on the curated URL — nothing else fetched instead.
    expect(MockAudio.instances).toHaveLength(1);
    window.removeEventListener('seihouse-toast', onToast);
  });

  it('stops SFX playback when the card unmounts mid-play', async () => {
    const { getByText, unmount } = render(<WorldEntityCard card={beastCard} />);
    fireEvent.click(getByText('Tap to Listen'));
    await waitFor(() => expect(getByText('Resonating...')).toBeDefined());
    const element = MockAudio.instances[0];

    unmount();
    expect(element.pause).toHaveBeenCalled();
    // Card SFX cleanup never reaches into speech synthesis.
    expect(speechSynthesisMock.cancel).not.toHaveBeenCalled();
  });

  it('uses speech synthesis (not the SFX catalog) for character quote cards', async () => {
    speechSynthesisMock.speak.mockImplementation((utterance: MockUtterance) => {
      utterance.onstart?.();
    });
    const quoteCard: WorldCardEvent = {
      entityType: 'character',
      entityName: 'Elder Mei',
      displayTitle: 'Elder Mei',
      audioText: 'You have finally come.',
      audioType: 'tts_line',
    };
    const { getByText } = render(<WorldEntityCard card={quoteCard} />);
    fireEvent.click(getByText('Tap to Listen'));

    await waitFor(() => expect(speechSynthesisMock.speak).toHaveBeenCalledTimes(1));
    expect(MockAudio.instances).toHaveLength(0);
  });
});
