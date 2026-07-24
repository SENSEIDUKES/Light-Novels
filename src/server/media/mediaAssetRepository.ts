import type {
  MediaAssetRecord,
  MediaAssociation,
  MediaCleanupTask,
  MediaOwner,
  StorageUsageRow,
} from '../../contracts/mediaAssets';
import { assertPermanentMediaMetadata } from './permanentMediaGuard';

export interface MediaAssetReservation extends Omit<MediaAssetRecord,
  'status' | 'createdAt' | 'updatedAt' | 'readyAt' | 'archivedAt' | 'deletedAt' | 'cleanupAfter' | 'etag' | 'failureCode' | 'failureMessage'> {
  status?: 'UPLOADING';
  sourceKind: string;
  quotaReservationId: string;
  idempotencyKey: string;
  requestHash: string;
}

export interface MediaUploadReceipt {
  assetId: string;
  requestHash: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface MediaSlotState {
  ownerUid: string;
  storyId?: string | null;
  chapterId?: string | null;
  entityId?: string | null;
  targetKind: string;
  targetKey: string;
  purpose: string;
  currentAssetId: string;
  version: string;
  updatedAt: string;
}

export interface MediaSlotHistoryEntry {
  id: string;
  assetId: string;
  storyId?: string | null;
  chapterId?: string | null;
  entityId?: string | null;
  historyEntityType?: string | null;
  clientHistoryId?: string | null;
  promptUsed?: string | null;
  chapterNumber?: number | null;
  arcTitle?: string | null;
  label?: string | null;
  position: number;
  isCurrent: boolean;
  createdAt: string;
  endedAt?: string | null;
}

export interface MediaQuotaReservation {
  id: string;
  storyId?: string | null;
  idempotencyKey: string;
  requestedBytes: string;
  hardLimitBytes: string;
  expiresAt: string;
}

export interface MediaQuotaReservationState {
  id: string;
  ownerUid: string;
  storyId?: string | null;
  assetId?: string | null;
  idempotencyKey: string;
  requestedBytes: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface MediaSlotCommit {
  quotaReservationId: string;
  idempotencyKey: string;
  association: MediaAssociation;
  attachmentId: string;
  position: number;
  expectedCurrentAssetId?: string | null;
  expectedSlotVersion?: string | null;
  newSlotVersion: string;
}

export interface MediaDeletionIntentState {
  ownerUid: string;
  idempotencyKey: string;
  assetId: string;
  storyId?: string | null;
  reason: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  lastError?: string | null;
}

export interface MediaDeletionIntentRequest {
  taskId: string;
  ownerUid: string;
  assetId: string;
  storyId?: string | null;
  idempotencyKey: string;
  bucket: string;
  objectKey: string;
  reason: string;
}

export interface MediaCleanupWorkItem extends MediaCleanupTask {
  idempotencyKey?: string | null;
  leaseOwner?: string | null;
  leaseExpiresAt?: string | null;
}

export type StoryDeletionStage = 'TOMBSTONE' | 'STRUCTURED_DATA' | 'MEDIA' | 'LOCAL_CACHE' | 'FINALIZE';

export interface StoryDeletionJobState {
  id: string;
  ownerUid: string;
  storyId: string;
  idempotencyKey: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  currentStage: StoryDeletionStage;
  leaseOwner?: string | null;
  leaseExpiresAt?: string | null;
  attemptCount: number;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface StoryDeletionMediaCandidate {
  id: string;
  ownerUid: string;
  storyId?: string | null;
  status: MediaAssetRecord['status'];
  bucket: string;
  objectKey: string;
}

export interface MediaAssetRepository {
  assertAssociationOwned(ownerUid: string, association: MediaAssociation): Promise<void>;
  assertGenerationJobOwned(ownerUid: string, generationJobId: string, storyId?: string | null): Promise<void>;
  getUploadReceipt(ownerUid: string, idempotencyKey: string): Promise<MediaUploadReceipt | null>;
  getOwnedSlot(ownerUid: string, association: MediaAssociation): Promise<MediaSlotState | null>;
  listOwnedSlotHistory(ownerUid: string, association: MediaAssociation, limit?: number): Promise<MediaSlotHistoryEntry[]>;
  getOwnedQuotaReservation(ownerUid: string, idempotencyKey: string): Promise<MediaQuotaReservationState | null>;
  reserveQuota(ownerUid: string, reservation: MediaQuotaReservation): Promise<void>;
  releaseQuota(ownerUid: string, reservationId: string): Promise<void>;
  reserve(owner: MediaOwner, reservation: MediaAssetReservation): Promise<MediaAssetRecord>;
  getOwned(ownerUid: string, assetId: string): Promise<MediaAssetRecord | null>;
  commitToSlot(ownerUid: string, assetId: string, etag: string | undefined, commit: MediaSlotCommit): Promise<MediaAssetRecord>;
  selectOwnedSlotAsset(ownerUid: string, assetId: string, association: MediaAssociation, expectedSlot: MediaSlotState): Promise<MediaAssetRecord>;
  markFailed(ownerUid: string, assetId: string, code: string, message: string): Promise<void>;
  markPendingCleanup(ownerUid: string, assetId: string, bucket: string, objectKey: string, reason: string, message?: string): Promise<string>;
  requestUncommittedDeletion(ownerUid: string, assetId: string, bucket: string, objectKey: string): Promise<string>;
  getDeletionIntent(ownerUid: string, idempotencyKey: string): Promise<MediaDeletionIntentState | null>;
  ensureDeletionIntent(request: MediaDeletionIntentRequest): Promise<void>;
  claimDeletionCleanupTask(task: MediaCleanupWorkItem, leaseOwner: string, leaseExpiresAt: string): Promise<void>;
  completeDeletionIntent(task: MediaCleanupWorkItem, leaseOwner: string): Promise<void>;
  failDeletionIntent(task: MediaCleanupWorkItem, leaseOwner: string, message: string, nextAttemptAt: string): Promise<void>;
  listStaleUploads(staleBefore: string, limit?: number): Promise<MediaAssetRecord[]>;
  listCleanupTasks(limit?: number): Promise<MediaCleanupWorkItem[]>;
  completeCleanup(taskId: string, assetId: string): Promise<void>;
  failCleanup(taskId: string, message: string, nextAttemptAt: string): Promise<void>;
  listStoryDeletionJobs(limit?: number): Promise<StoryDeletionJobState[]>;
  claimStoryDeletionJob(job: StoryDeletionJobState, leaseOwner: string, leaseExpiresAt: string): Promise<void>;
  advanceStoryDeletionJob(jobId: string, leaseOwner: string, completedStage: StoryDeletionStage, nextStage: StoryDeletionStage): Promise<void>;
  failStoryDeletionJob(jobId: string, leaseOwner: string, stage: StoryDeletionStage, message: string): Promise<void>;
  completeStoryDeletionJob(jobId: string, leaseOwner: string): Promise<void>;
  listStoryDeletionMediaCandidates(ownerUid: string, storyId: string, limit?: number): Promise<StoryDeletionMediaCandidate[]>;
  listExpiredStoryTombstones(completedBefore: string, limit?: number): Promise<StoryDeletionJobState[]>;
  purgeExpiredStoryTombstone(jobId: string, storyId: string, completedBefore: string): Promise<void>;
  listStorageUsage(limit?: number): Promise<StorageUsageRow[]>;
}

export function validateMediaReservation(reservation: MediaAssetReservation): void {
  assertPermanentMediaMetadata(reservation);
  if (!reservation.objectKey.startsWith('user-media/')) throw new Error('Media object key is outside the user-media namespace.');
  if (!/^\d+$/.test(reservation.byteSize) || BigInt(reservation.byteSize) < 1n) throw new Error('Media byte size must be a positive integer string.');
  if (!/^[a-f0-9]{64}$/.test(reservation.checksumSha256)) throw new Error('Media checksum must be a SHA-256 hex digest.');
  if (!/^[a-f0-9]{64}$/.test(reservation.requestHash)) throw new Error('Media request hash must be a SHA-256 hex digest.');
  if (!reservation.idempotencyKey.trim()) throw new Error('Media idempotency key is required.');
  if (!reservation.mimeType || reservation.mimeType.startsWith('data:')) throw new Error('Media MIME type is invalid.');
}
