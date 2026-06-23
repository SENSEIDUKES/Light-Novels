import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStoryEngine } from './useStoryEngine';
import { useAppStore } from '../store/useAppStore';
import { storyStorage } from '../lib/storage';

vi.mock('../lib/storage', () => {
   return {
     storyStorage: {
       getChapterContent: vi.fn(),
       saveChapterContent: vi.fn(),
       getStories: vi.fn().mockImplementation(async () => {
         const { useAppStore } = await import('../store/useAppStore');
         return useAppStore.getState().stories;
       }),
       deleteStory: vi.fn(),
       saveStory: vi.fn(),
       startTransaction: vi.fn(),
       commitTransaction: vi.fn().mockResolvedValue(true),
       rollbackTransaction: vi.fn()
     }
   }
});

describe('useStoryEngine Scenarios', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    useAppStore.setState({
      activeStoryId: 'test_story',
      stories: [{
        id: 'test_story',
        title: 'Story 1',
        genre: 'Sci-Fi',
        mcName: 'Alex',
        customPremise: 'Test',
        memory: {},
        currentChapterNumber: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        arcs: [
          {
            title: 'Arc 1',
            isCompleted: false,
            chapters: [
              { number: 1, title: 'C1', premise: 'P1', status: 'unread' },
              { number: 2, title: 'C2', premise: 'P2', status: 'unread' },
              { number: 3, title: 'C3', premise: 'P3', status: 'unread' }
            ]
          }
        ]
      }] as any[]
    });
  });

  describe('Seal chapter lifecycle (handleToggleRead)', () => {
    it('should swap chapter read state between read and unread', async () => {
      const { result } = renderHook(() => useStoryEngine());
      await act(async () => {
        await result.current.handleToggleRead(1);
      });
      
      let state = useAppStore.getState();
      expect(state.stories[0].arcs[0].chapters[0].status).toBe('read');
      expect(state.stories[0].arcs[0].chapters[1].status).toBe('unread');
      
      await act(async () => {
        await result.current.handleToggleRead(1);
      });
      state = useAppStore.getState();
      // Swapped back
      expect(state.stories[0].arcs[0].chapters[0].status).toBe('unread');
    });
  });

  describe('Forking at chapter N (handleAlterFate)', () => {
    it('should slice arcs cleanly at chapter N, spawn a new story, and trigger steering', async () => {
      vi.mocked(storyStorage.getStories).mockImplementation(async () => useAppStore.getState().stories);
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          title: 'Arc 2 Forked',
          chapters: [{ number: 3, title: 'Fork C3', premise: 'Fork P3' }],
          newCharacters: [],
          newUnresolvedPlotThreads: []
        })
      } as Response);

      const { result } = renderHook(() => useStoryEngine());
      
      await act(async () => {
        // Fork at chapter 2. Chapter 3 should be sliced off.
        await result.current.handleAlterFate(2, 'Turn evil', 'Kill everyone');
      });

      const state = useAppStore.getState();
      // Should have created a new story at the top of the array
      expect(state.stories.length).toBe(2);
      const newStory = state.stories[0];
      
      expect(newStory.parentStoryId).toBe('test_story');
      expect(newStory.title).toContain('[Fate Fork]');
      expect(newStory.forkChapterNumber).toBe(2);

      // It should have the original arc 1, but truncated down to 2 chapters
      expect(newStory.arcs[0].chapters.length).toBe(2);
      expect(newStory.arcs[0].chapters[1].number).toBe(2);
      
      // It should have appended the newly generated arc from the steering API
      expect(newStory.arcs.length).toBe(2);
      expect(newStory.arcs[1].title).toBe('Arc 2 Forked');
      expect(newStory.arcs[1].chapters[0].title).toBe('Fork C3');
      
      // We should be focused on the new story
      expect(state.activeStoryId).toBe(newStory.id);
    });
  });

  describe('Multi-arc navigation (handleSteerArc)', () => {
    it('should append a new arc to the existing story without spawning a new one', async () => {
      vi.mocked(storyStorage.getStories).mockImplementation(async () => useAppStore.getState().stories);
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          title: 'Arc 2 Direct',
          chapters: [{ number: 4, title: 'Direct C4', premise: 'Direct P4' }],
          newCharacters: [],
          newUnresolvedPlotThreads: []
        })
      } as Response);

      const { result } = renderHook(() => useStoryEngine());
      
      await act(async () => {
        // Just steer naturally
        await result.current.handleSteerArc('Go to space', '');
      });

      const state = useAppStore.getState();
      // Did NOT spawn a new story
      expect(state.stories.length).toBe(1);
      const story = state.stories[0];
      
      expect(story.arcs.length).toBe(2);
      expect(story.arcs[0].chapters.length).toBe(3); // untouched original
      expect(story.arcs[1].title).toBe('Arc 2 Direct');
      expect(story.arcs[1].chapters[0].title).toBe('Direct C4');
    });
  });
});
