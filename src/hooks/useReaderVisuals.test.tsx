import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useReaderVisuals } from './useReaderVisuals';
import type { MomentousChapterAssessment } from '../lib/chapterMomentousness';

vi.mock('../store/useAppStore', () => ({
  useAppStore: vi.fn((selector) => {
    const mockState = {
      immersion: { imagePopups: true }
    };
    return selector(mockState);
  })
}));

const imageManifest = vi.hoisted(() => ({
  manifestImage: vi.fn(() => Promise.resolve()),
  manifestChapterHero: vi.fn(() => Promise.resolve()),
  generatingIds: new Set<string>(),
}));

vi.mock('./useImageManifest', () => ({
  useImageManifest: () => imageManifest,
}));

// The scorer stays real unless a test installs a stub, so the same file covers
// "the hook reacts to whatever the assessment says" and "real signals still
// produce the real decision".
const momentousness = vi.hoisted(() => ({
  assess: null as null | ((...args: unknown[]) => MomentousChapterAssessment),
}));

vi.mock('../lib/chapterMomentousness', async importOriginal => {
  const actual = await importOriginal<typeof import('../lib/chapterMomentousness')>();
  return {
    ...actual,
    assessMomentousChapter: (...args: unknown[]) =>
      momentousness.assess
        ? momentousness.assess(...args)
        : (actual.assessMomentousChapter as (...a: unknown[]) => MomentousChapterAssessment)(...args),
  };
});

describe('useReaderVisuals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    momentousness.assess = null;
    imageManifest.generatingIds = new Set();
    window.IntersectionObserver = vi.fn().mockImplementation(function() {
      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      };
    }) as any;
  });

  it('correctly initializes visual utilities and codex terms', () => {
    const selectedChapter = {
      number: 1,
      title: "Ch 1",
      premise: "Premise text",
      status: "unread" as const
    };
    const activeStory = {
      id: "story-1",
      title: "Title",
      genre: "Cultivation",
      mcName: "Lin Fan",
      customPremise: "Some premise",
      createdAt: "",
      updatedAt: "",
      currentChapterNumber: 1,
      arcs: [],
      memory: {
        powerSystem: "Qi",
        currentPowerStage: "Foundation",
        worldRules: [],
        characters: [
          {
            id: "char-1",
            name: "Master Xiao",
            role: "Mentor",
            description: "Elder mentor",
            relationshipToMC: "Friendly",
            status: "alive" as const,
            manifestationImportance: {
              narrativeWeight: "major" as const,
              namedStatus: true,
              recurrence: true,
              plotRelevance: true,
            },
          }
        ],
        unresolvedPlotThreads: [],
        resolvedPlotThreads: []
      }
    };

    const { result } = renderHook(() => useReaderVisuals({
      selectedChapter,
      activeStory,
      readerMode: "standard"
    }));

    expect(result.current.generatingRevealId).toBeNull();
    expect(result.current.codexTerms).toBeDefined();
    expect(result.current.codexTerms.length).toBe(1);
    expect(result.current.codexTerms[0].term).toBe("Master Xiao");
  });

  // Highlighting used to be gated on isManifestationEligible — the policy for
  // whether an entity deserves a generated *portrait*. It demands an existing
  // image or an authored manifestationImportance block, which most entities
  // never get, so the reader lost colour-coded names and hovercards entirely.
  it('highlights every named Codex entity, not only portrait-eligible ones', () => {
    const activeStory = {
      id: "story-1",
      title: "Title",
      genre: "Cultivation",
      mcName: "Li Qiye",
      customPremise: "",
      createdAt: "",
      updatedAt: "",
      currentChapterNumber: 1,
      arcs: [],
      memory: {
        powerSystem: "Qi",
        currentPowerStage: "Foundation",
        worldRules: [],
        characters: [
          // No image and no authored importance: the common case.
          { id: "char-1", name: "Li Qiye", role: "MC", description: "", status: "alive" as const },
          // Too short to be a useful highlight target.
          { id: "char-2", name: "Ka", role: "Extra", description: "", status: "alive" as const },
        ],
        locations: [{ id: "loc-1", name: "Mount Cinder", description: "" }],
        artifacts: [{ id: "art-1", name: "Celestial Dew", description: "" }],
        factions: [{ id: "fac-1", name: "Cinder Sect", description: "" }],
        unresolvedPlotThreads: [],
        resolvedPlotThreads: [],
      },
    } as never;

    const { result } = renderHook(() => useReaderVisuals({
      selectedChapter: { number: 1, title: "Ch 1", premise: "", status: "unread" as const },
      activeStory,
      readerMode: "standard",
    }));

    expect(result.current.codexTerms.map(term => term.term).sort()).toEqual([
      "Celestial Dew",
      "Cinder Sect",
      "Li Qiye",
      "Mount Cinder",
    ]);
    expect(result.current.codexTerms.map(term => term.type)).toContain("location");
  });

  // Aliases are extracted, persisted as their own Codex rows and hydrated back,
  // but the reader only ever offered canonical names — so an entity introduced
  // by its alias read as plain prose with no colour, hovercard or reveal card.
  it('highlights persisted aliases against the entity that owns them', () => {
    const rival = {
      id: "char-2",
      name: "Ye Mo",
      role: "Antagonist",
      description: "",
      relationshipToMC: "Rival",
      status: "alive" as const,
      aliases: ["Young Master Ye"],
    };
    const activeStory = {
      id: "story-1",
      title: "Title",
      genre: "Cultivation",
      mcName: "Li Qiye",
      customPremise: "",
      createdAt: "",
      updatedAt: "",
      currentChapterNumber: 1,
      arcs: [],
      memory: {
        powerSystem: "Qi",
        currentPowerStage: "Foundation",
        worldRules: [],
        characters: [rival],
        locations: [{ id: "loc-1", name: "Sky Terrace", description: "", aliases: ["the Terrace"] }],
        unresolvedPlotThreads: [],
        resolvedPlotThreads: [],
      },
    } as never;

    const { result } = renderHook(() => useReaderVisuals({
      selectedChapter: { number: 1, title: "Ch 1", premise: "", status: "unread" as const },
      activeStory,
      readerMode: "standard",
    }));

    const aliasTerm = result.current.codexTerms.find(term => term.term === "Young Master Ye");
    expect(aliasTerm).toMatchObject({ type: "character", isCanonicalName: false });
    expect(aliasTerm?.entry).toBe(rival);
    expect(result.current.codexTerms.find(term => term.term === "the Terrace")?.type)
      .toBe("location");
  });

  describe('momentous chapter assessment', () => {
    // Chapter 3 clears the threshold on its cue signals; chapter 5 clears it on
    // the arc-finale prior alone; chapters 1, 2 and 4 stay flat.
    const arcChapters = [
      { number: 1, title: "Ch 1", premise: "", status: "unread" as const },
      { number: 2, title: "Ch 2", premise: "", status: "unread" as const, cuePayload: { mysticism: 2 } },
      {
        number: 3,
        title: "Ch 3",
        premise: "",
        status: "unread" as const,
        summary: "The seal breaks.",
        cuePayload: { powerShift: 5, danger: 4, mysticism: 6 },
      },
      { number: 4, title: "Ch 4", premise: "", status: "unread" as const },
      { number: 5, title: "Ch 5", premise: "", status: "unread" as const },
    ];

    const storyWithArc = () => ({
      id: "story-1",
      title: "Title",
      genre: "Cultivation",
      mcName: "Li Qiye",
      customPremise: "",
      createdAt: "",
      updatedAt: "",
      currentChapterNumber: 3,
      arcs: [{ title: "Arc 1", chapters: arcChapters, isCompleted: false }],
      memory: {
        powerSystem: "Qi",
        currentPowerStage: "Foundation",
        worldRules: [],
        characters: [],
        unresolvedPlotThreads: [],
        resolvedPlotThreads: [],
      },
    }) as never;

    const renderForChapter = (chapterNumber: number) =>
      renderHook(() => useReaderVisuals({
        selectedChapter: arcChapters.find(c => c.number === chapterNumber) as never,
        activeStory: storyWithArc(),
        readerMode: "standard",
      }));

    it('reports the decision the domain contract returns for real arc signals', () => {
      expect(renderForChapter(3).result.current.isMomentousChapter).toBe(true);
      expect(renderForChapter(5).result.current.isMomentousChapter).toBe(true);
      expect(renderForChapter(1).result.current.isMomentousChapter).toBe(false);
      expect(renderForChapter(2).result.current.isMomentousChapter).toBe(false);
    });

    // The hook must own no weighting of its own: flipping only the assessment
    // result flips the hook, with the underlying signals held constant.
    it('follows the assessment result rather than recomputing it', () => {
      momentousness.assess = vi.fn(() => ({ isMomentous: true, score: 0, reasons: [] }));
      expect(renderForChapter(1).result.current.isMomentousChapter).toBe(true);

      momentousness.assess = vi.fn(() => ({ isMomentous: false, score: 999, reasons: [] }));
      expect(renderForChapter(3).result.current.isMomentousChapter).toBe(false);
    });

    it('hands the contract the adapted arc signals and the selected chapter number', () => {
      const assess = vi.fn(() => ({ isMomentous: false, score: 0, reasons: [] }));
      momentousness.assess = assess;

      renderForChapter(3);

      expect(assess).toHaveBeenCalledWith(
        {
          chapters: [
            { number: 1, chapterCue: undefined, blocks: undefined },
            { number: 2, chapterCue: { mysticism: 2 }, blocks: undefined },
            { number: 3, chapterCue: { powerShift: 5, danger: 4, mysticism: 6 }, blocks: undefined },
            { number: 4, chapterCue: undefined, blocks: undefined },
            { number: 5, chapterCue: undefined, blocks: undefined },
          ],
        },
        3,
      );
    });

    it('is not momentous when the chapter belongs to no arc', () => {
      const { result } = renderHook(() => useReaderVisuals({
        selectedChapter: { number: 99, title: "Orphan", premise: "", status: "unread" as const } as never,
        activeStory: storyWithArc(),
        readerMode: "standard",
      }));

      expect(result.current.isMomentousChapter).toBe(false);
    });

    // Legacy and partially hydrated stories reach the Reader with these
    // collections missing or holding a non-array; the lookup must degrade to
    // "not momentous" rather than throwing during render.
    it.each([
      { name: 'a missing arc collection', arcs: undefined },
      { name: 'a non-array arc collection', arcs: { 0: { chapters: [] } } },
      { name: 'an arc with a missing chapter collection', arcs: [{ title: "Arc 1" }] },
      { name: 'an arc with a non-array chapter collection', arcs: [{ title: "Arc 1", chapters: {} }] },
      { name: 'an arc holding a null chapter', arcs: [{ title: "Arc 1", chapters: [null] }] },
    ])('degrades gracefully for $name', ({ arcs }) => {
      const story = { ...(storyWithArc() as object), arcs } as never;

      const render = () => renderHook(() => useReaderVisuals({
        selectedChapter: arcChapters[2] as never,
        activeStory: story,
        readerMode: "standard",
      }));

      expect(render).not.toThrow();
      expect(render().result.current.isMomentousChapter).toBe(false);
    });

    it('gates hero generation on the assessment result', () => {
      renderForChapter(3).result.current.triggerHeroGeneration();
      expect(imageManifest.manifestChapterHero).toHaveBeenCalledWith(3, expect.stringContaining("The seal breaks."));

      imageManifest.manifestChapterHero.mockClear();
      renderForChapter(1).result.current.triggerHeroGeneration();
      expect(imageManifest.manifestChapterHero).not.toHaveBeenCalled();

      // Suppressing the assessment suppresses the generation call, so image
      // frequency and cost track the contract and nothing else.
      momentousness.assess = vi.fn(() => ({ isMomentous: false, score: 0, reasons: [] }));
      imageManifest.manifestChapterHero.mockClear();
      renderForChapter(3).result.current.triggerHeroGeneration();
      expect(imageManifest.manifestChapterHero).not.toHaveBeenCalled();
    });
  });
});
