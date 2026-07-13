import { describe, expect, it } from "vitest";
import { buildContextManifest } from "./contextManifest";
import { estimateTokens } from "./helpers";

describe("buildContextManifest", () => {
  const pastSummaries = [
    "--- COARSE HISTORY (ARC SUMMARIES) ---\nVolume 'Ashes' Summary: The sect fell.",
    "--- RECOVERED RELEVANT MEMORIES (OLDER CHAPTERS) ---",
    "Chapter 2: The Moon Sword was hidden beneath the shrine.",
    "--- SLIDING WINDOW OF RECENT NARRATIVE BLOCKS/DIALOGUE ---",
    "Chapter 8:\nRecent full text.",
    "--- IMMEDIATE CONTINUATION ANCHOR (FINAL MOMENTS OF CHAPTER 8) ---\nThe door opened.",
  ];

  const sourceMemory = {
    powerSystem: "Nine ranks",
    currentPowerStage: "First rank",
    worldRules: ["Steel remembers its wielder"],
    abilities: [{ name: "Ember Step" }],
    characters: [{ name: "Lin" }, { name: "Mei" }],
    factions: [],
    locations: [],
    artifacts: [{ name: "Moon Sword" }, { name: "Sun Shield" }],
    unresolvedPlotThreads: ["Find the sword", "Repay the debt"],
  };

  it("accounts for all eight sections and reconciles them to the prompt total", () => {
    const rawMemory = {
      ...sourceMemory,
      characters: [{ name: "Lin" }],
      artifacts: [{ name: "Moon Sword" }],
      unresolvedPlotThreads: ["Find the sword (Thread open for 7 chapters — pay it off or deepen it!)"],
    };
    const promptPayload = [
      "fixed rules ".repeat(1000),
      "The Second Gate",
      "Find the hidden blade",
      "A wandering cultivator",
      "Lin",
      "Xianxia",
      JSON.stringify(rawMemory),
      pastSummaries.join("\n"),
    ].join("\n");

    const manifest = buildContextManifest({
      route: "generate-chapter-stream",
      chapterNumber: 9,
      chapterTitle: "The Second Gate",
      chapterPremise: "Find the hidden blade",
      mcName: "Lin",
      genre: "Xianxia",
      customPremise: "A wandering cultivator",
      systemInstruction: "system rules",
      finalUserPrompt: promptPayload,
      rawMemory,
      sourceMemory,
      pastSummaries,
      droppedPastSummariesCount: 0,
      styleBible: "Poetic",
      tropeRules: "No shortcuts",
      storyTags: ["progression"],
      glossaryRules: "Use qi consistently",
      pacingDirective: "Slow down",
      fatePressure: "Balanced",
    });

    expect(manifest.sections.map(section => section.key)).toEqual([
      "pinnedRules",
      "premise",
      "anchor",
      "recentChapters",
      "entityCards",
      "threads",
      "rag",
      "arcSummaries",
    ]);
    expect(manifest.totalEstimatedTokens).toBe(
      manifest.sections.reduce((total, section) => total + section.estimatedTokens, 0),
    );
    expect(manifest.totalEstimatedTokens).toBe(
      estimateTokens("system rules") + estimateTokens(promptPayload),
    );
    expect(manifest.sections.find(section => section.key === "recentChapters")?.estimatedTokens)
      .toBe(estimateTokens(`${pastSummaries[3]}\n${pastSummaries[4]}`));
    expect(manifest.sections.find(section => section.key === "anchor")?.includedItems)
      .toContain("Chapter 8");
    expect(manifest.sections.find(section => section.key === "rag")?.includedItems)
      .toContain("Chapter 2");
    expect(manifest.sections.find(section => section.key === "arcSummaries")?.includedItems)
      .toContain("Ashes");
    expect(manifest.sections.find(section => section.key === "threads")?.omittedItems)
      .toEqual(["Repay the debt"]);
  });

  it("records entity and history inputs that lost the budget race", () => {
    const rawMemory = {
      ...sourceMemory,
      characters: [{ name: "Lin" }],
      artifacts: [{ name: "Sun Shield" }],
      unresolvedPlotThreads: ["Repay the debt"],
    };

    const manifest = buildContextManifest({
      route: "generate-chapter-stream",
      chapterNumber: 9,
      systemInstruction: "rules ".repeat(1000),
      finalUserPrompt: `${JSON.stringify(rawMemory)}\n${pastSummaries.slice(3).join("\n")}`,
      rawMemory,
      sourceMemory,
      pastSummaries,
      droppedPastSummariesCount: 3,
      memoryAndHistoryBudgetTokens: 1,
    });

    const entities = manifest.sections.find(section => section.key === "entityCards");
    expect(entities?.includedItems).toContain("Artifact: Sun Shield");
    expect(entities?.omittedItems).toContain("Artifact: Moon Sword");
    expect(entities?.truncated).toBe(true);

    const rag = manifest.sections.find(section => section.key === "rag");
    expect(rag?.estimatedTokens).toBe(0);
    expect(rag?.omittedItems).toContain("Chapter 2");
    expect(rag?.truncated).toBe(true);

    const threads = manifest.sections.find(section => section.key === "threads");
    expect(threads?.includedItems).toEqual(["Repay the debt"]);
    expect(threads?.omittedItems).toEqual(["Find the sword"]);
    expect(manifest.memoryAndHistoryBudgetExceeded).toBe(true);
  });

  it("makes the first-chapter fallback visible without inventing recent history", () => {
    const fallback = "This is the first chapter. Set the scene dramatically.";
    const memoryJsonStr = JSON.stringify(sourceMemory, null, 2);
    const manifest = buildContextManifest({
      route: "generate-chapter-stream",
      chapterNumber: 1,
      systemInstruction: "rules",
      finalUserPrompt: `${"rules ".repeat(500)}\n${memoryJsonStr}\n${fallback}`,
      rawMemory: sourceMemory,
      sourceMemory,
      memoryJsonStr,
      pastSummariesStr: fallback,
      pastSummaries: [],
      droppedPastSummariesCount: 0,
    });

    expect(manifest.sections.find(section => section.key === "recentChapters")?.estimatedTokens)
      .toBe(0);
    expect(manifest.sections.find(section => section.key === "pinnedRules")?.includedItems)
      .toContain("First chapter fallback context");
  });
});
