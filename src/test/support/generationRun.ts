import type { ActiveGenerationRun, StartGenerationRunInput } from '../../store/useGenerationStore';

/**
 * A run record for tests that only need the store to *look* like something is
 * generating (UI readers, selectors). Ownership tests should start real runs
 * through `startGenerationRun` instead.
 */
export const makeActiveRun = (
  overrides: Partial<ActiveGenerationRun> = {},
): ActiveGenerationRun => ({
  runId: 'run-test',
  authSessionGeneration: 0,
  userId: 'reader-a',
  operation: 'chapter',
  storyId: 'story-123',
  chapterNumber: 1,
  startedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

interface RunHarnessStore {
  activeGenerationRun: ActiveGenerationRun | null;
  authSessionGeneration?: number;
  streamingChapter?: unknown;
  generatingChapterNum?: number | null;
  activeAgentId?: 'versa' | 'scout' | null;
  generationProgressMessage?: string;
  estimatedSecondsRemaining?: number | null;
  setAppError?: (message: string | null) => void;
}

/**
 * The run-ownership half of `GenerationSlice`, implemented against a plain
 * object, for the hook suites that mock `useAppStore` wholesale. It mirrors the
 * real slice's guard so those tests exercise ownership rather than assume it.
 */
export const createRunHarness = (store: RunHarnessStore) => {
  const owns = (runId: string) => {
    const run = store.activeGenerationRun;
    return (
      run !== null
      && run.runId === runId
      && run.authSessionGeneration === (store.authSessionGeneration ?? 0)
    );
  };
  const settle = (runId: string) => {
    if (!owns(runId)) return;
    store.activeGenerationRun = null;
    store.streamingChapter = null;
    store.generatingChapterNum = null;
    store.activeAgentId = null;
    store.generationProgressMessage = '';
    store.estimatedSecondsRemaining = null;
  };
  let runCounter = 0;

  return {
    startGenerationRun: ({
      operation,
      userId,
      storyId = null,
      chapterNumber = null,
    }: StartGenerationRunInput): ActiveGenerationRun | null => {
      const current = store.activeGenerationRun;
      if (current && current.authSessionGeneration === (store.authSessionGeneration ?? 0)) {
        return null;
      }
      runCounter += 1;
      const run: ActiveGenerationRun = {
        runId: `run-${runCounter}`,
        authSessionGeneration: store.authSessionGeneration ?? 0,
        userId,
        operation,
        storyId,
        chapterNumber,
        startedAt: '2026-01-01T00:00:00.000Z',
      };
      store.activeGenerationRun = run;
      return run;
    },
    ownsActiveRun: (runId: string) => owns(runId),
    completeGenerationRun: (runId: string) => settle(runId),
    failGenerationRun: (runId: string, message: string) => {
      if (!owns(runId)) return;
      store.setAppError?.(message);
      settle(runId);
    },
    clearActiveRunForAccountTransition: () => {
      store.activeGenerationRun = null;
    },
    setStreamingChapterForRun: (runId: string, data: unknown) => {
      if (!owns(runId)) return;
      store.streamingChapter = data;
    },
    setGeneratingChapterNumForRun: (runId: string, num: number | null) => {
      if (!owns(runId)) return;
      store.generatingChapterNum = num;
    },
    setActiveAgentIdForRun: (runId: string, id: 'versa' | 'scout' | null) => {
      if (!owns(runId)) return;
      store.activeAgentId = id;
    },
    setGenerationProgressMessageForRun: (runId: string, msg: string) => {
      if (!owns(runId)) return;
      store.generationProgressMessage = msg;
    },
    setEstimatedSecondsRemainingForRun: (runId: string, sec: number | null) => {
      if (!owns(runId)) return;
      store.estimatedSecondsRemaining = sec;
    },
  };
};
