import type {
  CacheRecordNamespace,
  EnqueueFoundationOutboxItem,
  ExpectedMediaIdentity,
  FoundationCache,
  FoundationCachedMedia,
  FoundationCachePruneReport,
  FoundationCacheRecord,
  FoundationOutboxItem,
  FoundationRecoveryBundle,
  FoundationRecoveryCheckpoint,
  PutCachedMedia,
  PutCacheRecord,
  PutFoundationRecoveryCheckpoint,
} from "./types";

const DATABASE_NAME = "seihouse-foundation-cache-v1";
const DATABASE_VERSION = 1;
const RECORDS_STORE = "remote_records";
const MEDIA_STORE = "media_blobs";
const OUTBOX_STORE = "mutation_outbox";
const RECOVERY_STORE = "recovery_metadata";
const ALL_STORES = [
  RECORDS_STORE,
  MEDIA_STORE,
  OUTBOX_STORE,
  RECOVERY_STORE,
] as const;

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_MAX_CACHE_BYTES = 100 * 1024 * 1024;
const DEFAULT_MAX_CACHE_ENTRIES = 5_000;
const DEFAULT_MAX_QUOTA_FRACTION = 0.8;

type StoreName = (typeof ALL_STORES)[number];

interface StoredOwnerRow {
  storageKey: string;
  ownerUid: string;
}

interface CacheCandidate extends StoredOwnerRow {
  expiresAt: number;
  lastAccessedAt: number;
  byteSize: number;
  storeName: typeof RECORDS_STORE | typeof MEDIA_STORE;
}

export interface IndexedDbFoundationCacheOptions {
  ownerUid: string;
  databaseName?: string;
  indexedDB?: IDBFactory;
  now?: () => number;
  defaultTtlMs?: number;
  /** Hard retention window for stale offline replicas. */
  retentionMs?: number;
  maxCacheBytes?: number;
  maxCacheEntries?: number;
  maxQuotaFraction?: number;
  autoPrune?: boolean;
  storageEstimate?: () => Promise<{ quota?: number; usage?: number }>;
}

/**
 * A disposable, owner-scoped browser replica for the PostgreSQL/R2 foundation.
 * `authoritative` deliberately cannot be changed to true: server reads and
 * commits must remain the source of truth.
 */
export class IndexedDbFoundationCache implements FoundationCache {
  readonly authoritative = false as const;
  readonly sourceOfTruth = "remote" as const;
  readonly ownerUid: string;

  private readonly databaseName: string;
  private readonly factory: IDBFactory;
  private readonly clock: () => number;
  private readonly defaultTtlMs: number;
  private readonly retentionMs: number;
  private readonly maxCacheBytes: number;
  private readonly maxCacheEntries: number;
  private readonly maxQuotaFraction: number;
  private readonly autoPrune: boolean;
  private readonly storageEstimate?: () => Promise<{
    quota?: number;
    usage?: number;
  }>;
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(options: IndexedDbFoundationCacheOptions) {
    this.ownerUid = requireText(options.ownerUid, "ownerUid");
    this.databaseName = options.databaseName ?? DATABASE_NAME;
    const factory = options.indexedDB ?? globalThis.indexedDB;
    if (!factory) {
      throw new Error("IndexedDB is not supported in this environment.");
    }
    this.factory = factory;
    this.clock = options.now ?? Date.now;
    this.defaultTtlMs = requirePositive(
      options.defaultTtlMs ?? DEFAULT_TTL_MS,
      "defaultTtlMs",
    );
    this.retentionMs = requirePositive(
      options.retentionMs ?? DEFAULT_RETENTION_MS,
      "retentionMs",
    );
    this.maxCacheBytes = requireNonNegative(
      options.maxCacheBytes ?? DEFAULT_MAX_CACHE_BYTES,
      "maxCacheBytes",
    );
    this.maxCacheEntries = requireNonNegative(
      options.maxCacheEntries ?? DEFAULT_MAX_CACHE_ENTRIES,
      "maxCacheEntries",
    );
    const quotaFraction = options.maxQuotaFraction ?? DEFAULT_MAX_QUOTA_FRACTION;
    if (!Number.isFinite(quotaFraction) || quotaFraction <= 0 || quotaFraction > 1) {
      throw new RangeError("maxQuotaFraction must be greater than 0 and at most 1");
    }
    this.maxQuotaFraction = quotaFraction;
    this.autoPrune = options.autoPrune ?? true;
    this.storageEstimate = options.storageEstimate ?? defaultStorageEstimate;
  }

  async putRecord<T>(input: PutCacheRecord<T>): Promise<FoundationCacheRecord<T>> {
    const now = this.clock();
    const namespace = requireText(input.namespace, "namespace");
    const recordId = requireText(input.recordId, "recordId");
    const ttlMs = this.resolveTtl(input.ttlMs);
    const snapshot = snapshotJsonValue(input.value, "cache value");
    const row: FoundationCacheRecord<T> = {
      storageKey: recordKey(this.ownerUid, namespace, recordId),
      ownerUid: this.ownerUid,
      namespace,
      recordId,
      value: snapshot.value,
      serverVersion: optionalText(input.serverVersion),
      checksum: optionalText(input.checksum),
      cachedAt: now,
      expiresAt: now + ttlMs,
      evictAfter: now + Math.max(ttlMs, this.retentionMs),
      lastAccessedAt: now,
      byteSize: snapshot.byteSize,
    };
    await this.put(RECORDS_STORE, row);
    await this.maybePrune();
    return row;
  }

  getRecord<T>(
    namespace: CacheRecordNamespace,
    recordId: string,
    options: { allowStale?: boolean } = {},
  ): Promise<FoundationCacheRecord<T> | null> {
    const normalizedNamespace = requireText(namespace, "namespace");
    const normalizedRecordId = requireText(recordId, "recordId");
    return this.readCacheEntry<FoundationCacheRecord<T>>(
      RECORDS_STORE,
      recordKey(this.ownerUid, normalizedNamespace, normalizedRecordId),
      options.allowStale ?? false,
    );
  }

  async listRecords<T>(
    namespace: CacheRecordNamespace,
    options: { allowStale?: boolean } = {},
  ): Promise<FoundationCacheRecord<T>[]> {
    const normalizedNamespace = requireText(namespace, "namespace");
    const now = this.clock();
    const allowStale = options.allowStale ?? false;
    const rows = (await this.readAll<FoundationCacheRecord<T>>(RECORDS_STORE))
      .filter((row) => row.ownerUid === this.ownerUid && row.namespace === normalizedNamespace)
      .filter((row) => hardExpiry(row) > now)
      .filter((row) => allowStale || row.expiresAt > now)
      .map((row) => ({
        ...row,
        stale: row.expiresAt <= now,
        lastAccessedAt: now,
      }));
    await this.putMany(RECORDS_STORE, rows);
    return rows;
  }

  deleteRecord(namespace: CacheRecordNamespace, recordId: string): Promise<void> {
    return this.delete(
      RECORDS_STORE,
      recordKey(
        this.ownerUid,
        requireText(namespace, "namespace"),
        requireText(recordId, "recordId"),
      ),
    );
  }

  async putMedia(input: PutCachedMedia): Promise<FoundationCachedMedia> {
    const now = this.clock();
    const assetId = requireText(input.assetId, "assetId");
    const assetVersion = requireText(input.assetVersion, "assetVersion");
    const checksum = normalizeChecksum(input.checksum);
    const mimeType = requireText(input.mimeType, "mimeType");
    if (!(input.blob instanceof Blob)) {
      throw new TypeError("blob must be a Blob");
    }
    const ttlMs = this.resolveTtl(input.ttlMs);
    const row: FoundationCachedMedia = {
      storageKey: mediaKey(this.ownerUid, assetId),
      ownerUid: this.ownerUid,
      assetId,
      assetVersion,
      checksum,
      mimeType,
      blob: input.blob,
      cachedAt: now,
      expiresAt: now + ttlMs,
      evictAfter: now + Math.max(ttlMs, this.retentionMs),
      lastAccessedAt: now,
      byteSize: input.blob.size,
    };
    await this.put(MEDIA_STORE, row);
    await this.maybePrune();
    return row;
  }

  async getMedia(
    assetId: string,
    expected: ExpectedMediaIdentity,
    options: { allowStale?: boolean } = {},
  ): Promise<FoundationCachedMedia | null> {
    const normalizedAssetId = requireText(assetId, "assetId");
    const normalizedExpected = normalizeExpectedMedia(expected);
    const key = mediaKey(this.ownerUid, normalizedAssetId);
    const row = await this.readCacheEntry<FoundationCachedMedia>(
      MEDIA_STORE,
      key,
      options.allowStale ?? false,
    );
    if (!row) return null;
    if (!mediaIdentityMatches(row, normalizedExpected)) {
      await this.delete(MEDIA_STORE, key);
      return null;
    }
    return row;
  }

  async invalidateMedia(
    assetId: string,
    expected: ExpectedMediaIdentity,
  ): Promise<boolean> {
    const normalizedAssetId = requireText(assetId, "assetId");
    const normalizedExpected = normalizeExpectedMedia(expected);
    const key = mediaKey(this.ownerUid, normalizedAssetId);
    const row = await this.peek<FoundationCachedMedia>(MEDIA_STORE, key);
    if (!row || row.ownerUid !== this.ownerUid) return false;
    if (mediaIdentityMatches(row, normalizedExpected)) return false;
    await this.delete(MEDIA_STORE, key);
    return true;
  }

  deleteMedia(assetId: string): Promise<void> {
    return this.delete(
      MEDIA_STORE,
      mediaKey(this.ownerUid, requireText(assetId, "assetId")),
    );
  }

  async enqueueOutbox<T>(
    input: EnqueueFoundationOutboxItem<T>,
  ): Promise<FoundationOutboxItem<T>> {
    const operation = requireText(input.operation, "operation");
    const idempotencyKey = requireText(input.idempotencyKey, "idempotencyKey");
    const payload = snapshotJsonValue(input.payload, "outbox payload").value;
    const now = this.clock();
    const nextAttemptAt = input.nextAttemptAt ?? now;
    if (!Number.isFinite(nextAttemptAt)) {
      throw new RangeError("nextAttemptAt must be finite");
    }
    const id = requireText(input.id ?? idempotencyKey, "id");
    if (id !== idempotencyKey) {
      throw new Error("Outbox id must match its idempotency key.");
    }
    const existing = await this.peek<FoundationOutboxItem<T>>(
      OUTBOX_STORE,
      outboxKey(this.ownerUid, id),
    );
    if (existing?.ownerUid === this.ownerUid) {
      if (
        existing.idempotencyKey !== idempotencyKey
        || existing.operation !== operation
        || JSON.stringify(existing.payload) !== JSON.stringify(payload)
      ) {
        throw new Error('Outbox idempotency key was reused with a different operation or payload.');
      }
      return existing;
    }
    const row: FoundationOutboxItem<T> = {
      storageKey: outboxKey(this.ownerUid, id),
      ownerUid: this.ownerUid,
      id,
      operation,
      payload,
      idempotencyKey,
      state: "PENDING",
      attempts: 0,
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
      nextAttemptAt,
    };
    await this.add(OUTBOX_STORE, row);
    return row;
  }

  async listRecoverableOutbox(limit = 100): Promise<FoundationOutboxItem[]> {
    const normalizedLimit = Math.floor(requireNonNegative(limit, "limit"));
    if (normalizedLimit === 0) return [];
    const now = this.clock();
    const rows = (await this.readAll<FoundationOutboxItem>(OUTBOX_STORE))
      .filter((row) => {
        if (row.ownerUid !== this.ownerUid || row.nextAttemptAt > now) return false;
        return row.state !== "IN_FLIGHT" || (row.leaseExpiresAt ?? 0) <= now;
      })
      .sort((left, right) =>
        left.nextAttemptAt - right.nextAttemptAt || left.createdAt - right.createdAt,
      )
      .slice(0, normalizedLimit)
      .map((row) => ({ ...row, lastAccessedAt: now }));
    await this.putMany(OUTBOX_STORE, rows);
    return rows;
  }

  claimOutbox(id: string, leaseMs: number): Promise<FoundationOutboxItem | null> {
    const normalizedId = requireText(id, "id");
    const normalizedLeaseMs = requirePositive(leaseMs, "leaseMs");
    const now = this.clock();
    return this.mutateOwned<FoundationOutboxItem, FoundationOutboxItem | null>(
      OUTBOX_STORE,
      outboxKey(this.ownerUid, normalizedId),
      null,
      (row) => {
        const leased = row.state === "IN_FLIGHT" && (row.leaseExpiresAt ?? 0) > now;
        if (leased || row.nextAttemptAt > now) return { result: null };
        const updated: FoundationOutboxItem = {
          ...row,
          state: "IN_FLIGHT",
          attempts: row.attempts + 1,
          updatedAt: now,
          lastAccessedAt: now,
          leaseExpiresAt: now + normalizedLeaseMs,
        };
        return { row: updated, result: updated };
      },
    );
  }

  async failOutbox(id: string, error: string, nextAttemptAt: number): Promise<void> {
    const normalizedId = requireText(id, "id");
    const normalizedError = requireText(error, "error");
    if (!Number.isFinite(nextAttemptAt)) {
      throw new RangeError("nextAttemptAt must be finite");
    }
    const now = this.clock();
    await this.mutateOwned<FoundationOutboxItem, void>(
      OUTBOX_STORE,
      outboxKey(this.ownerUid, normalizedId),
      undefined,
      (row) => ({
        row: {
          ...row,
          state: "FAILED",
          updatedAt: now,
          lastAccessedAt: now,
          nextAttemptAt,
          leaseExpiresAt: undefined,
          lastError: normalizedError,
        },
        result: undefined,
      }),
    );
  }

  completeOutbox(id: string): Promise<void> {
    return this.delete(
      OUTBOX_STORE,
      outboxKey(this.ownerUid, requireText(id, "id")),
    );
  }

  async putRecoveryCheckpoint<T>(
    input: PutFoundationRecoveryCheckpoint<T>,
  ): Promise<FoundationRecoveryCheckpoint<T>> {
    const recoveryKeyValue = requireText(input.recoveryKey, "recoveryKey");
    const state = snapshotJsonValue(input.state, "recovery checkpoint state").value;
    const storageKey = recoveryKey(this.ownerUid, recoveryKeyValue);
    const existing = await this.peek<FoundationRecoveryCheckpoint<T>>(
      RECOVERY_STORE,
      storageKey,
    );
    const now = this.clock();
    const row: FoundationRecoveryCheckpoint<T> = {
      storageKey,
      ownerUid: this.ownerUid,
      recoveryKey: recoveryKeyValue,
      state,
      createdAt: existing?.ownerUid === this.ownerUid ? existing.createdAt : now,
      updatedAt: now,
      lastAccessedAt: now,
      expiresAt:
        input.ttlMs === undefined ? undefined : now + this.resolveTtl(input.ttlMs),
    };
    await this.put(RECOVERY_STORE, row);
    return row;
  }

  getRecoveryCheckpoint<T>(
    recoveryKeyValue: string,
  ): Promise<FoundationRecoveryCheckpoint<T> | null> {
    return this.readRecoveryCheckpoint<T>(
      recoveryKey(this.ownerUid, requireText(recoveryKeyValue, "recoveryKey")),
    );
  }

  deleteRecoveryCheckpoint(recoveryKeyValue: string): Promise<void> {
    return this.delete(
      RECOVERY_STORE,
      recoveryKey(this.ownerUid, requireText(recoveryKeyValue, "recoveryKey")),
    );
  }

  async listRecoveryCheckpoints(): Promise<FoundationRecoveryCheckpoint[]> {
    const now = this.clock();
    const owned = (await this.readAll<FoundationRecoveryCheckpoint>(RECOVERY_STORE))
      .filter((row) => row.ownerUid === this.ownerUid);
    const expired = owned.filter(
      (row) => row.expiresAt !== undefined && row.expiresAt <= now,
    );
    await this.deleteMany(
      RECOVERY_STORE,
      expired.map((row) => row.storageKey),
    );
    const active = owned
      .filter((row) => row.expiresAt === undefined || row.expiresAt > now)
      .map((row) => ({ ...row, lastAccessedAt: now }))
      .sort((left, right) => left.createdAt - right.createdAt);
    await this.putMany(RECOVERY_STORE, active);
    return active;
  }

  async getRecoveryBundle(outboxLimit = 100): Promise<FoundationRecoveryBundle> {
    const [outbox, checkpoints] = await Promise.all([
      this.listRecoverableOutbox(outboxLimit),
      this.listRecoveryCheckpoints(),
    ]);
    return { outbox, checkpoints };
  }

  async prune(): Promise<FoundationCachePruneReport> {
    const now = this.clock();
    const [records, media, checkpoints] = await Promise.all([
      this.readAll<FoundationCacheRecord>(RECORDS_STORE),
      this.readAll<FoundationCachedMedia>(MEDIA_STORE),
      this.readAll<FoundationRecoveryCheckpoint>(RECOVERY_STORE),
    ]);
    const candidates: CacheCandidate[] = [
      ...records.map<CacheCandidate>((row) => ({
        ...row,
        storeName: RECORDS_STORE,
      })),
      ...media.map<CacheCandidate>((row) => ({
        ...row,
        storeName: MEDIA_STORE,
      })),
    ].filter((row) => row.ownerUid === this.ownerUid);
    const expired = candidates.filter((row) => hardExpiry(row) <= now);
    const active = candidates.filter((row) => hardExpiry(row) > now);
    const expiredCheckpoints = checkpoints.filter(
      (row) =>
        row.ownerUid === this.ownerUid &&
        row.expiresAt !== undefined &&
        row.expiresAt <= now,
    );
    let remainingBytes = active.reduce((total, row) => total + row.byteSize, 0);
    let effectiveByteLimit = this.maxCacheBytes;

    try {
      const estimate = await this.storageEstimate?.();
      if (
        estimate &&
        Number.isFinite(estimate.quota) &&
        Number.isFinite(estimate.usage)
      ) {
        const quota = Math.max(0, estimate.quota ?? 0);
        const usage = Math.max(0, estimate.usage ?? 0);
        const nonFoundationUsage = Math.max(0, usage - remainingBytes);
        const quotaBudget = Math.max(
          0,
          Math.floor(quota * this.maxQuotaFraction - nonFoundationUsage),
        );
        effectiveByteLimit = Math.min(effectiveByteLimit, quotaBudget);
      }
    } catch {
      // StorageManager estimates are advisory. Fixed limits still apply.
    }

    const lru = [...active].sort(
      (left, right) =>
        left.lastAccessedAt - right.lastAccessedAt ||
        left.expiresAt - right.expiresAt ||
        left.storageKey.localeCompare(right.storageKey),
    );
    const evicted: CacheCandidate[] = [];
    while (
      lru.length > this.maxCacheEntries ||
      remainingBytes > effectiveByteLimit
    ) {
      const candidate = lru.shift();
      if (!candidate) break;
      evicted.push(candidate);
      remainingBytes -= candidate.byteSize;
    }

    const removed = [...expired, ...evicted];
    await Promise.all([
      this.deleteMany(
        RECORDS_STORE,
        removed
          .filter((row) => row.storeName === RECORDS_STORE)
          .map((row) => row.storageKey),
      ),
      this.deleteMany(
        MEDIA_STORE,
        removed
          .filter((row) => row.storeName === MEDIA_STORE)
          .map((row) => row.storageKey),
      ),
      this.deleteMany(
        RECOVERY_STORE,
        expiredCheckpoints.map((row) => row.storageKey),
      ),
    ]);

    return {
      expiredEntries: expired.length + expiredCheckpoints.length,
      evictedEntries: evicted.length,
      reclaimedBytes: removed.reduce((total, row) => total + row.byteSize, 0),
      remainingEntries: lru.length,
      remainingBytes: Math.max(0, remainingBytes),
      effectiveByteLimit,
    };
  }

  async clearOwner(): Promise<void> {
    const rowsByStore = await Promise.all(
      ALL_STORES.map(async (storeName) => ({
        storeName,
        rows: await this.readAll<StoredOwnerRow>(storeName),
      })),
    );
    await Promise.all(
      rowsByStore.map(({ storeName, rows }) =>
        this.deleteMany(
          storeName,
          rows
            .filter((row) => row.ownerUid === this.ownerUid)
            .map((row) => row.storageKey),
        ),
      ),
    );
  }

  close(): void {
    if (this.pruneTimer) {
      clearTimeout(this.pruneTimer);
      this.pruneTimer = null;
    }
    const pending = this.dbPromise;
    this.dbPromise = null;
    void pending?.then((db) => db.close()).catch(() => undefined);
  }

  private resolveTtl(ttlMs?: number): number {
    return requirePositive(ttlMs ?? this.defaultTtlMs, "ttlMs");
  }

  private pruneTimer: ReturnType<typeof setTimeout> | null = null;
  private writeCountSincePrune = 0;

  private async maybePrune(): Promise<void> {
    if (!this.autoPrune) return;
    this.writeCountSincePrune++;
    if (this.writeCountSincePrune >= 20) {
      this.writeCountSincePrune = 0;
      if (this.pruneTimer) {
        clearTimeout(this.pruneTimer);
        this.pruneTimer = null;
      }
      await this.prune();
      return;
    }
    if (!this.pruneTimer) {
      this.pruneTimer = setTimeout(() => {
        this.pruneTimer = null;
        this.writeCountSincePrune = 0;
        void this.prune().catch(() => undefined);
      }, 2000);
    }
  }

  private getDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = this.factory.open(this.databaseName, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const storeName of ALL_STORES) {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: "storageKey" });
          }
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          this.dbPromise = null;
        };
        resolve(db);
      };
      request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
      request.onblocked = () => reject(new Error("IndexedDB upgrade is blocked"));
    });
    return this.dbPromise;
  }

  private async put<T extends StoredOwnerRow>(storeName: StoreName, row: T): Promise<void> {
    const db = await this.getDb();
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(row);
    await transactionComplete(transaction);
  }

  private async add<T extends StoredOwnerRow>(storeName: StoreName, row: T): Promise<void> {
    const db = await this.getDb();
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).add(row);
    await transactionComplete(transaction);
  }

  private async putMany<T extends StoredOwnerRow>(
    storeName: StoreName,
    rows: T[],
  ): Promise<void> {
    if (rows.length === 0) return;
    const db = await this.getDb();
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    for (const row of rows) store.put(row);
    await transactionComplete(transaction);
  }

  private async peek<T>(storeName: StoreName, storageKey: string): Promise<T | null> {
    const db = await this.getDb();
    const transaction = db.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).get(storageKey);
    const result = await requestComplete<T | undefined>(request);
    await transactionComplete(transaction);
    return result ?? null;
  }

  private async readAll<T>(storeName: StoreName): Promise<T[]> {
    const db = await this.getDb();
    const transaction = db.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).getAll();
    const result = await requestComplete<T[]>(request);
    await transactionComplete(transaction);
    return result;
  }

  private async delete(storeName: StoreName, storageKey: string): Promise<void> {
    const db = await this.getDb();
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).delete(storageKey);
    await transactionComplete(transaction);
  }

  private async deleteMany(storeName: StoreName, storageKeys: string[]): Promise<void> {
    if (storageKeys.length === 0) return;
    const db = await this.getDb();
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    for (const storageKey of storageKeys) store.delete(storageKey);
    await transactionComplete(transaction);
  }

  private async readCacheEntry<T extends CacheLifetimeRow & StoredOwnerRow>(
    storeName: typeof RECORDS_STORE | typeof MEDIA_STORE,
    storageKey: string,
    allowStale: boolean,
  ): Promise<T | null> {
    const now = this.clock();
    return this.mutateOwned<T, T | null>(storeName, storageKey, null, (row) => {
      if (hardExpiry(row) <= now) return { delete: true, result: null };
      if (row.expiresAt <= now && !allowStale) return { result: null };
      const updated = {
        ...row,
        stale: row.expiresAt <= now,
        lastAccessedAt: now,
      } as T;
      return { row: updated, result: updated };
    });
  }

  private async readRecoveryCheckpoint<T>(
    storageKey: string,
  ): Promise<FoundationRecoveryCheckpoint<T> | null> {
    const now = this.clock();
    return this.mutateOwned<
      FoundationRecoveryCheckpoint<T>,
      FoundationRecoveryCheckpoint<T> | null
    >(RECOVERY_STORE, storageKey, null, (row) => {
      if (row.expiresAt !== undefined && row.expiresAt <= now) {
        return { delete: true, result: null };
      }
      const updated = { ...row, lastAccessedAt: now };
      return { row: updated, result: updated };
    });
  }

  private async mutateOwned<T extends StoredOwnerRow, R>(
    storeName: StoreName,
    storageKey: string,
    missingResult: R,
    mutate: (
      row: T,
    ) => { row?: T; delete?: boolean; result: R },
  ): Promise<R> {
    const db = await this.getDb();
    return new Promise<R>((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.get(storageKey);
      let result = missingResult;
      request.onsuccess = () => {
        const row = request.result as T | undefined;
        if (!row || row.ownerUid !== this.ownerUid) return;
        const mutation = mutate(row);
        result = mutation.result;
        if (mutation.delete) store.delete(storageKey);
        else if (mutation.row) store.put(mutation.row);
      };
      request.onerror = () => reject(request.error ?? new Error("IndexedDB read failed"));
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB write failed"));
      transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB write aborted"));
    });
  }
}

interface CacheLifetimeRow {
  expiresAt: number;
  evictAfter?: number;
  lastAccessedAt: number;
}

function hardExpiry(row: Pick<CacheLifetimeRow, "expiresAt" | "evictAfter">): number {
  return row.evictAfter ?? row.expiresAt;
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}

function requestComplete<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function defaultStorageEstimate(): Promise<{ quota?: number; usage?: number }> {
  if (!globalThis.navigator?.storage?.estimate) return Promise.resolve({});
  return globalThis.navigator.storage.estimate();
}

function keyPart(value: string): string {
  return encodeURIComponent(value);
}

function recordKey(ownerUid: string, namespace: string, recordId: string): string {
  return `${keyPart(ownerUid)}\u0000record\u0000${keyPart(namespace)}\u0000${keyPart(recordId)}`;
}

function mediaKey(ownerUid: string, assetId: string): string {
  return `${keyPart(ownerUid)}\u0000media\u0000${keyPart(assetId)}`;
}

function outboxKey(ownerUid: string, id: string): string {
  return `${keyPart(ownerUid)}\u0000outbox\u0000${keyPart(id)}`;
}

function recoveryKey(ownerUid: string, key: string): string {
  return `${keyPart(ownerUid)}\u0000recovery\u0000${keyPart(key)}`;
}

function requireText(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new TypeError(`${label} must not be empty`);
  return normalized;
}

function optionalText(value?: string): string | undefined {
  if (value === undefined) return undefined;
  return requireText(value, "value");
}

function normalizeChecksum(value: string): string {
  return requireText(value, "checksum").toLowerCase();
}

function normalizeExpectedMedia(expected: ExpectedMediaIdentity): ExpectedMediaIdentity {
  return {
    assetVersion: requireText(expected.assetVersion, "assetVersion"),
    checksum: normalizeChecksum(expected.checksum),
  };
}

function mediaIdentityMatches(
  row: FoundationCachedMedia,
  expected: ExpectedMediaIdentity,
): boolean {
  return (
    row.assetVersion === expected.assetVersion &&
    normalizeChecksum(row.checksum) === expected.checksum
  );
}

function requirePositive(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive finite number`);
  }
  return value;
}

function requireNonNegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative finite number`);
  }
  return value;
}

function snapshotJsonValue<T>(value: T, label: string): { value: T; byteSize: number } {
  assertJsonCompatible(value, label);
  const serialized = JSON.stringify(value);
  return {
    value: JSON.parse(serialized) as T,
    byteSize: new TextEncoder().encode(serialized).byteLength,
  };
}

function assertJsonCompatible(
  value: unknown,
  label: string,
  path = "$",
  seen = new WeakSet<object>(),
): void {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (Number.isFinite(value)) return;
    throw new TypeError(`${label} contains a non-finite number at ${path}`);
  }
  if (typeof value !== "object") {
    throw new TypeError(`${label} contains a non-JSON value at ${path}`);
  }
  if (seen.has(value)) throw new TypeError(`${label} contains a cycle at ${path}`);
  seen.add(value);

  if (Array.isArray(value)) {
    if (Object.getOwnPropertySymbols(value).length > 0) {
      throw new TypeError(`${label} contains symbol-keyed data at ${path}`);
    }
    const keys = Object.keys(value);
    if (keys.length !== value.length || keys.some((key, index) => key !== String(index))) {
      throw new TypeError(`${label} contains a sparse array or extra array properties at ${path}`);
    }
    for (let index = 0; index < value.length; index += 1) {
      assertJsonCompatible(value[index], label, `${path}[${index}]`, seen);
    }
    seen.delete(value);
    return;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${label} contains a non-plain object at ${path}`);
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError(`${label} contains symbol-keyed data at ${path}`);
  }
  for (const [key, entry] of Object.entries(value)) {
    assertJsonCompatible(entry, label, `${path}.${key}`, seen);
  }
  seen.delete(value);
}
