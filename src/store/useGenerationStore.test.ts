import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from './useAppStore';
import {
  createGenerationSlice,
  selectGenerationPhase,
  selectIsGenerating,
} from './useGenerationStore';
import { createUISlice } from './useUIStore';
import { createStorySlice } from './useStoryStore';
import { applyStreamingChapter } from '../lib/chapterViews';
import { storyStorage } from '../lib/storage';
import {
  ACTIVE_GENERATION_STORAGE_KEY,
  clearGenerationRecoverySnapshot,
  readGenerationRecoverySnapshot,
  shouldPreserveRecoverySnapshotOnAuthResolution,
  writeGenerationRecoverySnapshot,
} from '../lib/generationRecovery';
import type { Chapter, Story, StoryBlock } from '../types';

vi.mock('../lib/storage', () => ({
  storyStorage: {
    init: vi.fn(),
    onConflict: vi.fn(),
    getActiveAdapterName: vi.fn(),
    getStories: vi.fn(),
    saveStory: vi.fn(),
    deleteStory: vi.fn().mockResolvedValue(true),
    getStory: vi.fn(),
    getChapterContent: vi.fn(),
    saveChapterContent: vi.fn(),
    performSync: vi.fn(),
    startTransaction: vi.fn(),
    commitTransaction: vi.fn().mockResolvedValue(true),
    rollbackTransaction: vi.fn(),
  },
}));

vi.mock('../lib/encryption', () => ({
  secureStorage: { getItem: vi.fn() },
}));

vi.mock('../lib/firebase', () => ({
  auth: { currentUser: null, onAuthStateChanged: vi.fn() },
  LOCAL_ONLY_MODE: true,
}));

const block = (text: string): StoryBlock => ({ type: 'prose', text } as unknown as StoryBlock);

const makeStory = (id: string): Story => ({
  id,
  title: `Story ${id}`,
  genre: 'Xianxia',
  arcs: [
    {
      title: 'Arc I',
      chapters: [
        { number: 1, title: 'One', premise: 'p1', status: 'generating' },
        { number: 2, title: 'Two', premise: 'p2', status: 'locked' },
      ] as Chapter[],
    },
  ],
  memory: { characters: [], unresolvedPlotThreads: [] },
  currentChapterNumber: 1,
  updatedAt: '2026-01-01T00:00:00.000Z',
} as unknown as Story);

/** Every field this slice owns, so a later addition has to update the test too. */
const GENERATION_RUNTIME_FIELDS = [
  'streamingChapter',
  'generatingChapterNum',
  'activeAgentId',
  'generationProgressMessage',
  'estimatedSecondsRemaining',
] as const;

/** Start a run and fail the test rather than propagate a null through it. */
const startRun = (
  input: Parameters<ReturnType<typeof useAppStore.getState>['startGenerationRun']>[0],
) => {
  const run = useAppStore.getState().startGenerationRun(input);
  if (!run) throw new Error('Expected a new generation run to start.');
  return run;
};

const startChapterRun = (storyId = 'story-a', chapterNumber = 1, userId: string | null = 'reader-a') =>
  startRun({ operation: 'chapter', userId, storyId, chapterNumber });

describe('GenerationSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storyStorage.saveStory).mockResolvedValue(undefined);
    vi.mocked(storyStorage.getStories).mockResolvedValue([]);
    localStorage.clear();
    useAppStore.getState().setStories([]);
    useAppStore.setState({
      activeStoryId: null,
      activeGenerationRun: null,
      authSessionGeneration: 0,
    });
    useAppStore.getState().resetGenerationRuntime();
  });

  describe('ownership', () => {
    it('is no longer declared by UISlice', () => {
      const uiSlice = createUISlice(vi.fn(), vi.fn(), {} as never);
      const uiKeys = Object.keys(uiSlice);

      expect(uiKeys).not.toContain('streamingChapter');
      expect(uiKeys).not.toContain('setStreamingChapter');
    });

    it('is no longer declared by StorySlice', () => {
      const storySlice = createStorySlice(vi.fn(), vi.fn(), {} as never);
      const storyKeys = Object.keys(storySlice);

      for (const field of [...GENERATION_RUNTIME_FIELDS, 'activeGenerationRun']) {
        expect(storyKeys).not.toContain(field);
      }
      expect(storyKeys).not.toContain('startGenerationRun');
      expect(storyKeys).not.toContain('setGeneratingChapterNumForRun');
      expect(storyKeys).not.toContain('setActiveAgentIdForRun');
      expect(storyKeys).not.toContain('setGenerationProgressMessageForRun');
      expect(storyKeys).not.toContain('setEstimatedSecondsRemainingForRun');
    });

    it('declares the live-generation runtime fields and the run lifecycle itself', () => {
      const generationSlice = createGenerationSlice(vi.fn(), vi.fn(), {} as never);
      const generationKeys = Object.keys(generationSlice);

      for (const field of GENERATION_RUNTIME_FIELDS) {
        expect(generationKeys).toContain(field);
      }
      expect(generationKeys).toContain('activeGenerationRun');
      expect(generationKeys).toContain('startGenerationRun');
      expect(generationKeys).toContain('ownsActiveRun');
      expect(generationKeys).toContain('completeGenerationRun');
      expect(generationKeys).toContain('failGenerationRun');
      expect(generationKeys).toContain('clearActiveRunForAccountTransition');
      expect(generationKeys).toContain('setStreamingChapterForRun');
      expect(generationKeys).toContain('setGeneratingChapterNumForRun');
      expect(generationKeys).toContain('setActiveAgentIdForRun');
      expect(generationKeys).toContain('setGenerationProgressMessageForRun');
      expect(generationKeys).toContain('setEstimatedSecondsRemainingForRun');
      expect(generationKeys).toContain('resetGenerationRuntime');
    });

    it('stores no second generation boolean — the flag is derived from the run', () => {
      const generationSlice = createGenerationSlice(vi.fn(), vi.fn(), {} as never) as unknown as Record<string, unknown>;
      expect(generationSlice).not.toHaveProperty('isGenerating');
      expect(generationSlice).not.toHaveProperty('generationPhase');
      expect(generationSlice).not.toHaveProperty('setIsGenerating');
      expect(generationSlice).not.toHaveProperty('setGenerationPhase');
    });

    it('stays selectable from the composed store, so consumers are unchanged', () => {
      expect(useAppStore.getState().streamingChapter).toBeNull();
      expect(typeof useAppStore.getState().setStreamingChapterForRun).toBe('function');
      expect(typeof useAppStore.getState().startGenerationRun).toBe('function');
      expect(typeof useAppStore.getState().ownsActiveRun).toBe('function');
    });
  });

  describe('derived lifecycle selectors', () => {
    it('reports no generation while no run is active', () => {
      expect(selectIsGenerating(useAppStore.getState())).toBe(false);
      expect(selectGenerationPhase(useAppStore.getState())).toBeNull();
    });

    it('reports the active run and its operation as the phase', () => {
      startRun({ operation: 'steer', userId: 'reader-a', storyId: 'story-a' });

      expect(selectIsGenerating(useAppStore.getState())).toBe(true);
      expect(selectGenerationPhase(useAppStore.getState())).toBe('steer');
    });

    it('returns to idle when the owning run completes', () => {
      const run = startRun({ operation: 'cover', userId: 'reader-a', storyId: 'story-a' });
      useAppStore.getState().completeGenerationRun(run.runId);

      expect(selectIsGenerating(useAppStore.getState())).toBe(false);
      expect(selectGenerationPhase(useAppStore.getState())).toBeNull();
    });
  });

  describe('run ownership', () => {
    it('refuses a second run while one is active', () => {
      const first = startChapterRun('story-a', 1);
      const second = useAppStore.getState().startGenerationRun({
        operation: 'chapter',
        userId: 'reader-a',
        storyId: 'story-a',
        chapterNumber: 1,
      });

      expect(second).toBeNull();
      expect(useAppStore.getState().activeGenerationRun?.runId).toBe(first.runId);
    });

    it('owns only the run that is active in the current auth session', () => {
      const run = startChapterRun('story-a', 1);

      expect(useAppStore.getState().ownsActiveRun(run.runId)).toBe(true);
      expect(useAppStore.getState().ownsActiveRun('some-other-run')).toBe(false);
    });

    it('does not let a stale run clear a newer run', () => {
      const stale = startChapterRun('story-a', 1);
      useAppStore.getState().clearActiveRunForAccountTransition();
      const fresh = startChapterRun('story-a', 2);

      useAppStore.getState().completeGenerationRun(stale.runId);

      expect(useAppStore.getState().activeGenerationRun?.runId).toBe(fresh.runId);
      expect(selectIsGenerating(useAppStore.getState())).toBe(true);
    });

    it('does not let a stale run report its failure over a newer run', () => {
      const stale = startChapterRun('story-a', 1);
      useAppStore.getState().clearActiveRunForAccountTransition();
      const fresh = startChapterRun('story-a', 2);

      useAppStore.getState().failGenerationRun(stale.runId, 'the abandoned run failed');

      expect(useAppStore.getState().appError).toBeNull();
      expect(useAppStore.getState().activeGenerationRun?.runId).toBe(fresh.runId);
    });

    it('publishes the owning run failure and releases the run', () => {
      const run = startChapterRun('story-a', 1);

      useAppStore.getState().failGenerationRun(run.runId, 'Celestial feedback received.');

      expect(useAppStore.getState().appError).toBe('Celestial feedback received.');
      expect(useAppStore.getState().activeGenerationRun).toBeNull();
    });

    it('invalidates the original run when the same uid signs out and back in', () => {
      const run = startChapterRun('story-a', 1, 'reader-a');

      // What App.tsx does on every resolved authentication state: a new
      // generation number, then the in-memory run is dropped.
      useAppStore.getState().bumpAuthSessionGeneration();
      useAppStore.getState().clearActiveRunForAccountTransition();
      useAppStore.getState().bumpAuthSessionGeneration();
      useAppStore.getState().clearActiveRunForAccountTransition();

      expect(useAppStore.getState().ownsActiveRun(run.runId)).toBe(false);

      // The same reader starts a fresh run; the abandoned one still owns nothing.
      const reborn = startChapterRun('story-a', 1, 'reader-a');
      expect(reborn.authSessionGeneration).toBe(2);
      expect(useAppStore.getState().ownsActiveRun(run.runId)).toBe(false);
      expect(useAppStore.getState().ownsActiveRun(reborn.runId)).toBe(true);
    });

    it('never lets a run survive its own auth session, even if it is still stored', () => {
      const run = startChapterRun('story-a', 1);
      // A run left in place while authentication moves on is not an owner.
      useAppStore.getState().bumpAuthSessionGeneration();

      expect(useAppStore.getState().ownsActiveRun(run.runId)).toBe(false);
      // ...and it cannot hold the mutex against the new session either.
      const next = useAppStore.getState().startGenerationRun({
        operation: 'chapter',
        userId: 'reader-a',
        storyId: 'story-a',
        chapterNumber: 2,
      });
      expect(next).not.toBeNull();
    });
  });

  describe('run-scoped runtime writes', () => {
    it('accepts progress, agent, chapter number and streaming from the owning run', () => {
      const run = startChapterRun('story-a', 1);
      const state = useAppStore.getState();

      state.setGenerationProgressMessageForRun(run.runId, 'VERSA is weaving');
      state.setActiveAgentIdForRun(run.runId, 'versa');
      state.setGeneratingChapterNumForRun(run.runId, 1);
      state.setEstimatedSecondsRemainingForRun(run.runId, 45);
      state.setStreamingChapterForRun(run.runId, { number: 1, content: 'live prose' });

      const published = useAppStore.getState();
      expect(published.generationProgressMessage).toBe('VERSA is weaving');
      expect(published.activeAgentId).toBe('versa');
      expect(published.generatingChapterNum).toBe(1);
      expect(published.estimatedSecondsRemaining).toBe(45);
      expect(published.streamingChapter).toEqual({ number: 1, content: 'live prose' });
    });

    it('turns every stale write into a silent no-op', () => {
      const stale = startChapterRun('story-a', 1);
      useAppStore.getState().clearActiveRunForAccountTransition();
      const fresh = startChapterRun('story-b', 4);
      const state = useAppStore.getState();
      state.setGenerationProgressMessageForRun(fresh.runId, 'the current run');
      state.setActiveAgentIdForRun(fresh.runId, 'scout');
      state.setGeneratingChapterNumForRun(fresh.runId, 4);
      state.setStreamingChapterForRun(fresh.runId, { number: 4, content: 'current prose' });

      state.setGenerationProgressMessageForRun(stale.runId, 'the abandoned run');
      state.setActiveAgentIdForRun(stale.runId, 'versa');
      state.setGeneratingChapterNumForRun(stale.runId, 1);
      state.setEstimatedSecondsRemainingForRun(stale.runId, 999);
      state.setStreamingChapterForRun(stale.runId, { number: 1, content: 'abandoned prose' });

      const published = useAppStore.getState();
      expect(published.generationProgressMessage).toBe('the current run');
      expect(published.activeAgentId).toBe('scout');
      expect(published.generatingChapterNum).toBe(4);
      expect(published.estimatedSecondsRemaining).toBeNull();
      expect(published.streamingChapter).toEqual({ number: 4, content: 'current prose' });
    });

    it('rejects a write from a run whose auth session has moved on', () => {
      const run = startChapterRun('story-a', 1);
      useAppStore.getState().setStreamingChapterForRun(run.runId, { number: 1, content: 'before' });
      useAppStore.getState().bumpAuthSessionGeneration();

      useAppStore.getState().setStreamingChapterForRun(run.runId, { number: 1, content: 'after' });

      expect(useAppStore.getState().streamingChapter).toEqual({ number: 1, content: 'before' });
    });

    it('drops temporary output when the owning run settles', () => {
      const run = startChapterRun('story-a', 1);
      const state = useAppStore.getState();
      state.setStreamingChapterForRun(run.runId, { number: 1, content: 'half a chapter' });
      state.setGeneratingChapterNumForRun(run.runId, 1);
      state.setActiveAgentIdForRun(run.runId, 'versa');
      state.setGenerationProgressMessageForRun(run.runId, 'Writing the next scene');
      state.setEstimatedSecondsRemainingForRun(run.runId, 45);

      useAppStore.getState().completeGenerationRun(run.runId);

      const published = useAppStore.getState();
      expect(published.streamingChapter).toBeNull();
      expect(published.generatingChapterNum).toBeNull();
      expect(published.activeAgentId).toBeNull();
      expect(published.generationProgressMessage).toBe('');
      expect(published.estimatedSecondsRemaining).toBeNull();
      expect(published.activeGenerationRun).toBeNull();
    });
  });

  describe('crash-recovery snapshot', () => {
    it('freezes one snapshot when a single-chapter run starts', () => {
      const run = startChapterRun('story-a', 7, 'reader-a');

      const snapshot = readGenerationRecoverySnapshot();
      expect(snapshot).toEqual({
        runId: run.runId,
        userId: 'reader-a',
        storyId: 'story-a',
        chapterNumber: 7,
        timestamp: expect.any(Number),
      });
    });

    it('stays tied to the story it started on after the reader navigates away', () => {
      const store = useAppStore.getState();
      store.setStories([makeStory('story-a'), makeStory('story-b')]);
      store.setActiveStoryId('story-a');
      startChapterRun('story-a', 3);

      useAppStore.getState().setActiveStoryId('story-b');

      expect(readGenerationRecoverySnapshot()).toMatchObject({
        storyId: 'story-a',
        chapterNumber: 3,
      });
    });

    it('writes no snapshot for a five-chapter batch, which keeps its own checkpoint', () => {
      startRun({
        operation: 'chapter',
        userId: 'reader-a',
        storyId: 'story-a',
        chapterNumber: null,
      });

      expect(localStorage.getItem(ACTIVE_GENERATION_STORAGE_KEY)).toBeNull();
    });

    it('writes no snapshot for blueprint, initial arc, steer or cover runs', () => {
      for (const operation of ['blueprint', 'initial-arc', 'steer', 'cover'] as const) {
        const run = startRun({ operation, userId: 'reader-a', storyId: 'story-a' });
        expect(localStorage.getItem(ACTIVE_GENERATION_STORAGE_KEY)).toBeNull();
        useAppStore.getState().completeGenerationRun(run.runId);
      }
    });

    it('removes its snapshot when the owning run completes', () => {
      const run = startChapterRun('story-a', 1);
      useAppStore.getState().completeGenerationRun(run.runId);

      expect(readGenerationRecoverySnapshot()).toBeNull();
    });

    it('removes its snapshot when the owning run fails', () => {
      const run = startChapterRun('story-a', 1);
      useAppStore.getState().failGenerationRun(run.runId, 'Chapter generation failed.');

      expect(readGenerationRecoverySnapshot()).toBeNull();
    });

    it('does not let a stale run remove a newer run\'s snapshot', () => {
      const stale = startChapterRun('story-a', 1);
      useAppStore.getState().clearActiveRunForAccountTransition();
      const fresh = startChapterRun('story-b', 9);

      useAppStore.getState().completeGenerationRun(stale.runId);
      useAppStore.getState().failGenerationRun(stale.runId, 'the abandoned run failed');

      expect(readGenerationRecoverySnapshot()).toMatchObject({
        runId: fresh.runId,
        storyId: 'story-b',
        chapterNumber: 9,
      });
    });
  });

  describe('account transition', () => {
    it('clears the run and every piece of runtime output', () => {
      const run = startChapterRun('story-a', 1);
      const state = useAppStore.getState();
      state.setStreamingChapterForRun(run.runId, { number: 1, content: "the outgoing account's prose" });
      state.setActiveAgentIdForRun(run.runId, 'versa');
      state.setGenerationProgressMessageForRun(run.runId, 'still weaving');

      useAppStore.getState().clearActiveRunForAccountTransition();

      const published = useAppStore.getState();
      expect(published.activeGenerationRun).toBeNull();
      expect(published.streamingChapter).toBeNull();
      expect(published.activeAgentId).toBeNull();
      expect(published.generationProgressMessage).toBe('');
      expect(published.generatingChapterNum).toBeNull();
      expect(selectIsGenerating(published)).toBe(false);
    });

    it('takes the invalidated run\'s recovery snapshot with it', () => {
      startChapterRun('story-a', 1);

      useAppStore.getState().clearActiveRunForAccountTransition();

      expect(readGenerationRecoverySnapshot()).toBeNull();
    });
  });

  describe('the App.tsx authentication sequence', () => {
    /**
     * Exactly what the `onAuthStateChanged` handler runs, in order, for one
     * resolved authentication state.
     */
    const resolveAuthState = (
      resolvedUserId: string | null,
      { isFirstAuthResolution }: { isFirstAuthResolution: boolean },
    ) => {
      const snapshot = readGenerationRecoverySnapshot();
      if (snapshot && !shouldPreserveRecoverySnapshotOnAuthResolution({
        snapshot,
        isFirstAuthResolution,
        resolvedUserId,
      })) {
        clearGenerationRecoverySnapshot();
      }
      useAppStore.getState().bumpAuthSessionGeneration();
      useAppStore.getState().clearActiveRunForAccountTransition();
    };

    it('preserves a reloaded reader\'s own draft on the first resolution', () => {
      // The page reloaded: the snapshot outlived the run that wrote it.
      writeGenerationRecoverySnapshot({
        runId: 'run-before-reload',
        userId: 'reader-a',
        storyId: 'story-a',
        chapterNumber: 4,
        timestamp: Date.now(),
      });

      resolveAuthState('reader-a', { isFirstAuthResolution: true });

      expect(readGenerationRecoverySnapshot()).toMatchObject({
        storyId: 'story-a',
        chapterNumber: 4,
      });
    });

    it('deletes the draft when the first resolved account is a different reader', () => {
      writeGenerationRecoverySnapshot({
        runId: 'run-before-reload',
        userId: 'reader-a',
        storyId: 'story-a',
        chapterNumber: 4,
        timestamp: Date.now(),
      });

      resolveAuthState('reader-b', { isFirstAuthResolution: true });

      expect(readGenerationRecoverySnapshot()).toBeNull();
    });

    it('deletes the draft and clears runtime output on a real account transition', () => {
      const run = startChapterRun('story-a', 4, 'reader-a');
      const state = useAppStore.getState();
      state.setStreamingChapterForRun(run.runId, { number: 4, content: "reader A's prose" });
      state.setActiveAgentIdForRun(run.runId, 'versa');
      state.setGenerationProgressMessageForRun(run.runId, 'Weaving');

      resolveAuthState('reader-b', { isFirstAuthResolution: false });

      const published = useAppStore.getState();
      expect(readGenerationRecoverySnapshot()).toBeNull();
      expect(published.activeGenerationRun).toBeNull();
      expect(published.streamingChapter).toBeNull();
      expect(published.activeAgentId).toBeNull();
      expect(published.generationProgressMessage).toBe('');
      expect(published.ownsActiveRun(run.runId)).toBe(false);
      expect(selectIsGenerating(published)).toBe(false);
    });

    it('invalidates the in-flight run when the same reader signs out and back in', () => {
      const run = startChapterRun('story-a', 4, 'reader-a');

      resolveAuthState(null, { isFirstAuthResolution: false });
      resolveAuthState('reader-a', { isFirstAuthResolution: false });

      expect(useAppStore.getState().ownsActiveRun(run.runId)).toBe(false);
      expect(readGenerationRecoverySnapshot()).toBeNull();
      // The returning reader can start again immediately.
      const reborn = startChapterRun('story-a', 4, 'reader-a');
      expect(reborn.runId).not.toBe(run.runId);
      expect(reborn.authSessionGeneration).not.toBe(run.authSessionGeneration);
    });
  });

  describe('stream lifecycle', () => {
    it('starts with no chapter streaming', () => {
      expect(useAppStore.getState().streamingChapter).toBeNull();
    });

    it('publishes the first partial payload when a stream starts', () => {
      const run = startChapterRun('story-a', 1);
      useAppStore.getState().setStreamingChapterForRun(run.runId, {
        number: 1,
        content: 'The pagoda door',
        blocks: [block('The pagoda door')],
      });

      expect(useAppStore.getState().streamingChapter).toEqual({
        number: 1,
        content: 'The pagoda door',
        blocks: [block('The pagoda door')],
      });
    });

    it('accumulates incremental updates as the stream advances', () => {
      const run = startChapterRun('story-a', 1);
      const { setStreamingChapterForRun } = useAppStore.getState();

      setStreamingChapterForRun(run.runId, { number: 1, content: 'A', blocks: [block('A')] });
      setStreamingChapterForRun(run.runId, { number: 1, content: 'A B', blocks: [block('A'), block('B')] });
      setStreamingChapterForRun(run.runId, {
        number: 1,
        content: 'A B C',
        blocks: [block('A'), block('B'), block('C')],
      });

      const streaming = useAppStore.getState().streamingChapter;
      expect(streaming?.content).toBe('A B C');
      expect(streaming?.blocks).toHaveLength(3);
    });

    it('replaces — never merges — the payload for the same chapter', () => {
      const run = startChapterRun('story-a', 1);
      const { setStreamingChapterForRun } = useAppStore.getState();

      setStreamingChapterForRun(run.runId, { number: 1, content: 'first pass', blocks: [block('first pass')] });
      setStreamingChapterForRun(run.runId, { number: 1, content: 'repaired pass' });

      const streaming = useAppStore.getState().streamingChapter;
      expect(streaming).toEqual({ number: 1, content: 'repaired pass' });
      // The stale blocks from the previous payload must not survive the swap.
      expect(streaming?.blocks).toBeUndefined();
    });

    it('replaces the payload when the stream moves to the next chapter of a batch', () => {
      const run = startRun({
        operation: 'chapter',
        userId: 'reader-a',
        storyId: 'story-a',
        chapterNumber: null,
      });
      const { setStreamingChapterForRun } = useAppStore.getState();

      setStreamingChapterForRun(run.runId, { number: 1, content: 'chapter one' });
      setStreamingChapterForRun(run.runId, { number: 2, content: 'chapter two' });

      expect(useAppStore.getState().streamingChapter).toEqual({ number: 2, content: 'chapter two' });
    });

    it('clears on completion', () => {
      const run = startChapterRun('story-a', 1);
      useAppStore.getState().setStreamingChapterForRun(run.runId, { number: 1, content: 'finished prose' });

      // What `useChapterGeneration`'s `finally` block does once a run settles.
      useAppStore.getState().completeGenerationRun(run.runId);

      expect(useAppStore.getState().streamingChapter).toBeNull();
    });

    it('clears on failure or cancellation', () => {
      const run = startChapterRun('story-a', 1);
      useAppStore.getState().setStreamingChapterForRun(run.runId, { number: 1, content: 'half a chapter' });

      useAppStore.getState().failGenerationRun(run.runId, 'Chapter generation failed.');

      expect(useAppStore.getState().streamingChapter).toBeNull();
    });

    it('clears temporary runtime output but preserves the run itself', () => {
      const run = startRun({ operation: 'steer', userId: 'reader-a', storyId: 'story-a' });
      const state = useAppStore.getState();
      state.setStreamingChapterForRun(run.runId, { number: 1, content: 'half a chapter' });
      state.setGeneratingChapterNumForRun(run.runId, 1);
      state.setActiveAgentIdForRun(run.runId, 'versa');
      state.setGenerationProgressMessageForRun(run.runId, 'Writing the next scene');
      state.setEstimatedSecondsRemainingForRun(run.runId, 45);

      useAppStore.getState().resetGenerationRuntime();

      const published = useAppStore.getState();
      expect(published.streamingChapter).toBeNull();
      expect(published.generatingChapterNum).toBeNull();
      expect(published.activeAgentId).toBeNull();
      expect(published.generationProgressMessage).toBe('');
      expect(published.estimatedSecondsRemaining).toBeNull();
      expect(published.activeGenerationRun?.runId).toBe(run.runId);
      expect(selectGenerationPhase(published)).toBe('steer');
    });
  });

  describe('scope boundaries', () => {
    it('drops an in-flight payload when the reader switches to another story', () => {
      const { setStories, setActiveStoryId } = useAppStore.getState();
      setStories([makeStory('story-a'), makeStory('story-b')]);
      setActiveStoryId('story-a');
      const run = startChapterRun('story-a', 1);
      useAppStore.getState().setStreamingChapterForRun(run.runId, {
        number: 1,
        content: "story A's half-written chapter",
      });

      useAppStore.getState().setActiveStoryId('story-b');

      // Chapter 1 exists in both stories; without the reset, story A's prose
      // would render inside story B's reader.
      expect(useAppStore.getState().streamingChapter).toBeNull();
    });

    it('keeps Alter Fate\'s run — and its ownership — across the fork story switch', () => {
      const store = useAppStore.getState();
      store.setStories([makeStory('story-a'), makeStory('story-b')]);
      store.setActiveStoryId('story-a');
      // Alter Fate mints the fork id first and claims the run against it.
      const run = startRun({ operation: 'steer', userId: 'reader-a', storyId: 'story-b' });
      useAppStore.getState().setStreamingChapterForRun(run.runId, {
        number: 1,
        content: 'outgoing story payload',
      });

      // Alter Fate then makes the fork active while its steer run is in flight.
      useAppStore.getState().setActiveStoryId('story-b');

      const state = useAppStore.getState();
      expect(state.activeStoryId).toBe('story-b');
      expect(state.streamingChapter).toBeNull();
      expect(state.ownsActiveRun(run.runId)).toBe(true);
      expect(state.activeGenerationRun?.storyId).toBe('story-b');
      expect(selectGenerationPhase(state)).toBe('steer');
      expect(selectIsGenerating(state)).toBe(true);
    });

    it('keeps the live payload when the already-active story is re-selected', () => {
      const { setStories, setActiveStoryId } = useAppStore.getState();
      setStories([makeStory('story-a')]);
      setActiveStoryId('story-a');
      const run = startChapterRun('story-a', 1);
      useAppStore.getState().setStreamingChapterForRun(run.runId, { number: 1, content: 'still streaming' });

      useAppStore.getState().setActiveStoryId('story-a');

      expect(useAppStore.getState().streamingChapter).toEqual({
        number: 1,
        content: 'still streaming',
      });
    });

    it('clears on the account transition, which deselects the active story', () => {
      // The `onAuthStateChanged` handler in App.tsx runs `setActiveStoryId(null)`
      // followed by `clearActiveRunForAccountTransition()`; both paths must clear.
      const { setStories, setActiveStoryId } = useAppStore.getState();
      setStories([makeStory('story-a')]);
      setActiveStoryId('story-a');
      const run = startChapterRun('story-a', 1);
      useAppStore.getState().setStreamingChapterForRun(run.runId, {
        number: 1,
        content: "the outgoing account's prose",
      });

      useAppStore.getState().setActiveStoryId(null);
      expect(useAppStore.getState().streamingChapter).toBeNull();

      // ...and again for an account transition that begins with nothing open.
      useAppStore.getState().setStreamingChapterForRun(run.runId, { number: 1, content: 'orphaned run' });
      useAppStore.getState().clearActiveRunForAccountTransition();
      expect(useAppStore.getState().streamingChapter).toBeNull();
    });
  });

  describe('persistence', () => {
    it('never writes runtime generation state into a durable story record', async () => {
      const { setStories, saveStories } = useAppStore.getState();
      const story = makeStory('story-a');
      setStories([story]);
      const run = startChapterRun('story-a', 1);
      useAppStore.getState().setStreamingChapterForRun(run.runId, {
        number: 1,
        content: 'half-written prose that must never be persisted',
        blocks: [block('half-written prose that must never be persisted')],
      });

      await saveStories([story]);

      expect(storyStorage.saveStory).toHaveBeenCalled();
      const persisted = vi.mocked(storyStorage.saveStory).mock.calls[0][0];
      const serialized = JSON.stringify(persisted);
      expect(serialized).not.toContain('streamingChapter');
      expect(serialized).not.toContain('half-written prose that must never be persisted');

      // Persisting the library must not disturb the run still in flight.
      expect(useAppStore.getState().streamingChapter?.number).toBe(1);
    });

    it('is not carried by any persisted preference surface', () => {
      // The store composes no `persist` middleware, so the only way runtime
      // state could be written as a preference is by being declared inside the
      // preference-owning slice. It is not.
      const uiSlice = createUISlice(vi.fn(), vi.fn(), {} as never) as unknown as Record<string, unknown>;
      for (const field of GENERATION_RUNTIME_FIELDS) {
        expect(uiSlice).not.toHaveProperty(field);
      }
    });
  });

  describe('reader adaptation', () => {
    it('still produces the correct reader-facing chapter from the slice payload', () => {
      const chapter = makeStory('story-a').arcs[0].chapters[0];
      const run = startChapterRun('story-a', 1);
      useAppStore.getState().setStreamingChapterForRun(run.runId, {
        number: 1,
        content: 'Li Wei stepped through',
        blocks: [block('Li Wei stepped through')],
      });

      // Exactly what `ReaderScreen.buildReaderChapters` does with the selector.
      const reader = applyStreamingChapter(chapter, useAppStore.getState().streamingChapter);

      expect(reader.generatedContent).toBe('Li Wei stepped through');
      expect(reader.blocks).toHaveLength(1);
    });

    it('leaves other chapters untouched while one is streaming', () => {
      const [first, second] = makeStory('story-a').arcs[0].chapters;
      const run = startChapterRun('story-a', 1);
      useAppStore.getState().setStreamingChapterForRun(run.runId, { number: 1, content: 'only chapter one' });
      const streaming = useAppStore.getState().streamingChapter;

      expect(applyStreamingChapter(first, streaming).generatedContent).toBe('only chapter one');
      expect(applyStreamingChapter(second, streaming).generatedContent).toBeUndefined();
    });

    it('falls back to the stored chapter once the stream is cleared', () => {
      const chapter = makeStory('story-a').arcs[0].chapters[0];
      const run = startChapterRun('story-a', 1);
      useAppStore.getState().setStreamingChapterForRun(run.runId, { number: 1, content: 'partial' });
      useAppStore.getState().setStreamingChapterForRun(run.runId, null);

      const reader = applyStreamingChapter(chapter, useAppStore.getState().streamingChapter);
      expect(reader.generatedContent).toBeUndefined();
    });
  });
});
