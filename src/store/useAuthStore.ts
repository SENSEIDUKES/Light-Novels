import { StateCreator } from 'zustand';
import { AppUser, UserProfile } from '../types';
import { SyncStatus } from '../lib/storage';
import { AppState } from './useAppStore';

export interface AuthSlice {
  syncStatus: SyncStatus;
  currentUser: AppUser | null;
  userProfile: UserProfile | null;

  setSyncStatus: (status: SyncStatus) => void;
  setCurrentUser: (user: AppUser | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
}

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (set) => ({
  syncStatus: 'offline',
  currentUser: null,
  userProfile: null,

  setSyncStatus: (status) => set({ syncStatus: status }),
  setCurrentUser: (user) => set({ currentUser: user }),
  setUserProfile: (profile) => set({ userProfile: profile }),
});
