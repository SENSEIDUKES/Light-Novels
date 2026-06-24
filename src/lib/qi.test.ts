import { describe, it, expect, vi } from 'vitest';
import { getDaoRankData, DAO_RANKS, awardQi } from './qi';

vi.mock('./firebase', () => ({
  db: {}
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn()
}));

describe('Qi', () => {
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
      expect(data.progress).toBe(50); // (50 - 0) / (100 - 0) * 100
    });

    it('returns max rank correctly', () => {
      const maxRank = DAO_RANKS[DAO_RANKS.length - 1];
      const data = getDaoRankData(maxRank.threshold + 1000);
      expect(data.rank).toBe(maxRank.name);
      expect(data.nextRank).toBeNull();
      expect(data.progress).toBe(100);
    });
  });

  describe('awardQi', () => {
    it('handles errors gracefully', async () => {
      await expect(awardQi('chapter_read', '10')).resolves.toBeUndefined();
    });
  });
});
