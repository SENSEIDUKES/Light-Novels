import { Chapter, StoryWorld } from "../types";

/**
 * Select the chapter shown when entering the Reader for a story.
 *
 * The reader keeps full prose outside the story scaffold, so `hasContent`, a
 * loaded payload, and the persisted `read` status all describe a generated,
 * readable chapter.  Prefer the newest such chapter over a planned chapter
 * that would only render a manifestation prompt.  If no chapter has been
 * generated yet, the first planned chapter is the genuine next step.
 */
export function resolveReaderOpeningChapter(story: Pick<StoryWorld, "arcs">): number {
  const chapters = story.arcs
    .flatMap((arc) => arc.chapters)
    .filter((chapter): chapter is Chapter => Boolean(chapter && Number.isFinite(chapter.number)))
    .sort((left, right) => left.number - right.number);

  const latestReadableChapter = [...chapters]
    .reverse()
    .find((chapter) => (
      chapter.hasContent
      || Boolean(chapter.generatedContent)
      || Boolean(chapter.blocks?.length)
      || chapter.status === "read"
    ));

  return latestReadableChapter?.number ?? chapters[0]?.number ?? 1;
}
