// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type {
  MediaAssetRecord,
  MediaAssociation,
  MediaOwner,
  SaveMediaAssetRequest,
  StorageUsageRow,
} from '../../contracts/mediaAssets';
import type {
  MediaAssetRepository,
  MediaAssetReservation,
  MediaCleanupWorkItem,
  MediaDeletionIntentRequest,
  MediaDeletionIntentState,
  MediaQuotaReservation,
  MediaQuotaReservationState,
  MediaSlotCommit,
  MediaSlotHistoryEntry,
  MediaSlotState,
  MediaUploadReceipt,
  StoryDeletionJobState,
  StoryDeletionMediaCandidate,
  StoryDeletionStage,
} from './mediaAssetRepository';
import { buildMediaStorageReport, MediaAssetService, MediaAssetServiceError, type MediaAssetServiceOptions } from './mediaAssetService';
import type { CleanupMarker, MediaObjectStore, PutMediaObjectInput, StoredObjectMetadata } from './r2ObjectStore';

const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const OWNER: MediaOwner = { uid: 'owner-a', email: 'amaurylindy@gmail.com', displayName: 'Owner', role: 'owner' };

class FakeRepository implements MediaAssetRepository {
  records = new Map<string, MediaAssetRecord>();
  tasks = new Map<string, MediaCleanupWorkItem>();
  deletionIntents = new Map<string, MediaDeletionIntentState>();
  storyDeletionJobs = new Map<string, StoryDeletionJobState>();
  receipts = new Map<string, MediaUploadReceipt>();
  slots = new Map<string, MediaSlotState>();
  histories = new Map<string, MediaSlotHistoryEntry[]>();
  quotaReservations = new Set<string>();
  quotaStates = new Map<string, MediaQuotaReservationState>();
  releasedQuotaReservations: string[] = [];
  failAuthorization = false;
  failQuota = false;
  quotaThenThrow = false;
  failReserve = false;
  reserveThenThrow = false;
  failCommit = false;
  commitThenThrow = false;
  failPendingCleanup = false;
  failGenerationAuthorization = false;
  failedIds: string[] = [];
  pendingIds: string[] = [];
  taskCounter = 0;

  async assertAssociationOwned(): Promise<void> {
    if (this.failAuthorization) throw new Error('not owner');
  }

  async assertGenerationJobOwned(): Promise<void> {
    if (this.failGenerationAuthorization) throw new Error('generation job not owned');
  }

  async getUploadReceipt(ownerUid: string, idempotencyKey: string): Promise<MediaUploadReceipt | null> {
    return this.receipts.get(`${ownerUid}:${idempotencyKey}`) ?? null;
  }

  async getOwnedSlot(ownerUid: string, association: MediaAssociation): Promise<MediaSlotState | null> {
    return this.slots.get(this.slotKey(ownerUid, association)) ?? null;
  }

  async listOwnedSlotHistory(ownerUid: string, association: MediaAssociation): Promise<MediaSlotHistoryEntry[]> {
    return this.histories.get(this.slotKey(ownerUid, association)) ?? [];
  }

  async getOwnedQuotaReservation(ownerUid: string, idempotencyKey: string): Promise<MediaQuotaReservationState | null> {
    return this.quotaStates.get(`${ownerUid}:${idempotencyKey}`) ?? null;
  }

  async reserveQuota(ownerUid: string, reservation: MediaQuotaReservation): Promise<void> {
    if (this.failQuota) throw new Error('Storage quota exceeded');
    const receiptKey = `${ownerUid}:${reservation.idempotencyKey}`;
    if ([...this.quotaReservations].some((value) => value.startsWith(`${receiptKey}:`))) {
      throw new Error('Quota idempotency key already reserved');
    }
    this.quotaReservations.add(`${receiptKey}:${reservation.id}`);
    this.quotaStates.set(receiptKey, {
      ...reservation,
      ownerUid,
      status: 'RESERVED',
      createdAt: '2026-07-21T00:00:00.000Z',
      updatedAt: '2026-07-21T00:00:00.000Z',
    });
    if (this.quotaThenThrow) throw new Error('quota reservation response lost');
  }

  async releaseQuota(_ownerUid: string, reservationId: string): Promise<void> {
    this.releasedQuotaReservations.push(reservationId);
    for (const value of this.quotaReservations) {
      if (value.endsWith(`:${reservationId}`)) this.quotaReservations.delete(value);
    }
    for (const [key, state] of this.quotaStates) {
      if (state.id === reservationId) this.quotaStates.set(key, { ...state, status: 'RELEASED' });
    }
  }

  async reserve(_owner: MediaOwner, reservation: MediaAssetReservation): Promise<MediaAssetRecord> {
    if (this.failReserve) throw new Error('reserve failed');
    const {
      sourceKind: _sourceKind,
      quotaReservationId: _quotaReservationId,
      idempotencyKey,
      requestHash,
      ...recordFields
    } = reservation;
    const record: MediaAssetRecord = {
      ...recordFields,
      status: 'UPLOADING',
      createdAt: '2026-07-21T00:00:00.000Z',
      updatedAt: '2026-07-21T00:00:00.000Z',
    };
    this.records.set(record.id, record);
    this.receipts.set(`${record.ownerUid}:${idempotencyKey}`, {
      assetId: record.id,
      requestHash,
      status: 'uploading',
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
    if (this.reserveThenThrow) throw new Error('asset reservation response lost');
    return record;
  }

  async getOwned(ownerUid: string, assetId: string): Promise<MediaAssetRecord | null> {
    const record = this.records.get(assetId);
    return record?.ownerUid === ownerUid ? record : null;
  }

  async commitToSlot(ownerUid: string, assetId: string, _etag: string | undefined, commit: MediaSlotCommit): Promise<MediaAssetRecord> {
    if (this.failCommit) throw new Error('commit failed');
    const record = await this.required(ownerUid, assetId);
    const key = this.slotKey(ownerUid, commit.association);
    const current = this.slots.get(key);
    if ((current?.currentAssetId ?? null) !== (commit.expectedCurrentAssetId ?? null)
      || (current?.version ?? null) !== (commit.expectedSlotVersion ?? null)) {
      throw new Error('Media slot expected version is stale');
    }
    const ready = { ...record, status: 'READY' as const, readyAt: '2026-07-21T00:00:00.000Z' };
    this.records.set(assetId, ready);
    const history: MediaSlotHistoryEntry[] = (this.histories.get(key) ?? []).map((entry) => ({
      ...entry,
      isCurrent: false,
      endedAt: '2026-07-21T00:00:00.000Z',
    }));
    history.push({
      id: commit.attachmentId,
      assetId,
      storyId: commit.association.storyId,
      chapterId: commit.association.chapterId,
      entityId: commit.association.entityId,
      historyEntityType: commit.association.entityType,
      clientHistoryId: commit.association.clientHistoryId ?? commit.association.legacyMediaId,
      promptUsed: commit.association.promptUsed,
      chapterNumber: commit.association.chapterNumber,
      arcTitle: commit.association.arcTitle,
      label: commit.association.label,
      position: commit.position,
      isCurrent: true,
      createdAt: '2026-07-21T00:00:00.000Z',
    });
    this.histories.set(key, history);
    this.slots.set(key, {
      ownerUid,
      storyId: commit.association.storyId,
      chapterId: commit.association.chapterId,
      entityId: commit.association.entityId,
      targetKind: commit.association.targetKind,
      targetKey: commit.association.targetKey,
      purpose: commit.association.purpose,
      currentAssetId: assetId,
      version: commit.newSlotVersion,
      updatedAt: '2026-07-21T00:00:00.000Z',
    });
    const receiptKey = `${ownerUid}:${commit.idempotencyKey}`;
    const receipt = this.receipts.get(receiptKey)!;
    this.receipts.set(receiptKey, { ...receipt, status: 'succeeded' });
    if (this.commitThenThrow) throw new Error('commit response lost');
    return ready;
  }

  async selectOwnedSlotAsset(ownerUid: string, assetId: string, association: MediaAssociation, expectedSlot: MediaSlotState): Promise<MediaAssetRecord> {
    const key = this.slotKey(ownerUid, association);
    const current = this.slots.get(key);
    if (!current || current.version !== expectedSlot.version || current.currentAssetId !== expectedSlot.currentAssetId) {
      throw new Error('Media slot expected version is stale');
    }
    const history = this.histories.get(key) ?? [];
    if (!history.some((entry) => entry.assetId === assetId)) throw new Error('History attachment not found');
    this.histories.set(key, history.map((entry) => ({
      ...entry,
      isCurrent: entry.assetId === assetId,
      endedAt: entry.assetId === assetId ? null : (entry.endedAt ?? '2026-07-21T00:00:00.000Z'),
    })));
    this.slots.set(key, {
      ...current,
      currentAssetId: assetId,
      version: (BigInt(current.version) + 1n).toString(),
    });
    return this.required(ownerUid, assetId);
  }

  async markFailed(_ownerUid: string, assetId: string, code: string, message: string): Promise<void> {
    this.failedIds.push(assetId);
    const record = this.records.get(assetId)!;
    this.records.set(assetId, { ...record, status: 'FAILED', failureCode: code, failureMessage: message });
  }

  async markPendingCleanup(ownerUid: string, assetId: string, bucket: string, objectKey: string, reason: string): Promise<string> {
    if (this.failPendingCleanup) throw new Error('database unavailable');
    this.pendingIds.push(assetId);
    const record = await this.required(ownerUid, assetId);
    if (record.status !== 'UPLOADING') throw new Error('asset is not uploading');
    this.records.set(assetId, { ...record, status: 'PENDING_CLEANUP' });
    return this.addTask(assetId, ownerUid, bucket, objectKey, reason);
  }

  async requestUncommittedDeletion(ownerUid: string, assetId: string, bucket: string, objectKey: string): Promise<string> {
    const record = await this.required(ownerUid, assetId);
    this.records.set(assetId, { ...record, status: 'PENDING_CLEANUP' });
    return this.addTask(assetId, ownerUid, bucket, objectKey, 'user-delete');
  }

  async getDeletionIntent(ownerUid: string, idempotencyKey: string): Promise<MediaDeletionIntentState | null> {
    return this.deletionIntents.get(`${ownerUid}:${idempotencyKey}`) ?? null;
  }

  async ensureDeletionIntent(request: MediaDeletionIntentRequest): Promise<void> {
    const record = await this.required(request.ownerUid, request.assetId);
    if (!['READY', 'ARCHIVED'].includes(record.status)) throw new Error('asset is not committed');
    this.records.set(request.assetId, { ...record, status: 'PENDING_CLEANUP' });
    const now = '2026-07-21T00:00:00.000Z';
    this.deletionIntents.set(`${request.ownerUid}:${request.idempotencyKey}`, {
      ownerUid: request.ownerUid,
      idempotencyKey: request.idempotencyKey,
      assetId: request.assetId,
      storyId: request.storyId,
      reason: request.reason,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
    });
    this.tasks.set(request.taskId, {
      id: request.taskId,
      assetId: request.assetId,
      ownerUid: request.ownerUid,
      bucket: request.bucket,
      objectKey: request.objectKey,
      reason: request.reason,
      idempotencyKey: request.idempotencyKey,
      status: 'PENDING',
      attemptCount: 0,
      nextAttemptAt: now,
      createdAt: now,
    });
  }

  async claimDeletionCleanupTask(
    task: MediaCleanupWorkItem,
    leaseOwner: string,
    leaseExpiresAt: string,
  ): Promise<void> {
    const stored = this.tasks.get(task.id);
    if (!stored || !stored.idempotencyKey) throw new Error('cleanup task not found');
    this.tasks.set(task.id, {
      ...stored,
      status: 'RUNNING',
      leaseOwner,
      leaseExpiresAt,
      attemptCount: stored.attemptCount + 1,
    });
    const key = `${stored.ownerUid}:${stored.idempotencyKey}`;
    const intent = this.deletionIntents.get(key)!;
    this.deletionIntents.set(key, { ...intent, status: 'RUNNING' });
  }

  async completeDeletionIntent(task: MediaCleanupWorkItem, leaseOwner: string): Promise<void> {
    if (!task.assetId || !task.idempotencyKey) throw new Error('cleanup identity missing');
    const stored = this.tasks.get(task.id);
    if (stored?.leaseOwner !== leaseOwner) throw new Error('cleanup lease not held');
    this.tasks.set(task.id, { ...stored, status: 'SUCCEEDED', leaseOwner: null, leaseExpiresAt: null });
    const record = await this.required(task.ownerUid, task.assetId);
    this.records.set(task.assetId, {
      ...record,
      status: 'DELETED',
      deletedAt: '2026-07-21T00:00:00.000Z',
    });
    const key = `${task.ownerUid}:${task.idempotencyKey}`;
    const intent = this.deletionIntents.get(key)!;
    this.deletionIntents.set(key, {
      ...intent,
      status: 'SUCCEEDED',
      completedAt: '2026-07-21T00:00:00.000Z',
    });
  }

  async failDeletionIntent(
    task: MediaCleanupWorkItem,
    leaseOwner: string,
    message: string,
    nextAttemptAt: string,
  ): Promise<void> {
    if (!task.idempotencyKey) throw new Error('cleanup identity missing');
    const stored = this.tasks.get(task.id);
    if (stored?.leaseOwner !== leaseOwner) throw new Error('cleanup lease not held');
    this.tasks.set(task.id, {
      ...stored,
      status: 'FAILED',
      leaseOwner: null,
      leaseExpiresAt: null,
      lastError: message,
      nextAttemptAt,
    });
    const key = `${task.ownerUid}:${task.idempotencyKey}`;
    const intent = this.deletionIntents.get(key)!;
    this.deletionIntents.set(key, { ...intent, status: 'FAILED', lastError: message });
  }

  async listStaleUploads(staleBefore: string): Promise<MediaAssetRecord[]> {
    return [...this.records.values()].filter((record) => record.status === 'UPLOADING' && record.updatedAt <= staleBefore);
  }

  async listCleanupTasks(): Promise<MediaCleanupWorkItem[]> {
    return [...this.tasks.values()].filter((task) => task.status === 'PENDING' || task.status === 'FAILED');
  }

  async completeCleanup(taskId: string, assetId: string): Promise<void> {
    const task = this.tasks.get(taskId)!;
    this.tasks.set(taskId, { ...task, status: 'SUCCEEDED' });
    const record = this.records.get(assetId)!;
    this.records.set(assetId, { ...record, status: 'DELETED', deletedAt: '2026-07-21T00:00:00.000Z' });
  }

  async failCleanup(taskId: string, message: string, nextAttemptAt: string): Promise<void> {
    const task = this.tasks.get(taskId)!;
    this.tasks.set(taskId, { ...task, status: 'FAILED', lastError: message, nextAttemptAt, attemptCount: task.attemptCount + 1 });
  }

  async listStoryDeletionJobs(): Promise<StoryDeletionJobState[]> {
    return [...this.storyDeletionJobs.values()].filter((job) => job.status !== 'SUCCEEDED');
  }

  async claimStoryDeletionJob(
    job: StoryDeletionJobState,
    leaseOwner: string,
    leaseExpiresAt: string,
  ): Promise<void> {
    this.storyDeletionJobs.set(job.id, { ...job, status: 'RUNNING', leaseOwner, leaseExpiresAt });
  }

  async advanceStoryDeletionJob(
    jobId: string,
    leaseOwner: string,
    _completedStage: StoryDeletionStage,
    nextStage: StoryDeletionStage,
  ): Promise<void> {
    const job = this.storyDeletionJobs.get(jobId)!;
    if (job.leaseOwner !== leaseOwner) throw new Error('story deletion lease not held');
    this.storyDeletionJobs.set(jobId, { ...job, currentStage: nextStage });
  }

  async failStoryDeletionJob(
    jobId: string,
    leaseOwner: string,
    stage: StoryDeletionStage,
    message: string,
  ): Promise<void> {
    const job = this.storyDeletionJobs.get(jobId)!;
    if (job.leaseOwner !== leaseOwner) throw new Error('story deletion lease not held');
    this.storyDeletionJobs.set(jobId, {
      ...job,
      status: 'FAILED',
      currentStage: stage,
      leaseOwner: null,
      leaseExpiresAt: null,
      lastError: message,
    });
  }

  async completeStoryDeletionJob(jobId: string, leaseOwner: string): Promise<void> {
    const job = this.storyDeletionJobs.get(jobId)!;
    if (job.leaseOwner !== leaseOwner) throw new Error('story deletion lease not held');
    this.storyDeletionJobs.set(jobId, {
      ...job,
      status: 'SUCCEEDED',
      currentStage: 'FINALIZE',
      leaseOwner: null,
      leaseExpiresAt: null,
      completedAt: '2026-07-21T00:00:00.000Z',
    });
  }

  async listStoryDeletionMediaCandidates(
    ownerUid: string,
    storyId: string,
  ): Promise<StoryDeletionMediaCandidate[]> {
    return [...this.records.values()]
      .filter((record) => record.ownerUid === ownerUid && record.storyId === storyId && record.status !== 'DELETED')
      .map((record) => ({
        id: record.id,
        ownerUid: record.ownerUid,
        storyId: record.storyId,
        status: record.status,
        bucket: record.bucket,
        objectKey: record.objectKey,
      }));
  }

  async listExpiredStoryTombstones(
    completedBefore: string,
  ): Promise<StoryDeletionJobState[]> {
    return [...this.storyDeletionJobs.values()].filter((job) =>
      job.status === 'SUCCEEDED'
      && Boolean(job.completedAt)
      && job.completedAt! <= completedBefore);
  }

  async purgeExpiredStoryTombstone(
    jobId: string,
    _storyId: string,
    completedBefore: string,
  ): Promise<void> {
    const job = this.storyDeletionJobs.get(jobId);
    if (!job?.completedAt || job.completedAt > completedBefore) {
      throw new Error('retention not expired');
    }
    this.storyDeletionJobs.delete(jobId);
  }

  async listStorageUsage(): Promise<StorageUsageRow[]> {
    return [...this.records.values()].map((record) => ({
      id: record.id,
      ownerUid: record.ownerUid,
      storyId: record.storyId,
      assetType: record.assetType,
      status: record.status,
      byteSize: record.byteSize,
      mimeType: record.mimeType,
      objectKey: record.objectKey,
      createdAt: record.createdAt,
    }));
  }

  seed(record: MediaAssetRecord): void {
    this.records.set(record.id, record);
    if (record.status === 'READY' && record.storyId) {
      const association: MediaAssociation = {
        targetKind: 'STORY',
        targetKey: record.storyId,
        purpose: record.purpose,
        storyId: record.storyId,
      };
      const key = this.slotKey(record.ownerUid, association);
      this.slots.set(key, {
        ownerUid: record.ownerUid,
        storyId: record.storyId,
        targetKind: association.targetKind,
        targetKey: association.targetKey,
        purpose: association.purpose,
        currentAssetId: record.id,
        version: record.version.toString(),
        updatedAt: record.updatedAt,
      });
      this.histories.set(key, [{
        id: `attachment-${record.id}`,
        assetId: record.id,
        storyId: record.storyId,
        position: record.version,
        isCurrent: true,
        createdAt: record.createdAt,
      }]);
    }
  }

  private slotKey(ownerUid: string, association: MediaAssociation): string {
    return `${ownerUid}:${association.targetKind}:${association.targetKey}:${association.purpose}`;
  }

  private async required(ownerUid: string, id: string): Promise<MediaAssetRecord> {
    const record = await this.getOwned(ownerUid, id);
    if (!record) throw new Error('not found');
    return record;
  }

  private addTask(assetId: string, ownerUid: string, bucket: string, objectKey: string, reason: string): string {
    const id = `task-${++this.taskCounter}`;
    this.tasks.set(id, {
      id,
      assetId,
      ownerUid,
      bucket,
      objectKey,
      reason,
      status: 'PENDING',
      attemptCount: 0,
      nextAttemptAt: '2026-07-21T00:00:00.000Z',
      createdAt: '2026-07-21T00:00:00.000Z',
    });
    return id;
  }
}

class FakeObjectStore implements MediaObjectStore {
  objects = new Map<string, StoredObjectMetadata>();
  markers: CleanupMarker[] = [];
  putCalls = 0;
  failPut = false;
  failDelete = false;
  publicDeliveryConfigured = true;

  assertDeliveryConfigured(visibility: 'PRIVATE' | 'PUBLIC'): void {
    if (visibility === 'PUBLIC' && !this.publicDeliveryConfigured) throw new Error('public delivery missing');
  }

  bucketFor(visibility: 'PRIVATE' | 'PUBLIC'): string {
    this.assertDeliveryConfigured(visibility);
    return visibility === 'PUBLIC' ? 'test-public-bucket' : 'test-bucket';
  }

  async put(input: PutMediaObjectInput): Promise<{ etag?: string }> {
    this.putCalls += 1;
    if (this.failPut) throw new Error('R2 put failed');
    this.objects.set(input.objectKey, {
      byteSize: input.bytes.byteLength,
      checksumSha256: input.checksumSha256,
      mimeType: input.mimeType,
      etag: 'etag',
    });
    return { etag: 'etag' };
  }

  async head(_bucket: string, objectKey: string): Promise<StoredObjectMetadata | null> {
    return this.objects.get(objectKey) ?? null;
  }

  async delete(_bucket: string, objectKey: string): Promise<void> {
    if (this.failDelete) throw new Error('R2 delete failed');
    this.objects.delete(objectKey);
  }

  async getDeliveryUrl(_bucket: string, objectKey: string): Promise<string> {
    return `https://clean-session.example/${encodeURIComponent(objectKey)}`;
  }

  async writeCleanupMarker(marker: CleanupMarker): Promise<string> {
    this.markers.push(marker);
    return `user-media/_cleanup/${marker.assetId}/marker.json`;
  }

  async listCleanupMarkerKeys(): Promise<string[]> {
    return this.markers.map((marker) => `user-media/_cleanup/${marker.assetId}/marker.json`);
  }

  async readCleanupMarker(markerKey: string): Promise<CleanupMarker> {
    const assetId = markerKey.split('/')[2];
    const marker = this.markers.find((entry) => entry.assetId === assetId);
    if (!marker) throw new Error('marker missing');
    return marker;
  }

  async deleteCleanupMarker(markerKey: string): Promise<void> {
    const assetId = markerKey.split('/')[2];
    this.markers = this.markers.filter((entry) => entry.assetId !== assetId);
  }
}

function createRequest(
  replacesAssetId?: string,
  idempotencyKey = '44444444-4444-4444-8444-444444444444',
  storyId = '11111111-1111-4111-8111-111111111111',
): SaveMediaAssetRequest {
  return {
    source: { kind: 'bytes' as const, bytes: PNG_1X1, mimeType: 'image/png', filename: 'cover.png' },
    assetType: 'IMAGE' as const,
    purpose: 'story-cover',
    visibility: 'PRIVATE' as const,
    replacesAssetId,
    idempotencyKey,
    association: {
      targetKind: 'STORY',
      targetKey: storyId,
      purpose: 'story-cover',
      storyId,
    },
  };
}

function readyRecord(id = 'old-asset'): MediaAssetRecord {
  return {
    id,
    ownerUid: OWNER.uid,
    storyId: '11111111-1111-4111-8111-111111111111',
    assetType: 'IMAGE',
    purpose: 'story-cover',
    visibility: 'PRIVATE',
    status: 'READY',
    bucket: 'test-bucket',
    objectKey: `user-media/private/owner/story/image/${id}.png`,
    mimeType: 'image/png',
    extension: 'png',
    byteSize: PNG_1X1.length.toString(),
    checksumSha256: 'a'.repeat(64),
    version: 1,
    cacheControl: 'private, max-age=0, no-store',
    createdAt: '2026-07-20T00:00:00.000Z',
    updatedAt: '2026-07-20T00:00:00.000Z',
    readyAt: '2026-07-20T00:00:00.000Z',
  };
}

function service(repo: FakeRepository, store: FakeObjectStore, extraOptions: MediaAssetServiceOptions = {}): MediaAssetService {
  return new MediaAssetService(repo, store, {
    createId: () => '22222222-2222-4222-8222-222222222222',
    now: () => new Date('2026-07-21T00:00:00.000Z'),
    emergencyMarkerGraceMs: 0,
    ...extraOptions,
  });
}

describe('MediaAssetService', () => {
  it('reports permanent success only after R2 confirmation and the database commit', async () => {
    const repo = new FakeRepository();
    const store = new FakeObjectStore();
    const descriptor = await service(repo, store).save(OWNER, createRequest());
    expect(descriptor.status).toBe('READY');
    expect(descriptor.deliveryUrl).toContain('clean-session.example');
    expect(descriptor.deliveryUrlExpiresAt).toBe('2026-07-21T00:15:00.000Z');
    expect(store.objects.size).toBe(1);
    expect(repo.records.get(descriptor.id)?.status).toBe('READY');
  });

  it('returns the original ready asset when an authenticated upload retry reuses its request key', async () => {
    const repo = new FakeRepository();
    const store = new FakeObjectStore();
    const s = service(repo, store);
    const request = createRequest();

    const first = await s.save(OWNER, request);
    const retry = await s.save(OWNER, request);

    expect(retry.id).toBe(first.id);
    expect(store.putCalls).toBe(1);
    expect(repo.records.size).toBe(1);
  });

  it('recovers lost quota and media reservation responses without duplicating the upload', async () => {
    const repo = new FakeRepository();
    const store = new FakeObjectStore();
    repo.quotaThenThrow = true;
    repo.reserveThenThrow = true;

    const descriptor = await service(repo, store).save(OWNER, createRequest());

    expect(descriptor.status).toBe('READY');
    expect(store.putCalls).toBe(1);
    expect(repo.records.size).toBe(1);
    expect(repo.releasedQuotaReservations).toEqual([]);
  });

  it('rejects reuse of an idempotency key for different media metadata', async () => {
    const repo = new FakeRepository();
    const store = new FakeObjectStore();
    const s = service(repo, store);
    const request = createRequest();
    await s.save(OWNER, request);

    await expect(s.save(OWNER, {
      ...request,
      association: { ...request.association, label: 'different history label' },
    })).rejects.toMatchObject({ code: 'idempotency_conflict' });
    expect(store.putCalls).toBe(1);
  });

  it('retains replacement history metadata and can select a prior owned asset as current', async () => {
    const repo = new FakeRepository();
    const store = new FakeObjectStore();
    const previous = readyRecord();
    repo.seed(previous);
    const request = createRequest(previous.id);
    request.association = {
      ...request.association,
      legacyMediaId: 'legacy-history-id',
      entityType: 'cover',
      promptUsed: 'A jade citadel beneath a storm.',
      chapterNumber: 12,
      arcTitle: 'Heavenfall',
      label: 'Storm cover',
    };
    const s = service(repo, store);

    const replacement = await s.save(OWNER, request);
    const history = [...repo.histories.values()][0];
    expect(history.at(-1)).toMatchObject({
      assetId: replacement.id,
      clientHistoryId: 'legacy-history-id',
      historyEntityType: 'cover',
      promptUsed: request.association.promptUsed,
      chapterNumber: 12,
      arcTitle: 'Heavenfall',
      label: 'Storm cover',
      isCurrent: true,
    });

    const selected = await s.select(OWNER.uid, previous.id, createRequest().association);
    expect(selected.id).toBe(previous.id);
    expect(repo.records.get(replacement.id)?.status).toBe('READY');
    expect(repo.records.get(previous.id)?.status).toBe('READY');
    expect([...repo.slots.values()][0].currentAssetId).toBe(previous.id);
    expect([...repo.histories.values()][0].filter((entry) => entry.isCurrent)).toHaveLength(1);
  });

  it('does not touch R2 when authorization or the database reservation fails', async () => {
    const repo = new FakeRepository();
    const store = new FakeObjectStore();
    repo.failAuthorization = true;
    await expect(service(repo, store).save(OWNER, createRequest())).rejects.toThrow('not owner');
    expect(store.putCalls).toBe(0);

    repo.failAuthorization = false;
    repo.failReserve = true;
    await expect(service(repo, store).save(OWNER, createRequest())).rejects.toMatchObject({ code: 'database_reservation_failed' });
    expect(store.putCalls).toBe(0);
  });

  it('rejects public media before reservation when public delivery is not configured', async () => {
    const repo = new FakeRepository();
    const store = new FakeObjectStore();
    store.publicDeliveryConfigured = false;

    await expect(service(repo, store).save(OWNER, { ...createRequest(), visibility: 'PUBLIC' })).rejects.toMatchObject({
      code: 'delivery_not_configured',
    });
    expect(repo.records.size).toBe(0);
    expect(store.putCalls).toBe(0);
  });

  it('binds public assets to the public bucket and key namespace', async () => {
    const repo = new FakeRepository();
    const store = new FakeObjectStore();

    const descriptor = await service(repo, store).save(OWNER, { ...createRequest(), visibility: 'PUBLIC' });
    const record = repo.records.get(descriptor.id)!;
    expect(record.bucket).toBe('test-public-bucket');
    expect(record.objectKey).toMatch(/^user-media\/public\//);
  });

  it('rejects public media requests from ordinary non-admin users', async () => {
    const repo = new FakeRepository();
    const store = new FakeObjectStore();
    const user: MediaOwner = { uid: 'ordinary-user', email: 'user@example.com', role: 'user' };

    await expect(service(repo, store).save(user, { ...createRequest(), visibility: 'PUBLIC' })).rejects.toMatchObject({
      code: 'public_storage_prohibited',
    });
  });

  it('enforces media upload rate limits per user', async () => {
    const repo = new FakeRepository();
    const store = new FakeObjectStore();
    const s = service(repo, store, { maxUploadsPerMinute: 2 });
    const user: MediaOwner = { uid: 'rate-user', email: 'user@example.com', role: 'user' };

    await s.save(user, createRequest(undefined, '44444444-4444-4444-8444-444444444441', '11111111-1111-4111-8111-111111111111'));
    await s.save(user, createRequest(undefined, '44444444-4444-4444-8444-444444444442', '11111111-1111-4111-8111-111111111112'));

    await expect(s.save(user, createRequest(undefined, '44444444-4444-4444-8444-444444444443', '11111111-1111-4111-8111-111111111113'))).rejects.toMatchObject({
      code: 'rate_limit_exceeded',
    });
  });

  it('enforces user media storage byte and count quotas', async () => {
    const repo = new FakeRepository();
    const store = new FakeObjectStore();
    const s = service(repo, store, { maxUserStorageBytes: 10n });
    const user: MediaOwner = { uid: 'quota-user', email: 'user@example.com', role: 'user' };

    await expect(s.save(user, createRequest())).rejects.toMatchObject({
      code: 'user_quota_exceeded',
    });
  });

  it('rejects malformed relational targets and generation jobs outside the owner scope', async () => {
    const repo = new FakeRepository();
    const store = new FakeObjectStore();
    const malformed = createRequest();
    malformed.association = {
      ...malformed.association,
      targetKind: 'CHAPTER',
      targetKey: 'foreign-chapter',
    };
    await expect(service(repo, store).save(OWNER, malformed)).rejects.toMatchObject({ code: 'invalid_metadata' });
    expect(store.putCalls).toBe(0);

    repo.failGenerationAuthorization = true;
    const foreignJob = { ...createRequest(), generationJobId: '33333333-3333-4333-8333-333333333333' };
    await expect(service(repo, store).save(OWNER, foreignJob)).rejects.toThrow(/generation job not owned/);
    expect(store.putCalls).toBe(0);
  });

  it('marks a failed upload without ever producing a ready asset', async () => {
    const repo = new FakeRepository();
    const store = new FakeObjectStore();
    store.failPut = true;
    await expect(service(repo, store).save(OWNER, createRequest())).rejects.toMatchObject({ code: 'upload_failed' });
    const record = repo.records.get('22222222-2222-4222-8222-222222222222');
    expect(record?.status).toBe('FAILED');
    expect(repo.failedIds).toEqual([record?.id]);
    expect(repo.releasedQuotaReservations).toHaveLength(1);
    expect(store.objects.size).toBe(0);
  });

  it('journals an R2 upload when the database commit fails', async () => {
    const repo = new FakeRepository();
    const store = new FakeObjectStore();
    repo.failCommit = true;
    await expect(service(repo, store).save(OWNER, createRequest())).rejects.toMatchObject({
      code: 'database_commit_failed',
      recoverable: true,
    });
    const id = '22222222-2222-4222-8222-222222222222';
    expect(repo.records.get(id)?.status).toBe('PENDING_CLEANUP');
    expect(repo.pendingIds).toEqual([id]);
    expect(store.objects.size).toBe(1);
  });

  it('writes an emergency reconciliation marker when the commit outcome cannot be journaled', async () => {
    const repo = new FakeRepository();
    const store = new FakeObjectStore();
    repo.failCommit = true;
    repo.failPendingCleanup = true;
    await expect(service(repo, store).save(OWNER, createRequest())).rejects.toMatchObject({ recoverable: true });
    expect(store.markers).toHaveLength(1);
    expect(store.markers[0].reason).toBe('commit-outcome-unknown');
    expect(store.objects.size).toBe(1);
  });

  it('reconciles emergency R2 markers after confirming no ready database asset exists', async () => {
    const repo = new FakeRepository();
    const store = new FakeObjectStore();
    const objectKey = 'user-media/owner/_account/image/asset/v1-a.png';
    store.objects.set(objectKey, { byteSize: 1, checksumSha256: 'a'.repeat(64) });
    store.markers.push({
      assetId: 'asset',
      ownerUid: OWNER.uid,
      bucket: store.bucketFor('PRIVATE'),
      objectKey,
      reason: 'database-and-immediate-cleanup-failed',
      createdAt: '2026-07-21T00:00:00.000Z',
    });

    await expect(service(repo, store).runEmergencyCleanup()).resolves.toEqual({ attempted: 1, completed: 1, failed: 0, deferred: 0 });
    expect(store.objects.has(objectKey)).toBe(false);
    expect(store.markers).toEqual([]);
  });

  it('retains emergency markers when cleanup still fails', async () => {
    const repo = new FakeRepository();
    const store = new FakeObjectStore();
    store.failDelete = true;
    store.markers.push({
      assetId: 'asset',
      ownerUid: OWNER.uid,
      bucket: store.bucketFor('PRIVATE'),
      objectKey: 'user-media/private/owner/_account/image/asset/v1-a.png',
      reason: 'database-and-immediate-cleanup-failed',
      createdAt: '2026-07-21T00:00:00.000Z',
    });

    await expect(service(repo, store).runEmergencyCleanup()).resolves.toEqual({ attempted: 1, completed: 0, failed: 1, deferred: 0 });
    expect(store.markers).toHaveLength(1);
  });

  it('preserves a READY object when an emergency marker came from a lost commit response', async () => {
    const repo = new FakeRepository();
    const store = new FakeObjectStore();
    const record = readyRecord('asset');
    repo.seed(record);
    store.objects.set(record.objectKey, { byteSize: Number(record.byteSize), checksumSha256: record.checksumSha256 });
    store.markers.push({
      assetId: record.id,
      ownerUid: record.ownerUid,
      bucket: record.bucket,
      objectKey: record.objectKey,
      reason: 'commit-outcome-unknown',
      createdAt: '2026-07-21T00:00:00.000Z',
    });

    await expect(service(repo, store).runEmergencyCleanup()).resolves.toEqual({ attempted: 1, completed: 1, failed: 0, deferred: 0 });
    expect(store.objects.has(record.objectKey)).toBe(true);
    expect(store.markers).toEqual([]);
  });

  it('treats a lost successful replacement response as success without cleaning the new object', async () => {
    const repo = new FakeRepository();
    const store = new FakeObjectStore();
    const previous = readyRecord();
    repo.seed(previous);
    store.objects.set(previous.objectKey, { byteSize: Number(previous.byteSize), checksumSha256: previous.checksumSha256 });
    repo.commitThenThrow = true;

    const descriptor = await service(repo, store).save(OWNER, createRequest(previous.id));

    expect(descriptor.status).toBe('READY');
    expect(repo.records.get(previous.id)?.status).toBe('READY');
    expect(repo.records.get(descriptor.id)?.status).toBe('READY');
    expect([...repo.slots.values()][0].currentAssetId).toBe(descriptor.id);
    expect([...repo.histories.values()][0].filter((entry) => entry.isCurrent)).toHaveLength(1);
    expect(repo.pendingIds).toEqual([]);
    expect(store.objects.has(repo.records.get(descriptor.id)!.objectKey)).toBe(true);
  });

  it('refuses replacement when the asset is no longer current in its slot', async () => {
    const repo = new FakeRepository();
    const store = new FakeObjectStore();
    const previous = readyRecord();
    repo.seed(previous);
    const slot = [...repo.slots.values()][0];
    slot.currentAssetId = 'a-different-current-asset';
    await expect(service(repo, store).save(OWNER, createRequest(previous.id))).rejects.toMatchObject({ code: 'replacement_slot_mismatch' });
    expect(store.putCalls).toBe(0);
  });

  it('sweeps stale reservations into failed or retryable cleanup states', async () => {
    const repo = new FakeRepository();
    const store = new FakeObjectStore();
    const missing = { ...readyRecord('stale-missing'), status: 'UPLOADING' as const };
    const uploaded = { ...readyRecord('stale-uploaded'), status: 'UPLOADING' as const };
    repo.seed(missing);
    repo.seed(uploaded);
    store.objects.set(uploaded.objectKey, { byteSize: Number(uploaded.byteSize), checksumSha256: uploaded.checksumSha256 });

    await expect(service(repo, store).runStaleUploadRecovery()).resolves.toEqual({
      inspected: 2,
      failedMarked: 1,
      cleanupQueued: 1,
      errors: 0,
    });
    expect(repo.records.get(missing.id)?.status).toBe('FAILED');
    expect(repo.records.get(uploaded.id)?.status).toBe('PENDING_CLEANUP');
  });

  it('keeps the current asset ready when a replacement commit fails', async () => {
    const repo = new FakeRepository();
    const store = new FakeObjectStore();
    const previous = readyRecord();
    repo.seed(previous);
    store.objects.set(previous.objectKey, { byteSize: Number(previous.byteSize), checksumSha256: previous.checksumSha256 });
    repo.failCommit = true;
    await expect(service(repo, store).save(OWNER, createRequest(previous.id))).rejects.toBeInstanceOf(MediaAssetServiceError);
    expect(repo.records.get(previous.id)?.status).toBe('READY');
    expect(repo.records.get('22222222-2222-4222-8222-222222222222')?.status).toBe('PENDING_CLEANUP');
  });

  it('marks deletion pending first, confirms R2 deletion, then closes the record', async () => {
    const repo = new FakeRepository();
    const store = new FakeObjectStore();
    const record = readyRecord();
    repo.seed(record);
    store.objects.set(record.objectKey, { byteSize: Number(record.byteSize), checksumSha256: record.checksumSha256 });
    await service(repo, store).delete(OWNER.uid, record.id);
    expect(store.objects.has(record.objectKey)).toBe(false);
    expect(repo.records.get(record.id)?.status).toBe('DELETED');
  });

  it('leaves a retryable cleanup task when object deletion fails', async () => {
    const repo = new FakeRepository();
    const store = new FakeObjectStore();
    const record = readyRecord();
    repo.seed(record);
    store.objects.set(record.objectKey, { byteSize: Number(record.byteSize), checksumSha256: record.checksumSha256 });
    store.failDelete = true;
    await expect(service(repo, store).delete(OWNER.uid, record.id)).rejects.toMatchObject({ code: 'delete_pending_cleanup', recoverable: true });
    expect(repo.records.get(record.id)?.status).toBe('PENDING_CLEANUP');
    expect([...repo.tasks.values()][0].status).toBe('FAILED');
  });

  it('finishes a tombstoned story deletion only after its R2 media is removed', async () => {
    const repo = new FakeRepository();
    const store = new FakeObjectStore();
    const record = readyRecord();
    repo.seed(record);
    store.objects.set(record.objectKey, {
      byteSize: Number(record.byteSize),
      checksumSha256: record.checksumSha256,
    });
    repo.storyDeletionJobs.set('deletion-job', {
      id: 'deletion-job',
      ownerUid: OWNER.uid,
      storyId: record.storyId!,
      idempotencyKey: 'delete-story',
      status: 'PENDING',
      currentStage: 'STRUCTURED_DATA',
      attemptCount: 0,
      createdAt: '2026-07-21T00:00:00.000Z',
      updatedAt: '2026-07-21T00:00:00.000Z',
    });

    await expect(service(repo, store).runStoryDeletionCleanup()).resolves.toEqual({
      attempted: 1,
      completed: 1,
      failed: 0,
    });
    expect(store.objects.has(record.objectKey)).toBe(false);
    expect(repo.records.get(record.id)?.status).toBe('DELETED');
    expect(repo.storyDeletionJobs.get('deletion-job')).toMatchObject({
      status: 'SUCCEEDED',
      currentStage: 'FINALIZE',
    });
  });

  it('purges completed story tombstones only after the 30-day recovery window', async () => {
    const repo = new FakeRepository();
    const store = new FakeObjectStore();
    repo.storyDeletionJobs.set('expired-job', {
      id: 'expired-job',
      ownerUid: OWNER.uid,
      storyId: '11111111-1111-4111-8111-111111111111',
      idempotencyKey: 'delete-expired',
      status: 'SUCCEEDED',
      currentStage: 'FINALIZE',
      attemptCount: 0,
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
      completedAt: '2026-05-01T00:00:00.000Z',
    });
    repo.storyDeletionJobs.set('recoverable-job', {
      id: 'recoverable-job',
      ownerUid: OWNER.uid,
      storyId: '22222222-2222-4222-8222-222222222222',
      idempotencyKey: 'delete-recoverable',
      status: 'SUCCEEDED',
      currentStage: 'FINALIZE',
      attemptCount: 0,
      createdAt: '2026-07-20T00:00:00.000Z',
      updatedAt: '2026-07-20T00:00:00.000Z',
      completedAt: '2026-07-20T00:00:00.000Z',
    });

    await expect(service(repo, store).runStoryTombstonePurge()).resolves.toEqual({
      attempted: 1,
      completed: 1,
      failed: 0,
    });
    expect(repo.storyDeletionJobs.has('expired-job')).toBe(false);
    expect(repo.storyDeletionJobs.has('recoverable-job')).toBe(true);
  });
});

describe('media storage reporting', () => {
  it('groups storage and exposes failure, cleanup, orphan, and large-file inspection', () => {
    const report = buildMediaStorageReport([
      { id: 'a', ownerUid: 'u1', storyId: 's1', assetType: 'IMAGE', status: 'READY', byteSize: '10', mimeType: 'image/png', objectKey: 'a', createdAt: 'now' },
      { id: 'b', ownerUid: 'u1', storyId: 's1', assetType: 'VIDEO', status: 'PENDING_CLEANUP', byteSize: '200', mimeType: 'video/mp4', objectKey: 'b', createdAt: 'now' },
      { id: 'c', ownerUid: 'u2', assetType: 'AUDIO', status: 'ORPHANED', byteSize: '30', mimeType: 'audio/mpeg', objectKey: 'c', createdAt: 'now' },
    ], 100n);
    expect(report.totalBytes).toBe('240');
    expect(report.byOwner).toEqual({ u1: '210', u2: '30' });
    expect(report.pendingCleanupAssets).toEqual(['b']);
    expect(report.orphanedAssets).toEqual(['c']);
    expect(report.unusuallyLargeAssets.map((row) => row.id)).toEqual(['b']);
  });
});
