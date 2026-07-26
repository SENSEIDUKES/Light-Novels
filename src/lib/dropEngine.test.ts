import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processChapterDrops } from './dropEngine';
import { unlockCosmicArtifact } from './artifacts';
import { Chapter } from '../types';

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

  describe('1. worldCard Signals', () => {
    it('should drop a CosmicArtifact for a character worldCard', async () => {
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
          }
        ]
      };

      const drops = await processChapterDrops(chapter, mockStory);
      expect(drops).toHaveLength(1);
      
      const drop = drops[0];
      expect(drop.name).toBe('Karmic Token: Lady Mei');
      expect(drop.rarity).toBe('Rare');
      expect(drop.attributeBoost).toBe('+10% Lady Mei Affinity');
      expect(drop.milestoneType).toBe('codex_linked');
      expect(drop.milestoneName).toBe('Character Fate Encounter');
      expect(drop.description).toContain('Lady Mei of the Lotus Sect'); // from quote fallback, but we passed quote 'My lotus flower shall bloom in blood.'
      expect(drop.description).toContain('My lotus flower shall bloom in blood.');
      expect(unlockCosmicArtifact).toHaveBeenCalled();
    });

    it('should drop a CosmicArtifact for a creature/beast worldCard', async () => {
      const chapter: Chapter = {
        number: 1,
        title: 'The Beast',
        premise: 'A wild tiger appears.',
        status: 'unlocked',
        blocks: [
          {
            id: 'b2',
            type: 'paragraph',
            text: 'A shadow leaped from the bushes.',
            worldCard: {
              entityType: 'creature',
              entityName: 'Spotted Shadow Leopard',
              displayTitle: 'Lethal Leopard',
              quote: 'Grrrr...',
              audioType: 'roar'
            }
          }
        ]
      };

      const drops = await processChapterDrops(chapter, mockStory);
      expect(drops).toHaveLength(1);
      
      const drop = drops[0];
      expect(drop.name).toBe('Beast Core: Spotted Shadow Leopard');
      expect(drop.rarity).toBe('Rare');
      expect(drop.attributeBoost).toBe('+12% Beast Resonance');
      expect(drop.milestoneType).toBe('codex_linked');
    });

    it('should drop a CosmicArtifact for a location worldCard', async () => {
      const chapter: Chapter = {
        number: 2,
        title: 'The Sacred Mountain',
        premise: 'Ascending the peaks.',
        status: 'unlocked',
        blocks: [
          {
            id: 'b3',
            type: 'paragraph',
            text: 'The summit towered above them.',
            worldCard: {
              entityType: 'location',
              entityName: 'Cloud Pillar Summit',
              displayTitle: 'Cloud Pillar Peak',
              audioType: 'signature'
            }
          }
        ]
      };

      const drops = await processChapterDrops(chapter, mockStory);
      expect(drops).toHaveLength(1);
      const drop = drops[0];
      expect(drop.name).toBe('Spatial Anchor: Cloud Pillar Summit');
      expect(drop.rarity).toBe('Common');
      expect(drop.attributeBoost).toBe('+8% Realm Stability');
    });
  });

  describe('2. system Signals', () => {
    it('should drop a CosmicArtifact on skill_acquired system event', async () => {
      const chapter: Chapter = {
        number: 3,
        title: 'Martial Skill',
        premise: 'Learning new forms.',
        status: 'unlocked',
        blocks: [
          {
            id: 'b4',
            type: 'system',
            text: 'You have acquired Jade Palm!',
            system: {
              kind: 'skill_acquired',
              title: 'Nine-Fold Jade Palm',
              rarity: 'Legendary'
            }
          }
        ]
      };

      const drops = await processChapterDrops(chapter, mockStory);
      expect(drops).toHaveLength(1);
      const drop = drops[0];
      expect(drop.name).toBe('Jade Scroll: Nine-Fold Jade Palm');
      expect(drop.rarity).toBe('Legendary');
      expect(drop.attributeBoost).toBe('+15% Technique Mastery');
    });

    it('should drop a CosmicArtifact on level_up system event', async () => {
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
              title: 'Qi Condensation Tier 9'
            }
          }
        ]
      };

      const drops = await processChapterDrops(chapter, mockStory);
      expect(drops).toHaveLength(1);
      const drop = drops[0];
      expect(drop.name).toBe('Celestial Breakthrough Pill: Qi Condensation Tier 9');
      expect(drop.rarity).toBe('Rare');
      expect(drop.attributeBoost).toBe('+20% Base Qi');
    });
  });

  describe('3. fateResult Signals', () => {
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
                permanentCosts: ['Severe spiritual exhaustion'],
                newStoryState: 'Outer Wilderness Master',
                newActiveStats: ['+200 Qi'],
                genreShift: 'Wuxia Epic'
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
      expect(drop.description).toContain('The Elder is silenced forever.');
      expect(drop.attributeBoost).toBe('+30% Karma Shield');
    });
  });

  describe('4. beast Signals', () => {
    it('should drop a CosmicArtifact based on a beastEvent signal in metadata', async () => {
      const chapter: Chapter = {
        number: 6,
        title: 'The Great Wyrm',
        premise: 'A battle of colossal proportions.',
        status: 'unlocked',
        blocks: [
          {
            id: 'b7',
            type: 'paragraph',
            text: 'The sky turned red as the dragon roared.',
            metadata: {
              beastEvent: {
                type: 'reveal',
                profile: {
                  size: 'giant',
                  bodyType: 'dragon',
                  element: 'fire',
                  movement: 'flying',
                  intelligence: 'ancient',
                  threatTier: 'boss',
                  signatureSound: 'roar'
                }
              }
            }
          }
        ]
      };

      const drops = await processChapterDrops(chapter, mockStory);
      expect(drops).toHaveLength(1);
      const drop = drops[0];
      expect(drop.name).toBe('Fire Dragon Essence');
      expect(drop.rarity).toBe('Epic');
      expect(drop.description).toContain('Derived from a giant boss beast');
      expect(drop.attributeBoost).toBe('+15% Fire Resonance');
    });
  });
});
