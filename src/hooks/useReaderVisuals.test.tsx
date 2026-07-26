import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useReaderVisuals } from './useReaderVisuals';

vi.mock('../store/useAppStore', () => ({
  useAppStore: vi.fn((selector) => {
    const mockState = {
      immersion: { imagePopups: true }
    };
    return selector(mockState);
  })
}));

vi.mock('./useImageManifest', () => ({
  useImageManifest: () => ({
    manifestImage: vi.fn(),
    manifestChapterHero: vi.fn(),
    generatingIds: new Set()
  })
}));

describe('useReaderVisuals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
