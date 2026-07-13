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

  it("writes the stream manifest before the first prose chunk and logs numeric breakdowns", async () => {
    const handler = getHandler("/api/generate-chapter-stream");
    const { response, writes } = createResponse();

    await handler(
      { body: requestBody, header: vi.fn() },
      response,
    );

    const firstEvent = JSON.parse(writes[0].slice("data: ".length).trim());
    expect(firstEvent.contextManifest.sections).toHaveLength(8);
    expect(firstEvent.contextManifest.sections.map((section: any) => section.key)).toEqual([
      "pinnedRules",
      "premise",
      "anchor",
      "recentChapters",
      "entityCards",
      "threads",
      "rag",
      "arcSummaries",
    ]);
    expect(writes[1]).toContain("generated prose");

    const loggedManifest = mocks.loggerInfo.mock.calls[0][0].contextManifest;
    expect(loggedManifest.sections).toHaveLength(8);
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
        route: "generate-chapter",
        chapterNumber: 2,
        sections: expect.arrayContaining([
          expect.objectContaining({ key: "entityCards" }),
        ]),
      }),
    }));
  });
});
