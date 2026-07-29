// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  reserveStorageQuota: vi.fn(),
  reserveMediaAsset: vi.fn(),
  getOwnedMediaAsset: vi.fn(),
  getOwnedMediaSlot: vi.fn(),
  listOwnedMediaSlotHistory: vi.fn(),
  selectOwnedMediaSlotAsset: vi.fn(),
  commitMediaAsset: vi.fn(),
  commitAccountMediaAsset: vi.fn(),
  getOwnedStoryScope: vi.fn(),
  getOwnedChapterScope: vi.fn(),
  getOwnedEntityScope: vi.fn(),
  getOwnedGenerationJobScope: vi.fn(),
}));

vi.mock('../firebaseAdmin', () => ({ getFirebaseAdminApp: () => ({}) }));
vi.mock('../../generated/dataconnect-admin', () => ({
  adminReserveStorageQuota: mocks.reserveStorageQuota,
  adminReserveMediaAssetIdempotent: mocks.reserveMediaAsset,
  adminGetOwnedMediaAsset: mocks.getOwnedMediaAsset,
  adminGetOwnedMediaSlot: mocks.getOwnedMediaSlot,
  adminListOwnedMediaSlotHistory: mocks.listOwnedMediaSlotHistory,
  adminSelectOwnedMediaSlotAsset: mocks.selectOwnedMediaSlotAsset,
  adminCommitMediaAssetToSlot: mocks.commitMediaAsset,
  adminCommitAccountMediaAsset: mocks.commitAccountMediaAsset,
  adminGetOwnedStoryScope: mocks.getOwnedStoryScope,
  adminGetOwnedChapterScope: mocks.getOwnedChapterScope,
  adminGetOwnedEntityScope: mocks.getOwnedEntityScope,
  adminGetOwnedGenerationJobScope: mocks.getOwnedGenerationJobScope,
}));

import { DataConnectMediaAssetRepository } from './dataConnectMediaAssetRepository';

describe('DataConnectMediaAssetRepository', () => {
  beforeEach(() => {
    mocks.reserveStorageQuota.mockReset();
    mocks.reserveMediaAsset.mockReset();
    mocks.getOwnedMediaAsset.mockReset();
    mocks.getOwnedMediaSlot.mockReset();
    mocks.listOwnedMediaSlotHistory.mockReset();
    mocks.selectOwnedMediaSlotAsset.mockReset();
    mocks.commitMediaAsset.mockReset();
    mocks.commitAccountMediaAsset.mockReset();
    mocks.getOwnedStoryScope.mockReset();
    mocks.getOwnedChapterScope.mockReset();
    mocks.getOwnedEntityScope.mockReset();
    mocks.getOwnedGenerationJobScope.mockReset();
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

  it('canonicalizes compact Data Connect UUIDs in media responses', async () => {
    mocks.getOwnedMediaAsset.mockResolvedValue({
      data: {
        mediaAsset: {
          id: 'fc0aac17fb014f7ea9bce3121204125d',
          ownerUid: 'owner-1',
          assetType: 'IMAGE',
          purpose: 'CELESTIAL_PORTRAIT',
          visibility: 'PRIVATE',
          status: 'READY',
        },
      },
    });
    const repository = new DataConnectMediaAssetRepository();

    await expect(repository.getOwned(
      'owner-1',
      'fc0aac17-fb01-4f7e-a9bc-e3121204125d',
    )).resolves.toMatchObject({
      id: 'fc0aac17-fb01-4f7e-a9bc-e3121204125d',
    });
  });

  it('canonicalizes compact slot and history UUIDs before selecting a version', async () => {
    const assetCompact = 'fc0aac17fb014f7ea9bce3121204125d';
    const assetCanonical = 'fc0aac17-fb01-4f7e-a9bc-e3121204125d';
    const storyCompact = '7da538b775ce44f9bdf982e7f9e4d7ae';
    const storyCanonical = '7da538b7-75ce-44f9-bdf9-82e7f9e4d7ae';
    const attachmentCompact = 'de52773d42dd4aa2932fa4660b2f9d18';
    const attachmentCanonical = 'de52773d-42dd-4aa2-932f-a4660b2f9d18';
    mocks.getOwnedMediaSlot.mockResolvedValue({
      data: {
        mediaSlot: {
          ownerUid: 'owner-1',
          storyId: storyCompact,
          chapterId: null,
          entityId: null,
          targetKind: 'STORY',
          targetKey: storyCompact,
          purpose: 'STORY_COVER',
          currentAssetId: '11111111111141118111111111111111',
          version: '1',
          updatedAt: '2026-07-29T00:00:00.000Z',
        },
      },
    });
    mocks.listOwnedMediaSlotHistory.mockResolvedValue({
      data: {
        mediaAttachments: [{
          id: attachmentCompact,
          assetId: assetCompact,
          storyId: storyCompact,
          chapterId: null,
          entityId: null,
          position: 0,
          isCurrent: false,
          createdAt: '2026-07-29T00:00:00.000Z',
        }],
      },
    });
    mocks.selectOwnedMediaSlotAsset.mockResolvedValue({
      data: {
        mediaAttachment_update: { id: attachmentCompact },
        mediaSlot_update: { ownerUid: 'owner-1' },
        mediaAttachment_updateMany: 1,
      },
    });
    mocks.getOwnedMediaAsset.mockResolvedValue({
      data: {
        mediaAsset: {
          id: assetCompact,
          ownerUid: 'owner-1',
          storyId: storyCompact,
          assetType: 'IMAGE',
          purpose: 'STORY_COVER',
          visibility: 'PRIVATE',
          status: 'READY',
        },
      },
    });
    const repository = new DataConnectMediaAssetRepository();
    const association = {
      storyId: storyCanonical,
      targetKind: 'STORY',
      targetKey: storyCanonical,
      purpose: 'STORY_COVER',
    };

    const slot = await repository.getOwnedSlot('owner-1', association);
    expect(slot).toMatchObject({
      storyId: storyCanonical,
      targetKey: storyCanonical,
      currentAssetId: '11111111-1111-4111-8111-111111111111',
    });
    await expect(repository.selectOwnedSlotAsset(
      'owner-1',
      assetCanonical,
      association,
      slot!,
    )).resolves.toMatchObject({ id: assetCanonical });
    expect(mocks.selectOwnedMediaSlotAsset).toHaveBeenCalledWith(expect.objectContaining({
      assetId: assetCanonical,
      attachmentId: attachmentCanonical,
      storyId: storyCanonical,
    }));
  });

  it('does not hyphenate a hexadecimal Firebase uid used as an account target', async () => {
    const ownerUid = '0123456789abcdef0123456789abcdef';
    mocks.getOwnedMediaSlot.mockResolvedValue({
      data: {
        mediaSlot: {
          ownerUid,
          storyId: null,
          chapterId: null,
          entityId: null,
          targetKind: 'PORTRAIT',
          targetKey: ownerUid,
          purpose: 'CELESTIAL_PORTRAIT',
          currentAssetId: '11111111111141118111111111111111',
          version: '1',
          updatedAt: '2026-07-29T00:00:00.000Z',
        },
      },
    });
    const repository = new DataConnectMediaAssetRepository();

    await expect(repository.getOwnedSlot(ownerUid, {
      targetKind: 'PORTRAIT',
      targetKey: ownerUid,
      purpose: 'CELESTIAL_PORTRAIT',
    })).resolves.toMatchObject({
      targetKey: ownerUid,
      currentAssetId: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('accepts compact relation UUIDs while validating a canonical association', async () => {
    const storyCanonical = '7da538b7-75ce-44f9-bdf9-82e7f9e4d7ae';
    const storyCompact = '7da538b775ce44f9bdf982e7f9e4d7ae';
    const chapterCanonical = 'a695db57-1a7b-4b18-8c1e-2c159cb04bb2';
    const chapterCompact = 'a695db571a7b4b188c1e2c159cb04bb2';
    const entityCanonical = '31bc6949-eeb8-4ce6-bc82-44e161b82e89';
    const entityCompact = '31bc6949eeb84ce6bc8244e161b82e89';
    mocks.getOwnedStoryScope.mockResolvedValue({
      data: { story: { id: storyCompact } },
    });
    mocks.getOwnedChapterScope.mockResolvedValue({
      data: { chapter: { id: chapterCompact, storyId: storyCompact } },
    });
    mocks.getOwnedEntityScope.mockResolvedValue({
      data: { codexEntity: { id: entityCompact, storyId: storyCompact } },
    });
    const repository = new DataConnectMediaAssetRepository();

    await expect(repository.assertAssociationOwned('owner-1', {
      storyId: storyCanonical,
      chapterId: chapterCanonical,
      entityId: entityCanonical,
      targetKind: 'ENTITY',
      targetKey: entityCanonical,
      purpose: 'CHARACTER_PORTRAIT',
    })).resolves.toBeUndefined();

    expect(mocks.getOwnedStoryScope).toHaveBeenCalledWith({
      ownerUid: 'owner-1',
      storyId: storyCanonical,
    });
    expect(mocks.getOwnedChapterScope).toHaveBeenCalledWith({
      ownerUid: 'owner-1',
      chapterId: chapterCanonical,
    });
    expect(mocks.getOwnedEntityScope).toHaveBeenCalledWith({
      ownerUid: 'owner-1',
      entityId: entityCanonical,
    });
  });

  it('accepts a compact job story UUID when validating canonical generation scope', async () => {
    const storyCanonical = '7da538b7-75ce-44f9-bdf9-82e7f9e4d7ae';
    const jobCanonical = 'dca40be1-0ee9-4acf-91d6-7035516eb209';
    mocks.getOwnedGenerationJobScope.mockResolvedValue({
      data: {
        generationJob: {
          id: 'dca40be10ee94acf91d67035516eb209',
          storyId: '7da538b775ce44f9bdf982e7f9e4d7ae',
        },
      },
    });
    const repository = new DataConnectMediaAssetRepository();

    await expect(repository.assertGenerationJobOwned(
      'owner-1',
      jobCanonical,
      storyCanonical,
    )).resolves.toBeUndefined();
    expect(mocks.getOwnedGenerationJobScope).toHaveBeenCalledWith({
      ownerUid: 'owner-1',
      generationJobId: jobCanonical,
    });
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
