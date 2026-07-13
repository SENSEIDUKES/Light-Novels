import { describe, expect, it, vi } from 'vitest';
import { ChapterContent, Story } from '../types';
import {
  mergeFreshStoriesWithHydratedChapters,
  refreshActiveChapterAfterMetadataSync,
} from './syncStoryRefresh';

const makeStory = (overrides: Partial<Story> = {}): Story => ({
  id: 'story-1',
  title: 'Story',
  genre: 'Fantasy',
  mcName: 'Hero',
  customPremise: 'Premise',
  createdAt: '2026-07-13T00:00:00.000Z',
  updatedAt: '2026-07-13T00:00:00.000Z',
  currentChapterNumber: 1,
  memory: {
    powerSystem: '',
    currentPowerStage: '',
    worldRules: [],
    characters: [],
    unresolvedPlotThreads: [],
    resolvedPlotThreads: [],
  },
  arcs: [{
    title: 'Arc',
    isCompleted: false,
    chapters: [{
      number: 1,
      title: 'Chapter One',
      premise: 'Begin',
      status: 'read',
      hasContent: true,
    }],
  }],
  ...overrides,
});

describe('sync story refresh', () => {
  it('keeps an already hydrated chapter body while accepting fresh metadata', () => {
    const current = makeStory({
      title: 'Old title',
      arcs: [{
        title: 'Arc',
        isCompleted: false,
        chapters: [{
          number: 1,
          title: 'Old chapter title',
          premise: 'Begin',
          status: 'read',
          hasContent: true,
          generatedContent: 'Visible reader prose',
          blocks: [{ id: 'block-1', type: 'narration', text: 'Visible reader prose' }],
        }],
      }],
    });
    const fresh = makeStory({ title: 'Cloud title' });

    const [merged] = mergeFreshStoriesWithHydratedChapters(
      [fresh],
      [current],
      { storyId: 'story-1', chapterNumber: 1 },
    );

    expect(merged.title).toBe('Cloud title');
    expect(merged.arcs[0].chapters[0]).toEqual(expect.objectContaining({
      title: 'Chapter One',
      generatedContent: 'Visible reader prose',
      blocks: [expect.objectContaining({ id: 'block-1' })],
      hasContent: true,
    }));
  });

  it('rehydrates the active selected chapter from split storage after metadata sync', async () => {
    const content: ChapterContent = {
      storyId: 'story-1',
      chapterNumber: 1,
      generatedContent: 'Recovered prose',
      blocks: [{ id: 'block-1', type: 'narration', text: 'Recovered prose' }],
    };
    const loadChapter = vi.fn().mockResolvedValue(content);

    const result = await refreshActiveChapterAfterMetadataSync({
      freshStories: [makeStory()],
      currentStories: [makeStory()],
      activeStoryId: 'story-1',
      selectedChapterNumber: 1,
      loadChapter,
    });

    expect(loadChapter).toHaveBeenCalledWith('story-1', 1);
    expect(result.unavailable).toBe(false);
    expect(result.stories[0].arcs[0].chapters[0]).toEqual(expect.objectContaining({
      generatedContent: 'Recovered prose',
      hasContent: true,
    }));
  });

  it('drops stale hydrated bodies for non-active chapters during a sync refresh', async () => {
    const twoChapterStory = (firstBody?: string, secondBody?: string) => makeStory({
      currentChapterNumber: 2,
      arcs: [{
        title: 'Arc',
        isCompleted: false,
        chapters: [
          {
            number: 1,
            title: 'Chapter One',
            premise: 'Begin',
            status: 'read',
            hasContent: true,
            generatedContent: firstBody,
          },
          {
            number: 2,
            title: 'Chapter Two',
            premise: 'Continue',
            status: 'read',
            hasContent: true,
            generatedContent: secondBody,
          },
        ],
      }],
    });
    const fresh = twoChapterStory();
    const current = twoChapterStory('Stale chapter one', 'Visible chapter two');

    const result = await refreshActiveChapterAfterMetadataSync({
      freshStories: [fresh],
      currentStories: [current],
      activeStoryId: 'story-1',
      selectedChapterNumber: 2,
      loadChapter: vi.fn().mockResolvedValue({
        storyId: 'story-1',
        chapterNumber: 2,
        generatedContent: 'Current chapter two from storage',
      }),
    });

    expect(result.stories[0].arcs[0].chapters[0].generatedContent).toBeUndefined();
    expect(result.stories[0].arcs[0].chapters[1].generatedContent).toBe(
      'Current chapter two from storage',
    );
  });

  it('reports unavailable content without clearing hasContent or hydrated metadata', async () => {
    const result = await refreshActiveChapterAfterMetadataSync({
      freshStories: [makeStory()],
      currentStories: [makeStory()],
      activeStoryId: 'story-1',
      selectedChapterNumber: 1,
      loadChapter: vi.fn().mockResolvedValue(null),
    });

    expect(result.unavailable).toBe(true);
    expect(result.loadFailed).toBe(false);
    expect(result.stories[0].arcs[0].chapters[0].hasContent).toBe(true);
    expect(result.stories[0].arcs[0].chapters[0].generatedContent).toBeUndefined();
  });

  it('keeps chapter metadata intact when the active chapter refresh throws', async () => {
    const result = await refreshActiveChapterAfterMetadataSync({
      freshStories: [makeStory()],
      currentStories: [makeStory()],
      activeStoryId: 'story-1',
      selectedChapterNumber: 1,
      loadChapter: vi.fn().mockRejectedValue(new Error('IndexedDB unavailable')),
    });

    expect(result.loadFailed).toBe(true);
    expect(result.unavailable).toBe(false);
    expect(result.stories[0].arcs[0].chapters[0].hasContent).toBe(true);
  });
});
