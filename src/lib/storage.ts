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
  
  getAudioBlob?(url: string): Promise<Blob | null>;
  saveAudioBlob?(url: string, blob: Blob): Promise<void>;
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
  private audioStoreName = 'audio_cache';
  private version = 3;
  private db: IDBDatabase | null = null;

  init(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this environment.'));
        return;
      }

      try {
        const request = window.indexedDB.open(this.dbName, this.version);

        request.onerror = () => {
          console.error('Failed to open IndexedDB:', request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          this.db = request.result;
          resolve();
        };

        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(this.chaptersStoreName)) {
            // Complex key path for identifying unique chapter contents
            db.createObjectStore(this.chaptersStoreName, { keyPath: ['storyId', 'chapterNumber'] });
          }
          if (!db.objectStoreNames.contains(this.audioStoreName)) {
            db.createObjectStore(this.audioStoreName, { keyPath: 'url' });
          }
        };
      } catch (err) {
        console.warn('Synchronous error during IndexedDB open (possibly sandboxed):', err);
        reject(err);
      }
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

  async getAudioBlob(url: string): Promise<Blob | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.audioStoreName, 'readonly');
      const store = transaction.objectStore(this.audioStoreName);
      const request = store.get(url);

      request.onsuccess = () => {
        resolve(request.result ? request.result.blob : null);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async saveAudioBlob(url: string, blob: Blob): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.audioStoreName, 'readwrite');
      const store = transaction.objectStore(this.audioStoreName);
      const request = store.put({ url, blob });

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
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(stories));
    } catch (e: any) {
      console.warn('LocalStorage Quota exceeded, stripping large fields...', e);
      // Fallback: strip images to save space
      const stripped = stories.map(s => {
         const copy = JSON.parse(JSON.stringify(s));
         delete copy.imageUrl;
         delete copy.imageHistory;
         if (copy.memory) {
            if (copy.memory.characters) copy.memory.characters.forEach((c: any) => { delete c.imageUrl; delete c.imageHistory; });
            if (copy.memory.locations) copy.memory.locations.forEach((l: any) => { delete l.imageUrl; delete l.imageHistory; });
            if (copy.memory.artifacts) copy.memory.artifacts.forEach((a: any) => { delete a.imageUrl; delete a.imageHistory; });
         }
         if (copy.arcs) {
           copy.arcs.forEach((arc: any) => {
             if (arc.chapters) {
               arc.chapters.forEach((ch: any) => {
                 if (ch.assetManifest) delete ch.assetManifest.heroImage;
               });
             }
           });
         }
         return copy;
      });
      
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(stripped));
      } catch (err2) {
        console.error('Even stripped stories exceeded quota. Removing older stories...');
        // If still exceeding, keep only the most recent 2 stories
        stripped.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        const reduced = stripped.slice(0, 2);
        try {
          localStorage.setItem(this.storageKey, JSON.stringify(reduced));
        } catch (err3) {
          console.error('Completely out of local storage space!', err3);
        }
      }
    }
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

  async getAudioBlob(_url: string): Promise<Blob | null> {
    return null;
  }

  async saveAudioBlob(_url: string, _blob: Blob): Promise<void> {
    // No-op for localstorage to prevent blowing up quota
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
      
      try {
          localStorage.setItem(this.chaptersStorageKey, JSON.stringify(chapters));
      } catch (e: any) {
          console.warn('LocalStorage chapters quota exceeded, removing older chapters...', e);
          // Keep only the most recent 5 chapters for this fallback
          chapters.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
          const reduced = chapters.slice(0, 5);
          try {
              localStorage.setItem(this.chaptersStorageKey, JSON.stringify(reduced));
          } catch (err2) {
              console.error('Reduced chapters still exceed quota!', err2);
          }
      }
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

  // Transaction state
  private activeTransaction: {
    stories: Map<string, StoryWorld>;
    chapters: Map<string, ChapterContent>;
    deletedStoryIds: Set<string>;
  } | null = null;

  constructor() {
    this.localAdapter = new LocalStorageFallbackAdapter();
    this.cloudAdapter = new FirebaseStorageAdapter();
    this.loadQueue();
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
            const cloudPayload = JSON.parse(JSON.stringify(localStory));
            await this.compressDataUrls(cloudPayload);
            await this.cloudAdapter.saveStory(cloudPayload);
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
          const cloudPayload = JSON.parse(JSON.stringify(localStory));
          await this.compressDataUrls(cloudPayload);
          await this.cloudAdapter.saveStory(cloudPayload);
        } else {
          // Exists in both. Check timestamps and revisions
          const localTime = new Date(localStory.updatedAt).getTime();
          const cloudTime = new Date(cloudStory.updatedAt).getTime();
          
          if (localTime > cloudTime) {
             const timeDiff = localTime - cloudTime;
             const cloudPayload = JSON.parse(JSON.stringify(localStory));
             await this.compressDataUrls(cloudPayload);
             if (timeDiff > 5000) { // Large gap means potential conflict if cloud also changed independently
                // We overwrite cloud if we are newer, but if the cloud version has a significantly different version/content, we could branch it.
                // For simplicity, local wins but we ensure we pushed it cleanly.
                await this.cloudAdapter.saveStory(cloudPayload);
             } else {
                await this.cloudAdapter.saveStory(cloudPayload);
             }
          } else if (cloudTime > localTime) {
             const timeDiff = cloudTime - localTime;
             
             // Conflict: Local changed but Cloud changed MORE recently. 
             // We don't want to blindly overwrite local and lose local edits.
             // If they diverged, we create a conflict copy.
             // Here, let's just make a safe backup of the local story if it's considered 'dirty'
             // Since we lack deep dirty checking, we duplicate if diff is substantial
             if (timeDiff > 1000 * 60 * 5 && !cloudStory.deleted) { // 5 minutes diff, skip if it's a deletion
                 const localCopy = JSON.parse(JSON.stringify(localStory)) as StoryWorld;
                 localCopy.id = `${localStory.id}-conflict-${Date.now()}`;
                 localCopy.title = `${localCopy.title} (Local Conflict Copied)`;
                 await this.localAdapter.saveStory(localCopy);
                 
                 const localCopyCloudPayload = JSON.parse(JSON.stringify(localCopy));
                 await this.compressDataUrls(localCopyCloudPayload);
                 await this.cloudAdapter.saveStory(localCopyCloudPayload); // Save the conflict copy to cloud too
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
    const local = await this.localAdapter.getStories();
    if (!this.activeTransaction) {
      return local.filter(s => !s.deleted);
    }

    const tx = this.activeTransaction;
    // merge local with transaction
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
      (async () => {
        try {
          const cloudStory = JSON.parse(JSON.stringify(strippedStory));
          await this.compressDataUrls(cloudStory);
          await this.cloudAdapter.saveStory(cloudStory);
          this.setStatus('synced');
        } catch (err) {
          console.error('Failed to save to cloud', err);
          this.enqueueTask({ type: 'story', storyId: strippedStory.id, timestamp: Date.now() });
          this.setStatus('error');
        }
      })();
    } else {
      this.enqueueTask({ type: 'story', storyId: strippedStory.id, timestamp: Date.now() });
    }
  }

  async deleteStory(id: string): Promise<void> {
    if (this.activeTransaction) {
      this.activeTransaction.deletedStoryIds.add(id);
      this.activeTransaction.stories.delete(id);
      return;
    }

    const story = await this.localAdapter.getStory(id);
    if (!story) return;

    story.deleted = true;
    story.updatedAt = new Date().toISOString();

    await this.localAdapter.saveStory(story);

    if (this.isCloudAvailable && this.syncStatus !== 'syncing') {
      (async () => {
        try {
          await this.cloudAdapter.saveStory(story);
        } catch (err) {
          console.error('Failed to soft delete from cloud', err);
          this.enqueueTask({ type: 'story', storyId: id, timestamp: Date.now() });
        }
      })();
    } else {
      this.enqueueTask({ type: 'story', storyId: id, timestamp: Date.now() });
    }
  }

  async getChapterContent(storyId: string, chapterNumber: number): Promise<ChapterContent | null> {
    if (this.activeTransaction) {
      const key = `${storyId}-${chapterNumber}`;
      if (this.activeTransaction.chapters.has(key)) {
        return JSON.parse(JSON.stringify(this.activeTransaction.chapters.get(key)));
      }
    }

    // Try local
    const localItem = await this.localAdapter.getChapterContent(storyId, chapterNumber);
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
    
    if (this.activeTransaction) {
      const key = `${content.storyId}-${content.chapterNumber}`;
      this.activeTransaction.chapters.set(key, JSON.parse(JSON.stringify(content)));
      return;
    }

    await this.localAdapter.saveChapterContent(content);
    if (this.isCloudAvailable && this.syncStatus !== 'syncing') {
      (async () => {
        try {
          await this.cloudAdapter.saveChapterContent(content);
        } catch (err) {
           console.error('Failed to save chapter content to cloud', err);
           this.enqueueTask({ type: 'chapter', storyId: content.storyId, chapterNumber: content.chapterNumber, timestamp: Date.now() });
        }
      })();
    } else {
       this.enqueueTask({ type: 'chapter', storyId: content.storyId, chapterNumber: content.chapterNumber, timestamp: Date.now() });
    }
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
      return this.localAdapter.saveAudioBlob(url, blob);
    }
  }

  getActiveAdapterName(): string {
    return this.localAdapter.name + (this.isCloudAvailable ? ' + Cloud Sync' : '');
  }
}

// Global single instance for easy imports
export const storyStorage = new PersistentStorageManager();

