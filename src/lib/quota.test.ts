import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  consumeImageGenerationQuota: vi.fn(),
}));

vi.mock('./firebase', () => ({ LOCAL_ONLY_MODE: false }));
vi.mock('./persistence', () => ({
  consumeImageGenerationQuota: mocks.consumeImageGenerationQuota,
}));

import { checkAndConsumeImageQuota } from './quota';

describe('quota', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeImageGenerationQuota.mockResolvedValue({
      imageGenerationCount: 1,
      imageQuotaResetAt: '2026-08-01T00:00:00.000Z',
    });
  });

  it('delegates manual quota enforcement to the atomic PostgreSQL endpoint', async () => {
    await expect(checkAndConsumeImageQuota()).resolves.toBeUndefined();
    expect(mocks.consumeImageGenerationQuota).toHaveBeenCalledOnce();
  });

  it('propagates the server quota rejection without a client-side race', async () => {
    mocks.consumeImageGenerationQuota.mockRejectedValue(
      new Error('Mortal tier limits reached'),
    );

    await expect(checkAndConsumeImageQuota()).rejects.toThrow('Mortal tier limits reached');
  });

  it('does not consume quota for automatic system actions', async () => {
    await expect(checkAndConsumeImageQuota({ automatic: true })).resolves.toBeUndefined();
    expect(mocks.consumeImageGenerationQuota).not.toHaveBeenCalled();
  });
});
