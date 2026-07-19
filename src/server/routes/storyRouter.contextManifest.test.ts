import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loggerInfo: vi.fn(),
  routeTextGeneration: vi.fn(),
  routeTextGenerationStream: vi.fn(),
}));

vi.mock("../../aiRouter", () => ({
  ROUTER_PRESETS: {},
  routeImageGeneration: vi.fn(),
  routeTextGeneration: mocks.routeTextGeneration,
  routeTextGenerationStream: mocks.routeTextGenerationStream,
}));

vi.mock("../logger", () => ({
  logger: {
    info: mocks.loggerInfo,
  },
}));

import { storyRouter } from "./storyRouter";

const requestBody = {
  mcName: "Lin",
  genre: "Xianxia",
  customPremise: "A wandering cultivator seeks the Moon Sword.",
  memory: {
    powerSystem: "Nine ranks",
    currentPowerStage: "First rank",
    worldRules: ["Steel remembers its wielder"],
    abilities: [],
    characters: [{
      id: "lin",
      name: "Lin",
      role: "Protagonist",
      description: "A wanderer",
      relationshipToMC: "Self",
      status: "Alive",
    }],
    factions: [],
    locations: [],
    artifacts: [{
      id: "moon-sword",
      name: "Moon Sword",
      description: "A silver blade",
      imageHistory: [{ imageUrl: "data:image/png;base64,heavy-payload" }],
      embedding: [0.1, 0.2, 0.3],
    }],
    unresolvedPlotThreads: ["Find the Moon Sword"],
    resolvedPlotThreads: [],
  },
  pastSummaries: [
    "--- SLIDING WINDOW OF RECENT NARRATIVE BLOCKS/DIALOGUE ---",
    "Chapter 1:\nLin reached the shrine.",
    "--- IMMEDIATE CONTINUATION ANCHOR (FINAL MOMENTS OF CHAPTER 1) ---\nThe stone door opened.",
  ],
  currentChapter: {
    number: 2,
    title: "The Hidden Blade",
    premise: "Enter the shrine and find the sword.",
  },
  fatePressure: "Balanced",
};

const getHandler = (path: string) => {
  const layer = (storyRouter as any).stack.find(
    (candidate: any) => candidate.route?.path === path,
  );
  const routeStack = layer?.route?.stack || [];
  return routeStack[routeStack.length - 1]?.handle as (req: any, res: any) => Promise<void>;
};

const createResponse = () => {
  const writes: string[] = [];
  const response: any = {
    json: vi.fn(),
    end: vi.fn(),
    setHeader: vi.fn(),
    status: vi.fn(),
    write: vi.fn((value: string) => {
      writes.push(value);
      return true;
    }),
  };
  response.status.mockReturnValue(response);
  return { response, writes };
};

describe("storyRouter context manifest contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.routeTextGeneration.mockResolvedValue({
      chapterText: "Generated chapter text",
      summary: "Summary",
    });
    mocks.routeTextGenerationStream.mockReturnValue((async function* () {
      yield "generated prose";
    })());
  });

  it("uses v2 by default and writes its manifest before the first prose chunk", async () => {
    const handler = getHandler("/api/generate-chapter-stream");
    const { response, writes } = createResponse();

    await handler(
      { body: requestBody, header: vi.fn() },
      response,
    );

    const firstEvent = JSON.parse(writes[0].slice("data: ".length).trim());
    expect(firstEvent.contextManifest.engine).toBe("v2");
    expect(firstEvent.contextManifest.sections).toHaveLength(9);
    expect(firstEvent.contextManifest.sections.map((section: any) => section.key)).toEqual([
      "pinnedRules",
      "premise",
      "chapterContract",
      "anchor",
      "recentChapters",
      "entityCards",
      "threads",
      "rag",
      "arcSummaries",
    ]);
    expect(writes[1]).toContain("generated prose");

    const loggedManifest = mocks.loggerInfo.mock.calls[0][0].contextManifest;
    const prompt = mocks.routeTextGenerationStream.mock.calls[0][2];
    expect(prompt).toContain("CODEX MEMORY CARDS");
    expect(prompt).not.toContain('"characters": [');
    expect(loggedManifest.sections).toHaveLength(9);
    expect(JSON.stringify(loggedManifest)).not.toContain("Moon Sword");
  });

  it("returns the manifest alongside the legacy JSON chapter response", async () => {
    const handler = getHandler("/api/generate-chapter");
    const { response } = createResponse();

    await handler(
      { body: requestBody, header: vi.fn() },
      response,
    );

    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      chapterText: "Generated chapter text",
      contextManifest: expect.objectContaining({
        engine: "v2",
        route: "generate-chapter",
        chapterNumber: 2,
        sections: expect.arrayContaining([
          expect.objectContaining({ key: "entityCards" }),
        ]),
      }),
    }));
  });

  it("keeps v2 active for legacy v1 requests and string history", async () => {
    const handler = getHandler("/api/generate-chapter");
    const firstResponse = createResponse().response;
    const secondResponse = createResponse().response;

    await handler(
      {
        body: { ...requestBody, contextEngine: "v1" },
        header: vi.fn(),
      },
      firstResponse,
    );
    await handler(
      {
        body: {
          ...requestBody,
          contextEngine: "v1",
          pastSummaries: [
            {
              kind: "recent-full",
              chapterNumber: 1,
              text: "Chapter 1:\nLin reached the shrine.",
            },
            {
              kind: "anchor",
              chapterNumber: 1,
              text: "The stone door opened.",
            },
          ],
        },
        header: vi.fn(),
      },
      secondResponse,
    );

    expect(mocks.routeTextGeneration.mock.calls[1][2])
      .toBe(mocks.routeTextGeneration.mock.calls[0][2]);
    expect(mocks.routeTextGeneration.mock.calls[0][2])
      .toContain("CONTEXT ENGINE V2 ASSEMBLY");
  });

  it("uses cards, the unified budgeter, and truthful tier labels on v2", async () => {
    const handler = getHandler("/api/generate-chapter-stream");
    const { response, writes } = createResponse();

    await handler(
      {
        body: {
          ...requestBody,
          contextEngine: "v2",
        },
        header: vi.fn(),
      },
      response,
    );

    const firstEvent = JSON.parse(writes[0].slice("data: ".length).trim());
    const prompt = mocks.routeTextGenerationStream.mock.calls[0][2];
    const entitySection = firstEvent.contextManifest.sections.find(
      (section: any) => section.key === "entityCards",
    );

    expect(firstEvent.contextManifest.engine).toBe("v2");
    expect(firstEvent.contextManifest.memoryAndHistoryBudgetTokens).toBe(24000);
    expect(firstEvent.contextManifest.memoryAndHistoryEstimatedTokens)
      .toBeLessThanOrEqual(24000);
    expect(prompt).toContain("CODEX MEMORY CARDS");
    expect(prompt).toContain("Moon Sword");
    expect(prompt).not.toContain('"characters": [');
    expect(prompt).not.toContain("imageHistory");
    expect(prompt).not.toContain("heavy-payload");
    expect(entitySection.includedItems).toEqual(expect.arrayContaining([
      expect.stringMatching(/\((?:full|brief)\)$/),
    ]));
  });

  it("uses v2 cards in non-stream chapter, next-directions, and steer-arc prompts", async () => {
    const requests = [
      {
        path: "/api/generate-chapter",
        body: { ...requestBody, contextEngine: "v2" },
      },
      {
        path: "/api/generate-next-directions",
        body: {
          ...requestBody,
          currentChapter: undefined,
          contextEngine: "v2",
        },
      },
      {
        path: "/api/steer-arc",
        body: {
          ...requestBody,
          currentChapter: undefined,
          steerDirection: "continue",
          userCustomDirections: "Follow the opened stone door.",
          contextEngine: "v2",
        },
      },
    ];

    for (const request of requests) {
      vi.clearAllMocks();
      mocks.routeTextGeneration.mockResolvedValue({
        chapterText: "Generated chapter text",
        summary: "Summary",
      });
      const handler = getHandler(request.path);
      const { response } = createResponse();

      await handler(
        { body: request.body, header: vi.fn() },
        response,
      );

      const prompt = mocks.routeTextGeneration.mock.calls[0][2];
      expect(prompt, request.path).toContain("CODEX MEMORY CARDS");
      expect(prompt, request.path).not.toContain('"characters": [');
      expect(prompt, request.path).not.toContain("imageHistory");
    }
  });
});
