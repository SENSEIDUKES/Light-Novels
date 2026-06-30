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

      await manager.performSync();

      const localStories = await localAdapter.getStories();
      expect(localStories.length).toBe(1);
      expect(localStories[0].title).toBe('Local Version');

      // Wait a tick for the dynamic import to finish
      await new Promise(resolve => setTimeout(resolve, 50));

      const { useAppStore } = await import('../store/useAppStore');
      const conflict = useAppStore.getState().activeConflict;
      
      expect(conflict).toBeDefined();
      expect(conflict?.storyId).toBe('conflict_story');
      expect(conflict?.localStory.title).toBe('Local Version');
      expect(conflict?.cloudStory.title).toBe('Cloud Version');
      
      // Cleanup state
      useAppStore.getState().setActiveConflict(null);
    });
  });
});
