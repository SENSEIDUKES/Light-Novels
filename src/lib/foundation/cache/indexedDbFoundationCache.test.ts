import { describe, expect, it } from "vitest";
import { MemoryIndexedDbFactory } from "../../../test/support/memoryIndexedDb";
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
      operation: "story.update",
      payload: { title: "A" },
      idempotencyKey: "update-a",
    });
    await ownerB.enqueueOutbox({
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

  it("keeps stale records for offline reads until the hard retention boundary", async () => {
    const indexedDB = new MemoryIndexedDbFactory();
    let now = 1_000;
    const cache = makeCache(indexedDB, "owner", () => now, { retentionMs: 100 });
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
    await expect(
      cache.getRecord("chapter", "one", { allowStale: true }),
    ).resolves.toMatchObject({ value: { text: "cached" }, stale: true });
    await expect(
      cache.listRecords("chapter", { allowStale: true }),
    ).resolves.toEqual([
      expect.objectContaining({ recordId: "one", stale: true }),
    ]);
    await expect(cache.getRecoveryCheckpoint("generation")).resolves.toBeNull();

    now = 1_100;
    await expect(
      cache.getRecord("chapter", "one", { allowStale: true }),
    ).resolves.toBeNull();
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

  it("enqueues a durable story SyncTask whose optional fields are undefined", async () => {
    // Regression for the "outbox payload contains a non-JSON value at
    // $.requiresPostChapterHeartbeat" outage: a non-heartbeat story write and an
    // unowned task carry optional properties set to `undefined`. JSON.stringify
    // drops those, so the guard must accept the payload (dropping the keys)
    // rather than rejecting the write. Before the repair this threw and stranded
    // every enqueueTask-based StoryWorld write.
    const cache = makeCache(new MemoryIndexedDbFactory(), "owner");
    const durableTaskPayload = {
      type: "story",
      storyId: "story-1",
      timestamp: 123,
      userId: undefined,
      generation: 1,
      idempotencyKey: "key-1",
      requiresPostChapterHeartbeat: undefined,
    };

    const queued = await cache.enqueueOutbox({
      id: "key-1",
      operation: "storage.sync.story",
      payload: durableTaskPayload,
      idempotencyKey: "key-1",
    });

    // The undefined keys are dropped (matching JSON serialization); the rest survives.
    expect(queued.payload).toEqual({
      type: "story",
      storyId: "story-1",
      timestamp: 123,
      generation: 1,
      idempotencyKey: "key-1",
    });
    expect("requiresPostChapterHeartbeat" in (queued.payload as object)).toBe(false);
    expect("userId" in (queued.payload as object)).toBe(false);
    await expect(cache.getRecoveryBundle()).resolves.toMatchObject({
      outbox: [expect.objectContaining({ id: "key-1" })],
    });
  });

  it("still rejects genuinely non-serializable outbox payloads", async () => {
    // The undefined tolerance above must not weaken the guard for real hazards.
    const cache = makeCache(new MemoryIndexedDbFactory(), "owner");
    await expect(cache.enqueueOutbox({
      operation: "storage.sync.story",
      payload: { blob: new Blob(["x"]) },
      idempotencyKey: "binary",
    })).rejects.toThrow(/non-plain object/);
  });

  it("recovers idempotent outbox work with leases, retries, and checkpoints", async () => {
    const indexedDB = new MemoryIndexedDbFactory();
    let now = 100;
    const cache = makeCache(indexedDB, "owner", () => now);
    const queued = await cache.enqueueOutbox({
      id: "chapter-create-1",
      operation: "chapter.create",
      payload: { storyId: "story" },
      idempotencyKey: "chapter-create-1",
    });
    const duplicate = await cache.enqueueOutbox({
      operation: "chapter.create",
      payload: { storyId: "story" },
      idempotencyKey: "chapter-create-1",
    });
    expect(duplicate.id).toBe(queued.id);
    await expect(cache.enqueueOutbox({
      operation: "chapter.create",
      payload: { storyId: "changed" },
      idempotencyKey: "chapter-create-1",
    })).rejects.toThrow(/different operation or payload/);
    await expect(cache.enqueueOutbox({
      id: "different-id",
      operation: "chapter.create",
      payload: { storyId: "story" },
      idempotencyKey: "chapter-create-1",
    })).rejects.toThrow(/must match its idempotency key/);
    await cache.putRecoveryCheckpoint({
      recoveryKey: "generation-job",
      state: { eventCursor: 7 },
    });

    await expect(cache.listRecoverableOutbox()).resolves.toHaveLength(1);
    await expect(cache.claimOutbox("chapter-create-1", 20)).resolves.toMatchObject({
      state: "IN_FLIGHT",
      attempts: 1,
      leaseExpiresAt: 120,
    });
    await expect(cache.listRecoverableOutbox()).resolves.toEqual([]);

    now = 121;
    await expect(cache.listRecoverableOutbox()).resolves.toHaveLength(1);
    await cache.failOutbox("chapter-create-1", "offline", 150);
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
    await cache.completeOutbox("chapter-create-1");
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

