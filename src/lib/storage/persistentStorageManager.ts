import { StorageAdapter } from "./types";
import { StoryWorld, ChapterContent } from "../../types";
import { SyncStatus, SyncTask, SyncAuditResult } from "./types";
import { LocalStorageFallbackAdapter } from "./localStorageAdapter";
import { FirebaseStorageAdapter } from "../firebaseStorage";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { IndexedDBStorageAdapter } from "./indexedDBAdapter";
import { InMemoryFallbackAdapter } from "./inMemoryAdapter";
import { LOCAL_ONLY_MODE } from "../firebase";

/**
 * Universal Storage Manager utilizing IndexedDB for high storage capacity
 * with dynamic and silent fallback to local storage under secure sandboxed contexts.
 * Also handles seamless Firebase Cloud Syncing and merging when authenticated.
 */
export class PersistentStorageManager implements StorageAdapter {
  name = "PersistentStorageManager";
  private localAdapter: StorageAdapter;
  private cloudAdapter: FirebaseStorageAdapter;
  private isCloudAvailable = false;
  private syncStatus: SyncStatus = "idle";
  private subscribers: ((status: SyncStatus) => void)[] = [];
  private syncQueue: SyncTask[] = [];
  private queueKey = "@seihouse/sync-queue";
  private activeTransaction: {
    stories: Map<string, StoryWorld>;
    chapters: Map<string, ChapterContent>;
    deletedStoryIds: Set<string>;
  } | null = null;
  private conflictHandler: ((conflict: any) => void) | null = null;
  private activeFlushPromise: Promise<void> | null = null;

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
  // Firestore's free tier is 20k writes/day for one user; this sits comfortably under it.
  private writeCountKey = "@seihouse/cloud-write-count";
  private readonly DAILY_WRITE_CAP = 8000;
  private budgetTrippedLogged = false;
  // Give a failing sync task this many retries before dropping it (prevents a poison task
  // from permanently jamming the queue, while surviving transient network outages).
  private readonly MAX_TASK_ATTEMPTS = 5;
  private beforeUnloadListener: (() => void) | null = null;
  private visibilityChangeListener: (() => void) | null = null;

  constructor() {
    this.localAdapter = new LocalStorageFallbackAdapter();
    this.cloudAdapter = new FirebaseStorageAdapter();
    this.loadQueue();

    // Push any coalesced/pending writes when the user navigates away or hides the tab,
    // so debouncing never costs unsynced work. (The queue is also persisted to
    // localStorage, so anything not flushed here still syncs on next launch.)
    // References are retained so dispose() can remove them (avoids leaks / test pollution).
    if (typeof window !== "undefined") {
      this.beforeUnloadListener = () => {
        void this.flushSyncQueue();
      };
      window.addEventListener("beforeunload", this.beforeUnloadListener);
      this.visibilityChangeListener = () => {
        if (
          typeof document !== "undefined" &&
          document.visibilityState === "hidden"
        ) {
          void this.flushSyncQueue();
        }
      };
      window.addEventListener(
        "visibilitychange",
        this.visibilityChangeListener,
      );
    }
  }

  /** Remove global listeners and cancel any pending flush. Call when discarding a manager. */
  public dispose() {
    if (typeof window !== "undefined") {
      if (this.beforeUnloadListener)
        window.removeEventListener("beforeunload", this.beforeUnloadListener);
      if (this.visibilityChangeListener)
        window.removeEventListener(
          "visibilitychange",
          this.visibilityChangeListener,
        );
    }
    this.beforeUnloadListener = null;
    this.visibilityChangeListener = null;
    this.cancelScheduledFlush();
  }

  onConflict(handler: (conflict: any) => void) {
    this.conflictHandler = handler;
  }

  private loadQueue() {
    try {
      const q = localStorage.getItem(this.queueKey);
      if (q) this.syncQueue = JSON.parse(q);
    } catch {
      console.warn("Failed to load sync queue");
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(this.queueKey, JSON.stringify(this.syncQueue));
    } catch {
      console.warn("Failed to save sync queue");
    }
  }

  private enqueueTask(task: SyncTask) {
    const exists = this.syncQueue.some(
      (t) =>
        t.type === task.type &&
        t.storyId === task.storyId &&
        t.chapterNumber === task.chapterNumber,
    );
    if (!exists) {
      this.syncQueue.push(task);
    }

    this.saveQueue();
    if (this.isCloudAvailable && this.syncStatus !== "syncing") {
      this.scheduleFlush();
    }
  }

  // Debounce the cloud flush so a burst of enqueues coalesces into a single sync pass.
  private scheduleFlush() {
    if (this.flushTimer) return; // a flush is already scheduled within the window
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flushSyncQueue();
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

  /**
   * A permanent failure won't succeed on retry (bad permissions, invalid data), so the task
   * should be dropped rather than jamming the queue. Anything else (network/server hiccups,
   * or unknown errors) is treated as transient and retried, favouring data safety.
   */
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
    const total = this.bumpWriteCounter();
    // Lightweight, low-noise visibility: a heartbeat every 25 writes.
    if (total % 25 === 0) {
      console.info(`[Storage] cloud writes today: ${total} (last: ${label})`);
    }
    return true;
  }

  private async flushSyncQueue() {
    this.cancelScheduledFlush();
    if (!this.isCloudAvailable || this.syncQueue.length === 0) return;
    if (this.activeFlushPromise) {
      return this.activeFlushPromise;
    }

    this.activeFlushPromise = (async () => {
      this.setStatus("syncing");

      try {
        while (this.syncQueue.length > 0) {
          // Peek — only remove the task once it is written (or permanently failed), so a
          // circuit-breaker stop leaves pending work safely queued for later.
          const task = this.syncQueue[0];
          let blocked = false;

          try {
            if (task.type === "story") {
              const localStory = await this.localAdapter.getStory(task.storyId);
              if (localStory) {
                const cloudPayload = JSON.parse(JSON.stringify(localStory));
                await this.compressDataUrls(cloudPayload);
                blocked = !(await this.cloudWrite(
                  () => this.cloudAdapter.saveStory(cloudPayload),
                  `story:${task.storyId}`,
                ));
              }
            } else if (
              task.type === "chapter" &&
              task.chapterNumber !== undefined
            ) {
              const localChapter = await this.localAdapter.getChapterContent(
                task.storyId,
                task.chapterNumber,
              );
              if (localChapter) {
                blocked = !(await this.cloudWrite(
                  () => this.cloudAdapter.saveChapterContent(localChapter),
                  `chapter:${task.storyId}#${task.chapterNumber}`,
                ));
              }
            } else if (task.type === "delete_story") {
              blocked = !(await this.cloudWrite(
                () => this.cloudAdapter.deleteStory(task.storyId),
                `delete:${task.storyId}`,
              ));
            }
          } catch (taskError: any) {
            // Protect against data loss: a transient network/server hiccup must NOT drop the
            // task (chapter content only ever syncs through this queue). Keep it and retry on
            // a later flush. Only give up after repeated failures, to avoid a permanent jam
            // from a genuinely poison task (e.g. a permission/validation error).
            task.attempts = (task.attempts || 0) + 1;
            if (
              this.isPermanentError(taskError) ||
              task.attempts >= this.MAX_TASK_ATTEMPTS
            ) {
              console.error(
                `Task permanently failed after ${task.attempts} attempt(s), dropping to prevent jam:`,
                taskError,
              );
              this.syncQueue.shift();
              this.saveQueue();
              continue;
            }
            console.warn(
              `Transient sync error (attempt ${task.attempts}/${this.MAX_TASK_ATTEMPTS}); keeping task queued to retry later:`,
              taskError,
            );
            this.saveQueue();
            this.setStatus("error");
            break;
          }

          if (blocked) {
            // Daily write budget hit — stop here and keep remaining tasks for next time.
            break;
          }

          this.syncQueue.shift();
          this.saveQueue();
        }

        this.setStatus(this.syncQueue.length > 0 ? "offline" : "synced");
      } catch (error: any) {
        console.error("Failed to flush sync queue", error);
        // Keep remaining unprocessed tasks in queue to try again later
        this.setStatus("error");
      } finally {
        this.activeFlushPromise = null;
      }
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

  private setStatus(status: SyncStatus) {
    this.syncStatus = status;
    this.subscribers.forEach((cb) => cb(status));
  }

  async init(): Promise<void> {
    const idbAdapter = new IndexedDBStorageAdapter();
    try {
      await idbAdapter.init();
      this.localAdapter = idbAdapter;
      console.log(
        "Successfully active local-first story world memory: IndexedDB",
      );

      // MIGRATION: Migrate from LocalStorage to IndexedDB if IndexedDB is empty
      try {
        const existingStories = await idbAdapter.getStories();
        if (existingStories.length === 0) {
          const lsAdapter = new LocalStorageFallbackAdapter();
          await lsAdapter.init();
          const lsStories = await lsAdapter.getStories();
          if (lsStories.length > 0) {
            console.log(
              `Migrating ${lsStories.length} stories from LocalStorage to IndexedDB...`,
            );
            for (const story of lsStories) {
              await idbAdapter.saveStory(story);
            }
            try {
              const chaptersStr = localStorage.getItem(
                "@seihouse/fiction-generator-chapters-v2",
              );
              if (chaptersStr) {
                const chapters = JSON.parse(chaptersStr);
                for (const chap of chapters) {
                  await idbAdapter.saveChapterContent(chap);
                }
              }
            } catch (e) {
              console.warn("Failed to migrate chapters from LocalStorage", e);
            }
            console.log("Migration complete.");
          }
        }
      } catch (migErr) {
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
        this.isCloudAvailable = false;
        this.setStatus("offline");
        return;
      }
      await this.cloudAdapter.init();

      onAuthStateChanged(auth, async (user) => {
        if (user) {
          this.isCloudAvailable = true;
          await this.performSync();
        } else {
          this.isCloudAvailable = false;
          this.setStatus("offline");
        }
      });
      this.setStatus(auth.currentUser ? "idle" : "offline");
    } catch (err) {
      console.warn("Firebase init failed, running local only.", err);
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

    if (Math.abs(localTime - cloudTime) <= 5000) return false;
    if (local.title !== cloud.title) return true;
    if (local.currentChapterNumber !== cloud.currentChapterNumber) return true;
    const localChars = local.memory?.characters?.length || 0;
    const cloudChars = cloud.memory?.characters?.length || 0;
    if (localChars !== cloudChars) return true;
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
    if (getHasContentCount(local) !== getHasContentCount(cloud)) return true;
    return false;
  }

  private handleSyncConflict(
    localStory: StoryWorld,
    cloudStory: StoryWorld,
  ): void {
    try {
      if (this.conflictHandler) {
        this.conflictHandler({
          storyId: localStory.id,
          localStory: JSON.parse(JSON.stringify(localStory)),
          cloudStory: JSON.parse(JSON.stringify(cloudStory)),
        });
      }
    } catch (err) {
      console.warn("Failed to dispatch active conflict to handler:", err);
    }
  }

  private async reconcileStory(
    localStory: StoryWorld,
    cloudStory?: StoryWorld,
  ): Promise<boolean> {
    if (!cloudStory) {
      // Exists locally but not in cloud. Push to cloud.
      const cloudPayload = JSON.parse(JSON.stringify(localStory));
      await this.compressDataUrls(cloudPayload);
      const ok = await this.cloudWrite(
        () => this.cloudAdapter.saveStory(cloudPayload),
        `sync-new:${localStory.id}`,
      );
      return ok;
    }

    // Exists in both. Check if they differ significantly.
    if (this.checkSignificantDifference(localStory, cloudStory)) {
      this.handleSyncConflict(localStory, cloudStory);
      // Skip syncing this story until the user resolves the conflict
      return true;
    }

    // Otherwise, proceed with minor automatic timestamp syncing
    const localTime = new Date(localStory.updatedAt).getTime();
    const cloudTime = new Date(cloudStory.updatedAt).getTime();

    if (localTime > cloudTime) {
      const cloudPayload = JSON.parse(JSON.stringify(localStory));
      await this.compressDataUrls(cloudPayload);
      const ok = await this.cloudWrite(
        () => this.cloudAdapter.saveStory(cloudPayload),
        `sync-update:${localStory.id}`,
      );
      return ok;
    } else if (cloudTime > localTime) {
      try {
        await this.localAdapter.saveStory(cloudStory);
      } catch (err) {
        console.error("Failed to save cloud story locally:", err);
      }
    }

    return true;
  }

  private async downloadMissingCloudStories(
    cloudStories: StoryWorld[],
    localMap: Map<string, StoryWorld>,
  ): Promise<void> {
    for (const cloudStory of cloudStories) {
      if (!localMap.has(cloudStory.id)) {
        try {
          await this.localAdapter.saveStory(cloudStory);
        } catch (err) {
          console.error("Failed to save downloaded cloud story locally:", err);
        }
      }
    }
  }

  public async performSync() {
    if (!this.isCloudAvailable) return;
    await this.flushSyncQueue();
    this.setStatus("syncing");
    try {
      // Get all local and cloud stories
      const localStories = await this.localAdapter.getStories();
      const cloudStories = await this.cloudAdapter.getStories();

      const cloudMap = new Map(cloudStories.map((s) => [s.id, s]));
      const localMap = new Map(localStories.map((s) => [s.id, s]));

      // Merge logic: newest updatedAt wins, but handle conflicts by copying
      const BATCH_SIZE = 10;
      for (let i = 0; i < localStories.length; i += BATCH_SIZE) {
        const batch = localStories.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map((localStory) =>
            this.reconcileStory(localStory, cloudMap.get(localStory.id)),
          ),
        );
        if (results.some((ok) => !ok)) {
          break; // budget tripped — stop pushing for now
        }
      }

      // Download stories in cloud but not local
      await this.downloadMissingCloudStories(cloudStories, localMap);

      this.setStatus(this.isWriteBudgetExceeded() ? "offline" : "synced");
    } catch (error) {
      console.error("Cloud sync failed:", error);
      this.setStatus("error");
    }
  }

  public async getSyncAudit(): Promise<SyncAuditResult> {
    const localStories = await this.localAdapter.getStories();
    let cloudStoriesCount = 0;
    const mismatches = [];
    const missingChapters = [];
    if (this.isCloudAvailable) {
      const cloudStories = await this.cloudAdapter.getStories();
      cloudStoriesCount = cloudStories.length;
    }

    for (const story of localStories) {
      if (story.arcs) {
        for (const arc of story.arcs) {
          for (const chapter of arc.chapters) {
            if (chapter.hasContent) {
              const c = await this.localAdapter.getChapterContent(
                story.id,
                chapter.number,
              );
              if (!c) {
                missingChapters.push(
                  `Story: ${story.title}, Chapter: ${chapter.number}`,
                );
              }
            }
          }
        }
      }
    }

    return {
      localStories: localStories.length,
      cloudStories: cloudStoriesCount,
      mismatches,
      missingChapters,
      pendingWrites: this.syncQueue.length,
    };
  }

  public async auditAndRecoverChapters(storyId: string): Promise<number> {
    const story = await this.getStory(storyId);
    if (!story || !story.arcs) return 0;
    let recovered = 0;
    let modified = false;
    for (const arc of story.arcs) {
      for (const chapter of arc.chapters) {
        if (chapter.hasContent) {
          const localContent = await this.localAdapter.getChapterContent(
            storyId,
            chapter.number,
          );
          if (!localContent && this.isCloudAvailable) {
            // Try to recover from cloud
            try {
              const cloudContent = await this.cloudAdapter.getChapterContent(
                storyId,
                chapter.number,
              );
              if (cloudContent) {
                await this.localAdapter.saveChapterContent(cloudContent);
                recovered++;
                continue;
              }
            } catch (e) {
              console.error("Failed to recover chapter from cloud", e);
            }
          }

          if (!localContent) {
            // Completely missing in both places, remove the flag to let user regenerate
            chapter.hasContent = false;
            modified = true;
          }
        }
      }
    }

    if (modified) {
      await this.saveStory(story);
    }

    return recovered;
  }

  async getStories(): Promise<StoryWorld[]> {
    const local = await this.localAdapter.getStories();
    if (!this.activeTransaction) {
      return local.filter((s) => !s.deleted);
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
    return result;
  }

  public async wipeMyCloudData(): Promise<void> {
    if (!this.isCloudAvailable) throw new Error("Cloud is not available");
    await this.cloudAdapter.wipeMyCloudData();
    this.syncQueue = [];
    this.saveQueue();
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
      await this.saveChapterContent(chapter);
    }

    for (const story of tx.stories.values()) {
      await this.saveStory(story);
    }
  }

  rollbackTransaction(): void {
    this.activeTransaction = null;
  }

  async getStory(id: string): Promise<StoryWorld | null> {
    if (this.activeTransaction) {
      if (this.activeTransaction.deletedStoryIds.has(id)) return null;
      if (this.activeTransaction.stories.has(id)) {
        return JSON.parse(
          JSON.stringify(this.activeTransaction.stories.get(id)),
        );
      }
    }

    return this.localAdapter.getStory(id);
  }

  private async compressDataUrls(story: StoryWorld) {
    const isDataUrl = (url?: string) => url && url.startsWith("data:image/");
    const compress = async (dataUrl: string): Promise<string> => {
      if (dataUrl.length < 60000) return dataUrl; // Skip if already small
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_SIZE = 400;
          let width = img.width;
          let height = img.height;
          if (width > MAX_SIZE || height > MAX_SIZE) {
            if (width > height) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            } else {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.6));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      });
    };

    const compressPromises: Promise<void>[] = [];

    if (story.imageUrl && isDataUrl(story.imageUrl)) {
      compressPromises.push(
        compress(story.imageUrl).then((res) => {
          story.imageUrl = res;
        }),
      );
    }

    if (story.imageHistory) {
      for (let i = 0; i < story.imageHistory.length; i++) {
        if (isDataUrl(story.imageHistory[i].imageUrl)) {
          compressPromises.push(
            compress(story.imageHistory[i].imageUrl).then((res) => {
              story.imageHistory[i].imageUrl = res;
            }),
          );
        }
      }
    }

    if (story.memory) {
      if (story.memory.characters) {
        for (const c of story.memory.characters) {
          if (c.imageUrl && isDataUrl(c.imageUrl)) {
            compressPromises.push(
              compress(c.imageUrl).then((res) => {
                c.imageUrl = res;
              }),
            );
          }
          if (c.imageHistory) {
            for (let i = 0; i < c.imageHistory.length; i++) {
              if (isDataUrl(c.imageHistory[i].imageUrl)) {
                compressPromises.push(
                  compress(c.imageHistory[i].imageUrl).then((res) => {
                    c.imageHistory[i].imageUrl = res;
                  }),
                );
              }
            }
          }
        }
      }
      if (story.memory.locations) {
        for (const c of story.memory.locations) {
          if (c.imageUrl && isDataUrl(c.imageUrl)) {
            compressPromises.push(
              compress(c.imageUrl).then((res) => {
                c.imageUrl = res;
              }),
            );
          }
          if (c.imageHistory) {
            for (let i = 0; i < c.imageHistory.length; i++) {
              if (isDataUrl(c.imageHistory[i].imageUrl)) {
                compressPromises.push(
                  compress(c.imageHistory[i].imageUrl).then((res) => {
                    c.imageHistory[i].imageUrl = res;
                  }),
                );
              }
            }
          }
        }
      }
      if (story.memory.artifacts) {
        for (const c of story.memory.artifacts) {
          if (c.imageUrl && isDataUrl(c.imageUrl)) {
            compressPromises.push(
              compress(c.imageUrl).then((res) => {
                c.imageUrl = res;
              }),
            );
          }
          if (c.imageHistory) {
            for (let i = 0; i < c.imageHistory.length; i++) {
              if (isDataUrl(c.imageHistory[i].imageUrl)) {
                compressPromises.push(
                  compress(c.imageHistory[i].imageUrl).then((res) => {
                    c.imageHistory[i].imageUrl = res;
                  }),
                );
              }
            }
          }
        }
      }
    }

    await Promise.all(compressPromises);

    if (story.arcs) {
      story.arcs.forEach((arc) => {
        arc.chapters.forEach((ch) => {
          if (ch.assetManifest && isDataUrl(ch.assetManifest.heroImage)) {
            delete ch.assetManifest.heroImage;
          }
        });
      });
    }
  }

  async saveStory(story: StoryWorld): Promise<void> {
    if (this.activeTransaction) {
      this.activeTransaction.stories.set(
        story.id,
        JSON.parse(JSON.stringify(story)),
      );
      this.activeTransaction.deletedStoryIds.delete(story.id);
      return;
    }

    const strippedStory: StoryWorld = JSON.parse(JSON.stringify(story));
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
              };
              await this.saveChapterContent(content);
            }

            // Strip from the Story document to save space
            chapter.hasContent = true;
            delete chapter.generatedContent;
            delete chapter.blocks;
            // delete chapter.summary; // Keep summary in the main story document for lightweight context retrieval
            delete chapter.statsChangeMessage;
            delete chapter.cuePayload;
            delete chapter._isNewContent;
          }
        }
      }
    }

    try {
      await this.localAdapter.saveStory(strippedStory);
    } catch (e) {
      console.error(
        "Failed to save story locally (quota exceeded?). Attempting to continue with cloud sync:",
        e,
      );
    }

    this.enqueueTask({
      type: "story",
      storyId: strippedStory.id,
      timestamp: Date.now(),
    });
  }

  async deleteStory(id: string): Promise<void> {
    if (this.activeTransaction) {
      this.activeTransaction.deletedStoryIds.add(id);
      this.activeTransaction.stories.delete(id);
      return;
    }

    try {
      await this.localAdapter.deleteStory(id);
    } catch (e) {
      console.error("Failed to hard delete story locally:", e);
    }

    if (this.isCloudAvailable && this.syncStatus !== "syncing") {
      (async () => {
        try {
          await this.cloudAdapter.deleteStory(id);
        } catch (err) {
          console.error("Failed to hard delete from cloud", err);
          this.enqueueTask({
            type: "delete_story",
            storyId: id,
            timestamp: Date.now(),
          });
        }
      })();
    } else {
      this.enqueueTask({
        type: "delete_story",
        storyId: id,
        timestamp: Date.now(),
      });
    }
  }

  async getChapterContent(
    storyId: string,
    chapterNumber: number,
  ): Promise<ChapterContent | null> {
    if (this.activeTransaction) {
      const key = `${storyId}-${chapterNumber}`;
      if (this.activeTransaction.chapters.has(key)) {
        return JSON.parse(
          JSON.stringify(this.activeTransaction.chapters.get(key)),
        );
      }
    }

    const localItem = await this.localAdapter.getChapterContent(
      storyId,
      chapterNumber,
    );
    if (localItem) return localItem;
    if (this.isCloudAvailable) {
      try {
        const cloudItem = await this.cloudAdapter.getChapterContent(
          storyId,
          chapterNumber,
        );
        if (cloudItem) {
          // Cache locally
          try {
            await this.localAdapter.saveChapterContent(cloudItem);
          } catch (e) {
            console.warn("Failed to cache cloud chapter locally", e);
          }
          return cloudItem;
        }
      } catch (e) {
        console.error("Cloud fetch failed, failing silently", e);
        // Fail silently
      }
    }

    return null;
  }

  async saveChapterContent(content: ChapterContent): Promise<void> {
    content.updatedAt = new Date().toISOString();
    if (this.activeTransaction) {
      const key = `${content.storyId}-${content.chapterNumber}`;
      this.activeTransaction.chapters.set(
        key,
        JSON.parse(JSON.stringify(content)),
      );
      return;
    }

    try {
      await this.localAdapter.saveChapterContent(content);
    } catch (e) {
      console.error(
        "Failed to save chapter locally (quota exceeded?). Attempting to continue with cloud sync:",
        e,
      );
    }

    this.enqueueTask({
      type: "chapter",
      storyId: content.storyId,
      chapterNumber: content.chapterNumber,
      timestamp: Date.now(),
    });
  }

  async clearAll(): Promise<void> {
    if (this.localAdapter.clearAll) {
      await this.localAdapter.clearAll();
    }
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
