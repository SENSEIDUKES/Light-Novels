import {
  adminAdvanceStoryDeletionJob,
  adminClaimMediaCleanupTask,
  adminClaimStoryDeletionJob,
  adminCommitMediaAssetToSlot,
  adminCompleteMediaCleanup,
  adminCompleteMediaDeletionIntent,
  adminCompleteStoryDeletionJob,
  adminEnsureMediaDeletionIntent,
  adminFailMediaCleanup,
  adminFailMediaDeletionIntent,
  adminFailStoryDeletionJob,
  adminGetMediaDeletionIntent,
  adminGetMediaUploadReceipt,
  adminGetOwnedMediaAsset,
  adminGetOwnedMediaSlot,
  adminGetOwnedStorageQuotaReservation,
  adminGetOwnedGenerationJobScope,
  adminGetOwnedStoryScope,
  adminGetOwnedChapterScope,
  adminGetOwnedEntityScope,
  adminListMediaAssetsForStorageReport,
  adminListMediaCleanupTasks,
  adminListOwnedMediaSlotHistory,
  adminListStaleMediaUploads,
  adminListStoryDeletionJobs,
  adminListStoryDeletionMediaCandidates,
  adminMarkMediaAssetFailed,
  adminMarkMediaAssetPendingCleanup,
  adminReleaseStorageQuotaReservation,
  adminRequestMediaAssetDeletion,
  adminReserveMediaAssetIdempotent,
  adminReserveStorageQuota,
  adminSelectOwnedMediaSlotAsset,
  MediaAssetType as SqlMediaAssetType,
  MediaVisibility as SqlMediaVisibility,
  StoryDeletionStageKind,
} from '../../generated/dataconnect-admin';
import type {
  MediaAssetRecord,
  MediaAssociation,
  MediaOwner,
  StorageUsageRow,
} from '../../contracts/mediaAssets';
import { getFirebaseAdminApp } from '../firebaseAdmin';
import type {
  MediaAssetRepository,
  MediaAssetReservation,
  MediaCleanupWorkItem,
  MediaDeletionIntentRequest,
  MediaDeletionIntentState,
  MediaQuotaReservation,
  MediaQuotaReservationState,
  MediaSlotCommit,
  MediaSlotState,
  MediaUploadReceipt,
  MediaSlotHistoryEntry,
  StoryDeletionJobState,
  StoryDeletionMediaCandidate,
  StoryDeletionStage,
} from './mediaAssetRepository';
import { validateMediaReservation } from './mediaAssetRepository';

function mapAsset(value: NonNullable<Awaited<ReturnType<typeof adminGetOwnedMediaAsset>>['data']['mediaAsset']>): MediaAssetRecord {
  return {
    ...value,
    assetType: value.assetType,
    visibility: value.visibility,
    status: value.status,
  };
}

function matchesAssociationScope(
  value: { storyId?: string | null; chapterId?: string | null; entityId?: string | null },
  association: MediaAssociation,
): boolean {
  return (value.storyId ?? null) === (association.storyId ?? null)
    && (value.chapterId ?? null) === (association.chapterId ?? null)
    && (value.entityId ?? null) === (association.entityId ?? null);
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

  async getUploadReceipt(ownerUid: string, idempotencyKey: string): Promise<MediaUploadReceipt | null> {
    const result = await adminGetMediaUploadReceipt({ ownerUid, idempotencyKey });
    const receipt = result.data.mediaUploadReceipt;
    if (!receipt) return null;
    return {
      assetId: receipt.assetId,
      requestHash: receipt.requestHash,
      status: receipt.status,
      createdAt: receipt.createdAt,
      updatedAt: receipt.updatedAt,
    };
  }

  async getOwnedSlot(ownerUid: string, association: MediaAssociation): Promise<MediaSlotState | null> {
    const result = await adminGetOwnedMediaSlot({
      ownerUid,
      targetKind: association.targetKind,
      targetKey: association.targetKey,
      purpose: association.purpose,
    });
    const slot = result.data.mediaSlot;
    if (!slot) return null;
    if (!matchesAssociationScope(slot, association)) {
      throw new Error('The media slot relational scope does not match the requested association.');
    }
    return slot;
  }

  async listOwnedSlotHistory(ownerUid: string, association: MediaAssociation, limit = 200): Promise<MediaSlotHistoryEntry[]> {
    const result = await adminListOwnedMediaSlotHistory({
      ownerUid,
      targetKind: association.targetKind,
      targetKey: association.targetKey,
      purpose: association.purpose,
      limit,
    });
    return result.data.mediaAttachments;
  }

  async getOwnedQuotaReservation(ownerUid: string, idempotencyKey: string): Promise<MediaQuotaReservationState | null> {
    const result = await adminGetOwnedStorageQuotaReservation({ ownerUid, idempotencyKey });
    const reservation = result.data.storageQuotaReservation;
    if (!reservation) return null;
    return {
      id: reservation.id,
      ownerUid: reservation.ownerUid,
      storyId: reservation.storyId,
      assetId: reservation.assetId,
      idempotencyKey: reservation.idempotencyKey,
      requestedBytes: reservation.requestedBytes,
      status: reservation.status,
      expiresAt: reservation.expiresAt,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt,
      completedAt: reservation.completedAt,
    };
  }

  async reserveQuota(ownerUid: string, reservation: MediaQuotaReservation): Promise<void> {
    const result = await adminReserveStorageQuota({
      reservationId: reservation.id,
      ownerUid,
      storyId: reservation.storyId,
      idempotencyKey: reservation.idempotencyKey,
      requestedBytes: reservation.requestedBytes,
      hardLimitBytes: reservation.hardLimitBytes,
      expiresAt: reservation.expiresAt,
    });
    if (!result.data.storageQuotaReservation_insert) {
      throw new Error('SQL Connect did not reserve storage quota.');
    }
  }

  async releaseQuota(ownerUid: string, reservationId: string): Promise<void> {
    const result = await adminReleaseStorageQuotaReservation({ reservationId, ownerUid });
    if (result.data.released !== 1) throw new Error('SQL Connect did not release storage quota.');
  }

  async reserve(owner: MediaOwner, reservation: MediaAssetReservation): Promise<MediaAssetRecord> {
    validateMediaReservation(reservation);
    if (owner.uid !== reservation.ownerUid) throw new Error('Media reservation owner mismatch.');
    await adminReserveMediaAssetIdempotent({
      id: reservation.id,
      ownerUid: owner.uid,
      storyId: reservation.storyId,
      generationJobId: reservation.generationJobId,
      replacesAssetId: reservation.replacesAssetId,
      quotaReservationId: reservation.quotaReservationId,
      idempotencyKey: reservation.idempotencyKey,
      requestHash: reservation.requestHash,
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

  async commitToSlot(ownerUid: string, assetId: string, etag: string | undefined, commit: MediaSlotCommit): Promise<MediaAssetRecord> {
    const association = commit.association;
    const result = await adminCommitMediaAssetToSlot({
      id: assetId,
      ownerUid,
      quotaReservationId: commit.quotaReservationId,
      idempotencyKey: commit.idempotencyKey,
      etag,
      storyId: association.storyId,
      chapterId: association.chapterId,
      entityId: association.entityId,
      targetKind: association.targetKind,
      targetKey: association.targetKey,
      purpose: association.purpose,
      attachmentId: commit.attachmentId,
      historyEntityType: association.entityType,
      clientHistoryId: association.clientHistoryId ?? association.legacyMediaId,
      promptUsed: association.promptUsed,
      chapterNumber: association.chapterNumber,
      arcTitle: association.arcTitle,
      label: association.label,
      position: commit.position,
      expectedCurrentAssetId: commit.expectedCurrentAssetId,
      expectedSlotVersion: commit.expectedSlotVersion,
      newSlotVersion: commit.newSlotVersion,
    });
    const expectedCurrentUpdates = commit.expectedCurrentAssetId ? 1 : 0;
    if (!result.data.mediaAsset_update
      || !result.data.mediaSlot_upsert
      || !result.data.mediaUploadReceipt_update
      || result.data.mediaAttachment_updateMany !== expectedCurrentUpdates
      || result.data.mediaUploadAttempt_updateMany !== 1
      || result.data.committedQuota !== 1) {
      throw new Error('SQL Connect did not atomically commit the media asset and exactly one current slot.');
    }
    const saved = await this.getOwned(ownerUid, assetId);
    if (!saved || saved.status !== 'READY') throw new Error('SQL Connect returned without a ready media asset.');
    return saved;
  }

  async selectOwnedSlotAsset(
    ownerUid: string,
    assetId: string,
    association: MediaAssociation,
    expectedSlot: MediaSlotState,
  ): Promise<MediaAssetRecord> {
    const history = await this.listOwnedSlotHistory(ownerUid, association);
    const matches = history.filter((entry) => entry.assetId === assetId && matchesAssociationScope(entry, association));
    if (matches.length !== 1) throw new Error('The selected asset is not a unique member of this owned media slot history.');
    const newSlotVersion = (BigInt(expectedSlot.version) + 1n).toString();
    const result = await adminSelectOwnedMediaSlotAsset({
      assetId,
      ownerUid,
      storyId: association.storyId,
      chapterId: association.chapterId,
      entityId: association.entityId,
      targetKind: association.targetKind,
      targetKey: association.targetKey,
      purpose: association.purpose,
      attachmentId: matches[0].id,
      expectedCurrentAssetId: expectedSlot.currentAssetId,
      expectedSlotVersion: expectedSlot.version,
      newSlotVersion,
    });
    if (!result.data.mediaAttachment_update
      || !result.data.mediaSlot_update
      || result.data.mediaAttachment_updateMany !== 1) {
      throw new Error('SQL Connect did not atomically select exactly one current history asset.');
    }
    const saved = await this.getOwned(ownerUid, assetId);
    if (!saved || saved.status !== 'READY') throw new Error('SQL Connect returned without the selected ready media asset.');
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

  async requestUncommittedDeletion(ownerUid: string, assetId: string, bucket: string, objectKey: string): Promise<string> {
    const result = await adminRequestMediaAssetDeletion({ id: assetId, ownerUid, bucket, objectKey });
    if (!result.data.mediaAsset_update) throw new Error('Unable to mark media asset pending cleanup.');
    return result.data.mediaCleanupTask_insert.id;
  }

  async getDeletionIntent(ownerUid: string, idempotencyKey: string): Promise<MediaDeletionIntentState | null> {
    const result = await adminGetMediaDeletionIntent({ ownerUid, idempotencyKey });
    return result.data.mediaDeletionIntent ?? null;
  }

  async ensureDeletionIntent(request: MediaDeletionIntentRequest): Promise<void> {
    const result = await adminEnsureMediaDeletionIntent(request);
    if (!result.data.mediaAsset_update
      || !result.data.mediaDeletionIntent_upsert
      || !result.data.mediaCleanupTask_upsert) {
      throw new Error('SQL Connect did not atomically create the media deletion intent.');
    }
  }

  async claimDeletionCleanupTask(
    task: MediaCleanupWorkItem,
    leaseOwner: string,
    leaseExpiresAt: string,
  ): Promise<void> {
    if (!task.assetId || !task.idempotencyKey) throw new Error('Deletion cleanup task is missing its intent identity.');
    const result = await adminClaimMediaCleanupTask({
      taskId: task.id,
      assetId: task.assetId,
      ownerUid: task.ownerUid,
      idempotencyKey: task.idempotencyKey,
      leaseOwner,
      leaseExpiresAt,
    });
    if (!result.data.mediaCleanupTask_update || !result.data.mediaDeletionIntent_update) {
      throw new Error('SQL Connect did not claim the media cleanup task.');
    }
  }

  async completeDeletionIntent(task: MediaCleanupWorkItem, leaseOwner: string): Promise<void> {
    if (!task.assetId || !task.idempotencyKey) throw new Error('Deletion cleanup task is missing its intent identity.');
    const result = await adminCompleteMediaDeletionIntent({
      taskId: task.id,
      assetId: task.assetId,
      ownerUid: task.ownerUid,
      idempotencyKey: task.idempotencyKey,
      leaseOwner,
    });
    if (result.data.completed !== 1) {
      throw new Error('SQL Connect did not complete the deletion intent and quota release exactly once.');
    }
  }

  async failDeletionIntent(
    task: MediaCleanupWorkItem,
    leaseOwner: string,
    message: string,
    nextAttemptAt: string,
  ): Promise<void> {
    if (!task.idempotencyKey) throw new Error('Deletion cleanup task is missing its intent identity.');
    const result = await adminFailMediaDeletionIntent({
      taskId: task.id,
      ownerUid: task.ownerUid,
      idempotencyKey: task.idempotencyKey,
      leaseOwner,
      lastError: message,
      nextAttemptAt,
    });
    if (!result.data.mediaCleanupTask_update || !result.data.mediaDeletionIntent_update) {
      throw new Error('SQL Connect did not record the deletion cleanup failure.');
    }
  }

  async listStaleUploads(staleBefore: string, limit = 100): Promise<MediaAssetRecord[]> {
    const result = await adminListStaleMediaUploads({ staleBefore, limit });
    return result.data.mediaAssets.map(mapAsset);
  }

  async listCleanupTasks(limit = 100): Promise<MediaCleanupWorkItem[]> {
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

  async listStoryDeletionJobs(limit = 100): Promise<StoryDeletionJobState[]> {
    const result = await adminListStoryDeletionJobs({ limit });
    return result.data.storyDeletionJobs;
  }

  async claimStoryDeletionJob(
    job: StoryDeletionJobState,
    leaseOwner: string,
    leaseExpiresAt: string,
  ): Promise<void> {
    const result = await adminClaimStoryDeletionJob({
      jobId: job.id,
      leaseOwner,
      leaseExpiresAt,
      stage: job.currentStage as StoryDeletionStageKind,
    });
    if (!result.data.storyDeletionJob_update || !result.data.storyDeletionStage_update) {
      throw new Error('SQL Connect did not claim the story deletion job.');
    }
  }

  async advanceStoryDeletionJob(
    jobId: string,
    leaseOwner: string,
    completedStage: StoryDeletionStage,
    nextStage: StoryDeletionStage,
  ): Promise<void> {
    const result = await adminAdvanceStoryDeletionJob({
      jobId,
      leaseOwner,
      completedStage: completedStage as StoryDeletionStageKind,
      nextStage: nextStage as StoryDeletionStageKind,
    });
    if (!result.data.storyDeletionJob_update || !result.data.storyDeletionStage_update) {
      throw new Error('SQL Connect did not advance the story deletion job.');
    }
  }

  async failStoryDeletionJob(
    jobId: string,
    leaseOwner: string,
    stage: StoryDeletionStage,
    message: string,
  ): Promise<void> {
    const result = await adminFailStoryDeletionJob({
      jobId,
      leaseOwner,
      stage: stage as StoryDeletionStageKind,
      lastError: message,
    });
    if (!result.data.storyDeletionJob_update || !result.data.storyDeletionStage_update) {
      throw new Error('SQL Connect did not release the failed story deletion job.');
    }
  }

  async completeStoryDeletionJob(jobId: string, leaseOwner: string): Promise<void> {
    const result = await adminCompleteStoryDeletionJob({ jobId, leaseOwner });
    if (!result.data.storyDeletionJob_update || !result.data.storyDeletionStage_update) {
      throw new Error('SQL Connect did not complete the story deletion job.');
    }
  }

  async listStoryDeletionMediaCandidates(
    ownerUid: string,
    storyId: string,
    limit = 500,
  ): Promise<StoryDeletionMediaCandidate[]> {
    const result = await adminListStoryDeletionMediaCandidates({ ownerUid, storyId, limit });
    return result.data.mediaAssets.map((asset) => ({
      id: asset.id,
      ownerUid: asset.ownerUid,
      storyId: asset.storyId,
      status: asset.status,
      bucket: asset.bucket,
      objectKey: asset.objectKey,
    }));
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
