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
  claimIdleQiReward,
  DAO_RANKS,
  flushPendingProfileSync,
  getAuraColorForXp,
  getDaoRankData,
  recordLibrarySessionEnd,
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

  describe('closed-door cultivation claims', () => {
    const BASELINE = '2026-07-29T10:00:00.000Z';
    const CLAIM_KEY = `idle-cultivation-claim-account-a-${BASELINE}`;

    it('deposits exactly the displayed amount, ignoring status-effect multipliers', async () => {
      mocks.state.userProfile = {
        ...makeProfile('account-a', 100),
        activeStatusEffects: [
          {
            id: 'effect-mult',
            effectDef: {
              name: 'Moon Blessing',
              type: 'Blessing',
              description: 'Doubles qi',
              durationMs: 60_000,
              scope: 'Account-wide',
              qiMultiplier: 2,
            },
            appliedAt: '2026-07-26T00:00:00.000Z',
            expiresAt: '2099-07-26T00:00:00.000Z',
          } as any,
          {
            id: 'effect-demonic',
            effectDef: {
              name: 'Demonic Corruption',
              type: 'Mutation',
              description: 'Corrupting',
              durationMs: 60_000,
              scope: 'Account-wide',
            },
            appliedAt: '2026-07-26T00:00:00.000Z',
            expiresAt: '2099-07-26T00:00:00.000Z',
          } as any,
        ],
      };

      const result = await claimIdleQiReward(12, BASELINE);

      expect(result).toBe('claimed');
      // exactly +12 despite the active 2x multiplier; demonic qi keeps its 50% tithe
      expect(mocks.saveUserProfile).toHaveBeenCalledTimes(1);
      expect(mocks.saveUserProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'account-a',
          dao_xp: 112,
          qi: 112,
          heavenly_qi: 112,
          sect_qi: 12,
          demonic_qi: 6,
          lastSessionEnd: expect.any(String),
          updatedAt: expect.any(String),
        }),
        { idempotencyKey: CLAIM_KEY },
      );
      // the consumed baseline is recorded server-side and newer than the baseline
      const saved = mocks.saveUserProfile.mock.calls[0][0];
      expect(Date.parse(saved.lastSessionEnd)).toBeGreaterThan(Date.parse(BASELINE));
      expect(mocks.state.userProfile).toMatchObject({ dao_xp: 112, qi: 112 });
      expect(mocks.cacheAccountProfile).toHaveBeenCalled();
      expect(localStorage.getItem('seihouse-idle-claim:account-a')).toBe(BASELINE);
    });

    it('hard-caps any single claim at 350 Qi', async () => {
      mocks.state.userProfile = makeProfile('account-a', 0);

      const result = await claimIdleQiReward(9999, BASELINE);

      expect(result).toBe('claimed');
      expect(mocks.saveUserProfile).toHaveBeenCalledWith(
        expect.objectContaining({ dao_xp: 350, qi: 350 }),
        { idempotencyKey: CLAIM_KEY },
      );
    });

    it('skips the deposit when the baseline was already claimed on this device', async () => {
      localStorage.setItem('seihouse-idle-claim:account-a', BASELINE);
      mocks.state.userProfile = makeProfile('account-a', 100);

      const result = await claimIdleQiReward(12, BASELINE);

      expect(result).toBe('already-claimed');
      expect(mocks.saveUserProfile).not.toHaveBeenCalled();
      expect(mocks.state.userProfile.dao_xp).toBe(100);
    });

    it('skips the deposit when the server lastSessionEnd is newer than the baseline', async () => {
      mocks.state.userProfile = {
        ...makeProfile('account-a', 100),
        lastSessionEnd: '2026-07-30T00:00:00.000Z',
      };

      const result = await claimIdleQiReward(12, BASELINE);

      expect(result).toBe('already-claimed');
      expect(mocks.saveUserProfile).not.toHaveBeenCalled();
      expect(mocks.state.userProfile.dao_xp).toBe(100);
      expect(localStorage.getItem('seihouse-idle-claim:account-a')).toBe(BASELINE);
    });

    it('folds pending syncs into the claim write and restores them on failure', async () => {
      mocks.state.userProfile = makeProfile('account-a', 100);
      await awardDirectQi(5, 'pre-claim-award');
      expect(mocks.state.userProfile.dao_xp).toBe(105);

      mocks.saveUserProfile.mockRejectedValueOnce(new Error('offline'));

      await expect(claimIdleQiReward(12, BASELINE)).rejects.toThrow('offline');
      // no premature store update: only the earlier award is visible
      expect(mocks.state.userProfile.dao_xp).toBe(105);
      expect(localStorage.getItem('seihouse-idle-claim:account-a')).toBeNull();

      // the folded pending sync was restored and still flushes the pre-claim award
      await flushPendingProfileSync('account-a');
      expect(mocks.saveUserProfile).toHaveBeenLastCalledWith(
        expect.objectContaining({ uid: 'account-a', dao_xp: 105 }),
        { keepalive: false },
      );
    });

    it('resolves already-claimed when a conflicting write consumed the baseline first', async () => {
      mocks.state.userProfile = makeProfile('account-a', 100);
      mocks.saveUserProfile.mockRejectedValueOnce(new Error('User profile expected revision is stale'));
      mocks.getUserProfile.mockResolvedValueOnce({
        ...makeProfile('account-a', 112),
        lastSessionEnd: '2026-07-30T00:00:00.000Z',
      });

      const result = await claimIdleQiReward(12, BASELINE);

      expect(result).toBe('already-claimed');
      // the store adopts the server's truth instead of double-awarding
      expect(mocks.state.userProfile).toMatchObject({ dao_xp: 112 });
      expect(localStorage.getItem('seihouse-idle-claim:account-a')).toBe(BASELINE);
    });

    it('records the session end through the debounced profile sync without bumping updatedAt', async () => {
      mocks.state.userProfile = makeProfile('account-a', 100);
      const sessionEnd = '2026-07-30T10:00:00.000Z';

      recordLibrarySessionEnd(sessionEnd);
      expect(mocks.state.userProfile.lastSessionEnd).toBe(sessionEnd);

      await flushPendingProfileSync('account-a');
      expect(mocks.saveUserProfile).toHaveBeenCalledTimes(1);
      const saved = mocks.saveUserProfile.mock.calls[0][0];
      expect(saved).toMatchObject({ uid: 'account-a', lastSessionEnd: sessionEnd });
      expect(saved.updatedAt).toBeUndefined();
    });

    it('does not record the session end before the profile has loaded', async () => {
      mocks.state.userProfile = null;

      recordLibrarySessionEnd('2026-07-30T10:00:00.000Z');
      await flushPendingProfileSync('account-a');

      expect(mocks.saveUserProfile).not.toHaveBeenCalled();
    });
  });
});
