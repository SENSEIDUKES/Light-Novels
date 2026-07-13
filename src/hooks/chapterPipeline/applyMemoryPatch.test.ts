import { applyMemoryPatch } from './applyMemoryPatch';
import { Story, StoryMemory } from '../../types';

describe('applyMemoryPatch', () => {
  let mockStory: Story;

  beforeEach(() => {
    mockStory = {
      id: 'test-story',
      title: 'Test Story',
      genre: 'Test Genre',
      setting: 'Test Setting',
      premise: 'Test Premise',
      memory: {
        characters: [],
        factions: [],
        locations: [],
        artifacts: [],
        abilities: [],
        unresolvedPlotThreads: [],
        resolvedPlotThreads: [],
      } as StoryMemory,
      arcs: [{
        id: 'arc-1',
        title: 'Arc 1',
        summary: 'Arc 1 summary',
        chapters: [],
        status: 'in_progress',
        order: 1
      }],
      relationships: [],
    } as any;
  });

  it('should return current memory if memoryUpdates is not present', () => {
    const nextMemory = applyMemoryPatch(mockStory, {}, 1, false, 0);
    expect(nextMemory).toEqual(mockStory.memory);
  });

  it('should update currentPowerStage', () => {
    const data = { memoryUpdates: { currentPowerStage: 'Stage 2' } };
    const nextMemory = applyMemoryPatch(mockStory, data, 1, false, 0);
    expect(nextMemory.currentPowerStage).toBe('Stage 2');
  });

  it('should add new characters', () => {
    const data = {
      memoryUpdates: {
        newCharacters: [
          { name: 'John', role: 'Warrior' }
        ]
      },
      chapterText: "Long text here that doesn't trigger length check but provides some words."
    };
    const nextMemory = applyMemoryPatch(mockStory, data, 1, false, 0);
    expect(nextMemory.characters).toHaveLength(1);
    expect(nextMemory.characters?.[0].name).toBe('John');
    expect(nextMemory.characters?.[0].role).toBe('Warrior');
    expect(nextMemory.characters?.[0].firstAppeared).toBe(1);
  });

  it('uses trusted aliases for resolution but ignores model-proposed aliases', () => {
    mockStory.memory.characters = [{
      id: 'char-1',
      name: 'Mei Lian',
      aliases: ['Sister Mei'],
      role: 'Pavilion Mistress',
      description: '',
      relationshipToMC: 'Neutral',
      status: 'alive'
    }];

    const nextMemory = applyMemoryPatch(mockStory, {
      memoryUpdates: {
        newCharacters: [{
          name: 'Lan Wei',
          aliases: ['Little Lan'],
          role: 'Disciple'
        }],
        characterStatusUpdates: [{
          name: 'Sister Mei',
          aliases: ['The Pavilion Mistress', 'sister mei'],
          newRelationship: 'Ally',
        }]
      },
      chapterText: 'The Pavilion Mistress welcomed Little Lan into the sect.'
    }, 2, false, 0);

    expect(nextMemory.characters[0].aliases).toEqual(['Sister Mei']);
    expect(nextMemory.characters[0].relationshipToMC).toBe('Ally');
    expect(nextMemory.characters[1].aliases).toBeUndefined();
  });

  it('should update existing character status', () => {
    mockStory.memory.characters = [
      { id: 'char-1', name: 'John', status: 'alive', powerLevel: 'Low', abilities: [], evolutionReason: '', relevanceState: 'active' } as any
    ];
    
    const data = {
      memoryUpdates: {
        characterStatusUpdates: [
          { name: 'John', newStatus: 'deceased', newPowerLevel: 'Medium' }
        ]
      },
      chapterText: "Some valid text block..."
    };
    
    const nextMemory = applyMemoryPatch(mockStory, data, 1, false, 0);
    expect(nextMemory.characters?.[0].status).toBe('deceased');
    expect(nextMemory.characters?.[0].powerLevel).toBe('Medium');
    expect(nextMemory.characters?.[0].pendingEvolution).toBe(true);
  });

  it('should resolve and update unresolved plot threads', () => {
    mockStory.memory.unresolvedPlotThreads = [
      { id: 'thread-1', description: 'Find the sword', status: 'active', originChapter: 1 }
    ];

    const data = {
      memoryUpdates: {
        newUnresolvedPlotThreads: ['Find the shield'],
        resolvedPlotThreads: ['Find the sword']
      },
      chapterText: "Some text to pass linter"
    };

    const nextMemory = applyMemoryPatch(mockStory, data, 1, false, 0);
    expect(nextMemory.unresolvedPlotThreads).toHaveLength(1);
    expect((nextMemory.unresolvedPlotThreads?.[0] as any).description).toBe('Find the shield');
    
    expect(nextMemory.resolvedPlotThreads).toHaveLength(1);
    expect((nextMemory.resolvedPlotThreads?.[0] as any).description).toBe('Find the sword');
  });

  it('should update relationships', () => {
    const data = {
      memoryUpdates: {
        relationshipUpdates: [
          { sourceName: 'Alice', targetName: 'Bob', affinityDelta: 10, threatDelta: -5, reason: 'Helped in battle' }
        ]
      },
      chapterText: "valid chapter content"
    };

    applyMemoryPatch(mockStory, data, 1, false, 0);
    expect(mockStory.relationships).toHaveLength(1);
    expect(mockStory.relationships?.[0].sourceCharName).toBe('Alice');
    expect(mockStory.relationships?.[0].targetCharName).toBe('Bob');
    expect(mockStory.relationships?.[0].affinity).toBe(10);
    expect(mockStory.relationships?.[0].threat).toBe(-5);
  });

  it('should process arc finishing and clear pending evolutions', () => {
    mockStory.memory.characters = [
      { id: 'char-1', name: 'John', status: 'alive', powerLevel: 'Low', pendingEvolution: true } as any
    ];

    const data = { memoryUpdates: {}, chapterText: "text" };
    const nextMemory = applyMemoryPatch(mockStory, data, 1, true, 0);
    
    expect(nextMemory.characters?.[0].pendingEvolution).toBe(false);
    expect(nextMemory.characters?.[0].evolutionReady).toBe(true);
    expect(nextMemory.characters?.[0].arcAccumulation).toBe('Arc 1 summary');
  });

});
