import { describe, expect, it } from "vitest";
import type { ContextBlock } from "../types";
import type { RenderedEntityCard } from "./entityCards";
import { assembleContext, CONTEXT_BUDGET_DEFAULTS } from "./contextBudgeter";

const card = (
  name: string,
  options: Partial<RenderedEntityCard & { briefText: string }> = {},
): RenderedEntityCard & { briefText: string } => ({
  name,
  kind: "character",
  tier: "full",
  text: `${name}\nCharacter: ally\nDescription: ${"detail ".repeat(180)}`,
  briefText: `${name} — ${"brief ".repeat(30)}`.slice(0, 160),
  estimatedTokens: 300,
  pinned: false,
  ...options,
});

const blocks: ContextBlock[] = [
  { kind: "arc-summary", text: "Volume 'Ashes' Summary: The sect fell." },
  { kind: "rag", chapterNumber: 3, text: "The Moon Sword was hidden beneath the shrine." },
  { kind: "recent-summary", chapterNumber: 8, text: "Lin crossed the ash plain." },
  { kind: "recent-full", chapterNumber: 9, text: "The stone door opened." },
  { kind: "anchor", chapterNumber: 9, text: "Lin placed one hand on the ancient seal." },
];

describe("assembleContext", () => {
  it("keeps every under-budget item with no omissions", () => {
    const result = assembleContext({
      blocks,
      entityCards: [card("Lin", { pinned: true }), card("Mei")],
      threads: ["Find the Moon Sword"],
      pinned: {
        premise: "Enter the shrine.",
        mcStateCard: "Lin — First rank cultivator.",
      },
      worldRules: ["Steel remembers its wielder."],
    });

    expect(result.outcomes.flatMap(outcome => outcome.omittedItems)).toEqual([]);
    expect(result.outcomes.flatMap(outcome => outcome.demotedItems)).toEqual([]);
    expect(result.promptSections.map(section => section.key)).toContain("entityCards");
    expect(result.estimatedTokens)
      .toBeLessThanOrEqual(CONTEXT_BUDGET_DEFAULTS.totalBudgetTokens);
    expect(result.protectedOverflowTokens).toBe(0);
  });

  it("keeps a latest-chapter summary at the chapter-minus-one priority", () => {
    const result = assembleContext({
      blocks: [
        { kind: "recent-full", chapterNumber: 8, text: "Chapter 8 full prose." },
        { kind: "recent-summary", chapterNumber: 9, text: "Chapter 9 fallback summary." },
      ],
      entityCards: [card("Lin")],
      threads: [],
      pinned: { premise: "Premise", mcStateCard: "MC state" },
      worldRules: [],
    });
    const newestIndex = result.promptSections.findIndex(
      section => section.text.includes("Chapter 9 fallback summary."),
    );
    const entityIndex = result.promptSections.findIndex(
      section => section.key === "entityCards",
    );

    expect(newestIndex).toBeGreaterThanOrEqual(0);
    expect(newestIndex).toBeLessThan(entityIndex);
    expect(
      result.outcomes.find(outcome => outcome.key === "recentChapters")?.includedItems,
    ).toContain("Chapter 9 (summary)");
  });

  it("demotes lowest-ranked entity cards first and never drops pinned cards", () => {
    const cards = [
      ...Array.from(
        { length: 8 },
        (_, index) => card(`Pinned ${index + 1}`, { pinned: true }),
      ),
      ...Array.from(
        { length: 90 },
        (_, index) => card(`Score ${90 - index}`),
      ),
    ];
    const result = assembleContext({
      blocks: [
        { kind: "anchor", chapterNumber: 9, text: "anchor ".repeat(1140) },
        { kind: "recent-full", chapterNumber: 9, text: "recent ".repeat(3420) },
      ],
      entityCards: cards,
      threads: [],
      pinned: {
        premise: "Premise",
        mcStateCard: "state ".repeat(1000),
      },
      worldRules: [],
    });
    const entities = result.outcomes.find(outcome => outcome.key === "entityCards")!;

    expect(entities.demotedItems[0]).toContain("Pinned 8");
    expect(entities.demotedItems).toContain("Character: Score 1 (full) -> brief");
    expect(entities.omittedItems).not.toContain("Character: Pinned 1");
    expect(entities.omittedItems).not.toContain("Character: Pinned 8");
    expect(entities.includedItems).toEqual(expect.arrayContaining([
      "Character: Pinned 1 (full)",
      "Character: Pinned 8 (brief)",
    ]));
    expect(entities.omittedItems[0]).toContain("Score 1");
  });

  it("lets unused earlier allocations flow forward before demoting cards", () => {
    const result = assembleContext({
      blocks: [],
      entityCards: Array.from({ length: 20 }, (_, index) => card(`Entity ${index}`)),
      threads: [],
      pinned: { premise: "Short premise", mcStateCard: "Short state" },
      worldRules: [],
      totalBudgetTokens: 10000,
    });
    const entities = result.outcomes.find(outcome => outcome.key === "entityCards")!;

    expect(entities.includedItems).toHaveLength(20);
    expect(entities.demotedItems).toEqual([]);
    expect(entities.omittedItems).toEqual([]);
  });

  it("preserves premise, anchor, and the tail of chapter minus one before degrading lower sections", () => {
    const hugeBlocks: ContextBlock[] = [
      { kind: "arc-summary", text: "old arc ".repeat(2000) },
      { kind: "rag", chapterNumber: 1, text: "rag ".repeat(2000) },
      { kind: "recent-summary", chapterNumber: 28, text: "summary ".repeat(1500) },
      { kind: "recent-full", chapterNumber: 29, text: `OPENING\n${"middle ".repeat(5000)}\nFINAL MOMENT` },
      {
        kind: "anchor",
        chapterNumber: 29,
        text: `UNTOUCHABLE ANCHOR\n${"anchor ".repeat(1100)}`,
      },
    ];
    const result = assembleContext({
      blocks: hugeBlocks,
      entityCards: Array.from({ length: 20 }, (_, index) => card(`Entity ${index}`)),
      threads: Array.from({ length: 20 }, (_, index) => `Thread ${index} ${"detail ".repeat(80)}`),
      pinned: {
        premise: "UNTOUCHABLE PREMISE",
        mcStateCard: `UNTOUCHABLE MC STATE\n${"state ".repeat(1000)}`,
      },
      worldRules: [],
      totalBudgetTokens: 14000,
    });
    const prompt = result.promptSections.map(section => section.text).join("\n");
    const recent = result.outcomes.find(outcome => outcome.key === "recentChapters")!;

    expect(prompt).toContain("UNTOUCHABLE PREMISE");
    expect(prompt).toContain("UNTOUCHABLE ANCHOR");
    expect(prompt).toContain("FINAL MOMENT");
    expect(prompt).not.toContain("OPENING");
    expect(recent.demotedItems).toContain("Chapter 29 (front-trimmed)");
    expect(result.outcomes.find(outcome => outcome.key === "entityCards")?.demotedItems.length)
      .toBeGreaterThan(0);
    expect(result.outcomes.find(outcome => outcome.key === "rag")?.omittedItems)
      .toContain("Chapter 1");
  });

  it("degrades older full prose to its real stored summary before dropping it", () => {
    const result = assembleContext({
      blocks: [
        { kind: "anchor", chapterNumber: 9, text: "anchor ".repeat(1140) },
        { kind: "recent-full", chapterNumber: 9, text: "recent ".repeat(3420) },
        {
          kind: "recent-full",
          chapterNumber: 8,
          text: `FULL_PROSE ${"detail ".repeat(800)}`,
          summaryText: "The party escaped the flooded vault.",
        },
      ],
      entityCards: [],
      threads: [],
      pinned: {
        premise: "Premise",
        mcStateCard: "state ".repeat(1000),
      },
      worldRules: [],
      totalBudgetTokens: 10000,
    });
    const prompt = result.promptSections.map(section => section.text).join("\n");
    const recent = result.outcomes.find(outcome => outcome.key === "recentChapters")!;

    expect(prompt).toContain("Chapter 8 Summary: The party escaped the flooded vault.");
    expect(prompt).not.toContain("FULL_PROSE");
    expect(recent.demotedItems).toContain("Chapter 8 (full -> summary)");
  });

  it("reconciles prompt tokens to outcomes and records every dropped item", () => {
    const result = assembleContext({
      blocks: [
        ...blocks,
        { kind: "rag", chapterNumber: 4, text: "oversized ".repeat(1000) },
        { kind: "arc-summary", text: "Volume 'New' Summary: " + "history ".repeat(1000) },
      ],
      entityCards: Array.from({ length: 16 }, (_, index) => card(`Entity ${index}`)),
      threads: Array.from({ length: 16 }, (_, index) => `Thread ${index} ${"detail ".repeat(120)}`),
      pinned: { premise: "Premise", mcStateCard: "MC state" },
      worldRules: [],
      totalBudgetTokens: 6000,
    });
    const promptTokens = result.promptSections.reduce(
      (sum, section) => sum + Math.ceil(section.text.length / 4),
      0,
    );
    const outcomeTokens = result.outcomes.reduce(
      (sum, outcome) => sum + outcome.estimatedTokens,
      0,
    );

    expect(outcomeTokens).toBe(promptTokens);
    expect(outcomeTokens).toBeLessThanOrEqual(6000);
    expect(result.outcomes.flatMap(outcome => outcome.omittedItems).length)
      .toBeGreaterThan(0);
    for (const outcome of result.outcomes) {
      if (outcome.omittedItems.length > 0) {
        expect(outcome.omissionReason).toBeDefined();
      }
    }
  });

  it("reports protected overflow instead of silently cutting author-controlled context", () => {
    const result = assembleContext({
      blocks: [
        { kind: "anchor", chapterNumber: 9, text: "anchor ".repeat(500) },
        { kind: "recent-full", chapterNumber: 9, text: "recent ".repeat(500) },
        { kind: "rag", chapterNumber: 2, text: "rag ".repeat(500) },
      ],
      entityCards: [
        card("Pinned", { pinned: true }),
        card("Scored"),
      ],
      threads: ["A lower-priority thread"],
      pinned: {
        premise: "premise ".repeat(500),
        mcStateCard: "state ".repeat(500),
      },
      worldRules: [],
      totalBudgetTokens: 200,
    });
    const pinnedEntityOutcome = result.outcomes.find(
      outcome => outcome.key === "entityCards",
    )!;

    expect(result.estimatedTokens).toBeGreaterThan(result.totalBudgetTokens);
    expect(result.protectedOverflowTokens).toBeGreaterThan(0);
    expect(
      result.outcomes.reduce(
        (sum, outcome) => sum + (outcome.protectedOverflowTokens || 0),
        0,
      ),
    ).toBe(result.protectedOverflowTokens);
    expect(pinnedEntityOutcome.includedItems).toContain("Character: Pinned (brief)");
    expect(pinnedEntityOutcome.omittedItems).toContain("Character: Scored");
    expect(result.outcomes.find(outcome => outcome.key === "rag")?.omittedItems)
      .toContain("Chapter 2");
  });
});
