import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IndexedDBStorageAdapter } from '../indexedDBAdapter';
import { StoryWorld, ChapterContent } from '../../../types';

class MockIDBRequest {
  onsuccess: any = null;
  onerror: any = null;
  onupgradeneeded: any = null;
  result: any = null;
  error: any = null;

  fireSuccess(result: any) {
    this.result = result;
    if (this.onsuccess) this.onsuccess({ target: this });
  }

  fireError(error: any) {
    this.error = error;
    if (this.onerror) this.onerror({ target: this });
  }

  fireUpgradeNeeded(db: any) {
    this.result = db;
    if (this.onupgradeneeded) this.onupgradeneeded({ target: this });
  }
}

class MockIDBObjectStore {
  name: string;
  data: Map<any, any> = new Map();
  keyPath: any;

  constructor(name: string, options: any) {
    this.name = name;
    this.keyPath = options?.keyPath;
  }

  getAll() {
    const req = new MockIDBRequest();
    setTimeout(() => req.fireSuccess(Array.from(this.data.values())), 0);
    return req;
  }

  get(key: any) {
    const req = new MockIDBRequest();
    const stringKey = Array.isArray(key) ? JSON.stringify(key) : key;
    setTimeout(() => req.fireSuccess(this.data.get(stringKey)), 0);
    return req;
  }

  put(item: any) {
    const req = new MockIDBRequest();
    let key;
    if (Array.isArray(this.keyPath)) {
       const keyArray = this.keyPath.map((k: string) => item[k]);
       key = JSON.stringify(keyArray);
    } else {
       key = item[this.keyPath];
    }
    setTimeout(() => {
      this.data.set(key, item);
      req.fireSuccess(key);
    }, 0);
    return req;
  }

  delete(key: any) {
    const req = new MockIDBRequest();
    const stringKey = Array.isArray(key) ? JSON.stringify(key) : key;
    setTimeout(() => {
      this.data.delete(stringKey);
      req.fireSuccess(undefined);
    }, 0);
    return req;
  }

  clear() {
    const req = new MockIDBRequest();
    setTimeout(() => {
      this.data.clear();
      req.fireSuccess(undefined);
    }, 0);
    return req;
  }

  openCursor() {
    const req = new MockIDBRequest();
    setTimeout(() => {
      const items = Array.from(this.data.values());
      const keys = Array.from(this.data.keys());
      let index = 0;

      const fireNext = () => {
        if (index < items.length) {
          const cursor = {
            value: items[index],
            delete: () => {
              this.data.delete(keys[index]);
            },
            continue: () => {
              index++;
              fireNext();
            }
          };
          req.result = cursor;
          if (req.onsuccess) req.onsuccess({ target: req });
        } else {
          req.result = null;
          if (req.onsuccess) req.onsuccess({ target: req });
        }
      };
      fireNext();

    }, 0);
    return req;
  }
}

class MockIDBTransaction {
  storeNames: string | string[];
  mode: string;
  stores: Map<string, MockIDBObjectStore>;
  oncomplete: any = null;
  onerror: any = null;
  error: any = null;
  private _completeCallback?: () => void;

  constructor(storeNames: string | string[], mode: string, stores: Map<string, MockIDBObjectStore>, completeCallback?: () => void) {
    this.storeNames = storeNames;
    this.mode = mode;
    this.stores = stores;
    this._completeCallback = completeCallback;

    setTimeout(() => {
      if (this.oncomplete) this.oncomplete();
      if (this._completeCallback) this._completeCallback();
    }, 10);
  }

  objectStore(name: string) {
    const store = this.stores.get(name);
    if (!store) throw new Error(`Store ${name} not found`);
    return store;
  }
}

class MockIDBDatabase {
  objectStoreNames = {
    names: [] as string[],
    contains(name: string) { return this.names.includes(name); }
  };
  stores: Map<string, MockIDBObjectStore> = new Map();

  createObjectStore(name: string, options: any) {
    const store = new MockIDBObjectStore(name, options);
    this.stores.set(name, store);
    this.objectStoreNames.names.push(name);
    return store;
  }

  transaction(storeNames: string | string[], mode: string, completeCallback?: () => void) {
    return new MockIDBTransaction(storeNames, mode, this.stores, completeCallback);
  }
}

class MockIndexedDB {
  databases: Map<string, MockIDBDatabase> = new Map();

  open(name: string, version: number) {
    const req = new MockIDBRequest();

    setTimeout(() => {
      let db = this.databases.get(name);
      let isUpgrade = false;
      if (!db) {
        db = new MockIDBDatabase();
        this.databases.set(name, db);
        isUpgrade = true;
      }

      if (isUpgrade) {
        req.fireUpgradeNeeded(db);
        // Fire success after upgrade transaction completes
        setTimeout(() => {
          req.fireSuccess(db);
        }, 20);
      } else {
        req.fireSuccess(db);
      }
    }, 0);

    return req;
  }
}

describe('IndexedDBStorageAdapter', () => {
  let adapter: IndexedDBStorageAdapter;
  let originalIndexedDB: any;

  beforeEach(() => {
    originalIndexedDB = window.indexedDB;
    Object.defineProperty(window, 'indexedDB', { value: new MockIndexedDB(), configurable: true });
    adapter = new IndexedDBStorageAdapter();
  });

  afterEach(() => {
    if (originalIndexedDB) {
      Object.defineProperty(window, 'indexedDB', { value: originalIndexedDB, configurable: true });
    } else {

      delete window.indexedDB;
    }
  });

  it('should reject initialization if indexedDB is not supported', async () => {
    Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true });
    await expect(adapter.init()).rejects.toThrow('IndexedDB is not supported in this environment.');
  });

  it('should initialize and create object stores', async () => {
    await adapter.init();

    const db = (adapter as any).db;
    expect(db).toBeDefined();
    expect(db?.objectStoreNames.contains('stories')).toBe(true);
    expect(db?.objectStoreNames.contains('chapter_contents')).toBe(true);
    expect(db?.objectStoreNames.contains('audio_cache')).toBe(true);
  });

  it('should return empty array when no stories exist', async () => {
    const stories = await adapter.getStories();
    expect(stories).toEqual([]);
  });

  it('should save and retrieve a story', async () => {
    const story: StoryWorld = {
      id: 'story1',
      title: 'My Story',
      genre: 'Fantasy',
      mcName: 'Hero',
      customPremise: 'Premise',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentChapterNumber: 1,
      memory: { powerSystem: '', characters: [], currentPowerStage: '', worldRules: [], unresolvedPlotThreads: [], resolvedPlotThreads: [] },
      arcs: []
    };

    await adapter.saveStory(story);
    const retrieved = await adapter.getStory('story1');
    expect(retrieved).toEqual(story);

    const all = await adapter.getStories();
    expect(all.length).toBe(1);
    expect(all[0]).toEqual(story);
  });

  it('should sort stories descending by updatedAt', async () => {
    const storyOld: StoryWorld = {
      id: 'storyOld',
      title: 'Old Story',
      genre: 'Fantasy',
      mcName: 'Hero',
      customPremise: 'Premise',
      createdAt: new Date().toISOString(),
      updatedAt: new Date(Date.now() - 10000).toISOString(),
      currentChapterNumber: 1,
      memory: { powerSystem: '', characters: [], currentPowerStage: '', worldRules: [], unresolvedPlotThreads: [], resolvedPlotThreads: [] },
      arcs: []
    };

    const storyNew: StoryWorld = {
      id: 'storyNew',
      title: 'New Story',
      genre: 'Fantasy',
      mcName: 'Hero',
      customPremise: 'Premise',
      createdAt: new Date().toISOString(),
      updatedAt: new Date(Date.now() + 10000).toISOString(),
      currentChapterNumber: 1,
      memory: { powerSystem: '', characters: [], currentPowerStage: '', worldRules: [], unresolvedPlotThreads: [], resolvedPlotThreads: [] },
      arcs: []
    };

    await adapter.saveStory(storyOld);
    await adapter.saveStory(storyNew);

    const all = await adapter.getStories();
    expect(all[0].id).toBe('storyNew');
    expect(all[1].id).toBe('storyOld');
  });

  it('should clear all data', async () => {
    const story: StoryWorld = {
      id: 'story1',
      title: 'My Story',
      genre: 'Fantasy',
      mcName: 'Hero',
      customPremise: 'Premise',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentChapterNumber: 1,
      memory: { powerSystem: '', characters: [], currentPowerStage: '', worldRules: [], unresolvedPlotThreads: [], resolvedPlotThreads: [] },
      arcs: []
    };

    await adapter.saveStory(story);
    await adapter.clearAll();

    const stories = await adapter.getStories();
    expect(stories.length).toBe(0);
  });

  it('should handle chapter contents', async () => {
    const chapterContent: ChapterContent = {
      storyId: 'story1',
      chapterNumber: 1,
      generatedContent: 'Once upon a time...',
    };

    await adapter.saveChapterContent(chapterContent);
    const retrieved = await adapter.getChapterContent('story1', 1);
    expect(retrieved).toEqual(chapterContent);
  });

  it('should delete a story and its corresponding chapter contents', async () => {
    const story: StoryWorld = {
      id: 'story1',
      title: 'My Story',
      genre: 'Fantasy',
      mcName: 'Hero',
      customPremise: 'Premise',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentChapterNumber: 1,
      memory: { powerSystem: '', characters: [], currentPowerStage: '', worldRules: [], unresolvedPlotThreads: [], resolvedPlotThreads: [] },
      arcs: []
    };

    const chapterContent1: ChapterContent = {
      storyId: 'story1',
      chapterNumber: 1,
      generatedContent: 'Ch 1',
    };

    const chapterContent2: ChapterContent = {
      storyId: 'story2', // Different story
      chapterNumber: 1,
      generatedContent: 'Ch 1',
    };

    await adapter.saveStory(story);
    await adapter.saveChapterContent(chapterContent1);
    await adapter.saveChapterContent(chapterContent2);

    await adapter.deleteStory('story1');

    const retrievedStory = await adapter.getStory('story1');
    expect(retrievedStory).toBeNull();

    const retrievedChapter1 = await adapter.getChapterContent('story1', 1);
    expect(retrievedChapter1).toBeNull();

    const retrievedChapter2 = await adapter.getChapterContent('story2', 1);
    expect(retrievedChapter2).toEqual(chapterContent2);
  });

  it('should handle audio blobs', async () => {

    const blob = new Blob(['audio data']);
    const url = 'http://example.com/audio.mp3';

    await adapter.saveAudioBlob(url, blob);
    const retrieved = await adapter.getAudioBlob(url);

    expect(retrieved).toBeDefined();
  });
});
