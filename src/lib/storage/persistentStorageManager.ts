import { StorageAdapter } from "./types";
import { StoryWorld, ChapterContent } from "../../types";
import { SyncStatus, SyncTask, SyncAuditResult } from "./types";
import { LocalStorageFallbackAdapter } from "./localStorageAdapter";
import { SupabaseStorageAdapter } from "../supabaseStorage";
import { supabase } from "../supabase";
import { IndexedDBStorageAdapter } from "./indexedDBAdapter";
import { InMemoryFallbackAdapter } from "./inMemoryAdapter";
// Note: LOCAL_ONLY_MODE flag could be managed differently now, assuming it's still available or we can just bypass it.
import { LOCAL_ONLY_MODE } from "../firebase"; // Keep this if we still have it in firebase.ts, or just define it here.

/**
 * Universal Storage Manager utilizing IndexedDB for high storage capacity
 * with dynamic and silent fallback to local storage under secure sandboxed contexts.
 * Also handles seamless Supabase Cloud Syncing and merging when authenticated.
 */
export class PersistentStorageManager implements StorageAdapter {
    name = 'PersistentStorageManager';
    private localAdapter: StorageAdapter;
    private cloudAdapter: SupabaseStorageAdapter;
    private isCloudAvailable = false;
    private syncStatus: SyncStatus = 'idle';
    private subscribers: ((status: SyncStatus) => void)[] = [];
    private syncQueue: SyncTask[] = [];
    private queueKey = '@seihouse/sync-queue';
    private activeTransaction: {
        stories: Map<string, StoryWorld>;
        chapters: Map<string, ChapterContent>;
        deletedStoryIds: Set<string>;
        } | null = null;
    private conflictHandler: ((conflict: any) => void) | null = null;
    private activeFlushPromise: Promise<void> | null = null;

    constructor() {
        this.localAdapter = new LocalStorageFallbackAdapter();
        this.cloudAdapter = new SupabaseStorageAdapter();
        this.loadQueue();
    }

    onConflict(handler: (conflict: any) => void) {
        this.conflictHandler = handler;
    }

    private loadQueue() {
        try {
          const q = localStorage.getItem(this.queueKey);
          if (q) this.syncQueue = JSON.parse(q);
        } catch {
          console.warn('Failed to load sync queue');
        }
    }

    private saveQueue() {
        try {
          localStorage.setItem(this.queueKey, JSON.stringify(this.syncQueue));
        } catch {
          console.warn('Failed to save sync queue');
        }
    }

    private enqueueTask(task: SyncTask) {
        const exists = this.syncQueue.some(t => t.type === task.type && t.storyId === task.storyId && t.chapterNumber === task.chapterNumber);
        if (!exists) {
          this.syncQueue.push(task);
        }

        this.saveQueue();
        if (this.isCloudAvailable && this.syncStatus !== 'syncing') {
          this.flushSyncQueue();
        }
    }

    private async flushSyncQueue() {
        if (!this.isCloudAvailable || this.syncQueue.length === 0) return;
        if (this.activeFlushPromise) {
          return this.activeFlushPromise;
        }

        this.activeFlushPromise = (async () => {
          this.setStatus('syncing');

          try {
            while (this.syncQueue.length > 0) {
              const task = this.syncQueue.shift()!;
              this.saveQueue();

              try {
                if (task.type === 'story') {
                  const localStory = await this.localAdapter.getStory(task.storyId);
                  if (localStory) {
                    const cloudPayload = JSON.parse(JSON.stringify(localStory));
                    await this.compressDataUrls(cloudPayload);
                    await this.cloudAdapter.saveStory(cloudPayload);
                  }
                } else if (task.type === 'chapter' && task.chapterNumber !== undefined) {
                  const localChapter = await this.localAdapter.getChapterContent(task.storyId, task.chapterNumber);
                  if (localChapter) {
                    await this.cloudAdapter.saveChapterContent(localChapter);
                  }
                } else if (task.type === 'delete_story') {
                  await this.cloudAdapter.deleteStory(task.storyId);
                }
              } catch (taskError: any) {
                console.error('Task failed, dropping from queue to prevent jam:', taskError);
              }
            }
            
            this.setStatus('synced');
          } catch (error: any) {
            console.error('Failed to flush sync queue', error);
            // Keep remaining unprocessed tasks in queue to try again later
            this.setStatus('error');
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
          this.subscribers = this.subscribers.filter(cb => cb !== callback);
        };
    }

    private setStatus(status: SyncStatus) {
        this.syncStatus = status;
        this.subscribers.forEach(cb => cb(status));
    }

    async init(): Promise<void> {
        const idbAdapter = new IndexedDBStorageAdapter();
        try {
          await idbAdapter.init();
          this.localAdapter = idbAdapter;
          console.log('Successfully active local-first story world memory: IndexedDB');
          
          // MIGRATION: Migrate from LocalStorage to IndexedDB if IndexedDB is empty
          try {
            const existingStories = await idbAdapter.getStories();
            if (existingStories.length === 0) {
              const lsAdapter = new LocalStorageFallbackAdapter();
              await lsAdapter.init();
              const lsStories = await lsAdapter.getStories();
              if (lsStories.length > 0) {
                console.log(`Migrating ${lsStories.length} stories from LocalStorage to IndexedDB...`);
                for (const story of lsStories) {
                  await idbAdapter.saveStory(story);
                }
                try {
                  const chaptersStr = localStorage.getItem('@seihouse/fiction-generator-chapters-v2');
                  if (chaptersStr) {
                    const chapters = JSON.parse(chaptersStr);
                    for (const chap of chapters) {
                      await idbAdapter.saveChapterContent(chap);
                    }
                  }
                } catch (e) {
                  console.warn("Failed to migrate chapters from LocalStorage", e);
                }
                console.log('Migration complete.');
              }
            }
          } catch (migErr) {
            console.error("Migration from LocalStorage failed:", migErr);
          }
        } catch (err) {
          console.warn('IndexedDB failed (sandboxed frame or private window). Falling back to LocalStorage:', err);
          const lsAdapter = new LocalStorageFallbackAdapter();
          try {
            await lsAdapter.init();
            this.localAdapter = lsAdapter;
            console.log('Successfully active local-first story world memory: LocalStorage');
          } catch (err2) {
            console.warn('LocalStorage failed. Falling back to InMemory storage (data will not persist):', err2);
            const memAdapter = new InMemoryFallbackAdapter();
            await memAdapter.init();
            this.localAdapter = memAdapter;
          }
        }

        try {
          if (LOCAL_ONLY_MODE || !supabase) {
            this.isCloudAvailable = false;
            this.setStatus('offline');
            return;
          }
          await this.cloudAdapter.init();
          
          supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
              this.isCloudAvailable = true;
              await this.performSync();
            } else {
              this.isCloudAvailable = false;
              this.setStatus('offline');
            }
          });
          
          const { data: { session } } = await supabase.auth.getSession();
          this.setStatus(session?.user ? 'idle' : 'offline');
        } catch (err) {
          console.warn('Supabase init failed, running local only.', err);
          this.setStatus('offline');
        }
    }

    private checkSignificantDifference(local: StoryWorld, cloud: StoryWorld): boolean {
        const localTime = new Date(local.updatedAt).getTime();
        const cloudTime = new Date(cloud.updatedAt).getTime();
        if (local.conflictResolvedAt) {
          const resolvedTime = new Date(local.conflictResolvedAt).getTime();
          if (resolvedTime >= cloudTime) {
            return false; // Local has already resolved this conflict
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

    public async performSync() {
        if (!this.isCloudAvailable) return;
        await this.flushSyncQueue();
        this.setStatus('syncing');
        try {
          // Get all local and cloud stories
          const localStories = await this.localAdapter.getStories();
          const cloudStories = await this.cloudAdapter.getStories();

          const cloudMap = new Map(cloudStories.map(s => [s.id, s]));
          const localMap = new Map(localStories.map(s => [s.id, s]));

          // Merge logic: newest updatedAt wins, but handle conflicts by copying
          for (const localStory of localStories) {
            const cloudStory = cloudMap.get(localStory.id);
            if (!cloudStory) {
              // Exists locally but not in cloud. Push to cloud.
              const cloudPayload = JSON.parse(JSON.stringify(localStory));
              await this.compressDataUrls(cloudPayload);
              await this.cloudAdapter.saveStory(cloudPayload);
            } else {
              // Exists in both. Check if they differ significantly.
              if (this.checkSignificantDifference(localStory, cloudStory)) {
                try {
                  if (this.conflictHandler) {
                    this.conflictHandler({
                      storyId: localStory.id,
                      localStory: JSON.parse(JSON.stringify(localStory)),
                      cloudStory: JSON.parse(JSON.stringify(cloudStory))
                    });
                  }
                } catch (err) {
                  console.warn('Failed to dispatch active conflict to handler:', err);
                }
                // Skip syncing this story until the user resolves the conflict
                continue;
              }

              // Otherwise, proceed with minor automatic timestamp syncing
              const localTime = new Date(localStory.updatedAt).getTime();
              const cloudTime = new Date(cloudStory.updatedAt).getTime();
              
              if (localTime > cloudTime) {
                 const cloudPayload = JSON.parse(JSON.stringify(localStory));
                 await this.compressDataUrls(cloudPayload);
                 await this.cloudAdapter.saveStory(cloudPayload);
              } else if (cloudTime > localTime) {
                 await this.localAdapter.saveStory(cloudStory);
              }
            }
          }

          // Download stories in cloud but not local
          for (const cloudStory of cloudStories) {
            if (!localMap.has(cloudStory.id)) {
              await this.localAdapter.saveStory(cloudStory);
            }
          }

          this.setStatus('synced');
        } catch (error) {
          console.error("Cloud sync failed:", error);
          this.setStatus('error');
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
                         const c = await this.localAdapter.getChapterContent(story.id, chapter.number);
                         if (!c) {
                             missingChapters.push(`Story: ${story.title}, Chapter: ${chapter.number}`);
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
         pendingWrites: this.syncQueue.length
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
               const localContent = await this.localAdapter.getChapterContent(storyId, chapter.number);
               if (!localContent && this.isCloudAvailable) {
                   // Try to recover from cloud
                   try {
                     const cloudContent = await this.cloudAdapter.getChapterContent(storyId, chapter.number);
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
          return local.filter(s => !s.deleted);
        }

        const tx = this.activeTransaction;
        const storiesMap = new Map(local.map(s => [s.id, s]));
        for (const id of tx.deletedStoryIds) {
          storiesMap.delete(id);
        }

        for (const [id, story] of tx.stories) {
          storiesMap.set(id, JSON.parse(JSON.stringify(story)));
        }

        const result = Array.from(storiesMap.values()).filter(s => !s.deleted);
        result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
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
          deletedStoryIds: new Set()
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
            return JSON.parse(JSON.stringify(this.activeTransaction.stories.get(id)));
          }
        }

        return this.localAdapter.getStory(id);
    }

    private async compressDataUrls(story: StoryWorld) {
        const isDataUrl = (url?: string) => url && url.startsWith('data:image/');
        const compress = async (dataUrl: string): Promise<string> => {
                  if (dataUrl.length < 60000) return dataUrl; // Skip if already small
                  return new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                      const canvas = document.createElement('canvas');
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
                      const ctx = canvas.getContext('2d');
                      if (ctx) ctx.drawImage(img, 0, 0, width, height);
                      resolve(canvas.toDataURL('image/jpeg', 0.6));
                    };
                    img.onerror = () => resolve(dataUrl);
                    img.src = dataUrl;
                  });
                };
        if (story.imageUrl && isDataUrl(story.imageUrl)) {
          story.imageUrl = await compress(story.imageUrl);
        }

        if (story.imageHistory) {
          for (let i = 0; i < story.imageHistory.length; i++) {
            if (isDataUrl(story.imageHistory[i].imageUrl)) {
              story.imageHistory[i].imageUrl = await compress(story.imageHistory[i].imageUrl);
            }
          }
        }

        if (story.memory) {
          if (story.memory.characters) {
            for (const c of story.memory.characters) {
              if (c.imageUrl && isDataUrl(c.imageUrl)) c.imageUrl = await compress(c.imageUrl);
              if (c.imageHistory) {
                for (let i = 0; i < c.imageHistory.length; i++) {
                  if (isDataUrl(c.imageHistory[i].imageUrl)) {
                    c.imageHistory[i].imageUrl = await compress(c.imageHistory[i].imageUrl);
                  }
                }
              }
            }
          }
          if (story.memory.locations) {
            for (const c of story.memory.locations) {
              if (c.imageUrl && isDataUrl(c.imageUrl)) c.imageUrl = await compress(c.imageUrl);
              if (c.imageHistory) {
                for (let i = 0; i < c.imageHistory.length; i++) {
                  if (isDataUrl(c.imageHistory[i].imageUrl)) {
                    c.imageHistory[i].imageUrl = await compress(c.imageHistory[i].imageUrl);
                  }
                }
              }
            }
          }
          if (story.memory.artifacts) {
            for (const c of story.memory.artifacts) {
              if (c.imageUrl && isDataUrl(c.imageUrl)) c.imageUrl = await compress(c.imageUrl);
              if (c.imageHistory) {
                for (let i = 0; i < c.imageHistory.length; i++) {
                  if (isDataUrl(c.imageHistory[i].imageUrl)) {
                    c.imageHistory[i].imageUrl = await compress(c.imageHistory[i].imageUrl);
                  }
                }
              }
            }
          }
        }

        if (story.arcs) {
           story.arcs.forEach(arc => {
              arc.chapters.forEach(ch => {
                 if (ch.assetManifest && isDataUrl(ch.assetManifest.heroImage)) {
                     delete ch.assetManifest.heroImage;
                 }
              });
           });
        }
    }

    async saveStory(story: StoryWorld): Promise<void> {
        if (this.activeTransaction) {
          this.activeTransaction.stories.set(story.id, JSON.parse(JSON.stringify(story)));
          this.activeTransaction.deletedStoryIds.delete(story.id);
          return;
        }

        const strippedStory: StoryWorld = JSON.parse(JSON.stringify(story));
        if (strippedStory.arcs) {
          for (const arc of strippedStory.arcs) {
            for (const chapter of arc.chapters) {
              if (chapter.generatedContent || (chapter.blocks && chapter.blocks.length > 0)) {
                 if (chapter._isNewContent) {
                   const content: ChapterContent = {
                      storyId: story.id,
                      chapterNumber: chapter.number,
                      generatedContent: chapter.generatedContent || "",
                      blocks: chapter.blocks,
                      summary: chapter.summary,
                      statsChangeMessage: chapter.statsChangeMessage,
                      cuePayload: chapter.cuePayload
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
          console.error('Failed to save story locally (quota exceeded?). Attempting to continue with cloud sync:', e);
        }

        this.enqueueTask({ type: 'story', storyId: strippedStory.id, timestamp: Date.now() });
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
          console.error('Failed to hard delete story locally:', e);
        }

        if (this.isCloudAvailable && this.syncStatus !== 'syncing') {
          (async () => {
            try {
              await this.cloudAdapter.deleteStory(id);
            } catch (err) {
              console.error('Failed to hard delete from cloud', err);
              this.enqueueTask({ type: 'delete_story', storyId: id, timestamp: Date.now() });
            }
          })();
        } else {
          this.enqueueTask({ type: 'delete_story', storyId: id, timestamp: Date.now() });
        }
    }

    async getChapterContent(storyId: string, chapterNumber: number): Promise<ChapterContent | null> {
        if (this.activeTransaction) {
          const key = `${storyId}-${chapterNumber}`;
          if (this.activeTransaction.chapters.has(key)) {
            return JSON.parse(JSON.stringify(this.activeTransaction.chapters.get(key)));
          }
        }

        const localItem = await this.localAdapter.getChapterContent(storyId, chapterNumber);
        if (localItem) return localItem;
        if (this.isCloudAvailable) {
          try {
            const cloudItem = await this.cloudAdapter.getChapterContent(storyId, chapterNumber);
            if (cloudItem) {
              // Cache locally
              try {
                await this.localAdapter.saveChapterContent(cloudItem);
              } catch (e) {
                console.warn('Failed to cache cloud chapter locally', e);
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
          this.activeTransaction.chapters.set(key, JSON.parse(JSON.stringify(content)));
          return;
        }

        try {
          await this.localAdapter.saveChapterContent(content);
        } catch (e) {
          console.error('Failed to save chapter locally (quota exceeded?). Attempting to continue with cloud sync:', e);
        }

        this.enqueueTask({ type: 'chapter', storyId: content.storyId, chapterNumber: content.chapterNumber, timestamp: Date.now() });
    }

    async clearAll(): Promise<void> {
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
            console.warn('Failed to save audio blob locally (quota exceeded?)', e);
          }
        }
    }

    getActiveAdapterName(): string {
        return this.localAdapter.name + (this.isCloudAvailable ? ' + Cloud Sync' : '');
    }
}
