import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openPublishedWorld } from './LibraryScreen';
import { useAppStore } from '../store/useAppStore';
import { storyStorage } from '../lib/storage';
import { auth } from '../lib/firebase';

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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('openPublishedWorld', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).currentUser = { uid: 'reader-1' };
    useAppStore.getState().setStories([]);
    useAppStore.getState().setActiveStoryId(null);
    useAppStore.getState().setAppError(null);
    vi.mocked(storyStorage.saveStory).mockResolvedValue(undefined);
    vi.mocked(storyStorage.getStories).mockResolvedValue([]);
  });

  const mockedLibraryCard = () => ({
    id: 'demo-matrix-1',
    title: 'The Ascendant Path',
    genre: 'Cultivation',
    mcName: 'Lu Feng',
    customPremise: 'A test premise',
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
    currentChapterNumber: 1,
    arcs: [{ title: 'Arc 1', chapters: [{ number: 1, status: 'unread' }] }],
    memory: { characters: [], currentPowerStage: 'Foundation' },
    // Mocked Library-card display fields layered on by PUBLISHED_WORLDS —
    // must never reach the persisted story record.
    reads: 8920,
    chapterCount: 1,
    powerStage: 'Foundation',
  });

  it('creates a durable story with a canonical persistenceId when a default Library story is opened', async () => {
    const setActiveStoryId = vi.fn();
    const setCurrentScreen = vi.fn();

    await openPublishedWorld(mockedLibraryCard(), setActiveStoryId, setCurrentScreen);

    expect(storyStorage.saveStory).toHaveBeenCalledTimes(1);
    const savedStory = vi.mocked(storyStorage.saveStory).mock.calls[0][0] as any;
    expect(savedStory.persistenceId).toBeDefined();
    expect(savedStory.persistenceId).toMatch(UUID_PATTERN);

    const storedStory = useAppStore.getState().stories.find(s => s.id === 'demo-matrix-1-reader-1');
    expect(storedStory).toBeDefined();
    expect(storedStory?.persistenceId).toMatch(UUID_PATTERN);

    expect(setActiveStoryId).toHaveBeenCalledWith('demo-matrix-1-reader-1');
    expect(setCurrentScreen).toHaveBeenCalledWith('detail');
  });

  it('strips mocked Library-card display fields and stamps a real updatedAt before persisting', async () => {
    const before = Date.now();
    await openPublishedWorld(mockedLibraryCard(), vi.fn(), vi.fn());
    const after = Date.now();

    const savedStory = vi.mocked(storyStorage.saveStory).mock.calls[0][0] as any;
    expect(savedStory).not.toHaveProperty('reads');
    expect(savedStory).not.toHaveProperty('chapterCount');
    expect(savedStory).not.toHaveProperty('powerStage');

    const savedUpdatedAt = new Date(savedStory.updatedAt).getTime();
    expect(savedUpdatedAt).toBeGreaterThanOrEqual(before);
    expect(savedUpdatedAt).toBeLessThanOrEqual(after);
    // The original mocked createdAt/updatedAt from the demo template must
    // not silently survive as the "real" updatedAt.
    expect(savedStory.updatedAt).not.toBe('2020-01-01T00:00:00.000Z');
  });

  it('does not re-save or duplicate an already-owned default Library story', async () => {
    const world = mockedLibraryCard();
    const setActiveStoryId = vi.fn();
    const setCurrentScreen = vi.fn();

    await openPublishedWorld(world, setActiveStoryId, setCurrentScreen);
    vi.mocked(storyStorage.saveStory).mockClear();

    await openPublishedWorld(world, setActiveStoryId, setCurrentScreen);

    expect(storyStorage.saveStory).not.toHaveBeenCalled();
    expect(useAppStore.getState().stories).toHaveLength(1);
    expect(setActiveStoryId).toHaveBeenLastCalledWith('demo-matrix-1-reader-1');
    expect(setCurrentScreen).toHaveBeenLastCalledWith('detail');
  });

  it('does not attempt a durable save for a signed-out selection', async () => {
    (auth as any).currentUser = null;
    const setActiveStoryId = vi.fn();
    const setCurrentScreen = vi.fn();

    await openPublishedWorld(mockedLibraryCard(), setActiveStoryId, setCurrentScreen);

    // No account to attribute an owner-scoped durable record to; this must
    // stay an in-memory-only selection rather than attempt a save that
    // would otherwise persist a story with no owner.
    expect(storyStorage.saveStory).not.toHaveBeenCalled();
    const storedStory = useAppStore.getState().stories.find(s => s.id === 'demo-matrix-1');
    expect(storedStory).toBeDefined();
    expect(storedStory).not.toHaveProperty('userId');
    expect(setActiveStoryId).toHaveBeenCalledWith('demo-matrix-1');
    expect(setCurrentScreen).toHaveBeenCalledWith('detail');
  });
});
