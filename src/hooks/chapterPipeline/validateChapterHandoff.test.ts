import { describe, expect, it } from 'vitest';
import { validateChapterHandoff, HandoffValidationInput } from './validateChapterHandoff';
import { ChapterHandoff, SceneFingerprint, StoryMemory } from '../../types';

const emptyMemory = (): StoryMemory => ({
  powerSystem: 'Qi',
  currentPowerStage: 'Foundation',
  worldRules: [],
  characters: [],
  unresolvedPlotThreads: [],
  resolvedPlotThreads: [],
  artifacts: [],
  abilities: [],
});

const duelFp = (overrides: Partial<SceneFingerprint> = {}): SceneFingerprint => ({
  actionType: 'duel',
  participants: ['Li Wei', 'Elder Kang'],
  location: 'Azure Peak arena',
  outcome: 'Li Wei wins',
  chapterNumber: 9,
  ...overrides,
});

const handoffWith = (fingerprints: SceneFingerprint[]): ChapterHandoff => ({
  version: 1,
  chapterNumber: 10,
  endState: {},
  completedEvents: [],
  fingerprints,
});

const baseInput = (overrides: Partial<HandoffValidationInput> = {}): HandoffValidationInput => ({
  chapterNumber: 10,
  memory: emptyMemory(),
  priorFingerprints: [],
  ...overrides,
});

describe('validateChapterHandoff — duplicate scenes', () => {
  it('flags an exact repeat of the previous chapter as a hard fault', () => {
    const result = validateChapterHandoff(baseInput({
      handoff: handoffWith([duelFp({ chapterNumber: 10 })]),
      priorFingerprints: [duelFp({ chapterNumber: 9 })],
    }));
    expect(result.hardFaults).toHaveLength(1);
    expect(result.hardFaults[0]).toContain('Duplicate scene');
  });

  it('passes a rematch in a different location — known-different locations never match', () => {
    const result = validateChapterHandoff(baseInput({
      handoff: handoffWith([duelFp({ chapterNumber: 10, location: 'Frozen Lake' })]),
      priorFingerprints: [duelFp({ chapterNumber: 9 })],
    }));
    expect(result.hardFaults).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('downgrades to soft when only one side has a location', () => {
    const result = validateChapterHandoff(baseInput({
      handoff: handoffWith([duelFp({ chapterNumber: 10, location: undefined })]),
      priorFingerprints: [duelFp({ chapterNumber: 9 })],
    }));
    expect(result.hardFaults).toEqual([]);
    expect(result.warnings).toHaveLength(1);
  });

  it('downgrades to soft when neither side has a location — no evidence, no hard fault', () => {
    const result = validateChapterHandoff(baseInput({
      handoff: handoffWith([duelFp({ chapterNumber: 10, location: undefined })]),
      priorFingerprints: [duelFp({ chapterNumber: 9, location: undefined })],
    }));
    expect(result.hardFaults).toEqual([]);
    expect(result.warnings).toHaveLength(1);
  });

  it('downgrades to soft when the match is older than the previous chapter', () => {
    const result = validateChapterHandoff(baseInput({
      handoff: handoffWith([duelFp({ chapterNumber: 10 })]),
      priorFingerprints: [duelFp({ chapterNumber: 6 })],
    }));
    expect(result.hardFaults).toEqual([]);
    expect(result.warnings).toHaveLength(1);
  });

  it('downgrades to soft when the premise declares rematch intent', () => {
    const result = validateChapterHandoff(baseInput({
      premise: 'Li Wei faces Elder Kang once more in a rematch',
      handoff: handoffWith([duelFp({ chapterNumber: 10 })]),
      priorFingerprints: [duelFp({ chapterNumber: 9 })],
    }));
    expect(result.hardFaults).toEqual([]);
    expect(result.warnings).toHaveLength(1);
  });

  it('passes different action types and low participant overlap', () => {
    const result = validateChapterHandoff(baseInput({
      handoff: handoffWith([
        duelFp({ chapterNumber: 10, actionType: 'social' }),
        duelFp({ chapterNumber: 10, participants: ['Mei Lian', 'Bandit King'] }),
      ]),
      priorFingerprints: [duelFp({ chapterNumber: 9 })],
    }));
    expect(result.hardFaults).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
});

describe('validateChapterHandoff — artifact and ability sanity', () => {
  it('warns when a destroyed artifact is given a new owner without restoration', () => {
    const memory = emptyMemory();
    memory.artifacts = [{
      id: 'art-1', name: 'Moonshard Pendant', description: '', condition: 'destroyed',
    }];
    const result = validateChapterHandoff(baseInput({
      memory,
      memoryUpdates: { artifactUpdates: [{ name: 'Moonshard Pendant', newOwner: 'Li Wei' }] },
    }));
    expect(result.warnings.some(w => w.includes('destroyed'))).toBe(true);
  });

  it('warns when an artifact is assigned to a deceased character', () => {
    const memory = emptyMemory();
    memory.artifacts = [{ id: 'art-1', name: 'Moon Sword', description: '' }];
    memory.characters = [{
      id: 'char-1', name: 'Elder Kang', role: 'Elder', description: '',
      relationshipToMC: 'Enemy', status: 'deceased',
    }];
    const result = validateChapterHandoff(baseInput({
      memory,
      memoryUpdates: { artifactUpdates: [{ name: 'Moon Sword', newOwner: 'Elder Kang' }] },
    }));
    expect(result.warnings.some(w => w.includes('deceased'))).toBe(true);
  });

  it('warns when a "new" artifact already exists in the Codex', () => {
    const memory = emptyMemory();
    memory.artifacts = [{
      id: 'art-1', name: 'Moon Sword', description: '', currentOwner: 'Li Wei',
    }];
    const result = validateChapterHandoff(baseInput({
      memory,
      memoryUpdates: { newArtifacts: [{ name: 'Moon Sword' }] },
    }));
    expect(result.warnings.some(w => w.includes('already exists'))).toBe(true);
  });

  it('warns when an ability is re-acquired', () => {
    const memory = emptyMemory();
    memory.abilities = [{ id: 'abil-1', name: 'Azure Sky Sword Art', description: '' }];
    const result = validateChapterHandoff(baseInput({
      memory,
      memoryUpdates: { newMCAbilities: [{ name: 'Azure Sky Sword Art' }] },
    }));
    expect(result.warnings.some(w => w.includes('re-acquired'))).toBe(true);
  });
});

describe('validateChapterHandoff — contract report', () => {
  const contract = {
    version: 1 as const,
    chapterNumber: 10,
    objective: 'Escape the sect',
    requiredOpening: 'Leave the arena',
    doNotRepeat: [],
  };

  it('warns on unfulfilled objective and mismatched opening', () => {
    const result = validateChapterHandoff(baseInput({
      contract,
      contractReport: { objectiveFulfilled: false, openingMatched: false },
    }));
    expect(result.warnings.some(w => w.includes('objective'))).toBe(true);
    expect(result.warnings.some(w => w.includes('opening'))).toBe(true);
    expect(result.hardFaults).toEqual([]);
  });

  it('stays quiet when the contract is fulfilled', () => {
    const result = validateChapterHandoff(baseInput({
      contract,
      contractReport: { objectiveFulfilled: true, openingMatched: true },
    }));
    expect(result.warnings).toEqual([]);
  });

  it('validates clean for legacy chapters with no handoff/contract at all', () => {
    expect(validateChapterHandoff(baseInput())).toEqual({ hardFaults: [], warnings: [] });
  });
});
