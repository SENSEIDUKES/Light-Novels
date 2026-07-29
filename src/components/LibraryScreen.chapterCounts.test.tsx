import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LibraryScreen } from './LibraryScreen';

const state = vi.hoisted(() => ({
  current: {
    currentScreen: 'home',
    setCurrentScreen: vi.fn(),
    stories: [] as any[],
    setActiveStoryId: vi.fn(),
    setStoryToDelete: vi.fn(),
    userProfile: { qi: 0 },
    syncStatus: 'synced' as string,
  },
}));

vi.mock('../store/useAppStore', () => ({
  useAppStore: Object.assign(
    (selector: any) => selector(state.current),
    {
      getState: () => state.current,
      setState: (partial: any) => {
        state.current = {
          ...state.current,
          ...(typeof partial === 'function' ? partial(state.current) : partial),
        };
      },
    },
  ),
}));

/** Exactly what `listStories` returns for a story this device has not opened. */
function catalogSummary(overrides: Record<string, unknown> = {}) {
  return {
    id: 'story-1',
    title: 'Ashen Sovereign',
    genre: 'Xianxia',
    mcName: 'Hero',
    updatedAt: '2026-07-01T00:00:00.000Z',
    persistenceHydration: 'summary',
    memory: { currentPowerStage: 'Novice stage', characters: [] },
    arcs: [],
    totalChapterCount: 10,
    generatedChapterCount: 1,
    ...overrides,
  };
}

const openMyLibrary = () =>
  fireEvent.click(screen.getByRole('button', { name: /My Library/ }));

describe('Library card chapter progress', () => {
  beforeEach(() => {
    state.current = { ...state.current, stories: [], syncStatus: 'synced' };
  });

  /**
   * Regression: a restored story is a catalog summary with no arcs, so counting
   * arcs alone rendered every card as "0/0 Ch" until the whole story graph had
   * been downloaded — which only happened once the reader opened the story.
   */
  it('reports the persisted tallies for a story restored from the catalog', () => {
    state.current = { ...state.current, stories: [catalogSummary()] };

    render(<LibraryScreen />);
    openMyLibrary();

    expect(screen.getByText('1/10 Ch')).toBeDefined();
    expect(screen.queryByText('0/0 Ch')).toBeNull();
  });

  it('keeps reporting the same progress once the story is hydrated', () => {
    state.current = {
      ...state.current,
      stories: [catalogSummary({
        persistenceHydration: 'full',
        arcs: [{
          title: 'Act I',
          chapters: Array.from({ length: 10 }, (_, index) => ({
            number: index + 1,
            title: `Chapter ${index + 1}`,
            status: index === 0 ? 'read' : 'unread',
            hasContent: index === 0,
          })),
        }],
      })],
    };

    render(<LibraryScreen />);
    openMyLibrary();

    expect(screen.getByText('1/10 Ch')).toBeDefined();
  });

  /**
   * Hydrated arcs are the authority: a chapter generated in this session counts
   * before the catalog has been read again.
   */
  it('prefers a freshly generated chapter over a stale catalog tally', () => {
    state.current = {
      ...state.current,
      stories: [catalogSummary({
        persistenceHydration: 'full',
        generatedChapterCount: 1,
        arcs: [{
          title: 'Act I',
          chapters: Array.from({ length: 10 }, (_, index) => ({
            number: index + 1,
            title: `Chapter ${index + 1}`,
            status: 'unread',
            hasContent: index < 2,
          })),
        }],
      })],
    };

    render(<LibraryScreen />);
    openMyLibrary();

    expect(screen.getByText('2/10 Ch')).toBeDefined();
  });

  it('shows 0/0 only for a story that genuinely reports no chapters', () => {
    state.current = {
      ...state.current,
      stories: [catalogSummary({ totalChapterCount: 0, generatedChapterCount: 0 })],
    };

    render(<LibraryScreen />);
    openMyLibrary();

    expect(screen.getByText('0/0 Ch')).toBeDefined();
  });
});
