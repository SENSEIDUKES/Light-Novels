import { describe, expect, it } from "vitest";
import { IndexedDbFoundationCache } from "./indexedDbFoundationCache";

describe("IndexedDbFoundationCache", () => {
  it("is explicitly non-authoritative and isolates identical keys by owner", async () => {
    const indexedDB = new MemoryIndexedDbFactory();
    const ownerA = makeCache(indexedDB, "owner-a");
    const ownerB = makeCache(indexedDB, "owner-b");

    expect(ownerA.authoritative).toBe(false);
    expect(ownerA.sourceOfTruth).toBe("remote");
    await ownerA.putRecord({ namespace: "story", recordId: "same", value: "A" });
    await ownerB.putRecord({ namespace: "story", recordId: "same", value: "B" });
    await ownerA.putMedia(mediaInput("same-asset", "A"));
    await ownerB.putMedia(mediaInput("same-asset", "B"));
    await ownerA.enqueueOutbox({
      id: "outbox-a",
      operation: "story.update",
      payload: { title: "A" },
      idempotencyKey: "update-a",
    });
    await ownerB.enqueueOutbox({
      id: "outbox-b",
      operation: "story.update",
      payload: { title: "B" },
      idempotencyKey: "update-b",
    });
    await ownerA.putRecoveryCheckpoint({ recoveryKey: "sync", state: "A" });
    await ownerB.putRecoveryCheckpoint({ recoveryKey: "sync", state: "B" });

    await expect(ownerA.getRecord("story", "same")).resolves.toMatchObject({
      value: "A",
      ownerUid: "owner-a",
    });
    await expect(ownerB.getRecord("story", "same")).resolves.toMatchObject({
      value: "B",
      ownerUid: "owner-b",
    });

    await ownerA.clearOwner();

    await expect(ownerA.getRecord("story", "same")).resolves.toBeNull();
    await expect(
      ownerA.getMedia("same-asset", { assetVersion: "v1", checksum: "a" }),
    ).resolves.toBeNull();
    await expect(ownerA.listRecoverableOutbox()).resolves.toEqual([]);
    await expect(ownerA.listRecoveryCheckpoints()).resolves.toEqual([]);
    await expect(ownerB.getRecord("story", "same")).resolves.toMatchObject({ value: "B" });
    await expect(
      ownerB.getMedia("same-asset", { assetVersion: "v1", checksum: "b" }),
    ).resolves.toMatchObject({ ownerUid: "owner-b" });
    await expect(ownerB.listRecoverableOutbox()).resolves.toHaveLength(1);
    await expect(ownerB.listRecoveryCheckpoints()).resolves.toEqual([
      expect.objectContaining({ state: "B" }),
    ]);
  });

  it("updates last access and removes expired records and recovery metadata", async () => {
    const indexedDB = new MemoryIndexedDbFactory();
    let now = 1_000;
    const cache = makeCache(indexedDB, "owner", () => now);
    await cache.putRecord({
      namespace: "chapter",
      recordId: "one",
      value: { text: "cached" },
      ttlMs: 50,
    });
    await cache.putRecoveryCheckpoint({
      recoveryKey: "generation",
      state: { cursor: 4 },
      ttlMs: 50,
    });

    now = 1_020;
    await expect(cache.getRecord("chapter", "one")).resolves.toMatchObject({
      cachedAt: 1_000,
      lastAccessedAt: 1_020,
      expiresAt: 1_050,
    });
    await expect(cache.getRecoveryCheckpoint("generation")).resolves.toMatchObject({
      lastAccessedAt: 1_020,
    });

    now = 1_050;
    await expect(cache.getRecord("chapter", "one")).resolves.toBeNull();
    await expect(cache.getRecoveryCheckpoint("generation")).resolves.toBeNull();
  });

  it("invalidates cached media when its server version or checksum changes", async () => {
    const indexedDB = new MemoryIndexedDbFactory();
    const cache = makeCache(indexedDB, "owner");
    await cache.putMedia(mediaInput("cover", "abc"));

    await expect(
      cache.getMedia("cover", { assetVersion: "v1", checksum: "ABC" }),
    ).resolves.toMatchObject({ assetVersion: "v1", checksum: "abc" });
    await expect(
      cache.invalidateMedia("cover", { assetVersion: "v2", checksum: "abc" }),
    ).resolves.toBe(true);
    await expect(
      cache.getMedia("cover", { assetVersion: "v1", checksum: "abc" }),
    ).resolves.toBeNull();

    await cache.putMedia(mediaInput("cover", "abc"));
    await expect(
      cache.getMedia("cover", { assetVersion: "v1", checksum: "different" }),
    ).resolves.toBeNull();
  });

  it("prunes expired and least-recently-used cache data without dropping recovery work", async () => {
    const indexedDB = new MemoryIndexedDbFactory();
    let now = 1;
    const cache = makeCache(indexedDB, "owner", () => now, {
      maxCacheEntries: 2,
    });
    await cache.putRecord({ namespace: "story", recordId: "old", value: "old" });
    now = 2;
    await cache.putRecord({ namespace: "story", recordId: "recent", value: "recent" });
    now = 3;
    await cache.getRecord("story", "old");
    await cache.enqueueOutbox({
      id: "pending",
      operation: "story.save",
      payload: { id: "story" },
      idempotencyKey: "pending-save",
    });
    await cache.putRecoveryCheckpoint({ recoveryKey: "cursor", state: { offset: 2 } });
    now = 4;
    await cache.putRecord({ namespace: "story", recordId: "new", value: "new" });

    const report = await cache.prune();

    expect(report.evictedEntries).toBe(1);
    await expect(cache.getRecord("story", "recent")).resolves.toBeNull();
    await expect(cache.getRecord("story", "old")).resolves.toMatchObject({ value: "old" });
    await expect(cache.getRecord("story", "new")).resolves.toMatchObject({ value: "new" });
    await expect(cache.listRecoverableOutbox()).resolves.toHaveLength(1);
    await expect(cache.listRecoveryCheckpoints()).resolves.toHaveLength(1);
  });

  it("honors the origin quota estimate when it is tighter than the fixed budget", async () => {
    const indexedDB = new MemoryIndexedDbFactory();
    const cache = makeCache(indexedDB, "owner", Date.now, {
      maxCacheBytes: 10_000,
      maxQuotaFraction: 0.5,
      storageEstimate: async () => ({ quota: 20, usage: 0 }),
    });
    await cache.putRecord({
      namespace: "story",
      recordId: "large",
      value: "more-than-ten-bytes",
    });

    const report = await cache.prune();

    expect(report.effectiveByteLimit).toBe(10);
    expect(report.evictedEntries).toBe(1);
    await expect(cache.getRecord("story", "large")).resolves.toBeNull();
  });

  it("keeps binary and structured-clone-only values in the dedicated media store", async () => {
    const cache = makeCache(new MemoryIndexedDbFactory(), "owner");
    const binary = new Blob([new Uint8Array(1024 * 1024)], { type: "application/octet-stream" });

    await expect(cache.putRecord({
      namespace: "story",
      recordId: "binary",
      value: { binary },
    })).rejects.toThrow(/non-plain object/);
    await expect(cache.putRecord({
      namespace: "story",
      recordId: "map",
      value: new Map([["payload", "x".repeat(1024)]]),
    })).rejects.toThrow(/non-plain object/);
    const arrayWithBinaryProperty: unknown[] & { binary?: Blob } = [];
    arrayWithBinaryProperty.binary = binary;
    await expect(cache.putRecord({
      namespace: "story",
      recordId: "array-property",
      value: arrayWithBinaryProperty,
    })).rejects.toThrow(/extra array properties/);
    await expect(cache.enqueueOutbox({
      operation: "story.save",
      payload: { bytes: new Uint8Array(8) },
      idempotencyKey: "binary-outbox",
    })).rejects.toThrow(/non-plain object/);
    await expect(cache.putRecoveryCheckpoint({
      recoveryKey: "binary-checkpoint",
      state: { binary },
    })).rejects.toThrow(/non-plain object/);
    await expect(cache.enqueueOutbox({
      operation: "story.save",
      payload: { id: "story" },
      idempotencyKey: "invalid-retry-time",
      nextAttemptAt: Number.POSITIVE_INFINITY,
    })).rejects.toThrow(/nextAttemptAt must be finite/);
  });

  it("snapshots JSON inputs before asynchronous IndexedDB writes", async () => {
    const cache = makeCache(new MemoryIndexedDbFactory(), "owner");
    const binary = new Blob([new Uint8Array(1024)], { type: "application/octet-stream" });
    const recordValue: Record<string, unknown> = { title: "safe" };
    const outboxPayload: Record<string, unknown> = { storyId: "story" };
    const checkpointState: Record<string, unknown> = { cursor: 4 };

    const recordWrite = cache.putRecord({
      namespace: "story",
      recordId: "snapshot",
      value: recordValue,
    });
    const outboxWrite = cache.enqueueOutbox({
      operation: "story.save",
      payload: outboxPayload,
      idempotencyKey: "snapshot-outbox",
    });
    const checkpointWrite = cache.putRecoveryCheckpoint({
      recoveryKey: "snapshot-checkpoint",
      state: checkpointState,
    });

    recordValue.binary = binary;
    outboxPayload.binary = binary;
    checkpointState.binary = binary;

    await expect(recordWrite).resolves.toMatchObject({ value: { title: "safe" } });
    await expect(outboxWrite).resolves.toMatchObject({ payload: { storyId: "story" } });
    await expect(checkpointWrite).resolves.toMatchObject({ state: { cursor: 4 } });
    await expect(cache.getRecord("story", "snapshot")).resolves.toMatchObject({
      value: { title: "safe" },
    });
  });

  it("recovers idempotent outbox work with leases, retries, and checkpoints", async () => {
    const indexedDB = new MemoryIndexedDbFactory();
    let now = 100;
    const cache = makeCache(indexedDB, "owner", () => now);
    const queued = await cache.enqueueOutbox({
      id: "mutation-1",
      operation: "chapter.create",
      payload: { storyId: "story" },
      idempotencyKey: "chapter-create-1",
    });
    const duplicate = await cache.enqueueOutbox({
      id: "different-id",
      operation: "chapter.create",
      payload: { storyId: "changed" },
      idempotencyKey: "chapter-create-1",
    });
    expect(duplicate.id).toBe(queued.id);
    await cache.putRecoveryCheckpoint({
      recoveryKey: "generation-job",
      state: { eventCursor: 7 },
    });

    await expect(cache.listRecoverableOutbox()).resolves.toHaveLength(1);
    await expect(cache.claimOutbox("mutation-1", 20)).resolves.toMatchObject({
      state: "IN_FLIGHT",
      attempts: 1,
      leaseExpiresAt: 120,
    });
    await expect(cache.listRecoverableOutbox()).resolves.toEqual([]);

    now = 121;
    await expect(cache.listRecoverableOutbox()).resolves.toHaveLength(1);
    await cache.failOutbox("mutation-1", "offline", 150);
    await expect(cache.listRecoverableOutbox()).resolves.toEqual([]);

    now = 150;
    await expect(cache.getRecoveryBundle()).resolves.toMatchObject({
      outbox: [expect.objectContaining({ state: "FAILED", lastError: "offline" })],
      checkpoints: [
        expect.objectContaining({
          recoveryKey: "generation-job",
          state: { eventCursor: 7 },
        }),
      ],
    });
    await cache.completeOutbox("mutation-1");
    await cache.deleteRecoveryCheckpoint("generation-job");
    await expect(cache.getRecoveryBundle()).resolves.toEqual({
      outbox: [],
      checkpoints: [],
    });
  });
});

function mediaInput(assetId: string, checksum: string) {
  return {
    assetId,
    assetVersion: "v1",
    checksum,
    mimeType: "image/png",
    blob: new Blob([`blob-${checksum}`], { type: "image/png" }),
  };
}

function makeCache(
  indexedDB: MemoryIndexedDbFactory,
  ownerUid: string,
  now: () => number = Date.now,
  overrides: Partial<ConstructorParameters<typeof IndexedDbFoundationCache>[0]> = {},
) {
  return new IndexedDbFoundationCache({
    indexedDB: indexedDB as unknown as IDBFactory,
    databaseName: "foundation-cache-test",
    ownerUid,
    now,
    autoPrune: false,
    storageEstimate: async () => ({}),
    ...overrides,
  });
}

class MemoryRequest<T = unknown> {
  result!: T;
  error: DOMException | null = null;
  onsuccess: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onupgradeneeded: ((event: IDBVersionChangeEvent) => void) | null = null;
  onblocked: ((event: Event) => void) | null = null;
}

class MemoryObjectStore {
  constructor(
    private readonly transaction: MemoryTransaction,
    private readonly rows: Map<string, unknown>,
  ) {}

  get(key: IDBValidKey): IDBRequest {
    return this.operation(() => clone(this.rows.get(String(key))));
  }

  getAll(): IDBRequest {
    return this.operation(() => Array.from(this.rows.values(), clone));
  }

  put(value: unknown): IDBRequest {
    return this.operation(() => {
      const row = value as { storageKey: string };
      this.rows.set(row.storageKey, clone(row));
      return row.storageKey;
    });
  }

  add(value: unknown): IDBRequest {
    return this.operation(() => {
      const row = value as { storageKey: string };
      if (this.rows.has(row.storageKey)) throw new DOMException("Duplicate", "ConstraintError");
      this.rows.set(row.storageKey, clone(row));
      return row.storageKey;
    });
  }

  delete(key: IDBValidKey): IDBRequest {
    return this.operation(() => {
      this.rows.delete(String(key));
      return undefined;
    });
  }

  private operation<T>(work: () => T): IDBRequest<T> {
    const request = new MemoryRequest<T>();
    this.transaction.beginOperation();
    setTimeout(() => {
      try {
        request.result = work();
        request.onsuccess?.(new Event("success"));
      } catch (error) {
        request.error = error instanceof DOMException
          ? error
          : new DOMException(String(error), "UnknownError");
        request.onerror?.(new Event("error"));
        this.transaction.fail(request.error);
      } finally {
        this.transaction.endOperation();
      }
    }, 0);
    return request as unknown as IDBRequest<T>;
  }
}

class MemoryTransaction {
  oncomplete: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onabort: ((event: Event) => void) | null = null;
  error: DOMException | null = null;
  private pending = 0;
  private completionScheduled = false;
  private finished = false;

  constructor(
    private readonly database: MemoryDatabase,
    private readonly storeNames: string[],
  ) {
    this.scheduleCompletion();
  }

  objectStore(name: string): IDBObjectStore {
    if (!this.storeNames.includes(name)) throw new DOMException("Missing store", "NotFoundError");
    const rows = this.database.stores.get(name);
    if (!rows) throw new DOMException("Missing store", "NotFoundError");
    return new MemoryObjectStore(this, rows) as unknown as IDBObjectStore;
  }

  beginOperation(): void {
    this.pending += 1;
  }

  endOperation(): void {
    this.pending -= 1;
    this.scheduleCompletion();
  }

  fail(error: DOMException): void {
    this.error = error;
    this.onerror?.(new Event("error"));
  }

  private scheduleCompletion(): void {
    if (this.completionScheduled || this.finished) return;
    this.completionScheduled = true;
    setTimeout(() => {
      this.completionScheduled = false;
      if (this.pending > 0 || this.finished) return;
      this.finished = true;
      if (this.error) this.onabort?.(new Event("abort"));
      else this.oncomplete?.(new Event("complete"));
    }, 0);
  }
}

class MemoryDatabase {
  readonly stores = new Map<string, Map<string, unknown>>();
  readonly objectStoreNames = {
    contains: (name: string) => this.stores.has(name),
  };
  onversionchange: ((event: IDBVersionChangeEvent) => void) | null = null;

  createObjectStore(name: string): IDBObjectStore {
    const rows = new Map<string, unknown>();
    this.stores.set(name, rows);
    return {
      name,
    } as IDBObjectStore;
  }

  transaction(storeNames: string | string[]): IDBTransaction {
    return new MemoryTransaction(
      this,
      Array.isArray(storeNames) ? storeNames : [storeNames],
    ) as unknown as IDBTransaction;
  }

  close(): void {}
}

class MemoryIndexedDbFactory {
  private readonly databases = new Map<string, MemoryDatabase>();

  open(name: string): IDBOpenDBRequest {
    const request = new MemoryRequest<MemoryDatabase>();
    setTimeout(() => {
      let database = this.databases.get(name);
      if (!database) {
        database = new MemoryDatabase();
        this.databases.set(name, database);
        request.result = database;
        request.onupgradeneeded?.({} as IDBVersionChangeEvent);
      }
      request.result = database;
      setTimeout(() => request.onsuccess?.(new Event("success")), 0);
    }, 0);
    return request as unknown as IDBOpenDBRequest;
  }
}

function clone<T>(value: T): T {
  return value === undefined ? value : structuredClone(value);
}
