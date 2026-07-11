import { describe, it, expect, beforeEach } from 'vitest';
import {
  CinematicEffectGovernor,
  resolveChapterZone,
  MAX_AUDIO_CUES_PER_CHAPTER,
  AUDIO_CUE_COOLDOWN_MS,
} from './cinematicEffectGovernor';

const makeGovernor = () => {
  let time = 0;
  const governor = new CinematicEffectGovernor(() => time);
  const advance = (ms: number) => {
    time += ms;
  };
  return { governor, advance };
};

// Chapter of 90 blocks: indexes 0-29 early, 30-59 middle, 60-89 late.
const cue = (id: string, blockIndex: number, chapterNumber = 1) => ({
  id,
  chapterNumber,
  blockIndex,
  totalBlocks: 90,
});

describe('resolveChapterZone', () => {
  it('splits a chapter into early/middle/late thirds', () => {
    expect(resolveChapterZone(0, 90)).toBe('early');
    expect(resolveChapterZone(29, 90)).toBe('early');
    expect(resolveChapterZone(30, 90)).toBe('middle');
    expect(resolveChapterZone(59, 90)).toBe('middle');
    expect(resolveChapterZone(60, 90)).toBe('late');
    expect(resolveChapterZone(89, 90)).toBe('late');
  });

  it('clamps positions at or past the end into the late zone', () => {
    expect(resolveChapterZone(90, 90)).toBe('late');
    expect(resolveChapterZone(200, 90)).toBe('late');
  });

  it('returns undefined when position information is missing or invalid', () => {
    expect(resolveChapterZone()).toBeUndefined();
    expect(resolveChapterZone(5)).toBeUndefined();
    expect(resolveChapterZone(undefined, 90)).toBeUndefined();
    expect(resolveChapterZone(5, 0)).toBeUndefined();
    expect(resolveChapterZone(-1, 90)).toBeUndefined();
  });
});

describe('CinematicEffectGovernor', () => {
  describe('mode awareness', () => {
    it('denies audio cues and camera shake in default manual-reader mode', () => {
      const { governor } = makeGovernor();
      expect(governor.isActive()).toBe(false);
      expect(governor.requestAudioCue(cue('a', 0))).toBe(false);
      expect(governor.requestCameraShake(1)).toBe(false);
    });

    it('grants effects during TTS/listen narration', () => {
      const { governor } = makeGovernor();
      governor.setSignal('narration', true);
      expect(governor.isActive()).toBe(true);
      expect(governor.requestAudioCue(cue('a', 0))).toBe(true);
      expect(governor.requestCameraShake(1)).toBe(true);
    });

    it('grants effects during cinematic scroll without TTS (future mode)', () => {
      const { governor } = makeGovernor();
      governor.setSignal('cinematic-scroll', true);
      expect(governor.isActive()).toBe(true);
      expect(governor.requestAudioCue(cue('a', 0))).toBe(true);
      expect(governor.requestCameraShake(1)).toBe(true);
    });

    it('deactivates when narration pauses or ends', () => {
      const { governor, advance } = makeGovernor();
      governor.setSignal('narration', true);
      expect(governor.requestAudioCue(cue('a', 0))).toBe(true);

      governor.setSignal('narration', false);
      advance(AUDIO_CUE_COOLDOWN_MS + 1);
      expect(governor.requestAudioCue(cue('b', 40))).toBe(false);
      expect(governor.requestCameraShake(1)).toBe(false);
    });

    it('stays active while either signal is up', () => {
      const { governor } = makeGovernor();
      governor.setSignal('narration', true);
      governor.setSignal('cinematic-scroll', true);
      governor.setSignal('narration', false);
      expect(governor.isActive()).toBe(true);
      governor.setSignal('cinematic-scroll', false);
      expect(governor.isActive()).toBe(false);
    });
  });

  describe('one-shot audio cue budget', () => {
    let governor: CinematicEffectGovernor;
    let advance: (ms: number) => void;

    beforeEach(() => {
      ({ governor, advance } = makeGovernor());
      governor.setSignal('narration', true);
    });

    it('caps one-shot cues at the per-chapter maximum', () => {
      expect(MAX_AUDIO_CUES_PER_CHAPTER).toBe(3);
      expect(governor.requestAudioCue(cue('a', 0))).toBe(true);
      advance(AUDIO_CUE_COOLDOWN_MS);
      expect(governor.requestAudioCue(cue('b', 40))).toBe(true);
      advance(AUDIO_CUE_COOLDOWN_MS);
      expect(governor.requestAudioCue(cue('c', 80))).toBe(true);
      advance(AUDIO_CUE_COOLDOWN_MS);
      expect(governor.requestAudioCue(cue('d', 85))).toBe(false);
    });

    it('distributes cues across early/middle/late zones (one per zone)', () => {
      expect(governor.requestAudioCue(cue('a', 5))).toBe(true); // early
      advance(AUDIO_CUE_COOLDOWN_MS);
      expect(governor.requestAudioCue(cue('b', 10))).toBe(false); // early again — denied
      expect(governor.requestAudioCue(cue('c', 45))).toBe(true); // middle
      advance(AUDIO_CUE_COOLDOWN_MS);
      expect(governor.requestAudioCue(cue('d', 50))).toBe(false); // middle again — denied
      expect(governor.requestAudioCue(cue('e', 75))).toBe(true); // late
    });

    it('enforces a cooldown between cues', () => {
      expect(governor.requestAudioCue(cue('a', 5))).toBe(true);
      advance(AUDIO_CUE_COOLDOWN_MS - 1);
      expect(governor.requestAudioCue(cue('b', 45))).toBe(false);
      advance(1);
      expect(governor.requestAudioCue(cue('b2', 46))).toBe(true);
    });

    it('deduplicates by cue id', () => {
      expect(governor.requestAudioCue(cue('a', 5))).toBe(true);
      advance(AUDIO_CUE_COOLDOWN_MS);
      expect(governor.requestAudioCue(cue('a', 5))).toBe(false);
      // A denied duplicate must not consume budget for a fresh cue.
      expect(governor.requestAudioCue(cue('b', 45))).toBe(true);
    });

    it('still applies count and cooldown when zone information is unavailable', () => {
      const noZone = (id: string) => ({ id, chapterNumber: 1 });
      expect(governor.requestAudioCue(noZone('a'))).toBe(true);
      expect(governor.requestAudioCue(noZone('b'))).toBe(false); // cooldown
      advance(AUDIO_CUE_COOLDOWN_MS);
      expect(governor.requestAudioCue(noZone('b'))).toBe(true);
      advance(AUDIO_CUE_COOLDOWN_MS);
      expect(governor.requestAudioCue(noZone('c'))).toBe(true);
      advance(AUDIO_CUE_COOLDOWN_MS);
      expect(governor.requestAudioCue(noZone('d'))).toBe(false); // cap of 3
    });

    it('resets the budget when the chapter changes', () => {
      expect(governor.requestAudioCue(cue('a', 5, 1))).toBe(true);
      advance(AUDIO_CUE_COOLDOWN_MS);
      expect(governor.requestAudioCue(cue('b', 45, 1))).toBe(true);
      // New chapter: fresh budget, fresh zones, fresh cooldown.
      expect(governor.requestAudioCue(cue('c', 5, 2))).toBe(true);
    });
  });

  describe('camera shake budget', () => {
    it('allows exactly one camera shake per chapter', () => {
      const { governor } = makeGovernor();
      governor.setSignal('narration', true);
      expect(governor.requestCameraShake(1)).toBe(true);
      expect(governor.requestCameraShake(1)).toBe(false);
      expect(governor.requestCameraShake(2)).toBe(true);
      expect(governor.requestCameraShake(2)).toBe(false);
    });

    it('shares the per-chapter reset with the audio budget', () => {
      const { governor, advance } = makeGovernor();
      governor.setSignal('narration', true);
      expect(governor.requestAudioCue(cue('a', 5, 1))).toBe(true);
      expect(governor.requestCameraShake(1)).toBe(true);
      advance(AUDIO_CUE_COOLDOWN_MS);
      // Moving to chapter 2 resets both families.
      expect(governor.requestCameraShake(2)).toBe(true);
      expect(governor.requestAudioCue(cue('a', 5, 2))).toBe(true);
    });
  });
});
