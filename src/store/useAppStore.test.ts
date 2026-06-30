import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from './useAppStore';
import { storyStorage } from '../lib/storage';
import { secureStorage } from '../lib/encryption';
import { auth } from '../lib/firebase';
import * as demoStories from './demoStories';

vi.mock('../lib/storage', () => ({
  storyStorage: {
    init: vi.fn(),
    getActiveAdapterName: vi.fn(),
    getStories: vi.fn(),
    saveStory: vi.fn(),
    deleteStory: vi.fn().mockResolvedValue(true),
    getChapterContent: vi.fn(),
    saveChapterContent: vi.fn(),
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
  auth: { currentUser: null, onAuthStateChanged: vi.fn() }
}));

describe('useAppStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset Zustand store state before each test
    const { setStories, setActiveStoryId, setCurrentScreen, setStoryToDelete } = useAppStore.getState();
    setStories([]);
    setActiveStoryId(null);
    setCurrentScreen('home');
    setStoryToDelete(null);
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

  it('migrateOrDiscardDemoStories works', async () => {
    const store = useAppStore.getState();
    store.setStories([
      { id: 'demo-matrix-discard', isEdited: false, currentChapterNumber: 1, arcs: [], memory: {} } as any
    ]);
    
    await store.migrateOrDiscardDemoStories({ uid: 'user2' } as any);
    expect(storyStorage.deleteStory).toHaveBeenCalledWith('demo-matrix-discard');
  });
});

