import { Chapter, ChapterContent, Story } from '../types';

const hasRenderableChapterBody = (chapter: Pick<Chapter, 'generatedContent' | 'blocks'>): boolean =>
  Boolean(chapter.generatedContent || (chapter.blocks && chapter.blocks.length > 0));

const hydratedChapterFields = (chapter: Chapter): Partial<Chapter> => {
  if (!hasRenderableChapterBody(chapter)) return {};

  const hydrated: Partial<Chapter> = {};
  if (chapter.generatedContent !== undefined) hydrated.generatedContent = chapter.generatedContent;
  if (chapter.blocks !== undefined) hydrated.blocks = chapter.blocks;
  if (chapter.statsChangeMessage !== undefined) hydrated.statsChangeMessage = chapter.statsChangeMessage;
  if (chapter.cuePayload !== undefined) hydrated.cuePayload = chapter.cuePayload;
  if (chapter.contextManifest !== undefined) hydrated.contextManifest = chapter.contextManifest;
  return hydrated;
};

/**
 * Story metadata is persisted separately from chapter bodies. A storage refresh must not
 * replace an already-hydrated reader chapter with the stripped metadata copy.
 */
export const mergeFreshStoriesWithHydratedChapters = (
  freshStories: Story[],
  currentStories: Story[],
  preserve?: { storyId: string; chapterNumber: number },
): Story[] => {
  const currentByStoryId = new Map(currentStories.map((story) => [story.id, story]));

  return freshStories.map((freshStory) => {
    if (!preserve || freshStory.id !== preserve.storyId) return freshStory;
    const currentStory = currentByStoryId.get(freshStory.id);
    if (!currentStory) return freshStory;

    const currentChapters = new Map<number, Chapter>();
    for (const arc of currentStory.arcs || []) {
      for (const chapter of arc.chapters || []) {
        currentChapters.set(chapter.number, chapter);
      }
    }

    return {
      ...freshStory,
      arcs: (freshStory.arcs || []).map((arc) => ({
        ...arc,
        chapters: (arc.chapters || []).map((freshChapter) => {
          if (freshChapter.number !== preserve.chapterNumber) {
            return freshChapter;
          }
          const currentChapter = currentChapters.get(freshChapter.number);
          if (!currentChapter) return freshChapter;
          return {
            ...freshChapter,
            ...hydratedChapterFields(currentChapter),
          };
        }),
      })),
    };
  });
};

export const mergeChapterContentIntoStories = (
  stories: Story[],
  storyId: string,
  chapterNumber: number,
  content: ChapterContent,
): Story[] => stories.map((story) => {
  if (story.id !== storyId) return story;

  return {
    ...story,
    arcs: story.arcs.map((arc) => ({
      ...arc,
      chapters: arc.chapters.map((chapter) => {
        if (chapter.number !== chapterNumber) return chapter;

        return {
          ...chapter,
          generatedContent: content.generatedContent,
          blocks: content.blocks,
          summary: content.summary ?? chapter.summary,
          statsChangeMessage: content.statsChangeMessage,
          cuePayload: content.cuePayload,
          contextManifest: content.contextManifest,
          translations: content.translations ?? chapter.translations,
          audioManifest: content.audioManifest ?? chapter.audioManifest,
          hasContent: true,
        };
      }),
    })),
  };
});

const findChapter = (
  stories: Story[],
  storyId: string,
  chapterNumber: number,
): Chapter | undefined => stories
  .find((story) => story.id === storyId)
  ?.arcs.flatMap((arc) => arc.chapters)
  .find((chapter) => chapter.number === chapterNumber);

export interface ActiveChapterRefreshResult {
  stories: Story[];
  unavailable: boolean;
  loadFailed: boolean;
}

/**
 * Rehydrates the active chapter after a metadata sync. Missing/error results never mutate
 * `hasContent`; callers can surface the condition and let automatic sync retry later.
 */
export const refreshActiveChapterAfterMetadataSync = async ({
  freshStories,
  currentStories,
  activeStoryId,
  selectedChapterNumber,
  loadChapter,
}: {
  freshStories: Story[];
  currentStories: Story[];
  activeStoryId: string | null;
  selectedChapterNumber: number;
  loadChapter: (storyId: string, chapterNumber: number) => Promise<ChapterContent | null>;
}): Promise<ActiveChapterRefreshResult> => {
  const mergedStories = mergeFreshStoriesWithHydratedChapters(
    freshStories,
    currentStories,
    activeStoryId && selectedChapterNumber >= 0
      ? { storyId: activeStoryId, chapterNumber: selectedChapterNumber }
      : undefined,
  );
  if (!activeStoryId || selectedChapterNumber < 0) {
    return { stories: mergedStories, unavailable: false, loadFailed: false };
  }

  const activeChapter = findChapter(mergedStories, activeStoryId, selectedChapterNumber);
  if (!activeChapter) {
    return { stories: mergedStories, unavailable: false, loadFailed: false };
  }

  const shouldLoad = activeChapter.hasContent || activeChapter.status === 'read' || activeChapter.status === 'generating';
  if (!shouldLoad) {
    return { stories: mergedStories, unavailable: false, loadFailed: false };
  }

  try {
    const content = await loadChapter(activeStoryId, selectedChapterNumber);
    if (content && (content.generatedContent || (content.blocks && content.blocks.length > 0))) {
      return {
        stories: mergeChapterContentIntoStories(
          mergedStories,
          activeStoryId,
          selectedChapterNumber,
          content,
        ),
        unavailable: false,
        loadFailed: false,
      };
    }

    // An already-hydrated in-memory body is still usable even if a background refresh
    // cannot currently retrieve its split-storage record.
    if (hasRenderableChapterBody(activeChapter)) {
      return { stories: mergedStories, unavailable: false, loadFailed: false };
    }

    return {
      stories: mergedStories,
      unavailable: Boolean(activeChapter.hasContent),
      loadFailed: false,
    };
  } catch {
    return {
      stories: mergedStories,
      unavailable: false,
      loadFailed: true,
    };
  }
};
