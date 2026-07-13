import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from './useAppStore';
import { storyStorage } from '../lib/storage';
import { secureStorage } from '../lib/encryption';
import { auth } from '../lib/firebase';
import * as demoStories from './demoStories';

vi.mock('../lib/storage', () => ({
  storyStorage: {
    init: vi.fn(),
    onConflict: vi.fn(),
    getActiveAdapterName: vi.fn(),
    getStories: vi.fn(),
    saveStory: vi.fn(),
    deleteStory: vi.fn().mockResolvedValue(true),
    getChapterContent: vi.fn(),
    saveChapterContent: vi.fn(),
    performSync: vi.fn(),
    startTransaction: vi.fn(),
    commitTransaction: vi.fn().mockResolvedValue(true),
    rollbackTransaction: vi.fn(),
  }
}));

vi.mock('../lib/encryption', () => ({
  secureStorage: {
    getItem: vi.fn(),
  }
}));

vi.mock('../lib/firebase', () => ({
  auth: { currentUser: null, onAuthStateChanged: vi.fn() },
  LOCAL_ONLY_MODE: false,
}));

describe('useAppStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).currentUser = null;
    // Reset Zustand store state before each test
    const {
      setStories,
      setActiveStoryId,
      setCurrentScreen,
      setStoryToDelete,
      setActiveConflict,
      setAppError,
    } = useAppStore.getState();
    setStories([]);
    setActiveStoryId(null);
    setCurrentScreen('home');
    setStoryToDelete(null);
    setActiveConflict(null);
    setAppError(null);
    vi.mocked(storyStorage.saveStory).mockResolvedValue(undefined);
    vi.mocked(storyStorage.saveChapterContent).mockResolvedValue(undefined);
    vi.mocked(storyStorage.performSync).mockResolvedValue(undefined);
    vi.mocked(storyStorage.getStories).mockResolvedValue([]);
    vi.mocked(storyStorage.deleteStory).mockResolvedValue(true as any);
  });

  it('rejects a mixed-account library before publishing it to Zustand', async () => {
    const accountBStory = {
      id: 'account-b-story',
      userId: 'account-b',
      title: 'B',
      arcs: [],
      memory: {},
    } as any;
    const accountAStory = {
      ...accountBStory,
      id: 'account-a-story',
      userId: 'account-a',
      title: 'Private A',
    };
    (auth as any).currentUser = { uid: 'account-b' };
    useAppStore.getState().setStories([accountBStory]);

    await expect(
      useAppStore.getState().saveStories([accountBStory, accountAStory]),
    ).rejects.toThrow('different account is active');

    expect(useAppStore.getState().stories).toEqual([accountBStory]);
    expect(storyStorage.startTransaction).not.toHaveBeenCalled();
    expect(storyStorage.saveStory).not.toHaveBeenCalled();
  });

  it('clears optimistic stories when the account changes during persistence', async () => {
    let releaseSave!: () => void;
    vi.mocked(storyStorage.saveStory).mockReturnValueOnce(
      new Promise<void>((resolve) => {
        releaseSave = resolve;
      }),
    );
    (auth as any).currentUser = { uid: 'account-a' };
    const accountAStory = {
      id: 'account-a-story',
      userId: 'account-a',
      title: 'Private A',
      arcs: [],
      memory: {},
    } as any;

    const saving = useAppStore.getState().saveStories([accountAStory]);
    await vi.waitFor(() => expect(storyStorage.saveStory).toHaveBeenCalledOnce());
    (auth as any).currentUser = { uid: 'account-b' };
    releaseSave();

    await expect(saving).rejects.toThrow(
      'Active account changed while saving the story library',
    );
    expect(useAppStore.getState().stories).toEqual([]);
    expect(useAppStore.getState().activeStoryId).toBeNull();
  });

  it('initializes with default state', () => {
    const state = useAppStore.getState();
    expect(state.stories).toEqual([]);
    expect(state.activeStoryId).toBeNull();
    expect(state.currentScreen).toBe('home');
    expect(state.isGenerating).toBe(false);
  });

  it('setters update state correctly', () => {
    const store = useAppStore.getState();
    
    store.setCurrentScreen('reader');
    expect(useAppStore.getState().currentScreen).toBe('reader');
    
    store.setIsGenerating(true);
    expect(useAppStore.getState().isGenerating).toBe(true);
    
    store.setActiveStoryId('test-story-id');
    expect(useAppStore.getState().activeStoryId).toBe('test-story-id');
    
    store.setStoryToDelete('test-story-id');
    expect(useAppStore.getState().storyToDelete).toBe('test-story-id');
    
    store.cancelDeleteStory();
    expect(useAppStore.getState().storyToDelete).toBeNull();

    store.setAppError('test error');
    expect(useAppStore.getState().appError).toBe('test error');
    
    store.setGenerationPhase('chapter');
    expect(useAppStore.getState().generationPhase).toBe('chapter');
    
    store.setGenerationProgressMessage('msg');
    expect(useAppStore.getState().generationProgressMessage).toBe('msg');
    
    store.setEstimatedSecondsRemaining(10);
    expect(useAppStore.getState().estimatedSecondsRemaining).toBe(10);

    store.setStreamingChapter({} as any);
    expect(useAppStore.getState().streamingChapter).toBeDefined();

    store.setActiveAgentId('versa');
    expect(useAppStore.getState().activeAgentId).toBe('versa');

    store.setSyncStatus('synced');
    expect(useAppStore.getState().syncStatus).toBe('synced');

    store.setCurrentUser({ uid: '123' } as any);
    expect(useAppStore.getState().currentUser?.uid).toBe('123');

    store.setUserProfile({ displayName: 'Test' } as any);
    expect(useAppStore.getState().userProfile?.displayName).toBe('Test');

    const dt = new Date();
    store.setLastSavedTime(dt);
    expect(useAppStore.getState().lastSavedTime).toBe(dt);

    store.setStorageType('idb');
    expect(useAppStore.getState().storageType).toBe('idb');

    store.setSelectedChapterNum(5);
    expect(useAppStore.getState().selectedChapterNum).toBe(5);

    store.setNexusTab('codex');
    expect(useAppStore.getState().nexusTab).toBe('codex');

    store.setIsSettingsOpen(true);
    expect(useAppStore.getState().isSettingsOpen).toBe(true);

    store.setIsCodexSheetOpen(true);
    expect(useAppStore.getState().isCodexSheetOpen).toBe(true);

    store.setIsReaderFullscreen(true);
    expect(useAppStore.getState().isReaderFullscreen).toBe(true);

    store.setRoutingConfig({ storyMaker: { provider: 'gemini', model: 'test' }, imageGenerator: { provider: 'gemini', model: 'test' } });
    expect(useAppStore.getState().routingConfig.storyMaker.provider).toBe('gemini');
  });
  
  it('handles confirmDeleteStory', () => {
    const store = useAppStore.getState();
    const mockStory = {
      id: 'mock-id',
      title: 'Mock Title',
      arcs: [],
      currentChapterNumber: 1,
      memory: { factions: [], relationships: [] }
    } as any;
    
    store.setStories([mockStory]);
    store.setActiveStoryId('mock-id');
    store.setCurrentScreen('reader');
    
    store.setStoryToDelete('mock-id');
    store.confirmDeleteStory();
    
    expect(useAppStore.getState().storyToDelete).toBeNull();
    expect(useAppStore.getState().activeStoryId).toBeNull();
    expect(useAppStore.getState().currentScreen).toBe('home');
  });

  it('handleExportLibrary works', async () => {
    const store = useAppStore.getState();
    const mockStory = {
      id: 'mock-id',
      title: 'Mock',
      arcs: [{ chapters: [{ number: 1, hasContent: true, generatedContent: 'abc' }] }]
    } as any;
    store.setStories([mockStory]);

    const createElementSpy = vi.spyOn(document, 'createElement');
    const mockAnchor = {
      setAttribute: vi.fn(),
      click: vi.fn(),
      remove: vi.fn()
    };
    // @ts-expect-error - mock anchor
    createElementSpy.mockReturnValue(mockAnchor);
    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null);

    await store.handleExportLibrary();
    expect(mockAnchor.setAttribute).toHaveBeenCalledWith('href', expect.stringContaining('data:text/json'));
    
    createElementSpy.mockRestore();
    appendSpy.mockRestore();
  });

  it('handleImportLibrary works', () => {
    const store = useAppStore.getState();
    store.handleImportLibrary({
      target: {
        files: [new File(["[{ \"id\": \"import\", \"title\": \"imp\", \"memory\": {} }]"], "test.json", { type: "application/json" })]
      }
    });

    store.handleImportLibrary({ target: { files: [] } }); // No files
  });

  it('initStorage works with no user', async () => {
    const store = useAppStore.getState();
    vi.mocked(storyStorage.getStories).mockResolvedValue([]);
    vi.spyOn(demoStories, 'getRandomDemoStory').mockReturnValue({ id: 'demo' } as any);
    
    await store.initStorage();
    expect(useAppStore.getState().stories).toHaveLength(0);
  });

  it('initStorage works with user', async () => {
    const store = useAppStore.getState();
    // mock user
    auth.currentUser = { uid: 'user1' };
    vi.mocked(storyStorage.getStories).mockResolvedValue([
      { id: 'demo-matrix-test', isEdited: true, currentChapterNumber: 2, arcs: [], memory: {} } as any
    ]);
    
    await store.initStorage();
    // Should migrate test demo
    expect(storyStorage.deleteStory).toHaveBeenCalledWith('demo-matrix-test');
  });

  it('does not republish an old account library when demo migration finishes after auth changes', async () => {
    let rejectDelete!: (error: Error) => void;
    vi.mocked(storyStorage.deleteStory).mockReturnValueOnce(
      new Promise<any>((_resolve, reject) => {
        rejectDelete = reject;
      }),
    );
    const privateAStory = {
      id: 'private-a-story',
      userId: 'account-a',
      title: 'Private A',
      arcs: [],
      memory: {},
    } as any;
    vi.mocked(storyStorage.getStories).mockResolvedValue([
      privateAStory,
      {
        id: 'demo-matrix-legacy',
        isEdited: true,
        currentChapterNumber: 2,
        arcs: [],
        memory: {},
      } as any,
    ]);
    (auth as any).currentUser = { uid: 'account-a' };

    const initialization = useAppStore.getState().initStorage();
    await vi.waitFor(() => expect(storyStorage.deleteStory).toHaveBeenCalled());
    (auth as any).currentUser = { uid: 'account-b' };
    useAppStore.getState().setStories([]);
    rejectDelete(new Error('old account migration cancelled'));
    await initialization;

    expect(useAppStore.getState().stories).toEqual([]);
    expect(storyStorage.rollbackTransaction).toHaveBeenCalled();
  });

  it('migrateOrDiscardDemoStories works', async () => {
    const store = useAppStore.getState();
    store.setStories([
      { id: 'demo-matrix-discard', isEdited: false, currentChapterNumber: 1, arcs: [], memory: {} } as any
    ]);
    
    await store.migrateOrDiscardDemoStories({ uid: 'user2' } as any);
    expect(storyStorage.deleteStory).toHaveBeenCalledWith('demo-matrix-discard');
  });

  it('resolves a cloud conflict and refreshes stories after syncing', async () => {
    const localStory = { id: 'conflict', title: 'Local', arcs: [], memory: {} } as any;
    const cloudStory = { id: 'conflict', title: 'Cloud', arcs: [], memory: {} } as any;
    const refreshed = [{ ...cloudStory, title: 'Cloud refreshed' }] as any;
    vi.mocked(storyStorage.getStories).mockResolvedValue(refreshed);
    useAppStore.getState().setActiveConflict({
      storyId: 'conflict',
      localStory,
      cloudStory,
    });

    await useAppStore.getState().resolveConflict('cloud');

    expect(storyStorage.saveStory).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'conflict', title: 'Cloud', conflictResolvedAt: expect.any(String) }),
    );
    expect(storyStorage.performSync).toHaveBeenCalled();
    expect(useAppStore.getState().stories).toEqual(refreshed);
    expect(useAppStore.getState().activeConflict).toBeNull();
  });

  it('stamps a chosen local story beyond a future-skewed cloud revision', async () => {
    const localStory = {
      id: 'future-conflict',
      title: 'Chosen local',
      updatedAt: '2026-07-13T12:00:00.000Z',
      arcs: [],
      memory: {},
    } as any;
    const cloudStory = {
      ...localStory,
      title: 'Future cloud clock',
      updatedAt: '2099-07-13T12:00:00.000Z',
    };
    useAppStore.getState().setActiveConflict({
      storyId: localStory.id,
      localStory,
      cloudStory,
    });

    await useAppStore.getState().resolveConflict('local');

    const saved = vi.mocked(storyStorage.saveStory).mock.calls[0][0] as any;
    expect(new Date(saved.updatedAt).getTime()).toBeGreaterThan(
      new Date(cloudStory.updatedAt).getTime(),
    );
    expect(saved.conflictResolvedAt).toBe(saved.updatedAt);
    expect(saved.title).toBe('Chosen local');
  });

  it('resolves a chapter-body conflict without silently merging prose', async () => {
    const story = {
      id: 'chapter-conflict',
      title: 'Shared story',
      arcs: [],
      memory: {},
    } as any;
    const cloudContent = {
      storyId: story.id,
      chapterNumber: 4,
      generatedContent: 'Cloud prose selected by the reader.',
      updatedAt: '2026-07-13T12:00:00.000Z',
      syncRevision: 'cloud-revision',
    };
    vi.mocked(storyStorage.getStories).mockResolvedValue([story]);
    useAppStore.getState().setActiveConflict({
      storyId: story.id,
      localStory: story,
      cloudStory: story,
      chapterConflict: {
        chapterNumber: 4,
        localContent: {
          ...cloudContent,
          generatedContent: 'Local prose.',
          syncRevision: 'local-revision',
        },
        cloudContent,
      },
    });

    await useAppStore.getState().resolveConflict('cloud');

    expect(storyStorage.saveChapterContent).toHaveBeenCalledWith(
      expect.objectContaining({
        storyId: story.id,
        chapterNumber: 4,
        generatedContent: 'Cloud prose selected by the reader.',
        updatedAt: expect.any(String),
      }),
    );
    expect(storyStorage.saveStory).not.toHaveBeenCalled();
    expect(storyStorage.performSync).toHaveBeenCalled();
    expect(useAppStore.getState().activeConflict).toBeNull();
  });

  it('stamps chosen local chapter prose beyond a future-skewed cloud revision', async () => {
    const story = {
      id: 'future-chapter-conflict',
      title: 'Shared story',
      arcs: [],
      memory: {},
    } as any;
    const localContent = {
      storyId: story.id,
      chapterNumber: 2,
      generatedContent: 'Chosen local prose',
      updatedAt: '2026-07-13T12:00:00.000Z',
    };
    const cloudContent = {
      ...localContent,
      generatedContent: 'Future cloud prose',
      updatedAt: '2099-07-13T12:00:00.000Z',
    };
    useAppStore.getState().setActiveConflict({
      storyId: story.id,
      localStory: story,
      cloudStory: story,
      chapterConflict: {
        chapterNumber: 2,
        localContent,
        cloudContent,
      },
    });

    await useAppStore.getState().resolveConflict('local');

    const saved = vi.mocked(storyStorage.saveChapterContent).mock.calls[0][0] as any;
    expect(new Date(saved.updatedAt).getTime()).toBeGreaterThan(
      new Date(cloudContent.updatedAt).getTime(),
    );
    expect(saved.generatedContent).toBe('Chosen local prose');
  });

  it('keeps a conflict available for retry when resolution persistence fails', async () => {
    const conflict = {
      storyId: 'conflict',
      localStory: { id: 'conflict', title: 'Local', arcs: [], memory: {} } as any,
      cloudStory: { id: 'conflict', title: 'Cloud', arcs: [], memory: {} } as any,
    };
    vi.mocked(storyStorage.saveStory).mockRejectedValueOnce(new Error('disk unavailable'));
    useAppStore.getState().setActiveConflict(conflict);

    await useAppStore.getState().resolveConflict('local');

    expect(useAppStore.getState().activeConflict).toEqual(conflict);
    expect(useAppStore.getState().appError).toBe(
      'Failed to resolve sync conflict: disk unavailable',
    );
    expect(storyStorage.performSync).not.toHaveBeenCalled();
  });

  it('does not reopen a resolved conflict when the library refresh fails', async () => {
    const conflict = {
      storyId: 'conflict',
      localStory: { id: 'conflict', title: 'Local', arcs: [], memory: {} } as any,
      cloudStory: { id: 'conflict', title: 'Cloud', arcs: [], memory: {} } as any,
    };
    vi.mocked(storyStorage.getStories).mockRejectedValueOnce(new Error('read unavailable'));
    useAppStore.getState().setActiveConflict(conflict);

    await useAppStore.getState().resolveConflict('cloud');

    expect(storyStorage.saveStory).toHaveBeenCalled();
    expect(storyStorage.performSync).toHaveBeenCalled();
    expect(useAppStore.getState().activeConflict).toBeNull();
    expect(useAppStore.getState().appError).toBe(
      'Sync conflict resolved, but failed to refresh stories: read unavailable',
    );
  });

  it('does not restore an old account conflict after its persistence fails', async () => {
    let rejectSave!: (error: Error) => void;
    vi.mocked(storyStorage.saveStory).mockReturnValueOnce(
      new Promise<void>((_resolve, reject) => {
        rejectSave = reject;
      }),
    );
    const conflict = {
      storyId: 'account-a-conflict',
      localStory: {
        id: 'account-a-conflict',
        userId: 'account-a',
        title: 'Private local A',
        arcs: [],
        memory: {},
      } as any,
      cloudStory: {
        id: 'account-a-conflict',
        userId: 'account-a',
        title: 'Private cloud A',
        arcs: [],
        memory: {},
      } as any,
    };
    (auth as any).currentUser = { uid: 'account-a' };
    useAppStore.getState().setActiveConflict(conflict);

    const resolving = useAppStore.getState().resolveConflict('local');
    await vi.waitFor(() => expect(storyStorage.saveStory).toHaveBeenCalledOnce());
    (auth as any).currentUser = { uid: 'account-b' };
    useAppStore.getState().setActiveConflict(null);
    rejectSave(new Error('old account write cancelled'));
    await resolving;

    expect(useAppStore.getState().activeConflict).toBeNull();
    expect(useAppStore.getState().appError).toBeNull();
  });

  it('ignores a conflict owned by a different active account', () => {
    (auth as any).currentUser = { uid: 'account-b' };

    useAppStore.getState().setActiveConflict({
      storyId: 'account-a-conflict',
      localStory: {
        id: 'account-a-conflict',
        userId: 'account-a',
        title: 'Private A',
        arcs: [],
        memory: {},
      } as any,
      cloudStory: {
        id: 'account-a-conflict',
        userId: 'account-a',
        title: 'Private cloud A',
        arcs: [],
        memory: {},
      } as any,
    });

    expect(useAppStore.getState().activeConflict).toBeNull();
  });

  it('does not publish an old account library after conflict refresh completes', async () => {
    let releaseStories!: (stories: any[]) => void;
    vi.mocked(storyStorage.getStories).mockReturnValueOnce(
      new Promise<any[]>((resolve) => {
        releaseStories = resolve;
      }),
    );
    const conflict = {
      storyId: 'account-a-conflict',
      localStory: {
        id: 'account-a-conflict',
        userId: 'account-a',
        title: 'Private local A',
        arcs: [],
        memory: {},
      } as any,
      cloudStory: {
        id: 'account-a-conflict',
        userId: 'account-a',
        title: 'Private cloud A',
        arcs: [],
        memory: {},
      } as any,
    };
    (auth as any).currentUser = { uid: 'account-a' };
    useAppStore.getState().setActiveConflict(conflict);

    const resolving = useAppStore.getState().resolveConflict('cloud');
    await vi.waitFor(() => expect(storyStorage.getStories).toHaveBeenCalledOnce());
    (auth as any).currentUser = { uid: 'account-b' };
    useAppStore.getState().setStories([]);
    releaseStories([{ ...conflict.cloudStory, title: 'Stale A refresh' }]);
    await resolving;

    expect(useAppStore.getState().stories).toEqual([]);
    expect(useAppStore.getState().appError).toBeNull();
  });
});

