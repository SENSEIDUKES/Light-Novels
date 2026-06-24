import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkAndConsumeImageQuota } from './quota';
import { auth, db } from './firebase';
import { getDoc, updateDoc } from 'firebase/firestore';

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows generation for pro tier', async () => {
    (getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => ({ premiumTier: 'pro', imageGenerationCount: 100, imageQuotaResetAt: new Date(Date.now() + 100000).toISOString() })
    });
    
    await expect(checkAndConsumeImageQuota()).resolves.toBeUndefined();
    expect(updateDoc).toHaveBeenCalled();
  });

  it('throws error for free tier when limit reached (4 max)', async () => {
    (getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => ({ premiumTier: 'free', imageGenerationCount: 4, imageQuotaResetAt: new Date(Date.now() + 100000).toISOString() })
    });
    
    await expect(checkAndConsumeImageQuota()).rejects.toThrow(/Free tier limits reached/);
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('resets imageGenerationCount when now > imageQuotaResetAt', async () => {
    (getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => ({ premiumTier: 'free', imageGenerationCount: 4, imageQuotaResetAt: new Date(Date.now() - 100000).toISOString() })
    });

    await expect(checkAndConsumeImageQuota()).resolves.toBeUndefined();
    expect(updateDoc).toHaveBeenCalledWith(undefined, expect.objectContaining({
      imageGenerationCount: 1,
      imageQuotaResetAt: expect.any(String)
    }));
  });

  it('resets imageGenerationCount when reset timestamp is missing', async () => {
    (getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => ({ premiumTier: 'free', imageGenerationCount: 4 })
    });

    await expect(checkAndConsumeImageQuota()).resolves.toBeUndefined();
    expect(updateDoc).toHaveBeenCalledWith(undefined, expect.objectContaining({
      imageGenerationCount: 1,
      imageQuotaResetAt: expect.any(String)
    }));
  });

  it('does not throw or update Firestore count when automatic option is true (system action)', async () => {
    (getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => ({ premiumTier: 'free', imageGenerationCount: 2 })
    });

    await expect(checkAndConsumeImageQuota({ automatic: true })).resolves.toBeUndefined();
    expect(updateDoc).not.toHaveBeenCalled();
    expect(getDoc).not.toHaveBeenCalled();
  });
});
