import { Chapter, ChapterGenerationBatch, Story } from '../../types';

export const hasGeneratedChapterContent = (chapter: Chapter) =>
  Boolean(chapter.hasContent || chapter.generatedContent || chapter.blocks?.length);

export const getRemainingBatchChapterNumbers = (batch: ChapterGenerationBatch) =>
  batch.chapterNumbers.filter(number => !batch.completedChapterNumbers.includes(number));

export const getFateLockMessage = (story: Story, chapterNumber: number) => {
  const batch = story.chapterGenerationBatch;
  if (!batch) return null;

  // A stopped run is no longer changing the source timeline. Its already
  // committed chapters are safe branch points; unfinished chapters remain
  // protected until the user resumes or starts a new run later.
  if (
    (batch.status === 'failed' || batch.status === 'paused')
    && batch.completedChapterNumbers.includes(chapterNumber)
  ) {
    return null;
  }

  const endpoint = batch.chapterNumbers[batch.chapterNumbers.length - 1];
  if (batch.status !== 'completed' || chapterNumber !== endpoint) {
    return `Fate may be altered after Chapter ${endpoint}.`;
  }

  return null;
};

export const getNextFiveUngeneratedChapters = (story: Story, fromChapterNumber: number) =>
  story.arcs
    .flatMap(arc => arc.chapters)
    .filter(chapter => chapter.number >= fromChapterNumber && !hasGeneratedChapterContent(chapter))
    .sort((a, b) => a.number - b.number)
    .slice(0, 5)
    .map(chapter => chapter.number);

interface RunSequentialChapterBatchOptions {
  story: Story;
  batch: ChapterGenerationBatch;
  generateChapter: (story: Story, chapterNumber: number) => Promise<Story>;
  persistBatch: (story: Story, batch: ChapterGenerationBatch) => Promise<Story>;
}

/**
 * Runs a batch serially. Persisting the returned story between iterations is
 * intentional: each chapter's prompt reads the real memory and summaries that
 * the previous chapter just committed.
 */
export const runSequentialChapterBatch = async ({
  story: initialStory,
  batch: initialBatch,
  generateChapter,
  persistBatch,
}: RunSequentialChapterBatchOptions) => {
  let story = initialStory;
  const committedChapterNumbers = story.arcs
    .flatMap(arc => arc.chapters)
    .filter(chapter => initialBatch.chapterNumbers.includes(chapter.number) && hasGeneratedChapterContent(chapter))
    .map(chapter => chapter.number);
  const completedChapterNumbers = [...new Set([
    ...initialBatch.completedChapterNumbers,
    ...committedChapterNumbers,
  ])].sort((a, b) => a - b);
  let batch: ChapterGenerationBatch = {
    ...initialBatch,
    completedChapterNumbers,
    status: completedChapterNumbers.length === initialBatch.chapterNumbers.length ? 'completed' : initialBatch.status,
    currentChapterNumber: completedChapterNumbers.length === initialBatch.chapterNumbers.length
      ? null
      : initialBatch.currentChapterNumber,
    completedAt: completedChapterNumbers.length === initialBatch.chapterNumbers.length
      ? initialBatch.completedAt || new Date().toISOString()
      : initialBatch.completedAt,
  };

  if (batch !== initialBatch) {
    story = await persistBatch(story, batch);
  }

  if (batch.status === 'completed') return { story, batch };

  for (const chapterNumber of getRemainingBatchChapterNumbers(batch)) {
    batch = {
      ...batch,
      status: 'generating',
      currentChapterNumber: chapterNumber,
      failedChapterNumber: undefined,
      error: undefined,
    };
    story = await persistBatch(story, batch);

    try {
      story = await generateChapter(story, chapterNumber);
    } catch (error: any) {
      batch = {
        ...batch,
        status: 'failed',
        currentChapterNumber: chapterNumber,
        failedChapterNumber: chapterNumber,
        error: error?.message || 'Chapter generation failed.',
      };
      await persistBatch(story, batch);
      throw error;
    }

    const completedChapterNumbers = [...batch.completedChapterNumbers, chapterNumber];
    batch = {
      ...batch,
      completedChapterNumbers,
      currentChapterNumber: null,
      status: completedChapterNumbers.length === batch.chapterNumbers.length ? 'completed' : 'queued',
      completedAt: completedChapterNumbers.length === batch.chapterNumbers.length
        ? new Date().toISOString()
        : undefined,
    };
    story = await persistBatch(story, batch);
  }

  return { story, batch };
};
