import { describe, expect, it } from "vitest";
import type { StoryWorld } from "../../types";
import { applyStoryPatch, createStoryPatch } from "./storyPatch";

function story(): StoryWorld {
  return {
    id: "story-1",
    userId: "reader-a",
    title: "Bounded",
    genre: "Xianxia",
    mcName: "Lin",
    customPremise: "A compact write.",
    createdAt: "2026-07-23T00:00:00.000Z",
    updatedAt: "2026-07-23T00:00:00.000Z",
    currentChapterNumber: 100,
    memory: {
      powerSystem: "Qi",
      currentPowerStage: "Mortal",
      worldRules: [],
      characters: Array.from({ length: 40 }, (_, index) => ({
        id: `character-${index}`,
        name: `Character ${index}`,
        role: "support",
        description: `Description ${index}`,
        status: "alive",
        relationshipToMC: "ally",
      })),
      unresolvedPlotThreads: [],
      resolvedPlotThreads: [],
    },
    arcs: [{
      title: "Arc",
      isCompleted: false,
      chapters: Array.from({ length: 100 }, (_, index) => ({
        number: index + 1,
        title: `Chapter ${index + 1}`,
        premise: `Premise ${index + 1}`,
        status: "unlocked",
        hasContent: true,
      })),
    }],
  };
}

describe("storyPatch", () => {
  it("encodes a one-entity Codex edit without retransmitting the 100-chapter graph", () => {
    const previous = story();
    const next = structuredClone(previous);
    next.updatedAt = "2026-07-23T00:01:00.000Z";
    next.memory.characters[12].description = "Changed once.";

    const patch = createStoryPatch(previous, next);

    expect(applyStoryPatch(previous, patch)).toEqual(next);
    expect(JSON.stringify(patch).length).toBeLessThan(300);
    expect(JSON.stringify(patch)).not.toContain("Chapter 100");
  });

  it("uses a single array add for an appended chapter", () => {
    const previous = story();
    const next = structuredClone(previous);
    next.arcs[0].chapters.push({
      number: 101,
      title: "Chapter 101",
      premise: "A new edge.",
      status: "unread",
      hasContent: false,
    });

    const patch = createStoryPatch(previous, next);

    expect(applyStoryPatch(previous, patch)).toEqual(next);
    expect(patch.filter((operation) => operation.path.includes("/chapters/"))).toHaveLength(1);
  });

  it("rejects prototype-polluting paths", () => {
    expect(() => applyStoryPatch(story(), [
      { op: "add", path: "/__proto__/polluted", value: true },
    ])).toThrow(/forbidden/);
  });
});
