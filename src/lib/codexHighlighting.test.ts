import { describe, expect, it } from 'vitest';
import type { StoryMemory } from '../types';
import { collectCodexTerms, createCodexHighlighter, escapeRegExp } from './codexHighlighting';

function memory(overrides: Partial<StoryMemory> = {}): StoryMemory {
  return {
    powerSystem: 'Qi',
    currentPowerStage: 'Mortal',
    worldRules: [],
    characters: [],
    factions: [],
    locations: [],
    artifacts: [],
    abilities: [],
    unresolvedPlotThreads: [],
    resolvedPlotThreads: [],
    memoryWarnings: [],
    ...overrides,
  } as unknown as StoryMemory;
}

/** Split the way the reader does: odd indices are the matched fragments. */
function highlightedFragments(text: string, regex: RegExp | null): string[] {
  if (!regex) return [];
  return text.split(regex).filter((_, index) => index % 2 !== 0);
}

describe('escapeRegExp', () => {
  it('escapes every RegExp metacharacter', () => {
    expect(escapeRegExp('Ye Mo (Reborn) [v2].')).toBe('Ye Mo \\(Reborn\\) \\[v2\\]\\.');
  });
});

describe('collectCodexTerms', () => {
  it('includes persisted aliases alongside canonical names', () => {
    const rival = { id: 'char-ye', name: 'Ye Mo', aliases: ['Young Master Ye', 'the Azure Blade'] };
    const terms = collectCodexTerms(memory({ characters: [rival] as any }));
    expect(terms.map(term => term.term)).toEqual([
      'Young Master Ye',
      'the Azure Blade',
      'Ye Mo',
    ]);
    expect(terms.every(term => term.entry === rival)).toBe(true);
    expect(terms.map(term => term.isCanonicalName)).toEqual([false, false, true]);
  });

  it('maps each entity to the category that drives its highlight colour', () => {
    const terms = collectCodexTerms(memory({
      characters: [{ id: 'c', name: 'Ye Mo', relationshipToMC: 'Rival' }] as any,
      factions: [{ id: 'f', name: 'Azure Sect' }] as any,
      artifacts: [{ id: 'a', name: 'Jade Blade', tier: 'Legendary' }] as any,
      locations: [{ id: 'l', name: 'Sky Terrace', safetyLevel: 'Lethal' }] as any,
    }));
    expect(Object.fromEntries(terms.map(term => [term.term, term.type]))).toEqual({
      'Ye Mo': 'character',
      'Azure Sect': 'faction',
      'Jade Blade': 'artifact',
      'Sky Terrace': 'location',
    });
  });

  it('lets a canonical name win over another entity alias claiming the same text', () => {
    const terms = collectCodexTerms(memory({
      characters: [
        { id: 'c1', name: 'Shadow', aliases: [] },
        { id: 'c2', name: 'Ye Mo', aliases: ['Shadow'] },
      ] as any,
    }));
    expect(terms.filter(term => term.term === 'Shadow')).toHaveLength(1);
    expect(terms.find(term => term.term === 'Shadow')?.entry.id).toBe('c1');
  });

  it('survives a malformed replica instead of throwing while rendering', () => {
    const terms = collectCodexTerms(memory({
      characters: [
        { id: 'c1', name: 'Ye Mo', aliases: 'Young Master Ye' },
        { id: 'c2', name: 'Su Yan', aliases: null },
        null,
      ] as any,
      // A collection that is not an array at all.
      locations: { id: 'l1', name: 'Sky Altar' } as any,
    }));
    expect(terms.map(term => term.term).sort()).toEqual(['Su Yan', 'Ye Mo']);
  });

  it('drops entries too short to match usefully', () => {
    const terms = collectCodexTerms(memory({ characters: [{ id: 'c', name: 'Ye' }] as any }));
    expect(terms).toHaveLength(0);
  });
});

describe('createCodexHighlighter', () => {
  it('keeps every colour mapping when a name contains RegExp metacharacters', () => {
    // The old escape expression closed its character class early and escaped
    // nothing, so the parentheses became a second capture group. That shifted
    // String.split's match positions and every name in the chapter lost its
    // colour, not just the one with punctuation.
    const terms = collectCodexTerms(memory({
      characters: [{ id: 'c1', name: 'Ye Mo (Reborn)' }] as any,
      locations: [{ id: 'l1', name: 'Sky Terrace' }] as any,
    }));
    const highlighter = createCodexHighlighter(terms);
    const fragments = highlightedFragments(
      'Ye Mo (Reborn) climbed the Sky Terrace at dawn.',
      highlighter.regex,
    );
    expect(fragments).toEqual(['Ye Mo (Reborn)', 'Sky Terrace']);
    expect(fragments.map(fragment => highlighter.resolve(fragment)?.type))
      .toEqual(['character', 'location']);
  });

  it('resolves a match regardless of the case used in the prose', () => {
    const highlighter = createCodexHighlighter(
      collectCodexTerms(memory({ artifacts: [{ id: 'a', name: 'Jade Blade', tier: 'Legendary' }] as any })),
    );
    const [fragment] = highlightedFragments('He drew the JADE BLADE.', highlighter.regex);
    expect(fragment).toBe('JADE BLADE');
    expect(highlighter.resolve(fragment)).toMatchObject({ type: 'artifact' });
  });

  it('prefers the longest term when names overlap', () => {
    const highlighter = createCodexHighlighter(collectCodexTerms(memory({
      characters: [
        { id: 'c1', name: 'Mo Xuan' },
        { id: 'c2', name: 'Elder Mo Xuan' },
      ] as any,
    })));
    expect(highlightedFragments('Elder Mo Xuan nodded.', highlighter.regex))
      .toEqual(['Elder Mo Xuan']);
  });

  it('does not match a name embedded inside a longer word', () => {
    const highlighter = createCodexHighlighter(
      collectCodexTerms(memory({ characters: [{ id: 'c', name: 'Lin' }] as any })),
    );
    expect(highlightedFragments('Linus walked past.', highlighter.regex)).toEqual([]);
    expect(highlightedFragments('Lin walked past.', highlighter.regex)).toEqual(['Lin']);
  });

  it('matches names written in scripts that do not use word boundaries', () => {
    const highlighter = createCodexHighlighter(
      collectCodexTerms(memory({ characters: [{ id: 'c', name: '林风寒' }] as any })),
    );
    expect(highlightedFragments('林风寒走进了大殿。', highlighter.regex)).toEqual(['林风寒']);
  });

  it('reports no matcher when there are no terms', () => {
    expect(createCodexHighlighter([]).regex).toBeNull();
  });
});
