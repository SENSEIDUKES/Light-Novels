import { describe, expect, it } from "vitest";
import {
  appendChapterWritingStyleInstruction,
  getChapterWritingStyleInstruction,
  normalizeChapterWritingStyle,
} from "./chapterWritingStyle";

describe("chapter writing style", () => {
  it("keeps Standard generation unchanged", () => {
    expect(appendChapterWritingStyleInstruction("BASE PROMPT", "Standard"))
      .toBe("BASE PROMPT");
    expect(getChapterWritingStyleInstruction("Standard")).toBe("");
  });

  it.each([
    [
      "Clear Reading",
      "clear, dyslexia-friendly prose style",
    ],
    [
      "Easy Read",
      "adult Easy Read style",
    ],
    [
      "Literal Reading",
      "clear, literal prose style",
    ],
  ] as const)("adds the small %s chapter-only instruction", (style, phrase) => {
    const prompt = appendChapterWritingStyleInstruction("BASE PROMPT", style);

    expect(prompt).toContain("CHAPTER WRITING STYLE");
    expect(prompt).toContain(phrase);
    expect(prompt).toContain("BASE PROMPT");
  });

  it("treats absent and unknown stored values as Standard", () => {
    expect(normalizeChapterWritingStyle(undefined)).toBe("Standard");
    expect(normalizeChapterWritingStyle("Unknown")).toBe("Standard");
  });
});
