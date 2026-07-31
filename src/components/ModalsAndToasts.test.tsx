import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { ModalsAndToasts } from './ModalsAndToasts';
import {
  ACTIVE_GENERATION_STORAGE_KEY,
  writeGenerationRecoverySnapshot,
} from '../lib/generationRecovery';

vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>();
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  };
});

const { handleGenerateChapterMock } = vi.hoisted(() => ({
  handleGenerateChapterMock: vi.fn(),
}));

vi.mock('../hooks/useStoryEngine', () => ({
  useStoryEngine: () => ({ handleGenerateChapter: handleGenerateChapterMock }),
}));

const { useAppStoreMock } = vi.hoisted(() => {
  const state = {
    authModalOpen: false,
    setAuthModalOpen: vi.fn(),
    quotaModalOpen: false,
    setQuotaModalOpen: vi.fn(),
    isSettingsOpen: false,
    setIsSettingsOpen: vi.fn(),
    storageType: 'indexeddb',
    setStorageType: vi.fn(),
    localGeminiKey: '',
    setLocalGeminiKey: vi.fn(),
    localOpenrouterKey: '',
    setLocalOpenrouterKey: vi.fn(),
    localOllamaHost: '',
    setLocalOllamaHost: vi.fn(),
    readerMode: 'zen',
    setReaderMode: vi.fn(),
    themeMode: 'dark',
    setThemeMode: vi.fn(),
    currentScreen: 'home',
    canShowRelicInReader: true,
    pendingRelicQueue: [],
    enqueueRelicReveal: vi.fn(),
    popPendingRelic: vi.fn(() => null),
    setCanShowRelicInReader: vi.fn(),
    routingConfig: {
      storyMaker: { provider: 'google' },
      imageGenerator: { provider: 'google' }
    },
    setRoutingConfig: vi.fn(),
    // The reader has navigated on to story B since the interrupted run.
    activeStoryId: 'story-b',
    selectedChapterNum: 1,
    draftRecoverySession: null as { storyId: string; chapterNumber: number } | null,
    setDraftRecoverySession: vi.fn(),
    setActiveStoryId: vi.fn(),
    setSelectedChapterNum: vi.fn(),
    setCurrentScreen: vi.fn(),
  };
  const mock: any = (selector?: any) => selector ? selector(state) : state;
  mock.setState = vi.fn();
  mock.getState = () => state;
  return { useAppStoreMock: mock };
});

vi.mock('../store/useAppStore', () => ({
  useAppStore: useAppStoreMock
}));

vi.mock('./ParticleEffect', () => ({
  ParticleEffect: ({ accent }: { accent?: string }) => (
    <canvas data-testid="celestial-particle-shower" data-accent={accent} />
  )
}));

describe('ModalsAndToasts', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ModalsAndToasts />
    );
    expect(container).toBeDefined();
  });
});

describe('Draft recovery offer', () => {
  const state = useAppStoreMock.getState();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // The frozen snapshot names story A, chapter 12 — the run that was in
    // flight when the tab died, not the story open now.
    state.draftRecoverySession = { storyId: 'story-a', chapterNumber: 12 };
    writeGenerationRecoverySnapshot({
      runId: 'run-interrupted',
      userId: 'reader-a',
      storyId: 'story-a',
      chapterNumber: 12,
      timestamp: Date.now(),
    });
  });

  afterEach(() => {
    state.draftRecoverySession = null;
  });

  it('restores the frozen story and chapter, not wherever the reader is now', () => {
    const { getByRole, getByText, unmount } = render(<ModalsAndToasts />);

    getByText(/interrupted draft for Chapter 12/);
    fireEvent.click(getByRole('button', { name: 'Restore Draft' }));

    expect(state.setActiveStoryId).toHaveBeenCalledWith('story-a');
    expect(state.setSelectedChapterNum).toHaveBeenCalledWith(12);
    expect(state.setCurrentScreen).toHaveBeenCalledWith('reader');
    expect(handleGenerateChapterMock).toHaveBeenCalledWith(12);
    expect(state.setDraftRecoverySession).toHaveBeenCalledWith(null);
    unmount();
  });

  it('discards the frozen snapshot when the reader declines', () => {
    const { getByRole, unmount } = render(<ModalsAndToasts />);

    fireEvent.click(getByRole('button', { name: 'Discard' }));

    expect(localStorage.getItem(ACTIVE_GENERATION_STORAGE_KEY)).toBeNull();
    expect(state.setDraftRecoverySession).toHaveBeenCalledWith(null);
    expect(handleGenerateChapterMock).not.toHaveBeenCalled();
    unmount();
  });
});

describe('Relic reveal — rarity ranks', () => {
  const ALL_RARITIES = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Transcendent'] as const;

  const revealArtifact = async (rarity: string) => {
    const utils = render(<ModalsAndToasts />);
    act(() => {
      window.dispatchEvent(new CustomEvent('seihouse-artifact-unlocked', {
        detail: {
          artifact: {
            id: `art-${rarity}`,
            name: `${rarity} Test Relic`,
            description: 'A relic used to verify rank rendering.',
            rarity,
            rewardValueQi: 100,
          }
        }
      }));
    });
    // Wait past the 3s mystery-card reveal timer.
    act(() => {
      vi.advanceTimersByTime(3200);
    });
    return utils;
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(ALL_RARITIES.map(r => [r]))('produces and renders a %s relic with compact reward boxes', async (rarity) => {
    const { getByText, unmount } = await revealArtifact(rarity);

    // Rarity label on the card header
    getByText(`${rarity} Relic`);
    // Compact "VALUE | LABEL" reward boxes (exact match = the box, not the header)
    getByText('+100');
    getByText('QI');
    getByText(rarity, { exact: true });
    getByText('Relic', { exact: true });

    unmount();
  });

  it('opens, displays, and closes the relic reveal with the rarity-themed celestial backdrop', async () => {
    const {
      container,
      getByRole,
      getByTestId,
      getByText,
      queryByText,
      unmount,
    } = await revealArtifact('Legendary');

    getByText('Legendary Test Relic');
    const particleCanvas = getByTestId('celestial-particle-shower');
    expect(particleCanvas.getAttribute('data-accent')).toBe('#f59e0b');
    expect(container.querySelector('[data-celestial-foreground]')).not.toBeNull();

    vi.useRealTimers();
    fireEvent.click(getByRole('button', { name: 'Claim Relic' }));

    await waitFor(() => {
      expect(queryByText('Legendary Test Relic')).toBeNull();
    });
    unmount();
  });
});
