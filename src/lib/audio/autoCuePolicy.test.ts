import { describe, it, expect } from 'vitest';
import {
  normalizeAutoCue,
  deriveStructuredAutoCue,
  collectBlockAutoCues,
  isHighConfidenceAutoCue,
  HIGH_CONFIDENCE_AUTO_CUES,
} from './autoCuePolicy';
import { CinematicEffectGovernor } from '../effects/cinematicEffectGovernor';
import { StoryBlock } from '../../types';

describe('normalizeAutoCue', () => {
  it('passes canonical high-confidence cue ids through unchanged', () => {
    for (const cue of HIGH_CONFIDENCE_AUTO_CUES) {
      expect(normalizeAutoCue(cue)).toBe(cue);
    }
  });

  it('suppresses footsteps and every material variant', () => {
    expect(normalizeAutoCue('footsteps')).toBeNull();
    expect(normalizeAutoCue('footsteps_snow')).toBeNull();
    expect(normalizeAutoCue('footsteps_wood')).toBeNull();
    expect(normalizeAutoCue('footsteps_stone')).toBeNull();
    expect(normalizeAutoCue('heavy footsteps approaching')).toBeNull();
  });

  it('suppresses territory / environment Foley', () => {
    expect(normalizeAutoCue('wind howling')).toBeNull();
    expect(normalizeAutoCue('rain on stone')).toBeNull();
    expect(normalizeAutoCue('territory ambience')).toBeNull();
    expect(normalizeAutoCue('door creak')).toBeNull();
    expect(normalizeAutoCue('crowd murmur')).toBeNull();
    expect(normalizeAutoCue('river flowing')).toBeNull();
  });

  it('suppresses vague or unknown tags instead of guessing', () => {
    expect(normalizeAutoCue('sword clash')).toBeNull();
    expect(normalizeAutoCue('whoosh')).toBeNull();
    expect(normalizeAutoCue('dramatic sting')).toBeNull();
    expect(normalizeAutoCue('')).toBeNull();
  });

  it('recognizes explicitly named high-confidence events in tag text', () => {
    expect(normalizeAutoCue('system alert notification')).toBe('system_alert');
    expect(normalizeAutoCue('realm breakthrough')).toBe('breakthrough');
    expect(normalizeAutoCue('the sealed artifact awakens')).toBe('artifact_activation');
    expect(normalizeAutoCue('ancient beast reveals itself')).toBe('beast_reveal');
    expect(normalizeAutoCue('fate shifts around him')).toBe('fate_shift');
    expect(normalizeAutoCue('devastating blow lands')).toBe('major_impact');
  });

  it('never upgrades environment-flavored tags even when they name an event word', () => {
    // "steps" wins over anything else: movement vocabulary is never audio.
    expect(normalizeAutoCue('breakthrough footsteps')).toBeNull();
  });
});

describe('deriveStructuredAutoCue', () => {
  const block = (overrides: Partial<StoryBlock>): Pick<StoryBlock, 'system' | 'metadata'> =>
    ({ id: 'b', type: 'text', text: '', ...overrides }) as StoryBlock;

  it('derives breakthrough from a structured system panel', () => {
    expect(
      deriveStructuredAutoCue(block({ system: { kind: 'level_up', promptType: 'breakthrough', title: 'Breakthrough' } as StoryBlock['system'] })),
    ).toBe('breakthrough');
  });

  it('derives fate_shift from death/fate system events', () => {
    expect(
      deriveStructuredAutoCue(block({ system: { kind: 'status', promptType: 'death_event', title: 'Death' } as StoryBlock['system'] })),
    ).toBe('fate_shift');
    expect(
      deriveStructuredAutoCue(block({ system: { kind: 'status', promptType: 'fate_event', title: 'Fate' } as StoryBlock['system'] })),
    ).toBe('fate_shift');
  });

  it('derives beast_reveal only for headline threat tiers', () => {
    const beast = (threatTier: string) =>
      block({
        metadata: {
          beastEvent: {
            type: 'reveal',
            profile: { size: 'giant', bodyType: 'dragon', element: 'lightning', movement: 'flying', intelligence: 'ancient', threatTier, signatureSound: 'roar' },
          },
        } as StoryBlock['metadata'],
      });
    expect(deriveStructuredAutoCue(beast('calamity'))).toBe('beast_reveal');
    expect(deriveStructuredAutoCue(beast('boss'))).toBe('beast_reveal');
    expect(deriveStructuredAutoCue(beast('common'))).toBeNull();
    expect(deriveStructuredAutoCue(beast('elite'))).toBeNull();
  });

  it('never derives a cue from broad movement/environment/location metadata', () => {
    expect(
      deriveStructuredAutoCue(
        block({
          metadata: {
            sceneType: 'travel',
            environment: ['mountain', 'snow', 'territory'],
            motion: 'walking',
            intensity: 0.9,
            danger: 0.9,
            tension: 0.9,
          } as StoryBlock['metadata'],
        }),
      ),
    ).toBeNull();
  });
});

describe('collectBlockAutoCues', () => {
  it('filters low-confidence tags and keeps high-confidence ones', () => {
    expect(collectBlockAutoCues(['footsteps', 'system_alert', 'wind howling'])).toEqual([
      'system_alert',
    ]);
  });

  it('adds the structured cue and deduplicates', () => {
    const cues = collectBlockAutoCues(['breakthrough'], {
      system: { kind: 'level_up', promptType: 'breakthrough', title: 'Breakthrough' } as StoryBlock['system'],
    });
    expect(cues).toEqual(['breakthrough']);
  });

  it('returns nothing for a purely atmospheric block', () => {
    expect(collectBlockAutoCues(['footsteps_snow', 'wind howling'])).toEqual([]);
  });
});

describe('high-confidence cues flowing through the cinematic governor', () => {
  it('manual reader mode suppresses even a high-confidence automatic cue', () => {
    const governor = new CinematicEffectGovernor(() => 0);
    const cue = normalizeAutoCue('system_alert');
    expect(cue).toBe('system_alert');
    expect(
      governor.requestAudioCue({ id: `sfx-${cue}`, chapterNumber: 1, blockIndex: 0, totalBlocks: 30 }),
    ).toBe(false);
  });

  it('TTS/narration and cinematic-scroll modes allow eligible cues, still budgeted', () => {
    for (const signal of ['narration', 'cinematic-scroll'] as const) {
      let now = 0;
      const governor = new CinematicEffectGovernor(() => now);
      governor.setSignal(signal, true);
      const granted: string[] = [];
      // Six eligible high-confidence cues spread across the chapter — the
      // three-per-chapter / one-per-zone budget still applies on top of the
      // policy filter.
      HIGH_CONFIDENCE_AUTO_CUES.forEach((cue, i) => {
        now += 30_000;
        if (governor.requestAudioCue({ id: `sfx-${cue}`, chapterNumber: 1, blockIndex: i * 15, totalBlocks: 90 })) {
          granted.push(cue);
        }
      });
      expect(granted.length).toBe(3);
    }
  });

  it('isHighConfidenceAutoCue rejects legacy footsteps values outright', () => {
    expect(isHighConfidenceAutoCue('footsteps')).toBe(false);
    expect(isHighConfidenceAutoCue('system_alert')).toBe(true);
  });
});
