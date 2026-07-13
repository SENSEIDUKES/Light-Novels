import { describe, expect, it } from "vitest";
import { StoryWorld } from "../../../types";
import { InMemoryFallbackAdapter } from "../inMemoryAdapter";

const story = (userId: string): StoryWorld => ({
  id: "same",
  userId,
  title: userId,
  genre: "Fantasy",
  mcName: "Hero",
  customPremise: "Premise",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  currentChapterNumber: 1,
  memory: {
    powerSystem: "",
    characters: [],
    currentPowerStage: "",
    worldRules: [],
    unresolvedPlotThreads: [],
    resolvedPlotThreads: [],
  },
  arcs: [],
});

describe("InMemoryFallbackAdapter account namespaces", () => {
  it("keeps same-id records isolated and clears only the active account", async () => {
    const adapter = new InMemoryFallbackAdapter();
    adapter.setAccountScope("account-a");
    await adapter.saveStory(story("account-a"));
    await adapter.saveChapterContent({
      storyId: "same",
      chapterNumber: 1,
      generatedContent: "A chapter",
    });
    adapter.setAccountScope("account-b");
    await adapter.saveStory(story("account-b"));
    await adapter.saveChapterContent({
      storyId: "same",
      chapterNumber: 1,
      generatedContent: "B chapter",
    });

    adapter.setAccountScope("account-a");
    await adapter.clearAll();
    await expect(adapter.getStory("same")).resolves.toBeNull();
    await expect(adapter.getChapterContent("same", 1)).resolves.toBeNull();

    adapter.setAccountScope("account-b");
    await expect(adapter.getStory("same")).resolves.toMatchObject({
      title: "account-b",
    });
    await expect(adapter.getChapterContent("same", 1)).resolves.toMatchObject({
      generatedContent: "B chapter",
    });
  });

  it("does not expose or claim an orphan unowned chapter", async () => {
    const adapter = new InMemoryFallbackAdapter();
    await adapter.saveChapterContent({
      storyId: "same",
      chapterNumber: 1,
      generatedContent: "Orphan",
    });
    adapter.setAccountScope("account-a");
    await adapter.saveStory(story("account-a"));

    await expect(adapter.getChapterContent("same", 1)).resolves.toBeNull();
    adapter.setAccountScope("account-b");
    await expect(adapter.getChapterContent("same", 1)).resolves.toBeNull();
  });
});
