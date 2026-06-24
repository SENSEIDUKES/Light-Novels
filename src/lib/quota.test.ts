import { describe, it, expect, vi } from 'vitest';
import { checkAndConsumeImageQuota } from './quota';
import { auth, db } from './firebase';
import { getDoc } from 'firebase/firestore';

vi.mock('./firebase', () => ({
  auth: { currentUser: { uid: '123' } },
  db: {}
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  increment: vi.fn()
}));

describe('quota', () => {
  it('allows generation for pro tier', async () => {
    (getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => ({ premiumTier: 'pro', imageGenerationCount: 100 })
    });
    
    await expect(checkAndConsumeImageQuota()).resolves.toBeUndefined();
  });

  it('throws error for free tier when limit reached', async () => {
    (getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => ({ premiumTier: 'free', imageGenerationCount: 2 })
    });
    
    await expect(checkAndConsumeImageQuota()).rejects.toThrow();
  });
});
