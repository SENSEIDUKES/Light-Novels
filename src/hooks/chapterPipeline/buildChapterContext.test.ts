import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Story } from '../../types';
import { CONTEXT_CHAR_LIMITS, retrieveRelevantContext } from '../../lib/rag';
import { storyStorage } from '../../lib/storage';
import { buildChapterContext } from './buildChapterContext';

vi.mock('../../lib/rag', () => ({
  CONTEXT_CHAR_LIMITS: { v1: 120000, v2: 60000 },
  retrieveRelevantContext: vi.fn(),
}));

vi.mock('../../lib/storage', () => ({
  storyStorage: {
    getChapterContent: vi.fn(),
  },
}));

const makeStory = (contextEngine?: 'v1' | 'v2'): Story => ({
  id: 'story-1',
  title: 'Test Story',
  genre: 'Cultivation',
  mcName: 'Lin',
  customPremise: 'Core premise',
  createdAt: '',
  updatedAt: '',
  currentChapterNumber: 2,
  memory: {
    powerSystem: '',
    currentPowerStage: '',
    worldRules: [],
    characters: [],
    unresolvedPlotThreads: [],
    resolvedPlotThreads: [],
  },
  arcs: [{
    title: 'Arc One',
    isCompleted: false,
    chapters: [
      {
        number: 1,
        title: 'Before',
        premise: 'Before premise',
        status: 'read',
        hasContent: true,
      },
      {
        number: 2,
        title: 'Now',
        premise: 'Target premise',
        status: 'unread',
      },
    ],
  }],
  readerPreferences: contextEngine ? { contextEngine } as any : undefined,
});

describe('buildChapterContext', () => {
  beforeEach(() => {
    vi.mocked(retrieveRelevantContext).mockReset();
    vi.mocked(retrieveRelevantContext).mockImplementation(async () => []);
    vi.mocked(storyStorage.getChapterContent).mockReset();
    vi.mocked(storyStorage.getChapterContent).mockResolvedValue(null);
  });

  it('uses v2 automatically and appends a typed continuation anchor', async () => {
    const story = makeStory();
    const targetChapter = story.arcs[0].chapters[1];
    vi.mocked(storyStorage.getChapterContent).mockResolvedValue({
      storyId: story.id,
      chapterNumber: 1,
      generatedContent: '',
      blocks: Array.from({ length: 5 }, (_, index) => ({
        id: `block-${index + 1}`,
        type: 'narration',
        text: `Final prose ${index + 1}`,
      })),
    });

    const result = await buildChapterContext(story, targetChapter, { Authorization: 'test' });

    expect(retrieveRelevantContext).toHaveBeenCalledWith(
      'Target premise',
      2,
      story,
      { Authorization: 'test' },
      5,
      CONTEXT_CHAR_LIMITS.v2,
      3,
      'v2',
    );
    expect(result.pastSummaries).toEqual([{
      kind: 'anchor',
      chapterNumber: 1,
      text: 'Final prose 2\n\nFinal prose 3\n\nFinal prose 4\n\nFinal prose 5',
    }]);
  });

  it('ignores a stored v1 preference and keeps v2 active', async () => {
    const story = makeStory('v1');
    const targetChapter = story.arcs[0].chapters[1];

    await buildChapterContext(story, targetChapter, {});

    expect(retrieveRelevantContext).toHaveBeenCalledWith(
      'Target premise',
      2,
      story,
      {},
      5,
      CONTEXT_CHAR_LIMITS.v2,
      3,
      'v2',
    );
  });
});
