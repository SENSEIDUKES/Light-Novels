import { createHash, randomUUID } from 'node:crypto';
import type {
  MediaAssetDescriptor,
  MediaAssetRecord,
  MediaCleanupTask,
  MediaOwner,
  SaveMediaAssetRequest,
  StorageUsageRow,
} from '../../contracts/mediaAssets';
import { normalizeMediaInput, type MediaInputPolicy } from './mediaInput';
import type {
  MediaAssetRepository,
  MediaAssetReservation,
  MediaCleanupWorkItem,
  MediaSlotState,
  StoryDeletionJobState,
  StoryDeletionStage,
} from './mediaAssetRepository';
import {
  assertIsolatedUserMediaObjectKey,
  buildImmutableObjectKey,
  IMMUTABLE_CACHE_CONTROL,
  PRIVATE_CACHE_CONTROL,
  type MediaObjectStore,
} from './r2ObjectStore';
import { assertPermanentMediaMetadata } from './permanentMediaGuard';

const MAX_ERROR_LENGTH = 1000;
const DEFAULT_STALE_UPLOAD_AGE_MS = 60 * 60 * 1000;
const DEFAULT_EMERGENCY_MARKER_GRACE_MS = 15 * 60 * 1000;
const DEFAULT_QUOTA_RESERVATION_TTL_MS = 60 * 60 * 1000;
const DEFAULT_CLEANUP_LEASE_MS = 5 * 60 * 1000;
const DELIVERY_URL_TTL_SECONDS = 900;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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
  quotaReservationTtlMs?: number;
  cleanupLeaseMs?: number;
  cleanupWorkerId?: string;
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

function validateRequestMetadata(
  owner: MediaOwner,
  request: SaveMediaAssetRequest,
): asserts request is SaveMediaAssetRequest & { idempotencyKey: string } {
  if (!request.idempotencyKey || !UUID_PATTERN.test(request.idempotencyKey)) throw new MediaAssetServiceError('A UUID idempotency key is required.', 'invalid_metadata');
  if (!request.purpose.trim() || request.purpose.length > 80) throw new MediaAssetServiceError('Media purpose is required and must be at most 80 characters.', 'invalid_metadata');
  if (request.association.purpose !== request.purpose) throw new MediaAssetServiceError('Media association purpose must match the asset purpose.', 'invalid_metadata');
  if (!request.association.targetKind.trim() || request.association.targetKind.length > 64) throw new MediaAssetServiceError('Media target kind is invalid.', 'invalid_metadata');
  if (!request.association.targetKey.trim() || request.association.targetKey.length > 160) throw new MediaAssetServiceError('Media target key is invalid.', 'invalid_metadata');
  validateAssociationShape(owner.uid, request.association);
  assertPermanentMediaMetadata({ owner, ...request, source: undefined });
}

async function buildRequestHash(
  request: SaveMediaAssetRequest,
  visibility: 'PRIVATE' | 'PUBLIC',
): Promise<string> {
  const association = request.association;
  const source = request.source;
  let sourceHash: string;
  if (source.kind === 'bytes') {
    sourceHash = createHash('sha256').update(source.bytes).digest('hex');
  } else if (source.kind === 'blob') {
    sourceHash = createHash('sha256').update(new Uint8Array(await source.blob.arrayBuffer())).digest('hex');
  } else if (source.kind === 'data-url') {
    sourceHash = createHash('sha256').update(source.dataUrl).digest('hex');
  } else {
    sourceHash = createHash('sha256').update(source.url).digest('hex');
  }
  const canonical = [
    'media-upload-v1',
    request.assetType,
    request.purpose,
    visibility,
    association.targetKind,
    association.targetKey,
    association.purpose,
    association.storyId ?? null,
    association.chapterId ?? null,
    association.entityId ?? null,
    association.clientHistoryId ?? association.legacyMediaId ?? null,
    association.entityType ?? null,
    association.promptUsed ?? null,
    association.chapterNumber ?? null,
    association.arcTitle ?? null,
    association.label ?? null,
    request.generationJobId ?? null,
    request.replacesAssetId ?? null,
    source.kind,
    sourceHash,
    'mimeType' in source ? source.mimeType ?? null : source.kind === 'blob' ? source.blob.type || null : null,
    'expectedMimeType' in source ? source.expectedMimeType ?? null : null,
    source.filename ?? null,
  ];
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
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
  private readonly quotaReservationTtlMs: number;
  private readonly cleanupLeaseMs: number;
  private readonly cleanupWorkerId: string;
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
    this.quotaReservationTtlMs = options.quotaReservationTtlMs ?? DEFAULT_QUOTA_RESERVATION_TTL_MS;
    this.cleanupLeaseMs = options.cleanupLeaseMs ?? DEFAULT_CLEANUP_LEASE_MS;
    this.cleanupWorkerId = options.cleanupWorkerId ?? `media-cleanup:${process.pid}:${randomUUID()}`;
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

  private async safeGetUploadReceipt(ownerUid: string, idempotencyKey: string) {
    try {
      return await this.repository.getUploadReceipt(ownerUid, idempotencyKey);
    } catch {
      return null;
    }
  }

  private async safeGetQuotaReservation(ownerUid: string, idempotencyKey: string) {
    try {
      return await this.repository.getOwnedQuotaReservation(ownerUid, idempotencyKey);
    } catch {
      return null;
    }
  }

  private async resolveExistingUpload(
    ownerUid: string,
    idempotencyKey: string,
    requestHash: string,
  ): Promise<MediaAssetDescriptor | null> {
    const receipt = await this.repository.getUploadReceipt(ownerUid, idempotencyKey);
    if (!receipt) return null;
    if (receipt.requestHash !== requestHash) {
      throw new MediaAssetServiceError(
        'This idempotency key was already used for a different media request.',
        'idempotency_conflict',
        receipt.assetId,
      );
    }
    const record = await this.repository.getOwned(ownerUid, receipt.assetId);
    if (!record) {
      throw new MediaAssetServiceError(
        'The upload receipt exists, but its media asset cannot be read yet.',
        'idempotency_state_conflict',
        receipt.assetId,
        true,
      );
    }
    if (record.status === 'READY') return this.toDescriptor(record);
    if (['UPLOADING', 'GENERATING', 'PROCESSING'].includes(record.status)) {
      throw new MediaAssetServiceError(
        'The upload with this idempotency key is still in progress.',
        'idempotency_in_progress',
        record.id,
        true,
      );
    }
    throw new MediaAssetServiceError(
      'The prior upload with this idempotency key did not complete; start a new operation with a new key.',
      'idempotency_failed',
      record.id,
    );
  }

  private async tryResolveExistingUpload(
    ownerUid: string,
    idempotencyKey: string,
    requestHash: string,
  ): Promise<MediaAssetDescriptor | null> {
    try {
      return await this.resolveExistingUpload(ownerUid, idempotencyKey, requestHash);
    } catch (error) {
      if (error instanceof MediaAssetServiceError) throw error;
      return null;
    }
  }

  private async safeReleaseQuota(ownerUid: string, reservationId: string): Promise<void> {
    try {
      await this.repository.releaseQuota(ownerUid, reservationId);
    } catch {
      // The reservation expires independently. Preserve the primary upload
      // failure while allowing the quota reconciler to release it later.
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

    const requestHash = await buildRequestHash(request, visibility);
    const recovered = await this.resolveExistingUpload(owner.uid, request.idempotencyKey, requestHash);
    if (recovered) return recovered;

    const normalized = await normalizeMediaInput(request.source, request.assetType, this.options.inputPolicy);
    this.assertUploadRateLimit(owner.uid);
    const slot = await this.repository.getOwnedSlot(owner.uid, request.association);
    let previous: MediaAssetRecord | null = null;
    if (request.replacesAssetId) {
      previous = await this.repository.getOwned(owner.uid, request.replacesAssetId);
      if (!previous || previous.status !== 'READY') throw new MediaAssetServiceError('The asset being replaced is not an owned ready asset.', 'replacement_not_ready');
      if (previous.purpose !== request.purpose) throw new MediaAssetServiceError('Replacement purpose does not match the current asset.', 'replacement_slot_mismatch');
      if ((previous.storyId ?? null) !== (request.association.storyId ?? null)
        || !slot
        || slot.currentAssetId !== previous.id) {
        throw new MediaAssetServiceError(
          'Replacement must match the current asset in the owned media slot.',
          'replacement_slot_mismatch',
          previous.id,
        );
      }
    } else if (slot) {
      throw new MediaAssetServiceError(
        'This media slot already has a current asset. Supply replacesAssetId or select a history asset.',
        'current_slot_conflict',
        slot.currentAssetId,
      );
    }

    await this.assertUserStorageQuota(owner.uid, BigInt(normalized.byteSize));
    let quotaReservationId = this.createId();
    let quotaReservationRecovered = false;
    const id = this.createId();
    const version = previous ? previous.version + 1 : 1;
    const newSlotVersion = slot ? (BigInt(slot.version) + 1n).toString() : '1';
    const positionValue = BigInt(newSlotVersion);
    if (positionValue > 2_147_483_647n) {
      throw new MediaAssetServiceError('Media slot history has exceeded its supported size.', 'current_slot_conflict');
    }
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
      quotaReservationId,
      idempotencyKey: request.idempotencyKey,
      requestHash,
    };

    try {
      await this.repository.reserveQuota(owner.uid, {
        id: quotaReservationId,
        storyId: request.association.storyId,
        idempotencyKey: request.idempotencyKey,
        requestedBytes: reservation.byteSize,
        hardLimitBytes: this.maxUserStorageBytes.toString(),
        expiresAt: new Date(this.now().getTime() + this.quotaReservationTtlMs).toISOString(),
      });
    } catch (error) {
      const duplicate = await this.tryResolveExistingUpload(owner.uid, request.idempotencyKey, requestHash);
      if (duplicate) return duplicate;
      const existingQuota = await this.safeGetQuotaReservation(owner.uid, request.idempotencyKey);
      if (existingQuota?.status === 'RESERVED'
        && existingQuota.requestedBytes === reservation.byteSize
        && (existingQuota.storyId ?? null) === (request.association.storyId ?? null)) {
        quotaReservationId = existingQuota.id;
        reservation.quotaReservationId = existingQuota.id;
        quotaReservationRecovered = true;
      } else if (existingQuota) {
        throw new MediaAssetServiceError(
          'This idempotency key already belongs to a different or completed quota reservation.',
          'idempotency_conflict',
          existingQuota.assetId ?? undefined,
          false,
          { cause: error },
        );
      } else if (/storage quota exceeded/i.test(errorMessage(error))) {
        throw new MediaAssetServiceError('User media storage quota was exceeded while reserving this upload.', 'user_quota_exceeded', undefined, false, { cause: error });
      } else if (/idempotency|already reserved|duplicate/i.test(errorMessage(error))) {
        throw new MediaAssetServiceError('An upload with this idempotency key is already being reserved.', 'idempotency_in_progress', undefined, true, { cause: error });
      } else {
        throw new MediaAssetServiceError('Storage quota could not be reserved for this upload.', 'quota_reservation_failed', undefined, true, { cause: error });
      }
    }

    let databaseReserved = false;
    try {
      await this.repository.reserve(owner, reservation);
      databaseReserved = true;
    } catch (error) {
      const receipt = await this.safeGetUploadReceipt(owner.uid, request.idempotencyKey);
      if (receipt?.requestHash !== requestHash) {
        if (!quotaReservationRecovered) await this.safeReleaseQuota(owner.uid, quotaReservationId);
        if (receipt) {
          throw new MediaAssetServiceError('This idempotency key was already used for a different media request.', 'idempotency_conflict', receipt.assetId);
        }
      } else if (receipt.assetId === id) {
        const existing = await this.repository.getOwned(owner.uid, id);
        if (existing?.status === 'READY') return this.toDescriptor(existing);
        databaseReserved = existing?.status === 'UPLOADING';
      } else {
        const duplicate = await this.resolveExistingUpload(owner.uid, request.idempotencyKey, requestHash);
        if (duplicate) return duplicate;
      }
      if (!databaseReserved) {
        if (!quotaReservationRecovered) await this.safeReleaseQuota(owner.uid, quotaReservationId);
        throw new MediaAssetServiceError('The media upload reservation could not be confirmed.', 'database_reservation_failed', id, true, { cause: error });
      }
    }

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
      await this.safeReleaseQuota(owner.uid, quotaReservationId);
      const code = error instanceof MediaAssetServiceError ? error.code : 'upload_failed';
      const message = code === 'upload_confirmation_failed'
        ? 'R2 received the upload, but its checksum or size could not be confirmed.'
        : 'Media upload failed and was not marked ready.';
      throw new MediaAssetServiceError(message, code, id, true, { cause: error });
    }

    let ready: MediaAssetRecord;
    try {
      ready = await this.repository.commitToSlot(owner.uid, id, etag, {
        quotaReservationId,
        idempotencyKey: request.idempotencyKey,
        association: request.association,
        attachmentId: this.createId(),
        position: Number(positionValue),
        expectedCurrentAssetId: slot?.currentAssetId,
        expectedSlotVersion: slot?.version,
        newSlotVersion,
      });
    } catch (error) {
      const reconciliation = await this.reconcileCommitFailure(owner.uid, reservation, error);
      if (reconciliation.ready) return this.toDescriptor(reconciliation.ready);
      if (reconciliation.releaseQuota) await this.safeReleaseQuota(owner.uid, quotaReservationId);
      throw new MediaAssetServiceError('R2 upload succeeded, but the PostgreSQL commit could not be confirmed.', 'database_commit_failed', id, reconciliation.recoverable, { cause: error });
    }

    return this.toDescriptor(ready);
  }

  async get(ownerUid: string, assetId: string): Promise<MediaAssetDescriptor | null> {
    const record = await this.repository.getOwned(ownerUid, assetId);
    if (!record || record.status !== 'READY') return null;
    return this.toDescriptor(record);
  }

  async select(
    ownerUid: string,
    assetId: string,
    association: SaveMediaAssetRequest['association'],
  ): Promise<MediaAssetDescriptor> {
    validateOwner({ uid: ownerUid });
    if (!association.purpose.trim() || association.purpose.length > 80) {
      throw new MediaAssetServiceError('Media association purpose is invalid.', 'invalid_metadata');
    }
    validateAssociationShape(ownerUid, association);
    assertPermanentMediaMetadata(association);
    await this.repository.assertAssociationOwned(ownerUid, association);

    const asset = await this.repository.getOwned(ownerUid, assetId);
    if (!asset || asset.status !== 'READY') {
      throw new MediaAssetServiceError('The selected history asset was not found.', 'history_asset_not_found');
    }
    if (asset.purpose !== association.purpose
      || (asset.storyId ?? null) !== (association.storyId ?? null)) {
      throw new MediaAssetServiceError('The selected asset does not belong to this media slot history.', 'history_asset_not_found');
    }

    const slot = await this.repository.getOwnedSlot(ownerUid, association);
    if (!slot) throw new MediaAssetServiceError('The requested media slot was not found.', 'media_slot_not_found');
    if (slot.currentAssetId === assetId) return this.toDescriptor(asset);

    try {
      return this.toDescriptor(await this.repository.selectOwnedSlotAsset(ownerUid, assetId, association, slot));
    } catch (error) {
      if (/history|not found/i.test(errorMessage(error))) {
        throw new MediaAssetServiceError('The selected asset does not belong to this media slot history.', 'history_asset_not_found', assetId, false, { cause: error });
      }
      throw new MediaAssetServiceError('The media slot changed while selecting its history.', 'current_slot_conflict', slot.currentAssetId, true, { cause: error });
    }
  }

  async delete(ownerUid: string, assetId: string, idempotencyKey = `media-delete:${assetId}`): Promise<void> {
    if (!ownerUid.trim()) throw new MediaAssetServiceError('A verified Firebase owner is required.', 'unauthenticated');
    if (!idempotencyKey.trim() || idempotencyKey.length > 200) {
      throw new MediaAssetServiceError('Media deletion idempotency key is invalid.', 'invalid_metadata', assetId);
    }

    const existingIntent = await this.repository.getDeletionIntent(ownerUid, idempotencyKey);
    if (existingIntent) {
      if (existingIntent.assetId !== assetId) {
        throw new MediaAssetServiceError(
          'This idempotency key was already used for another media deletion.',
          'idempotency_conflict',
          existingIntent.assetId,
        );
      }
      if (existingIntent.status === 'SUCCEEDED') return;
      throw new MediaAssetServiceError(
        'Media deletion is already pending durable cleanup.',
        'delete_pending_cleanup',
        assetId,
        true,
      );
    }

    const record = await this.repository.getOwned(ownerUid, assetId);
    if (!record || !['READY', 'ARCHIVED'].includes(record.status)) {
      throw new MediaAssetServiceError('Media asset was not found.', 'not_found');
    }
    assertIsolatedUserMediaObjectKey(record.objectKey);

    const task: MediaCleanupWorkItem = {
      id: this.createId(),
      assetId,
      ownerUid,
      bucket: record.bucket,
      objectKey: record.objectKey,
      reason: 'user-delete',
      idempotencyKey,
      status: 'PENDING',
      attemptCount: 0,
      nextAttemptAt: this.now().toISOString(),
      createdAt: this.now().toISOString(),
    };
    await this.repository.ensureDeletionIntent({
      taskId: task.id,
      ownerUid,
      assetId,
      storyId: record.storyId,
      idempotencyKey,
      bucket: record.bucket,
      objectKey: record.objectKey,
      reason: task.reason,
    });

    try {
      await this.executeDeletionIntentCleanup(task);
    } catch (error) {
      throw new MediaAssetServiceError(
        'Media deletion is pending cleanup and can be retried safely.',
        'delete_pending_cleanup',
        assetId,
        true,
        { cause: error },
      );
    }
  }

  async runCleanup(limit = 100): Promise<{ attempted: number; completed: number; failed: number }> {
    const tasks = await this.repository.listCleanupTasks(limit);
    let completed = 0;
    let failed = 0;
    for (const task of tasks) {
      if (!task.assetId) continue;
      try {
        if (task.idempotencyKey) {
          await this.executeDeletionIntentCleanup(task);
        } else {
          await this.assertCleanupTaskMatchesOwnedAsset(task);
          await this.deleteAndConfirm(task.bucket, task.objectKey);
          await this.repository.completeCleanup(task.id, task.assetId);
        }
        completed += 1;
      } catch (error) {
        if (!task.idempotencyKey) {
          try {
            await this.repository.failCleanup(task.id, errorMessage(error), this.nextCleanupAttempt(task.attemptCount + 1));
          } catch {
            // The task remains durable. A future run will reclaim it once its
            // lease/backoff permits rather than risking an untracked delete.
          }
        }
        failed += 1;
      }
    }
    return { attempted: tasks.length, completed, failed };
  }

  /**
   * Advances durable story-deletion jobs. The story tombstone is the
   * structured-data recovery policy: normalized descendants remain attached
   * to an inaccessible DELETED story until an explicit retention purge is
   * introduced. Media bodies are removed before the job can finalize.
   */
  async runStoryDeletionCleanup(
    limit = 100,
  ): Promise<{ attempted: number; completed: number; failed: number }> {
    const jobs = await this.repository.listStoryDeletionJobs(limit);
    let completed = 0;
    let failed = 0;

    for (const job of jobs) {
      const leaseOwner = this.createId();
      let stage = job.currentStage;
      try {
        await this.repository.claimStoryDeletionJob(
          job,
          leaseOwner,
          new Date(this.now().getTime() + this.cleanupLeaseMs).toISOString(),
        );

        if (stage === 'TOMBSTONE') {
          await this.repository.advanceStoryDeletionJob(
            job.id,
            leaseOwner,
            'TOMBSTONE',
            'STRUCTURED_DATA',
          );
          stage = 'STRUCTURED_DATA';
        }

        if (stage === 'STRUCTURED_DATA') {
          // AdminDeleteOwnedStory already applied the owner-scoped tombstone
          // transactionally. Keeping its relational descendants is the
          // documented recovery policy; every normal query excludes DELETED.
          await this.repository.advanceStoryDeletionJob(
            job.id,
            leaseOwner,
            'STRUCTURED_DATA',
            'MEDIA',
          );
          stage = 'MEDIA';
        }

        if (stage === 'MEDIA') {
          await this.cleanupStoryMedia(job);
          await this.repository.advanceStoryDeletionJob(
            job.id,
            leaseOwner,
            'MEDIA',
            'LOCAL_CACHE',
          );
          stage = 'LOCAL_CACHE';
        }

        if (stage === 'LOCAL_CACHE') {
          // The deleting browser clears its owner-scoped IndexedDB records and
          // outbox in the same application flow. Remote clients receive the
          // durable DELETED StoryChange tombstone and clear on reconciliation.
          await this.repository.advanceStoryDeletionJob(
            job.id,
            leaseOwner,
            'LOCAL_CACHE',
            'FINALIZE',
          );
          stage = 'FINALIZE';
        }

        await this.repository.completeStoryDeletionJob(job.id, leaseOwner);
        completed += 1;
      } catch (error) {
        try {
          await this.repository.failStoryDeletionJob(
            job.id,
            leaseOwner,
            stage,
            errorMessage(error),
          );
        } catch {
          // A lost lease or failed status write leaves the durable job
          // claimable after its lease expires.
        }
        failed += 1;
      }
    }

    return { attempted: jobs.length, completed, failed };
  }

  /** Permanently remove completed story tombstones after a bounded recovery window. */
  async runStoryTombstonePurge(
    retentionMs = 30 * 24 * 60 * 60 * 1000,
    limit = 100,
  ): Promise<{ attempted: number; completed: number; failed: number }> {
    if (!Number.isSafeInteger(retentionMs) || retentionMs < 24 * 60 * 60 * 1000) {
      throw new Error('Story tombstone retention must be at least one day.');
    }
    const completedBefore = new Date(this.now().getTime() - retentionMs).toISOString();
    const jobs = await this.repository.listExpiredStoryTombstones(completedBefore, limit);
    let completed = 0;
    let failed = 0;
    for (const job of jobs) {
      try {
        await this.repository.purgeExpiredStoryTombstone(job.id, job.storyId, completedBefore);
        completed += 1;
      } catch {
        failed += 1;
      }
    }
    return { attempted: jobs.length, completed, failed };
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

  private async cleanupStoryMedia(job: StoryDeletionJobState): Promise<void> {
    const candidates = await this.repository.listStoryDeletionMediaCandidates(
      job.ownerUid,
      job.storyId,
      1_000,
    );
    const dueTasks = await this.repository.listCleanupTasks(1_000);

    for (const candidate of candidates) {
      assertIsolatedUserMediaObjectKey(candidate.objectKey);
      const idempotencyKey = `story-delete:${job.id}:${candidate.id}`;

      if (candidate.status === 'READY' || candidate.status === 'ARCHIVED') {
        const task: MediaCleanupWorkItem = {
          id: this.createId(),
          assetId: candidate.id,
          ownerUid: job.ownerUid,
          bucket: candidate.bucket,
          objectKey: candidate.objectKey,
          reason: 'story-delete',
          idempotencyKey,
          status: 'PENDING',
          attemptCount: 0,
          nextAttemptAt: this.now().toISOString(),
          createdAt: this.now().toISOString(),
        };
        await this.repository.ensureDeletionIntent({
          taskId: task.id,
          ownerUid: job.ownerUid,
          assetId: candidate.id,
          storyId: job.storyId,
          idempotencyKey,
          bucket: candidate.bucket,
          objectKey: candidate.objectKey,
          reason: task.reason,
        });
        await this.executeDeletionIntentCleanup(task);
        continue;
      }

      const existingTask = dueTasks.find((task) => (
        task.assetId === candidate.id
        && task.ownerUid === job.ownerUid
        && task.bucket === candidate.bucket
        && task.objectKey === candidate.objectKey
      ));
      if (existingTask) {
        if (existingTask.idempotencyKey) {
          await this.executeDeletionIntentCleanup(existingTask);
        } else {
          await this.assertCleanupTaskMatchesOwnedAsset(existingTask);
          await this.deleteAndConfirm(existingTask.bucket, existingTask.objectKey);
          await this.repository.completeCleanup(existingTask.id, candidate.id);
        }
        continue;
      }

      const taskId = await this.repository.requestUncommittedDeletion(
        job.ownerUid,
        candidate.id,
        candidate.bucket,
        candidate.objectKey,
      );
      await this.deleteAndConfirm(candidate.bucket, candidate.objectKey);
      await this.repository.completeCleanup(taskId, candidate.id);
    }
  }

  private async executeDeletionIntentCleanup(task: MediaCleanupWorkItem): Promise<void> {
    if (!task.assetId || !task.idempotencyKey) {
      throw new Error('Deletion cleanup task is missing its durable intent identity.');
    }
    const leaseOwner = this.createId();
    let claimed = false;
    try {
      await this.repository.claimDeletionCleanupTask(
        task,
        leaseOwner,
        new Date(this.now().getTime() + this.cleanupLeaseMs).toISOString(),
      );
      claimed = true;
      await this.assertCleanupTaskMatchesOwnedAsset(task);
      await this.deleteAndConfirm(task.bucket, task.objectKey);
      await this.repository.completeDeletionIntent(task, leaseOwner);
    } catch (error) {
      if (claimed) {
        try {
          await this.repository.failDeletionIntent(
            task,
            leaseOwner,
            errorMessage(error),
            this.nextCleanupAttempt(task.attemptCount + 1),
          );
        } catch {
          // Retain the leased task. It becomes claimable again after expiry.
        }
      }
      throw error;
    }
  }

  private async assertCleanupTaskMatchesOwnedAsset(task: MediaCleanupWorkItem): Promise<void> {
    if (!task.assetId) throw new Error('Cleanup task is missing its media asset.');
    assertIsolatedUserMediaObjectKey(task.objectKey);
    const asset = await this.repository.getOwned(task.ownerUid, task.assetId);
    if (!asset) throw new Error('Cleanup task media asset was not found for its owner.');
    if (asset.bucket !== task.bucket || asset.objectKey !== task.objectKey) {
      throw new Error('Cleanup task object identity does not match its owned media asset.');
    }
    if (asset.status !== 'PENDING_CLEANUP') {
      throw new Error('Cleanup task media asset is not pending cleanup.');
    }
  }

  private async deleteAndConfirm(bucket: string, objectKey: string): Promise<void> {
    assertIsolatedUserMediaObjectKey(objectKey);
    await this.objectStore.delete(bucket, objectKey);
    if (await this.objectStore.head(bucket, objectKey)) {
      throw new Error('R2 still reports the object after deletion.');
    }
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
      deliveryUrl: await this.objectStore.getDeliveryUrl(
        record.bucket,
        record.objectKey,
        record.visibility,
        DELIVERY_URL_TTL_SECONDS,
      ),
      deliveryUrlExpiresAt: record.visibility === 'PRIVATE'
        ? new Date(this.now().getTime() + DELIVERY_URL_TTL_SECONDS * 1_000).toISOString()
        : null,
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
  ): Promise<{ ready?: MediaAssetRecord; recoverable: boolean; releaseQuota: boolean }> {
    let current: MediaAssetRecord | null;
    try {
      current = await this.repository.getOwned(ownerUid, reservation.id);
    } catch (readbackError) {
      try {
        await this.writeEmergencyMarker(ownerUid, reservation, 'commit-outcome-unknown', error, readbackError);
        return { recoverable: true, releaseQuota: false };
      } catch {
        return { recoverable: false, releaseQuota: false };
      }
    }
    if (current?.status === 'READY') return { ready: current, recoverable: true, releaseQuota: false };

    try {
      await this.repository.markPendingCleanup(ownerUid, reservation.id, reservation.bucket, reservation.objectKey, 'database-commit-failed-after-r2-upload', errorMessage(error));
      return { recoverable: true, releaseQuota: true };
    } catch (databaseRecoveryError) {
      try {
        await this.writeEmergencyMarker(ownerUid, reservation, 'commit-outcome-unknown', error, databaseRecoveryError);
        return { recoverable: true, releaseQuota: false };
      } catch {
        return { recoverable: false, releaseQuota: false };
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
