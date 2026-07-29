import { setTimeout as delay } from 'node:timers/promises';
import {
  adminAdvanceStoryDeletionJob,
  adminClaimMediaCleanupTask,
  adminClaimStoryDeletionJob,
  adminCommitAccountMediaAsset,
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
  adminListExpiredStoryTombstones,
  adminListStoryDeletionMediaCandidates,
  adminPurgeExpiredStoryTombstone,
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

function canonicalUuid(value: string): string;
function canonicalUuid(value: null): null;
function canonicalUuid(value: undefined): undefined;
function canonicalUuid(value: string | null | undefined): string | null | undefined {
  if (typeof value !== 'string') return value;
  const compact = value.replace(/-/g, '');
  if (!/^[0-9a-f]{32}$/i.test(compact)) return value;
  return [
    compact.slice(0, 8),
    compact.slice(8, 12),
    compact.slice(12, 16),
    compact.slice(16, 20),
    compact.slice(20),
  ].join('-');
}

function mapAsset(value: NonNullable<Awaited<ReturnType<typeof adminGetOwnedMediaAsset>>['data']['mediaAsset']>): MediaAssetRecord {
  return {
    ...value,
    id: canonicalUuid(value.id),
    storyId: value.storyId ? canonicalUuid(value.storyId) : value.storyId,
    generationJobId: value.generationJobId ? canonicalUuid(value.generationJobId) : value.generationJobId,
    replacesAssetId: value.replacesAssetId ? canonicalUuid(value.replacesAssetId) : value.replacesAssetId,
    assetType: value.assetType,
    visibility: value.visibility,
    status: value.status,
  };
}

function sameUuidValue(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  if (!left || !right) return (left ?? null) === (right ?? null);
  return canonicalUuid(left).toLowerCase() === canonicalUuid(right).toLowerCase();
}

function matchesAssociationScope(
  value: { storyId?: string | null; chapterId?: string | null; entityId?: string | null },
  association: MediaAssociation,
): boolean {
  return sameUuidValue(value.storyId, association.storyId)
    && sameUuidValue(value.chapterId, association.chapterId)
    && sameUuidValue(value.entityId, association.entityId);
}

function mapSlot(slot: MediaSlotState): MediaSlotState {
  const relationalTarget = Boolean(slot.storyId || slot.chapterId || slot.entityId);
  return {
    ...slot,
    storyId: canonicalUuid(slot.storyId),
    chapterId: canonicalUuid(slot.chapterId),
    entityId: canonicalUuid(slot.entityId),
    targetKey: relationalTarget ? canonicalUuid(slot.targetKey) : slot.targetKey,
    currentAssetId: canonicalUuid(slot.currentAssetId),
  };
}

function mapHistoryEntry(entry: MediaSlotHistoryEntry): MediaSlotHistoryEntry {
  return {
    ...entry,
    id: canonicalUuid(entry.id),
    assetId: canonicalUuid(entry.assetId),
    storyId: canonicalUuid(entry.storyId),
    chapterId: canonicalUuid(entry.chapterId),
    entityId: canonicalUuid(entry.entityId),
  };
}

function isRetryableDataConnectQueryError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const candidate = error as Error & { code?: string; errorInfo?: { code?: string } };
  return candidate.code === 'data-connect/query-error'
    || candidate.errorInfo?.code === 'data-connect/query-error'
    || error.message.includes('Invalid SQL statement');
}

const POST_WRITE_RETRY_DELAYS_MS = [0, 100, 300, 750, 1_500, 3_000, 5_000] as const;

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
    const storyId = canonicalUuid(association.storyId);
    const story = await adminGetOwnedStoryScope({ ownerUid, storyId });
    if (!story.data.story) throw new Error('Story media target is not owned by the authenticated user.');
    if (association.chapterId) {
      const chapterId = canonicalUuid(association.chapterId);
      const chapter = await adminGetOwnedChapterScope({ ownerUid, chapterId });
      if (!chapter.data.chapter || !sameUuidValue(chapter.data.chapter.storyId, storyId)) {
        throw new Error('Chapter media target is not in the owned story.');
      }
    }
    if (association.entityId) {
      const entityId = canonicalUuid(association.entityId);
      const entity = await adminGetOwnedEntityScope({ ownerUid, entityId });
      if (!entity.data.codexEntity || !sameUuidValue(entity.data.codexEntity.storyId, storyId)) {
        throw new Error('Codex media target is not in the owned story.');
      }
    }
  }

  async assertGenerationJobOwned(ownerUid: string, generationJobId: string, storyId?: string | null): Promise<void> {
    const result = await adminGetOwnedGenerationJobScope({
      ownerUid,
      generationJobId: canonicalUuid(generationJobId),
    });
    const job = result.data.generationJob;
    if (!job) throw new Error('Generation job is not owned by the authenticated user.');
    if (job.storyId && !sameUuidValue(job.storyId, storyId)) {
      throw new Error('Generation job is not owned by the requested story scope.');
    }
  }

  async getUploadReceipt(ownerUid: string, idempotencyKey: string): Promise<MediaUploadReceipt | null> {
    const result = await adminGetMediaUploadReceipt({ ownerUid, idempotencyKey });
    const receipt = result.data.mediaUploadReceipt;
    if (!receipt) return null;
    return {
      assetId: canonicalUuid(receipt.assetId),
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
    return mapSlot(slot);
  }

  async listOwnedSlotHistory(ownerUid: string, association: MediaAssociation, limit = 200): Promise<MediaSlotHistoryEntry[]> {
    const result = await adminListOwnedMediaSlotHistory({
      ownerUid,
      targetKind: association.targetKind,
      targetKey: association.targetKey,
      purpose: association.purpose,
      limit,
    });
    return result.data.mediaAttachments.map(mapHistoryEntry);
  }

  async getOwnedQuotaReservation(ownerUid: string, idempotencyKey: string): Promise<MediaQuotaReservationState | null> {
    const result = await adminGetOwnedStorageQuotaReservation({ ownerUid, idempotencyKey });
    const reservation = result.data.storageQuotaReservation;
    if (!reservation) return null;
    return {
      id: canonicalUuid(reservation.id),
      ownerUid: reservation.ownerUid,
      storyId: canonicalUuid(reservation.storyId),
      assetId: canonicalUuid(reservation.assetId),
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
      // Data Connect nullable variables must be explicit. Omitting storyId as
      // JavaScript undefined makes the generated operation produce an invalid
      // SQL statement for account-scoped slots such as profile portraits.
      storyId: reservation.storyId ?? null,
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
    const result = await adminReserveMediaAssetIdempotent({
      id: reservation.id,
      ownerUid: owner.uid,
      storyId: reservation.storyId ?? null,
      generationJobId: reservation.generationJobId ?? null,
      replacesAssetId: reservation.replacesAssetId ?? null,
      quotaReservationId: reservation.quotaReservationId,
      idempotencyKey: reservation.idempotencyKey,
      requestHash: reservation.requestHash,
      assetType: reservation.assetType as SqlMediaAssetType,
      purpose: reservation.purpose,
      visibility: reservation.visibility as SqlMediaVisibility,
      bucket: reservation.bucket,
      objectKey: reservation.objectKey,
      originalFilename: reservation.originalFilename ?? null,
      mimeType: reservation.mimeType,
      extension: reservation.extension,
      byteSize: reservation.byteSize,
      checksumSha256: reservation.checksumSha256,
      width: reservation.width ?? null,
      height: reservation.height ?? null,
      durationMs: reservation.durationMs ?? null,
      version: reservation.version,
      cacheControl: reservation.cacheControl,
      sourceKind: reservation.sourceKind,
    });
    if (!result.data.mediaAsset_insert
      || !result.data.storageQuotaReservation_update
      || !result.data.mediaUploadAttempt_insert
      || !result.data.mediaUploadReceipt_insert) {
      throw new Error('SQL Connect did not atomically reserve the media upload.');
    }
    // The service only needs confirmation that this transaction committed.
    // Returning the just-committed reservation avoids treating a stale
    // immediate query as a failed transaction and abandoning a valid upload.
    const {
      sourceKind: _sourceKind,
      quotaReservationId: _quotaReservationId,
      idempotencyKey: _idempotencyKey,
      requestHash: _requestHash,
      ...record
    } = reservation;
    const committedAt = new Date().toISOString();
    return {
      ...record,
      status: 'UPLOADING',
      createdAt: committedAt,
      updatedAt: committedAt,
    };
  }

  async getOwned(ownerUid: string, assetId: string): Promise<MediaAssetRecord | null> {
    const result = await adminGetOwnedMediaAsset({ ownerUid, id: assetId });
    return result.data.mediaAsset ? mapAsset(result.data.mediaAsset) : null;
  }

  private async getOwnedAfterWrite(
    ownerUid: string,
    assetId: string,
  ): Promise<MediaAssetRecord | null> {
    for (const delayMs of [0, 100, 300, 750]) {
      if (delayMs > 0) await delay(delayMs);
      const asset = await this.getOwned(ownerUid, assetId);
      if (asset) return asset;
    }
    return null;
  }

  async commitToSlot(ownerUid: string, assetId: string, etag: string | undefined, commit: MediaSlotCommit): Promise<MediaAssetRecord> {
    const association = commit.association;
    if (!association.storyId) {
      const variables = {
        id: assetId,
        ownerUid,
        quotaReservationId: commit.quotaReservationId,
        idempotencyKey: commit.idempotencyKey,
        etag: etag ?? null,
        requestedBytes: commit.requestedBytes,
      };
      let result: Awaited<ReturnType<typeof adminCommitAccountMediaAsset>> | undefined;
      let lastError: unknown;
      for (const delayMs of POST_WRITE_RETRY_DELAYS_MS) {
        if (delayMs > 0) await delay(delayMs);
        try {
          result = await adminCommitAccountMediaAsset(variables);
          break;
        } catch (error) {
          lastError = error;
          if (!isRetryableDataConnectQueryError(error)) throw error;
          const existing = await this.getOwned(ownerUid, assetId).catch(() => null);
          if (existing?.status === 'READY') return existing;
        }
      }
      if (!result) throw lastError;
      if (!result.data.mediaAsset_update
        || !result.data.mediaUploadReceipt_update
        || result.data.mediaUploadAttempt_updateMany !== 1
        || !result.data.committedReservation
        || !result.data.committedQuota) {
        throw new Error('SQL Connect did not atomically commit the account media asset.');
      }
      const saved = await this.getOwnedAfterWrite(ownerUid, assetId);
      if (!saved || saved.status !== 'READY') throw new Error('SQL Connect returned without a ready account media asset.');
      return saved;
    }
    const variables = {
      id: assetId,
      ownerUid,
      quotaReservationId: commit.quotaReservationId,
      idempotencyKey: commit.idempotencyKey,
      etag: etag ?? null,
      storyId: association.storyId ?? null,
      chapterId: association.chapterId ?? null,
      entityId: association.entityId ?? null,
      targetKind: association.targetKind,
      targetKey: association.targetKey,
      purpose: association.purpose,
      attachmentId: commit.attachmentId,
      historyEntityType: association.entityType ?? null,
      clientHistoryId: association.clientHistoryId ?? association.legacyMediaId ?? null,
      promptUsed: association.promptUsed ?? null,
      chapterNumber: association.chapterNumber ?? null,
      arcTitle: association.arcTitle ?? null,
      label: association.label ?? null,
      position: commit.position,
      requestedBytes: commit.requestedBytes,
      expectedCurrentAssetId: commit.expectedCurrentAssetId ?? null,
      expectedSlotVersion: commit.expectedSlotVersion ?? null,
      newSlotVersion: commit.newSlotVersion,
    };
    let result: Awaited<ReturnType<typeof adminCommitMediaAssetToSlot>> | undefined;
    let lastError: unknown;
    for (const delayMs of POST_WRITE_RETRY_DELAYS_MS) {
      if (delayMs > 0) await delay(delayMs);
      try {
        result = await adminCommitMediaAssetToSlot(variables);
        break;
      } catch (error) {
        lastError = error;
        if (!isRetryableDataConnectQueryError(error)) throw error;
        // The transaction may have committed even if its response was lost.
        // Returning an already-ready asset keeps this retry idempotent.
        const existing = await this.getOwned(ownerUid, assetId).catch(() => null);
        if (existing?.status === 'READY') return existing;
      }
    }
    if (!result) throw lastError;
    const expectedCurrentUpdates = commit.expectedCurrentAssetId ? 1 : 0;
    if (!result.data.mediaAsset_update
      || !result.data.mediaSlot_upsert
      || !result.data.mediaUploadReceipt_update
      || result.data.mediaAttachment_updateMany !== expectedCurrentUpdates
      || result.data.mediaUploadAttempt_updateMany !== 1
      || !result.data.committedReservation
      || !result.data.storyUsage
      || !result.data.committedQuota) {
      throw new Error('SQL Connect did not atomically commit the media asset and exactly one current slot.');
    }
    const saved = await this.getOwnedAfterWrite(ownerUid, assetId);
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
    const canonicalAsset = canonicalUuid(assetId);
    const matches = history.filter(
      entry => sameUuidValue(entry.assetId, canonicalAsset)
        && matchesAssociationScope(entry, association),
    );
    if (matches.length !== 1) throw new Error('The selected asset is not a unique member of this owned media slot history.');
    const newSlotVersion = (BigInt(expectedSlot.version) + 1n).toString();
    const result = await adminSelectOwnedMediaSlotAsset({
      assetId: canonicalAsset,
      ownerUid,
      storyId: association.storyId ?? null,
      chapterId: association.chapterId ?? null,
      entityId: association.entityId ?? null,
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
    const saved = await this.getOwned(ownerUid, canonicalAsset);
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

  async listExpiredStoryTombstones(
    completedBefore: string,
    limit = 100,
  ): Promise<StoryDeletionJobState[]> {
    const result = await adminListExpiredStoryTombstones({ completedBefore, limit });
    return result.data.storyDeletionJobs;
  }

  async purgeExpiredStoryTombstone(
    jobId: string,
    storyId: string,
    completedBefore: string,
  ): Promise<void> {
    const result = await adminPurgeExpiredStoryTombstone({ jobId, storyId, completedBefore });
    if (!result.data.eligibleTombstone || !result.data.story_delete) {
      throw new Error('SQL Connect did not purge the expired story tombstone.');
    }
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
