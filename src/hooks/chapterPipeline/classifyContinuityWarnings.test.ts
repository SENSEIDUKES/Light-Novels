import { describe, it, expect } from 'vitest';
import { classifyContinuityWarnings } from './classifyContinuityWarnings';
import { StoryMemory } from '../../types';

const memoryWith = (partial: Partial<StoryMemory>): StoryMemory =>
  ({
    powerSystem: '',
    currentPowerStage: '',
    worldRules: [],
    characters: [],
    unresolvedPlotThreads: [],
    resolvedPlotThreads: [],
    ...partial,
  } as StoryMemory);

const emptyMemory = memoryWith({});

describe('classifyContinuityWarnings', () => {
  it('drops the self-negating "no contradictions found" essay (screenshot 1)', () => {
    const essay =
      "The chapter mentions Zhu Feng's technique as 'Spiritual Energy Cultivation', which is consistent with the Codex. " +
      'No direct contradictions found, but the narrative is heavily reliant on the system. No contradictions found.';
    const { severe, soft } = classifyContinuityWarnings([essay], 'Zhu Feng cultivated.', emptyMemory);
    expect(severe).toEqual([]);
    expect(soft).toEqual([]);
  });

  it('drops duplicate-image-data noise (screenshot 2)', () => {
    const warnings = [
      "Chapter Text contains image data for 'Zhu Feng' (char-5slteiy7f) that is identical to the existing Codex entry.",
      "Chapter Text contains image data for 'Elder Mei' (char-cxaxsdx8u) that is identical to the existing Codex entry.",
    ];
    const { severe, soft } = classifyContinuityWarnings(warnings, 'prose', emptyMemory);
    expect(severe).toEqual([]);
    expect(soft).toEqual([]);
  });

  it('surfaces a genuine deceased-entity contradiction as severe', () => {
    const memory = memoryWith({
      characters: [
        { id: 'c1', name: 'Elder Zhao', status: 'deceased', role: '', description: '', relationshipToMC: '' } as any,
      ],
    });
    const warning = 'Elder Zhao is marked deceased but speaks and fights in the present scene.';
    const prose = 'Elder Zhao raised his blade and struck.';
    const { severe, soft } = classifyContinuityWarnings([warning], prose, memory);
    expect(severe).toEqual([warning]);
    expect(soft).toEqual([]);
  });

  it('does NOT surface a deceased-entity warning when that entity is absent from the prose', () => {
    const memory = memoryWith({
      characters: [
        { id: 'c1', name: 'Elder Zhao', status: 'deceased', role: '', description: '', relationshipToMC: '' } as any,
      ],
    });
    const warning = 'Elder Zhao might be contradicted somewhere.';
    const { severe, soft } = classifyContinuityWarnings([warning], 'A calm day passed.', memory);
    expect(severe).toEqual([]);
    expect(soft).toEqual([warning]);
  });

  it('does NOT surface when a short dead name only appears as a substring of other words', () => {
    const memory = memoryWith({
      characters: [
        { id: 'c1', name: 'Lin', status: 'deceased', role: '', description: '', relationshipToMC: '' } as any,
      ],
    });
    const warning = 'The timeline seems to have a broken link.';
    const prose = 'He was smiling as the sun set.';
    const { severe, soft } = classifyContinuityWarnings([warning], prose, memory);
    expect(severe).toEqual([]);
    expect(soft).toEqual([warning]);
  });

  it('still surfaces a short dead name when it appears as a whole word', () => {
    const memory = memoryWith({
      characters: [
        { id: 'c1', name: 'Lin', status: 'deceased', role: '', description: '', relationshipToMC: '' } as any,
      ],
    });
    const warning = 'Lin is marked deceased but draws her blade in this scene.';
    const prose = 'Lin stepped forward, blade drawn.';
    const { severe } = classifyContinuityWarnings([warning], prose, memory);
    expect(severe).toEqual([warning]);
  });

  it('surfaces a deceased entity with an accented (non-ASCII) name', () => {
    const memory = memoryWith({
      characters: [
        { id: 'c1', name: 'René', status: 'deceased', role: '', description: '', relationshipToMC: '' } as any,
      ],
    });
    const warning = 'René is recorded as deceased yet draws steel in this scene.';
    const prose = 'René raised his sword against the dawn.';
    const { severe } = classifyContinuityWarnings([warning], prose, memory);
    expect(severe).toEqual([warning]);
  });

  it('surfaces a deceased entity with a CJK name (ASCII \\b would miss this)', () => {
    const memory = memoryWith({
      characters: [
        { id: 'c1', name: '林越', status: 'deceased', role: '', description: '', relationshipToMC: '' } as any,
      ],
    });
    const warning = '林越 is marked deceased but speaks in the present scene.';
    const prose = '林越 走进大殿。';
    const { severe } = classifyContinuityWarnings([warning], prose, memory);
    expect(severe).toEqual([warning]);
  });

  it('early chapters with no deceased entities can never produce a severe fault', () => {
    const warning = 'Something about the plot feels off with Lin Yue.';
    const { severe, soft } = classifyContinuityWarnings([warning], 'Lin Yue smiled.', emptyMemory);
    expect(severe).toEqual([]);
    expect(soft).toEqual([warning]);
  });

  it('surfaces a destroyed faction contradiction as severe', () => {
    const memory = memoryWith({
      factions: [{ id: 'f1', name: 'Azure Mist Sect', status: 'Destroyed', description: '', alignment: 'Neutral' } as any],
    });
    const warning = 'The Azure Mist Sect is recorded as Destroyed yet stands intact in this scene.';
    const prose = 'They walked through the Azure Mist Sect gates.';
    const { severe } = classifyContinuityWarnings([warning], prose, memory);
    expect(severe).toEqual([warning]);
  });

  it('caps soft notes at four', () => {
    const warnings = Array.from({ length: 9 }, (_, i) => `Soft note number ${i}`);
    const { soft } = classifyContinuityWarnings(warnings, 'prose', emptyMemory);
    expect(soft.length).toBe(4);
  });

  it('handles empty / non-array input gracefully', () => {
    expect(classifyContinuityWarnings([], 'p', emptyMemory)).toEqual({ severe: [], soft: [] });
    expect(classifyContinuityWarnings(null as any, 'p', emptyMemory)).toEqual({ severe: [], soft: [] });
  });
});
