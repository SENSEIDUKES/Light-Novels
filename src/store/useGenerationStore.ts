import { StateCreator } from 'zustand';
import { StreamingChapter } from '../types';
import { AppState } from './useAppStore';

/**
 * Live chapter-generation runtime state.
 *
 * This slice owns values the generation pipeline *produces* while it is
 * running — never reader preferences, never anything durable. Its contents
 * are, by construction:
 *
 *  - written only by the generation pipeline (`useChapterGeneration`),
 *  - meaningless once that run ends,
 *  - never written into a `Story` record or any persisted preference,
 *  - always safe to drop wholesale via `resetGenerationRuntime`.
 *
 * `streamingChapter` used to live in `UISlice`, next to interface toggles and
 * provider configuration. It is not a preference: it is an incomplete pipeline
 * payload that the reader adapts through `applyStreamingChapter` for the
 * duration of a single run. Keeping it here means the next piece of pipeline
 * runtime state has an obvious home that is not the UI slice.
 *
 * Deliberately still in `StorySlice`, not here: `isGenerating`,
 * `generationPhase`, `generationProgressMessage`, `estimatedSecondsRemaining`,
 * `generatingChapterNum` and `activeAgentId`. They are the same kind of state
 * and belong here eventually, but they are one interlocking cluster covering
 * blueprint, cover, steer and chapter runs — not just chapter streaming — and
 * splitting them is a `StorySlice` question rather than the `UISlice`
 * ownership question this slice answers. Moving them piecemeal would leave the
 * generation lifecycle straddling three slices instead of two.
 */
export interface GenerationSlice {
  /**
   * The partially-streamed chapter for the run currently in flight, or `null`
   * when nothing is streaming. Only ever one chapter at a time: the batch flow
   * generates sequentially, so a new chapter replaces the previous payload.
   */
  streamingChapter: StreamingChapter | null;

  setStreamingChapter: (data: StreamingChapter | null) => void;
  /**
   * Drop every field this slice owns.
   *
   * Called on account transitions and when the reader switches to a different
   * story, where an in-flight payload belongs to a scope that is no longer on
   * screen and must not bleed into the next one. Generation's own `finally`
   * blocks still clear on completion, failure, and cancellation; this is the
   * boundary reset, not a replacement for those.
   */
  resetGenerationRuntime: () => void;
}

export const INITIAL_GENERATION_RUNTIME: Pick<GenerationSlice, 'streamingChapter'> = {
  streamingChapter: null,
};

export const createGenerationSlice: StateCreator<AppState, [], [], GenerationSlice> = (set) => ({
  ...INITIAL_GENERATION_RUNTIME,

  setStreamingChapter: (data) => set({ streamingChapter: data }),
  resetGenerationRuntime: () => set({ ...INITIAL_GENERATION_RUNTIME }),
});
