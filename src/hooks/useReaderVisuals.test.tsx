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
          { id: "char-1", name: "Master Xiao", role: "Mentor", description: "Elder mentor", relationshipToMC: "Friendly", status: "alive" as const }
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
});
