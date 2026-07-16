import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Chapter, ContextManifest, Story } from "../../types";
import { streamChapterBlocks } from "./streamChapterBlocks";

const story = {
  id: "story-1",
  title: "Test",
  genre: "Xianxia",
  mcName: "Lin",
  customPremise: "A journey",
  memory: {
    powerSystem: "Ranks",
    currentPowerStage: "First",
    worldRules: [],
    characters: [],
    unresolvedPlotThreads: [],
    resolvedPlotThreads: [],
  },
  arcs: [],
} as unknown as Story;

const chapter = {
  number: 2,
  title: "The Gate",
  premise: "Open it",
  status: "unlocked",
} as Chapter;

const manifest: ContextManifest = {
  version: 1,
  route: "generate-chapter-stream",
  generatedAt: "2026-07-12T00:00:00.000Z",
  chapterNumber: 2,
  totalEstimatedTokens: 100,
  memoryAndHistoryBudgetTokens: 80000,
  memoryAndHistoryEstimatedTokens: 50,
  memoryAndHistoryBudgetExceeded: false,
  providerInputTruncated: false,
  sections: [],
};

const mockStream = (parts: Array<string | Uint8Array>) => {
  const encoder = new TextEncoder();
  const read = vi.fn();
  parts.forEach(part => {
    read.mockResolvedValueOnce({
      done: false,
      value: typeof part === "string" ? encoder.encode(part) : part,
    });
  });
  read.mockResolvedValueOnce({ done: true, value: undefined });
  vi.mocked(fetch).mockResolvedValue({
    ok: true,
    body: { getReader: () => ({ read }) },
  } as any);
};

describe("streamChapterBlocks", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("captures a fragmented context manifest event without mixing it into prose", async () => {
    const unicodeManifest: ContextManifest = {
      ...manifest,
      sections: [{
        key: "entityCards",
        label: "Entity cards",
        estimatedTokens: 10,
        includedItemCount: 0,
        availableItemCount: 1,
        includedItems: [],
        omittedItems: ["Artifact: 青龙剑"],
        truncated: true,
        omissionReason: "relevance_or_cap",
      }],
    };
    const payload = `data: ${JSON.stringify({ contextManifest: unicodeManifest })}\n\n` +
      `data: ${JSON.stringify({ chunk: '{"id":"p1","type":"paragraph","text":"Opening line."}\n' })}\n\n` +
      "data: [DONE]\n\n";
    const encoder = new TextEncoder();
    const bytes = encoder.encode(payload);
    const swordBytes = encoder.encode("剑");
    const swordStart = bytes.findIndex((value, index) =>
      value === swordBytes[0] && swordBytes.every((byte, offset) => bytes[index + offset] === byte),
    );
    const firstDelimiter = bytes.findIndex((value, index) => value === 10 && bytes[index + 1] === 10);
    mockStream([
      bytes.slice(0, 3),
      bytes.slice(3, swordStart + 1),
      bytes.slice(swordStart + 1, firstDelimiter + 1),
      bytes.slice(firstDelimiter + 1),
    ]);

    const result = await streamChapterBlocks(
      story,
      chapter,
      [],
      "",
      {},
      { "Content-Type": "application/json" },
      vi.fn(),
    );

    expect(result.contextManifest).toEqual(unicodeManifest);
    expect(result.accumulatedRaw).toBe('{"id":"p1","type":"paragraph","text":"Opening line."}\n');
  });

  it("remains compatible with streams that do not include a manifest", async () => {
    mockStream([
      `data: ${JSON.stringify({ chunk: "Legacy prose" })}\n\n`,
      "data: [DONE]\n\n",
    ]);

    const result = await streamChapterBlocks(
      story,
      chapter,
      [],
      "",
      {},
      {},
      vi.fn(),
    );

    expect(result.contextManifest).toBeUndefined();
    expect(result.accumulatedRaw).toBe("Legacy prose");
  });

  it.each([
    ["v1 when the story preference is absent", story, "v1"],
    [
      "v2 when the story preference enables it",
      {
        ...story,
        readerPreferences: { contextEngine: "v2" },
      } as Story,
      "v2",
    ],
  ])("sends contextEngine as %s", async (_label, activeStory, expectedEngine) => {
    mockStream(["data: [DONE]\n\n"]);

    await streamChapterBlocks(
      activeStory,
      chapter,
      [],
      "",
      {},
      {},
      vi.fn(),
    );

    const requestBody = JSON.parse(
      String(vi.mocked(fetch).mock.calls[0][1]?.body),
    );
    expect(requestBody.contextEngine).toBe(expectedEngine);
  });
});
