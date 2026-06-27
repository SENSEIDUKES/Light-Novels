import { create } from 'zustand';
import { StorySlice, createStorySlice } from './useStoryStore';
import { UISlice, createUISlice } from './useUIStore';
import { ChallengeSlice, createChallengeSlice } from './useChallengeStore';
import { AuthSlice, createAuthSlice } from './useAuthStore';
import { CultivationSlice, createCultivationSlice } from './useCultivationStore';

export type AppState = StorySlice & UISlice & ChallengeSlice & AuthSlice & CultivationSlice;

export const useAppStore = create<AppState>()((...a) => ({
  ...createStorySlice(...a),
  ...createUISlice(...a),
  ...createChallengeSlice(...a),
  ...createAuthSlice(...a),
  ...createCultivationSlice(...a),
}));
