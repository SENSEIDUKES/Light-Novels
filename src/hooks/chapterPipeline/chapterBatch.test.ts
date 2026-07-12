import { describe, expect, it, vi } from 'vitest';
import { ChapterGenerationBatch, Story } from '../../types';
import {
  getFateLockMessage,
  getRemainingBatchChapterNumbers,
  runSequentialChapterBatch,
} from './chapterBatch';

const chapters = [1, 2, 3, 4, 5];

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
  arcs: [{ title: 'Arc', isCompleted: false, chapters: chapters.map(number => ({ number, title: `C${number}`, premise: `P${number}`, status: 'unread' })) }],
  chapterGenerationBatch: batch,
});

const makeBatch = (overrides: Partial<ChapterGenerationBatch> = {}): ChapterGenerationBatch => ({
  id: 'batch-1',
  chapterNumbers: chapters,
  status: 'queued',
  currentChapterNumber: null,
  completedChapterNumbers: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('runSequentialChapterBatch', () => {
  it('executes five chapters strictly in order and passes each persisted story to the next generation', async () => {
    const calls: number[] = [];
    let inFlight = 0;
    let persistedStory = makeStory();
    const generateChapter = vi.fn(async (story: Story, chapterNumber: number) => {
      expect(inFlight).toBe(0);
      expect(story).toBe(persistedStory);
      inFlight += 1;
      calls.push(chapterNumber);
      await Promise.resolve();
      inFlight -= 1;
      return { ...story, memory: { ...story.memory, currentPowerStage: `Stage ${chapterNumber}` } };
    });
    const persistBatch = vi.fn(async (story: Story, batch: ChapterGenerationBatch) => {
      persistedStory = { ...story, chapterGenerationBatch: batch };
      return persistedStory;
    });

    const result = await runSequentialChapterBatch({
      story: persistedStory,
      batch: makeBatch(),
      generateChapter,
      persistBatch,
    });

    expect(calls).toEqual([1, 2, 3, 4, 5]);
    expect(generateChapter).toHaveBeenCalledTimes(5);
    expect(result.batch.status).toBe('completed');
    expect(result.batch.completedChapterNumbers).toEqual([1, 2, 3, 4, 5]);
    expect(result.story.memory.currentPowerStage).toBe('Stage 5');
  });

  it('stops on a middle failure, preserves earlier completions, and never starts later chapters', async () => {
    const attempted: number[] = [];
    let persistedStory = makeStory();
    const persistBatch = vi.fn(async (story: Story, batch: ChapterGenerationBatch) => {
      persistedStory = { ...story, chapterGenerationBatch: batch };
      return persistedStory;
    });

    await expect(runSequentialChapterBatch({
      story: persistedStory,
      batch: makeBatch(),
      persistBatch,
      generateChapter: async (story, chapterNumber) => {
        attempted.push(chapterNumber);
        if (chapterNumber === 3) throw new Error('Model unavailable');
        return { ...story, currentChapterNumber: chapterNumber };
      },
    })).rejects.toThrow('Model unavailable');

    expect(attempted).toEqual([1, 2, 3]);
    expect(persistedStory.chapterGenerationBatch).toMatchObject({
      status: 'failed',
      failedChapterNumber: 3,
      completedChapterNumbers: [1, 2],
    });
  });

  it('resumes from the failed or first remaining chapter without regenerating completed chapters', async () => {
    const batch = makeBatch({
      status: 'failed',
      completedChapterNumbers: [1, 2],
      failedChapterNumber: 3,
      error: 'Model unavailable',
    });
    const attempted: number[] = [];
    let persistedStory = makeStory(batch);
    const result = await runSequentialChapterBatch({
      story: persistedStory,
      batch,
      persistBatch: async (story, nextBatch) => {
        persistedStory = { ...story, chapterGenerationBatch: nextBatch };
        return persistedStory;
      },
      generateChapter: async (story, chapterNumber) => {
        attempted.push(chapterNumber);
        return story;
      },
    });

    expect(getRemainingBatchChapterNumbers(batch)).toEqual([3, 4, 5]);
    expect(attempted).toEqual([3, 4, 5]);
    expect(result.batch.completedChapterNumbers).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('batch Fate lock', () => {
  it('blocks Alter Fate while active and before a completed endpoint, then permits the endpoint', () => {
    const activeStory = makeStory(makeBatch({ status: 'generating', currentChapterNumber: 2 }));
    expect(getFateLockMessage(activeStory, 2)).toBe('Fate may be altered after Chapter 5.');

    const completedStory = makeStory(makeBatch({ status: 'completed', completedChapterNumbers: chapters, completedAt: '2026-01-01T00:01:00.000Z' }));
    expect(getFateLockMessage(completedStory, 4)).toBe('Fate may be altered after Chapter 5.');
    expect(getFateLockMessage(completedStory, 5)).toBeNull();
  });

  it('permits a safe branch from persisted chapters after a paused or failed batch', () => {
    const stoppedStory = makeStory(makeBatch({
      status: 'failed',
      completedChapterNumbers: [1, 2],
      failedChapterNumber: 3,
      error: 'Model unavailable',
    }));

    expect(getFateLockMessage(stoppedStory, 2)).toBeNull();
    expect(getFateLockMessage(stoppedStory, 3)).toBe('Fate may be altered after Chapter 5.');
  });
});
