import { describe, it, expect, vi } from 'vitest';
import { useAppStore } from './useAppStore';
import { storyStorage } from '../lib/storage';

describe('useStoryStore handleExportLibrary performance pattern', () => {
  it('should batch chapter hydration at 10 concurrent reads and export the hydrated content', async () => {
    const createElementSpy = vi.spyOn(document, 'createElement');
    const mockAnchor = {
      setAttribute: vi.fn(),
      click: vi.fn(),
      remove: vi.fn()
    };
    createElementSpy.mockReturnValue(mockAnchor as any);
    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);

    // Track active promises to verify the batch boundary.
    let activeFetches = 0;
    let maxConcurrentFetches = 0;

    const contentSpy = vi.spyOn(storyStorage, 'getChapterContent').mockImplementation(async (storyId, chapterNumber) => {
      activeFetches++;
      if (activeFetches > maxConcurrentFetches) {
        maxConcurrentFetches = activeFetches;
      }

      // Artificial delay lets all reads in a batch start before any resolve.
      await new Promise(r => setTimeout(r, 10));

      activeFetches--;
      return {
        storyId,
        chapterNumber,
        generatedContent: `Hydrated ${storyId}-${chapterNumber}`,
      } as any;
    });

    useAppStore.setState({
      stories: [
        {
          id: 'story1',
          title: 'Story 1',
          arcs: [
            {
              chapters: Array.from({ length: 11 }, (_, index) => ({
                number: index + 1,
                hasContent: true,
                generatedContent: '',
              }))
            }
          ]
        }
      ]
    } as any);

    await useAppStore.getState().handleExportLibrary();

    expect(contentSpy).toHaveBeenCalledTimes(11);
    expect(maxConcurrentFetches).toBe(10);

    const hrefCall = mockAnchor.setAttribute.mock.calls.find(([name]) => name === 'href');
    expect(hrefCall).toBeTruthy();
    const dataUrl = hrefCall?.[1] as string;
    const exported = JSON.parse(
      decodeURIComponent(dataUrl.replace('data:text/json;charset=utf-8,', '')),
    );
    expect(exported[0].arcs[0].chapters[0].generatedContent).toBe('Hydrated story1-1');
    expect(exported[0].arcs[0].chapters[10].generatedContent).toBe('Hydrated story1-11');

    contentSpy.mockRestore();
    createElementSpy.mockRestore();
    appendSpy.mockRestore();
  });
});
