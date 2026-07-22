// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type {
  MediaAssetRecord,
  MediaAssociation,
  MediaCleanupTask,
  MediaOwner,
  StorageUsageRow,
} from '../../contracts/mediaAssets';
import type { MediaAssetRepository, MediaAssetReservation } from './mediaAssetRepository';
import { buildMediaStorageReport, MediaAssetService, MediaAssetServiceError, type MediaAssetServiceOptions } from './mediaAssetService';
import type { CleanupMarker, MediaObjectStore, PutMediaObjectInput, StoredObjectMetadata } from './r2ObjectStore';

const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const OWNER: MediaOwner = { uid: 'owner-a', email: 'amaurylindy@gmail.com', displayName: 'Owner', role: 'owner' };

class FakeRepository implements MediaAssetRepository {
  records = new Map<string, MediaAssetRecord>();
  tasks = new Map<string, MediaCleanupTask>();
  failAuthorization = false;
  failReserve = false;
  failCommit = false;
  commitThenThrow = false;
  failPendingCleanup = false;
  failGenerationAuthorization = false;
  failReplacementSlot = false;
  replacementAttachmentCount = 1;
  failedIds: string[] = [];
  pendingIds: string[] = [];
  taskCounter = 0;

  async assertAssociationOwned(): Promise<void> {
    if (this.failAuthorization) throw new Error('not owner');
  }

  async assertGenerationJobOwned(): Promise<void> {
    if (this.failGenerationAuthorization) throw new Error('generation job not owned');
  }

  async assertReplacementSlotOwned(): Promise<void> {
    if (this.failReplacementSlot || this.replacementAttachmentCount !== 1) throw new Error('replacement slot mismatch');
  }

  async reserve(_owner: MediaOwner, reservation: MediaAssetReservation): Promise<MediaAssetRecord> {
    if (this.failReserve) throw new Error('reserve failed');
    const record: MediaAssetRecord = {
      ...reservation,
      status: 'UPLOADING',
      createdAt: '2026-07-21T00:00:00.000Z',
      updatedAt: '2026-07-21T00:00:00.000Z',
    };
    delete (record as MediaAssetRecord & { sourceKind?: string }).sourceKind;
    this.records.set(record.id, record);
    return record;
  }

  async getOwned(ownerUid: string, assetId: string): Promise<MediaAssetRecord | null> {
    const record = this.records.get(assetId);
    return record?.ownerUid === ownerUid ? record : null;
  }

  async commitReady(ownerUid: string, assetId: string): Promise<MediaAssetRecord> {
    if (this.failCommit) throw new Error('commit failed');
    const record = await this.required(ownerUid, assetId);
    const ready = { ...record, status: 'READY' as const, readyAt: '2026-07-21T00:00:00.000Z' };
    this.records.set(assetId, ready);
    if (this.commitThenThrow) throw new Error('commit response lost');
    return ready;
  }

  async commitReplacement(ownerUid: string, assetId: string, previous: MediaAssetRecord): Promise<MediaAssetRecord> {
    if (this.failCommit) throw new Error('replacement commit failed');
    const record = await this.required(ownerUid, assetId);
    const ready = { ...record, status: 'READY' as const, readyAt: '2026-07-21T00:00:00.000Z' };
    this.records.set(assetId, ready);
    this.records.set(previous.id, { ...previous, status: 'ARCHIVED', archivedAt: '2026-07-21T00:00:00.000Z' });
    if (this.commitThenThrow) throw new Error('replacement commit response lost');
    return ready;
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

  async requestDeletion(ownerUid: string, assetId: string, bucket: string, objectKey: string): Promise<string> {
    const record = await this.required(ownerUid, assetId);
    this.records.set(assetId, { ...record, status: 'PENDING_CLEANUP' });
    return this.addTask(assetId, ownerUid, bucket, objectKey, 'user-delete');
  }

  async listStaleUploads(staleBefore: string): Promise<MediaAssetRecord[]> {
    return [...this.records.values()].filter((record) => record.status === 'UPLOADING' && record.updatedAt <= staleBefore);
  }

  async listCleanupTasks(): Promise<MediaCleanupTask[]> {
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

function createRequest(replacesAssetId?: string) {
  return {
    source: { kind: 'bytes' as const, bytes: PNG_1X1, mimeType: 'image/png', filename: 'cover.png' },
    assetType: 'IMAGE' as const,
    purpose: 'story-cover',
    visibility: 'PRIVATE' as const,
    replacesAssetId,
    association: {
      targetKind: 'STORY',
      targetKey: '11111111-1111-4111-8111-111111111111',
      purpose: 'story-cover',
      storyId: '11111111-1111-4111-8111-111111111111',
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
    objectKey: `user-media/owner/story/image/${id}.png`,
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
    expect(store.objects.size).toBe(1);
    expect(repo.records.get(descriptor.id)?.status).toBe('READY');
  });

  it('does not touch R2 when authorization or the database reservation fails', async () => {
    const repo = new FakeRepository();
    const store = new FakeObjectStore();
    repo.failAuthorization = true;
    await expect(service(repo, store).save(OWNER, createRequest())).rejects.toThrow('not owner');
    expect(store.putCalls).toBe(0);

    repo.failAuthorization = false;
    repo.failReserve = true;
    await expect(service(repo, store).save(OWNER, createRequest())).rejects.toThrow('reserve failed');
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

    await s.save(user, createRequest());
    await s.save(user, createRequest());

    await expect(s.save(user, createRequest())).rejects.toMatchObject({
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
      objectKey: 'user-media/owner/_account/image/asset/v1-a.png',
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
    expect(repo.records.get(previous.id)?.status).toBe('ARCHIVED');
    expect(repo.records.get(descriptor.id)?.status).toBe('READY');
    expect(repo.pendingIds).toEqual([]);
    expect(store.objects.has(repo.records.get(descriptor.id)!.objectKey)).toBe(true);
  });

  it('refuses replacement when the old asset is shared or the slot does not match', async () => {
    const repo = new FakeRepository();
    const store = new FakeObjectStore();
    const previous = readyRecord();
    repo.seed(previous);
    repo.replacementAttachmentCount = 2;
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
