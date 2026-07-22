import { randomUUID } from 'node:crypto';
import type {
  MediaAssetDescriptor,
  MediaAssetRecord,
  MediaCleanupTask,
  MediaOwner,
  SaveMediaAssetRequest,
  StorageUsageRow,
} from '../../contracts/mediaAssets';
import { normalizeMediaInput, type MediaInputPolicy } from './mediaInput';
import type { MediaAssetRepository, MediaAssetReservation } from './mediaAssetRepository';
import {
  buildImmutableObjectKey,
  IMMUTABLE_CACHE_CONTROL,
  PRIVATE_CACHE_CONTROL,
  type MediaObjectStore,
} from './r2ObjectStore';
import { assertPermanentMediaMetadata } from './permanentMediaGuard';

const MAX_ERROR_LENGTH = 1000;
const DEFAULT_REPLACEMENT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_STALE_UPLOAD_AGE_MS = 60 * 60 * 1000;
const DEFAULT_EMERGENCY_MARKER_GRACE_MS = 15 * 60 * 1000;
const ACCOUNT_TARGET_KINDS = new Set(['ACCOUNT', 'PROFILE', 'PORTRAIT']);
const ENTITY_TARGET_KINDS = new Set([
  'ENTITY',
  'CODEX_ENTITY',
  'CHARACTER',
  'LOCATION',
  'ARTIFACT',
  'BEAST',
  'FACTION',
  'ABILITY',
  'MYSTERY',
  'POWER',
  'EVENT',
  'GLOSSARY',
]);

export class MediaAssetServiceError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly assetId?: string,
    readonly recoverable = false,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'MediaAssetServiceError';
  }
}

export interface MediaStorageReport {
  totalBytes: string;
  totalAssets: number;
  byOwner: Record<string, string>;
  byStory: Record<string, string>;
  byType: Record<string, string>;
  byStatus: Record<string, { assets: number; bytes: string }>;
  failedAssets: string[];
  pendingCleanupAssets: string[];
  orphanedAssets: string[];
  unusuallyLargeAssets: Array<{ id: string; byteSize: string; assetType: string; ownerUid: string }>;
}

const DEFAULT_MAX_USER_STORAGE_BYTES = 500n * 1024n * 1024n;
const DEFAULT_MAX_USER_ASSET_COUNT = 5000;
const DEFAULT_MAX_UPLOADS_PER_MINUTE = 30;
const SYSTEM_OWNER_EMAILS = new Set(['amaurylindy@gmail.com', 'seihouseproductions@gmail.com']);

function isPrivilegedOwner(owner: MediaOwner): boolean {
  if (owner.role === 'owner' || owner.role === 'admin') return true;
  if (owner.email && SYSTEM_OWNER_EMAILS.has(owner.email.toLowerCase())) return true;
  return false;
}

export interface MediaAssetServiceOptions {
  inputPolicy?: MediaInputPolicy;
  now?: () => Date;
  createId?: () => string;
  replacementRetentionMs?: number;
  staleUploadAgeMs?: number;
  emergencyMarkerGraceMs?: number;
  largeAssetThresholdBytes?: bigint;
  maxUserStorageBytes?: bigint;
  maxUserAssetCount?: number;
  maxUploadsPerMinute?: number;
}

function errorMessage(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, MAX_ERROR_LENGTH);
}

function validateOwner(owner: MediaOwner): void {
  if (!owner.uid || owner.uid.length > 128) throw new MediaAssetServiceError('A verified Firebase owner is required.', 'unauthenticated');
}

function validateRequestMetadata(owner: MediaOwner, request: SaveMediaAssetRequest): void {
  if (!request.purpose.trim() || request.purpose.length > 80) throw new MediaAssetServiceError('Media purpose is required and must be at most 80 characters.', 'invalid_metadata');
  if (request.association.purpose !== request.purpose) throw new MediaAssetServiceError('Media association purpose must match the asset purpose.', 'invalid_metadata');
  if (!request.association.targetKind.trim() || request.association.targetKind.length > 64) throw new MediaAssetServiceError('Media target kind is invalid.', 'invalid_metadata');
  if (!request.association.targetKey.trim() || request.association.targetKey.length > 160) throw new MediaAssetServiceError('Media target key is invalid.', 'invalid_metadata');
  validateAssociationShape(owner.uid, request.association);
  assertPermanentMediaMetadata({ owner, ...request, source: undefined });
}

function validateAssociationShape(ownerUid: string, association: SaveMediaAssetRequest['association']): void {
  const kind = association.targetKind.trim().toUpperCase();
  const targetKey = association.targetKey.trim();
  if (!association.storyId) {
    if (association.chapterId || association.entityId || !ACCOUNT_TARGET_KINDS.has(kind) || targetKey !== ownerUid) {
      throw new MediaAssetServiceError('Account media must target the authenticated owner without story relations.', 'invalid_metadata');
    }
    return;
  }
  if (ACCOUNT_TARGET_KINDS.has(kind)) {
    throw new MediaAssetServiceError('Account media targets cannot be attached to a story.', 'invalid_metadata');
  }
  if (association.chapterId && association.entityId) {
    throw new MediaAssetServiceError('A media attachment cannot target both a chapter and a Codex entity.', 'invalid_metadata');
  }
  if (kind === 'STORY' && (association.chapterId || association.entityId || targetKey !== association.storyId)) {
    throw new MediaAssetServiceError('Story media must use the owned story ID as its target key.', 'invalid_metadata');
  }
  if (kind === 'CHAPTER' && (!association.chapterId || targetKey !== association.chapterId)) {
    throw new MediaAssetServiceError('Chapter media must include the matching owned chapter ID.', 'invalid_metadata');
  }
  if (ENTITY_TARGET_KINDS.has(kind) && (!association.entityId || targetKey !== association.entityId)) {
    throw new MediaAssetServiceError('Codex media must include the matching owned entity ID.', 'invalid_metadata');
  }
}

function addToBigIntRecord(target: Record<string, bigint>, key: string, value: bigint): void {
  target[key] = (target[key] ?? 0n) + value;
}

export function buildMediaStorageReport(rows: StorageUsageRow[], largeThreshold = 100n * 1024n * 1024n): MediaStorageReport {
  let total = 0n;
  const byOwner: Record<string, bigint> = {};
  const byStory: Record<string, bigint> = {};
  const byType: Record<string, bigint> = {};
  const byStatus: Record<string, { assets: number; bytes: bigint }> = {};
  const failedAssets: string[] = [];
  const pendingCleanupAssets: string[] = [];
  const orphanedAssets: string[] = [];
  const unusuallyLargeAssets: MediaStorageReport['unusuallyLargeAssets'] = [];

  for (const row of rows) {
    const bytes = BigInt(row.byteSize);
    total += bytes;
    addToBigIntRecord(byOwner, row.ownerUid, bytes);
    addToBigIntRecord(byStory, row.storyId ?? '_account', bytes);
    addToBigIntRecord(byType, row.assetType, bytes);
    const status = byStatus[row.status] ?? { assets: 0, bytes: 0n };
    status.assets += 1;
    status.bytes += bytes;
    byStatus[row.status] = status;
    if (row.status === 'FAILED') failedAssets.push(row.id);
    if (row.status === 'PENDING_CLEANUP') pendingCleanupAssets.push(row.id);
    if (row.status === 'ORPHANED') orphanedAssets.push(row.id);
    if (bytes >= largeThreshold) unusuallyLargeAssets.push({ id: row.id, byteSize: row.byteSize, assetType: row.assetType, ownerUid: row.ownerUid });
  }

  return {
    totalBytes: total.toString(),
    totalAssets: rows.length,
    byOwner: Object.fromEntries(Object.entries(byOwner).map(([key, value]) => [key, value.toString()])),
    byStory: Object.fromEntries(Object.entries(byStory).map(([key, value]) => [key, value.toString()])),
    byType: Object.fromEntries(Object.entries(byType).map(([key, value]) => [key, value.toString()])),
    byStatus: Object.fromEntries(Object.entries(byStatus).map(([key, value]) => [key, { assets: value.assets, bytes: value.bytes.toString() }])),
    failedAssets,
    pendingCleanupAssets,
    orphanedAssets,
    unusuallyLargeAssets,
  };
}

export class MediaAssetService {
  private readonly now: () => Date;
  private readonly createId: () => string;
  private readonly replacementRetentionMs: number;
  private readonly staleUploadAgeMs: number;
  private readonly emergencyMarkerGraceMs: number;
  private readonly largeAssetThresholdBytes: bigint;
  private readonly maxUserStorageBytes: bigint;
  private readonly maxUserAssetCount: number;
  private readonly maxUploadsPerMinute: number;
  private readonly userUploadTimestamps = new Map<string, number[]>();

  constructor(
    private readonly repository: MediaAssetRepository,
    private readonly objectStore: MediaObjectStore,
    private readonly options: MediaAssetServiceOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.createId = options.createId ?? randomUUID;
    this.replacementRetentionMs = options.replacementRetentionMs ?? DEFAULT_REPLACEMENT_RETENTION_MS;
    this.staleUploadAgeMs = options.staleUploadAgeMs ?? DEFAULT_STALE_UPLOAD_AGE_MS;
    this.emergencyMarkerGraceMs = options.emergencyMarkerGraceMs ?? DEFAULT_EMERGENCY_MARKER_GRACE_MS;
    this.largeAssetThresholdBytes = options.largeAssetThresholdBytes ?? 100n * 1024n * 1024n;
    this.maxUserStorageBytes = options.maxUserStorageBytes ?? DEFAULT_MAX_USER_STORAGE_BYTES;
    this.maxUserAssetCount = options.maxUserAssetCount ?? DEFAULT_MAX_USER_ASSET_COUNT;
    this.maxUploadsPerMinute = options.maxUploadsPerMinute ?? DEFAULT_MAX_UPLOADS_PER_MINUTE;
  }

  private assertUploadRateLimit(ownerUid: string): void {
    const nowMs = this.now().getTime();
    const windowMs = 60 * 1000;
    const timestamps = (this.userUploadTimestamps.get(ownerUid) ?? []).filter(
      (t) => nowMs - t < windowMs,
    );
    if (timestamps.length >= this.maxUploadsPerMinute) {
      throw new MediaAssetServiceError(
        `Media upload rate limit exceeded (${this.maxUploadsPerMinute} uploads per minute). Please wait before uploading more assets.`,
        'rate_limit_exceeded',
      );
    }
    timestamps.push(nowMs);
    this.userUploadTimestamps.set(ownerUid, timestamps);
  }

  private async assertUserStorageQuota(ownerUid: string, incomingBytes: bigint): Promise<void> {
    const rows = await this.repository.listStorageUsage();
    const userRows = rows.filter((r) => r.ownerUid === ownerUid && r.status !== 'DELETED' && r.status !== 'FAILED');
    const currentBytes = userRows.reduce((total, r) => total + BigInt(r.byteSize), 0n);
    const currentCount = userRows.length;

    if (currentBytes + incomingBytes > this.maxUserStorageBytes) {
      throw new MediaAssetServiceError(
        `User media storage quota exceeded. Current usage: ${currentBytes} bytes, Limit: ${this.maxUserStorageBytes} bytes.`,
        'user_quota_exceeded',
      );
    }
    if (currentCount + 1 > this.maxUserAssetCount) {
      throw new MediaAssetServiceError(
        `User media asset count quota exceeded. Current count: ${currentCount}, Limit: ${this.maxUserAssetCount}.`,
        'user_quota_exceeded',
      );
    }
  }

  async save(owner: MediaOwner, request: SaveMediaAssetRequest): Promise<MediaAssetDescriptor> {
    validateOwner(owner);
    validateRequestMetadata(owner, request);
    const visibility = request.visibility ?? 'PRIVATE';
    if (visibility === 'PUBLIC' && !isPrivilegedOwner(owner)) {
      throw new MediaAssetServiceError(
        'Ordinary users are not permitted to choose public media storage.',
        'public_storage_prohibited',
      );
    }
    this.assertUploadRateLimit(owner.uid);
    try {
      this.objectStore.assertDeliveryConfigured(visibility);
    } catch (error) {
      throw new MediaAssetServiceError(
        'The requested media delivery mode is not configured.',
        'delivery_not_configured',
        undefined,
        false,
        { cause: error },
      );
    }
    const bucket = this.objectStore.bucketFor(visibility);
    await this.repository.assertAssociationOwned(owner.uid, request.association);
    if (request.generationJobId) {
      await this.repository.assertGenerationJobOwned(owner.uid, request.generationJobId, request.association.storyId);
    }

    let previous: MediaAssetRecord | null = null;
    if (request.replacesAssetId) {
      previous = await this.repository.getOwned(owner.uid, request.replacesAssetId);
      if (!previous || previous.status !== 'READY') throw new MediaAssetServiceError('The asset being replaced is not an owned ready asset.', 'replacement_not_ready');
      if (previous.purpose !== request.purpose) throw new MediaAssetServiceError('Replacement purpose does not match the current asset.', 'replacement_slot_mismatch');
      try {
        await this.repository.assertReplacementSlotOwned(owner.uid, previous.id, request.association);
      } catch (error) {
        throw new MediaAssetServiceError('Replacement must match one exclusive current media slot.', 'replacement_slot_mismatch', previous.id, false, { cause: error });
      }
    }

    const normalized = await normalizeMediaInput(request.source, request.assetType, this.options.inputPolicy);
    await this.assertUserStorageQuota(owner.uid, BigInt(normalized.byteSize));
    const id = this.createId();
    const version = previous ? previous.version + 1 : 1;
    const cacheControl = visibility === 'PUBLIC' ? IMMUTABLE_CACHE_CONTROL : PRIVATE_CACHE_CONTROL;
    const objectKey = buildImmutableObjectKey({
      ownerUid: owner.uid,
      storyId: request.association.storyId,
      assetType: request.assetType,
      visibility,
      assetId: id,
      version,
      checksumSha256: normalized.checksumSha256,
      extension: normalized.extension,
      now: this.now(),
    });
    const reservation: MediaAssetReservation = {
      id,
      ownerUid: owner.uid,
      storyId: request.association.storyId,
      generationJobId: request.generationJobId,
      replacesAssetId: previous?.id,
      assetType: request.assetType,
      purpose: request.purpose,
      visibility,
      bucket,
      objectKey,
      originalFilename: normalized.originalFilename,
      mimeType: normalized.mimeType,
      extension: normalized.extension,
      byteSize: normalized.byteSize.toString(),
      checksumSha256: normalized.checksumSha256,
      width: normalized.width,
      height: normalized.height,
      durationMs: null,
      version,
      cacheControl,
      sourceKind: normalized.sourceKind,
    };

    await this.repository.reserve(owner, reservation);

    let etag: string | undefined;
    try {
      const upload = await this.objectStore.put({
        bucket,
        objectKey,
        bytes: normalized.bytes,
        mimeType: normalized.mimeType,
        cacheControl,
        checksumSha256: normalized.checksumSha256,
        originalFilename: normalized.originalFilename,
      });
      etag = upload.etag;
      const confirmed = await this.objectStore.head(bucket, objectKey);
      if (!confirmed || confirmed.byteSize !== normalized.byteSize || confirmed.checksumSha256 !== normalized.checksumSha256) {
        throw new MediaAssetServiceError('R2 upload confirmation did not match the expected file.', 'upload_confirmation_failed', id, true);
      }
      etag = confirmed.etag ?? etag;
    } catch (error) {
      await this.recoverUploadFailure(owner.uid, reservation, error);
      throw new MediaAssetServiceError('Media upload failed and was not marked ready.', 'upload_failed', id, true, { cause: error });
    }

    let ready: MediaAssetRecord;
    try {
      ready = previous
        ? await this.repository.commitReplacement(
            owner.uid,
            id,
            previous,
            etag,
            request.association,
            new Date(this.now().getTime() + this.replacementRetentionMs).toISOString(),
          )
        : await this.repository.commitReady(owner.uid, id, etag, request.association);
    } catch (error) {
      const reconciliation = await this.reconcileCommitFailure(owner.uid, reservation, error);
      if (reconciliation.ready) return this.toDescriptor(reconciliation.ready);
      throw new MediaAssetServiceError('R2 upload succeeded, but the PostgreSQL commit could not be confirmed.', 'database_commit_failed', id, reconciliation.recoverable, { cause: error });
    }

    return this.toDescriptor(ready);
  }

  async get(ownerUid: string, assetId: string): Promise<MediaAssetDescriptor | null> {
    const record = await this.repository.getOwned(ownerUid, assetId);
    if (!record || record.status !== 'READY') return null;
    return this.toDescriptor(record);
  }

  async delete(ownerUid: string, assetId: string): Promise<void> {
    const record = await this.repository.getOwned(ownerUid, assetId);
    if (!record || ['DELETED', 'ORPHANED'].includes(record.status)) throw new MediaAssetServiceError('Media asset was not found.', 'not_found');
    const taskId = await this.repository.requestDeletion(ownerUid, assetId, record.bucket, record.objectKey);
    try {
      await this.objectStore.delete(record.bucket, record.objectKey);
      const remaining = await this.objectStore.head(record.bucket, record.objectKey);
      if (remaining) throw new Error('R2 still reports the object after deletion.');
      await this.repository.completeCleanup(taskId, assetId);
    } catch (error) {
      await this.repository.failCleanup(taskId, errorMessage(error), this.nextCleanupAttempt(1));
      throw new MediaAssetServiceError('Media deletion is pending cleanup and can be retried safely.', 'delete_pending_cleanup', assetId, true, { cause: error });
    }
  }

  async runCleanup(limit = 100): Promise<{ attempted: number; completed: number; failed: number }> {
    const tasks = await this.repository.listCleanupTasks(limit);
    let completed = 0;
    let failed = 0;
    for (const task of tasks) {
      if (!task.assetId) continue;
      try {
        await this.objectStore.delete(task.bucket, task.objectKey);
        const remaining = await this.objectStore.head(task.bucket, task.objectKey);
        if (remaining) throw new Error('R2 still reports the object after cleanup deletion.');
        await this.repository.completeCleanup(task.id, task.assetId);
        completed += 1;
      } catch (error) {
        await this.repository.failCleanup(task.id, errorMessage(error), this.nextCleanupAttempt(task.attemptCount + 1));
        failed += 1;
      }
    }
    return { attempted: tasks.length, completed, failed };
  }

  /** Close abandoned UPLOADING reservations after the worker timeout. */
  async runStaleUploadRecovery(limit = 100): Promise<{ inspected: number; failedMarked: number; cleanupQueued: number; errors: number }> {
    const staleBefore = new Date(this.now().getTime() - this.staleUploadAgeMs).toISOString();
    const uploads = await this.repository.listStaleUploads(staleBefore, limit);
    let failedMarked = 0;
    let cleanupQueued = 0;
    let errors = 0;
    for (const upload of uploads) {
      try {
        let objectMayExist: boolean;
        try {
          objectMayExist = Boolean(await this.objectStore.head(upload.bucket, upload.objectKey));
        } catch {
          objectMayExist = true;
        }
        if (objectMayExist) {
          await this.repository.markPendingCleanup(
            upload.ownerUid,
            upload.id,
            upload.bucket,
            upload.objectKey,
            'stale-upload-reservation',
            'Upload worker stopped before the READY transaction completed.',
          );
          cleanupQueued += 1;
        } else {
          await this.repository.markFailed(
            upload.ownerUid,
            upload.id,
            'stale_upload_reservation',
            'Upload worker stopped before an R2 object was confirmed.',
          );
          failedMarked += 1;
        }
      } catch {
        errors += 1;
      }
    }
    return { inspected: uploads.length, failedMarked, cleanupQueued, errors };
  }

  async runEmergencyCleanup(limit = 100): Promise<{ attempted: number; completed: number; failed: number; deferred: number }> {
    const markerKeys = await this.objectStore.listCleanupMarkerKeys(limit);
    let completed = 0;
    let failed = 0;
    let deferred = 0;
    for (const markerKey of markerKeys) {
      try {
        const marker = await this.objectStore.readCleanupMarker(markerKey);
        const markerAgeMs = this.now().getTime() - Date.parse(marker.createdAt);
        if (!Number.isFinite(markerAgeMs) || markerAgeMs < this.emergencyMarkerGraceMs) {
          deferred += 1;
          continue;
        }
        const record = await this.repository.getOwned(marker.ownerUid, marker.assetId);
        if (record?.status === 'READY') {
          // A lost response can make a successful READY commit look like a
          // failure. Preserve the authoritative object and clear only the
          // emergency intent after PostgreSQL confirms that outcome.
          await this.objectStore.deleteCleanupMarker(markerKey);
          completed += 1;
          continue;
        }
        let cleanupTaskId: string | undefined;
        if (record?.status === 'UPLOADING') {
          cleanupTaskId = await this.repository.markPendingCleanup(
            record.ownerUid,
            record.id,
            record.bucket,
            record.objectKey,
            'emergency-marker-reconciliation',
            'The upload commit outcome remained unresolved beyond the grace period.',
          );
        }
        await this.objectStore.delete(marker.bucket, marker.objectKey);
        const remaining = await this.objectStore.head(marker.bucket, marker.objectKey);
        if (remaining) throw new Error('R2 still reports the orphan object after emergency cleanup.');
        if (cleanupTaskId && record) await this.repository.completeCleanup(cleanupTaskId, record.id);
        await this.objectStore.deleteCleanupMarker(markerKey);
        completed += 1;
      } catch {
        // Leave the marker intact; the next reconciler run can retry safely.
        failed += 1;
      }
    }
    return { attempted: markerKeys.length, completed, failed, deferred };
  }

  async inspectStorage(limit = 100_000): Promise<MediaStorageReport> {
    return buildMediaStorageReport(await this.repository.listStorageUsage(limit), this.largeAssetThresholdBytes);
  }

  private async toDescriptor(record: MediaAssetRecord): Promise<MediaAssetDescriptor> {
    if (record.status !== 'READY') throw new MediaAssetServiceError('Only ready media assets can be delivered.', 'asset_not_ready', record.id);
    return {
      id: record.id,
      assetType: record.assetType,
      purpose: record.purpose,
      visibility: record.visibility,
      status: record.status,
      mimeType: record.mimeType,
      byteSize: record.byteSize,
      checksumSha256: record.checksumSha256,
      width: record.width,
      height: record.height,
      durationMs: record.durationMs,
      version: record.version,
      deliveryUrl: await this.objectStore.getDeliveryUrl(record.bucket, record.objectKey, record.visibility),
      createdAt: record.createdAt,
      readyAt: record.readyAt,
    };
  }

  private async recoverUploadFailure(ownerUid: string, reservation: MediaAssetReservation, error: unknown): Promise<void> {
    let objectExists = false;
    try {
      objectExists = Boolean(await this.objectStore.head(reservation.bucket, reservation.objectKey));
    } catch {
      objectExists = true;
    }
    if (objectExists) {
      try {
        await this.repository.markPendingCleanup(ownerUid, reservation.id, reservation.bucket, reservation.objectKey, 'upload-state-uncertain', errorMessage(error));
      } catch (databaseRecoveryError) {
        try {
          await this.objectStore.delete(reservation.bucket, reservation.objectKey);
          const remaining = await this.objectStore.head(reservation.bucket, reservation.objectKey);
          if (!remaining) return;
        } catch {
          // Fall through to the R2-hosted emergency cleanup marker.
        }
        await this.writeEmergencyMarker(ownerUid, reservation, 'upload-cleanup-unavailable', error, databaseRecoveryError);
      }
      return;
    }
    try {
      await this.repository.markFailed(ownerUid, reservation.id, 'upload_failed', errorMessage(error));
    } catch {
      try {
        await this.repository.markPendingCleanup(ownerUid, reservation.id, reservation.bucket, reservation.objectKey, 'upload-state-uncertain', errorMessage(error));
      } catch {
        // No object was observed, so an unreachable reservation cannot expose a
        // file. A later stale-reservation sweep can close the row.
      }
    }
  }

  private async reconcileCommitFailure(
    ownerUid: string,
    reservation: MediaAssetReservation,
    error: unknown,
  ): Promise<{ ready?: MediaAssetRecord; recoverable: boolean }> {
    let current: MediaAssetRecord | null;
    try {
      current = await this.repository.getOwned(ownerUid, reservation.id);
    } catch (readbackError) {
      try {
        await this.writeEmergencyMarker(ownerUid, reservation, 'commit-outcome-unknown', error, readbackError);
        return { recoverable: true };
      } catch {
        return { recoverable: false };
      }
    }
    if (current?.status === 'READY') return { ready: current, recoverable: true };

    try {
      await this.repository.markPendingCleanup(ownerUid, reservation.id, reservation.bucket, reservation.objectKey, 'database-commit-failed-after-r2-upload', errorMessage(error));
      return { recoverable: true };
    } catch (databaseRecoveryError) {
      try {
        await this.writeEmergencyMarker(ownerUid, reservation, 'commit-outcome-unknown', error, databaseRecoveryError);
        return { recoverable: true };
      } catch {
        return { recoverable: false };
      }
    }
  }

  private async writeEmergencyMarker(
    ownerUid: string,
    reservation: MediaAssetReservation,
    reason: string,
    error: unknown,
    recoveryError: unknown,
  ): Promise<void> {
    await this.objectStore.writeCleanupMarker({
      assetId: reservation.id,
      ownerUid,
      bucket: reservation.bucket,
      objectKey: reservation.objectKey,
      reason,
      createdAt: this.now().toISOString(),
      error: `${errorMessage(error)}; recovery: ${errorMessage(recoveryError)}`.slice(0, MAX_ERROR_LENGTH),
    });
  }

  private nextCleanupAttempt(attempt: number): string {
    const delayMs = Math.min(24 * 60 * 60 * 1000, 30_000 * 2 ** Math.min(attempt, 10));
    return new Date(this.now().getTime() + delayMs).toISOString();
  }
}
