import { StorageAdapter } from "./types";
import { StoryWorld, ChapterContent } from "../../types";
import {
  type CloudRevisionExpectation,
  SyncProgress,
  SyncStatus,
  SyncTask,
} from "./types";
import { LocalStorageFallbackAdapter } from "./localStorageAdapter";
import {
  DataConnectStorageAdapter,
  preparePermanentPersistencePayload,
} from "./dataConnectStorageAdapter";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { IndexedDBStorageAdapter } from "./indexedDBAdapter";
import { InMemoryFallbackAdapter } from "./inMemoryAdapter";
import { LOCAL_ONLY_MODE } from "../firebase";
import { generateUUID } from "../id";
import { IndexedDbFoundationCache } from "../foundation/cache/indexedDbFoundationCache";
import type {
  EnqueueFoundationOutboxItem,
  FoundationOutboxItem,
} from "../foundation/cache/types";
import {
  resetPrivateMediaResolver,
  resolveMediaAssetForDisplay,
} from "../media/privateMediaResolver";

type DurableSyncTask = Omit<SyncTask, "attempts">;

export interface SyncOutboxCache {
  readonly ownerUid: string;
  enqueueOutbox<T>(
    input: EnqueueFoundationOutboxItem<T>,
  ): Promise<FoundationOutboxItem<T>>;
  listRecoverableOutbox(limit?: number): Promise<FoundationOutboxItem[]>;
  claimOutbox(id: string, leaseMs: number): Promise<FoundationOutboxItem | null>;
  failOutbox(id: string, error: string, nextAttemptAt: number): Promise<void>;
  completeOutbox(id: string): Promise<void>;
  close(): void;
}

export interface PersistentStorageManagerOptions {
  /** Test/platform seam; production always uses the IndexedDB foundation cache. */
  createOutboxCache?: (ownerUid: string) => SyncOutboxCache;
}

// Keep a durable claim while an outbox request is reconciled and written. This
// prevents another tab from reclaiming the same idempotent task mid-flight.
const OUTBOX_CLAIM_LEASE_MS = 30_000;

/**
 * Last-resort queue for browsers that do not expose IndexedDB. It deliberately
 * never falls back to localStorage: supported browsers use mutation_outbox,
 * while unsupported browsers still keep the current tab safe and surface a
 * warning that reload durability is unavailable.
 */
class VolatileSyncOutboxCache implements SyncOutboxCache {
  readonly ownerUid: string;
  private readonly rows = new Map<string, FoundationOutboxItem>();

  constructor(ownerUid: string) {
    this.ownerUid = ownerUid;
  }

  async enqueueOutbox<T>(
    input: EnqueueFoundationOutboxItem<T>,
  ): Promise<FoundationOutboxItem<T>> {
    const id = input.id ?? input.idempotencyKey;
    const existing = this.rows.get(id) as FoundationOutboxItem<T> | undefined;
    if (existing) return existing;
    const now = Date.now();
    const row: FoundationOutboxItem<T> = {
      storageKey: `${this.ownerUid}\u0000${id}`,
      ownerUid: this.ownerUid,
      id,
      operation: input.operation,
      payload: JSON.parse(JSON.stringify(input.payload)) as T,
      idempotencyKey: input.idempotencyKey,
      state: "PENDING",
      attempts: 0,
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
      nextAttemptAt: input.nextAttemptAt ?? now,
    };
    this.rows.set(id, row);
    return row;
  }

  async listRecoverableOutbox(limit = 100): Promise<FoundationOutboxItem[]> {
    const now = Date.now();
    return [...this.rows.values()]
      .filter(
        (row) =>
          row.nextAttemptAt <= now &&
          (row.state !== "IN_FLIGHT" || (row.leaseExpiresAt ?? 0) <= now),
      )
      .sort(
        (left, right) =>
          left.nextAttemptAt - right.nextAttemptAt ||
          left.createdAt - right.createdAt,
      )
      .slice(0, limit);
  }

  async claimOutbox(
    id: string,
    leaseMs: number,
  ): Promise<FoundationOutboxItem | null> {
    const row = this.rows.get(id);
    const now = Date.now();
    if (
      !row ||
      row.nextAttemptAt > now ||
      (row.state === "IN_FLIGHT" && (row.leaseExpiresAt ?? 0) > now)
    ) {
      return null;
    }
    const claimed: FoundationOutboxItem = {
      ...row,
      state: "IN_FLIGHT",
      attempts: row.attempts + 1,
      updatedAt: now,
      lastAccessedAt: now,
      leaseExpiresAt: now + leaseMs,
    };
    this.rows.set(id, claimed);
    return claimed;
  }

  async failOutbox(
    id: string,
    error: string,
    nextAttemptAt: number,
  ): Promise<void> {
    const row = this.rows.get(id);
    if (!row) return;
    const now = Date.now();
    this.rows.set(id, {
      ...row,
      state: "FAILED",
      updatedAt: now,
      lastAccessedAt: now,
      nextAttemptAt,
      leaseExpiresAt: undefined,
      lastError: error,
    });
  }

  async completeOutbox(id: string): Promise<void> {
    this.rows.delete(id);
  }

  close(): void {}
}

/**
 * Universal Storage Manager utilizing IndexedDB for high storage capacity
 * with dynamic and silent fallback to local storage under secure sandboxed contexts.
 * Also handles a durable offline outbox plus PostgreSQL cross-device reconciliation.
 */
export class PersistentStorageManager implements StorageAdapter {
  name = "PersistentStorageManager";
  private localAdapter: StorageAdapter;
  private cloudAdapter: DataConnectStorageAdapter;
  private isCloudAvailable = false;
  private syncStatus: SyncStatus = "idle";
  private subscribers: ((status: SyncStatus) => void)[] = [];
  private syncProgress: SyncProgress = {
    phase: "initializing",
    completed: 0,
    total: 0,
  };
  private progressSubscribers: ((progress: SyncProgress) => void)[] = [];
  private syncQueue: SyncTask[] = [];
  private readonly legacyQueueKey = "@seihouse/sync-queue";
  private readonly legacyQueueQuarantineKey = "@seihouse/sync-queue-invalid";
  private readonly legacyOutboxOwner = "__seihouse_legacy_unowned__";
  private readonly createOutboxCache: (ownerUid: string) => SyncOutboxCache;
  private readonly outboxCaches = new Map<string, SyncOutboxCache>();
  private warnedVolatileOutbox = false;
  private cloudRevisionsKey = "@seihouse/cloud-revisions";
  private knownCloudRevisions: Record<string, Record<string, string>> = {};
  private activeTransaction: {
    stories: Map<string, StoryWorld>;
    chapters: Map<string, ChapterContent>;
    deletedStoryIds: Set<string>;
  } | null = null;
  private conflictHandler: ((conflict: any) => void) | null = null;
  private activeFlushPromise: Promise<boolean> | null = null;
  private activeSyncPromise: Promise<void> | null = null;
  private activeSyncUserId: string | null = null;
  private syncRequested = false;
  private catalogSyncRequested = false;
  private deepSyncRequested = false;
  private deepStoryIdsRequested = new Set<string>();
  private recordLocks = new Map<string, Promise<void>>();
  private authUnsubscribe: (() => void) | null = null;
  private authTransitionVersion = 0;
  private localAccountScope: string | null | undefined;
  private accountTransitionPromise: Promise<void> = Promise.resolve();

  // --- Cloud write coalescing ---
  // Rather than firing a cloud write on every single save, we wait a short window and
  // let repeated saves for the same story collapse into ONE write (the sync queue already
  // dedupes by story/chapter). This is the main defense against write amplification during
  // bursty activity (chapter generation, image manifests, reading-stat flushes).
  private flushTimer: any = null;
  private readonly FLUSH_DEBOUNCE_MS = 4000;

  // --- Daily cloud-write circuit breaker ---
  // A hard safety net: every cloud write is counted for the day. If the count ever exceeds
  // this cap we stop syncing to the cloud for the rest of the day (work still saves locally
  // and syncs later). This guarantees a runaway loop can never blow up the backend bill.
  // Keep a client-side circuit breaker in addition to server-side quota controls.
  private writeCountKey = "@seihouse/cloud-write-count";
  private readonly DAILY_WRITE_CAP = 8000;
  private budgetTrippedLogged = false;
  // Escalate logging after repeated failures. Tasks remain durable until acknowledged;
  // the threshold is diagnostic, never a reason to discard a user's work.
  private readonly MAX_TASK_ATTEMPTS = 5;
  private beforeUnloadListener: (() => void) | null = null;
  private visibilityChangeListener: (() => void) | null = null;
  private onlineListener: (() => void) | null = null;

  constructor(options: PersistentStorageManagerOptions = {}) {
    this.localAdapter = new LocalStorageFallbackAdapter();
    this.cloudAdapter = new DataConnectStorageAdapter({ auth });
    this.createOutboxCache =
      options.createOutboxCache ??
      ((ownerUid) => new IndexedDbFoundationCache({ ownerUid }));
    this.loadCloudRevisions();

    // The durable queue is the unload guarantee. Never fire a blind cloud write while
    // closing: another device may have a newer revision that must be read first.
    // References are retained so dispose() can remove them (avoids leaks / test pollution).
    if (typeof window !== "undefined") {
      this.beforeUnloadListener = () => {
        void this.persistQueueSnapshot();
      };
      window.addEventListener("beforeunload", this.beforeUnloadListener);
      this.visibilityChangeListener = () => {
        if (typeof document === "undefined") return;
        if (document.visibilityState === "hidden") {
          void this.persistQueueSnapshot();
        }
      };
      window.addEventListener(
        "visibilitychange",
        this.visibilityChangeListener,
      );
      this.onlineListener = () => {
        // Reconnect only retries the durable outbox. A whole-library read is an
        // explicit Harmony action so a browser event cannot spend the read budget.
        void this.performSync({ catalog: false, deep: false });
      };
      window.addEventListener("online", this.onlineListener);
    }
  }

  /** Remove global listeners and cancel any pending flush. Call when discarding a manager. */
  public dispose() {
    this.authTransitionVersion += 1;
    this.isCloudAvailable = false;
    if (typeof window !== "undefined") {
      if (this.beforeUnloadListener)
        window.removeEventListener("beforeunload", this.beforeUnloadListener);
      if (this.visibilityChangeListener)
        window.removeEventListener(
          "visibilitychange",
          this.visibilityChangeListener,
        );
      if (this.onlineListener)
        window.removeEventListener("online", this.onlineListener);
    }
    this.beforeUnloadListener = null;
    this.visibilityChangeListener = null;
    this.onlineListener = null;
    this.authUnsubscribe?.();
    this.authUnsubscribe = null;
    this.cancelScheduledFlush();
    for (const cache of this.outboxCaches.values()) cache.close();
    this.outboxCaches.clear();
  }

  onConflict(handler: (conflict: any) => void) {
    this.conflictHandler = handler;
  }

  private outboxOwner(userId: string | null | undefined): string {
    return userId || this.legacyOutboxOwner;
  }

  private getOutboxCache(userId: string | null | undefined): SyncOutboxCache {
    const ownerUid = this.outboxOwner(userId);
    const existing = this.outboxCaches.get(ownerUid);
    if (existing) return existing;
    let cache: SyncOutboxCache;
    try {
      cache = this.createOutboxCache(ownerUid);
    } catch (error) {
      cache = new VolatileSyncOutboxCache(ownerUid);
      if (!this.warnedVolatileOutbox) {
        this.warnedVolatileOutbox = true;
        console.warn(
          "IndexedDB mutation outbox is unavailable; pending sync work can only survive in this tab.",
          error,
        );
      }
    }
    this.outboxCaches.set(ownerUid, cache);
    return cache;
  }

  private isSyncTask(value: unknown): value is SyncTask {
    if (!value || typeof value !== "object") return false;
    const task = value as Partial<SyncTask>;
    return (
      (task.type === "story" ||
        task.type === "chapter" ||
        task.type === "delete_story") &&
      typeof task.storyId === "string" &&
      task.storyId.length > 0 &&
      typeof task.timestamp === "number" &&
      Number.isFinite(task.timestamp) &&
      (task.type !== "chapter" ||
        (typeof task.chapterNumber === "number" &&
          Number.isFinite(task.chapterNumber))) &&
      (task.userId === undefined || typeof task.userId === "string")
    );
  }

  private legacyIdempotencyKey(task: SyncTask, index: number): string {
    if (task.idempotencyKey) return task.idempotencyKey;
    return [
      "legacy-sync",
      task.userId ?? "unowned",
      task.type,
      task.storyId,
      task.chapterNumber ?? "story",
      task.generation ?? 1,
      task.timestamp,
      index,
    ].join(":");
  }

  private normalizeSyncTask(
    task: SyncTask,
    idempotencyKey = task.idempotencyKey ?? generateUUID(),
  ): SyncTask {
    return {
      ...task,
      generation: task.generation ?? 1,
      attempts: task.attempts ?? 0,
      idempotencyKey,
    };
  }

  private durableTaskPayload(task: SyncTask): DurableSyncTask {
    const { attempts: _attempts, ...payload } = task;
    return payload;
  }

  private async persistTask(task: SyncTask): Promise<void> {
    if (!task.idempotencyKey) {
      throw new Error("Sync outbox task is missing its idempotency key.");
    }
    await this.getOutboxCache(task.userId).enqueueOutbox({
      id: task.idempotencyKey,
      operation: `storage.sync.${task.type}`,
      payload: this.durableTaskPayload(task),
      idempotencyKey: task.idempotencyKey,
    });
  }

  private async completePersistedTask(task: SyncTask): Promise<void> {
    if (!task.idempotencyKey) return;
    await this.getOutboxCache(task.userId).completeOutbox(task.idempotencyKey);
  }

  private async persistQueueSnapshot(): Promise<void> {
    try {
      for (let index = 0; index < this.syncQueue.length; index += 1) {
        const task = this.syncQueue[index];
        if (!task.idempotencyKey) {
          this.syncQueue[index] = this.normalizeSyncTask(task);
        }
      }
      await Promise.all(this.syncQueue.map((task) => this.persistTask(task)));
    } catch (error) {
      console.warn("Failed to persist the IndexedDB sync outbox.", error);
    }
  }

  private async migrateLegacyQueue(): Promise<void> {
    if (typeof localStorage === "undefined") return;
    const raw = localStorage.getItem(this.legacyQueueKey);
    if (!raw) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      localStorage.setItem(this.legacyQueueQuarantineKey, raw);
      localStorage.removeItem(this.legacyQueueKey);
      console.warn("Quarantined an unreadable legacy sync queue.");
      return;
    }

    if (!Array.isArray(parsed)) {
      localStorage.setItem(this.legacyQueueQuarantineKey, raw);
      localStorage.removeItem(this.legacyQueueKey);
      console.warn("Quarantined a malformed legacy sync queue.");
      return;
    }

    const valid: SyncTask[] = [];
    const invalid: unknown[] = [];
    parsed.forEach((value, index) => {
      if (!this.isSyncTask(value)) {
        invalid.push(value);
        return;
      }
      valid.push(
        this.normalizeSyncTask(value, this.legacyIdempotencyKey(value, index)),
      );
    });

    try {
      await Promise.all(valid.map((task) => this.persistTask(task)));
    } catch (error) {
      // The source stays intact, so a transient IndexedDB failure cannot strand
      // work halfway through migration.
      console.warn("Legacy sync queue migration will retry on the next launch.", error);
      return;
    }

    if (invalid.length > 0) {
      localStorage.setItem(
        this.legacyQueueQuarantineKey,
        JSON.stringify(invalid),
      );
      console.warn(`Quarantined ${invalid.length} invalid legacy sync task(s).`);
    }
    const usedVolatileCache = valid.some(
      (task) => this.getOutboxCache(task.userId) instanceof VolatileSyncOutboxCache,
    );
    if (!usedVolatileCache) localStorage.removeItem(this.legacyQueueKey);
  }

  private taskLogicalKey(task: SyncTask): string {
    return [
      task.userId ?? "unowned",
      task.type,
      task.storyId,
      task.chapterNumber ?? "story",
    ].join("\u0000");
  }

  private async loadQueueForScope(userId: string | null): Promise<void> {
    await this.migrateLegacyQueue();
    const caches = [this.getOutboxCache(userId)];
    if (userId) caches.push(this.getOutboxCache(null));
    const rows = (
      await Promise.all(
        caches.map((cache) => cache.listRecoverableOutbox(10_000)),
      )
    ).flat();
    const selected = new Map<
      string,
      { row: FoundationOutboxItem; task: SyncTask }
    >();
    const stale: FoundationOutboxItem[] = [];

    for (const row of rows) {
      if (!this.isSyncTask(row.payload)) {
        stale.push(row);
        continue;
      }
      const cacheOwnerIsLegacy = row.ownerUid === this.legacyOutboxOwner;
      const task = this.normalizeSyncTask(
        {
          ...row.payload,
          userId: cacheOwnerIsLegacy ? undefined : row.ownerUid,
          attempts: row.attempts,
        },
        row.idempotencyKey,
      );
      const logicalKey = this.taskLogicalKey(task);
      const current = selected.get(logicalKey);
      const isNewer =
        !current ||
        (task.generation ?? 1) > (current.task.generation ?? 1) ||
        ((task.generation ?? 1) === (current.task.generation ?? 1) &&
          (task.timestamp > current.task.timestamp ||
            (task.timestamp === current.task.timestamp &&
              row.createdAt > current.row.createdAt)));
      if (isNewer) {
        if (current) stale.push(current.row);
        selected.set(logicalKey, { row, task });
      } else {
        stale.push(row);
      }
    }

    this.syncQueue = [...selected.values()]
      .sort((left, right) => left.row.createdAt - right.row.createdAt)
      .map(({ task }) => task);
    await Promise.all(
      stale.map((row) =>
        this.getOutboxCache(
          row.ownerUid === this.legacyOutboxOwner ? null : row.ownerUid,
        ).completeOutbox(row.id),
      ),
    );
  }

  private getCurrentUserId(): string | undefined {
    return auth.currentUser?.uid;
  }

  private accountChangedError(): Error & { code?: string } {
    const error: Error & { code?: string } = new Error(
      "Cloud account changed during synchronization",
    );
    error.code = "auth/account-changed";
    return error;
  }

  private assertCurrentAccount(expectedUserId: string | undefined): void {
    if (this.getCurrentUserId() !== expectedUserId) {
      throw this.accountChangedError();
    }
  }

  private assertActiveSyncAccount(): string {
    if (!this.activeSyncUserId) throw this.accountChangedError();
    this.assertCurrentAccount(this.activeSyncUserId);
    return this.activeSyncUserId;
  }

  private async awaitAccountScope(
    expectedUserId: string | undefined,
  ): Promise<void> {
    if (LOCAL_ONLY_MODE) return;
    const expectedScope = expectedUserId ?? null;
    if (this.localAccountScope === expectedScope) return;

    // Firebase may publish currentUser just before its auth listener starts the
    // namespace transition. Yield once so that listener can install the barrier.
    await Promise.resolve();
    await this.accountTransitionPromise;
    this.assertCurrentAccount(expectedUserId);
    if (this.localAccountScope !== expectedScope) {
      throw this.accountChangedError();
    }
  }

  private nextRevisionTimestamp(...values: Array<string | undefined>): string {
    const latestKnown = values.reduce((latest, value) => {
      const parsed = value ? new Date(value).getTime() : Number.NaN;
      return Number.isFinite(parsed) ? Math.max(latest, parsed) : latest;
    }, 0);
    return new Date(Math.max(Date.now(), latestKnown + 1)).toISOString();
  }

  private createSyncRevision(): string {
    return generateUUID();
  }

  private async withRecordLock<T>(
    key: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const previous = this.recordLocks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = previous.catch(() => undefined).then(() => gate);
    this.recordLocks.set(key, queued);
    await previous.catch(() => undefined);
    try {
      return await operation();
    } finally {
      release();
      if (this.recordLocks.get(key) === queued) this.recordLocks.delete(key);
    }
  }

  private storyLockKey(storyId: string): string {
    return `story:${storyId}`;
  }

  private chapterLockKey(storyId: string, chapterNumber: number): string {
    return `chapter:${storyId}:${chapterNumber}`;
  }

  private async enqueueTask(task: SyncTask): Promise<void> {
    const userId = task.userId ?? this.getCurrentUserId();
    const sameAccount = (candidate: SyncTask) =>
      (candidate.userId ?? userId) === userId;
    const hasPendingChapter =
      task.type === "story" &&
      this.syncQueue.some(
        (candidate) =>
          candidate.type === "chapter" &&
          candidate.storyId === task.storyId &&
          sameAccount(candidate),
      );
    const existing = this.syncQueue.find(
      (t) =>
        t.type === task.type &&
        t.storyId === task.storyId &&
        t.chapterNumber === task.chapterNumber &&
        sameAccount(t),
    );
    const queuedTask = this.normalizeSyncTask(
      existing
        ? {
            ...existing,
            timestamp: task.timestamp,
            attempts: 0,
            userId,
            generation: (existing.generation ?? 1) + 1,
            requiresPostChapterHeartbeat:
              existing.requiresPostChapterHeartbeat ||
              task.requiresPostChapterHeartbeat ||
              hasPendingChapter ||
              undefined,
          }
        : {
            ...task,
            userId,
            generation: 1,
            requiresPostChapterHeartbeat:
              task.requiresPostChapterHeartbeat ||
              hasPendingChapter ||
              undefined,
          },
      generateUUID(),
    );

    // Add the new immutable generation before removing the previous one. If a
    // tab crashes between those writes, reload deduplication keeps the newest
    // generation and cleans up the older row.
    await this.persistTask(queuedTask);
    if (existing) await this.completePersistedTask(existing);
    const existingIndex = existing
      ? this.syncQueue.findIndex(
          (candidate) => candidate.idempotencyKey === existing.idempotencyKey,
        )
      : -1;
    if (existingIndex >= 0) this.syncQueue[existingIndex] = queuedTask;
    else this.syncQueue.push(queuedTask);

    if (task.type === "chapter") {
      const pendingStory = this.syncQueue.find(
        (candidate) =>
          candidate.type === "story" &&
          candidate.storyId === task.storyId &&
          sameAccount(candidate),
      );
      if (pendingStory && !pendingStory.requiresPostChapterHeartbeat) {
        const heartbeatTask = this.normalizeSyncTask(
          {
            ...pendingStory,
            generation: (pendingStory.generation ?? 1) + 1,
            requiresPostChapterHeartbeat: true,
          },
          generateUUID(),
        );
        await this.persistTask(heartbeatTask);
        await this.completePersistedTask(pendingStory);
        const pendingIndex = this.syncQueue.findIndex(
          (candidate) =>
            candidate.idempotencyKey === pendingStory.idempotencyKey,
        );
        if (pendingIndex >= 0) this.syncQueue[pendingIndex] = heartbeatTask;
      }
    }

    if (this.isCloudAvailable) {
      if (this.activeSyncPromise) this.syncRequested = true;
      this.scheduleFlush();
    }
  }

  private loadCloudRevisions() {
    try {
      const raw = localStorage.getItem(this.cloudRevisionsKey);
      if (raw) this.knownCloudRevisions = JSON.parse(raw);
    } catch {
      this.knownCloudRevisions = {};
    }
  }

  private revisionScope(): string {
    return this.activeSyncUserId || this.getCurrentUserId() || "anonymous";
  }

  private getKnownCloudRevision(storyId: string): string | undefined {
    return this.knownCloudRevisions[this.revisionScope()]?.[storyId];
  }

  private rememberCloudRevision(story: StoryWorld) {
    if (!story.updatedAt) return;
    const scope = this.revisionScope();
    this.knownCloudRevisions[scope] ||= {};
    this.knownCloudRevisions[scope][story.id] = story.updatedAt;
    try {
      localStorage.setItem(
        this.cloudRevisionsKey,
        JSON.stringify(this.knownCloudRevisions),
      );
    } catch {
      console.warn("Failed to save cloud revision baseline");
    }
  }

  private async acknowledgeTask(receipt: SyncTask): Promise<void> {
    await this.completePersistedTask(receipt);
    const nextQueue = this.syncQueue.filter(
      (task) =>
        !(
          task.type === receipt.type &&
          task.storyId === receipt.storyId &&
          task.chapterNumber === receipt.chapterNumber &&
          task.userId === receipt.userId &&
          (task.generation ?? 1) === (receipt.generation ?? 1)
        ),
    );
    if (nextQueue.length !== this.syncQueue.length) {
      this.syncQueue = nextQueue;
    }
  }

  private async claimLegacyTask(
    task: SyncTask,
    userId: string,
  ): Promise<void> {
    if (task.userId) return;
    const claimed = this.normalizeSyncTask(
      {
        ...task,
        userId,
        generation: (task.generation ?? 1) + 1,
        attempts: 0,
      },
      generateUUID(),
    );
    await this.persistTask(claimed);
    await this.completePersistedTask(task);
    const index = this.syncQueue.findIndex(
      (candidate) => candidate.idempotencyKey === task.idempotencyKey,
    );
    if (index >= 0) this.syncQueue[index] = claimed;
  }

  private async discardPendingMutationsForStory(
    storyId: string,
    userId = this.getCurrentUserId(),
  ): Promise<boolean> {
    let hadPendingChapter = false;
    const removed: SyncTask[] = [];
    const nextQueue = this.syncQueue.filter((task) => {
      const belongsToStory =
        task.storyId === storyId &&
        (task.userId === userId || task.userId === undefined);
      if (!belongsToStory || task.type === "delete_story") return true;
      if (task.type === "chapter") hadPendingChapter = true;
      removed.push(task);
      return false;
    });
    if (nextQueue.length !== this.syncQueue.length) {
      await Promise.all(removed.map((task) => this.completePersistedTask(task)));
      this.syncQueue = nextQueue;
    }
    return hadPendingChapter;
  }

  private async applyCloudTombstone(cloudStory: StoryWorld): Promise<void> {
    const userId = cloudStory.userId ?? this.getCurrentUserId();
    const needsCloudChapterCleanup = await this.discardPendingMutationsForStory(
      cloudStory.id,
      userId,
    );
    await this.localAdapter.deleteStory(cloudStory.id);
    await this.localAdapter.saveStory(cloudStory);
    this.rememberCloudRevision(cloudStory);
    if (needsCloudChapterCleanup) {
      await this.enqueueTask({
        type: "delete_story",
        storyId: cloudStory.id,
        timestamp: Date.now(),
        userId,
      });
    }
  }

  private findPendingTask(
    type: SyncTask["type"],
    storyId: string,
    chapterNumber?: number,
    userId = this.getCurrentUserId(),
  ): SyncTask | undefined {
    const task = this.syncQueue.find(
      (candidate) =>
        candidate.type === type &&
        candidate.storyId === storyId &&
        candidate.chapterNumber === chapterNumber &&
        candidate.userId === userId,
    );
    return task ? { ...task } : undefined;
  }

  private hasPendingTasksFor(userId = this.getCurrentUserId()): boolean {
    return this.syncQueue.some((task) => task.userId === userId);
  }

  // Debounce the cloud flush so a burst of enqueues coalesces into a single sync pass.
  private scheduleFlush() {
    if (this.flushTimer) return; // a flush is already scheduled within the window
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      // Normal saves only need their queued story/chapter checked and sealed.
      // Catalog reconciliation is reserved for a deliberate Harmony activation.
      void this.performSync({ catalog: false, deep: false });
    }, this.FLUSH_DEBOUNCE_MS);
  }

  private cancelScheduledFlush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  // --- Daily write budget helpers ---
  private getWriteCounter(): { date: string; count: number } {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const raw = localStorage.getItem(this.writeCountKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Guard against corrupted values: a non-finite count would make
        // `count >= cap` always false and silently disable the circuit breaker.
        if (
          parsed &&
          parsed.date === today &&
          typeof parsed.count === "number" &&
          Number.isFinite(parsed.count)
        ) {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return { date: today, count: 0 };
  }

  /** Number of cloud writes performed so far today (visible for diagnostics/UI). */
  public getCloudWritesToday(): number {
    return this.getWriteCounter().count;
  }

  private bumpWriteCounter(): number {
    const c = this.getWriteCounter();
    c.count += 1;
    try {
      localStorage.setItem(this.writeCountKey, JSON.stringify(c));
    } catch {
      /* ignore */
    }
    return c.count;
  }

  private isWriteBudgetExceeded(): boolean {
    return this.getWriteCounter().count >= this.DAILY_WRITE_CAP;
  }

  /** Identify failures that deserve immediate high-severity diagnostics. */
  private isPermanentError(err: any): boolean {
    const code = (
      err && (err.code || err.name) ? String(err.code || err.name) : ""
    ).toLowerCase();
    const permanentCodes = [
      "permission-denied",
      "permission_denied",
      "unauthenticated",
      "invalid-argument",
      "invalid_argument",
      "not-found",
      "not_found",
      "failed-precondition",
      "failed_precondition",
      "already-exists",
    ];
    return permanentCodes.some((c) => code.includes(c));
  }

  /**
   * The single gateway for EVERY cloud write. Enforces the daily budget and counts writes.
   * Returns true if the write happened, false if it was blocked by the circuit breaker.
   */
  private async cloudWrite(
    op: () => Promise<void>,
    label: string,
  ): Promise<boolean> {
    if (this.activeSyncUserId) this.assertActiveSyncAccount();
    if (this.isWriteBudgetExceeded()) {
      if (!this.budgetTrippedLogged) {
        this.budgetTrippedLogged = true;
        console.warn(
          `[Storage] Daily cloud-write cap (${this.DAILY_WRITE_CAP}) reached — pausing cloud sync ` +
            `for the rest of the day to protect your quota/bill. Your work is still saved locally ` +
            `and will sync automatically tomorrow.`,
        );
        this.setStatus("offline");
      }
      return false;
    }
    await op();
    if (this.activeSyncUserId) this.assertActiveSyncAccount();
    const total = this.bumpWriteCounter();
    // Lightweight, low-noise visibility: a heartbeat every 25 writes.
    if (total % 25 === 0) {
      console.info(`[Storage] cloud writes today: ${total} (last: ${label})`);
    }
    return true;
  }

  private isRevisionChanged(error: unknown): boolean {
    let current: unknown = error;
    for (let depth = 0; depth < 4 && current && typeof current === "object"; depth++) {
      const code = "code" in current ? String((current as { code?: unknown }).code ?? "") : "";
      if (code === "sync/revision-changed") return true;
      current = "cause" in current ? (current as { cause?: unknown }).cause : undefined;
    }
    return false;
  }

  private cloudExpectation(
    record: { updatedAt?: string; syncRevision?: string } | null | undefined,
  ): CloudRevisionExpectation {
    return {
      exists: Boolean(record),
      updatedAt: record?.updatedAt ?? null,
      syncRevision: record?.syncRevision ?? null,
    };
  }

  /**
   * Revision-checked writes turn the read/merge/write sequence into optimistic
   * concurrency. If another device wins after our read, retain the outbox entry
   * and immediately run another pass against the new cloud revision.
   */
  private async cloudWriteIfUnchanged(
    op: () => Promise<void>,
    label: string,
    storyId: string,
    deep = false,
  ): Promise<boolean> {
    try {
      return await this.cloudWrite(op, label);
    } catch (error) {
      if (!this.isRevisionChanged(error)) throw error;
      this.requestCloudReread(storyId, deep);
      return false;
    }
  }

  private requestCloudReread(storyId: string, deep = false): void {
    this.syncRequested = true;
    this.catalogSyncRequested = true;
    if (!deep) return;
    this.deepSyncRequested = true;
    this.deepStoryIdsRequested.add(storyId);
  }

  private async ensureStorySyncRevision(story: StoryWorld): Promise<StoryWorld> {
    if (story.syncRevision) return story;
    const prepared = { ...story, syncRevision: this.createSyncRevision() };
    await this.localAdapter.saveStory(prepared);
    return prepared;
  }

  private async ensureChapterSyncRevision(
    content: ChapterContent,
  ): Promise<ChapterContent> {
    if (content.syncRevision) return content;
    const prepared = { ...content, syncRevision: this.createSyncRevision() };
    await this.localAdapter.saveChapterContent(prepared);
    return prepared;
  }

  /**
   * The targeted PostgreSQL chapter mutation advances the parent story
   * revision in the same transaction, so no second graph write is needed.
   */
  private async requirePostChapterHeartbeat(storyId: string): Promise<void> {
    void storyId;
    this.assertActiveSyncAccount();
  }

  private async flushSyncQueue(
    blockedStoryIds: ReadonlySet<string> = new Set(),
  ): Promise<boolean> {
    this.cancelScheduledFlush();
    const userId = this.getCurrentUserId();
    if (!this.isCloudAvailable || !userId || !this.hasPendingTasksFor(userId)) {
      return !this.hasPendingTasksFor(userId);
    }
    if (this.activeFlushPromise) {
      return this.activeFlushPromise;
    }

    this.activeFlushPromise = (async () => {
      this.setStatus("syncing");
      let hadError = false;
      let remainingThisPass = this.syncQueue.length;
      const pendingTasksForUser = this.syncQueue.filter(
        (task) => task.userId === userId,
      ).length;
      let completedTasksForUser = 0;
      const reportSealingProgress = () => {
        this.setSyncProgress({
          phase: "sealing",
          completed: completedTasksForUser,
          total: pendingTasksForUser,
        });
      };
      if (pendingTasksForUser > 0) reportSealingProgress();

      try {
        while (this.syncQueue.length > 0 && remainingThisPass > 0) {
          // Peek — only remove the task once it is acknowledged, so failures and a
          // circuit-breaker stop leave pending work safely queued for later.
          let task = this.syncQueue[0];
          if (task.userId !== userId) {
            this.syncQueue.push(this.syncQueue.shift()!);
            remainingThisPass -= 1;
            continue;
          }
          if (
            task.type === "story" &&
            this.syncQueue.some(
              (candidate) =>
                candidate.type === "chapter" &&
                candidate.storyId === task.storyId &&
                candidate.userId === userId,
            )
          ) {
            // The story document is the realtime heartbeat for its chapter
            // subcollection. Publish chapter bodies first, then the heartbeat.
            this.syncQueue.push(this.syncQueue.shift()!);
            continue;
          }
          if (blockedStoryIds.has(task.storyId)) {
            this.syncQueue.push(this.syncQueue.shift()!);
            remainingThisPass -= 1;
            hadError = true;
            completedTasksForUser += 1;
            reportSealingProgress();
            continue;
          }
          if (!task.idempotencyKey) {
            task = this.normalizeSyncTask(task);
            await this.persistTask(task);
            this.syncQueue[0] = task;
          }
          const claimed = await this.getOutboxCache(task.userId).claimOutbox(
            task.idempotencyKey!,
            OUTBOX_CLAIM_LEASE_MS,
          );
          if (!claimed) {
            this.syncQueue.push(this.syncQueue.shift()!);
            remainingThisPass -= 1;
            continue;
          }
          task.attempts = claimed.attempts;
          const receipt = { ...task };
          let blocked = false;

          try {
            if (task.type === "story") {
              if (task.requiresPostChapterHeartbeat) {
                // Retire compatibility outbox rows produced before the chapter
                // transaction owned the parent heartbeat.
                blocked = false;
              } else {
                blocked = await this.withRecordLock(
                this.storyLockKey(task.storyId),
                async () => {
                  const localStory = await this.localAdapter.getStory(task.storyId);
                  if (!localStory) {
                    throw new Error(
                      `Pending story payload ${task.storyId} is unavailable locally`,
                    );
                  }
                  const cloudStory = await this.cloudAdapter.getStory(task.storyId);
                  this.assertCurrentAccount(userId);
                  if (
                    cloudStory?.deleted ||
                    (cloudStory?.updatedAt &&
                      (!localStory.updatedAt ||
                        new Date(cloudStory.updatedAt).getTime() >
                          new Date(localStory.updatedAt).getTime()))
                  ) {
                    // The queue can outlive the cloud snapshot that preceded it.
                    // Reconcile the newer remote value before attempting a write.
                    this.requestCloudReread(task.storyId);
                    return true;
                  }
                  if (
                    cloudStory?.updatedAt &&
                    cloudStory.updatedAt === localStory.updatedAt
                  ) {
                    if (cloudStory.syncRevision !== localStory.syncRevision) {
                      this.handleSyncConflict(localStory, cloudStory);
                      return true;
                    }
                    if (task.requiresPostChapterHeartbeat) {
                      // The parent may already have been bootstrapped earlier in
                      // this pass, so advance its revision after the chapter appears.
                      const heartbeat: StoryWorld = {
                        ...localStory,
                        updatedAt: this.nextRevisionTimestamp(
                          localStory.updatedAt,
                          cloudStory.updatedAt,
                        ),
                        syncRevision: this.createSyncRevision(),
                      };
                      await this.localAdapter.saveStory(heartbeat);
                      const cloudPayload = JSON.parse(JSON.stringify(heartbeat));
                      const wrote = await this.cloudWriteIfUnchanged(
                        () =>
                          this.cloudAdapter.saveStoryIfUnchanged(
                            cloudPayload,
                            this.cloudExpectation(cloudStory),
                          ),
                        `post-chapter-heartbeat:${task.storyId}`,
                        task.storyId,
                      );
                      if (wrote) this.rememberCloudRevision(cloudPayload);
                      return !wrote;
                    }
                    this.rememberCloudRevision(cloudStory);
                    return false;
                  }

                  const preparedStory = await this.ensureStorySyncRevision(localStory);
                  const cloudPayload = JSON.parse(JSON.stringify(preparedStory));
                  const wrote = await this.cloudWriteIfUnchanged(
                    () =>
                      this.cloudAdapter.saveStoryIfUnchanged(
                        cloudPayload,
                        this.cloudExpectation(cloudStory),
                      ),
                    `story:${task.storyId}`,
                    task.storyId,
                  );
                  if (wrote) this.rememberCloudRevision(cloudPayload);
                  return !wrote;
                },
                );
              }
            } else if (
              task.type === "chapter" &&
              task.chapterNumber !== undefined
            ) {
              blocked = await this.withRecordLock(
                this.storyLockKey(task.storyId),
                async () => {
                  const localChapter = await this.localAdapter.getChapterContent(
                    task.storyId,
                    task.chapterNumber!,
                  );
                  if (!localChapter) {
                    throw new Error(
                      `Pending chapter payload ${task.storyId}#${task.chapterNumber} is unavailable locally`,
                    );
                  }
                  const cloudChapter = await this.cloudAdapter.getChapterContent(
                    task.storyId,
                    task.chapterNumber!,
                  );
                  this.assertCurrentAccount(userId);
                  const localTime = localChapter.updatedAt
                    ? new Date(localChapter.updatedAt).getTime()
                    : Number.NaN;
                  const cloudTime = cloudChapter?.updatedAt
                    ? new Date(cloudChapter.updatedAt).getTime()
                    : Number.NaN;
                  if (
                    Number.isFinite(cloudTime) &&
                    (!Number.isFinite(localTime) || cloudTime > localTime)
                  ) {
                    this.requestCloudReread(task.storyId, true);
                    return true;
                  }
                  if (
                    cloudChapter?.updatedAt &&
                    cloudChapter.updatedAt === localChapter.updatedAt
                  ) {
                    if (cloudChapter.syncRevision !== localChapter.syncRevision) {
                      await this.handleChapterSyncConflict(
                        task.storyId,
                        task.chapterNumber!,
                        localChapter,
                        cloudChapter,
                      );
                      return true;
                    }
                    await this.requirePostChapterHeartbeat(task.storyId);
                    return false;
                  }

                  const preparedChapter =
                    await this.ensureChapterSyncRevision(localChapter);
                  const wrote = await this.cloudWriteIfUnchanged(
                    () =>
                      this.cloudAdapter.saveChapterContentIfUnchanged(
                        preparedChapter,
                        this.cloudExpectation(cloudChapter),
                      ),
                    `chapter:${task.storyId}#${task.chapterNumber}`,
                    task.storyId,
                    true,
                  );
                  if (wrote) {
                    await this.requirePostChapterHeartbeat(task.storyId);
                  }
                  return !wrote;
                },
              );
            } else if (task.type === "delete_story") {
              blocked = !(await this.cloudWrite(
                () => this.cloudAdapter.deleteStory(task.storyId),
                `delete:${task.storyId}`,
              ));
            }
          } catch (taskError: any) {
            // Never discard unsynced work. Rotate the failed task so unrelated stories can
            // still upload, and retain it for a later automatic/manual retry.
            const currentTask = this.syncQueue.find(
              (candidate) =>
                candidate.type === receipt.type &&
                candidate.storyId === receipt.storyId &&
                candidate.chapterNumber === receipt.chapterNumber &&
                candidate.userId === receipt.userId &&
                (candidate.generation ?? 1) === (receipt.generation ?? 1),
            );
            if (currentTask) currentTask.attempts = claimed.attempts;
            const attempts = currentTask?.attempts ?? claimed.attempts;
            const repeated = attempts >= this.MAX_TASK_ATTEMPTS;
            const permanent = this.isPermanentError(taskError);
            const log = repeated || permanent ? console.error : console.warn;
            log(
              `Sync task failed (attempt ${attempts}); retaining it for retry:`,
              taskError,
            );
            await this.getOutboxCache(receipt.userId).failOutbox(
              receipt.idempotencyKey!,
              taskError instanceof Error
                ? taskError.message || taskError.name
                : String(taskError) || "Cloud synchronization failed",
              Date.now(),
            );
            this.syncQueue.push(this.syncQueue.shift()!);
            remainingThisPass -= 1;
            hadError = true;
            completedTasksForUser += 1;
            reportSealingProgress();
            continue;
          }

          if (blocked) {
            // Budget exhaustion or a newer cloud revision: keep the durable task.
            // Revision changes request a trailing pass above; the budget retries later.
            await this.getOutboxCache(receipt.userId).failOutbox(
              receipt.idempotencyKey!,
              "Cloud write deferred for reconciliation or quota protection",
              Date.now(),
            );
            hadError = true;
            break;
          }

          await this.acknowledgeTask(receipt);
          remainingThisPass -= 1;
          completedTasksForUser += 1;
          reportSealingProgress();
        }

        this.setStatus(
          hadError ? "error" : this.hasPendingTasksFor(userId) ? "offline" : "synced",
        );
      } catch (error: any) {
        console.error("Failed to flush sync queue", error);
        // Keep remaining unprocessed tasks in queue to try again later
        hadError = true;
        this.setStatus("error");
      } finally {
        this.activeFlushPromise = null;
      }
      return !hadError && !this.hasPendingTasksFor(userId);
    })();
    return this.activeFlushPromise;
  }

  subscribe(callback: (status: SyncStatus) => void) {
    this.subscribers.push(callback);
    callback(this.syncStatus);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  subscribeToSyncProgress(callback: (progress: SyncProgress) => void) {
    this.progressSubscribers.push(callback);
    callback(this.syncProgress);
    return () => {
      this.progressSubscribers = this.progressSubscribers.filter((cb) => cb !== callback);
    };
  }

  public getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  private setStatus(status: SyncStatus) {
    this.syncStatus = status;
    this.subscribers.forEach((cb) => cb(status));
  }

  private setSyncProgress(progress: SyncProgress) {
    this.syncProgress = progress;
    this.progressSubscribers.forEach((cb) => cb(progress));
  }

  private async transitionAccountScope(userId: string | null): Promise<void> {
    if (
      this.localAccountScope === userId &&
      this.isCloudAvailable === Boolean(userId)
    ) {
      return;
    }
    resetPrivateMediaResolver();
    const transitionVersion = ++this.authTransitionVersion;
    this.isCloudAvailable = false;
    this.cancelScheduledFlush();
    this.activeTransaction = null;

    // Let the previous account's pass finish against its original local scope.
    // Its Firebase operations independently reject auth drift, and keeping the
    // scope stable prevents an in-flight local read from crossing into the next
    // account's namespace.
    if (this.activeSyncPromise) {
      try {
        await this.activeSyncPromise;
      } catch {
        // The old pass reports its own status; the new account still needs setup.
      }
    }
    if (transitionVersion !== this.authTransitionVersion) return;

    const pendingRecordOperations = Array.from(this.recordLocks.values());
    if (pendingRecordOperations.length > 0) {
      await Promise.allSettled(pendingRecordOperations);
    }
    if (transitionVersion !== this.authTransitionVersion) return;

    await this.loadQueueForScope(userId);
    if (transitionVersion !== this.authTransitionVersion) return;
    await this.localAdapter.setAccountScope?.(userId);
    this.localAccountScope = userId;
    if (
      transitionVersion !== this.authTransitionVersion ||
      (this.getCurrentUserId() ?? null) !== userId
    ) return;

    if (!userId) {
      this.setStatus("offline");
      return;
    }

    this.isCloudAvailable = true;
    this.setStatus("idle");
    // A restored account must see its PostgreSQL library on a clean browser.
    await this.performSync({ catalog: true, deep: false });
  }

  async init(): Promise<void> {
    const idbAdapter = new IndexedDBStorageAdapter();
    try {
      await idbAdapter.init();
      this.localAdapter = idbAdapter;
      console.log(
        "Successfully active local-first story world memory: IndexedDB",
      );

      // Idempotent migration: compare every record on every successful IDB init.
      // A crash or quota error halfway through no longer strands the remainder
      // merely because IndexedDB is now non-empty.
      try {
        const existingStories = await idbAdapter.getStories();
        const ownerKey = (userId: string | undefined, id: string) =>
          `${userId ?? ""}\u0000${id}`;
        const recordTime = (value?: string) => {
          const parsed = value ? new Date(value).getTime() : Number.NaN;
          return Number.isFinite(parsed) ? parsed : 0;
        };
        const existingByOwnerAndId = new Map(
          existingStories.map((story) => [
            ownerKey(story.userId, story.id),
            story,
          ]),
        );
        const lsAdapter = new LocalStorageFallbackAdapter();
        await lsAdapter.init();
        const lsStories = await lsAdapter.getStories();
        let migratedRecords = 0;
        for (const story of lsStories) {
          const existing = existingByOwnerAndId.get(
            ownerKey(story.userId, story.id),
          );
          if (!existing || recordTime(story.updatedAt) > recordTime(existing.updatedAt)) {
            try {
              await idbAdapter.setAccountScope?.(story.userId ?? null);
              await idbAdapter.saveStory(story);
              migratedRecords += 1;
            } catch (error) {
              console.warn(`Failed to migrate story ${story.id}; will retry next launch.`, error);
            }
          }
        }
        try {
          const existingChapters = idbAdapter.getAllChapterContents
            ? await idbAdapter.getAllChapterContents()
            : [];
          const existingChapterMap = new Map(
            existingChapters.map(({ userId, content }) => [
              `${ownerKey(userId, content.storyId)}\u0000${content.chapterNumber}`,
              content,
            ]),
          );
          const localStorageChapters: Array<{
            userId?: string;
            content: ChapterContent;
            ambiguousOwner?: boolean;
          }> = lsAdapter.getAllChapterContents
            ? await lsAdapter.getAllChapterContents()
            : (() => {
                const raw = localStorage.getItem(
                  "@seihouse/fiction-generator-chapters-v2",
                );
                if (!raw) return [];
                return (JSON.parse(raw) as ChapterContent[]).map((content) => ({
                  content,
                }));
              })();
          for (const { userId, content, ambiguousOwner } of localStorageChapters) {
            if (ambiguousOwner) {
              console.warn(
                `Skipped ambiguous legacy chapter ${content.storyId}#${content.chapterNumber} during migration; its owner could not be proven.`,
              );
              continue;
            }
            const chapterKey = `${ownerKey(userId, content.storyId)}\u0000${content.chapterNumber}`;
            const existing = existingChapterMap.get(chapterKey);
            if (!existing || recordTime(content.updatedAt) > recordTime(existing.updatedAt)) {
              try {
                await idbAdapter.setAccountScope?.(userId ?? null);
                await idbAdapter.saveChapterContent(content);
                migratedRecords += 1;
              } catch (error) {
                console.warn(
                  `Failed to migrate chapter ${content.storyId}#${content.chapterNumber}; will retry next launch.`,
                  error,
                );
              }
            }
          }
        } catch (e) {
          console.warn("Failed to migrate chapters from LocalStorage", e);
        }
        if (migratedRecords > 0) {
          console.log(
            `Migrated ${migratedRecords} newer LocalStorage records into IndexedDB.`,
          );
        }
        await idbAdapter.setAccountScope?.(undefined);
      } catch (migErr) {
        await idbAdapter.setAccountScope?.(undefined);
        console.error("Migration from LocalStorage failed:", migErr);
      }
    } catch (err) {
      console.warn(
        "IndexedDB failed (sandboxed frame or private window). Falling back to LocalStorage:",
        err,
      );
      const lsAdapter = new LocalStorageFallbackAdapter();
      try {
        await lsAdapter.init();
        this.localAdapter = lsAdapter;
        console.log(
          "Successfully active local-first story world memory: LocalStorage",
        );
      } catch (err2) {
        console.warn(
          "LocalStorage failed. Falling back to InMemory storage (data will not persist):",
          err2,
        );
        const memAdapter = new InMemoryFallbackAdapter();
        await memAdapter.init();
        this.localAdapter = memAdapter;
      }
    }

    try {
      if (LOCAL_ONLY_MODE) {
        // Device-only mode exposes only explicitly unowned legacy data. Never
        // collapse every retained account namespace into one visible library.
        await this.localAdapter.setAccountScope?.(null);
        this.localAccountScope = null;
        await this.loadQueueForScope(null);
        this.isCloudAvailable = false;
        this.setStatus("offline");
        return;
      }
      const initializationUserId = auth.currentUser?.uid ?? null;
      await this.localAdapter.setAccountScope?.(initializationUserId);
      this.localAccountScope = initializationUserId;
      await this.loadQueueForScope(this.localAccountScope);
      await this.cloudAdapter.init();

      // A restored Firebase identity immediately hydrates its PostgreSQL catalog
      // and chapter bodies; IndexedDB remains a disposable offline replica.
      const postInitializationUserId = auth.currentUser?.uid ?? null;
      if (postInitializationUserId !== initializationUserId) {
        // Auth changed while the cloud adapter was starting. Expose only the
        // new owner's outbox, but let the auth listener perform the local
        // namespace transition before any cloud read or write.
        await this.loadQueueForScope(postInitializationUserId);
      } else if (auth.currentUser) {
        this.isCloudAvailable = true;
        this.setStatus("idle");
        await this.performSync({ catalog: true, deep: false });
      }

      this.authUnsubscribe?.();
      this.authUnsubscribe = onAuthStateChanged(auth, (user) => {
        const transition = this.transitionAccountScope(user?.uid ?? null).catch(
          (error) => {
            console.error("Failed to switch local Harmony account scope:", error);
            this.setStatus("error");
          },
        );
        this.accountTransitionPromise = transition;
        void transition;
      });
      if (!auth.currentUser) this.setStatus("offline");
    } catch (err) {
      console.warn("PostgreSQL persistence initialization failed; using the offline cache.", err);
      this.setStatus("offline");
    }
  }

  private checkSignificantDifference(
    local: StoryWorld,
    cloud: StoryWorld,
  ): boolean {
    const localTime = new Date(local.updatedAt).getTime();
    const cloudTime = new Date(cloud.updatedAt).getTime();

    // A conflict-resolution timestamp is the last point at which both copies
    // were known to agree. A later change on only one side is normal syncing,
    // not a new conflict. Only ask the user again when both copies changed
    // independently after that shared baseline.
    const resolutionTimes = [local.conflictResolvedAt, cloud.conflictResolvedAt]
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value).getTime())
      .filter(Number.isFinite);
    if (resolutionTimes.length > 0) {
      const resolvedTime = Math.max(...resolutionTimes);
      const localChangedSinceResolution = localTime > resolvedTime;
      const cloudChangedSinceResolution = cloudTime > resolvedTime;
      if (!localChangedSinceResolution || !cloudChangedSinceResolution) {
        return false;
      }
    }

    if (local.title !== cloud.title) return true;
    if (local.currentChapterNumber !== cloud.currentChapterNumber) return true;
    if (
      local.persistenceHydration !== "summary" &&
      cloud.persistenceHydration !== "summary"
    ) {
      const localChars = local.memory?.characters?.length || 0;
      const cloudChars = cloud.memory?.characters?.length || 0;
      if (localChars !== cloudChars) return true;
    }
    const getHasContentCount = (story: StoryWorld) => {
      let count = 0;
      if (story.arcs) {
        for (const arc of story.arcs) {
          for (const ch of arc.chapters) {
            if (ch.hasContent || ch.generatedContent) count++;
          }
        }
      }
      return count;
    };
    if (
      local.persistenceHydration !== "summary" &&
      cloud.persistenceHydration !== "summary" &&
      getHasContentCount(local) !== getHasContentCount(cloud)
    ) return true;
    return false;
  }

  private mergeCatalogSummary(
    local: StoryWorld,
    summary: StoryWorld,
  ): StoryWorld {
    return {
      ...local,
      persistenceId: summary.persistenceId ?? local.persistenceId,
      userId: summary.userId ?? local.userId,
      sourceSeedId: summary.sourceSeedId,
      parentStoryId: summary.parentStoryId,
      forkChapterNumber: summary.forkChapterNumber,
      title: summary.title,
      genre: summary.genre,
      mcName: summary.mcName,
      customPremise: summary.customPremise,
      updatedAt: summary.updatedAt,
      syncRevision: summary.syncRevision,
      currentChapterNumber: summary.currentChapterNumber,
      coverAssetId: summary.coverAssetId,
      imageUrl: summary.imageUrl,
      lastImageChapter: summary.lastImageChapter,
      evolutionReady: summary.evolutionReady,
      evolutionReason: summary.evolutionReason,
      availableVisualUpdate: summary.availableVisualUpdate,
      isEdited: summary.isEdited,
      conflictResolvedAt: summary.conflictResolvedAt,
      deleted: summary.deleted,
      persistenceHydration:
        local.persistenceHydration === "summary" ? "summary" : "full",
      mediaDescriptors: summary.mediaDescriptors ?? local.mediaDescriptors,
    };
  }

  private async hydrateCurrentMedia(story: StoryWorld): Promise<StoryWorld> {
    const descriptors = Object.values(story.mediaDescriptors ?? {});
    if (descriptors.length === 0) return story;
    const resolved = new Map<string, string>();
    await Promise.all(descriptors.map(async (descriptor) => {
      try {
        resolved.set(
          descriptor.id,
          (await resolveMediaAssetForDisplay(descriptor)).url,
        );
      } catch (error) {
        console.warn(`Current media ${descriptor.id} is unavailable.`, error);
      }
    }));
    const clone = structuredClone(story);
    const delivery = (assetId?: string) => assetId ? resolved.get(assetId) : undefined;
    clone.imageUrl = delivery(clone.coverAssetId) ?? clone.imageUrl;
    clone.imageHistory = clone.imageHistory?.map((image) => ({
      ...image,
      imageUrl: image.isCurrent ? delivery(image.assetId) ?? image.imageUrl : image.imageUrl,
    }));
    const entities = [
      ...clone.memory.characters,
      ...(clone.memory.locations ?? []),
      ...(clone.memory.artifacts ?? []),
      ...(clone.memory.factions ?? []),
      ...(clone.memory.abilities ?? []).filter(
        (entry): entry is Exclude<typeof entry, string> => typeof entry !== "string",
      ),
    ];
    for (const entity of entities) {
      const visual = entity as typeof entity & {
        imageUrl?: string;
        voiceAssetId?: string;
        voiceClipUrl?: string;
        imageHistory?: NonNullable<StoryWorld["imageHistory"]>;
      };
      visual.imageUrl = delivery(visual.imageAssetId) ?? visual.imageUrl;
      visual.voiceClipUrl = delivery(visual.voiceAssetId) ?? visual.voiceClipUrl;
      visual.imageHistory = visual.imageHistory?.map((image) => ({
        ...image,
        imageUrl: image.isCurrent ? delivery(image.assetId) ?? image.imageUrl : image.imageUrl,
      }));
    }
    for (const chapter of clone.arcs.flatMap((arc) => arc.chapters)) {
      const heroUrl = delivery(chapter.heroImageAssetId);
      if (heroUrl) {
        chapter.assetManifest = { ...(chapter.assetManifest ?? {}), heroImage: heroUrl };
      }
    }
    clone.mediaDescriptors = Object.fromEntries(descriptors.map((descriptor) => [
      descriptor.id,
      { ...descriptor, deliveryUrl: "" },
    ]));
    return clone;
  }

  private async prepareCloudStoryForLocalCache(
    story: StoryWorld,
  ): Promise<StoryWorld> {
    return preparePermanentPersistencePayload(
      await this.hydrateCurrentMedia(story),
    );
  }

  private handleSyncConflict(
    localStory: StoryWorld,
    cloudStory: StoryWorld,
    chapterConflict?: {
      chapterNumber: number;
      localContent: ChapterContent;
      cloudContent: ChapterContent;
    },
  ): void {
    // Local reads can finish after Firebase has already moved to another
    // account. Never let an old pass publish that account's story into the
    // new account's global conflict UI.
    this.assertActiveSyncAccount();
    try {
      if (this.conflictHandler) {
        this.conflictHandler({
          storyId: localStory.id,
          localStory: JSON.parse(JSON.stringify(localStory)),
          cloudStory: JSON.parse(JSON.stringify(cloudStory)),
          chapterConflict: chapterConflict
            ? JSON.parse(JSON.stringify(chapterConflict))
            : undefined,
        });
      }
    } catch (err) {
      console.warn("Failed to dispatch active conflict to handler:", err);
    }
  }

  private async reconcileStory(
    localStory: StoryWorld,
    cloudStory?: StoryWorld,
    knownCloudRevision?: string,
  ): Promise<"ok" | "conflict" | "blocked"> {
    const currentLocal = await this.localAdapter.getStory(localStory.id);
    if (
      !currentLocal ||
      currentLocal.updatedAt !== localStory.updatedAt ||
      currentLocal.deleted !== localStory.deleted
    ) {
      return "blocked";
    }

    // A tombstone is authoritative regardless of timestamp. A device that was
    // offline for days must not resurrect a story merely because it later wrote
    // a fresh local timestamp.
    if (cloudStory?.deleted) {
      try {
        await this.applyCloudTombstone(cloudStory);
        return "ok";
      } catch (err) {
        console.error("Failed to save cloud tombstone locally:", err);
        return "blocked";
      }
    }

    if (localStory.deleted) {
      await this.discardPendingMutationsForStory(
        localStory.id,
        localStory.userId ?? this.getCurrentUserId(),
      );
      const ok = await this.cloudWrite(
        () => this.cloudAdapter.deleteStory(localStory.id),
        `sync-delete:${localStory.id}`,
      );
      if (ok) {
        this.rememberCloudRevision(localStory);
        const deleteReceipt = this.findPendingTask(
          "delete_story",
          localStory.id,
          undefined,
          localStory.userId ?? this.getCurrentUserId(),
        );
        if (deleteReceipt) await this.acknowledgeTask(deleteReceipt);
      }
      return ok ? "ok" : "blocked";
    }

    if (!cloudStory) {
      // Exists locally but not in cloud. Push to cloud.
      const preparedStory = await this.ensureStorySyncRevision(localStory);
      const cloudPayload = JSON.parse(JSON.stringify(preparedStory));
      const ok = await this.cloudWriteIfUnchanged(
        () =>
          this.cloudAdapter.saveStoryIfUnchanged(
            cloudPayload,
            this.cloudExpectation(null),
          ),
        `sync-new:${localStory.id}`,
        localStory.id,
      );
      if (ok) this.rememberCloudRevision(preparedStory);
      return ok ? "ok" : "blocked";
    }

    // Exists in both. Check if they differ significantly.
    if (this.checkSignificantDifference(localStory, cloudStory)) {
      const localChangedFromKnownCloud =
        Boolean(knownCloudRevision) && localStory.updatedAt !== knownCloudRevision;
      const cloudChangedFromKnownCloud =
        Boolean(knownCloudRevision) && cloudStory.updatedAt !== knownCloudRevision;
      const changeIsKnownToBeOneSided =
        Boolean(knownCloudRevision) &&
        localChangedFromKnownCloud !== cloudChangedFromKnownCloud;
      if (!changeIsKnownToBeOneSided) {
        this.handleSyncConflict(localStory, cloudStory);
        // Skip syncing this story until the user resolves the conflict.
        return "conflict";
      }
    }

    // Otherwise, proceed with minor automatic timestamp syncing
    const localTime = new Date(localStory.updatedAt).getTime();
    const cloudTime = new Date(cloudStory.updatedAt).getTime();

    if (
      Number.isFinite(localTime) &&
      localTime === cloudTime &&
      localStory.syncRevision !== cloudStory.syncRevision
    ) {
      const pendingStory = this.findPendingTask(
        "story",
        localStory.id,
        undefined,
        localStory.userId ?? this.getCurrentUserId(),
      );
      if (pendingStory) {
        // Equal client timestamps no longer imply equality: unique write tokens
        // expose a genuine same-millisecond divergence instead of dropping one.
        this.handleSyncConflict(localStory, cloudStory);
        return "conflict";
      }
      await this.localAdapter.saveStory(await this.prepareCloudStoryForLocalCache(
        cloudStory.persistenceHydration === "summary"
          ? this.mergeCatalogSummary(localStory, cloudStory)
          : cloudStory,
      ));
      this.rememberCloudRevision(cloudStory);
      return "ok";
    }

    if (localTime > cloudTime) {
      if (
        this.syncQueue.some(
          (task) =>
            task.type === "chapter" &&
            task.storyId === localStory.id &&
            task.userId === (localStory.userId ?? this.getCurrentUserId()),
        )
      ) {
        // Existing parent documents can wait: publish the chapter body first,
        // then let the queued story task act as the realtime heartbeat.
        return "ok";
      }
      const preparedStory = await this.ensureStorySyncRevision(localStory);
      const cloudPayload = JSON.parse(JSON.stringify(preparedStory));
      const ok = await this.cloudWriteIfUnchanged(
        () =>
          this.cloudAdapter.saveStoryIfUnchanged(
            cloudPayload,
            this.cloudExpectation(cloudStory),
          ),
        `sync-update:${localStory.id}`,
        localStory.id,
      );
      if (ok) this.rememberCloudRevision(preparedStory);
      return ok ? "ok" : "blocked";
    } else if (cloudTime > localTime) {
      try {
        const currentLocal = await this.localAdapter.getStory(localStory.id);
        if (
          !currentLocal ||
          currentLocal.updatedAt !== localStory.updatedAt ||
          currentLocal.deleted !== localStory.deleted
        ) {
          // A save landed while this pass was reading the cloud. Its enqueue
          // requests a trailing pass; never overwrite that newer local payload.
          return "blocked";
        }
        await this.localAdapter.saveStory(await this.prepareCloudStoryForLocalCache(
          cloudStory.persistenceHydration === "summary"
            ? this.mergeCatalogSummary(localStory, cloudStory)
            : cloudStory,
        ));
        this.rememberCloudRevision(cloudStory);
      } catch (err) {
        console.error("Failed to save cloud story locally:", err);
        return "blocked";
      }
    } else {
      this.rememberCloudRevision(cloudStory);
    }

    return "ok";
  }

  private async downloadMissingCloudStories(
    cloudStories: StoryWorld[],
    localMap: Map<string, StoryWorld>,
  ): Promise<number> {
    let failures = 0;
    const missingStories = cloudStories.filter((story) => !localMap.has(story.id));
    if (missingStories.length === 0) return failures;

    this.setSyncProgress({
      phase: "downloading",
      completed: 0,
      total: missingStories.length,
    });
    for (const [index, cloudStory] of missingStories.entries()) {
      try {
        await this.withRecordLock(this.storyLockKey(cloudStory.id), async () => {
          if (await this.localAdapter.getStory(cloudStory.id)) return;
          if (cloudStory.deleted) {
            await this.applyCloudTombstone(cloudStory);
          } else {
            await this.localAdapter.saveStory(
              await this.prepareCloudStoryForLocalCache(cloudStory),
            );
            this.rememberCloudRevision(cloudStory);
          }
        });
      } catch (err) {
        failures += 1;
        console.error("Failed to save downloaded cloud story locally:", err);
      }
      this.setSyncProgress({
        phase: "downloading",
        completed: index + 1,
        total: missingStories.length,
      });
    }
    return failures;
  }

  private async reconcileChapter(
    storyId: string,
    chapterNumber: number,
    deep: boolean,
  ): Promise<boolean> {
    try {
      const syncUserId = this.assertActiveSyncAccount();
      const localContent = await this.localAdapter.getChapterContent(
        storyId,
        chapterNumber,
      );
      const pendingTask = this.findPendingTask(
        "chapter",
        storyId,
        chapterNumber,
      );

      if (localContent && !deep && !pendingTask) return true;

      const cloudContent = await this.cloudAdapter.getChapterContent(
        storyId,
        chapterNumber,
      );
      this.assertCurrentAccount(syncUserId);

      if (!localContent) {
        if (!cloudContent) {
          console.warn(
            `Chapter ${storyId}#${chapterNumber} is referenced by story metadata but is unavailable locally and in the cloud.`,
          );
          return false;
        }
        if (
          await this.localAdapter.getChapterContent(storyId, chapterNumber)
        ) {
          return false;
        }
        await this.localAdapter.saveChapterContent(cloudContent);
        return true;
      }

      if (!cloudContent) {
        const preparedContent =
          await this.ensureChapterSyncRevision(localContent);
        const uploaded = await this.cloudWriteIfUnchanged(
          () =>
            this.cloudAdapter.saveChapterContentIfUnchanged(
              preparedContent,
              this.cloudExpectation(null),
            ),
          `repair-chapter:${storyId}#${chapterNumber}`,
          storyId,
          true,
        );
        if (uploaded) {
          await this.requirePostChapterHeartbeat(storyId);
          if (pendingTask) await this.acknowledgeTask(pendingTask);
        }
        return uploaded;
      }

      const localTime = localContent.updatedAt
        ? new Date(localContent.updatedAt).getTime()
        : Number.NaN;
      const cloudTime = cloudContent.updatedAt
        ? new Date(cloudContent.updatedAt).getTime()
        : Number.NaN;

      if (
        Number.isFinite(cloudTime) &&
        (!Number.isFinite(localTime) || cloudTime > localTime)
      ) {
        const currentLocal = await this.localAdapter.getChapterContent(
          storyId,
          chapterNumber,
        );
        if (currentLocal?.updatedAt !== localContent.updatedAt) return false;
        await this.localAdapter.saveChapterContent(cloudContent);
        if (pendingTask) await this.acknowledgeTask(pendingTask);
      } else if (
        Number.isFinite(localTime) &&
        (!Number.isFinite(cloudTime) || localTime > cloudTime)
      ) {
        const preparedContent =
          await this.ensureChapterSyncRevision(localContent);
        const uploaded = await this.cloudWriteIfUnchanged(
          () =>
            this.cloudAdapter.saveChapterContentIfUnchanged(
              preparedContent,
              this.cloudExpectation(cloudContent),
            ),
          `sync-chapter:${storyId}#${chapterNumber}`,
          storyId,
          true,
        );
        if (!uploaded) return false;
        await this.requirePostChapterHeartbeat(storyId);
        if (pendingTask) await this.acknowledgeTask(pendingTask);
      } else if (pendingTask) {
        // Legacy chapter records may not have timestamps. A pending durable task
        // is the best available evidence that the local copy still needs upload.
        const cloudWasSavedAfterTask =
          Number.isFinite(cloudTime) && cloudTime > pendingTask.timestamp;
        if (cloudWasSavedAfterTask) {
          await this.localAdapter.saveChapterContent(cloudContent);
        } else if (
          Number.isFinite(localTime) &&
          localTime === cloudTime &&
          localContent.syncRevision !== cloudContent.syncRevision
        ) {
          // Two devices produced distinct bodies at the same millisecond. Keep
          // the local outbox entry and ask which prose version to keep.
          await this.handleChapterSyncConflict(
            storyId,
            chapterNumber,
            localContent,
            cloudContent,
          );
          return false;
        } else {
          const preparedContent =
            await this.ensureChapterSyncRevision(localContent);
          const uploaded = await this.cloudWriteIfUnchanged(
            () =>
              this.cloudAdapter.saveChapterContentIfUnchanged(
                preparedContent,
                this.cloudExpectation(cloudContent),
              ),
            `sync-chapter:${storyId}#${chapterNumber}`,
            storyId,
            true,
          );
          if (!uploaded) return false;
          await this.requirePostChapterHeartbeat(storyId);
        }
        await this.acknowledgeTask(pendingTask);
      }

      return true;
    } catch (error) {
      console.error(
        `Failed to harmonize chapter ${storyId}#${chapterNumber}:`,
        error,
      );
      return false;
    }
  }

  private async handleChapterSyncConflict(
    storyId: string,
    chapterNumber: number,
    localContent: ChapterContent,
    cloudContent: ChapterContent,
  ): Promise<void> {
    const parentStory = await this.localAdapter.getStory(storyId);
    if (!parentStory) return;
    const localStory = {
      ...parentStory,
      updatedAt: localContent.updatedAt ?? parentStory.updatedAt,
    };
    const cloudStory = {
      ...parentStory,
      updatedAt: cloudContent.updatedAt ?? parentStory.updatedAt,
    };
    this.handleSyncConflict(localStory, cloudStory, {
      chapterNumber,
      localContent,
      cloudContent,
    });
  }

  private async reconcileChapters(
    stories: StoryWorld[],
    deep: boolean,
    deepStoryIds: ReadonlySet<string>,
    blockedStoryIds: ReadonlySet<string>,
  ): Promise<number> {
    const jobs: Array<() => Promise<boolean>> = [];
    for (const story of stories) {
      if (story.deleted || !story.arcs || blockedStoryIds.has(story.id)) continue;
      const shouldReadCloud = deep || deepStoryIds.has(story.id);
      const seen = new Set<number>();
      for (const arc of story.arcs) {
        for (const chapter of arc.chapters) {
          if (
            !seen.has(chapter.number) &&
            (chapter.hasContent || chapter.generatedContent)
          ) {
            seen.add(chapter.number);
            jobs.push(() =>
              this.withRecordLock(
                this.storyLockKey(story.id),
                () =>
                  this.withRecordLock(
                    this.chapterLockKey(story.id, chapter.number),
                    () =>
                      this.reconcileChapter(
                        story.id,
                        chapter.number,
                        shouldReadCloud,
                      ),
                  ),
              ),
            );
          }
        }
      }
    }

    let failures = 0;
    if (jobs.length === 0) return failures;
    this.setSyncProgress({
      phase: "harmonizing-chapters",
      completed: 0,
      total: jobs.length,
    });
    const BATCH_SIZE = 10;
    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const results = await Promise.all(
        jobs.slice(i, i + BATCH_SIZE).map((job) => job()),
      );
      failures += results.filter((ok) => !ok).length;
      this.setSyncProgress({
        phase: "harmonizing-chapters",
        completed: Math.min(i + BATCH_SIZE, jobs.length),
        total: jobs.length,
      });
    }
    return failures;
  }

  private async performSyncPass(
    deep: boolean,
    deepStoryIds: ReadonlySet<string>,
  ): Promise<void> {
    this.setStatus("syncing");
    let hadError = false;
    const blockedStoryIds = new Set<string>();
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        this.setStatus("offline");
        return;
      }
      this.assertCurrentAccount(userId);
      if (this.localAccountScope !== userId) {
        throw this.accountChangedError();
      }
      this.activeSyncUserId = userId;

      // Read the cloud before draining queued writes so an offline/stale device
      // cannot blindly overwrite a newer remote story before conflict detection.
      const [allLocalStories, cloudStories] = await Promise.all([
        this.localAdapter.getStories(),
        this.cloudAdapter.getStories(),
      ]);
      this.assertCurrentAccount(userId);

      // Local storage survives sign-out. Keep accounts isolated, while allowing
      // the first authenticated account to claim legacy/offline-created stories.
      const localStories: StoryWorld[] = [];
      const storiesToCatalogue = allLocalStories.filter(
        (story) => !story.userId || story.userId === userId,
      );
      this.setSyncProgress({
        phase: "cataloguing",
        completed: 0,
        total: storiesToCatalogue.length,
      });
      for (const [index, story] of storiesToCatalogue.entries()) {
        try {
          const claimedStory = await this.withRecordLock(
            this.storyLockKey(story.id),
            async () => {
              const currentStory = await this.localAdapter.getStory(story.id);
              if (!currentStory) return null;
              if (currentStory.userId && currentStory.userId !== userId) {
                return null;
              }
              if (currentStory.userId) return currentStory;
              const claimed = { ...currentStory, userId };
              await this.localAdapter.saveStory(claimed);
              return claimed;
            },
          );
          if (!claimedStory) continue;
          for (const task of [...this.syncQueue]) {
            if (
              task.type !== "delete_story" &&
              !task.userId &&
              task.storyId === story.id
            ) {
              await this.claimLegacyTask(task, userId);
            }
          }
          localStories.push(claimedStory);
        } catch (error) {
          hadError = true;
          console.error(`Failed to claim local story ${story.id} for sync:`, error);
        } finally {
          this.setSyncProgress({
            phase: "cataloguing",
            completed: index + 1,
            total: storiesToCatalogue.length,
          });
        }
      }
      const cloudMap = new Map(cloudStories.map((s) => [s.id, s]));
      const localMap = new Map(localStories.map((s) => [s.id, s]));

      // Always download the cloud union first. A broken local upload must never
      // prevent unrelated cloud-only stories from appearing on this device.
      if ((await this.downloadMissingCloudStories(cloudStories, localMap)) > 0) {
        hadError = true;
      }

      // Merge logic: newest updatedAt wins, with explicit conflict handling.
      const BATCH_SIZE = 10;
      if (localStories.length > 0) {
        this.setSyncProgress({
          phase: "harmonizing-stories",
          completed: 0,
          total: localStories.length,
        });
      }
      for (let i = 0; i < localStories.length; i += BATCH_SIZE) {
        const batch = localStories.slice(i, i + BATCH_SIZE);
        const pendingReceipts = new Map(
          batch.map((story) => [
            story.id,
            this.findPendingTask("story", story.id, undefined, userId),
          ]),
        );
        const results = await Promise.allSettled(
          batch.map((localStory) =>
            this.withRecordLock(
              this.storyLockKey(localStory.id),
              () =>
                this.reconcileStory(
                  localStory,
                  cloudMap.get(localStory.id),
                  this.getKnownCloudRevision(localStory.id),
                ),
            ),
          ),
        );
        for (const [index, result] of results.entries()) {
          const storyId = batch[index].id;
          if (result.status === "rejected") {
            hadError = true;
            console.error(`Failed to harmonize story ${storyId}:`, result.reason);
          } else if (result.value === "conflict") {
            blockedStoryIds.add(storyId);
            hadError = true;
          } else if (result.value === "blocked") {
            blockedStoryIds.add(storyId);
            hadError = true;
          } else {
            const receipt = pendingReceipts.get(storyId);
            const hasPendingChapter = this.syncQueue.some(
              (task) =>
                task.type === "chapter" &&
                task.storyId === storyId &&
                task.userId === userId,
            );
            if (
              receipt &&
              !hasPendingChapter &&
              !receipt.requiresPostChapterHeartbeat
            ) {
              await this.acknowledgeTask(receipt);
            }
          }
        }
        if (this.isWriteBudgetExceeded()) {
          hadError = true;
          break;
        }
        this.setSyncProgress({
          phase: "harmonizing-stories",
          completed: Math.min(i + batch.length, localStories.length),
          total: localStories.length,
        });
      }

      const harmonizedStories = (await this.localAdapter.getStories()).filter(
        (story) => !story.userId || story.userId === userId,
      );
      this.assertCurrentAccount(userId);
      if (
        (await this.reconcileChapters(
          harmonizedStories,
          deep,
          deepStoryIds,
          blockedStoryIds,
        )) > 0
      ) {
        hadError = true;
      }

      // A local save that arrived during this pass requested another pass. Do
      // not drain that newer task against the cloud snapshot taken before it.
      this.assertCurrentAccount(userId);
      if (!this.syncRequested && !(await this.flushSyncQueue(blockedStoryIds))) {
        hadError = true;
      }

      if (this.isWriteBudgetExceeded()) {
        this.setStatus("offline");
      } else if (this.syncRequested) {
        this.setStatus("syncing");
      } else {
        this.setStatus(
          hadError || this.hasPendingTasksFor(userId) ? "error" : "synced",
        );
      }
      if (!this.syncRequested) {
        this.setSyncProgress({
          phase: hadError ? "error" : "complete",
          completed: 0,
          total: 0,
        });
      }
    } catch (error) {
      console.error("Cloud sync failed:", error);
      this.setStatus("error");
      this.setSyncProgress({ phase: "error", completed: 0, total: 0 });
    } finally {
      this.activeSyncUserId = null;
    }
  }

  /**
   * Seal only records already present in this device's durable outbox.
   * Each task performs its own revision-checked cloud read, so normal saving and
   * reconnect recovery stay safe without listing every story or chapter.
   */
  private async performOutboxPass(): Promise<void> {
    let userId: string | undefined;
    try {
      userId = this.getCurrentUserId();
      if (!userId) {
        this.setStatus("offline");
        return;
      }
      this.assertCurrentAccount(userId);
      if (this.localAccountScope !== userId) {
        throw this.accountChangedError();
      }
      if (!this.hasPendingTasksFor(userId)) {
        this.setStatus("idle");
        this.setSyncProgress({ phase: "complete", completed: 0, total: 0 });
        return;
      }

      this.activeSyncUserId = userId;
      const completed = await this.flushSyncQueue();
      if (!this.syncRequested) {
        this.setSyncProgress({
          phase: completed ? "complete" : "error",
          completed: 0,
          total: 0,
        });
      }
    } catch (error) {
      if ((error as { code?: string })?.code === "auth/account-changed") return;
      console.error("Cloud outbox flush failed:", error);
      this.setStatus("error");
      this.setSyncProgress({ phase: "error", completed: 0, total: 0 });
    } finally {
      if (this.activeSyncUserId === userId) this.activeSyncUserId = null;
    }
  }

  public performSync(
    options: {
      /** Read and reconcile the remote story catalog. Defaults to true for manual callers. */
      catalog?: boolean;
      /** Audit every referenced chapter body during a catalog sync. */
      deep?: boolean;
      deepStoryIds?: Iterable<string>;
    } = {},
  ): Promise<void> {
    if (!this.isCloudAvailable) return Promise.resolve();

    const catalog = options.catalog ?? true;
    this.syncRequested = true;
    if (catalog) this.catalogSyncRequested = true;
    if (catalog && (options.deep ?? false)) this.deepSyncRequested = true;
    for (const storyId of options.deepStoryIds ?? []) {
      this.deepStoryIdsRequested.add(storyId);
    }
    if (this.activeSyncPromise) return this.activeSyncPromise;

    this.activeSyncPromise = (async () => {
      try {
        while (this.isCloudAvailable && this.syncRequested) {
          const syncCatalog = this.catalogSyncRequested;
          const deep = syncCatalog && this.deepSyncRequested;
          const deepStoryIds = syncCatalog
            ? new Set(this.deepStoryIdsRequested)
            : new Set<string>();
          this.syncRequested = false;
          if (syncCatalog) {
            this.catalogSyncRequested = false;
            this.deepSyncRequested = false;
            this.deepStoryIdsRequested.clear();
          }
          if (syncCatalog) {
            await this.performSyncPass(deep, deepStoryIds);
          } else {
            await this.performOutboxPass();
          }
        }
      } finally {
        this.activeSyncPromise = null;
      }
    })();
    return this.activeSyncPromise;
  }

  async getStories(): Promise<StoryWorld[]> {
    const currentUserId = this.getCurrentUserId();
    if (!LOCAL_ONLY_MODE && !currentUserId) return [];
    await this.awaitAccountScope(currentUserId);
    const storedStories = await this.localAdapter.getStories();
    if (!LOCAL_ONLY_MODE) this.assertCurrentAccount(currentUserId);
    let local = storedStories.filter(
      (story) => !currentUserId || !story.userId || story.userId === currentUserId,
    );
    if (LOCAL_ONLY_MODE) {
      const newestById = new Map<string, StoryWorld>();
      for (const story of local) {
        const existing = newestById.get(story.id);
        if (
          !existing ||
          new Date(story.updatedAt).getTime() > new Date(existing.updatedAt).getTime()
        ) {
          newestById.set(story.id, story);
        }
      }
      local = Array.from(newestById.values());
    }
    if (!this.activeTransaction) {
      return Promise.all(
        local.filter((s) => !s.deleted).map((story) => this.hydrateCurrentMedia(story)),
      );
    }

    const tx = this.activeTransaction;
    const storiesMap = new Map(local.map((s) => [s.id, s]));
    for (const id of tx.deletedStoryIds) {
      storiesMap.delete(id);
    }

    for (const [id, story] of tx.stories) {
      storiesMap.set(id, JSON.parse(JSON.stringify(story)));
    }

    const result = Array.from(storiesMap.values()).filter((s) => !s.deleted);
    result.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    return Promise.all(result.map((story) => this.hydrateCurrentMedia(story)));
  }

  startTransaction() {
    this.activeTransaction = {
      stories: new Map(),
      chapters: new Map(),
      deletedStoryIds: new Set(),
    };
  }

  async commitTransaction(): Promise<void> {
    if (!this.activeTransaction) return;
    const tx = this.activeTransaction;
    this.activeTransaction = null;
    for (const id of tx.deletedStoryIds) {
      await this.deleteStory(id);
    }

    for (const chapter of tx.chapters.values()) {
      if (tx.deletedStoryIds.has(chapter.storyId)) continue;
      await this.saveChapterContent(chapter);
    }

    for (const story of tx.stories.values()) {
      if (tx.deletedStoryIds.has(story.id)) continue;
      await this.saveStory(story);
    }
  }

  rollbackTransaction(): void {
    this.activeTransaction = null;
  }

  async getStory(id: string): Promise<StoryWorld | null> {
    const currentUserId = this.getCurrentUserId();
    if (!LOCAL_ONLY_MODE && !currentUserId) return null;
    await this.awaitAccountScope(currentUserId);
    if (this.activeTransaction) {
      if (this.activeTransaction.deletedStoryIds.has(id)) return null;
      if (this.activeTransaction.stories.has(id)) {
        return JSON.parse(
          JSON.stringify(this.activeTransaction.stories.get(id)),
        );
      }
    }

    let story = await this.localAdapter.getStory(id);
    if (!LOCAL_ONLY_MODE) this.assertCurrentAccount(currentUserId);
    if (story?.userId && currentUserId && story.userId !== currentUserId) {
      return null;
    }
    if (
      story?.persistenceHydration === "summary" &&
      this.isCloudAvailable &&
      currentUserId
    ) {
      const hydrated = await this.cloudAdapter.getStory(id);
      this.assertCurrentAccount(currentUserId);
      if (hydrated) {
        const cacheable = preparePermanentPersistencePayload({
          ...hydrated,
          persistenceHydration: "full" as const,
          mediaDescriptors: Object.fromEntries(
            Object.entries(hydrated.mediaDescriptors ?? {}).map(([assetId, descriptor]) => [
              assetId,
              { ...descriptor, deliveryUrl: "" },
            ]),
          ),
        });
        await this.localAdapter.saveStory(cacheable);
        this.rememberCloudRevision(cacheable);
        story = await this.hydrateCurrentMedia(cacheable);
      }
    }
    return story ? this.hydrateCurrentMedia(story) : null;
  }

  async saveStory(story: StoryWorld): Promise<void> {
    const currentUserId = this.getCurrentUserId();
    await this.awaitAccountScope(currentUserId);
    if (this.activeTransaction) {
      const existingLocal =
        this.activeTransaction.stories.get(story.id) ??
        (await this.localAdapter.getStory(story.id));
      if (!LOCAL_ONLY_MODE) this.assertCurrentAccount(currentUserId);
      if (
        currentUserId &&
        (story.userId ?? existingLocal?.userId) &&
        (story.userId ?? existingLocal?.userId) !== currentUserId
      ) {
        throw new Error("Cannot save a story that belongs to another account");
      }
      this.activeTransaction.stories.set(
        story.id,
        JSON.parse(
          JSON.stringify({
            ...story,
            userId: story.userId ?? existingLocal?.userId ?? currentUserId,
            syncRevision: this.createSyncRevision(),
            updatedAt: this.nextRevisionTimestamp(
              story.updatedAt,
              existingLocal?.updatedAt,
            ),
          }),
        ),
      );
      this.activeTransaction.deletedStoryIds.delete(story.id);
      return;
    }

    await this.withRecordLock(this.storyLockKey(story.id), async () => {
      if (!LOCAL_ONLY_MODE) this.assertCurrentAccount(currentUserId);
      // Keep preparation, extracted chapter writes, and the final parent write in
      // one story critical section. Otherwise a slow earlier save can finish its
      // preparation after a later save and overwrite the newer completed value.
      const existingLocal = await this.localAdapter.getStory(story.id);
      if (!LOCAL_ONLY_MODE) this.assertCurrentAccount(currentUserId);
      const ownerId =
        story.userId ?? existingLocal?.userId ?? currentUserId;
      if (currentUserId && ownerId && ownerId !== currentUserId) {
        throw new Error("Cannot save a story that belongs to another account");
      }

      const strippedStory: StoryWorld = JSON.parse(JSON.stringify(story));
      strippedStory.userId = ownerId;
      strippedStory.syncRevision = this.createSyncRevision();
      strippedStory.updatedAt = this.nextRevisionTimestamp(
        story.updatedAt,
        existingLocal?.updatedAt,
      );
      if (strippedStory.arcs) {
        for (const arc of strippedStory.arcs) {
          for (const chapter of arc.chapters) {
            if (
              chapter.generatedContent ||
              (chapter.blocks && chapter.blocks.length > 0)
            ) {
              if (chapter._isNewContent) {
                const content: ChapterContent = {
                  storyId: story.id,
                  chapterNumber: chapter.number,
                  generatedContent: chapter.generatedContent || "",
                  blocks: chapter.blocks,
                  summary: chapter.summary,
                  statsChangeMessage: chapter.statsChangeMessage,
                  cuePayload: chapter.cuePayload,
                  contextManifest: chapter.contextManifest,
                  handoff: chapter.handoff,
                  contract: chapter.contract,
                };
                await this.saveChapterContentUnderStoryLock(
                  content,
                  currentUserId,
                  strippedStory,
                  false,
                );
              }

              // Strip from the Story document to save space. sceneFingerprints
              // and contractReport intentionally stay on the scaffold — they are
              // compact and power contract building without content loads.
              chapter.hasContent = true;
              delete chapter.generatedContent;
              delete chapter.blocks;
              // delete chapter.summary; // Keep summary in the main story document for lightweight context retrieval
              delete chapter.statsChangeMessage;
              delete chapter.cuePayload;
              delete chapter.contextManifest;
              delete chapter.handoff;
              delete chapter.contract;
              delete chapter._isNewContent;
            }
          }
        }
      }

      try {
        await this.localAdapter.saveStory(strippedStory);
      } catch (e) {
        console.error("Failed to save story locally; cloud sync was not queued:", e);
        throw e;
      }

      await this.enqueueTask({
        type: "story",
        storyId: strippedStory.id,
        timestamp: Date.now(),
        userId: strippedStory.userId,
      });
    });
  }

  async deleteStory(id: string): Promise<void> {
    const currentUserId = this.getCurrentUserId();
    await this.awaitAccountScope(currentUserId);
    if (this.activeTransaction) {
      this.activeTransaction.deletedStoryIds.add(id);
      this.activeTransaction.stories.delete(id);
      return;
    }

    await this.withRecordLock(this.storyLockKey(id), async () => {
      if (!LOCAL_ONLY_MODE) this.assertCurrentAccount(currentUserId);
      const existing = await this.localAdapter.getStory(id);
      if (!LOCAL_ONLY_MODE) this.assertCurrentAccount(currentUserId);
      if (currentUserId && existing?.userId && existing.userId !== currentUserId) {
        throw new Error("Cannot delete a story that belongs to another account");
      }
      const ownerId = existing?.userId ?? currentUserId;

      try {
        await this.localAdapter.deleteStory(id);
        if (existing) {
          await this.localAdapter.saveStory({
            ...existing,
            userId: ownerId,
            deleted: true,
            updatedAt: this.nextRevisionTimestamp(existing.updatedAt),
          });
        }
      } catch (e) {
        console.error("Failed to tombstone story locally:", e);
        throw e;
      }

      await this.discardPendingMutationsForStory(id, ownerId);
      // Deletions use the same durable outbox as writes. The cloud adapter keeps
      // a tombstone after removing chapter bodies, preventing stale devices from
      // treating an intentional deletion as a new local-only story.
      await this.enqueueTask({
        type: "delete_story",
        storyId: id,
        timestamp: Date.now(),
        userId: ownerId,
      });
    });
  }

  async getChapterContent(
    storyId: string,
    chapterNumber: number,
  ): Promise<ChapterContent | null> {
    const currentUserId = this.getCurrentUserId();
    if (!LOCAL_ONLY_MODE && !currentUserId) return null;
    await this.awaitAccountScope(currentUserId);
    if (this.activeTransaction) {
      if (this.activeTransaction.deletedStoryIds.has(storyId)) return null;
      const key = `${storyId}-${chapterNumber}`;
      if (this.activeTransaction.chapters.has(key)) {
        return JSON.parse(
          JSON.stringify(this.activeTransaction.chapters.get(key)),
        );
      }
    }

    return this.withRecordLock(this.storyLockKey(storyId), async () => {
      if (!LOCAL_ONLY_MODE) this.assertCurrentAccount(currentUserId);
      const parentStory = await this.localAdapter.getStory(storyId);
      if (!LOCAL_ONLY_MODE) this.assertCurrentAccount(currentUserId);
      if (parentStory?.deleted) return null;
      if (
        currentUserId &&
        parentStory?.userId &&
        parentStory.userId !== currentUserId
      ) {
        return null;
      }

      return this.withRecordLock(
        this.chapterLockKey(storyId, chapterNumber),
        async () => {
          const localItem = await this.localAdapter.getChapterContent(
            storyId,
            chapterNumber,
          );
          if (!LOCAL_ONLY_MODE) this.assertCurrentAccount(currentUserId);
          if (localItem) return localItem;
          if (!this.isCloudAvailable) return null;

          try {
            const cloudItem = await this.cloudAdapter.getChapterContent(
              storyId,
              chapterNumber,
            );
            this.assertCurrentAccount(currentUserId);
            if (!cloudItem) return null;

            // The network request yields control. Re-check both records before
            // caching so a local edit or deletion that landed meanwhile wins.
            const latestParent = await this.localAdapter.getStory(storyId);
            this.assertCurrentAccount(currentUserId);
            if (
              latestParent?.deleted ||
              (parentStory && !latestParent) ||
              (currentUserId &&
                latestParent?.userId &&
                latestParent.userId !== currentUserId)
            ) {
              return null;
            }
            const latestLocal = await this.localAdapter.getChapterContent(
              storyId,
              chapterNumber,
            );
            this.assertCurrentAccount(currentUserId);
            if (latestLocal) return latestLocal;

            try {
              await this.localAdapter.saveChapterContent(cloudItem);
            } catch (e) {
              console.warn("Failed to cache cloud chapter locally", e);
            }
            return cloudItem;
          } catch (e) {
            console.error("Cloud fetch failed, failing silently", e);
            return null;
          }
        },
      );
    });
  }

  async saveChapterContent(content: ChapterContent): Promise<void> {
    const currentUserId = this.getCurrentUserId();
    await this.awaitAccountScope(currentUserId);
    if (this.activeTransaction) {
      const key = `${content.storyId}-${content.chapterNumber}`;
      const parentStory =
        this.activeTransaction.stories.get(content.storyId) ??
        (await this.localAdapter.getStory(content.storyId));
      const existingContent =
        this.activeTransaction.chapters.get(key) ??
        (await this.localAdapter.getChapterContent(
          content.storyId,
          content.chapterNumber,
        ));
      if (!LOCAL_ONLY_MODE) this.assertCurrentAccount(currentUserId);
      if (
        currentUserId &&
        parentStory?.userId &&
        parentStory.userId !== currentUserId
      ) {
        throw new Error("Cannot save a chapter that belongs to another account");
      }
      const stampedContent: ChapterContent = {
        ...JSON.parse(JSON.stringify(content)),
        syncRevision: this.createSyncRevision(),
        updatedAt: this.nextRevisionTimestamp(
          content.updatedAt,
          existingContent?.updatedAt,
        ),
      };
      this.activeTransaction.chapters.set(key, stampedContent);
      return;
    }

    await this.withRecordLock(this.storyLockKey(content.storyId), async () => {
      if (!LOCAL_ONLY_MODE) this.assertCurrentAccount(currentUserId);
      const parentStory = await this.localAdapter.getStory(content.storyId);
      if (!LOCAL_ONLY_MODE) this.assertCurrentAccount(currentUserId);
      await this.saveChapterContentUnderStoryLock(
        content,
        currentUserId,
        parentStory,
        true,
      );
    });
  }

  /** Save a chapter while the caller owns its story lock. */
  private async saveChapterContentUnderStoryLock(
    content: ChapterContent,
    currentUserId: string | undefined,
    parentStory: StoryWorld | null,
    bumpParentHeartbeat: boolean,
  ): Promise<void> {
    if (parentStory?.deleted) {
      throw new Error("Cannot save a chapter for a deleted story");
    }
    if (
      currentUserId &&
      parentStory?.userId &&
      parentStory.userId !== currentUserId
    ) {
      throw new Error("Cannot save a chapter that belongs to another account");
    }

    let stampedContent!: ChapterContent;
    await this.withRecordLock(
      this.chapterLockKey(content.storyId, content.chapterNumber),
      async () => {
        const existingContent = await this.localAdapter.getChapterContent(
          content.storyId,
          content.chapterNumber,
        );
        stampedContent = {
          ...JSON.parse(JSON.stringify(content)),
          syncRevision: this.createSyncRevision(),
          updatedAt: this.nextRevisionTimestamp(
            content.updatedAt,
            existingContent?.updatedAt,
          ),
        };
        try {
          await this.localAdapter.saveChapterContent(stampedContent);
        } catch (e) {
          console.error(
            "Failed to save chapter locally; cloud sync was not queued:",
            e,
          );
          throw e;
        }

        await this.enqueueTask({
          type: "chapter",
          storyId: stampedContent.storyId,
          chapterNumber: stampedContent.chapterNumber,
          timestamp: Date.now(),
          userId: parentStory?.userId ?? currentUserId,
        });
      },
    );

    if (!bumpParentHeartbeat || !parentStory) return;

    // Chapter documents do not have their own realtime query. Bump the parent
    // story so other open devices receive a targeted snapshot after the body.
    const heartbeat: StoryWorld = {
      ...parentStory,
      userId: parentStory.userId ?? currentUserId,
      syncRevision: this.createSyncRevision(),
      updatedAt: this.nextRevisionTimestamp(
        parentStory.updatedAt,
        stampedContent.updatedAt,
      ),
    };
    try {
      await this.localAdapter.saveStory(heartbeat);
      await this.enqueueTask({
        type: "story",
        storyId: heartbeat.id,
        timestamp: Date.now(),
        userId: heartbeat.userId,
      });
    } catch (error) {
      console.error("Chapter saved, but its story sync heartbeat failed:", error);
      throw error;
    }
  }

  async clearAll(): Promise<void> {
    await this.awaitAccountScope(this.getCurrentUserId());
    if (!this.localAdapter.clearAll) {
      throw new Error(
        `clearAll is not supported by the active local adapter: ${this.localAdapter.name}`,
      );
    }
    await this.localAdapter.clearAll();
  }

  async getAudioBlob(url: string): Promise<Blob | null> {
    if (this.localAdapter.getAudioBlob) {
      return this.localAdapter.getAudioBlob(url);
    }

    return null;
  }

  async saveAudioBlob(url: string, blob: Blob): Promise<void> {
    if (this.localAdapter.saveAudioBlob) {
      try {
        await this.localAdapter.saveAudioBlob(url, blob);
      } catch (e) {
        console.warn("Failed to save audio blob locally (quota exceeded?)", e);
      }
    }
  }

  getActiveAdapterName(): string {
    return (
      this.localAdapter.name + (this.isCloudAvailable ? " + Cloud Sync" : "")
    );
  }
}
