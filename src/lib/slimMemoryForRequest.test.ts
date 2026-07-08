import { describe, it, expect } from 'vitest';
import { slimMemoryForRequest } from './slimMemoryForRequest';
import { StoryMemory } from '../types';

const bigDataUri = 'data:image/png;base64,' + 'A'.repeat(5000);

const memory = {
  powerSystem: 'Qi cultivation',
  currentPowerStage: 'Core Formation',
  worldRules: ['Rule A'],
  unresolvedPlotThreads: ['A rival plots revenge'],
  resolvedPlotThreads: [],
  characters: [
    {
      id: 'c1',
      name: 'Zhu Feng',
      role: 'MC',
      description: 'A wronged genius',
      relationshipToMC: 'self',
      status: 'alive',
      abilities: ['Nine Star Fist'],
      imageUrl: bigDataUri,
      imageHistory: [{ id: 'i1', imageUrl: bigDataUri, promptUsed: 'portrait' }],
      voiceClipUrl: bigDataUri,
    },
    {
      id: 'c2',
      name: 'Elder Zhao',
      role: 'Elder',
      description: 'Fallen mentor',
      relationshipToMC: 'mentor',
      status: 'deceased',
      imageUrl: bigDataUri,
    },
  ],
  factions: [{ id: 'f1', name: 'Azure Mist Sect', description: 'home sect', alignment: 'Righteous', status: 'Active' }],
} as unknown as StoryMemory;

describe('slimMemoryForRequest', () => {
  it('drops heavy media/vector fields but keeps narrative text', () => {
    const slim = slimMemoryForRequest(memory);
    const serialized = JSON.stringify(slim);

    // No base64 / media survives.
    expect(serialized).not.toContain('data:image');
    expect(serialized).not.toContain('imageUrl');
    expect(serialized).not.toContain('imageHistory');
    expect(serialized).not.toContain('voiceClipUrl');

    // Narrative text the prompt needs is preserved.
    expect(slim.powerSystem).toBe('Qi cultivation');
    expect(slim.characters[0].name).toBe('Zhu Feng');
    expect(slim.characters[0].description).toBe('A wronged genius');
    expect(slim.characters[0].abilities).toEqual(['Nine Star Fist']);
    expect((slim.factions as any)[0].name).toBe('Azure Mist Sect');
  });

  it('preserves the status field the continuity guard depends on', () => {
    const slim = slimMemoryForRequest(memory);
    expect(slim.characters.find((c) => c.name === 'Elder Zhao')?.status).toBe('deceased');
    expect(slim.characters.find((c) => c.name === 'Zhu Feng')?.status).toBe('alive');
  });

  it('massively shrinks the payload', () => {
    const before = JSON.stringify(memory).length;
    const after = JSON.stringify(slimMemoryForRequest(memory)).length;
    expect(after).toBeLessThan(before / 5);
  });

  it('handles empty / null memory without throwing', () => {
    expect(slimMemoryForRequest(null as any)).toEqual({});
    expect(slimMemoryForRequest(undefined as any)).toEqual({});
  });
});
