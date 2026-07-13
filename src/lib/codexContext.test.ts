import { describe, expect, it } from 'vitest';
import {
  findCodexAliasCollisions,
  normalizeCodexAliases,
  normalizeCodexSurface,
  parseCodexAliases,
  stripAuthorControlledCodexFields,
  stripLegacyCodexContextFields,
} from './codexContext';

describe('Codex context identity utilities', () => {
  it('normalizes deterministic comparison keys without changing stored casing', () => {
    expect(normalizeCodexSurface('  The\u00a0Pavilion   Mistress ')).toBe('the pavilion mistress');
    expect(normalizeCodexAliases(
      [' Sister Mei ', 'sister mei', 'Mei Lian', '', 'The Pavilion Mistress'],
      'Mei Lian',
    )).toEqual(['Sister Mei', 'The Pavilion Mistress']);
  });

  it('parses only explicit user-entered aliases', () => {
    expect(parseCodexAliases('Sister Mei, Pavilion Mistress\nMistress Mei', 'Mei Lian')).toEqual([
      'Sister Mei',
      'Pavilion Mistress',
      'Mistress Mei',
    ]);
  });

  it('reports canonical-name and alias collisions within the supplied entity kind', () => {
    const entries = [
      { id: 'char-1', name: 'Mei Lian', aliases: ['Sister Mei'] },
      { id: 'char-2', name: 'Lan Wei', aliases: ['Little Lan'] },
    ];

    expect(findCodexAliasCollisions(
      'char-1',
      'Mei Lian',
      ['Lan Wei', 'Little Lan', 'Pavilion Mistress'],
      entries,
    )).toEqual([
      { alias: 'Lan Wei', conflictingEntryId: 'char-2', conflictingEntryName: 'Lan Wei' },
      { alias: 'Little Lan', conflictingEntryId: 'char-2', conflictingEntryName: 'Lan Wei' },
    ]);
  });

  it('strips provider-controlled context recursively without dropping generated lore', () => {
    expect(stripAuthorControlledCodexFields({
      name: 'Mei Lian',
      powerLevel: 'Core Formation',
      aliases: ['Sister Mei'],
      contextPriority: 9,
      authorContextNote: 'Provider note',
      provenance: { isUserPinned: true },
      pinned: true,
      isUserPinned: true,
      abilities: [{ name: 'Moon Step', description: 'Fast', aliases: ['Moon Dance'] }],
    })).toEqual({
      name: 'Mei Lian',
      powerLevel: 'Core Formation',
      abilities: [{ name: 'Moon Step', description: 'Fast' }],
    });
  });

  it('removes abandoned root fields while retaining approved user context', () => {
    expect(stripLegacyCodexContextFields({
      aliases: ['Sister Mei'],
      contextPriority: 4,
      authorContextNote: 'Speaks formally.',
      provenance: { isUserPinned: true },
      pinned: true,
      isUserPinned: true,
      priority: 99,
      contextNote: 'Old note',
    })).toEqual({
      aliases: ['Sister Mei'],
      contextPriority: 4,
      authorContextNote: 'Speaks formally.',
      provenance: { isUserPinned: true },
    });
  });
});
