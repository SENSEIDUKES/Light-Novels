import { StoryWorld } from '../types';

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
}

/**
 * Robust, client-side IndexedDB Storage Adapter.
 * Ideal for storing structured story objects offline.
 */
export class IndexedDBStorageAdapter implements StorageAdapter {
  name = 'IndexedDB';
  private dbName = 'seihouse_story_world_db';
  private storeName = 'stories';
  private version = 1;
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
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
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
  }
}

/**
 * Universal Storage Manager utilizing IndexedDB for high storage capacity
 * with dynamic and silent fallback to local storage under secure sandboxed contexts.
 */
export class PersistentStorageManager implements StorageAdapter {
  name = 'PersistentStorageManager';
  private activeAdapter: StorageAdapter;

  constructor() {
    this.activeAdapter = new LocalStorageFallbackAdapter();
  }

  async init(): Promise<void> {
    const idbAdapter = new IndexedDBStorageAdapter();
    try {
      await idbAdapter.init();
      this.activeAdapter = idbAdapter;
      console.log('Successfully active local-first story world memory: IndexedDB');
    } catch (err) {
      console.warn('Sandboxed frame or private window detected. Falling back to LocalStorage:', err);
      const lsAdapter = new LocalStorageFallbackAdapter();
      await lsAdapter.init();
      this.activeAdapter = lsAdapter;
    }
  }

  async getStories(): Promise<StoryWorld[]> {
    return this.activeAdapter.getStories();
  }

  async getStory(id: string): Promise<StoryWorld | null> {
    return this.activeAdapter.getStory(id);
  }

  async saveStory(story: StoryWorld): Promise<void> {
    return this.activeAdapter.saveStory(story);
  }

  async deleteStory(id: string): Promise<void> {
    return this.activeAdapter.deleteStory(id);
  }

  async clearAll(): Promise<void> {
    return this.activeAdapter.clearAll();
  }

  getActiveAdapterName(): string {
    return this.activeAdapter.name;
  }
}

// Global single instance for easy imports
export const storyStorage = new PersistentStorageManager();
