import { describe, expect, it } from 'vitest';
import {
  buildChapterContract,
  fingerprintToDoNotRepeatLine,
  formatHandoffContextForGuard,
  normalizeSceneActionType,
  renderChapterContractLines,
  sanitizeChapterHandoff,
  sanitizeContractReport,
} from './chapterHandoff';
import { ChapterHandoff, SceneFingerprint } from '../types';

const validHandoff = (): ChapterHandoff => ({
  version: 1,
  chapterNumber: 9,
  endState: {
    location: 'Azure Peak arena',
    timeMarker: 'dusk, same day',
    charactersPresent: ['Li Wei', 'Elder Kang'],
    mcCondition: 'exhausted, qi depleted',
    openTension: 'Elder Kang vows revenge',
  },
  completedEvents: ['Li Wei defeated Elder Kang in the arena'],
  nextImmediateAction: 'Li Wei must leave the arena before the sect guards arrive',
  fingerprints: [{
    actionType: 'duel',
    participants: ['Li Wei', 'Elder Kang'],
    location: 'Azure Peak arena',
    outcome: 'Li Wei wins, Elder Kang crippled',
    chapterNumber: 9,
  }],
});

describe('normalizeSceneActionType', () => {
  it('accepts known types case-insensitively and maps junk to other', () => {
    expect(normalizeSceneActionType('Duel')).toBe('duel');
    expect(normalizeSceneActionType('BATTLE')).toBe('battle');
    expect(normalizeSceneActionType('epic-showdown')).toBe('other');
    expect(normalizeSceneActionType(undefined)).toBe('other');
    expect(normalizeSceneActionType(42)).toBe('other');
  });
});

describe('sanitizeChapterHandoff', () => {
  it('round-trips a valid handoff and stamps the chapter number', () => {
    const raw = validHandoff();
    const sanitized = sanitizeChapterHandoff(raw, 12);
    expect(sanitized).toBeDefined();
    expect(sanitized!.chapterNumber).toBe(12);
    expect(sanitized!.fingerprints[0].chapterNumber).toBe(12);
    expect(sanitized!.completedEvents).toEqual(raw.completedEvents);
  });

  it('drops malformed fingerprints instead of storing noise', () => {
    const sanitized = sanitizeChapterHandoff({
      endState: {},
      completedEvents: ['Something happened'],
      fingerprints: [
        { actionType: 'duel', participants: [], outcome: 'no participants' },
        { actionType: 'duel', participants: ['Li Wei'], outcome: '' },
        { actionType: 'duel', participants: ['Li Wei'], outcome: 'valid' },
      ],
    }, 5);
    expect(sanitized!.fingerprints).toHaveLength(1);
    expect(sanitized!.fingerprints[0].outcome).toBe('valid');
  });

  it('returns undefined for empty or non-object input so the engine degrades to V2', () => {
    expect(sanitizeChapterHandoff(undefined, 3)).toBeUndefined();
    expect(sanitizeChapterHandoff('not an object', 3)).toBeUndefined();
    expect(sanitizeChapterHandoff({ endState: {}, completedEvents: [], fingerprints: [] }, 3)).toBeUndefined();
  });

  it('caps completed events at six', () => {
    const sanitized = sanitizeChapterHandoff({
      completedEvents: Array.from({ length: 10 }, (_, i) => `Event ${i}`),
    }, 4);
    expect(sanitized!.completedEvents).toHaveLength(6);
  });
});

describe('sanitizeContractReport', () => {
  it('requires a boolean objectiveFulfilled', () => {
    expect(sanitizeContractReport({ objectiveFulfilled: 'yes' })).toBeUndefined();
    expect(sanitizeContractReport(undefined)).toBeUndefined();
    expect(sanitizeContractReport({ objectiveFulfilled: false, evidence: 'none' }))
      .toEqual({ objectiveFulfilled: false, evidence: 'none', openingMatched: undefined });
  });
});

describe('buildChapterContract', () => {
  it('carries the previous end state and next action verbatim', () => {
    const contract = buildChapterContract({
      chapterNumber: 10,
      premise: 'Escape the sect before dawn',
      previousHandoff: validHandoff(),
    });
    expect(contract!.startingState?.location).toBe('Azure Peak arena');
    expect(contract!.requiredOpening).toBe('Li Wei must leave the arena before the sect guards arrive');
    expect(contract!.objective).toBe('Escape the sect before dawn');
    expect(contract!.doNotRepeat[0]).toBe('Ch 9: Li Wei defeated Elder Kang in the arena');
  });

  it('works without a previous handoff (chapter 1 / legacy gap)', () => {
    const contract = buildChapterContract({ chapterNumber: 1, premise: 'Set the scene' });
    expect(contract!.startingState).toBeUndefined();
    expect(contract!.requiredOpening).toBeUndefined();
    expect(contract!.doNotRepeat).toEqual([]);
  });

  it('returns undefined when there is neither a premise nor a handoff', () => {
    expect(buildChapterContract({ chapterNumber: 1, premise: '  ' })).toBeUndefined();
  });

  it('adds older fingerprints newest-first without duplicating the handoff chapter', () => {
    const olderFp = (chapterNumber: number): SceneFingerprint => ({
      actionType: 'battle',
      participants: ['Li Wei', 'Bandit King'],
      location: 'Black Forest',
      outcome: `outcome ${chapterNumber}`,
      chapterNumber,
    });
    const contract = buildChapterContract({
      chapterNumber: 10,
      premise: 'March on',
      previousHandoff: validHandoff(),
      recentFingerprints: [olderFp(7), olderFp(9), olderFp(8), olderFp(10)],
    });
    // Ch 9 comes from the handoff's completedEvents, ch 10 is the target itself.
    const fingerprintLines = contract!.doNotRepeat.slice(1);
    expect(fingerprintLines).toEqual([
      fingerprintToDoNotRepeatLine(olderFp(8)),
      fingerprintToDoNotRepeatLine(olderFp(7)),
    ]);
  });
});

describe('renderChapterContractLines', () => {
  it('never renders undefined or empty templates for absent fields', () => {
    const { coreLines, doNotRepeatLines } = renderChapterContractLines({
      version: 1,
      chapterNumber: 1,
      objective: 'Begin the journey',
      doNotRepeat: [],
    });
    const rendered = coreLines.join('\n');
    expect(rendered).not.toContain('undefined');
    expect(rendered).not.toContain('Opening state');
    expect(rendered).not.toContain('Open with');
    expect(rendered).toContain('Objective of this chapter: Begin the journey');
    expect(doNotRepeatLines).toEqual([]);
  });

  it('renders only populated opening-state sub-fields', () => {
    const { coreLines } = renderChapterContractLines({
      version: 1,
      chapterNumber: 2,
      startingState: { location: 'Riverside inn' },
      objective: 'Find the informant',
      doNotRepeat: [],
    });
    const stateLine = coreLines.find(line => line.startsWith('Opening state'));
    expect(stateLine).toBe('Opening state (canon): Location: Riverside inn');
    expect(stateLine).not.toContain('undefined');
  });

  it('renders do-not-repeat lines separately so the budgeter can drop them', () => {
    const { doNotRepeatLines } = renderChapterContractLines({
      version: 1,
      chapterNumber: 3,
      objective: 'Advance',
      doNotRepeat: ['Ch 2: The bridge fell'],
    });
    expect(doNotRepeatLines[0]).toContain('ALREADY HAPPENED');
    expect(doNotRepeatLines[1]).toBe('- Ch 2: The bridge fell');
  });
});

describe('formatHandoffContextForGuard', () => {
  it('formats end state and completed events compactly', () => {
    const text = formatHandoffContextForGuard(validHandoff());
    expect(text).toContain('Chapter 9 ended');
    expect(text).toContain('location: Azure Peak arena');
    expect(text).toContain('- Li Wei defeated Elder Kang in the arena');
    expect(text).toContain('Expected next beat:');
    expect(text).not.toContain('undefined');
  });
});
