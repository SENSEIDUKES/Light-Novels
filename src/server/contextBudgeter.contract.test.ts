import { describe, expect, it } from "vitest";
import type { ChapterContract } from "../types";
import { assembleContext, CONTEXT_BUDGET_DEFAULTS } from "./contextBudgeter";

const baseInput = () => ({
  blocks: [
    { kind: "anchor" as const, chapterNumber: 9, text: "Lin placed one hand on the seal." },
    { kind: "recent-full" as const, chapterNumber: 9, text: "The stone door opened." },
  ],
  entityCards: [],
  threads: [],
  pinned: { premise: "Enter the shrine.", mcStateCard: "Lin — First rank." },
  worldRules: [],
});

const contract = (doNotRepeat: string[] = []): ChapterContract => ({
  version: 1,
  chapterNumber: 10,
  startingState: {
    location: "Azure Peak arena",
    charactersPresent: ["Li Wei"],
  },
  requiredOpening: "Leave the arena before the guards arrive",
  objective: "Escape the sect before dawn",
  doNotRepeat,
});

describe("assembleContext — chapter contract section", () => {
  it("renders the contract between premise and anchor", () => {
    const result = assembleContext({
      ...baseInput(),
      chapterContract: contract(["Ch 9: Li Wei defeated Elder Kang"]),
    });

    const keys = result.promptSections.map(section => section.key);
    expect(keys.indexOf("chapterContract")).toBeGreaterThan(keys.indexOf("premise"));
    expect(keys.indexOf("chapterContract")).toBeLessThan(keys.indexOf("anchor"));

    const section = result.promptSections.find(s => s.key === "chapterContract")!;
    expect(section.text).toContain("--- CHAPTER CONTRACT ---");
    expect(section.text).toContain("Opening state (canon): Location: Azure Peak arena | Present: Li Wei");
    expect(section.text).toContain("Objective of this chapter: Escape the sect before dawn");
    expect(section.text).toContain("- Ch 9: Li Wei defeated Elder Kang");
    expect(section.text).not.toContain("undefined");
  });

  it("tolerates a wire payload that omits doNotRepeat entirely", () => {
    const wireContract = {
      version: 1,
      chapterNumber: 10,
      objective: "Escape the sect before dawn",
    } as unknown as ChapterContract;

    const result = assembleContext({ ...baseInput(), chapterContract: wireContract });
    const section = result.promptSections.find(s => s.key === "chapterContract")!;
    expect(section.text).toContain("Objective of this chapter: Escape the sect before dawn");
    expect(section.text).not.toContain("ALREADY HAPPENED");
  });

  it("emits no contract section when no contract is supplied", () => {
    const result = assembleContext(baseInput());
    expect(result.promptSections.some(s => s.key === "chapterContract")).toBe(false);
    const outcome = result.outcomes.find(o => o.key === "chapterContract")!;
    expect(outcome.estimatedTokens).toBe(0);
  });

  it("drops oldest do-not-repeat lines first when over the section cap", () => {
    const lines = Array.from({ length: 80 }, (_, i) =>
      `Ch ${9 - Math.floor(i / 20)}: completed event number ${i} — ${"padding ".repeat(30)}`,
    );
    const result = assembleContext({
      ...baseInput(),
      chapterContract: contract(lines),
    });
    const outcome = result.outcomes.find(o => o.key === "chapterContract")!;
    const section = result.promptSections.find(s => s.key === "chapterContract")!;

    expect(outcome.omittedItems.length).toBeGreaterThan(0);
    expect(outcome.omissionReason).toBe("budget_drop");
    // Core lines always survive; newest do-not-repeat lines are kept.
    expect(section.text).toContain("Objective of this chapter");
    expect(section.text).toContain("completed event number 0");
    expect(section.text).not.toContain(`completed event number ${lines.length - 1} `);
    // Upper bound: the section cap plus everything the earlier premise/state
    // section could have carried forward.
    expect(outcome.estimatedTokens).toBeLessThanOrEqual(
      CONTEXT_BUDGET_DEFAULTS.sectionCaps.chapterContract
      + CONTEXT_BUDGET_DEFAULTS.sectionCaps.premiseAndMcState,
    );
  });

  it("stays within the overall budget with a contract present", () => {
    const result = assembleContext({
      ...baseInput(),
      chapterContract: contract(["Ch 9: event one", "Ch 8: event two"]),
    });
    expect(result.estimatedTokens)
      .toBeLessThanOrEqual(CONTEXT_BUDGET_DEFAULTS.totalBudgetTokens);
  });
});
