import { StorageAdapter } from "./types";
import { StoryWorld, ChapterContent } from "../../types";

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
          const transaction = db.transaction([this.storeName, this.chaptersStoreName], 'readwrite');
          
          const store = transaction.objectStore(this.storeName);
          store.delete(id);

          const chaptersStore = transaction.objectStore(this.chaptersStoreName);
          const cursorReq = chaptersStore.openCursor();
          cursorReq.onsuccess = (e: any) => {
            const cursor = e.target.result;
            if (cursor) {
              if (cursor.value.storyId === id) {
                cursor.delete();
              }
              cursor.continue();
            }
          };

          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
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
