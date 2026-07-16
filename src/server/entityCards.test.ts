import { describe, expect, it } from 'vitest';
import { estimateTokens } from './helpers';
import {
  renderEntityCard,
  type EntityKind,
} from './entityCards';

describe('renderEntityCard', () => {
  const populatedEntities: Record<EntityKind, Record<string, any>> = {
    character: {
      name: 'Mei Lian',
      aliases: ['Sister Mei', 'Pavilion Mistress'],
      role: 'Mentor',
      status: 'alive',
      relationshipToMC: 'Secret ally',
      description: 'Keeper of the eastern pavilion.',
      provenance: { lastMentionedChapter: 12, isUserPinned: true },
    },
    faction: {
      name: 'Azure Hall',
      aliases: ['The Blue Sect'],
      role: 'Cultivation sect',
      alignment: 'Righteous',
      status: 'Active',
      connectionToMC: 'Patron',
      description: 'A mountain sect that guards the northern pass.',
      lastMajorInvolvement: 9,
    },
    location: {
      name: 'Silent Vale',
      aliases: ['The Hushed Valley'],
      realm: 'Mortal Realm',
      safetyLevel: 'Dangerous',
      currentRelevance: 'The MC is trapped here',
      description: 'A valley where spoken words become binding oaths.',
      lastMajorInvolvement: 7,
    },
    artifact: {
      name: 'Moon Sword',
      aliases: ['Yueblade'],
      tier: 'Heaven',
      currentOwner: 'Mei Lian',
      relationshipToMC: 'The MC must reclaim it',
      description: 'A sentient blade that remembers every broken promise.',
      provenance: { lastMentionedChapter: 14 },
    },
  };

  const expectedFullDetails: Record<EntityKind, string[]> = {
    character: [
      'Mei Lian (aliases: Sister Mei, Pavilion Mistress)',
      'Character — Mentor',
      'Status: alive',
      'Relationship to MC: Secret ally',
      'Description: Keeper of the eastern pavilion.',
      'Last involved: chapter 12',
    ],
    faction: [
      'Azure Hall (aliases: The Blue Sect)',
      'Faction — Cultivation sect',
      'Status: Righteous / Active',
      'Relationship to MC: Patron',
      'Description: A mountain sect that guards the northern pass.',
      'Last involved: chapter 9',
    ],
    location: [
      'Silent Vale (aliases: The Hushed Valley)',
      'Location — Mortal Realm',
      'Status: Dangerous',
      'Relationship to MC: The MC is trapped here',
      'Description: A valley where spoken words become binding oaths.',
      'Last involved: chapter 7',
    ],
    artifact: [
      'Moon Sword (aliases: Yueblade)',
      'Artifact — Heaven',
      'Status: held by Mei Lian',
      'Relationship to MC: The MC must reclaim it',
      'Description: A sentient blade that remembers every broken promise.',
      'Last involved: chapter 14',
    ],
  };

  for (const kind of Object.keys(populatedEntities) as EntityKind[]) {
    it(`renders full and brief ${kind} cards`, () => {
      const full = renderEntityCard(populatedEntities[kind], kind, 'full');
      const brief = renderEntityCard(populatedEntities[kind], kind, 'brief');

      for (const detail of expectedFullDetails[kind]) {
        expect(full.text).toContain(detail);
      }
      expect(brief.text).toContain(populatedEntities[kind].name);
      expect(brief.text).toContain(kind);
      expect(brief.text).toMatch(/\.$/);
      expect(full.kind).toBe(kind);
      expect(full.tier).toBe('full');
      expect(brief.tier).toBe('brief');
      expect(full.estimatedTokens).toBe(estimateTokens(full.text));
    });

    it(`renders sparse ${kind} cards without undefined placeholders`, () => {
      const full = renderEntityCard({ name: 'Sparse Entry' }, kind, 'full');
      const brief = renderEntityCard({ name: 'Sparse Entry' }, kind, 'brief');

      expect(full.text).toBe(`Sparse Entry\n${kind[0].toUpperCase()}${kind.slice(1)}`);
      expect(brief.text).toBe(`Sparse Entry — ${kind}.`);
      expect(full.text).not.toContain('undefined');
      expect(brief.text).not.toContain('undefined');
    });
  }

  it('keeps authorContextNote in both tiers and reports the pin source of truth', () => {
    const entity = {
      name: 'Mei Lian',
      role: 'Mentor',
      status: 'alive',
      authorContextNote: 'Never uses contractions; secretly opposes the MC.',
      provenance: { isUserPinned: true },
    };

    const full = renderEntityCard(entity, 'character', 'full');
    const brief = renderEntityCard(entity, 'character', 'brief');

    expect(full.text).toContain(`Author note: ${entity.authorContextNote}`);
    expect(brief.text).toContain(entity.authorContextNote);
    expect(full.pinned).toBe(true);
    expect(brief.pinned).toBe(true);
  });

  it('never renders heavy fields or data-URI values', () => {
    const card = renderEntityCard({
      name: 'Safe Name',
      aliases: ['data:image/png;base64,ALIAS_SECRET', 'Known Alias'],
      role: 'data:audio/wav;base64,ROLE_SECRET',
      description: 'Narrative description data:image/png;base64,INLINE_SECRET remains safe.',
      imageUrl: 'data:image/png;base64,IMAGE_SECRET',
      imageHistory: [{ imageUrl: 'data:image/png;base64,HISTORY_SECRET' }],
      embedding: [0.1, 0.2, 0.3],
      voiceClipUrl: 'data:audio/wav;base64,VOICE_SECRET',
    }, 'character', 'full');

    expect(card.text).toContain('Known Alias');
    expect(card.text).toContain('Narrative description remains safe.');
    expect(card.text).not.toContain('data:');
    expect(card.text).not.toContain('SECRET');
    expect(card.text).not.toContain('imageHistory');
    expect(card.text).not.toContain('embedding');
  });

  it('enforces field and card caps while preserving an author note', () => {
    const entity = {
      name: 'N'.repeat(2000),
      aliases: ['A'.repeat(2000)],
      role: 'R'.repeat(2000),
      status: 'S'.repeat(2000),
      relationshipToMC: 'M'.repeat(2000),
      description: 'D'.repeat(2000),
      authorContextNote: 'AUTHOR_NOTE_' + 'X'.repeat(2000),
      provenance: { lastMentionedChapter: 99 },
    };

    const full = renderEntityCard(entity, 'character', 'full');
    const brief = renderEntityCard(entity, 'character', 'brief');
    const descriptionLine = full.text
      .split('\n')
      .find(line => line.startsWith('Description: '));
    const authorNoteLine = full.text
      .split('\n')
      .find(line => line.startsWith('Author note: '));

    expect(full.text.length).toBeLessThanOrEqual(1200);
    expect(brief.text.length).toBeLessThanOrEqual(160);
    expect(descriptionLine?.slice('Description: '.length).length).toBeLessThanOrEqual(400);
    expect(authorNoteLine?.slice('Author note: '.length).length).toBeLessThanOrEqual(300);
    expect(full.text).toContain('Author note: AUTHOR_NOTE_');
    expect(brief.text).toContain('AUTHOR_NOTE_');
  });

  it('is deterministic for the same input', () => {
    const entity = populatedEntities.character;

    expect(renderEntityCard(entity, 'character', 'full')).toEqual(
      renderEntityCard(entity, 'character', 'full'),
    );
    expect(renderEntityCard(entity, 'character', 'brief')).toEqual(
      renderEntityCard(entity, 'character', 'brief'),
    );
  });
});
