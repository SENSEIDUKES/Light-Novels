import type { Chapter, StoryWorld } from '../types';

/**
 * The single definition of "this chapter has been generated".
 *
 * Three surfaces have to agree on it or the Library lies about a story's
 * progress: the hydrated chapter scaffold (`hasContent`, which the server sets
 * from the chapter's body row), the catalog tallies the Hub renders without
 * downloading a story graph, and the SQL that produces those tallies — see
 * `GENERATED_CHAPTER_SQL_PREDICATE` below, which a contract test pins against
 * the connector query.
 *
 * `generatedContent`/`blocks` are only present on a chapter that has been
 * hydrated with its body; `hasContent` is the durable marker recorded when the
 * body was written. Either one is proof of generation.
 */
export function isGeneratedChapter(chapter: Chapter | null | undefined): boolean {
  if (!chapter) return false;
  return Boolean(
    chapter.hasContent
    || chapter.generatedContent
    || (Array.isArray(chapter.blocks) && chapter.blocks.length > 0),
  );
}

/**
 * Chapter tallies for a story whose arcs are hydrated.
 *
 * Returns null when the story carries no arcs at all: an un-hydrated catalog
 * summary would otherwise report an authoritative-looking 0/0 that is really
 * "not loaded". Callers fall back to the persisted `totalChapterCount` /
 * `generatedChapterCount` in that case.
 */
export function countHydratedChapters(
  story: Pick<StoryWorld, 'arcs'> | null | undefined,
): { totalChapterCount: number; generatedChapterCount: number } | null {
  const arcs = Array.isArray(story?.arcs) ? story.arcs : [];
  if (arcs.length === 0) return null;
  let totalChapterCount = 0;
  let generatedChapterCount = 0;
  for (const arc of arcs) {
    const chapters = Array.isArray(arc?.chapters) ? arc.chapters : [];
    for (const chapter of chapters) {
      if (!chapter) continue;
      totalChapterCount += 1;
      if (isGeneratedChapter(chapter)) generatedChapterCount += 1;
    }
  }
  return { totalChapterCount, generatedChapterCount };
}

/**
 * The counts to display for a story, preferring its hydrated arcs and falling
 * back to the tallies the catalog persisted alongside the summary.
 *
 * Never invents a count: a story with neither arcs nor persisted tallies
 * reports null so the caller can render "unknown" rather than a fabricated 0/0.
 */
export function resolveChapterCounts(
  story: StoryWorld | null | undefined,
): { totalChapterCount: number; generatedChapterCount: number } | null {
  const hydrated = countHydratedChapters(story);
  if (hydrated) return hydrated;
  if (
    typeof story?.totalChapterCount === 'number'
    && typeof story?.generatedChapterCount === 'number'
  ) {
    return {
      totalChapterCount: story.totalChapterCount,
      generatedChapterCount: story.generatedChapterCount,
    };
  }
  return null;
}

/**
 * Stamp a fully hydrated story with the tallies derived from its own arcs, so
 * the catalog row this device caches stays correct the moment a chapter is
 * generated instead of waiting for the next catalog read.
 *
 * A story with no arcs is returned untouched: its existing tallies came from
 * the server and are the only truth this copy has.
 */
export function withRefreshedChapterCounts<T extends StoryWorld>(story: T): T {
  const counts = countHydratedChapters(story);
  if (!counts) return story;
  if (
    story.totalChapterCount === counts.totalChapterCount
    && story.generatedChapterCount === counts.generatedChapterCount
  ) {
    return story;
  }
  return { ...story, ...counts };
}

/**
 * PostgreSQL form of the catalog tally's generated-chapter test, evaluated
 * against a `chapter` row aliased as `c`.
 *
 * It asks the same question `hydrateChapterScaffold` asks — does this chapter
 * have a body row? — so a Library card and an opened story can never disagree
 * about how many chapters were written. Nothing on the scaffold itself counts:
 * a status or a summary is written by the story mutation and can outrun the
 * body it claims to describe.
 *
 * The literal lives in `AdminListOwnedStories` (Data Connect requires inline
 * SQL); the contract test pins the two copies together.
 */
export const GENERATED_CHAPTER_SQL_PREDICATE =
  'EXISTS (SELECT 1 FROM chapter_content cc WHERE cc.chapter_id = c.id)';
