import { describe, expect, it } from "vitest";
import type { ContextBlock } from "../types";
import {
  formatMainCharacterState,
  prepareGenerationContext,
} from "./generationContext";
import {
  rankRelevantEntities,
  truncateContextIfNeeded,
} from "./helpers";

const memory = {
  powerSystem: "Nine ranks",
  currentPowerStage: "First rank",
  worldRules: ["Steel remembers its wielder"],
  abilities: [],
  unresolvedPlotThreads: ["Find the Moon Sword"],
  characters: [{
    id: "lin",
    name: "Lin",
    role: "Protagonist",
    relationshipToMC: "Self",
    status: "alive",
    description: "A wandering cultivator ".repeat(20),
  }],
  factions: [],
  locations: [],
  artifacts: [{
    id: "moon-sword",
    name: "Moon Sword",
    type: "Relic",
    status: "sealed",
    relationshipToMC: "Sought treasure",
    description: "A silver blade beneath the shrine ".repeat(30),
    imageHistory: [{ imageUrl: "data:image/png;base64,heavy" }],
    embedding: [0.1, 0.2],
  }],
};

const blocks: ContextBlock[] = [
  { kind: "recent-full", chapterNumber: 1, text: "Chapter 1:\nLin reached the shrine." },
  { kind: "anchor", chapterNumber: 1, text: "The stone door opened." },
];

const baseMemory = {
  powerSystem: memory.powerSystem,
  currentPowerStage: memory.currentPowerStage,
  worldRules: memory.worldRules,
  abilities: memory.abilities,
  unresolvedPlotThreads: memory.unresolvedPlotThreads,
};

describe("prepareGenerationContext", () => {
  it("renders structured resolved threads as meaningful prose", () => {
    expect(formatMainCharacterState({
      mcName: "Lin",
      resolvedPlotThreads: [{ id: "debt", description: "Repaid the mountain debt" }] as any,
    })).toContain("- Repaid the mountain debt");
  });

  it("keeps the v1 ranking and truncation output byte-for-byte", () => {
    const legacyPastSummaries = [
      "--- SLIDING WINDOW OF RECENT NARRATIVE BLOCKS/DIALOGUE ---",
      "Chapter 1:\nLin reached the shrine.",
      "--- IMMEDIATE CONTINUATION ANCHOR (FINAL MOMENTS OF CHAPTER 1) ---\nThe stone door opened.",
    ];
    const expectedRawMemory = {
      ...baseMemory,
      characters: rankRelevantEntities(
        memory.characters,
        "Lin",
        legacyPastSummaries[legacyPastSummaries.length - 1],
        "Find the sword.",
        [memory.unresolvedPlotThreads.join(" "), "Core premise"],
      ),
      factions: [],
      locations: [],
      artifacts: rankRelevantEntities(
        memory.artifacts,
        "Lin",
        legacyPastSummaries[legacyPastSummaries.length - 1],
        "Find the sword.",
        [memory.unresolvedPlotThreads.join(" "), "Core premise"],
      ),
    };
    const expected = truncateContextIfNeeded(
      expectedRawMemory,
      legacyPastSummaries,
      80000,
      "Fallback",
    );

    const actual = prepareGenerationContext({
      engine: "v1",
      memory,
      baseMemory,
      blocks,
      legacyPastSummaries,
      fallbackSummary: "Fallback",
      threads: memory.unresolvedPlotThreads,
      worldRules: memory.worldRules,
      pinned: { premise: "Find the sword.", mcStateCard: "Lin — First rank" },
      ranking: {
        mcName: "Lin",
        lastSummary: legacyPastSummaries[legacyPastSummaries.length - 1],
        currentContext: "Find the sword.",
        bonusContexts: [memory.unresolvedPlotThreads.join(" "), "Core premise"],
        anchorText: "The stone door opened.",
      },
    });

    expect(actual.rawMemoryObj).toEqual(expectedRawMemory);
    expect(actual.memoryJsonStr).toBe(expected.memoryJsonStr);
    expect(actual.pastSummariesStr).toBe(expected.pastSummariesStr);
    expect(actual.droppedPastSummariesCount).toBe(expected.droppedPastSummariesCount);
  });

  it("replaces entity JSON with smaller v2 cards and excludes heavy fields", () => {
    const actual = prepareGenerationContext({
      engine: "v2",
      memory,
      baseMemory,
      blocks,
      fallbackSummary: "Fallback",
      threads: memory.unresolvedPlotThreads,
      worldRules: memory.worldRules,
      pinned: { premise: "Find the sword.", mcStateCard: "Lin — First rank" },
      ranking: {
        mcName: "Lin",
        lastSummary: blocks[0].text,
        currentContext: "Find the sword.",
        bonusContexts: [memory.unresolvedPlotThreads.join(" ")],
        anchorText: blocks[1].text,
      },
    });
    const entityOutcome = actual.budgetedContext?.outcomes.find(
      outcome => outcome.key === "entityCards",
    );
    const legacyEntityJson = JSON.stringify({
      characters: memory.characters,
      factions: memory.factions,
      locations: memory.locations,
      artifacts: memory.artifacts,
    }, null, 2);

    expect(actual.memoryJsonStr).toContain("CODEX MEMORY CARDS");
    expect(actual.memoryJsonStr).not.toContain('"characters": [');
    expect(actual.memoryJsonStr).not.toContain("imageHistory");
    expect(actual.memoryJsonStr).not.toContain("data:image");
    expect(entityOutcome?.estimatedTokens).toBeLessThan(
      Math.ceil(legacyEntityJson.length / 4),
    );
  });

  it("keeps global relevance order across entity kinds", () => {
    const crossKindMemory = {
      ...memory,
      characters: [
        ...memory.characters,
        {
          id: "attendant",
          name: "Shrine Attendant",
          description: "A minor witness near the shrine.",
        },
      ],
    };
    const actual = prepareGenerationContext({
      engine: "v2",
      memory: crossKindMemory,
      baseMemory,
      blocks,
      fallbackSummary: "Fallback",
      threads: memory.unresolvedPlotThreads,
      worldRules: memory.worldRules,
      pinned: { premise: "Speak to the Shrine Attendant.", mcStateCard: "Lin — First rank" },
      ranking: {
        mcName: "Lin",
        lastSummary: blocks[0].text,
        currentContext: "Speak to the Shrine Attendant.",
        bonusContexts: [],
        anchorText: "The Moon Sword split the ancient seal.",
      },
    });

    const entityCardSection = actual.memoryJsonStr.slice(
      actual.memoryJsonStr.indexOf("CODEX MEMORY CARDS"),
    );
    expect(entityCardSection.indexOf("Moon Sword"))
      .toBeLessThan(entityCardSection.indexOf("Shrine Attendant"));
  });
});
