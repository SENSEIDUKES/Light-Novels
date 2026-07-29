import { StateCreator } from 'zustand';
import { StreamingChapter } from '../types';
import { generateUUID } from '../lib/id';
import {
  clearGenerationRecoverySnapshotForRun,
  writeGenerationRecoverySnapshot,
} from '../lib/generationRecovery';
import { AppState } from './useAppStore';

export type GenerationOperation =
  | 'blueprint'
  | 'initial-arc'
  | 'chapter'
  | 'steer'
  | 'cover';

/**
 * The single generation run the application is currently executing.
 *
 * Its identity — not a mutable boolean — is what every asynchronous
 * continuation is measured against. A continuation that no longer matches both
 * `runId` and the auth session it was started in has lost ownership and must
 * silently stop writing rather than modify whatever run took its place.
 */
export interface ActiveGenerationRun {
  runId: string;
  authSessionGeneration: number;
  userId: string | null;
  operation: GenerationOperation;
  storyId: string | null;
  chapterNumber: number | null;
  startedAt: string;
}

export interface StartGenerationRunInput {
  operation: GenerationOperation;
  userId: string | null;
  /**
   * The story this run writes to. Alter Fate passes the fork's id, which it
   * generates before starting the run, so a later `setActiveStoryId` cannot
   * change what the run owns.
   */
  storyId?: string | null;
  /**
   * The chapter a single-chapter run produces. Batches leave this null: their
   * per-chapter progress lives in the persisted batch checkpoint, and only a
   * single-chapter run writes a crash-recovery snapshot.
   */
  chapterNumber?: number | null;
}

/**
 * Live generation runtime state.
 *
 * This slice owns values the generation pipeline produces while it is running:
 * temporary output and the active run itself. It remains flattened in
 * `AppState`, so existing selectors and consumers keep their interface.
 */
export interface GenerationSlice {
  /** The partially streamed chapter for the run currently in flight. */
  streamingChapter: StreamingChapter | null;
  generatingChapterNum: number | null;
  activeAgentId: 'versa' | 'scout' | null;
  generationProgressMessage: string;
  estimatedSecondsRemaining: number | null;
  /** The run that owns every generation write, or null when nothing is running. */
  activeGenerationRun: ActiveGenerationRun | null;

  /**
   * Claim the generation mutex. Returns the new run, or `null` when a run is
   * already active — a duplicate attempt never produces a second run.
   */
  startGenerationRun: (input: StartGenerationRunInput) => ActiveGenerationRun | null;
  /** True only for the run that is active in the current auth session. */
  ownsActiveRun: (runId: string) => boolean;
  /** Settle an owning run: release the mutex and drop its temporary output. */
  completeGenerationRun: (runId: string) => void;
  /** Settle an owning run with a user-facing error. */
  failGenerationRun: (runId: string, message: string) => void;
  /**
   * Invalidate whatever run is in memory because the resolved account changed.
   * Unconditional by design: the outgoing account's run must never be able to
   * keep writing, whether or not it is still awaiting a response.
   */
  clearActiveRunForAccountTransition: () => void;

  setStreamingChapterForRun: (runId: string, data: StreamingChapter | null) => void;
  setGeneratingChapterNumForRun: (runId: string, num: number | null) => void;
  setActiveAgentIdForRun: (runId: string, id: 'versa' | 'scout' | null) => void;
  setGenerationProgressMessageForRun: (runId: string, msg: string) => void;
  setEstimatedSecondsRemainingForRun: (runId: string, sec: number | null) => void;
  /**
   * Drop temporary output from the current run at a scope boundary.
   *
   * Do not clear `activeGenerationRun` here: Alter Fate changes the active
   * story during an in-flight steer run, and releasing the run would hand the
   * generation mutex away before that run settles.
   */
  resetGenerationRuntime: () => void;
}

export const INITIAL_GENERATION_RUNTIME: Pick<
  GenerationSlice,
  | 'streamingChapter'
  | 'generatingChapterNum'
  | 'activeAgentId'
  | 'generationProgressMessage'
  | 'estimatedSecondsRemaining'
> = {
  streamingChapter: null,
  generatingChapterNum: null,
  activeAgentId: null,
  generationProgressMessage: '',
  estimatedSecondsRemaining: null,
};

/**
 * `isGenerating` is derived, never stored: a second boolean could disagree with
 * the run that actually owns the pipeline.
 */
export const selectIsGenerating = (state: AppState): boolean =>
  state.activeGenerationRun != null;

export const selectGenerationPhase = (state: AppState): GenerationOperation | null =>
  state.activeGenerationRun?.operation ?? null;

export const createGenerationSlice: StateCreator<AppState, [], [], GenerationSlice> = (set, get) => {
  /**
   * The one ownership test every run-scoped action shares.
   *
   * Both halves matter: `runId` rejects a superseded run inside the same
   * session, and `authSessionGeneration` rejects a run started before the
   * current authentication was resolved — including a sign-out and sign-in as
   * the same uid, which produces a new generation number.
   */
  const isOwningRun = (runId: string): boolean => {
    const state = get();
    const run = state.activeGenerationRun;
    return (
      run !== null
      && run.runId === runId
      && run.authSessionGeneration === state.authSessionGeneration
    );
  };

  /** Release an owning run and drop the temporary output it produced. */
  const settleRun = (runId: string): boolean => {
    if (!isOwningRun(runId)) return false;
    clearGenerationRecoverySnapshotForRun(runId);
    set({ ...INITIAL_GENERATION_RUNTIME, activeGenerationRun: null });
    return true;
  };

  return {
    ...INITIAL_GENERATION_RUNTIME,
    activeGenerationRun: null,

    startGenerationRun: ({ operation, userId, storyId = null, chapterNumber = null }) => {
      const state = get();
      const current = state.activeGenerationRun;
      // A run left over from a previous auth session is already invalid and
      // must not hold the mutex against the account that is signed in now.
      if (current && current.authSessionGeneration === state.authSessionGeneration) {
        return null;
      }

      const run: ActiveGenerationRun = {
        runId: generateUUID(),
        authSessionGeneration: state.authSessionGeneration,
        userId,
        operation,
        storyId,
        chapterNumber,
        startedAt: new Date().toISOString(),
      };
      set({ ...INITIAL_GENERATION_RUNTIME, activeGenerationRun: run });

      // Only a single-chapter run is recoverable from a frozen snapshot. A
      // batch keeps its own durable checkpoint, so it deliberately writes none.
      if (run.operation === 'chapter' && run.storyId && run.chapterNumber !== null) {
        writeGenerationRecoverySnapshot({
          runId: run.runId,
          userId: run.userId,
          storyId: run.storyId,
          chapterNumber: run.chapterNumber,
          timestamp: Date.now(),
        });
      }
      return run;
    },

    ownsActiveRun: (runId) => isOwningRun(runId),

    completeGenerationRun: (runId) => {
      settleRun(runId);
    },

    failGenerationRun: (runId, message) => {
      if (!isOwningRun(runId)) return;
      get().setAppError(message);
      settleRun(runId);
    },

    clearActiveRunForAccountTransition: () => {
      const run = get().activeGenerationRun;
      if (run) clearGenerationRecoverySnapshotForRun(run.runId);
      set({ ...INITIAL_GENERATION_RUNTIME, activeGenerationRun: null });
    },

    setStreamingChapterForRun: (runId, streamingChapter) => {
      if (!isOwningRun(runId)) return;
      set({ streamingChapter });
    },
    setGeneratingChapterNumForRun: (runId, generatingChapterNum) => {
      if (!isOwningRun(runId)) return;
      set({ generatingChapterNum });
    },
    setActiveAgentIdForRun: (runId, activeAgentId) => {
      if (!isOwningRun(runId)) return;
      set({ activeAgentId });
    },
    setGenerationProgressMessageForRun: (runId, generationProgressMessage) => {
      if (!isOwningRun(runId)) return;
      set({ generationProgressMessage });
    },
    setEstimatedSecondsRemainingForRun: (runId, estimatedSecondsRemaining) => {
      if (!isOwningRun(runId)) return;
      set({ estimatedSecondsRemaining });
    },

    resetGenerationRuntime: () => set({ ...INITIAL_GENERATION_RUNTIME }),
  };
};
