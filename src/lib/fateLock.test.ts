import { describe, expect, it } from 'vitest';
import type { ChapterGenerationBatch, Story } from '../types';
import { getFateLockMessage } from './fateLock';

const chapters = [1, 2, 3, 4, 5];

const makeBatch = (overrides: Partial<ChapterGenerationBatch> = {}): ChapterGenerationBatch => ({
  id: 'batch-1',
  chapterNumbers: chapters,
  status: 'queued',
  currentChapterNumber: null,
  completedChapterNumbers: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const makeStory = (batch?: ChapterGenerationBatch): Story => ({
  id: 'story-1',
  title: 'Test story',
  genre: 'Xianxia',
  mcName: 'Hero',
  customPremise: 'A test premise',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  currentChapterNumber: 1,
  memory: {
    powerSystem: 'Test system',
    currentPowerStage: 'Mortal',
    worldRules: [],
    characters: [],
    unresolvedPlotThreads: [],
    resolvedPlotThreads: [],
  },
  arcs: [{
    title: 'Arc',
    isCompleted: false,
    chapters: chapters.map(number => ({
      number,
      title: `C${number}`,
      premise: `P${number}`,
      status: 'unread',
    })),
  }],
  chapterGenerationBatch: batch,
});

describe('getFateLockMessage', () => {
  it('does not lock Fate when no chapter batch exists', () => {
    expect(getFateLockMessage(makeStory(), 2)).toBeNull();
  });

  it('uses the current message while a batch is active, including at its endpoint', () => {
    const activeStory = makeStory(makeBatch({
      status: 'generating',
      currentChapterNumber: 2,
      completedChapterNumbers: [1],
    }));

    expect(getFateLockMessage(activeStory, 2)).toBe('Fate may be altered after Chapter 5.');
    expect(getFateLockMessage(activeStory, 5)).toBe('Fate may be altered after Chapter 5.');
  });

  it('keeps earlier chapters locked after completion and permits the completed endpoint', () => {
    const completedStory = makeStory(makeBatch({
      status: 'completed',
      completedChapterNumbers: chapters,
      completedAt: '2026-01-01T00:01:00.000Z',
    }));

    expect(getFateLockMessage(completedStory, 4)).toBe('Fate may be altered after Chapter 5.');
    expect(getFateLockMessage(completedStory, 5)).toBeNull();
  });

  it.each(['paused', 'failed'] as const)(
    'permits persisted chapters after a %s batch but keeps unfinished chapters locked',
    status => {
      const stoppedStory = makeStory(makeBatch({
        status,
        currentChapterNumber: 3,
        completedChapterNumbers: [1, 2],
        failedChapterNumber: status === 'failed' ? 3 : undefined,
        error: status === 'failed' ? 'Model unavailable' : undefined,
      }));

      expect(getFateLockMessage(stoppedStory, 2)).toBeNull();
      expect(getFateLockMessage(stoppedStory, 3)).toBe('Fate may be altered after Chapter 5.');
    },
  );
});
