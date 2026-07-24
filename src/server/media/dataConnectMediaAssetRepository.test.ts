// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  reserveStorageQuota: vi.fn(),
  reserveMediaAsset: vi.fn(),
  getOwnedMediaAsset: vi.fn(),
}));

vi.mock('../firebaseAdmin', () => ({ getFirebaseAdminApp: () => ({}) }));
vi.mock('../../generated/dataconnect-admin', () => ({
  adminReserveStorageQuota: mocks.reserveStorageQuota,
  adminReserveMediaAssetIdempotent: mocks.reserveMediaAsset,
  adminGetOwnedMediaAsset: mocks.getOwnedMediaAsset,
}));

import { DataConnectMediaAssetRepository } from './dataConnectMediaAssetRepository';

describe('DataConnectMediaAssetRepository', () => {
  beforeEach(() => {
    mocks.reserveStorageQuota.mockReset();
    mocks.reserveMediaAsset.mockReset();
    mocks.getOwnedMediaAsset.mockReset();
    mocks.reserveStorageQuota.mockResolvedValue({
      data: { storageQuotaReservation_insert: { id: 'quota-reservation' } },
    });
    mocks.reserveMediaAsset.mockResolvedValue({
      data: {
        mediaAsset_insert: { id: 'fc0aac17-fb01-4f7e-a9bc-e3121204125d' },
        storageQuotaReservation_update: { id: '0b3eeea7-88d8-4304-973d-c5d5b4b19146' },
        mediaUploadAttempt_insert: { id: 'upload-attempt' },
        mediaUploadReceipt_insert: { idempotencyKey: '1ace85af-0b0e-43d8-83c9-c01a171f80f7' },
      },
    });
  });

  it('trusts the atomic reservation result without requiring an immediate readback', async () => {
    const repository = new DataConnectMediaAssetRepository();

    await expect(repository.reserve(
      { uid: 'owner-1' },
      {
        id: 'fc0aac17-fb01-4f7e-a9bc-e3121204125d',
        ownerUid: 'owner-1',
        assetType: 'IMAGE',
        purpose: 'CELESTIAL_PORTRAIT',
        visibility: 'PRIVATE',
        bucket: 'private-media',
        objectKey: 'user-media/private/owner-1/portrait.png',
        mimeType: 'image/png',
        extension: 'png',
        byteSize: '1024',
        checksumSha256: 'a'.repeat(64),
        version: 1,
        cacheControl: 'private, max-age=0',
        sourceKind: 'data-url',
        quotaReservationId: '0b3eeea7-88d8-4304-973d-c5d5b4b19146',
        idempotencyKey: '1ace85af-0b0e-43d8-83c9-c01a171f80f7',
        requestHash: 'b'.repeat(64),
      },
    )).resolves.toMatchObject({
      id: 'fc0aac17-fb01-4f7e-a9bc-e3121204125d',
      ownerUid: 'owner-1',
      status: 'UPLOADING',
    });
    expect(mocks.getOwnedMediaAsset).not.toHaveBeenCalled();
    expect(mocks.reserveMediaAsset).toHaveBeenCalledWith(expect.objectContaining({
      storyId: null,
      generationJobId: null,
      replacesAssetId: null,
      originalFilename: null,
      durationMs: null,
    }));
  });

  it('retries a direct media read after a committed write', async () => {
    mocks.getOwnedMediaAsset
      .mockResolvedValueOnce({ data: { mediaAsset: null } })
      .mockResolvedValueOnce({
        data: {
          mediaAsset: {
            id: 'fc0aac17-fb01-4f7e-a9bc-e3121204125d',
            ownerUid: 'owner-1',
            assetType: 'IMAGE',
            purpose: 'CELESTIAL_PORTRAIT',
            visibility: 'PRIVATE',
            status: 'UPLOADING',
          },
        },
      });
    const repository = new DataConnectMediaAssetRepository();

    await expect((repository as any).getOwnedAfterWrite(
      'owner-1',
      'fc0aac17-fb01-4f7e-a9bc-e3121204125d',
    )).resolves.toMatchObject({
      id: 'fc0aac17-fb01-4f7e-a9bc-e3121204125d',
      status: 'UPLOADING',
    });
    expect(mocks.getOwnedMediaAsset).toHaveBeenCalledTimes(2);
  });

  it('sends an explicit null story scope for account portrait quota reservations', async () => {
    const repository = new DataConnectMediaAssetRepository();

    await repository.reserveQuota('owner-1', {
      id: '0b3eeea7-88d8-4304-973d-c5d5b4b19146',
      idempotencyKey: '1ace85af-0b0e-43d8-83c9-c01a171f80f7',
      requestedBytes: '1024',
      hardLimitBytes: '524288000',
      expiresAt: '2026-07-24T19:00:00.000Z',
    });

    expect(mocks.reserveStorageQuota).toHaveBeenCalledWith(expect.objectContaining({
      ownerUid: 'owner-1',
      storyId: null,
    }));
  });
});
