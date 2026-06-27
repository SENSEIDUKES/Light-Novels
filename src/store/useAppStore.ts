import { create } from 'zustand';
import { StorySlice, createStorySlice } from './useStoryStore';
import { UISlice, createUISlice } from './useUIStore';
import { ChallengeSlice, createChallengeSlice } from './useChallengeStore';
import { AuthSlice, createAuthSlice } from './useAuthStore';

export type AppState = StorySlice & UISlice & ChallengeSlice & AuthSlice;

export const useAppStore = create<AppState>()((...a) => ({
  ...createStorySlice(...a),
  ...createUISlice(...a),
  ...createChallengeSlice(...a),
  ...createAuthSlice(...a),
}));
