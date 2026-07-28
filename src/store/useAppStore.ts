import { create } from 'zustand';
import { StorySlice, createStorySlice } from './useStoryStore';
import { UISlice, createUISlice } from './useUIStore';
import { GenerationSlice, createGenerationSlice } from './useGenerationStore';
import { ChallengeSlice, createChallengeSlice } from './useChallengeStore';
import { AuthSlice, createAuthSlice } from './useAuthStore';

export type AppState = StorySlice & UISlice & GenerationSlice & ChallengeSlice & AuthSlice;

export const useAppStore = create<AppState>()((...a) => ({
  ...createStorySlice(...a),
  ...createUISlice(...a),
  ...createGenerationSlice(...a),
  ...createChallengeSlice(...a),
  ...createAuthSlice(...a),
}));
