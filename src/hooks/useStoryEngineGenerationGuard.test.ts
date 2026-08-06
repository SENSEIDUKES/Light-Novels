import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { storyStorage } from '../lib/storage';
import { useAppStore } from '../store/useAppStore';
import { useStoryEngine } from './useStoryEngine';

vi.mock('../lib/rag', () => ({
  retrieveRelevantContext: vi.fn().mockResolvedValue([]),
  generateEmbedding: vi.fn().mockResolvedValue([0.1]),
}));

vi.mock('../lib/storage', () => ({
  storyStorage: {
    getChapterContent: vi.fn(),
    saveChapterContent: vi.fn(),
    getStories: vi.fn().mockImplementation(async () => useAppStore.getState().stories),
    deleteStory: vi.fn(),
    saveStory: vi.fn(),
    startTransaction: vi.fn(),
    commitTransaction: vi.fn().mockResolvedValue(true),
    rollbackTransaction: vi.fn(),
  },
}));

const deferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const startChapterGeneration = () => useAppStore.getState().startGenerationRun({
  operation: 'chapter',
  userId: null,
  storyId: 'test_story',
  chapterNumber: 1,
});

describe('story mutations queued around generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('crypto', {
      subtle: {
        digest: vi.fn().mockResolvedValue(new Uint8Array(32).buffer),
      },
    });

    useAppStore.setState({
      activeStoryId: 'test_story',
      activeGenerationRun: null,
      stories: [{
        id: 'test_story',
        title: 'Story 1',
        genre: 'Sci-Fi',
        mcName: 'Alex',
        customPremise: 'Test',
        memory: {},
        currentChapterNumber: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        arcs: [{
          title: 'Arc 1',
          isCompleted: false,
          chapters: [{
            number: 1,
            title: 'C1',
            premise: 'P1',
            status: 'unread',
            generatedContent: 'Original chapter text',
          }],
        }],
      }] as any[],
    });
  });

  it('does not seal when generation starts while the content hash is pending', async () => {
    const digestStarted = deferred<void>();
    const releaseDigest = deferred<ArrayBuffer>();
    vi.mocked(window.crypto.subtle.digest).mockImplementationOnce(async () => {
      digestStarted.resolve();
      return releaseDigest.promise;
    });

    const { result } = renderHook(() => useStoryEngine());
    const sealPromise = result.current.handleSealChapter(1);
    await digestStarted.promise;

    const run = startChapterGeneration();
    expect(run).not.toBeNull();

    releaseDigest.resolve(new Uint8Array(32).buffer);
    await act(async () => {
      await sealPromise;
    });

    expect(useAppStore.getState().stories[0].arcs[0].chapters[0].isSealed).toBeFalsy();
    useAppStore.getState().completeGenerationRun(run!.runId);
  });

  it('does not apply a read toggle that was queued before generation started', async () => {
    const saveStarted = deferred<void>();
    const releaseSave = deferred<void>();
    vi.mocked(storyStorage.saveStory).mockImplementationOnce(async () => {
      saveStarted.resolve();
      await releaseSave.promise;
    });

    const blocker = useAppStore.getState().updateStory('test_story', { title: 'Queued save' });
    await saveStarted.promise;

    const { result } = renderHook(() => useStoryEngine());
    const togglePromise = result.current.handleToggleRead(1);
    const run = startChapterGeneration();
    expect(run).not.toBeNull();

    releaseSave.resolve();
    await act(async () => {
      await blocker;
      await togglePromise;
    });

    expect(useAppStore.getState().stories[0].arcs[0].chapters[0].status).toBe('unread');
    useAppStore.getState().completeGenerationRun(run!.runId);
  });

  it('does not seal a chapter whose content changed while hashing', async () => {
    const digestStarted = deferred<void>();
    const releaseDigest = deferred<ArrayBuffer>();
    vi.mocked(window.crypto.subtle.digest).mockImplementationOnce(async () => {
      digestStarted.resolve();
      return releaseDigest.promise;
    });

    const { result } = renderHook(() => useStoryEngine());
    const sealPromise = result.current.handleSealChapter(1);
    await digestStarted.promise;

    await useAppStore.getState().updateChapter('test_story', 1, {
      generatedContent: 'Newly generated chapter text',
    });

    releaseDigest.resolve(new Uint8Array(32).buffer);
    await act(async () => {
      await sealPromise;
    });

    const chapter = useAppStore.getState().stories[0].arcs[0].chapters[0];
    expect(chapter.generatedContent).toBe('Newly generated chapter text');
    expect(chapter.isSealed).toBeFalsy();
  });
});
