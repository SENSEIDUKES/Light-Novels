import { describe, expect, it } from "vitest";
import type { Story } from "../src/types";
import {
  buildContextAbArtifacts,
  buildOfflineContextBlocks,
  memorySnapshotForChapter,
} from "./context-ab";

const story: Story = {
  id: "story-1",
  title: "Test Story",
  genre: "Xianxia",
  mcName: "Lin",
  customPremise: "Find the Moon Sword.",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  currentChapterNumber: 4,
  memory: {
    powerSystem: "Nine ranks",
    currentPowerStage: "First rank",
    worldRules: ["Steel remembers its wielder"],
    abilities: [],
    unresolvedPlotThreads: ["Find the Moon Sword"],
    resolvedPlotThreads: [],
    characters: [{
      id: "lin",
      name: "Lin",
      role: "Protagonist",
      description: "A wanderer",
      relationshipToMC: "Self",
      status: "alive",
    }],
    factions: [],
    locations: [],
    artifacts: [{ id: "sword", name: "Moon Sword", description: "A silver blade" }],
  },
  arcs: [{
    title: "Ashes",
    isCompleted: false,
    summary: "Lin reached the shrine.",
    chapters: [1, 2, 3, 4].map(number => ({
      number,
      title: `Chapter ${number}`,
      premise: number === 4 ? "Open the shrine." : "Travel.",
      status: number === 4 ? "unlocked" : "read",
      hasContent: number < 4,
      generatedContent: number < 4 ? `Chapter ${number} prose.\n\nFinal beat ${number}.` : undefined,
      summary: `Summary ${number}`,
    })),
  }],
};

describe("context A/B harness", () => {
  it("builds a reduced v2 recent window and an anchor without RAG", () => {
    const blocks = buildOfflineContextBlocks(story, 4, "v2");

    expect(blocks.filter(block => block.kind === "recent-full")).toHaveLength(2);
    expect(blocks.find(block => block.chapterNumber === 1)?.kind).toBe("recent-summary");
    expect(blocks.find(block => block.kind === "anchor")?.text).toContain("Final beat 3");
    expect(blocks.some(block => block.kind === "rag")).toBe(false);
    expect(blocks.some(block => block.kind === "arc-summary")).toBe(false);
  });

  it("includes coarse summaries only for arcs completed before the target chapter", () => {
    const withPriorArc = {
      ...story,
      arcs: [
        {
          title: "Prior Arc",
          isCompleted: true,
          summary: "The prior conflict ended.",
          chapters: [{
            number: 0,
            title: "Prologue",
            premise: "Begin.",
            status: "read" as const,
            hasContent: false,
            summary: "The journey began.",
          }],
        },
        ...story.arcs,
      ],
    } as Story;

    const blocks = buildOfflineContextBlocks(withPriorArc, 4, "v2");
    const arcSummaries = blocks
      .filter(block => block.kind === "arc-summary")
      .map(block => block.text);

    expect(arcSummaries).toEqual([
      "Volume 'Prior Arc' Summary: The prior conflict ended.",
    ]);
    expect(arcSummaries.join("\n")).not.toContain("Lin reached the shrine.");
  });

  it("builds distinct v1/v2 prompts and manifests with engine labels", () => {
    const artifacts = buildContextAbArtifacts(story, 4);

    expect(artifacts.v1.prompt).toContain('"characters": [');
    expect(artifacts.v1.prompt).not.toContain("CODEX MEMORY CARDS");
    expect(artifacts.v2.prompt).toContain("CODEX MEMORY CARDS");
    expect(artifacts.v2.prompt).not.toContain('"characters": [');
    expect(artifacts.v1.manifest.engine).toBe("v1");
    expect(artifacts.v2.manifest.engine).toBe("v2");
    expect(artifacts.note).toContain("Offline RAG is intentionally disabled");
  });

  it("filters entities and threads unavailable before the target chapter", () => {
    const snapshot = memorySnapshotForChapter({
      ...story.memory,
      characters: [
        ...(story.memory.characters || []),
        { id: "target", name: "Target Chapter Rival", firstAppeared: 4 },
        { id: "future", name: "Future Rival", firstAppeared: 20 },
      ] as any,
      unresolvedPlotThreads: [
        ...(story.memory.unresolvedPlotThreads || []),
        { description: "Target chapter reveal", originChapter: 4 },
        { description: "Future invasion", originChapter: 20 },
      ] as any,
    }, 4);

    expect(snapshot.characters?.some(character => character.name === "Target Chapter Rival"))
      .toBe(false);
    expect(snapshot.characters?.some(character => character.name === "Future Rival"))
      .toBe(false);
    expect(snapshot.unresolvedPlotThreads).not.toContainEqual(
      expect.objectContaining({ description: "Target chapter reveal" }),
    );
    expect(snapshot.unresolvedPlotThreads).not.toContainEqual(
      expect.objectContaining({ description: "Future invasion" }),
    );
  });
});
