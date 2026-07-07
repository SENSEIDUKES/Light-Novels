import { describe, it, expect, beforeEach } from 'vitest';
import {
  SceneScoreEngine,
  TRACK_LIBRARY,
  MOOD_FAMILIES,
  isEscalationAllowed, MOOD_PRIORITIES,
} from './musicResolver';

describe('TRACK_LIBRARY', () => {
  it('contains all 23 Celestial Library tracks with real URLs', () => {
    expect(TRACK_LIBRARY).toHaveLength(23);
    for (const track of TRACK_LIBRARY) {
      expect(track.url).toMatch(/^https:\/\/celestialaudio\.seihouse\.org\/AUDIO\//);
      expect(track.moods.length).toBeGreaterThan(0);
      expect(track.moods).toContain(track.mood);
    }
  });

  it('covers every mood family with at least one track', () => {
    const families = new Set(TRACK_LIBRARY.map(t => MOOD_FAMILIES[t.mood]));
    expect(families).toEqual(new Set(['ambient', 'adventure', 'emotional', 'fighting', 'war']));
  });
});

describe('isEscalationAllowed', () => {
  it('always allows calm families', () => {
    expect(isEscalationAllowed('adventure', {})).toBe(true);
    expect(isEscalationAllowed('ambient', {})).toBe(true);
  });

  it('blocks fighting without strong danger or intensity', () => {
    expect(isEscalationAllowed('fighting', { danger: 0.5, intensity: 0.5 })).toBe(false);
    expect(isEscalationAllowed('fighting', { danger: 0.7 })).toBe(true);
    expect(isEscalationAllowed('fighting', {}, 0.8)).toBe(true);
  });

  it('requires near-max stakes for war', () => {
    expect(isEscalationAllowed('war', { danger: 0.8 })).toBe(false);
    expect(isEscalationAllowed('war', { danger: 0.79, tension: 0.9 })).toBe(false);
    expect(isEscalationAllowed('war', { danger: 0.8, tension: 0.7 })).toBe(true);
    expect(isEscalationAllowed('war', { danger: 0.9, intensity: 0.7 })).toBe(true);
  });

  it('blocks emotional tracks below the intensity threshold', () => {
    expect(isEscalationAllowed('emotional', { intensity: 0.5 })).toBe(false);
    expect(isEscalationAllowed('emotional', { intensity: 0.7 })).toBe(true);
    expect(isEscalationAllowed('emotional', { tension: 0.75 })).toBe(true);
  });
});

describe('SceneScoreEngine', () => {
  let engine: SceneScoreEngine;

  beforeEach(() => {
    engine = new SceneScoreEngine();
  });

  it('resolves calm moods to real adventure/ambient tracks without any signals', () => {
    const track = engine.evaluateSceneContext({ mood: 'adventure' });
    expect(track).not.toBeNull();
    expect(MOOD_FAMILIES[track!.mood]).toBe('adventure');
    expect(track!.url).toContain('/ADVENTURE/');
  });

  it('downgrades a fighting cue to an adventure track when signals are weak', () => {
    const track = engine.evaluateSceneContext({ mood: 'fighting' }, [], { danger: 0.3 });
    expect(track).not.toBeNull();
    expect(MOOD_FAMILIES[track!.mood]).toBe('adventure');
  });

  it('serves a fighting track when danger clears the gate', () => {
    const track = engine.evaluateSceneContext({ mood: 'fighting' }, ['tournament'], { danger: 0.85 });
    expect(track).not.toBeNull();
    expect(track!.moods).toContain('fighting');
    expect(track!.tags).toContain('tournament');
  });

  it('downgrades war to adventure when the chapter is not high-stakes enough', () => {
    const track = engine.evaluateSceneContext({ mood: 'war' }, [], { danger: 0.6 });
    expect(track).not.toBeNull();
    expect(MOOD_FAMILIES[track!.mood]).toBe('adventure');
  });

  it('lets chapter-level signals unlock escalation for signal-less blocks', () => {
    engine.setChapterContext({ danger: 0.9, tension: 0.8, intensity: 0.8 });
    const track = engine.evaluateSceneContext({ mood: 'war' });
    expect(track).not.toBeNull();
    expect(track!.mood).toBe('war');
  });

  it('clears chapter context on resetScene', () => {
    engine.setChapterContext({ danger: 0.9, tension: 0.8, intensity: 0.8 });
    engine.resetScene();
    const track = engine.evaluateSceneContext({ mood: 'war' });
    expect(track).not.toBeNull();
    expect(MOOD_FAMILIES[track!.mood]).toBe('adventure');
  });

  it('does not let a downgraded cue dethrone an escalated score', () => {
    const boss = engine.evaluateSceneContext({ mood: 'boss-fight' }, [], { danger: 0.95, intensity: 0.9 });
    expect(boss!.mood).toBe('boss-fight');

    // A weak ambient cue mid-boss-fight should be ignored entirely.
    const ambient = engine.evaluateSceneContext({ mood: 'ambient' });
    expect(ambient).toBeNull();
  });

  it('respects an explicit trackId without gating', () => {
    const track = engine.evaluateSceneContext({ mood: 'ambient', trackId: 'WAR_1' });
    expect(track).not.toBeNull();
    expect(track!.id).toBe('WAR_1');
  });

  it('gates emotional tracks on the music cue intensity', () => {
    const weak = engine.evaluateSceneContext({ mood: 'romance', intensity: 0.4 });
    expect(MOOD_FAMILIES[weak!.mood]).toBe('ambient');

    engine.resetScene();
    const strong = engine.evaluateSceneContext({ mood: 'romance', intensity: 0.8 });
    expect(strong!.id).toBe('ROMANCE_LOVERS');
  });

  it('prefers the neutral default track when no scene tags match', () => {
    const track = engine.evaluateSceneContext({ mood: 'ambient' });
    expect(track!.id).toBe('AMBIENT_STARTER');
  });

  it('prefers the tag-matching track among same-mood candidates', () => {
    const track = engine.evaluateSceneContext({ mood: 'ambient' }, ['night', 'camp']);
    expect(track!.id).toBe('AMBEINT_NIGHT');
  });

  it('sticks with the current track instead of churning between siblings', () => {
    const first = engine.evaluateSceneContext({ mood: 'tension', intensity: 0.9 });
    const second = engine.evaluateSceneContext({ mood: 'tension', intensity: 0.9 });
    expect(second!.id).toBe(first!.id);
  });

  describe('resolveChapterDefault', () => {
    it('always returns a calm bed track', () => {
      const track = engine.resolveChapterDefault();
      expect(track).not.toBeNull();
      expect(['ambient', 'adventure']).toContain(MOOD_FAMILIES[track!.mood]);
    });

    it('matches chapter environment tags', () => {
      const track = engine.resolveChapterDefault(['market', 'city']);
      expect(track!.id).toBe('ADVENTURE_MARKET');
    });

    it('never picks a gated track even for a war chapter', () => {
      const track = engine.resolveChapterDefault(['battlefield', 'army']);
      expect(['ambient', 'adventure']).toContain(MOOD_FAMILIES[track!.mood]);
    });

    it('yields to any explicit cue afterwards, even a soft one', () => {
      engine.resolveChapterDefault();
      const track = engine.evaluateSceneContext({ mood: 'serenity' });
      expect(track).not.toBeNull();
      expect(track!.moods).toContain('serenity');
    });
  });
});

describe('MOOD_PRIORITIES', () => {
  it('defines priorities for all moods in MOOD_FAMILIES', () => {
    const moods = Object.keys(MOOD_FAMILIES);
    for (const mood of moods) {
      expect(MOOD_PRIORITIES).toHaveProperty(mood);
      expect(typeof MOOD_PRIORITIES[mood]).toBe('number');
    }
  });

  it('maintains the correct relative hierarchy', () => {
    expect(MOOD_PRIORITIES['boss-fight']).toBeGreaterThan(MOOD_PRIORITIES['fighting']);
    expect(MOOD_PRIORITIES['fighting']).toBeGreaterThan(MOOD_PRIORITIES['adventure']);
    expect(MOOD_PRIORITIES['adventure']).toBeGreaterThan(MOOD_PRIORITIES['ambient']);
  });

  it('contains only positive values', () => {
    Object.values(MOOD_PRIORITIES).forEach(value => {
      expect(value).toBeGreaterThan(0);
    });
  });
});
