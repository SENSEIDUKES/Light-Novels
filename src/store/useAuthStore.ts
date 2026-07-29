import { StateCreator } from 'zustand';
import { AppUser, UserProfile } from '../types';
import { SyncStatus } from '../lib/storage';
import { AppState } from './useAppStore';

export interface AuthSlice {
  syncStatus: SyncStatus;
  currentUser: AppUser | null;
  userProfile: UserProfile | null;
  /**
   * Runtime-only counter of resolved authentication states in this page
   * session. It is never persisted and never reflects identity — it exists so
   * a generation run can prove it belongs to the authentication that is
   * current now. Signing out and back in as the same uid still produces a new
   * number, which is what invalidates the earlier session's in-flight run.
   */
  authSessionGeneration: number;

  setSyncStatus: (status: SyncStatus) => void;
  setCurrentUser: (user: AppUser | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  /** Called once per resolved Firebase authentication state. */
  bumpAuthSessionGeneration: () => number;
}

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (set, get) => ({
  syncStatus: 'offline',
  currentUser: null,
  userProfile: null,
  authSessionGeneration: 0,

  setSyncStatus: (status) => set({ syncStatus: status }),
  setCurrentUser: (user) => set({ currentUser: user }),
  setUserProfile: (profile) => set({ userProfile: profile }),
  bumpAuthSessionGeneration: () => {
    const authSessionGeneration = get().authSessionGeneration + 1;
    set({ authSessionGeneration });
    return authSessionGeneration;
  },
});
