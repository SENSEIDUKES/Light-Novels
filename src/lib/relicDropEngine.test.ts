import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processChapterDrops } from './relicDropEngine';
import { unlockCosmicArtifact } from './artifacts';
import { Chapter, CosmicArtifact } from '../types';

vi.mock('./artifacts', () => ({
  unlockCosmicArtifact: vi.fn(async (artifact) => ({
    ...artifact,
    id: 'artifact-1',
    unlockedAt: '2026-07-22T00:00:00.000Z',
  })),
}));

describe('Drop Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(unlockCosmicArtifact).mockImplementation(async (artifact) => ({
      ...(artifact as object),
      id: 'artifact-1',
      unlockedAt: '2026-07-22T00:00:00.000Z',
    } as any));
  });

  const mockStory: { id: string; title: string } = {
    id: 'story-999',
    title: 'The Grand Ascendancy'
  };

  describe('1. Selective worldCard Signals', () => {
    it('should ignore routine character and location worldCards', async () => {
      const chapter: Chapter = {
        number: 1,
        title: 'The Awakening',
        premise: 'Ye Fan awakens his bloodline.',
        status: 'unlocked',
        blocks: [
          {
            id: 'b1',
            type: 'paragraph',
            text: 'An elegant lady walked in.',
            worldCard: {
              entityType: 'character',
              entityName: 'Lady Mei',
              displayTitle: 'Lady Mei of the Lotus Sect',
              quote: 'My lotus flower shall bloom in blood.',
              audioType: 'tts_line'
            }
          },
          {
            id: 'b2',
            type: 'paragraph',
            text: 'They reached the peak.',
            worldCard: {
              entityType: 'location',
              entityName: 'Cloud Peak',
              displayTitle: 'Cloud Peak Summit'
            }
          }
        ]
      };

      const drops = await processChapterDrops(chapter, mockStory);
      expect(drops).toHaveLength(0);
      expect(unlockCosmicArtifact).not.toHaveBeenCalled();
    });

    it('should drop a CosmicArtifact for Legendary/Mythic artifact awakenings', async () => {
      const chapter: Chapter = {
        number: 1,
        title: 'The Awakening',
        premise: 'A divine artifact awakens.',
        status: 'unlocked',
        blocks: [
          {
            id: 'b3',
            type: 'paragraph',
            text: 'The sword awakened with celestial radiance.',
            worldCard: {
              entityType: 'artifact',
              entityName: 'Heavenly Void Sword',
              displayTitle: 'Supreme Relic',
              quote: 'Shatter the sky.',
              rarity: 'Legendary',
              sound: { assetFamily: 'relic' }
            }
          }
        ]
      };

      const drops = await processChapterDrops(chapter, mockStory);
      expect(drops).toHaveLength(1);
      
      const drop = drops[0];
      expect(drop.name).toBe('Heavenly Void Sword');
      expect(drop.rarity).toBe('Legendary');
      expect(drop.milestoneType).toBe('codex_linked');
      expect(unlockCosmicArtifact).toHaveBeenCalled();
    });

    it('drops lower-rarity artifact worldCards with their rarity preserved', async () => {
      const chapter: Chapter = {
        number: 2,
        title: 'Routine Relic',
        premise: 'A minor artifact hums.',
        status: 'unlocked',
        blocks: [{
          id: 'b4',
          type: 'paragraph',
          text: 'A common charm hums.',
          worldCard: {
            entityType: 'artifact',
            entityName: 'Common Charm',
            displayTitle: 'Minor Trinket',
            rarity: 'Common',
            sound: { assetFamily: 'relic' },
          },
        }],
      };

      const drops = await processChapterDrops(chapter, mockStory);
      expect(drops).toHaveLength(1);
      expect(drops[0].name).toBe('Common Charm');
      expect(drops[0].rarity).toBe('Common');
      expect(unlockCosmicArtifact).toHaveBeenCalled();
    });

    it('drops Rare artifact worldCards and normalizes generator casing', async () => {
      const chapter: Chapter = {
        number: 2,
        title: 'Rare Relic',
        premise: 'A jade talisman glimmers.',
        status: 'unlocked',
        blocks: [{
          id: 'b4b',
          type: 'paragraph',
          text: 'A talisman glimmers.',
          worldCard: {
            entityType: 'artifact',
            entityName: 'Jade Talisman',
            displayTitle: 'Rare Relic',
            rarity: 'rare' as CosmicArtifact['rarity'],
          },
        }],
      };

      const drops = await processChapterDrops(chapter, mockStory);
      expect(drops).toHaveLength(1);
      expect(drops[0].rarity).toBe('Rare');
    });

    it('skips artifact worldCards whose rarity cannot be recognized', async () => {
      const chapter: Chapter = {
        number: 2,
        title: 'Nameless Relic',
        premise: 'A trinket without rank.',
        status: 'unlocked',
        blocks: [{
          id: 'b4c',
          type: 'paragraph',
          text: 'A trinket gleams.',
          worldCard: {
            entityType: 'artifact',
            entityName: 'Nameless Trinket',
            displayTitle: 'Unranked Trinket',
            rarity: 'Uncommon' as CosmicArtifact['rarity'],
          },
        }],
      };

      const drops = await processChapterDrops(chapter, mockStory);
      expect(drops).toHaveLength(0);
      expect(unlockCosmicArtifact).not.toHaveBeenCalled();
    });

    it('accepts a Mythic artifact without relic audio and normalizes generator casing', async () => {
      const chapter: Chapter = {
        number: 3,
        title: 'Mythic Awakening',
        premise: 'A mythic artifact awakens.',
        status: 'unlocked',
        blocks: [{
          id: 'b5',
          type: 'paragraph',
          text: 'A crown blazes.',
          worldCard: {
            entityType: 'artifact',
            entityName: 'Crown of Stars',
            displayTitle: 'Mythic Relic',
            rarity: 'mythic' as CosmicArtifact['rarity'],
          },
        }],
      };

      const drops = await processChapterDrops(chapter, mockStory);
      expect(drops).toHaveLength(1);
      expect(drops[0].rarity).toBe('Mythic');
    });
  });

  describe('2. Major system Signals', () => {
    it('should drop a CosmicArtifact on major level_up system event without forcing Legendary', async () => {
      const chapter: Chapter = {
        number: 4,
        title: 'Breakthrough',
        premise: 'Breaking through constraints.',
        status: 'unlocked',
        blocks: [
          {
            id: 'b5',
            type: 'system',
            text: 'Breakthrough achieved!',
            system: {
              kind: 'level_up',
              title: 'Golden Core Stage'
            }
          }
        ]
      };

      const drops = await processChapterDrops(chapter, mockStory);
      expect(drops).toHaveLength(1);
      const drop = drops[0];
      expect(drop.name).toBe('Realm Breakthrough Elixir: Golden Core Stage');
      // Unrated breakthroughs fall back to Epic, never Legendary.
      expect(drop.rarity).toBe('Epic');
    });

    it('honors the generator-assigned rarity on level_up events', async () => {
      const chapter: Chapter = {
        number: 4,
        title: 'Mythic Breakthrough',
        premise: 'Shattering the ceiling of the world.',
        status: 'unlocked',
        blocks: [
          {
            id: 'b5m',
            type: 'system',
            text: 'A mythic breakthrough shakes the heavens!',
            system: {
              kind: 'level_up',
              title: 'Nascent Soul Stage',
              rarity: 'Mythic'
            }
          }
        ]
      };

      const drops = await processChapterDrops(chapter, mockStory);
      expect(drops).toHaveLength(1);
      expect(drops[0].rarity).toBe('Mythic');
    });

    it('should drop a CosmicArtifact for Legendary skill acquisition', async () => {
      const chapter: Chapter = {
        number: 3,
        title: 'Supreme Skill',
        premise: 'Learning legendary techniques.',
        status: 'unlocked',
        blocks: [
          {
            id: 'b4',
            type: 'system',
            text: 'You have acquired supreme technique!',
            system: {
              kind: 'skill_acquired',
              title: 'Nine-Fold Heavenly Palm',
              rarity: 'Legendary'
            }
          }
        ]
      };

      const drops = await processChapterDrops(chapter, mockStory);
      expect(drops).toHaveLength(1);
      const drop = drops[0];
      expect(drop.name).toBe('Esoteric Jade Scroll: Nine-Fold Heavenly Palm');
      expect(drop.rarity).toBe('Legendary');
    });
  });

  describe('3. Major fateResult Signals', () => {
    it('should drop a high-tier Fatebreaker Talisman on FATE AVERTED outcome', async () => {
      const chapter: Chapter = {
        number: 5,
        title: 'Triumph',
        premise: 'Shaking the heavens.',
        status: 'unlocked',
        blocks: [
          {
            id: 'b6',
            type: 'system',
            text: 'You have defied the heavens!',
            system: {
              kind: 'fate_result',
              title: 'Karmic Confrontation',
              fateResult: {
                outcome: 'FATE AVERTED',
                timelineScar: 'The Elder is silenced forever.',
                permanentCosts: ['Severe spiritual exhaustion']
              }
            }
          }
        ]
      };

      const drops = await processChapterDrops(chapter, mockStory);
      expect(drops).toHaveLength(1);
      const drop = drops[0];
      expect(drop.name).toBe('Fatebreaker Talisman');
      expect(drop.rarity).toBe('Legendary');
      expect(drop.attributeBoost).toBe('+30% Karma Shield');
    });
  });

  describe('4. Major beast Signals', () => {
    it('should drop a CosmicArtifact for Boss, Calamity, or Mythic beast defeats', async () => {
      const chapter: Chapter = {
        number: 6,
        title: 'The Great Wyrm',
        premise: 'A battle of colossal proportions.',
        status: 'unlocked',
        blocks: [
          {
            id: 'b7',
            type: 'paragraph',
            text: 'The sky turned red as the dragon was vanquished.',
            metadata: {
              beastEvent: {
                type: 'death',
                profile: {
                  size: 'giant',
                  bodyType: 'dragon',
                  element: 'fire',
                  threatTier: 'boss'
                }
              }
            }
          }
        ]
      };

      const drops = await processChapterDrops(chapter, mockStory);
      expect(drops).toHaveLength(1);
      const drop = drops[0];
      expect(drop.name).toBe('Boss Fire Dragon Core');
      expect(drop.rarity).toBe('Epic');
    });

    it('should ignore common beast encounters', async () => {
      const chapter: Chapter = {
        number: 7,
        title: 'Common Hunting',
        premise: 'Hunting weak beasts.',
        status: 'unlocked',
        blocks: [
          {
            id: 'b8',
            type: 'paragraph',
            text: 'A wild wolf appeared.',
            metadata: {
              beastEvent: {
                type: 'reveal',
                profile: {
                  bodyType: 'mammal',
                  threatTier: 'common'
                }
              }
            }
          }
        ]
      };

      const drops = await processChapterDrops(chapter, mockStory);
      expect(drops).toHaveLength(0);
    });
  });
});
