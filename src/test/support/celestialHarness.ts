/**
 * Production-shaped harness for Celestial Library journey tests.
 *
 * What is REAL here:
 *  - `PersistentStorageManager` (local replica, durable outbox, sync, conflicts)
 *  - `IndexedDBStorageAdapter` running on an in-memory IndexedDB engine
 *  - `IndexedDbFoundationCache` as the mutation outbox
 *  - `DataConnectStorageAdapter` including its permanent-media guard, patch
 *    diffing, idempotency keys and revision expectations
 *  - HTTP: a real Express server running the real `persistenceRouter`
 *  - `DataConnectApplicationRepository` and the whole `graphMapper`
 *
 * What is replaced: Firebase Auth (an external identity service) and the
 * PostgreSQL engine itself (`InMemoryDataConnect`, which applies the real row
 * manifests and enforces the same ownership/CAS/idempotency rules).
 */
import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { createPersistenceRouter } from '../../server/routes/persistenceRouter';
import {
  createMediaAssetRouter,
  type MediaAssetRouteService,
} from '../../server/routes/mediaAssetRouter';
import { DataConnectApplicationRepository } from '../../server/persistence/dataConnectApplicationRepository';
import {
  MediaAssetService,
} from '../../server/media/mediaAssetService';
import type {
  MediaAssetRepository,
  MediaAssetReservation,
  MediaQuotaReservation,
  MediaQuotaReservationState,
  MediaSlotCommit,
  MediaSlotHistoryEntry,
  MediaSlotState,
  MediaUploadReceipt,
} from '../../server/media/mediaAssetRepository';
import type {
  CleanupMarker,
  MediaObjectStore,
  PutMediaObjectInput,
  StoredObjectMetadata,
} from '../../server/media/r2ObjectStore';
import type {
  MediaAssetRecord,
  MediaAssociation,
  MediaOwner,
  StorageUsageRow,
} from '../../contracts/mediaAssets';
import { storyStorage } from '../../lib/storage';
import { PersistentStorageManager } from '../../lib/storage/persistentStorageManager';
import { IndexedDbFoundationCache } from '../../lib/foundation/cache/indexedDbFoundationCache';
import { resetPrivateMediaResolver } from '../../lib/media/privateMediaResolver';
import { canonicalAssetId } from '../../contracts/assetIdentity';
import { dataConnectStore } from './dataConnectAdminMock';
import { MemoryIndexedDbFactory } from './memoryIndexedDb';
import {
  resetTestAuth,
  signInTestUser,
  signOutTestUser,
  verifyTestIdToken,
} from './testAuth';

export interface CelestialHarness {
  /** The manager under test. Replaced by `reload()`. */
  storage: PersistentStorageManager;
  origin: string;
  store: typeof dataConnectStore;
  signIn(uid: string, email?: string): Promise<void>;
  signOut(): Promise<void>;
  /** Discard the manager and boot a new one over the same browser storage. */
  reload(): Promise<PersistentStorageManager>;
  /**
   * Boot a manager against empty browser storage while the account keeps every
   * record on the server — a second device, or a cleared cache.
   */
  newDevice(): Promise<PersistentStorageManager>;
  /**
   * Capture the active browser profile and return a switcher that reopens that
   * same IndexedDB/localStorage state later, after another device has run.
   */
  captureDevice(): () => Promise<PersistentStorageManager>;
  /** Flush the durable outbox and reconcile the catalog, as Harmony does. */
  sync(options?: { catalog?: boolean; deep?: boolean }): Promise<void>;
  /**
   * Publish a permanent image the way a committed upload does: real bytes in
   * the object store, a real SHA-256 checksum, a READY asset row, and a current
   * media slot plus attachment on the relational graph.
   */
  publishMedia(input: PublishMediaInput): Promise<string>;
  /** Publish account media without inventing a story slot or attachment. */
  publishAccountMedia(input: PublishMediaInput): Promise<string>;
  /** Fail the next real media-route call at one named lifecycle boundary. */
  failNextMediaStage(stage: MediaFailureStage): void;
  dispose(): Promise<void>;
}

export type MediaFailureStage = 'upload' | 'association' | 'database' | 'delivery';

export interface PublishMediaInput {
  assetId: string;
  ownerUid: string;
  storyId?: string | null;
  chapterId?: string | null;
  entityId?: string | null;
  targetKind: string;
  targetKey: string;
  purpose: string;
  body?: string;
  promptUsed?: string | null;
  clientHistoryId?: string | null;
  entityType?: string | null;
  chapterNumber?: number | null;
  arcTitle?: string | null;
  label?: string | null;
}

let server: Server | undefined;
let origin = '';
let indexedDb = new MemoryIndexedDbFactory();
let originalFetch: typeof globalThis.fetch | undefined;
/** Object bodies backing the delivery URLs, standing in for the R2 bucket. */
const mediaObjects = new Map<string, Buffer>();
let nextMediaFailure: MediaFailureStage | undefined;
const queuedMediaIds: string[] = [];
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

function consumeMediaFailure(stage: MediaFailureStage): boolean {
  if (nextMediaFailure !== stage) return false;
  nextMediaFailure = undefined;
  return true;
}

function mediaReceiptKey(ownerUid: string, idempotencyKey: string): string {
  return `${ownerUid}\u0000${idempotencyKey}`;
}

function normalizedAssociationTarget(association: MediaAssociation): string {
  return association.storyId || association.chapterId || association.entityId
    ? canonicalAssetId(association.targetKey)
    : association.targetKey;
}

/**
 * PostgreSQL boundary for the journey's real MediaAssetService.
 *
 * Lifecycle state that the service itself owns (reservations, receipts and
 * cleanup states) stays here. Successful commits are mirrored into
 * InMemoryDataConnect so the real application repository reads exactly the
 * slots and history rows that the upload service wrote.
 */
class JourneyMediaAssetRepository {
  private readonly records = new Map<string, MediaAssetRecord>();
  private readonly receipts = new Map<string, MediaUploadReceipt>();
  private readonly quota = new Map<string, MediaQuotaReservationState>();
  private cleanupSequence = 0;

  reset(): void {
    this.records.clear();
    this.receipts.clear();
    this.quota.clear();
    this.cleanupSequence = 0;
  }

  async assertAssociationOwned(
    ownerUid: string,
    association: MediaAssociation,
  ): Promise<void> {
    if (consumeMediaFailure('association')) {
      throw new Error('The media association target is not owned by the authenticated owner.');
    }
    dataConnectStore.assertOwnedMediaAssociation(ownerUid, association);
  }

  async assertGenerationJobOwned(): Promise<void> {
    // Generation jobs are not part of this image-restoration journey.
  }

  async getUploadReceipt(
    ownerUid: string,
    idempotencyKey: string,
  ): Promise<MediaUploadReceipt | null> {
    return this.receipts.get(mediaReceiptKey(ownerUid, idempotencyKey)) ?? null;
  }

  async getOwnedSlot(
    ownerUid: string,
    association: MediaAssociation,
  ): Promise<MediaSlotState | null> {
    const targetKey = normalizedAssociationTarget(association);
    const slot = dataConnectStore.mediaSlots.find(candidate =>
      candidate.ownerUid === ownerUid
      && candidate.targetKind === association.targetKind
      && normalizedAssociationTarget(candidate) === targetKey
      && candidate.purpose === association.purpose);
    return slot ? { ...slot } : null;
  }

  async listOwnedSlotHistory(
    ownerUid: string,
    association: MediaAssociation,
    limit = 100,
  ): Promise<MediaSlotHistoryEntry[]> {
    const targetKey = normalizedAssociationTarget(association);
    return dataConnectStore.mediaAttachments
      .filter(entry =>
        entry.ownerUid === ownerUid
        && entry.targetKind === association.targetKind
        && normalizedAssociationTarget(entry) === targetKey
        && entry.purpose === association.purpose)
      .slice(0, limit)
      .map(entry => ({
        id: entry.id,
        assetId: entry.assetId,
        storyId: entry.storyId,
        chapterId: entry.chapterId,
        entityId: entry.entityId,
        historyEntityType: null,
        clientHistoryId: entry.clientHistoryId,
        promptUsed: entry.promptUsed,
        chapterNumber: entry.chapterNumber,
        arcTitle: entry.arcTitle,
        label: entry.label,
        position: entry.position,
        isCurrent: entry.isCurrent,
        createdAt: entry.createdAt,
        endedAt: entry.endedAt,
      }));
  }

  async getOwnedQuotaReservation(
    ownerUid: string,
    idempotencyKey: string,
  ): Promise<MediaQuotaReservationState | null> {
    return this.quota.get(mediaReceiptKey(ownerUid, idempotencyKey)) ?? null;
  }

  async reserveQuota(
    ownerUid: string,
    reservation: MediaQuotaReservation,
  ): Promise<void> {
    const key = mediaReceiptKey(ownerUid, reservation.idempotencyKey);
    if (this.quota.has(key)) {
      throw new Error('This idempotency key is already reserved.');
    }
    const now = new Date().toISOString();
    this.quota.set(key, {
      ...reservation,
      ownerUid,
      assetId: null,
      status: 'RESERVED',
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    });
  }

  async releaseQuota(ownerUid: string, reservationId: string): Promise<void> {
    for (const [key, reservation] of this.quota) {
      if (reservation.ownerUid !== ownerUid || reservation.id !== reservationId) continue;
      this.quota.set(key, {
        ...reservation,
        status: 'RELEASED',
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
      return;
    }
  }

  async reserve(
    owner: MediaOwner,
    reservation: MediaAssetReservation,
  ): Promise<MediaAssetRecord> {
    if (this.records.has(reservation.id)) {
      throw new Error('Media reservation already exists.');
    }
    const {
      sourceKind: _sourceKind,
      quotaReservationId: _quotaReservationId,
      idempotencyKey,
      requestHash,
      status: _status,
      ...recordFields
    } = reservation;
    const now = new Date().toISOString();
    const record: MediaAssetRecord = {
      ...recordFields,
      status: 'UPLOADING',
      etag: null,
      failureCode: null,
      failureMessage: null,
      createdAt: now,
      updatedAt: now,
      readyAt: null,
      archivedAt: null,
      deletedAt: null,
      cleanupAfter: null,
    };
    this.records.set(record.id, record);
    this.receipts.set(mediaReceiptKey(owner.uid, idempotencyKey), {
      assetId: record.id,
      requestHash,
      status: 'UPLOADING',
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    });
    return record;
  }

  async getOwned(ownerUid: string, assetId: string): Promise<MediaAssetRecord | null> {
    const record = this.records.get(canonicalAssetId(assetId));
    return record?.ownerUid === ownerUid ? record : null;
  }

  async commitToSlot(
    ownerUid: string,
    assetId: string,
    etag: string | undefined,
    commit: MediaSlotCommit,
  ): Promise<MediaAssetRecord> {
    if (consumeMediaFailure('database')) {
      throw new Error('PostgreSQL could not commit the permanent media association.');
    }
    const record = await this.getOwned(ownerUid, assetId);
    if (!record || record.status !== 'UPLOADING') {
      throw new Error('The media reservation is not ready to commit.');
    }
    const association = commit.association;
    const relational = association.storyId
      ? dataConnectStore.attachMedia({
          assetId: record.id,
          ownerUid,
          storyId: association.storyId,
          chapterId: association.chapterId,
          entityId: association.entityId,
          targetKind: association.targetKind,
          targetKey: association.targetKey,
          purpose: association.purpose,
          deliveryUrl: '',
          checksumSha256: record.checksumSha256,
          mimeType: record.mimeType,
          promptUsed: association.promptUsed,
          clientHistoryId: association.clientHistoryId ?? association.legacyMediaId,
          entityType: association.entityType,
          chapterNumber: association.chapterNumber,
          arcTitle: association.arcTitle,
          label: association.label,
        })
      : dataConnectStore.attachAccountMedia({
          assetId: record.id,
          ownerUid,
          targetKind: association.targetKind,
          targetKey: association.targetKey,
          purpose: association.purpose,
          deliveryUrl: '',
          checksumSha256: record.checksumSha256,
          mimeType: record.mimeType,
        });
    const now = new Date().toISOString();
    const ready: MediaAssetRecord = {
      ...record,
      status: 'READY',
      etag: etag ?? null,
      updatedAt: now,
      readyAt: now,
    };
    this.records.set(record.id, ready);

    // The graph fixture stores the relational projection; keep its immutable
    // metadata byte-for-byte aligned with the real service record.
    relational.version = ready.version;
    relational.byteSize = ready.byteSize;
    relational.checksumSha256 = ready.checksumSha256;
    relational.mimeType = ready.mimeType;

    const receiptKey = mediaReceiptKey(ownerUid, commit.idempotencyKey);
    const receipt = this.receipts.get(receiptKey);
    if (receipt) {
      this.receipts.set(receiptKey, {
        ...receipt,
        status: 'COMPLETED',
        updatedAt: now,
        completedAt: now,
      });
    }
    for (const [key, reservation] of this.quota) {
      if (reservation.ownerUid !== ownerUid || reservation.id !== commit.quotaReservationId) continue;
      this.quota.set(key, {
        ...reservation,
        assetId: ready.id,
        status: 'COMMITTED',
        updatedAt: now,
        completedAt: now,
      });
    }
    return ready;
  }

  async selectOwnedSlotAsset(
    ownerUid: string,
    assetId: string,
    association: MediaAssociation,
    expectedSlot: MediaSlotState,
  ): Promise<MediaAssetRecord> {
    const current = await this.getOwnedSlot(ownerUid, association);
    if (
      !current
      || current.currentAssetId !== expectedSlot.currentAssetId
      || current.version !== expectedSlot.version
    ) {
      throw new Error('The media slot changed before selection.');
    }
    dataConnectStore.selectMedia(ownerUid, assetId, association);
    const selected = await this.getOwned(ownerUid, assetId);
    if (!selected) throw new Error('The selected history asset was not found.');
    return selected;
  }

  async markFailed(
    ownerUid: string,
    assetId: string,
    code: string,
    message: string,
  ): Promise<void> {
    const record = await this.getOwned(ownerUid, assetId);
    if (!record) return;
    this.records.set(record.id, {
      ...record,
      status: 'FAILED',
      failureCode: code,
      failureMessage: message,
      updatedAt: new Date().toISOString(),
    });
  }

  async markPendingCleanup(
    ownerUid: string,
    assetId: string,
    _bucket: string,
    _objectKey: string,
    _reason: string,
    message?: string,
  ): Promise<string> {
    const record = await this.getOwned(ownerUid, assetId);
    if (record) {
      this.records.set(record.id, {
        ...record,
        status: 'PENDING_CLEANUP',
        failureCode: 'pending_cleanup',
        failureMessage: message ?? null,
        updatedAt: new Date().toISOString(),
      });
    }
    this.cleanupSequence += 1;
    return `journey-cleanup-${this.cleanupSequence}`;
  }

  async requestUncommittedDeletion(
    ownerUid: string,
    assetId: string,
    bucket: string,
    objectKey: string,
  ): Promise<string> {
    return this.markPendingCleanup(
      ownerUid,
      assetId,
      bucket,
      objectKey,
      'uncommitted-deletion',
    );
  }

  async listStorageUsage(): Promise<StorageUsageRow[]> {
    return [...this.records.values()].map(record => ({
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
}

interface JourneyStoredObject extends StoredObjectMetadata {
  bytes: Buffer;
}

class JourneyMediaObjectStore implements MediaObjectStore {
  private readonly objects = new Map<string, JourneyStoredObject>();
  private readonly markers = new Map<string, CleanupMarker>();

  reset(): void {
    this.objects.clear();
    this.markers.clear();
  }

  bucketFor(): string {
    return 'journey-private-media';
  }

  assertDeliveryConfigured(): void {
    // The in-memory private bucket is always configured.
  }

  async put(input: PutMediaObjectInput): Promise<{ etag?: string }> {
    if (consumeMediaFailure('upload')) {
      throw new Error('Cloudflare R2 rejected the permanent upload.');
    }
    const bytes = Buffer.from(input.bytes);
    const etag = `journey-${input.checksumSha256.slice(0, 16)}`;
    this.objects.set(input.objectKey, {
      bytes,
      byteSize: bytes.byteLength,
      etag,
      checksumSha256: input.checksumSha256,
      mimeType: input.mimeType,
    });
    mediaObjects.set(this.assetIdFromObjectKey(input.objectKey), bytes);
    return { etag };
  }

  async head(_bucket: string, objectKey: string): Promise<StoredObjectMetadata | null> {
    const stored = this.objects.get(objectKey);
    if (!stored) return null;
    return {
      byteSize: stored.byteSize,
      etag: stored.etag,
      checksumSha256: stored.checksumSha256,
      mimeType: stored.mimeType,
    };
  }

  async delete(_bucket: string, objectKey: string): Promise<void> {
    this.objects.delete(objectKey);
    mediaObjects.delete(this.assetIdFromObjectKey(objectKey));
  }

  async getDeliveryUrl(
    _bucket: string,
    objectKey: string,
  ): Promise<string> {
    if (consumeMediaFailure('delivery')) {
      throw new Error('Cloudflare R2 could not issue a signed delivery URL.');
    }
    if (!this.objects.has(objectKey)) {
      throw new Error('The permanent media object does not exist.');
    }
    const assetId = this.assetIdFromObjectKey(objectKey);
    return `${origin}/media-object/${assetId}?signature=test&expires=9999`;
  }

  async writeCleanupMarker(marker: CleanupMarker): Promise<string> {
    const key = `journey-marker-${this.markers.size + 1}`;
    this.markers.set(key, marker);
    return key;
  }

  async listCleanupMarkerKeys(limit = 100): Promise<string[]> {
    return [...this.markers.keys()].slice(0, limit);
  }

  async readCleanupMarker(markerKey: string): Promise<CleanupMarker> {
    const marker = this.markers.get(markerKey);
    if (!marker) throw new Error('Cleanup marker was not found.');
    return marker;
  }

  async deleteCleanupMarker(markerKey: string): Promise<void> {
    this.markers.delete(markerKey);
  }

  private assetIdFromObjectKey(objectKey: string): string {
    const segments = objectKey.split('/');
    const assetId = segments.at(-2);
    if (!assetId) throw new Error('Journey media object key has no asset id.');
    return canonicalAssetId(assetId);
  }
}

const journeyMediaRepository = new JourneyMediaAssetRepository();
const journeyMediaObjectStore = new JourneyMediaObjectStore();
const realMediaAssetService = new MediaAssetService(
  journeyMediaRepository as unknown as MediaAssetRepository,
  journeyMediaObjectStore,
  {
    createId: () => queuedMediaIds.shift() ?? randomUUID(),
    maxUploadsPerMinute: 20_000,
  },
);
const mediaRouteService: MediaAssetRouteService = realMediaAssetService;

async function startServer(): Promise<string> {
  if (server) return origin;
  process.env.FIREBASE_PROJECT_ID ??= 'demo-celestial-journeys';
  // Keeps `getFirebaseAdminApp` from demanding real Google credentials.
  process.env.DATA_CONNECT_EMULATOR_HOST ??= '127.0.0.1:9399';

  const repository = new DataConnectApplicationRepository({
    executeRetiredMutation: dataConnectStore.executeRetiredMutation,
    // Profile reads pass through the same delivery facade as every other
    // signed descriptor so the journey can prove signing degradation does not
    // erase the canonical PostgreSQL profile.
    loadMediaDescriptor: (ownerUid, assetId) => mediaRouteService.get(ownerUid, assetId),
  });
  const app = express();
  // The fixture is a loopback server, but it still authorizes requests, so it
  // gets the same guard a real one would. The ceiling is far above what a full
  // journey run needs (a few thousand requests spread over the suite) and low
  // enough that a runaway client retry loop — the shape of the chapter-write
  // defect this suite pins — trips it instead of spinning silently.
  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 20_000,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  app.use(
    createPersistenceRouter({
      verifyIdToken: async (token) => verifyTestIdToken(token),
      getRepository: () => repository,
    }),
  );

  // The media client and route are real. The service facade below that route
  // replaces only R2 transport and PostgreSQL, the two external systems this
  // journey is allowed to mock.
  app.use(createMediaAssetRouter({
    verifyIdToken: async token => verifyTestIdToken(token),
    getService: () => mediaRouteService,
  }));
  app.get('/media-object/:assetId', (request, response) => {
    const bytes = mediaObjects.get(request.params.assetId);
    if (!bytes) {
      response.status(404).end();
      return;
    }
    response.type('image/png').send(bytes);
  });
  server = createServer(app);
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;
  origin = `http://127.0.0.1:${address.port}`;
  return origin;
}

/**
 * Hand back a downloaded body that every consumer in this process accepts.
 *
 * The bridge fulfils jsdom's `fetch` with Node's, which splits one browser
 * realm into two and breaks the media path in two separate places:
 *
 *  - `IndexedDbFoundationCache.putMedia` checks `instanceof Blob` against the
 *    global jsdom class, and undici's `Blob` is a different constructor.
 *  - `verifyChecksum` passes `await blob.arrayBuffer()` to
 *    `crypto.subtle.digest`, and Node's WebCrypto rejects an `ArrayBuffer` it
 *    did not create.
 *
 * A real browser has exactly one of each, so rebuild the body as a global
 * `Blob` whose bytes are `Buffer`-backed. Both conversions are unconditional:
 * whether the constructors happen to coincide is a Node-version detail, and a
 * suite must not behave differently on a maintainer's machine than in CI.
 */
export async function toRealmBlob(
  body: { arrayBuffer(): Promise<ArrayBuffer>; type: string },
): Promise<Blob> {
  const bytes = Buffer.from(await body.arrayBuffer());
  const blob = new Blob([bytes], { type: body.type });
  Object.defineProperty(blob, 'arrayBuffer', {
    configurable: true,
    value: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  });
  return blob;
}

function withRealmBlob(response: Response): Response {
  const readBlob = response.blob.bind(response);
  Object.defineProperty(response, 'blob', {
    configurable: true,
    value: async () => toRealmBlob(await readBlob()),
  });
  return response;
}

/**
 * Route the browser's relative `/api/persistence/...` requests at the local
 * server. The client adapter itself is untouched, so its headers, idempotency
 * keys and error handling are all exercised for real.
 */
function installFetchBridge(serverOrigin: string): void {
  originalFetch ??= globalThis.fetch;
  const upstream = originalFetch!;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
    const absolute = url.startsWith('/') ? `${serverOrigin}${url}` : url;
    return upstream(absolute, init).then(async (response) => {
      if (!response.ok && process.env.CELESTIAL_HARNESS_DEBUG) {
        const clonedBody = await response.clone().text();
        console.error(`[harness] ${init?.method ?? 'GET'} ${absolute} -> ${response.status} ${clonedBody}`);
      }
      return withRealmBlob(response);
    });
  }) as typeof globalThis.fetch;
}

function createOutboxCache(ownerUid: string) {
  return new IndexedDbFoundationCache({
    indexedDB: indexedDb as unknown as IDBFactory,
    databaseName: 'celestial-journey-foundation-cache',
    ownerUid,
    autoPrune: false,
    storageEstimate: async () => ({}),
  });
}

/**
 * Boot the application's own storage singleton.
 *
 * Using `storyStorage` rather than a private instance means the Zustand story
 * slice, the reader hooks and the harness all talk to exactly one manager, the
 * same way the running app does. Re-initializing it models a page reload.
 */
async function bootManager(): Promise<PersistentStorageManager> {
  storyStorage.dispose();
  Reflect.set(storyStorage, 'createOutboxCache', createOutboxCache);
  await storyStorage.init();
  return storyStorage;
}

/** jsdom exposes no object-URL support; the media resolver requires it. */
function installObjectUrlPolyfill(): void {
  if (typeof URL.createObjectURL === 'function') return;
  const blobs = new Map<string, Blob>();
  let counter = 0;
  URL.createObjectURL = (blob: Blob) => {
    counter += 1;
    const url = `blob:celestial/${counter}`;
    blobs.set(url, blob);
    return url;
  };
  URL.revokeObjectURL = (url: string) => {
    blobs.delete(url);
  };
}

export async function createCelestialHarness(): Promise<CelestialHarness> {
  const serverOrigin = await startServer();
  installFetchBridge(serverOrigin);
  installObjectUrlPolyfill();
  globalThis.indexedDB = indexedDb as unknown as IDBFactory;

  let storage = await bootManager();

  const harness: CelestialHarness = {
    get storage() {
      return storage;
    },
    origin: serverOrigin,
    store: dataConnectStore,
    async signIn(uid, email) {
      signInTestUser(uid, email);
      // Let the manager's auth listener finish its account-scope transition.
      await flushMicrotasks();
      await storage.performSync({ catalog: true, deep: false });
    },
    async signOut() {
      signOutTestUser();
      await flushMicrotasks();
    },
    async reload() {
      storage.dispose();
      storage = await bootManager();
      return storage;
    },
    async newDevice() {
      storage.dispose();
      resetPrivateMediaResolver();
      indexedDb = new MemoryIndexedDbFactory();
      globalThis.indexedDB = indexedDb as unknown as IDBFactory;
      localStorage.clear();
      storage = await bootManager();
      return storage;
    },
    captureDevice() {
      const capturedIndexedDb = indexedDb;
      const capturedLocalStorage = Array.from(
        { length: localStorage.length },
        (_, index) => {
          const key = localStorage.key(index);
          return key === null ? null : [key, localStorage.getItem(key) ?? ''] as const;
        },
      ).filter((entry): entry is readonly [string, string] => entry !== null);
      return async () => {
        storage.dispose();
        resetPrivateMediaResolver();
        indexedDb = capturedIndexedDb;
        globalThis.indexedDB = indexedDb as unknown as IDBFactory;
        localStorage.clear();
        for (const [key, value] of capturedLocalStorage) {
          localStorage.setItem(key, value);
        }
        storage = await bootManager();
        return storage;
      };
    },
    async sync(options) {
      await storage.performSync({
        catalog: options?.catalog ?? true,
        deep: options?.deep ?? false,
      });
    },
    async publishMedia(input) {
      const assetId = canonicalAssetId(input.assetId);
      const association: MediaAssociation = {
        storyId: input.storyId,
        chapterId: input.chapterId,
        entityId: input.entityId,
        targetKind: input.targetKind,
        targetKey: input.targetKey,
        purpose: input.purpose,
        clientHistoryId: input.clientHistoryId,
        entityType: input.entityType,
        promptUsed: input.promptUsed,
        chapterNumber: input.chapterNumber,
        arcTitle: input.arcTitle,
        label: input.label,
      };
      const currentSlot = await journeyMediaRepository.getOwnedSlot(
        input.ownerUid,
        association,
      );
      queuedMediaIds.push(randomUUID(), assetId, randomUUID());
      const descriptor = await realMediaAssetService.save({ uid: input.ownerUid }, {
        source: {
          kind: 'bytes',
          bytes: Buffer.concat([
            PNG_1X1,
            Buffer.from(input.body ?? `bytes-for-${input.assetId}`),
          ]),
          mimeType: 'image/png',
          filename: `${assetId}.png`,
        },
        assetType: 'IMAGE',
        purpose: input.purpose,
        association,
        replacesAssetId: currentSlot?.currentAssetId,
        idempotencyKey: randomUUID(),
      });
      if (descriptor.id !== assetId) {
        throw new Error(`The real media service committed ${descriptor.id}, expected ${assetId}.`);
      }
      return descriptor.id;
    },
    async publishAccountMedia(input) {
      const assetId = canonicalAssetId(input.assetId);
      queuedMediaIds.push(randomUUID(), assetId, randomUUID());
      const descriptor = await realMediaAssetService.save({ uid: input.ownerUid }, {
        source: {
          kind: 'bytes',
          bytes: Buffer.concat([
            PNG_1X1,
            Buffer.from(input.body ?? `bytes-for-${input.assetId}`),
          ]),
          mimeType: 'image/png',
          filename: `${assetId}.png`,
        },
        assetType: 'IMAGE',
        purpose: input.purpose,
        association: {
          targetKind: input.targetKind,
          targetKey: input.targetKey,
          purpose: input.purpose,
          clientHistoryId: input.clientHistoryId,
          entityType: input.entityType,
          promptUsed: input.promptUsed,
          label: input.label,
        },
        idempotencyKey: randomUUID(),
      });
      if (descriptor.id !== assetId) {
        throw new Error(`The real media service committed ${descriptor.id}, expected ${assetId}.`);
      }
      return descriptor.id;
    },
    failNextMediaStage(stage) {
      nextMediaFailure = stage;
    },
    async dispose() {
      storage.dispose();
    },
  } as CelestialHarness;

  return harness;
}

/** Reset every browser-side and server-side surface between tests. */
export function resetCelestialWorld(): void {
  dataConnectStore.reset();
  resetTestAuth();
  resetPrivateMediaResolver();
  mediaObjects.clear();
  journeyMediaRepository.reset();
  journeyMediaObjectStore.reset();
  queuedMediaIds.length = 0;
  nextMediaFailure = undefined;
  // The persistence client caches a per-story baseline for patch diffing. The
  // server is wiped between tests, so that baseline must go with it or the
  // next test sends a patch against a story the server has never seen.
  const cloudAdapter = Reflect.get(storyStorage, 'cloudAdapter') as
    | { storySnapshots?: Map<string, unknown> }
    | undefined;
  cloudAdapter?.storySnapshots?.clear();
  indexedDb = new MemoryIndexedDbFactory();
  globalThis.indexedDB = indexedDb as unknown as IDBFactory;
  localStorage.clear();
}

export async function stopCelestialServer(): Promise<void> {
  if (originalFetch) globalThis.fetch = originalFetch;
  originalFetch = undefined;
  if (!server) return;
  await new Promise<void>((resolve) => server!.close(() => resolve()));
  server = undefined;
}

/** Drain queued promise callbacks and IndexedDB `setTimeout(0)` operations. */
export async function flushMicrotasks(rounds = 12): Promise<void> {
  for (let index = 0; index < rounds; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
