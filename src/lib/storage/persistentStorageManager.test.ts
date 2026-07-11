import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  idb: {
    init: vi.fn(),
    getStories: vi.fn(),
    saveStory: vi.fn(),
    saveChapterContent: vi.fn(),
  },
  local: {
    init: vi.fn(),
    getStories: vi.fn(),
  },
  memory: { init: vi.fn() },
  cloud: { init: vi.fn() },
  onAuthStateChanged: vi.fn(),
}));

vi.mock('./indexedDBAdapter', () => ({
  IndexedDBStorageAdapter: class {
    constructor() { return mocks.idb as any; }
  },
}));
vi.mock('./localStorageAdapter', () => ({
  LocalStorageFallbackAdapter: class {
    constructor() { return mocks.local as any; }
  },
}));
vi.mock('./inMemoryAdapter', () => ({
  InMemoryFallbackAdapter: class {
    constructor() { return mocks.memory as any; }
  },
}));
vi.mock('../firebaseStorage', () => ({
  FirebaseStorageAdapter: class {
    constructor() { return mocks.cloud as any; }
  },
}));
vi.mock('../firebase', () => ({
  auth: { currentUser: null },
  LOCAL_ONLY_MODE: true,
}));
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: mocks.onAuthStateChanged,
}));

import { PersistentStorageManager } from './persistentStorageManager';

describe('PersistentStorageManager migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.idb.init.mockResolvedValue(undefined);
    mocks.idb.getStories.mockResolvedValue([]);
    mocks.idb.saveStory.mockResolvedValue(undefined);
    mocks.idb.saveChapterContent.mockResolvedValue(undefined);
    mocks.local.init.mockResolvedValue(undefined);
    mocks.local.getStories.mockResolvedValue([]);
  });

  it('migrates legacy stories and decoupled chapters into an empty IndexedDB', async () => {
    const stories = [{ id: 'legacy-story', title: 'Legacy' }];
    const chapters = [
      { storyId: 'legacy-story', chapterNumber: 1, generatedContent: 'chapter' },
    ];
    mocks.local.getStories.mockResolvedValue(stories);
    localStorage.setItem(
      '@seihouse/fiction-generator-chapters-v2',
      JSON.stringify(chapters),
    );
    const manager = new PersistentStorageManager();

    await manager.init();

    expect(mocks.idb.saveStory).toHaveBeenCalledWith(stories[0]);
    expect(mocks.idb.saveChapterContent).toHaveBeenCalledWith(chapters[0]);
    manager.dispose();
  });

  it('does not overwrite IndexedDB when it already contains stories', async () => {
    mocks.idb.getStories.mockResolvedValue([{ id: 'current-story' }]);
    mocks.local.getStories.mockResolvedValue([{ id: 'legacy-story' }]);
    const manager = new PersistentStorageManager();

    await manager.init();

    expect(mocks.local.init).not.toHaveBeenCalled();
    expect(mocks.idb.saveStory).not.toHaveBeenCalled();
    manager.dispose();
  });

  it('keeps migrated stories when legacy chapter JSON is corrupt', async () => {
    const story = { id: 'legacy-story', title: 'Legacy' };
    mocks.local.getStories.mockResolvedValue([story]);
    localStorage.setItem('@seihouse/fiction-generator-chapters-v2', '{broken');
    const manager = new PersistentStorageManager();

    await manager.init();

    expect(mocks.idb.saveStory).toHaveBeenCalledWith(story);
    expect(mocks.idb.saveChapterContent).not.toHaveBeenCalled();
    manager.dispose();
  });

  it('fails explicitly when the active local adapter cannot clear all data', async () => {
    const manager = new PersistentStorageManager();
    (manager as any).localAdapter = { name: 'ReadOnlyAdapter' };

    await expect(manager.clearAll()).rejects.toThrow(
      'clearAll is not supported by the active local adapter: ReadOnlyAdapter',
    );
    manager.dispose();
  });
});
