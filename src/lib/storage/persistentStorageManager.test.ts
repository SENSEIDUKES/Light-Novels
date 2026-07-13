import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  idb: {
    init: vi.fn(),
    setAccountScope: vi.fn(),
    getStories: vi.fn(),
    getStory: vi.fn(),
    getChapterContent: vi.fn(),
    saveStory: vi.fn(),
    saveChapterContent: vi.fn(),
    getAllChapterContents: vi.fn(),
  },
  local: {
    init: vi.fn(),
    getStories: vi.fn(),
    getAllChapterContents: vi.fn(),
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
    mocks.idb.setAccountScope.mockReturnValue(undefined);
    mocks.idb.getStories.mockResolvedValue([]);
    mocks.idb.getStory.mockResolvedValue(null);
    mocks.idb.getChapterContent.mockResolvedValue(null);
    mocks.idb.saveStory.mockResolvedValue(undefined);
    mocks.idb.saveChapterContent.mockResolvedValue(undefined);
    mocks.idb.getAllChapterContents.mockResolvedValue([]);
    mocks.local.init.mockResolvedValue(undefined);
    mocks.local.getStories.mockResolvedValue([]);
    mocks.local.getAllChapterContents.mockImplementation(async () => {
      const raw = localStorage.getItem('@seihouse/fiction-generator-chapters-v2');
      return raw
        ? (JSON.parse(raw) as Array<Record<string, unknown>>).map((content) => ({ content }))
        : [];
    });
  });

  it('keeps account-owned libraries hidden in device-only mode', async () => {
    let scope: string | null | undefined;
    const records: Array<{
      id: string;
      userId?: string;
      title: string;
      updatedAt: string;
    }> = [
      { id: 'account-a', userId: 'account-a', title: 'Private A', updatedAt: '2026-01-01' },
      { id: 'account-b', userId: 'account-b', title: 'Private B', updatedAt: '2026-01-02' },
      { id: 'device-only', title: 'Unowned legacy', updatedAt: '2026-01-03' },
    ];
    mocks.idb.setAccountScope.mockImplementation((nextScope) => {
      scope = nextScope;
    });
    mocks.idb.getStories.mockImplementation(async () =>
      scope === null ? records.filter((story) => !story.userId) : records,
    );
    const manager = new PersistentStorageManager();

    await manager.init();

    expect(mocks.idb.setAccountScope).toHaveBeenLastCalledWith(null);
    await expect(manager.getStories()).resolves.toEqual([
      expect.objectContaining({ id: 'device-only' }),
    ]);
    manager.dispose();
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

  it('resumes missing story migration when IndexedDB already contains other stories', async () => {
    mocks.idb.getStories.mockResolvedValue([{ id: 'current-story' }]);
    mocks.local.getStories.mockResolvedValue([{ id: 'legacy-story' }]);
    const manager = new PersistentStorageManager();

    await manager.init();

    expect(mocks.local.init).toHaveBeenCalled();
    expect(mocks.idb.saveStory).toHaveBeenCalledWith({ id: 'legacy-story' });
    manager.dispose();
  });

  it('preserves same-id stories and chapters from separate account namespaces', async () => {
    const storyA = {
      id: 'shared', userId: 'account-a', title: 'A', updatedAt: '2026-07-13T00:01:00.000Z',
    };
    const storyB = {
      id: 'shared', userId: 'account-b', title: 'B', updatedAt: '2026-07-13T00:02:00.000Z',
    };
    mocks.local.getStories.mockResolvedValue([storyA, storyB]);
    mocks.local.getAllChapterContents.mockResolvedValue([
      { userId: 'account-a', content: { storyId: 'shared', chapterNumber: 1, generatedContent: 'A chapter' } },
      { userId: 'account-b', content: { storyId: 'shared', chapterNumber: 1, generatedContent: 'B chapter' } },
    ]);
    const manager = new PersistentStorageManager();

    await manager.init();

    expect(mocks.idb.saveStory).toHaveBeenCalledWith(storyA);
    expect(mocks.idb.saveStory).toHaveBeenCalledWith(storyB);
    expect(mocks.idb.saveChapterContent).toHaveBeenCalledWith(
      expect.objectContaining({ generatedContent: 'A chapter' }),
    );
    expect(mocks.idb.saveChapterContent).toHaveBeenCalledWith(
      expect.objectContaining({ generatedContent: 'B chapter' }),
    );
    expect(mocks.idb.setAccountScope).toHaveBeenCalledWith('account-a');
    expect(mocks.idb.setAccountScope).toHaveBeenCalledWith('account-b');
    expect(mocks.idb.setAccountScope).toHaveBeenLastCalledWith(null);
    manager.dispose();
  });

  it('does not migrate a legacy chapter whose account owner is ambiguous', async () => {
    mocks.local.getAllChapterContents.mockResolvedValue([{
      content: { storyId: 'shared', chapterNumber: 1, generatedContent: 'Unknown owner' },
      ambiguousOwner: true,
    }]);
    const manager = new PersistentStorageManager();

    await manager.init();

    expect(mocks.idb.saveChapterContent).not.toHaveBeenCalled();
    manager.dispose();
  });

  it('does not overwrite a newer IndexedDB copy of the same migrated story', async () => {
    mocks.idb.getStories.mockResolvedValue([{
      id: 'shared-story',
      updatedAt: '2026-07-13T00:02:00.000Z',
    }]);
    mocks.local.getStories.mockResolvedValue([{
      id: 'shared-story',
      updatedAt: '2026-07-13T00:01:00.000Z',
    }]);
    const manager = new PersistentStorageManager();

    await manager.init();

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

  it('stores detailed context manifests with chapter content instead of story metadata', async () => {
    const manager = new PersistentStorageManager();
    await manager.init();
    vi.clearAllMocks();

    const contextManifest = {
      version: 1,
      route: 'generate-chapter-stream',
      generatedAt: '2026-07-12T00:00:00.000Z',
      chapterNumber: 1,
      totalEstimatedTokens: 100,
      memoryAndHistoryBudgetTokens: 80000,
      memoryAndHistoryEstimatedTokens: 50,
      memoryAndHistoryBudgetExceeded: false,
      providerInputTruncated: false,
      sections: [],
    };
    const story = {
      id: 'story-with-manifest',
      title: 'Manifest Story',
      genre: 'Xianxia',
      mcName: 'Lin',
      customPremise: 'A journey',
      createdAt: '2026-07-12T00:00:00.000Z',
      updatedAt: '2026-07-12T00:00:00.000Z',
      currentChapterNumber: 1,
      memory: {
        powerSystem: '',
        currentPowerStage: '',
        worldRules: [],
        characters: [],
        unresolvedPlotThreads: [],
        resolvedPlotThreads: [],
      },
      arcs: [{
        title: 'Arc',
        isCompleted: false,
        chapters: [{
          number: 1,
          title: 'Chapter',
          premise: 'Begin',
          status: 'read',
          generatedContent: 'Chapter prose',
          _isNewContent: true,
          contextManifest,
        }],
      }],
    } as any;

    await manager.saveStory(story);

    expect(mocks.idb.saveChapterContent).toHaveBeenCalledWith(expect.objectContaining({
      storyId: story.id,
      chapterNumber: 1,
      contextManifest,
    }));
    expect(mocks.idb.saveStory).toHaveBeenCalledWith(expect.objectContaining({
      arcs: [expect.objectContaining({
        chapters: [expect.not.objectContaining({ contextManifest: expect.anything() })],
      })],
    }));
    manager.dispose();
  });
});
