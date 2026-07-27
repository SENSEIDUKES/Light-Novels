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
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { createPersistenceRouter } from '../../server/routes/persistenceRouter';
import { DataConnectApplicationRepository } from '../../server/persistence/dataConnectApplicationRepository';
import { storyStorage } from '../../lib/storage';
import { PersistentStorageManager } from '../../lib/storage/persistentStorageManager';
import { IndexedDbFoundationCache } from '../../lib/foundation/cache/indexedDbFoundationCache';
import { resetPrivateMediaResolver } from '../../lib/media/privateMediaResolver';
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
  /** Flush the durable outbox and reconcile the catalog, as Harmony does. */
  sync(options?: { catalog?: boolean; deep?: boolean }): Promise<void>;
  /**
   * Publish a permanent image the way a committed upload does: real bytes in
   * the object store, a real SHA-256 checksum, a READY asset row, and a current
   * media slot plus attachment on the relational graph.
   */
  publishMedia(input: PublishMediaInput): Promise<string>;
  dispose(): Promise<void>;
}

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
  chapterNumber?: number | null;
}

let server: Server | undefined;
let origin = '';
let indexedDb = new MemoryIndexedDbFactory();
let originalFetch: typeof globalThis.fetch | undefined;
/** Object bodies backing the delivery URLs, standing in for the R2 bucket. */
const mediaObjects = new Map<string, Buffer>();

async function startServer(): Promise<string> {
  if (server) return origin;
  process.env.FIREBASE_PROJECT_ID ??= 'demo-celestial-journeys';
  // Keeps `getFirebaseAdminApp` from demanding real Google credentials.
  process.env.DATA_CONNECT_EMULATOR_HOST ??= '127.0.0.1:9399';

  const repository = new DataConnectApplicationRepository({
    executeRetiredMutation: dataConnectStore.executeRetiredMutation,
    loadMediaDescriptor: dataConnectStore.loadMediaDescriptor,
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

  // Descriptor lookup and object delivery for the browser media resolver. The
  // client half (`mediaAssetClient`, `PrivateMediaResolver`, its IndexedDB blob
  // cache and checksum verification) is the real implementation; only the R2
  // bucket and its descriptor query are served from memory here.
  app.get('/api/foundation/media-assets/:assetId', (request, response) => {
    const token = request.get('authorization')?.replace(/^Bearer /i, '') ?? '';
    let ownerUid: string;
    try {
      ownerUid = verifyTestIdToken(token).uid;
    } catch {
      response.status(401).json({ error: { code: 'unauthenticated', message: 'Sign in required.' } });
      return;
    }
    const asset = dataConnectStore.mediaAssets.get(request.params.assetId);
    if (!asset || asset.ownerUid !== ownerUid) {
      response.status(404).json({ error: { code: 'not_found', message: 'Unknown media asset.' } });
      return;
    }
    dataConnectStore
      .loadMediaDescriptor(ownerUid, asset.id)
      .then((descriptor) => response.json({ asset: descriptor }))
      .catch((error: unknown) => {
        // An unhandled rejection here would surface as an opaque hang rather
        // than a failed request, so answer with the real reason instead.
        response.status(500).json({
          error: {
            code: 'media_descriptor_failed',
            message: error instanceof Error ? error.message : String(error),
          },
        });
      });
  });
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
    async sync(options) {
      await storage.performSync({
        catalog: options?.catalog ?? true,
        deep: options?.deep ?? false,
      });
    },
    async publishMedia(input) {
      const body = Buffer.from(input.body ?? `bytes-for-${input.assetId}`);
      mediaObjects.set(input.assetId, body);
      const digest = await crypto.subtle.digest('SHA-256', body);
      const checksum = Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, '0')).join('');
      dataConnectStore.attachMedia({
        ...input,
        checksumSha256: checksum,
        deliveryUrl: `${serverOrigin}/media-object/${input.assetId}?signature=test&expires=9999`,
      });
      return input.assetId;
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
