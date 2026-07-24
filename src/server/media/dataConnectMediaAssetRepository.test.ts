// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  reserveStorageQuota: vi.fn(),
  reserveMediaAsset: vi.fn(),
  getOwnedMediaAsset: vi.fn(),
  commitMediaAsset: vi.fn(),
  commitAccountMediaAsset: vi.fn(),
}));

vi.mock('../firebaseAdmin', () => ({ getFirebaseAdminApp: () => ({}) }));
vi.mock('../../generated/dataconnect-admin', () => ({
  adminReserveStorageQuota: mocks.reserveStorageQuota,
  adminReserveMediaAssetIdempotent: mocks.reserveMediaAsset,
  adminGetOwnedMediaAsset: mocks.getOwnedMediaAsset,
  adminCommitMediaAssetToSlot: mocks.commitMediaAsset,
  adminCommitAccountMediaAsset: mocks.commitAccountMediaAsset,
}));

import { DataConnectMediaAssetRepository } from './dataConnectMediaAssetRepository';

describe('DataConnectMediaAssetRepository', () => {
  beforeEach(() => {
    mocks.reserveStorageQuota.mockReset();
    mocks.reserveMediaAsset.mockReset();
    mocks.getOwnedMediaAsset.mockReset();
    mocks.commitMediaAsset.mockReset();
    mocks.commitAccountMediaAsset.mockReset();
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

  it('retries a media commit until the just-reserved asset is visible', async () => {
    const queryError = Object.assign(new Error('Invalid SQL statement\nAsset not found (aborted)'), {
      code: 'data-connect/query-error',
    });
    mocks.commitMediaAsset
      .mockRejectedValueOnce(queryError)
      .mockResolvedValueOnce({
        data: {
          mediaAsset_update: { id: 'fc0aac17-fb01-4f7e-a9bc-e3121204125d' },
          mediaSlot_upsert: { ownerUid: 'owner-1' },
          mediaUploadReceipt_update: { idempotencyKey: 'request-1' },
          mediaAttachment_updateMany: 0,
          mediaUploadAttempt_updateMany: 1,
          committedReservation: { id: '0b3eeea7-88d8-4304-973d-c5d5b4b19146' },
          storyUsage: { storyId: '7da538b7-75ce-44f9-bdf9-82e7f9e4d7ae' },
          committedQuota: { userUid: 'owner-1' },
        },
      });
    mocks.getOwnedMediaAsset
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
      })
      .mockResolvedValueOnce({
        data: {
          mediaAsset: {
            id: 'fc0aac17-fb01-4f7e-a9bc-e3121204125d',
            ownerUid: 'owner-1',
            assetType: 'IMAGE',
            purpose: 'CELESTIAL_PORTRAIT',
            visibility: 'PRIVATE',
            status: 'READY',
          },
        },
      });
    const repository = new DataConnectMediaAssetRepository();

    await expect(repository.commitToSlot(
      'owner-1',
      'fc0aac17-fb01-4f7e-a9bc-e3121204125d',
      'etag-1',
      {
        quotaReservationId: '0b3eeea7-88d8-4304-973d-c5d5b4b19146',
        idempotencyKey: 'request-1',
        requestedBytes: '1024',
        attachmentId: 'de52773d-42dd-4aa2-932f-a4660b2f9d18',
        position: 0,
        newSlotVersion: '1',
        association: {
          storyId: '7da538b7-75ce-44f9-bdf9-82e7f9e4d7ae',
          targetKind: 'STORY',
          targetKey: '7da538b7-75ce-44f9-bdf9-82e7f9e4d7ae',
          purpose: 'CELESTIAL_PORTRAIT',
        },
      },
    )).resolves.toMatchObject({
      id: 'fc0aac17-fb01-4f7e-a9bc-e3121204125d',
      status: 'READY',
    });
    expect(mocks.commitMediaAsset).toHaveBeenCalledTimes(2);
    expect(mocks.commitMediaAsset).toHaveBeenLastCalledWith(expect.objectContaining({
      storyId: '7da538b7-75ce-44f9-bdf9-82e7f9e4d7ae',
      chapterId: null,
      entityId: null,
    }));
  });

  it('commits account portraits without story attachment or slot writes', async () => {
    mocks.commitAccountMediaAsset
      .mockRejectedValueOnce(Object.assign(new Error('Invalid SQL statement'), {
        code: 'data-connect/query-error',
      }))
      .mockResolvedValueOnce({
        data: {
          mediaAsset_update: { id: 'fc0aac17-fb01-4f7e-a9bc-e3121204125d' },
          mediaUploadReceipt_update: { idempotencyKey: 'request-1' },
          mediaUploadAttempt_updateMany: 1,
          committedReservation: { id: '0b3eeea7-88d8-4304-973d-c5d5b4b19146' },
          committedQuota: { userUid: 'owner-1' },
        },
      });
    mocks.getOwnedMediaAsset
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
      })
      .mockResolvedValueOnce({
        data: {
          mediaAsset: {
            id: 'fc0aac17-fb01-4f7e-a9bc-e3121204125d',
            ownerUid: 'owner-1',
            assetType: 'IMAGE',
            purpose: 'CELESTIAL_PORTRAIT',
            visibility: 'PRIVATE',
            status: 'READY',
          },
        },
      });
    const repository = new DataConnectMediaAssetRepository();

    await expect(repository.commitToSlot(
      'owner-1',
      'fc0aac17-fb01-4f7e-a9bc-e3121204125d',
      'etag-1',
      {
        quotaReservationId: '0b3eeea7-88d8-4304-973d-c5d5b4b19146',
        idempotencyKey: 'request-1',
        requestedBytes: '1024',
        attachmentId: 'de52773d-42dd-4aa2-932f-a4660b2f9d18',
        position: 0,
        newSlotVersion: '1',
        association: {
          targetKind: 'PROFILE',
          targetKey: 'owner-1',
          purpose: 'CELESTIAL_PORTRAIT',
        },
      },
    )).resolves.toMatchObject({
      id: 'fc0aac17-fb01-4f7e-a9bc-e3121204125d',
      status: 'READY',
    });
    expect(mocks.commitAccountMediaAsset).toHaveBeenCalledTimes(2);
    expect(mocks.commitAccountMediaAsset).toHaveBeenLastCalledWith({
      id: 'fc0aac17-fb01-4f7e-a9bc-e3121204125d',
      ownerUid: 'owner-1',
      quotaReservationId: '0b3eeea7-88d8-4304-973d-c5d5b4b19146',
      idempotencyKey: 'request-1',
      etag: 'etag-1',
      requestedBytes: '1024',
    });
    expect(mocks.commitMediaAsset).not.toHaveBeenCalled();
  });
});
