import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: { currentUser: null as null | { uid: string } },
  authCallback: null as null | ((user: null | { uid: string }) => void),
  cloudChange: null as null | ((storyIds: string[]) => void),
  cloudUnsubscribe: vi.fn(),
  idb: {
    init: vi.fn(),
    setAccountScope: vi.fn(),
    getStories: vi.fn(),
    getStory: vi.fn(),
    saveStory: vi.fn(),
    getChapterContent: vi.fn(),
    saveChapterContent: vi.fn(),
  },
  local: {
    init: vi.fn(),
    setAccountScope: vi.fn(),
    getStories: vi.fn(),
  },
  memory: { init: vi.fn() },
  cloud: {
    init: vi.fn(),
    getStories: vi.fn(),
    getStory: vi.fn(),
    getChapterContent: vi.fn(),
    saveChapterContent: vi.fn(),
    saveChapterContentIfUnchanged: vi.fn(),
    saveStory: vi.fn(),
    saveStoryIfUnchanged: vi.fn(),
    deleteStory: vi.fn(),
    subscribeToStories: vi.fn(),
  },
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
  auth: mocks.auth,
  LOCAL_ONLY_MODE: false,
}));
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: mocks.onAuthStateChanged,
}));

import { PersistentStorageManager } from './persistentStorageManager';

function makeStory(overrides: Record<string, unknown> = {}) {
  return {
    id: 'shared-story',
    userId: 'reader',
    title: 'Shared',
    genre: 'Fantasy',
    mcName: 'MC',
    customPremise: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    currentChapterNumber: 1,
    memory: {
      powerSystem: '',
      characters: [],
      currentPowerStage: '',
      worldRules: [],
      unresolvedPlotThreads: [],
      resolvedPlotThreads: [],
    },
    arcs: [],
    ...overrides,
  };
}

describe('PersistentStorageManager automatic inbound sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.auth.currentUser = null;
    mocks.authCallback = null;
    mocks.cloudChange = null;
    mocks.idb.init.mockResolvedValue(undefined);
    mocks.idb.setAccountScope.mockReturnValue(undefined);
    mocks.idb.getStories.mockResolvedValue([]);
    mocks.idb.getStory.mockResolvedValue(null);
    mocks.idb.saveStory.mockResolvedValue(undefined);
    mocks.idb.getChapterContent.mockResolvedValue(null);
    mocks.idb.saveChapterContent.mockResolvedValue(undefined);
    mocks.local.init.mockResolvedValue(undefined);
    mocks.local.setAccountScope.mockReturnValue(undefined);
    mocks.local.getStories.mockResolvedValue([]);
    mocks.cloud.init.mockResolvedValue(undefined);
    mocks.cloud.getStories.mockResolvedValue([]);
    mocks.cloud.getStory.mockResolvedValue(null);
    mocks.cloud.getChapterContent.mockResolvedValue(null);
    mocks.cloud.saveChapterContent.mockResolvedValue(undefined);
    mocks.cloud.saveChapterContentIfUnchanged.mockResolvedValue(undefined);
    mocks.cloud.saveStory.mockResolvedValue(undefined);
    mocks.cloud.saveStoryIfUnchanged.mockResolvedValue(undefined);
    mocks.cloud.deleteStory.mockResolvedValue(undefined);
    mocks.onAuthStateChanged.mockImplementation((_auth, callback) => {
      mocks.authCallback = callback;
      return vi.fn();
    });
    mocks.cloud.subscribeToStories.mockImplementation((onChange) => {
      mocks.cloudChange = onChange;
      return mocks.cloudUnsubscribe;
    });
  });

  it('pulls on sign-in, remote snapshots, reconnect, and focus without an audit click', async () => {
    const manager = new PersistentStorageManager();
    await manager.init();

    const user = { uid: 'reader' };
    mocks.auth.currentUser = user;
    mocks.authCallback?.(user);
    await vi.waitFor(() => expect(mocks.cloud.getStories).toHaveBeenCalled());
    expect(mocks.idb.setAccountScope).toHaveBeenCalledWith('reader');
    expect(mocks.cloud.subscribeToStories).toHaveBeenCalledTimes(1);

    let previousCalls = mocks.cloud.getStories.mock.calls.length;
    mocks.cloudChange?.(['remote-story']);
    await vi.waitFor(() => {
      expect(mocks.cloud.getStories.mock.calls.length).toBeGreaterThan(previousCalls);
    });

    previousCalls = mocks.cloud.getStories.mock.calls.length;
    window.dispatchEvent(new Event('online'));
    await vi.waitFor(() => {
      expect(mocks.cloud.getStories.mock.calls.length).toBeGreaterThan(previousCalls);
    });

    previousCalls = mocks.cloud.getStories.mock.calls.length;
    window.dispatchEvent(new Event('focus'));
    await vi.waitFor(() => {
      expect(mocks.cloud.getStories.mock.calls.length).toBeGreaterThan(previousCalls);
    });

    manager.dispose();
    expect(mocks.cloudUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('completes the first cloud pull before initialization returns for a restored session', async () => {
    mocks.auth.currentUser = { uid: 'restored-reader' };
    let releaseCloud!: (stories: any[]) => void;
    mocks.cloud.getStories.mockReturnValueOnce(new Promise<any[]>((resolve) => {
      releaseCloud = resolve;
    }));
    const manager = new PersistentStorageManager();

    let initialized = false;
    const initialization = manager.init().then(() => {
      initialized = true;
    });
    await vi.waitFor(() => expect(mocks.cloud.getStories).toHaveBeenCalledTimes(1));
    expect(initialized).toBe(false);
    releaseCloud([]);
    await initialization;

    expect(mocks.idb.setAccountScope).toHaveBeenCalledWith('restored-reader');
    expect(initialized).toBe(true);
    manager.dispose();
  });

  it('refuses to sync through a local namespace that belongs to the previous account', async () => {
    localStorage.setItem('@seihouse/sync-queue', JSON.stringify([{
      type: 'story',
      storyId: 'same-id',
      timestamp: Date.now(),
      userId: 'account-b',
      generation: 1,
    }]));
    let releaseCloudInit!: () => void;
    mocks.cloud.init.mockReturnValueOnce(new Promise<void>((resolve) => {
      releaseCloudInit = resolve;
    }));
    mocks.auth.currentUser = { uid: 'account-a' };
    const manager = new PersistentStorageManager();

    const initialization = manager.init();
    await vi.waitFor(() => expect(mocks.cloud.init).toHaveBeenCalled());
    expect(mocks.idb.setAccountScope).toHaveBeenCalledWith('account-a');
    // Ignore adapter reads used by the pre-cloud LocalStorage migration.
    mocks.idb.getStories.mockClear();
    mocks.idb.getStory.mockClear();

    mocks.auth.currentUser = { uid: 'account-b' };
    releaseCloudInit();
    await initialization;

    expect(mocks.idb.getStories).not.toHaveBeenCalled();
    expect(mocks.idb.getStory).not.toHaveBeenCalled();
    expect(mocks.cloud.getStories).not.toHaveBeenCalled();
    expect(mocks.cloud.saveStoryIfUnchanged).not.toHaveBeenCalled();
    expect((manager as any).syncQueue).toEqual([
      expect.objectContaining({ storyId: 'same-id', userId: 'account-b' }),
    ]);
    manager.dispose();
  });

  it('keeps authenticated stories hidden while signed out', async () => {
    const manager = new PersistentStorageManager();
    await manager.init();
    mocks.idb.getStories.mockClear();
    mocks.idb.getStory.mockClear();
    mocks.idb.getChapterContent.mockClear();

    await expect(manager.getStories()).resolves.toEqual([]);
    await expect(manager.getStory('private')).resolves.toBeNull();
    await expect(manager.getChapterContent('private', 1)).resolves.toBeNull();

    expect(mocks.idb.getStories).not.toHaveBeenCalled();
    expect(mocks.idb.getStory).not.toHaveBeenCalled();
    expect(mocks.idb.getChapterContent).not.toHaveBeenCalled();
    manager.dispose();
  });

  it('finishes the old account pass before switching the local namespace', async () => {
    let releaseAccountA!: (stories: any[]) => void;
    mocks.cloud.getStories
      .mockReturnValueOnce(new Promise<any[]>((resolve) => {
        releaseAccountA = resolve;
      }))
      .mockResolvedValueOnce([]);
    const manager = new PersistentStorageManager();
    await manager.init();

    const accountA = { uid: 'account-a' };
    mocks.auth.currentUser = accountA;
    mocks.authCallback?.(accountA);
    await vi.waitFor(() => expect(mocks.cloud.getStories).toHaveBeenCalledTimes(1));

    const accountB = { uid: 'account-b' };
    mocks.auth.currentUser = accountB;
    mocks.authCallback?.(accountB);
    expect(mocks.idb.setAccountScope).not.toHaveBeenCalledWith('account-b');

    releaseAccountA([]);
    await vi.waitFor(() => {
      expect(mocks.idb.setAccountScope).toHaveBeenCalledWith('account-b');
      expect(mocks.cloud.getStories).toHaveBeenCalledTimes(2);
    });
    manager.dispose();
  });

  it('does not dispatch an old account conflict after auth changes mid-read', async () => {
    const localStory = makeStory({
      userId: 'account-a',
      title: 'Private local A',
    });
    const cloudStory = makeStory({
      userId: 'account-a',
      title: 'Private cloud A',
    });
    let releaseReconcileRead!: (story: any) => void;
    mocks.idb.getStories.mockResolvedValue([localStory]);
    mocks.idb.getStory
      .mockResolvedValueOnce(localStory)
      .mockReturnValueOnce(new Promise<any>((resolve) => {
        releaseReconcileRead = resolve;
      }))
      .mockResolvedValue(null);
    mocks.cloud.getStories
      .mockResolvedValueOnce([cloudStory])
      .mockResolvedValue([]);
    const conflictHandler = vi.fn();
    const manager = new PersistentStorageManager();
    manager.onConflict(conflictHandler);
    await manager.init();

    const accountA = { uid: 'account-a' };
    mocks.auth.currentUser = accountA;
    mocks.authCallback?.(accountA);
    await vi.waitFor(() => expect(mocks.idb.getStory).toHaveBeenCalledTimes(2));

    const accountB = { uid: 'account-b' };
    mocks.auth.currentUser = accountB;
    mocks.authCallback?.(accountB);
    releaseReconcileRead(localStory);

    await vi.waitFor(() => {
      expect(mocks.idb.setAccountScope).toHaveBeenCalledWith('account-b');
    });
    expect(conflictHandler).not.toHaveBeenCalled();
    manager.dispose();
  });

  it('waits for the new account namespace before saving during A to B transition', async () => {
    let activeScope: string | null | undefined;
    const saved: Array<{ scope: string | null | undefined; story: any }> = [];
    const byScope = new Map<string | null | undefined, any[]>();
    mocks.idb.setAccountScope.mockImplementation((scope) => {
      activeScope = scope;
    });
    mocks.idb.getStories.mockImplementation(async () => byScope.get(activeScope) ?? []);
    mocks.idb.getStory.mockImplementation(async (id) =>
      (byScope.get(activeScope) ?? []).find((story) => story.id === id) ?? null,
    );
    mocks.idb.saveStory.mockImplementation(async (story) => {
      const stories = [...(byScope.get(activeScope) ?? [])];
      const index = stories.findIndex((candidate) => candidate.id === story.id);
      if (index >= 0) stories[index] = story;
      else stories.push(story);
      byScope.set(activeScope, stories);
      saved.push({ scope: activeScope, story });
    });
    let releaseAccountA!: (stories: any[]) => void;
    mocks.cloud.getStories
      .mockReturnValueOnce(new Promise<any[]>((resolve) => {
        releaseAccountA = resolve;
      }))
      .mockResolvedValue([]);
    const manager = new PersistentStorageManager();
    await manager.init();

    const accountA = { uid: 'account-a' };
    mocks.auth.currentUser = accountA;
    mocks.authCallback?.(accountA);
    await vi.waitFor(() => expect(mocks.cloud.getStories).toHaveBeenCalledTimes(1));

    const accountB = { uid: 'account-b' };
    mocks.auth.currentUser = accountB;
    mocks.authCallback?.(accountB);
    const saveForB = manager.saveStory(makeStory({
      id: 'account-b-story',
      userId: 'account-b',
      title: 'Created during transition',
    }) as any);
    await Promise.resolve();
    expect(saved).toEqual([]);

    releaseAccountA([]);
    await saveForB;

    expect(saved).toEqual([
      expect.objectContaining({
        scope: 'account-b',
        story: expect.objectContaining({
          id: 'account-b-story',
          userId: 'account-b',
        }),
      }),
    ]);
    expect((manager as any).syncQueue).toEqual([
      expect.objectContaining({ storyId: 'account-b-story', userId: 'account-b' }),
    ]);
    manager.dispose();
  });

  it('never claims an ownerless legacy deletion for a different account with the same story id', async () => {
    localStorage.setItem('@seihouse/sync-queue', JSON.stringify([{
      type: 'delete_story',
      storyId: 'shared-import-id',
      timestamp: Date.now() - 60_000,
      generation: 1,
    }]));
    const manager = new PersistentStorageManager();
    await manager.init();
    const accountBStory = makeStory({
      id: 'shared-import-id',
      userId: 'account-b',
      updatedAt: '2026-07-13T12:00:00.000Z',
      syncRevision: 'account-b-shared',
    });
    mocks.idb.getStories.mockResolvedValue([accountBStory]);
    mocks.idb.getStory.mockResolvedValue(accountBStory);
    mocks.cloud.getStories.mockResolvedValue([accountBStory]);

    const accountB = { uid: 'account-b' };
    mocks.auth.currentUser = accountB;
    mocks.authCallback?.(accountB);
    await vi.waitFor(() => expect(mocks.cloud.getStories).toHaveBeenCalled());
    await vi.waitFor(() => expect((manager as any).activeSyncPromise).toBeNull());

    expect(mocks.cloud.deleteStory).not.toHaveBeenCalled();
    expect((manager as any).syncQueue).toEqual([
      expect.objectContaining({
        type: 'delete_story',
        storyId: 'shared-import-id',
      }),
    ]);
    expect((manager as any).syncQueue[0].userId).toBeUndefined();
    manager.dispose();
  });

  it('resumes a partial LocalStorage migration even when IndexedDB is non-empty', async () => {
    const existingStory = {
      id: 'already-migrated',
      updatedAt: '2026-01-02T00:00:00.000Z',
    };
    const missingStory = {
      id: 'still-in-local-storage',
      updatedAt: '2026-01-03T00:00:00.000Z',
    };
    mocks.idb.getStories.mockResolvedValue([existingStory]);
    mocks.local.getStories.mockResolvedValue([missingStory]);
    localStorage.setItem(
      '@seihouse/fiction-generator-chapters-v2',
      JSON.stringify([{
        storyId: missingStory.id,
        chapterNumber: 1,
        generatedContent: 'Recover me too',
        updatedAt: '2026-01-03T00:00:00.000Z',
      }]),
    );

    const manager = new PersistentStorageManager();
    await manager.init();

    expect(mocks.idb.saveStory).toHaveBeenCalledWith(missingStory);
    expect(mocks.idb.saveChapterContent).toHaveBeenCalledWith(
      expect.objectContaining({
        storyId: missingStory.id,
        generatedContent: 'Recover me too',
      }),
    );
    manager.dispose();
  });

  it('uses changed story ids to deep-check chapter bodies on already-open devices', async () => {
    const story = {
      id: 'shared-story',
      userId: 'reader',
      title: 'Shared',
      genre: 'Fantasy',
      mcName: 'MC',
      customPremise: '',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      currentChapterNumber: 1,
      memory: {
        powerSystem: '',
        characters: [],
        currentPowerStage: '',
        worldRules: [],
        unresolvedPlotThreads: [],
        resolvedPlotThreads: [],
      },
      arcs: [{
        title: 'Arc',
        isCompleted: false,
        chapters: [{
          number: 1,
          title: 'One',
          premise: '',
          status: 'read',
          hasContent: true,
        }],
      }],
    };
    mocks.idb.getStories.mockResolvedValue([story]);
    mocks.idb.getStory.mockResolvedValue(story);
    mocks.cloud.getStories.mockResolvedValue([story]);
    mocks.idb.getChapterContent.mockResolvedValue({
      storyId: story.id,
      chapterNumber: 1,
      generatedContent: 'Old body',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    mocks.cloud.getChapterContent.mockResolvedValue({
      storyId: story.id,
      chapterNumber: 1,
      generatedContent: 'New body from tablet',
      updatedAt: '2026-01-03T00:00:00.000Z',
    });

    const manager = new PersistentStorageManager();
    await manager.init();
    const user = { uid: 'reader' };
    mocks.auth.currentUser = user;
    mocks.authCallback?.(user);
    await vi.waitFor(() => expect(mocks.cloud.getChapterContent).toHaveBeenCalled());
    mocks.cloud.getChapterContent.mockClear();
    mocks.idb.saveChapterContent.mockClear();

    mocks.cloudChange?.([story.id]);

    await vi.waitFor(() => {
      expect(mocks.cloud.getChapterContent).toHaveBeenCalledWith(story.id, 1);
      expect(mocks.idb.saveChapterContent).toHaveBeenCalledWith(
        expect.objectContaining({ generatedContent: 'New body from tablet' }),
      );
    });
    manager.dispose();
  });

  it('holds the story lock while extracting chapters so a slow earlier save cannot overwrite a later save', async () => {
    let storedStory = makeStory();
    let storedChapter: Record<string, unknown> | null = null;
    let releaseChapterSave!: () => void;
    const chapterSaveGate = new Promise<void>((resolve) => {
      releaseChapterSave = resolve;
    });

    mocks.idb.getStory.mockImplementation(async () => storedStory);
    mocks.idb.saveStory.mockImplementation(async (story) => {
      storedStory = JSON.parse(JSON.stringify(story));
    });
    mocks.idb.getChapterContent.mockImplementation(async () => storedChapter);
    mocks.idb.saveChapterContent.mockImplementationOnce(async (chapter) => {
      await chapterSaveGate;
      storedChapter = JSON.parse(JSON.stringify(chapter));
    });

    const manager = new PersistentStorageManager();
    await manager.init();

    const slowEarlierSave = manager.saveStory(makeStory({
      title: 'Slow earlier value',
      arcs: [{
        title: 'Arc',
        isCompleted: false,
        chapters: [{
          number: 1,
          title: 'One',
          premise: '',
          status: 'read',
          generatedContent: 'New chapter body',
          _isNewContent: true,
        }],
      }],
    }) as any);
    await vi.waitFor(() => {
      expect(mocks.idb.saveChapterContent).toHaveBeenCalledTimes(1);
    });

    const laterSave = manager.saveStory(makeStory({
      title: 'Later completed value',
    }) as any);
    releaseChapterSave();
    await Promise.all([slowEarlierSave, laterSave]);

    expect(storedStory.title).toBe('Later completed value');
    expect(mocks.idb.saveStory).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: 'Later completed value' }),
    );
    manager.dispose();
  });

  it('serializes cloud chapter caching ahead of a concurrent local chapter edit', async () => {
    let storedStory = makeStory();
    let storedChapter: Record<string, unknown> | null = null;
    let resolveCloudChapter!: (chapter: Record<string, unknown>) => void;
    const cloudChapterGate = new Promise<Record<string, unknown>>((resolve) => {
      resolveCloudChapter = resolve;
    });
    mocks.idb.getStory.mockImplementation(async () => storedStory);
    mocks.idb.saveStory.mockImplementation(async (story) => {
      storedStory = JSON.parse(JSON.stringify(story));
    });
    mocks.idb.getChapterContent.mockImplementation(async () => storedChapter);
    mocks.idb.saveChapterContent.mockImplementation(async (chapter) => {
      storedChapter = JSON.parse(JSON.stringify(chapter));
    });
    mocks.cloud.getChapterContent.mockReturnValue(cloudChapterGate as any);

    const manager = new PersistentStorageManager();
    await manager.init();
    const user = { uid: 'reader' };
    mocks.auth.currentUser = user;
    mocks.authCallback?.(user);
    await vi.waitFor(() => expect(mocks.cloud.getStories).toHaveBeenCalled());

    const cloudRead = manager.getChapterContent('shared-story', 1);
    await vi.waitFor(() => {
      expect(mocks.cloud.getChapterContent).toHaveBeenCalledWith('shared-story', 1);
    });
    const localSave = manager.saveChapterContent({
      storyId: 'shared-story',
      chapterNumber: 1,
      generatedContent: 'Local edit made during fetch',
    });

    resolveCloudChapter({
      storyId: 'shared-story',
      chapterNumber: 1,
      generatedContent: 'Older cloud body',
      updatedAt: '2026-01-03T00:00:00.000Z',
    });
    await Promise.all([cloudRead, localSave]);

    expect(storedChapter).toEqual(expect.objectContaining({
      generatedContent: 'Local edit made during fetch',
    }));
    manager.dispose();
  });

  it('re-checks local chapter state after a cloud fetch before caching its result', async () => {
    const storedStory = makeStory();
    let storedChapter: Record<string, unknown> | null = null;
    let resolveCloudChapter!: (chapter: Record<string, unknown>) => void;
    const cloudChapterGate = new Promise<Record<string, unknown>>((resolve) => {
      resolveCloudChapter = resolve;
    });
    mocks.idb.getStory.mockImplementation(async () => storedStory);
    mocks.idb.getChapterContent.mockImplementation(async () => storedChapter);
    mocks.cloud.getChapterContent.mockReturnValue(cloudChapterGate as any);

    const manager = new PersistentStorageManager();
    await manager.init();
    const user = { uid: 'reader' };
    mocks.auth.currentUser = user;
    mocks.authCallback?.(user);
    await vi.waitFor(() => expect(mocks.cloud.getStories).toHaveBeenCalled());
    mocks.idb.saveChapterContent.mockClear();

    const read = manager.getChapterContent('shared-story', 1);
    await vi.waitFor(() => expect(mocks.cloud.getChapterContent).toHaveBeenCalled());
    storedChapter = {
      storyId: 'shared-story',
      chapterNumber: 1,
      generatedContent: 'Local body that appeared during fetch',
      updatedAt: '2026-01-04T00:00:00.000Z',
    };
    resolveCloudChapter({
      storyId: 'shared-story',
      chapterNumber: 1,
      generatedContent: 'Cloud body',
      updatedAt: '2026-01-03T00:00:00.000Z',
    });

    await expect(read).resolves.toEqual(expect.objectContaining({
      generatedContent: 'Local body that appeared during fetch',
    }));
    expect(mocks.idb.saveChapterContent).not.toHaveBeenCalled();
    manager.dispose();
  });

  it('re-checks the parent tombstone after a cloud chapter fetch', async () => {
    let storedStory = makeStory();
    let resolveCloudChapter!: (chapter: Record<string, unknown>) => void;
    const cloudChapterGate = new Promise<Record<string, unknown>>((resolve) => {
      resolveCloudChapter = resolve;
    });
    mocks.idb.getStory.mockImplementation(async () => storedStory);
    mocks.cloud.getChapterContent.mockReturnValue(cloudChapterGate as any);

    const manager = new PersistentStorageManager();
    await manager.init();
    const user = { uid: 'reader' };
    mocks.auth.currentUser = user;
    mocks.authCallback?.(user);
    await vi.waitFor(() => expect(mocks.cloud.getStories).toHaveBeenCalled());
    mocks.idb.saveChapterContent.mockClear();

    const read = manager.getChapterContent('shared-story', 1);
    await vi.waitFor(() => expect(mocks.cloud.getChapterContent).toHaveBeenCalled());
    storedStory = makeStory({ deleted: true });
    resolveCloudChapter({
      storyId: 'shared-story',
      chapterNumber: 1,
      generatedContent: 'Must not be revived',
      updatedAt: '2026-01-03T00:00:00.000Z',
    });

    await expect(read).resolves.toBeNull();
    expect(mocks.idb.saveChapterContent).not.toHaveBeenCalled();
    manager.dispose();
  });
});
