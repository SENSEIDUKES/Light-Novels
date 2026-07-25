import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StoryDetailScreen } from './StoryDetailScreen';

const state = vi.hoisted(() => ({
  story: null as any,
}));

vi.mock('../store/useAppStore', () => ({
  useAppStore: (selector: any) => selector({
    currentScreen: 'detail',
    setCurrentScreen: vi.fn(),
    activeStoryId: 'test-story',
    stories: [state.story],
    isGenerating: false,
    setSelectedChapterNum: vi.fn(),
    userProfile: { qi: 0 },
    saveStories: vi.fn(),
  }),
}));

function makeStory(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-story',
    title: 'Test',
    createdAt: '2023-01-01T00:00:00Z',
    arcs: [{ title: 'Arc 1', chapters: [] }],
    memory: { unresolvedPlotThreads: [] },
    ...overrides,
  };
}

function renderScreen() {
  return render(
    <StoryDetailScreen
      handleGenerateCover={vi.fn()}
      handleApplyCover={vi.fn()}
      handleExportFullTome={vi.fn()}
      handleExportEPUB={vi.fn()}
      handleExportSingleStory={vi.fn()}
      handleDeleteStory={vi.fn()}
      setIsCodexSheetOpen={vi.fn()}
    />,
  );
}

describe('StoryDetailScreen', () => {
  beforeEach(() => {
    state.story = makeStory();
  });

  it('renders without crashing', () => {
    const { container } = renderScreen();
    expect(container).toBeDefined();
  });

  // A story opened before its arcs are generated — a seed straight from the
  // library, or a catalog summary that has not been hydrated — carries no arcs.
  // Reading arcs[arcs.length - 1].title threw, and the ErrorBoundary replaced
  // the whole app with a rendering-error screen.
  it('renders a story that has no arcs yet', () => {
    state.story = makeStory({ arcs: [] });

    expect(() => renderScreen()).not.toThrow();
    expect(screen.getByText('Not yet charted')).toBeDefined();
  });

  it('does not claim an arcless story reached its ending', () => {
    // `[].every()` is vacuously true, so an empty story used to report that
    // every chapter was generated and that it had reached its ending.
    state.story = makeStory({ arcs: [] });
    renderScreen();

    expect(screen.queryByText(/Ascend/i)).toBeNull();
  });
});
