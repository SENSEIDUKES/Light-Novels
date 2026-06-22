import { StoryWorld, ChapterContent } from '../types';
import { FirebaseStorageAdapter } from './firebaseStorage';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * StorageAdapter defines the contract for persistent story memory.
 * This separates the storage logic from UI/logic components,
 * enabling easy drop-in cloud synchronization in the future.
 */
export interface StorageAdapter {
  name: string;
  init(): Promise<void>;
  getStories(): Promise<StoryWorld[]>;
  getStory(id: string): Promise<StoryWorld | null>;
  saveStory(story: StoryWorld): Promise<void>;
  deleteStory(id: string): Promise<void>;
  clearAll(): Promise<void>;
  
  getChapterContent(storyId: string, chapterNumber: number): Promise<ChapterContent | null>;
  saveChapterContent(content: ChapterContent): Promise<void>;
}

/**
 * Robust, client-side IndexedDB Storage Adapter.
 * Ideal for storing structured story objects offline.
 */
export class IndexedDBStorageAdapter implements StorageAdapter {
  name = 'IndexedDB';
  private dbName = 'seihouse_story_world_db';
  private storeName = 'stories';
  private chaptersStoreName = 'chapter_contents';
  private version = 2;
  private db: IDBDatabase | null = null;

  init(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this environment.'));
        return;
      }

      const request = window.indexedDB.open(this.dbName, this.version);

      request.onerror = (event) => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = (event) => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(this.chaptersStoreName)) {
          // Complex key path for identifying unique chapter contents
          db.createObjectStore(this.chaptersStoreName, { keyPath: ['storyId', 'chapterNumber'] });
        }
      };
    });
  }

  private getDB(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db);
    return this.init().then(() => this.db!);
  }

  async getStories(): Promise<StoryWorld[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        // Sort descending by updatedAt
        const stories = request.result as StoryWorld[];
        stories.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        resolve(stories);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getStory(id: string): Promise<StoryWorld | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async saveStory(story: StoryWorld): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(story);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async deleteStory(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async clearAll(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName, this.chaptersStoreName], 'readwrite');
      transaction.objectStore(this.storeName).clear();
      transaction.objectStore(this.chaptersStoreName).clear();

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  }

  async getChapterContent(storyId: string, chapterNumber: number): Promise<ChapterContent | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.chaptersStoreName, 'readonly');
      const store = transaction.objectStore(this.chaptersStoreName);
      const request = store.get([storyId, chapterNumber]);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async saveChapterContent(content: ChapterContent): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.chaptersStoreName, 'readwrite');
      const store = transaction.objectStore(this.chaptersStoreName);
      const request = store.put(content);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

/**
 * Resilient LocalStorage fallback adapter used when IndexedDB is restricted inside frames
 * or private browsing.
 */
export class LocalStorageFallbackAdapter implements StorageAdapter {
  name = 'LocalStorage';
  private storageKey = '@seihouse/fiction-generator-stories-v2';
  private chaptersStorageKey = '@seihouse/fiction-generator-chapters-v2';

  async init(): Promise<void> {
    // LocalStorage doesn't require asynchronous initialization.
    return Promise.resolve();
  }

  async getStories(): Promise<StoryWorld[]> {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const stories = JSON.parse(saved) as StoryWorld[];
        stories.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        return stories;
      }
    } catch (e) {
      console.error('LocalStorage fallback read error:', e);
    }
    return [];
  }

  async getStory(id: string): Promise<StoryWorld | null> {
    const stories = await this.getStories();
    return stories.find((s) => s.id === id) || null;
  }

  async saveStory(story: StoryWorld): Promise<void> {
    const stories = await this.getStories();
    const existingIndex = stories.findIndex((s) => s.id === story.id);
    if (existingIndex > -1) {
      stories[existingIndex] = story;
    } else {
      stories.push(story);
    }
    localStorage.setItem(this.storageKey, JSON.stringify(stories));
  }

  async deleteStory(id: string): Promise<void> {
    const stories = await this.getStories();
    const updated = stories.filter((s) => s.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(updated));
  }

  async clearAll(): Promise<void> {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.chaptersStorageKey);
  }

  async getChapterContent(storyId: string, chapterNumber: number): Promise<ChapterContent | null> {
    try {
      const saved = localStorage.getItem(this.chaptersStorageKey);
      if (saved) {
        const chapters = JSON.parse(saved) as ChapterContent[];
        return chapters.find((c: ChapterContent) => c.storyId === storyId && c.chapterNumber === chapterNumber) || null;
      }
    } catch (e) {
      console.error('LocalStorage fallback read error:', e);
    }
    return null;
  }

  async saveChapterContent(content: ChapterContent): Promise<void> {
    try {
      const saved = localStorage.getItem(this.chaptersStorageKey);
      let chapters: ChapterContent[] = [];
      if (saved) {
        chapters = JSON.parse(saved) as ChapterContent[];
      }
      const existingIndex = chapters.findIndex((c: ChapterContent) => c.storyId === content.storyId && c.chapterNumber === content.chapterNumber);
      if (existingIndex > -1) {
        chapters[existingIndex] = content;
      } else {
        chapters.push(content);
      }
      localStorage.setItem(this.chaptersStorageKey, JSON.stringify(chapters));
    } catch (e) {
      console.error('LocalStorage save error:', e);
    }
  }
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export interface SyncTask {
  type: 'story' | 'chapter';
  storyId: string;
  chapterNumber?: number;
  timestamp: number;
}

export interface SyncAuditResult {
  localStories: number;
  cloudStories: number;
  mismatches: string[];
  missingChapters: string[];
  pendingWrites: number;
}

/**
 * Universal Storage Manager utilizing IndexedDB for high storage capacity
 * with dynamic and silent fallback to local storage under secure sandboxed contexts.
 * Also handles seamless Firebase Cloud Syncing and merging when authenticated.
 */
export class PersistentStorageManager implements StorageAdapter {
  name = 'PersistentStorageManager';
  private localAdapter: StorageAdapter;
  private cloudAdapter: FirebaseStorageAdapter;
  private isCloudAvailable = false;
  private syncStatus: SyncStatus = 'idle';
  private subscribers: ((status: SyncStatus) => void)[] = [];
  private syncQueue: SyncTask[] = [];
  private queueKey = '@seihouse/sync-queue';

  constructor() {
    this.localAdapter = new LocalStorageFallbackAdapter();
    this.cloudAdapter = new FirebaseStorageAdapter();
    this.loadQueue();
  }

  private loadQueue() {
    try {
      const q = localStorage.getItem(this.queueKey);
      if (q) this.syncQueue = JSON.parse(q);
    } catch (e) {
      console.warn('Failed to load sync queue');
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(this.queueKey, JSON.stringify(this.syncQueue));
    } catch (e) {
      console.warn('Failed to save sync queue');
    }
  }

  private enqueueTask(task: SyncTask) {
    this.syncQueue.push(task);
    this.saveQueue();
    if (this.isCloudAvailable && this.syncStatus !== 'syncing') {
      this.flushSyncQueue();
    }
  }

  private async flushSyncQueue() {
    if (!this.isCloudAvailable || this.syncQueue.length === 0) return;
    this.setStatus('syncing');

    let tasksProcessed = 0;
    const currentQueue = [...this.syncQueue];
    
    try {
      for (const task of currentQueue) {
        if (task.type === 'story') {
          const localStory = await this.localAdapter.getStory(task.storyId);
          if (localStory) {
            await this.cloudAdapter.saveStory(localStory);
          }
        } else if (task.type === 'chapter' && task.chapterNumber !== undefined) {
          const localChapter = await this.localAdapter.getChapterContent(task.storyId, task.chapterNumber);
          if (localChapter) {
            await this.cloudAdapter.saveChapterContent(localChapter);
          }
        }
        tasksProcessed++;
      }
      
      // Remove processed operations
      this.syncQueue = this.syncQueue.slice(tasksProcessed);
      this.saveQueue();
      this.setStatus('synced');
    } catch (error) {
      console.error('Failed to flush sync queue', error);
      // Keep unprocessed tasks in queue
      this.syncQueue = this.syncQueue.slice(tasksProcessed);
      this.saveQueue();
      this.setStatus('error');
    }
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
    } catch (err) {
      console.warn('Sandboxed frame or private window detected. Falling back to LocalStorage:', err);
      const lsAdapter = new LocalStorageFallbackAdapter();
      await lsAdapter.init();
      this.localAdapter = lsAdapter;
    }

    try {
      await this.cloudAdapter.init();
      
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          this.isCloudAvailable = true;
          await this.performSync();
        } else {
          this.isCloudAvailable = false;
          this.setStatus('offline');
        }
      });
      this.setStatus(auth.currentUser ? 'idle' : 'offline');
    } catch (err) {
      console.warn('Firebase init failed, running local only.', err);
      this.setStatus('offline');
    }
  }

  public async performSync() {
    if (!this.isCloudAvailable) return;
    
    // First flush any offline writes
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
          await this.cloudAdapter.saveStory(localStory);
        } else {
          // Exists in both. Check timestamps and revisions
          const localTime = new Date(localStory.updatedAt).getTime();
          const cloudTime = new Date(cloudStory.updatedAt).getTime();
          
          if (localTime > cloudTime) {
             const timeDiff = localTime - cloudTime;
             if (timeDiff > 5000) { // Large gap means potential conflict if cloud also changed independently
                // We overwrite cloud if we are newer, but if the cloud version has a significantly different version/content, we could branch it.
                // For simplicity, local wins but we ensure we pushed it cleanly.
                await this.cloudAdapter.saveStory(localStory);
             } else {
                await this.cloudAdapter.saveStory(localStory);
             }
          } else if (cloudTime > localTime) {
             const timeDiff = cloudTime - localTime;
             
             // Conflict: Local changed but Cloud changed MORE recently. 
             // We don't want to blindly overwrite local and lose local edits.
             // If they diverged, we create a conflict copy.
             // Here, let's just make a safe backup of the local story if it's considered 'dirty'
             // Since we lack deep dirty checking, we duplicate if diff is substantial
             if (timeDiff > 1000 * 60 * 5) { // 5 minutes diff
                 const localCopy = JSON.parse(JSON.stringify(localStory)) as StoryWorld;
                 localCopy.id = `${localStory.id}-conflict-${Date.now()}`;
                 localCopy.title = `${localCopy.title} (Local Conflict Copied)`;
                 await this.localAdapter.saveStory(localCopy);
                 await this.cloudAdapter.saveStory(localCopy); // Save the conflict copy to cloud too
             }
             
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
     let mismatches = [];
     let missingChapters = [];
     
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
               let localContent = await this.localAdapter.getChapterContent(storyId, chapter.number);
               if (!localContent && this.isCloudAvailable) {
                   // Try to recover from cloud
                   const cloudContent = await this.cloudAdapter.getChapterContent(storyId, chapter.number);
                   if (cloudContent) {
                       await this.localAdapter.saveChapterContent(cloudContent);
                       recovered++;
                       continue;
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
    return this.localAdapter.getStories();
  }

  async getStory(id: string): Promise<StoryWorld | null> {
    return this.localAdapter.getStory(id);
  }

  async saveStory(story: StoryWorld): Promise<void> {
    const strippedStory: StoryWorld = JSON.parse(JSON.stringify(story)); // deep copy

    // Extract chapter contents and save them separately
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

    // Save stripped story to local immediately to maintain snappy UI
    await this.localAdapter.saveStory(strippedStory);

    if (this.isCloudAvailable && this.syncStatus !== 'syncing') {
      this.setStatus('syncing');
      try {
        await this.cloudAdapter.saveStory(strippedStory);
        this.setStatus('synced');
      } catch (err) {
        console.error('Failed to save to cloud', err);
        this.enqueueTask({ type: 'story', storyId: strippedStory.id, timestamp: Date.now() });
        this.setStatus('error');
      }
    } else {
      this.enqueueTask({ type: 'story', storyId: strippedStory.id, timestamp: Date.now() });
    }
  }

  async deleteStory(id: string): Promise<void> {
    await this.localAdapter.deleteStory(id);
    if (this.isCloudAvailable) {
      try {
        await this.cloudAdapter.deleteStory(id);
      } catch (err) {
        console.error('Failed to delete from cloud', err);
      }
    }
  }

  async getChapterContent(storyId: string, chapterNumber: number): Promise<ChapterContent | null> {
    // Try local
    let localItem = await this.localAdapter.getChapterContent(storyId, chapterNumber);
    if (localItem) return localItem;
    
    // Try cloud if missing locally
    if (this.isCloudAvailable) {
      try {
        const cloudItem = await this.cloudAdapter.getChapterContent(storyId, chapterNumber);
        if (cloudItem) {
          // Cache locally
          await this.localAdapter.saveChapterContent(cloudItem);
          return cloudItem;
        }
      } catch (e) {
        console.error("Cloud fetch failed", e);
      }
    }
    return null;
  }

  async saveChapterContent(content: ChapterContent): Promise<void> {
    content.updatedAt = new Date().toISOString();
    await this.localAdapter.saveChapterContent(content);
    if (this.isCloudAvailable && this.syncStatus !== 'syncing') {
      try {
        await this.cloudAdapter.saveChapterContent(content);
      } catch (err) {
         console.error('Failed to save chapter content to cloud', err);
         this.enqueueTask({ type: 'chapter', storyId: content.storyId, chapterNumber: content.chapterNumber, timestamp: Date.now() });
      }
    } else {
       this.enqueueTask({ type: 'chapter', storyId: content.storyId, chapterNumber: content.chapterNumber, timestamp: Date.now() });
    }
  }

  async clearAll(): Promise<void> {
    await this.localAdapter.clearAll();
  }

  getActiveAdapterName(): string {
    return this.localAdapter.name + (this.isCloudAvailable ? ' + Cloud Sync' : '');
  }
}

// Global single instance for easy imports
export const storyStorage = new PersistentStorageManager();

