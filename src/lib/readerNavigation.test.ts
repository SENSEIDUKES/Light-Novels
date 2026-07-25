import { describe, expect, it } from "vitest";
import { StoryWorld } from "../types";
import { resolveReaderOpeningChapter } from "./readerNavigation";

const storyWithChapters = (chapters: StoryWorld["arcs"][number]["chapters"]): StoryWorld => ({
  id: "reader-navigation-story",
  title: "Reader navigation",
  genre: "Fantasy",
  mcName: "Reader",
  customPremise: "A test story for reader opening navigation.",
  createdAt: "2026-07-25T00:00:00.000Z",
  updatedAt: "2026-07-25T00:00:00.000Z",
  memory: {} as StoryWorld["memory"],
  arcs: [{ title: "Opening arc", chapters, isCompleted: false }],
  currentChapterNumber: 1,
});

const chapter = (number: number, overrides = {}) => ({
  number,
  title: `Chapter ${number}`,
  premise: "",
  status: "unread" as const,
  ...overrides,
});

describe("resolveReaderOpeningChapter", () => {
  it("starts a fresh default story at Chapter 1", () => {
    const story = storyWithChapters([chapter(1), chapter(2), chapter(3)]);

    expect(resolveReaderOpeningChapter(story)).toBe(1);
  });

  it("reopens a story with only Chapter 1 generated at Chapter 1", () => {
    const story = storyWithChapters([
      chapter(1, { hasContent: true, status: "read" }),
      chapter(2),
    ]);

    expect(resolveReaderOpeningChapter(story)).toBe(1);
  });

  it("reopens a story at its latest generated chapter", () => {
    const story = storyWithChapters([
      chapter(1, { hasContent: true, status: "read" }),
      chapter(2, { hasContent: true, status: "read" }),
      chapter(3),
    ]);

    expect(resolveReaderOpeningChapter(story)).toBe(2);
  });

  it("does not let a pending manifestation displace an earlier readable chapter", () => {
    const story = storyWithChapters([
      chapter(1, { hasContent: true, status: "read" }),
      chapter(2),
      chapter(3),
    ]);

    expect(resolveReaderOpeningChapter(story)).toBe(1);
  });

  it("keeps the same target after refresh and full reopen for every opening state", () => {
    const cases = [
      { story: storyWithChapters([chapter(1), chapter(2)]), expected: 1 },
      { story: storyWithChapters([chapter(1, { hasContent: true, status: "read" }), chapter(2)]), expected: 1 },
      { story: storyWithChapters([chapter(1, { hasContent: true, status: "read" }), chapter(2, { hasContent: true, status: "read" }), chapter(3)]), expected: 2 },
      { story: storyWithChapters([chapter(1, { hasContent: true, status: "read" }), chapter(2)]), expected: 1 },
    ];

    for (const { story, expected } of cases) {
      expect(resolveReaderOpeningChapter(story)).toBe(expected);
      const reloadedStory = JSON.parse(JSON.stringify(story)) as StoryWorld;
      expect(resolveReaderOpeningChapter(reloadedStory)).toBe(expected);
    }
  });
});
