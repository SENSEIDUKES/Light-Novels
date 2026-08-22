import { describe, it, expect, vi } from 'vitest';
import { useAppStore } from './useAppStore';
import { storyStorage } from '../lib/storage';

describe('useStoryStore handleExportLibrary performance pattern', () => {
  it('should use concurrent promises for chapter content fetches during library export', async () => {
    const createElementSpy = vi.spyOn(document, 'createElement');
    const mockAnchor = {
      setAttribute: vi.fn(),
      click: vi.fn(),
      remove: vi.fn()
    };
    createElementSpy.mockReturnValue(mockAnchor as any);
    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);

    // Track active promises to detect concurrency
    let activeFetches = 0;
    let maxConcurrentFetches = 0;

    const contentSpy = vi.spyOn(storyStorage, 'getChapterContent').mockImplementation(async () => {
      activeFetches++;
      if (activeFetches > maxConcurrentFetches) {
        maxConcurrentFetches = activeFetches;
      }

      // Artificial delay to allow other concurrent fetches to start if they are running in Promise.all
      await new Promise(r => setTimeout(r, 10));

      activeFetches--;
      return {
        storyId: '123',
        chapterNumber: 1,
        generatedContent: 'Hydrated content',
      } as any;
    });

    useAppStore.setState({
      stories: [
        {
          id: 'story1',
          title: 'Story 1',
          arcs: [
            {
              chapters: [
                { number: 1, hasContent: true, generatedContent: '' },
                { number: 2, hasContent: true, generatedContent: '' },
              ]
            }
          ]
        },
        {
          id: 'story2',
          title: 'Story 2',
          arcs: [
            {
              chapters: [
                { number: 1, hasContent: true, generatedContent: '' },
                { number: 2, hasContent: true, generatedContent: '' },
              ]
            }
          ]
        }
      ]
    } as any);

    await useAppStore.getState().handleExportLibrary();

    expect(contentSpy).toHaveBeenCalledTimes(4);
    expect(maxConcurrentFetches).toBeGreaterThan(1);
    expect(maxConcurrentFetches).toBeLessThanOrEqual(10);

    contentSpy.mockRestore();
    createElementSpy.mockRestore();
    appendSpy.mockRestore();
  });
});
