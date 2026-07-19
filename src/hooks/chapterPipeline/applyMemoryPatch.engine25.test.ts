import { describe, expect, it, beforeEach } from 'vitest';
import { applyMemoryPatch } from './applyMemoryPatch';
import { Ability, Story, StoryMemory } from '../../types';

describe('applyMemoryPatch — Context Engine 2.5 extensions', () => {
  let mockStory: Story;

  beforeEach(() => {
    mockStory = {
      id: 'test-story',
      title: 'Test Story',
      memory: {
        powerSystem: 'Qi',
        currentPowerStage: 'Foundation',
        worldRules: [],
        characters: [],
        factions: [],
        locations: [],
        artifacts: [],
        abilities: [],
        unresolvedPlotThreads: [],
        resolvedPlotThreads: [],
      } as StoryMemory,
      arcs: [{ title: 'Arc 1', summary: '', chapters: [], isCompleted: false }],
      relationships: [],
    } as any;
  });

  describe('artifact condition and location', () => {
    beforeEach(() => {
      mockStory.memory.artifacts = [{
        id: 'art-1',
        name: 'Moonshard Pendant',
        description: 'A pale shard.',
        currentOwner: 'Li Wei',
      }];
    });

    it('applies newCondition, newLocation, and lastStateChapter', () => {
      const next = applyMemoryPatch(mockStory, {
        memoryUpdates: {
          artifactUpdates: [{
            name: 'Moonshard Pendant',
            newCondition: 'destroyed',
            newLocation: 'Azure Peak arena',
          }],
        },
      }, 7, false, 0);

      const artifact = next.artifacts![0];
      expect(artifact.condition).toBe('destroyed');
      expect(artifact.holderLocation).toBe('Azure Peak arena');
      expect(artifact.lastStateChapter).toBe(7);
      expect(artifact.pendingEvolution).toBe(true);
      expect(artifact.evolutionReason).toBe('Artifact State Change');
    });

    it('leaves lastStateChapter untouched when nothing changed', () => {
      const next = applyMemoryPatch(mockStory, {
        memoryUpdates: {
          artifactUpdates: [{ name: 'Moonshard Pendant', descriptionAppend: 'It hums.' }],
        },
      }, 7, false, 0);
      expect(next.artifacts![0].lastStateChapter).toBeUndefined();
      expect(next.artifacts![0].condition).toBeUndefined();
    });
  });

  describe('duplicate ability acquisition', () => {
    beforeEach(() => {
      mockStory.memory.abilities = [{
        id: 'abil-1',
        name: 'Azure Sky Sword Art',
        description: 'A sword art.',
        masteryLevel: 'Expert',
      }];
    });

    it('merges a duplicate acquisition as a progression event instead of adding a twin', () => {
      const next = applyMemoryPatch(mockStory, {
        memoryUpdates: {
          newMCAbilities: [{ name: 'Azure Sky Sword Art', masteryLevel: 'Perfected' }],
        },
      }, 8, false, 0);

      expect(next.abilities).toHaveLength(1);
      const ability = next.abilities![0] as Ability;
      expect(ability.masteryLevel).toBe('Perfected');
      expect(ability.progression).toHaveLength(1);
      expect(ability.progression![0]).toMatchObject({
        chapter: 8,
        fromMastery: 'Expert',
        toMastery: 'Perfected',
        note: 'duplicate acquisition merged',
      });
      expect(next.memoryWarnings?.some(w => w.includes('re-acquired'))).toBe(true);
    });

    it('never downgrades a comparable higher mastery on duplicate merge', () => {
      const next = applyMemoryPatch(mockStory, {
        memoryUpdates: {
          newMCAbilities: [{ name: 'Azure Sky Sword Art', masteryLevel: 'Novice' }],
        },
      }, 8, false, 0);

      const ability = next.abilities![0] as Ability;
      expect(ability.masteryLevel).toBe('Expert');
      expect(ability.progression![0].toMastery).toBe('Expert');
    });

    it('still adds genuinely new abilities', () => {
      const next = applyMemoryPatch(mockStory, {
        memoryUpdates: {
          newMCAbilities: [{ name: 'Crimson Lotus Palm', masteryLevel: 'Novice' }],
        },
      }, 8, false, 0);
      expect(next.abilities).toHaveLength(2);
    });
  });

  describe('mcAbilityUpdates progression', () => {
    it('records a progression event on mastery change without mutating prior memory', () => {
      const original: Ability = {
        id: 'abil-1',
        name: 'Azure Sky Sword Art',
        description: '',
        masteryLevel: 'Novice',
      };
      mockStory.memory.abilities = [original];

      const next = applyMemoryPatch(mockStory, {
        memoryUpdates: {
          mcAbilityUpdates: [{ name: 'Azure Sky Sword Art', newMasteryLevel: 'Adept', lastUsedChapter: 9 }],
        },
      }, 9, false, 0);

      const updated = next.abilities![0] as Ability;
      expect(updated.masteryLevel).toBe('Adept');
      expect(updated.lastUsedChapter).toBe(9);
      expect(updated.progression).toEqual([
        { chapter: 9, fromMastery: 'Novice', toMastery: 'Adept' },
      ]);
      // The original ledger entry must not have been mutated in place.
      expect(original.masteryLevel).toBe('Novice');
      expect(original.progression).toBeUndefined();
    });

    it('ignores comparable mastery downgrades and records a warning', () => {
      mockStory.memory.abilities = [{
        id: 'abil-1', name: 'Azure Sky Sword Art', description: '', masteryLevel: 'Master',
      }];
      const next = applyMemoryPatch(mockStory, {
        memoryUpdates: {
          mcAbilityUpdates: [{ name: 'Azure Sky Sword Art', newMasteryLevel: 'Novice' }],
        },
      }, 9, false, 0);
      expect((next.abilities![0] as Ability).masteryLevel).toBe('Master');
      expect(next.memoryWarnings?.some(w => w.includes('downgrade'))).toBe(true);
    });

    it('normalizes legacy string-form abilities before recording progression', () => {
      mockStory.memory.abilities = ['Azure Sky Sword Art'];
      const next = applyMemoryPatch(mockStory, {
        memoryUpdates: {
          mcAbilityUpdates: [{ name: 'Azure Sky Sword Art', newMasteryLevel: 'Adept' }],
        },
      }, 9, false, 0);

      const updated = next.abilities![0] as Ability;
      expect(typeof updated).toBe('object');
      expect(updated.name).toBe('Azure Sky Sword Art');
      expect(updated.masteryLevel).toBe('Adept');
      expect(updated.progression).toHaveLength(1);
    });

    it('applies non-comparable mastery labels without downgrade protection', () => {
      mockStory.memory.abilities = [{
        id: 'abil-1', name: 'Azure Sky Sword Art', description: '', masteryLevel: 'Third Sword Heart',
      }];
      const next = applyMemoryPatch(mockStory, {
        memoryUpdates: {
          mcAbilityUpdates: [{ name: 'Azure Sky Sword Art', newMasteryLevel: 'Fourth Sword Heart' }],
        },
      }, 9, false, 0);
      expect((next.abilities![0] as Ability).masteryLevel).toBe('Fourth Sword Heart');
    });
  });
});
