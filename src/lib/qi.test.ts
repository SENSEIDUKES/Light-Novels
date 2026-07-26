import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '../types';

const mocks = vi.hoisted(() => {
  const state = {
    userProfile: null as UserProfile | null,
    setUserProfile: vi.fn((profile: UserProfile) => {
      state.userProfile = profile;
    }),
  };
  return {
    auth: { currentUser: { uid: 'account-a' } as any },
    state,
    getUserProfile: vi.fn(),
    saveUserProfile: vi.fn(),
    cacheAccountProfile: vi.fn(),
  };
});

vi.mock('./firebase', () => ({
  auth: mocks.auth,
  LOCAL_ONLY_MODE: false,
}));

vi.mock('./persistence', () => ({
  getUserProfile: mocks.getUserProfile,
  saveUserProfile: mocks.saveUserProfile,
}));

vi.mock('./userProfileCache', () => ({
  cacheAccountProfile: mocks.cacheAccountProfile,
}));

vi.mock('./artifacts', () => ({
  checkAndAwardRankArtifacts: vi.fn(),
}));

vi.mock('../store/useAppStore', () => ({
  useAppStore: {
    getState: vi.fn(() => mocks.state),
    setState: vi.fn((update: any) => {
      const next = typeof update === 'function' ? update(mocks.state) : update;
      Object.assign(mocks.state, next);
    }),
  },
}));

import {
  awardDirectQi,
  awardQi,
  DAO_RANKS,
  flushPendingProfileSync,
  getAuraColorForXp,
  getDaoRankData,
} from './qi';

const makeProfile = (uid: string, xp = 0): UserProfile => ({
  uid,
  username: uid,
  displayName: uid,
  avatarUrl: '',
  preferredLanguage: 'English',
  defaultTranslationLanguage: 'English',
  savedStoryCount: 0,
  activeStories: [],
  inactiveStories: [],
  joinedDate: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-26T00:00:00.000Z',
  role: 'user',
  premiumTier: 'mortal',
  dao_xp: xp,
  qi: xp,
  heavenly_qi: xp,
  sect_qi: 0,
  demonic_qi: 0,
  activeStatusEffects: [],
});

describe('Qi', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorage.clear();
    mocks.auth.currentUser = { uid: 'account-a' };
    mocks.state.userProfile = null;
    mocks.getUserProfile.mockResolvedValue(makeProfile('account-a'));
    mocks.saveUserProfile.mockImplementation(async (profile: UserProfile) => profile);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('getDaoRankData', () => {
    it('returns Mortal Reader for 0 qi', () => {
      const data = getDaoRankData(0);
      expect(data.rank).toBe('Mortal Reader');
      expect(data.nextRank).toBe('Wandering Disciple');
      expect(data.currentQi).toBe(0);
      expect(data.progress).toBe(0);
    });

    it('calculates progress correctly', () => {
      const data = getDaoRankData(50);
      expect(data.progress).toBe(50);
    });

    it('returns max rank correctly', () => {
      const maxRank = DAO_RANKS[DAO_RANKS.length - 1];
      const data = getDaoRankData(maxRank.threshold + 1000);
      expect(data.rank).toBe(maxRank.name);
      expect(data.nextRank).toBeNull();
      expect(data.progress).toBe(100);
    });
  });

  describe('aura colors', () => {
    it('derives the highest unlocked color when the user has not selected one', () => {
      expect(getAuraColorForXp(undefined, 301)).toBe('#06B6D4');
      expect(getAuraColorForXp(undefined, 750)).toBe('#10B981');
      expect(getAuraColorForXp('#3B82F6', 750)).toBe('#3B82F6');
    });
  });

  describe('cultivation persistence', () => {
    it('hydrates an authoritative profile before awarding from a partial cache snapshot', async () => {
      const effect = {
        id: 'effect-a',
        effectDef: {
          name: 'Moon Blessing',
          type: 'Blessing',
          description: 'Preserved',
          durationMs: 60_000,
          scope: 'Account-wide',
        },
        appliedAt: '2026-07-26T00:00:00.000Z',
        expiresAt: '2099-07-26T00:00:00.000Z',
      } as const;
      mocks.state.userProfile = {
        ...makeProfile('account-a', 740),
        activeStatusEffects: undefined,
      };
      mocks.getUserProfile.mockResolvedValue({
        ...makeProfile('account-a', 740),
        activeStatusEffects: [effect],
      });

      await awardDirectQi(10, 'threshold-crossing');
      await flushPendingProfileSync('account-a');

      expect(mocks.getUserProfile).toHaveBeenCalledOnce();
      expect(mocks.state.userProfile).toMatchObject({
        uid: 'account-a',
        dao_xp: 750,
        dao_rank: 'Inner Sect Scholar',
        activeStatusEffects: [expect.objectContaining({ id: 'effect-a' })],
      });
      expect(mocks.saveUserProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'account-a',
          dao_xp: 750,
          activeStatusEffects: [expect.objectContaining({ id: 'effect-a' })],
        }),
        { keepalive: false },
      );
    });

    it('keeps pending cultivation snapshots isolated by account', async () => {
      mocks.state.userProfile = makeProfile('account-a', 100);
      await awardDirectQi(5, 'account-a-award');

      mocks.auth.currentUser = { uid: 'account-b' };
      mocks.state.userProfile = makeProfile('account-b', 200);
      await awardDirectQi(7, 'account-b-award');
      await flushPendingProfileSync();

      expect(mocks.saveUserProfile).toHaveBeenCalledTimes(1);
      expect(mocks.saveUserProfile).toHaveBeenLastCalledWith(
        expect.objectContaining({ uid: 'account-b', dao_xp: 207 }),
        { keepalive: false },
      );

      mocks.auth.currentUser = { uid: 'account-a' };
      await flushPendingProfileSync('account-a');
      expect(mocks.saveUserProfile).toHaveBeenLastCalledWith(
        expect.objectContaining({ uid: 'account-a', dao_xp: 105 }),
        { keepalive: false },
      );
    });

    it('uses a keepalive profile request when flushing during page teardown', async () => {
      mocks.state.userProfile = makeProfile('account-a', 300);
      await awardDirectQi(1, 'pagehide-award');

      await flushPendingProfileSync('account-a', { keepalive: true });

      expect(mocks.saveUserProfile).toHaveBeenCalledWith(
        expect.objectContaining({ uid: 'account-a', dao_xp: 301 }),
        { keepalive: true },
      );
    });

    it('handles award errors gracefully', async () => {
      mocks.getUserProfile.mockRejectedValueOnce(new Error('offline'));
      await expect(awardQi('chapter_read', '10')).resolves.toBeUndefined();
    });
  });
});
