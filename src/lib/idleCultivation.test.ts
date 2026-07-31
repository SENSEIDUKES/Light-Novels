import { beforeEach, describe, expect, it } from 'vitest';
import {
  IDLE_MAX_AWAY_MS,
  IDLE_MIN_AWAY_MS,
  MAX_IDLE_QI_REWARD,
  computeIdleQiReward,
  getLibraryActiveDayCount,
  isIdleBaselineClaimed,
  latestIsoTimestamp,
  localDayKey,
  markIdleBaselineClaimed,
  readIdleClaimMarker,
  readLocalSessionEnd,
  touchLibraryActiveDay,
  writeLocalSessionEnd,
} from './idleCultivation';

const NOW = new Date('2026-07-30T12:00:00.000Z').getTime();
const isoAgo = (ms: number) => new Date(NOW - ms).toISOString();

describe('idleCultivation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('computeIdleQiReward', () => {
    it('returns 0 without a baseline or for corrupt timestamps', () => {
      expect(computeIdleQiReward(null, NOW)).toBe(0);
      expect(computeIdleQiReward(undefined, NOW)).toBe(0);
      expect(computeIdleQiReward('not-a-date', NOW)).toBe(0);
      expect(computeIdleQiReward('', NOW)).toBe(0);
    });

    it('returns 0 for short absences at or under the minimum', () => {
      expect(computeIdleQiReward(isoAgo(IDLE_MIN_AWAY_MS - 1), NOW)).toBe(0);
      expect(computeIdleQiReward(isoAgo(IDLE_MIN_AWAY_MS), NOW)).toBe(0);
    });

    it('returns 0 for future or inverted baselines', () => {
      expect(computeIdleQiReward(new Date(NOW + 60_000).toISOString(), NOW)).toBe(0);
    });

    it('condenses 1 Qi per 10 minutes away', () => {
      expect(computeIdleQiReward(isoAgo(10 * 60 * 1000), NOW)).toBe(1);
      expect(computeIdleQiReward(isoAgo(30 * 60 * 1000), NOW)).toBe(3);
      expect(computeIdleQiReward(isoAgo(60 * 60 * 1000), NOW)).toBe(6);
      expect(computeIdleQiReward(isoAgo(59 * 60 * 1000), NOW)).toBe(5);
    });

    it('stops condensing after 24 hours away (existing curve)', () => {
      expect(computeIdleQiReward(isoAgo(IDLE_MAX_AWAY_MS), NOW)).toBe(144);
      expect(computeIdleQiReward(isoAgo(48 * 60 * 60 * 1000), NOW)).toBe(144);
    });

    it('never exceeds the absolute 350-Qi ceiling, even with corrupt data', () => {
      // Directly at the internal cap boundary the curve is still respected,
      // but the ceiling guards any value the curve could produce.
      expect(MAX_IDLE_QI_REWARD).toBe(350);
      const farFuture = NOW + 10 * 365 * 24 * 60 * 60 * 1000;
      expect(computeIdleQiReward(isoAgo(IDLE_MAX_AWAY_MS), farFuture)).toBeLessThanOrEqual(350);
      // A baseline so old it overflows normal reasoning still clamps.
      expect(computeIdleQiReward('1970-01-01T00:00:00.000Z', NOW)).toBeLessThanOrEqual(350);
      expect(computeIdleQiReward('1970-01-01T00:00:00.000Z', NOW)).toBe(144);
    });
  });

  describe('latestIsoTimestamp', () => {
    it('picks the later valid timestamp', () => {
      const older = isoAgo(60_000);
      const newer = isoAgo(5_000);
      expect(latestIsoTimestamp(older, newer)).toBe(newer);
      expect(latestIsoTimestamp(newer, older)).toBe(newer);
    });

    it('tolerates missing or invalid values', () => {
      expect(latestIsoTimestamp(null, null)).toBeNull();
      expect(latestIsoTimestamp('bad', null)).toBeNull();
      expect(latestIsoTimestamp('bad', isoAgo(1_000))).toBe(isoAgo(1_000));
      expect(latestIsoTimestamp(isoAgo(1_000), 'bad')).toBe(isoAgo(1_000));
    });
  });

  describe('session-end storage', () => {
    it('round-trips the local session-end timestamp', () => {
      expect(readLocalSessionEnd()).toBeNull();
      writeLocalSessionEnd('2026-07-30T00:00:00.000Z');
      expect(readLocalSessionEnd()).toBe('2026-07-30T00:00:00.000Z');
    });
  });

  describe('claim markers', () => {
    it('consumes only the claimed baseline for the same account', () => {
      const baseline = '2026-07-29T10:00:00.000Z';
      expect(isIdleBaselineClaimed('user-a', baseline)).toBe(false);
      markIdleBaselineClaimed('user-a', baseline);
      expect(isIdleBaselineClaimed('user-a', baseline)).toBe(true);
      expect(readIdleClaimMarker('user-a')).toBe(baseline);
      // an older baseline is also consumed; a newer one is not
      expect(isIdleBaselineClaimed('user-a', '2026-07-28T10:00:00.000Z')).toBe(true);
      expect(isIdleBaselineClaimed('user-a', '2026-07-30T10:00:00.000Z')).toBe(false);
      // markers are per-account
      expect(isIdleBaselineClaimed('user-b', baseline)).toBe(false);
    });

    it('treats unreadable markers as not claimed', () => {
      localStorage.setItem('seihouse-idle-claim:user-a', 'garbage');
      expect(isIdleBaselineClaimed('user-a', '2026-07-29T10:00:00.000Z')).toBe(false);
    });
  });

  describe('lifetime active Library days', () => {
    it('counts each calendar day once and never resets', () => {
      expect(touchLibraryActiveDay('user-a', '2026-07-28')).toBe(1);
      expect(touchLibraryActiveDay('user-a', '2026-07-28')).toBe(1);
      expect(touchLibraryActiveDay('user-a', '2026-07-29')).toBe(2);
      // a missed day does not reset the count
      expect(touchLibraryActiveDay('user-a', '2026-07-31')).toBe(3);
      expect(getLibraryActiveDayCount('user-a')).toBe(3);
    });

    it('tracks counts per account', () => {
      touchLibraryActiveDay('user-a', '2026-07-28');
      touchLibraryActiveDay('user-a', '2026-07-29');
      touchLibraryActiveDay('user-b', '2026-07-29');
      expect(getLibraryActiveDayCount('user-a')).toBe(2);
      expect(getLibraryActiveDayCount('user-b')).toBe(1);
      expect(getLibraryActiveDayCount('user-c')).toBe(0);
    });

    it('recovers from corrupt stored data', () => {
      localStorage.setItem('seihouse-library-days:user-a', '{broken');
      expect(touchLibraryActiveDay('user-a', '2026-07-29')).toBe(1);
      localStorage.setItem('seihouse-library-days:user-a', '{"not":"an array"}');
      expect(touchLibraryActiveDay('user-a', '2026-07-30')).toBe(1);
      localStorage.setItem('seihouse-library-days:user-a', '[1, "2026-07-30"]');
      expect(touchLibraryActiveDay('user-a', '2026-07-30')).toBe(1);
      expect(touchLibraryActiveDay('user-a', '2026-07-31')).toBe(2);
    });

    it('localDayKey formats YYYY-MM-DD', () => {
      expect(localDayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
      expect(localDayKey(new Date(2026, 11, 31))).toBe('2026-12-31');
    });
  });
});
