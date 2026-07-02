import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PersistentStorageManager, IndexedDBStorageAdapter, LocalStorageFallbackAdapter } from './storage';
import { StoryWorld, ChapterContent } from '../types';

describe('PersistentStorageManager', () => {
  let manager: PersistentStorageManager;

  beforeEach(() => {
    localStorage.clear();
    manager = new PersistentStorageManager();
    (manager as any).isCloudAvailable = false;
  });

  describe('Storage Adapter Selection & IndexedDB Fallback', () => {
    it('should fallback to LocalStorage if IndexedDB fails to initialize', async () => {
      const originalIndexedDB = window.indexedDB;
      Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true });

      await manager.init();
      
      const adapterName = manager.getActiveAdapterName();
      expect(adapterName).toContain('LocalStorage');

      if (originalIndexedDB) {
        Object.defineProperty(window, 'indexedDB', { value: originalIndexedDB, configurable: true });
      }
    });
  });

  describe('Chapter content split storage', () => {
    it('should split generated content out of the main story object to save space', async () => {
      await manager.init();

      const story: StoryWorld = {
        id: 'story_split_test',
        title: 'Test Split',
        genre: 'Fantasy',
        mcName: 'MC',
        customPremise: 'P',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currentChapterNumber: 1,
        memory: { powerSystem: '', characters: [], currentPowerStage: '', worldRules: [], unresolvedPlotThreads: [], resolvedPlotThreads: [] },
        arcs: [
          {
            title: 'Arc 1',
            isCompleted: false,
            chapters: [
              {
                number: 1,
                title: 'Chapter 1',
                premise: 'Premise',
                status: 'unread',
                generatedContent: 'Heavens opened!',
                summary: 'Start',
                _isNewContent: true,
              }
            ]
          }
        ]
      };

      await manager.saveStory(story);

      // Verify the story doesn't have generatedContent in the local list
      const savedStory = await manager.getStory('story_split_test');
      expect(savedStory).toBeDefined();
      expect(savedStory?.arcs[0].chapters[0].generatedContent).toBeUndefined();
      expect(savedStory?.arcs[0].chapters[0].hasContent).toBe(true);
      
      // Verify chapter content is stored separately
      const chapterContent = await manager.getChapterContent('story_split_test', 1);
      expect(chapterContent).toBeDefined();
      expect(chapterContent?.generatedContent).toBe('Heavens opened!');
    });
  });

  describe('Cloud write coalescing & circuit breaker', () => {
    const makeStory = (id: string): StoryWorld => ({
      id, title: 'T', genre: 'Fantasy', mcName: 'MC', customPremise: 'P',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      currentChapterNumber: 1,
      memory: { powerSystem: '', characters: [], currentPowerStage: '', worldRules: [], unresolvedPlotThreads: [], resolvedPlotThreads: [] },
      arcs: [],
    });

    it('coalesces a burst of saves for the same story into a single cloud write', async () => {
      vi.useFakeTimers();
      try {
        const cloudAdapter = (manager as any).cloudAdapter;
        cloudAdapter.saveStory = vi.fn().mockResolvedValue(undefined);
        (manager as any).isCloudAvailable = true;

        // Three rapid saves within the debounce window.
        await manager.saveStory(makeStory('burst_story'));
        await manager.saveStory(makeStory('burst_story'));
        await manager.saveStory(makeStory('burst_story'));

        // Nothing flushed immediately.
        expect(cloudAdapter.saveStory).not.toHaveBeenCalled();

        // After the debounce window, exactly one coalesced cloud write happens.
        await vi.advanceTimersByTimeAsync((manager as any).FLUSH_DEBOUNCE_MS + 10);
        expect(cloudAdapter.saveStory).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('stops writing to the cloud once the daily budget is exceeded', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const cap = (manager as any).DAILY_WRITE_CAP;
      localStorage.setItem('@seihouse/cloud-write-count', JSON.stringify({ date: today, count: cap }));

      const cloudAdapter = (manager as any).cloudAdapter;
      cloudAdapter.saveStory = vi.fn().mockResolvedValue(undefined);
      (manager as any).isCloudAvailable = true;

      await manager.saveStory(makeStory('over_budget'));
      await (manager as any).flushSyncQueue();

      // Circuit breaker blocked the write; counter did not increase past the cap.
      expect(cloudAdapter.saveStory).not.toHaveBeenCalled();
      expect(manager.getCloudWritesToday()).toBe(cap);
      // Task remains queued so it can sync once the budget resets.
      expect((manager as any).syncQueue.length).toBeGreaterThan(0);
    });
  });

  describe('Firestore sync conflicts', () => {
    it('should set an active conflict and skip sync when significant differences exist', async () => {
      const localAdapter = (manager as any).localAdapter;
      const cloudAdapter = (manager as any).cloudAdapter;

      // Mock cloud adapter methods
      cloudAdapter.getStories = vi.fn();
      cloudAdapter.saveStory = vi.fn();

      // We make cloud available
      (manager as any).isCloudAvailable = true;

      // Conflict Scenario:
      // Local is older than Cloud by > 5 minutes
      const oldTime = Date.now() - 1000 * 60 * 10;
      const newTime = Date.now();

      const localStory: StoryWorld = {
        id: 'conflict_story', title: 'Local Version', genre: '', mcName: '', customPremise: '', createdAt: '', 
        updatedAt: new Date(oldTime).toISOString(), currentChapterNumber: 1, 
        memory: { powerSystem: '', characters: [], currentPowerStage: '', worldRules: [], unresolvedPlotThreads: [], resolvedPlotThreads: [] }, 
        arcs: []
      };

      const cloudStory: StoryWorld = {
        id: 'conflict_story', title: 'Cloud Version', genre: '', mcName: '', customPremise: '', createdAt: '', 
        updatedAt: new Date(newTime).toISOString(), currentChapterNumber: 1, 
        memory: { powerSystem: '', characters: [], currentPowerStage: '', worldRules: [], unresolvedPlotThreads: [], resolvedPlotThreads: [] }, 
        arcs: []
      };

      await localAdapter.saveStory(localStory);
      cloudAdapter.getStories.mockResolvedValue([cloudStory]);

      // Conflicts are dispatched through the registered handler (the app
      // wires this up in initStorage), not by importing the store directly.
      const onConflict = vi.fn();
      manager.onConflict(onConflict);

      await manager.performSync();

      const localStories = await localAdapter.getStories();
      expect(localStories.length).toBe(1);
      expect(localStories[0].title).toBe('Local Version');

      expect(onConflict).toHaveBeenCalledTimes(1);
      const conflict = onConflict.mock.calls[0][0];
      expect(conflict).toBeDefined();
      expect(conflict?.storyId).toBe('conflict_story');
      expect(conflict?.localStory.title).toBe('Local Version');
      expect(conflict?.cloudStory.title).toBe('Cloud Version');
    });
  });
});
