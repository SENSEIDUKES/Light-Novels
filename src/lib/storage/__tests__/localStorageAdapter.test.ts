import { beforeEach, describe, expect, it } from "vitest";
import { ChapterContent, StoryWorld } from "../../../types";
import { LocalStorageFallbackAdapter } from "../localStorageAdapter";

const makeStory = (
  id: string,
  title: string,
  userId?: string,
): StoryWorld => ({
  id,
  userId,
  title,
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

const makeChapter = (storyId: string, text: string): ChapterContent => ({
  storyId,
  chapterNumber: 1,
  generatedContent: text,
});

describe("LocalStorageFallbackAdapter account namespaces", () => {
  beforeEach(() => localStorage.clear());

  it("keeps identical story and chapter ids isolated across accounts", async () => {
    const adapter = new LocalStorageFallbackAdapter();
    await adapter.init();

    adapter.setAccountScope("account-a");
    await adapter.saveStory(makeStory("shared-id", "Account A", "account-a"));
    await adapter.saveChapterContent(makeChapter("shared-id", "A chapter"));

    adapter.setAccountScope("account-b");
    await adapter.saveStory({
      ...makeStory("shared-id", "Account B", "account-b"),
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
    await adapter.saveChapterContent(makeChapter("shared-id", "B chapter"));

    adapter.setAccountScope("account-a");
    await expect(adapter.getStory("shared-id")).resolves.toMatchObject({
      title: "Account A",
      userId: "account-a",
    });
    await expect(adapter.getChapterContent("shared-id", 1)).resolves.toMatchObject({
      generatedContent: "A chapter",
    });

    adapter.setAccountScope("account-b");
    await expect(adapter.getStory("shared-id")).resolves.toMatchObject({
      title: "Account B",
      userId: "account-b",
    });
    await expect(adapter.getChapterContent("shared-id", 1)).resolves.toMatchObject({
      generatedContent: "B chapter",
    });

    const unscoped = new LocalStorageFallbackAdapter();
    await unscoped.init();
    await expect(unscoped.getStories()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "shared-id", userId: "account-a" }),
        expect.objectContaining({ id: "shared-id", userId: "account-b" }),
      ]),
    );
    expect(await unscoped.getStories()).toHaveLength(2);
    await expect(unscoped.getStory("shared-id")).resolves.toMatchObject({
      title: "Account B",
    });
    await expect(unscoped.getChapterContent("shared-id", 1)).resolves.toMatchObject({
      generatedContent: "B chapter",
    });
    await expect(unscoped.getAllChapterContents()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: "account-a",
          content: expect.objectContaining({ generatedContent: "A chapter" }),
        }),
        expect.objectContaining({
          userId: "account-b",
          content: expect.objectContaining({ generatedContent: "B chapter" }),
        }),
      ]),
    );
    expect(await unscoped.getAllChapterContents()).toHaveLength(2);
  });

  it("hides account-owned stories and chapters in the signed-out privacy scope", async () => {
    const adapter = new LocalStorageFallbackAdapter();
    await adapter.init();
    adapter.setAccountScope("account-a");
    await adapter.saveStory(makeStory("private", "Private", "account-a"));
    await adapter.saveChapterContent(makeChapter("private", "Private chapter"));

    adapter.setAccountScope(null);

    await expect(adapter.getStories()).resolves.toEqual([]);
    await expect(adapter.getStory("private")).resolves.toBeNull();
    await expect(adapter.getChapterContent("private", 1)).resolves.toBeNull();
  });

  it("exposes an unowned legacy story for claim and removes its raw duplicate", async () => {
    localStorage.setItem(
      "@seihouse/fiction-generator-stories-v2",
      JSON.stringify([makeStory("legacy", "Legacy")]),
    );
    localStorage.setItem(
      "@seihouse/fiction-generator-chapters-v2",
      JSON.stringify([makeChapter("legacy", "Legacy chapter")]),
    );
    const adapter = new LocalStorageFallbackAdapter();
    await adapter.init();
    adapter.setAccountScope("account-a");

    const legacy = await adapter.getStory("legacy");
    expect(legacy).toMatchObject({ title: "Legacy" });
    expect(legacy?.userId).toBeUndefined();
    await adapter.saveStory({ ...legacy!, userId: "account-a" });

    expect(
      JSON.parse(
        localStorage.getItem("@seihouse/fiction-generator-stories-v2") || "[]",
      ),
    ).toEqual([]);
    expect(
      JSON.parse(
        localStorage.getItem("@seihouse/fiction-generator-chapters-v2") || "[]",
      ),
    ).toEqual([]);
    await expect(adapter.getChapterContent("legacy", 1)).resolves.toMatchObject({
      generatedContent: "Legacy chapter",
    });

    adapter.setAccountScope("account-b");
    await expect(adapter.getStory("legacy")).resolves.toBeNull();
    await expect(adapter.getChapterContent("legacy", 1)).resolves.toBeNull();
  });

  it("migrates existing user-owned v2 rows into their account namespace", async () => {
    localStorage.setItem(
      "@seihouse/fiction-generator-stories-v2",
      JSON.stringify([makeStory("owned", "Owned", "account-a")]),
    );
    localStorage.setItem(
      "@seihouse/fiction-generator-chapters-v2",
      JSON.stringify([makeChapter("owned", "Owned chapter")]),
    );
    const adapter = new LocalStorageFallbackAdapter();
    await adapter.init();

    expect(
      JSON.parse(
        localStorage.getItem("@seihouse/fiction-generator-stories-v2") || "[]",
      ),
    ).toEqual([]);
    adapter.setAccountScope("account-a");
    await expect(adapter.getStory("owned")).resolves.toMatchObject({
      userId: "account-a",
    });
    await expect(adapter.getChapterContent("owned", 1)).resolves.toMatchObject({
      generatedContent: "Owned chapter",
    });

    adapter.setAccountScope(null);
    await expect(adapter.getStory("owned")).resolves.toBeNull();
  });

  it("uses the scope captured when an operation starts", async () => {
    const adapter = new LocalStorageFallbackAdapter();
    await adapter.init();
    adapter.setAccountScope("account-a");
    await adapter.saveStory(makeStory("same", "A", "account-a"));
    await adapter.saveChapterContent(makeChapter("same", "A chapter"));
    adapter.setAccountScope("account-b");
    await adapter.saveStory(makeStory("same", "B", "account-b"));
    await adapter.saveChapterContent(makeChapter("same", "B chapter"));

    adapter.setAccountScope("account-a");
    const stories = adapter.getStories();
    const chapter = adapter.getChapterContent("same", 1);
    adapter.setAccountScope("account-b");

    await expect(stories).resolves.toEqual([
      expect.objectContaining({ title: "A" }),
    ]);
    await expect(chapter).resolves.toEqual(
      expect.objectContaining({ generatedContent: "A chapter" }),
    );
  });
});
