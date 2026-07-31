import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { claimIdleQiReward, recordLibrarySessionEnd } from '../lib/qi';
import {
  computeIdleQiReward,
  isIdleBaselineClaimed,
  latestIsoTimestamp,
  markIdleBaselineClaimed,
  readLocalSessionEnd,
  touchLibraryActiveDay,
  writeLocalSessionEnd,
} from '../lib/closedDoorCultivation';

export interface IdleQiReward {
  amount: number;
  baselineIso: string;
}

/**
 * Closed-Door Cultivation orchestration.
 *
 * Time away (session-end baseline, local + server-side `lastSessionEnd` for
 * signed-in users) determines the Qi reward; the lifetime count of unique
 * active Library days drives the cultivating-day display. The two stay
 * separate on purpose.
 *
 * The reward baseline is intentionally NOT cleared when a reward appears, so
 * refreshing or reopening the app before claiming re-opens the same veil, and
 * a waiting reward survives hide/visible tab cycles. Claiming consumes the
 * baseline (server write + local marker) so it can never be claimed twice.
 */
export function useClosedDoorCultivation(isInitializing: boolean) {
  const currentUser = useAppStore(state => state.currentUser);
  const uid = currentUser?.uid ?? null;
  const trackingId = uid ?? 'anonymous';
  // Signed-in users wait for their own profile so the server-side
  // lastSessionEnd (cross-device truth) feeds the baseline before any
  // reward is displayed.
  const profileReady = useAppStore(
    state => !state.currentUser || state.userProfile?.uid === state.currentUser.uid,
  );
  const profileSessionEnd = useAppStore(state =>
    state.currentUser ? state.userProfile?.lastSessionEnd ?? null : null,
  );

  const [pending, setPending] = useState<IdleQiReward | null>(null);
  const [daysCultivating, setDaysCultivating] = useState(1);
  // A claim in flight must not let a re-evaluation pull the reward out from
  // under the disappearance animation.
  const claimingRef = useRef(false);

  const evaluate = useCallback(() => {
    // Lifetime active-day tracking: opening the Library counts today once,
    // and the count never resets when days are missed.
    setDaysCultivating(touchLibraryActiveDay(trackingId));

    setPending(cur => {
      if (cur) {
        // The waiting reward keeps its computed amount until claimed; it only
        // disappears early when the claim landed in another tab on this device.
        if (!claimingRef.current && isIdleBaselineClaimed(trackingId, cur.baselineIso)) {
          return null;
        }
        return cur;
      }
      if (uid && !profileReady) return cur;
      const baseline = latestIsoTimestamp(readLocalSessionEnd(), uid ? profileSessionEnd : null);
      if (!baseline || isIdleBaselineClaimed(trackingId, baseline)) return null;
      const amount = computeIdleQiReward(baseline);
      return amount > 0 ? { amount, baselineIso: baseline } : null;
    });
  }, [uid, trackingId, profileReady, profileSessionEnd]);

  useEffect(() => {
    if (isInitializing) return;

    evaluate();

    const recordSessionEnd = (flushImmediately = false) => {
      const iso = new Date().toISOString();
      writeLocalSessionEnd(iso);
      recordLibrarySessionEnd(iso, flushImmediately);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        recordSessionEnd();
      } else if (document.visibilityState === 'visible') {
        evaluate();
      }
    };
    // Dedicated handlers so the event object is never mistaken for the flag.
    const handleBeforeUnload = () => recordSessionEnd(true);
    const handlePageHide = () => recordSessionEnd(true);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [isInitializing, evaluate]);

  const claimIdleQi = useCallback(
    async (qi: number) => {
      if (!pending || claimingRef.current) return;
      claimingRef.current = true;
      try {
        if (!uid) {
          // Anonymous readers keep the previous local-only behavior: the reward
          // lands on the guest profile in the store, exactly once.
          const store = useAppStore.getState();
          const guest = store.userProfile;
          if (guest) {
            store.setUserProfile({
              ...guest,
              dao_xp: (guest.dao_xp || 0) + qi,
              qi: (guest.qi || 0) + qi,
              heavenly_qi: (guest.heavenly_qi ?? guest.dao_xp ?? 0) + qi,
              sect_qi: (guest.sect_qi || 0) + qi,
            });
          }
          markIdleBaselineClaimed(trackingId, pending.baselineIso);
          return;
        }
        // Resolves 'claimed' or 'already-claimed' once the transaction is
        // recorded — either way the balance is correct. The pending reward
        // deliberately stays set so the modal can finish its disappearance
        // animation; it calls closeIdleQi at the end.
        await claimIdleQiReward(qi, pending.baselineIso);
      } catch (error) {
        // The reward was not recorded: release the claim lock so the user can
        // retry — the veil stays open.
        claimingRef.current = false;
        throw error;
      }
    },
    [pending, uid, trackingId],
  );

  const closeIdleQi = useCallback(() => {
    claimingRef.current = false;
    setPending(null);
  }, []);

  return {
    idleQiEarned: pending?.amount ?? null,
    daysCultivating,
    claimIdleQi,
    closeIdleQi,
  };
}
