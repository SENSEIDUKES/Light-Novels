import { StateCreator } from 'zustand';
import { StreamingChapter } from '../types';
import { AppState } from './useAppStore';

/**
 * Live generation runtime state.
 *
 * This slice owns values the generation pipeline produces while it is running:
 * temporary output and the shared generation lifecycle. It remains flattened
 * in `AppState`, so existing selectors and consumers keep their interface.
 */
export interface GenerationSlice {
  /** The partially streamed chapter for the run currently in flight. */
  streamingChapter: StreamingChapter | null;
  generatingChapterNum: number | null;
  activeAgentId: 'versa' | 'scout' | null;
  generationProgressMessage: string;
  estimatedSecondsRemaining: number | null;
  isGenerating: boolean;
  generationPhase: 'blueprint' | 'initial-arc' | 'chapter' | 'steer' | 'cover' | null;

  setStreamingChapter: (data: StreamingChapter | null) => void;
  setGeneratingChapterNum: (num: number | null) => void;
  setActiveAgentId: (id: 'versa' | 'scout' | null) => void;
  setGenerationProgressMessage: (msg: string) => void;
  setEstimatedSecondsRemaining: (sec: number | null) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setGenerationPhase: (phase: 'blueprint' | 'initial-arc' | 'chapter' | 'steer' | 'cover' | null) => void;
  /**
   * Drop temporary output from the current run at a scope boundary.
   *
   * Do not reset `isGenerating` or `generationPhase` here: Alter Fate changes
   * the active story during an in-flight steer run, and clearing either would
   * release its generation mutex before that run settles.
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

export const createGenerationSlice: StateCreator<AppState, [], [], GenerationSlice> = (set) => ({
  ...INITIAL_GENERATION_RUNTIME,
  isGenerating: false,
  generationPhase: null,

  setStreamingChapter: (streamingChapter) => set({ streamingChapter }),
  setGeneratingChapterNum: (generatingChapterNum) => set({ generatingChapterNum }),
  setActiveAgentId: (activeAgentId) => set({ activeAgentId }),
  setGenerationProgressMessage: (generationProgressMessage) => set({ generationProgressMessage }),
  setEstimatedSecondsRemaining: (estimatedSecondsRemaining) => set({ estimatedSecondsRemaining }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setGenerationPhase: (generationPhase) => set({ generationPhase }),
  resetGenerationRuntime: () => set({ ...INITIAL_GENERATION_RUNTIME }),
});
