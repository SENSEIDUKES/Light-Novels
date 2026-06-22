import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PersistentStorageManager } from './storage';
import { StoryWorld, ChapterContent } from '../types';

describe('PersistentStorageManager', () => {
  let manager: PersistentStorageManager;

  beforeEach(() => {
    // Need to reset local storage manually
    localStorage.clear();
    manager = new PersistentStorageManager();
    // Force local storage adapter
    (manager as any).isCloudAvailable = false;
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
    it('should handle timestamp-based conflict resolution correctly', async () => {
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

      // Cloud was newer by > 5 min, so Local Version should be duplicated as a conflict copy
      // and cloud version replaces the old local version.
      const localStories = await localAdapter.getStories();
      expect(localStories.length).toBe(2);

      const resolvedMain = localStories.find((s: StoryWorld) => s.id === 'conflict_story');
      expect(resolvedMain?.title).toBe('Cloud Version');

      const conflictBackup = localStories.find((s: StoryWorld) => s.id.includes('conflict_story-conflict-'));
      expect(conflictBackup).toBeDefined();
      expect(conflictBackup?.title).toContain('Local Conflict Copied');
      
      // Also the backup should be saved to the cloud
      expect(cloudAdapter.saveStory).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringContaining('Local Version (Local Conflict Copied)') }));
    });
  });
});
