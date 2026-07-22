import {
  adminCommitMediaAssetReady,
  adminCommitMediaAssetReplacement,
  adminCompleteMediaCleanup,
  adminFailMediaCleanup,
  adminGetOwnedMediaAsset,
  adminGetOwnedGenerationJobScope,
  adminGetOwnedMediaReplacementScope,
  adminGetOwnedStoryScope,
  adminGetOwnedChapterScope,
  adminGetOwnedEntityScope,
  adminListMediaAssetsForStorageReport,
  adminListMediaCleanupTasks,
  adminListStaleMediaUploads,
  adminMarkMediaAssetFailed,
  adminMarkMediaAssetPendingCleanup,
  adminRequestMediaAssetDeletion,
  adminReserveMediaAsset,
  MediaAssetType as SqlMediaAssetType,
  MediaVisibility as SqlMediaVisibility,
} from '../../generated/dataconnect-admin';
import type {
  MediaAssetRecord,
  MediaAssociation,
  MediaCleanupTask,
  MediaOwner,
  StorageUsageRow,
} from '../../contracts/mediaAssets';
import { getFirebaseAdminApp } from '../firebaseAdmin';
import type { MediaAssetRepository, MediaAssetReservation } from './mediaAssetRepository';
import { validateMediaReservation } from './mediaAssetRepository';

function mapAsset(value: NonNullable<Awaited<ReturnType<typeof adminGetOwnedMediaAsset>>['data']['mediaAsset']>): MediaAssetRecord {
  return {
    ...value,
    assetType: value.assetType,
    visibility: value.visibility,
    status: value.status,
  };
}

export class DataConnectMediaAssetRepository implements MediaAssetRepository {
  constructor() {
    getFirebaseAdminApp();
  }

  async assertAssociationOwned(ownerUid: string, association: MediaAssociation): Promise<void> {
    if (!association.storyId) {
      if (association.chapterId || association.entityId) throw new Error('Chapter/entity media associations require a story.');
      if (!['ACCOUNT', 'PROFILE', 'PORTRAIT'].includes(association.targetKind.toUpperCase()) || association.targetKey !== ownerUid) {
        throw new Error('Account media associations must target the authenticated owner.');
      }
      return;
    }
    const story = await adminGetOwnedStoryScope({ ownerUid, storyId: association.storyId });
    if (!story.data.story) throw new Error('Story media target is not owned by the authenticated user.');
    if (association.chapterId) {
      const chapter = await adminGetOwnedChapterScope({ ownerUid, chapterId: association.chapterId });
      if (!chapter.data.chapter || chapter.data.chapter.storyId !== association.storyId) throw new Error('Chapter media target is not in the owned story.');
    }
    if (association.entityId) {
      const entity = await adminGetOwnedEntityScope({ ownerUid, entityId: association.entityId });
      if (!entity.data.codexEntity || entity.data.codexEntity.storyId !== association.storyId) throw new Error('Codex media target is not in the owned story.');
    }
  }

  async assertGenerationJobOwned(ownerUid: string, generationJobId: string, storyId?: string | null): Promise<void> {
    const result = await adminGetOwnedGenerationJobScope({ ownerUid, generationJobId });
    const job = result.data.generationJob;
    if (!job) throw new Error('Generation job is not owned by the authenticated user.');
    if (job.storyId && job.storyId !== storyId) {
      throw new Error('Generation job is not owned by the requested story scope.');
    }
  }

  async assertReplacementSlotOwned(ownerUid: string, assetId: string, association: MediaAssociation): Promise<void> {
    const result = await adminGetOwnedMediaReplacementScope({ ownerUid, assetId });
    const attachments = result.data.mediaAsset?.currentAttachments ?? [];
    if (attachments.length !== 1) {
      throw new Error('The replacement asset must have exactly one current attachment; shared assets require an explicit detach workflow.');
    }
    const [current] = attachments;
    const matches = current.targetKind === association.targetKind
      && current.targetKey === association.targetKey
      && current.purpose === association.purpose
      && (current.storyId ?? null) === (association.storyId ?? null)
      && (current.chapterId ?? null) === (association.chapterId ?? null)
      && (current.entityId ?? null) === (association.entityId ?? null);
    if (!matches) throw new Error('The replacement target does not match the current media attachment slot.');
  }

  async reserve(owner: MediaOwner, reservation: MediaAssetReservation): Promise<MediaAssetRecord> {
    validateMediaReservation(reservation);
    await adminReserveMediaAsset({
      id: reservation.id,
      ownerUid: owner.uid,
      ownerEmail: owner.email,
      ownerDisplayName: owner.displayName,
      storyId: reservation.storyId,
      generationJobId: reservation.generationJobId,
      replacesAssetId: reservation.replacesAssetId,
      assetType: reservation.assetType as SqlMediaAssetType,
      purpose: reservation.purpose,
      visibility: reservation.visibility as SqlMediaVisibility,
      bucket: reservation.bucket,
      objectKey: reservation.objectKey,
      originalFilename: reservation.originalFilename,
      mimeType: reservation.mimeType,
      extension: reservation.extension,
      byteSize: reservation.byteSize,
      checksumSha256: reservation.checksumSha256,
      width: reservation.width,
      height: reservation.height,
      durationMs: reservation.durationMs,
      version: reservation.version,
      cacheControl: reservation.cacheControl,
      sourceKind: reservation.sourceKind,
    });
    const saved = await this.getOwned(owner.uid, reservation.id);
    if (!saved) throw new Error('SQL Connect reservation succeeded but could not be read back.');
    return saved;
  }

  async getOwned(ownerUid: string, assetId: string): Promise<MediaAssetRecord | null> {
    const result = await adminGetOwnedMediaAsset({ ownerUid, id: assetId });
    return result.data.mediaAsset ? mapAsset(result.data.mediaAsset) : null;
  }

  async commitReady(ownerUid: string, assetId: string, etag: string | undefined, association: MediaAssociation): Promise<MediaAssetRecord> {
    const result = await adminCommitMediaAssetReady({
      id: assetId,
      ownerUid,
      etag,
      targetKind: association.targetKind,
      targetKey: association.targetKey,
      purpose: association.purpose,
      storyId: association.storyId,
      chapterId: association.chapterId,
      entityId: association.entityId,
    });
    if (!result.data.assetReady) throw new Error('SQL Connect did not finalize the media asset.');
    const saved = await this.getOwned(ownerUid, assetId);
    if (!saved || saved.status !== 'READY') throw new Error('SQL Connect returned without a ready media asset.');
    return saved;
  }

  async commitReplacement(ownerUid: string, assetId: string, previous: MediaAssetRecord, etag: string | undefined, association: MediaAssociation, cleanupAfter: string): Promise<MediaAssetRecord> {
    const result = await adminCommitMediaAssetReplacement({
      id: assetId,
      ownerUid,
      replacesAssetId: previous.id,
      replacesBucket: previous.bucket,
      replacesObjectKey: previous.objectKey,
      etag,
      targetKind: association.targetKind,
      targetKey: association.targetKey,
      purpose: association.purpose,
      storyId: association.storyId,
      chapterId: association.chapterId,
      entityId: association.entityId,
      cleanupAfter,
    });
    if (!result.data.replacementReady || !result.data.archivedPrevious || result.data.mediaAttachment_updateMany !== 1) {
      throw new Error('SQL Connect did not atomically commit exactly one replacement slot.');
    }
    const saved = await this.getOwned(ownerUid, assetId);
    if (!saved || saved.status !== 'READY') throw new Error('SQL Connect returned without a ready replacement asset.');
    return saved;
  }

  async markFailed(ownerUid: string, assetId: string, code: string, message: string): Promise<void> {
    const result = await adminMarkMediaAssetFailed({ id: assetId, ownerUid, failureCode: code, failureMessage: message });
    if (!result.data.mediaAsset_update) throw new Error('Unable to mark media asset failed.');
  }

  async markPendingCleanup(ownerUid: string, assetId: string, bucket: string, objectKey: string, reason: string, message?: string): Promise<string> {
    const result = await adminMarkMediaAssetPendingCleanup({ id: assetId, ownerUid, bucket, objectKey, reason, failureMessage: message });
    return result.data.mediaCleanupTask_insert.id;
  }

  async requestDeletion(ownerUid: string, assetId: string, bucket: string, objectKey: string): Promise<string> {
    const result = await adminRequestMediaAssetDeletion({ id: assetId, ownerUid, bucket, objectKey });
    if (!result.data.mediaAsset_update) throw new Error('Unable to mark media asset pending cleanup.');
    return result.data.mediaCleanupTask_insert.id;
  }

  async listStaleUploads(staleBefore: string, limit = 100): Promise<MediaAssetRecord[]> {
    const result = await adminListStaleMediaUploads({ staleBefore, limit });
    return result.data.mediaAssets.map(mapAsset);
  }

  async listCleanupTasks(limit = 100): Promise<MediaCleanupTask[]> {
    const result = await adminListMediaCleanupTasks({ limit });
    return result.data.mediaCleanupTasks;
  }

  async completeCleanup(taskId: string, assetId: string): Promise<void> {
    const result = await adminCompleteMediaCleanup({ taskId, assetId });
    if (!result.data.mediaCleanupTask_update || !result.data.mediaAsset_update) throw new Error('Unable to complete media cleanup record.');
  }

  async failCleanup(taskId: string, message: string, nextAttemptAt: string): Promise<void> {
    const result = await adminFailMediaCleanup({ taskId, lastError: message, nextAttemptAt });
    if (!result.data.mediaCleanupTask_update) throw new Error('Unable to record media cleanup failure.');
  }

  async listStorageUsage(limit = 100_000): Promise<StorageUsageRow[]> {
    const pageSize = Math.min(500, Math.max(1, limit));
    const rows: StorageUsageRow[] = [];
    while (rows.length < limit) {
      const result = await adminListMediaAssetsForStorageReport({
        limit: Math.min(pageSize, limit - rows.length),
        offset: rows.length,
      });
      rows.push(...result.data.mediaAssets);
      if (result.data.mediaAssets.length < pageSize) break;
    }
    return rows;
  }
}
