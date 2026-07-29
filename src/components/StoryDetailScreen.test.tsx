import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StoryDetailScreen } from './StoryDetailScreen';

const storeMocks = vi.hoisted(() => ({
  story: null as any,
  saveStories: vi.fn().mockResolvedValue(undefined),
  setAppError: vi.fn(),
}));

vi.mock('../store/useAppStore', () => ({
  useAppStore: (selector: any) => selector({
    currentScreen: 'detail',
    setCurrentScreen: vi.fn(),
    activeStoryId: 'test-story',
    stories: [storeMocks.story],
    activeGenerationRun: null,
    setSelectedChapterNum: vi.fn(),
    userProfile: { qi: 0 },
    saveStories: storeMocks.saveStories,
    setAppError: storeMocks.setAppError,
  }),
}));

function makeStory(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-story',
    title: 'Test',
    genre: 'Fantasy',
    mcName: 'Lin',
    customPremise: 'A gate opens.',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    chapterWritingStyle: 'Standard',
    arcs: [{ title: 'Arc 1', chapters: [] }],
    memory: {
      currentPowerStage: 'Mortal',
      unresolvedPlotThreads: [],
    },
    ...overrides,
  };
}

function renderScreen(options: {
  handleSelectCover?: (assetId: string) => Promise<void>;
} = {}) {
  return render(
    <StoryDetailScreen
      handleGenerateCover={vi.fn()}
      handleApplyCover={vi.fn()}
      handleSelectCover={options.handleSelectCover ?? vi.fn().mockResolvedValue(undefined)}
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
    vi.clearAllMocks();
    storeMocks.saveStories.mockResolvedValue(undefined);
    storeMocks.story = makeStory();
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
    storeMocks.story = makeStory({ arcs: [] });

    expect(() => renderScreen()).not.toThrow();
    expect(screen.getByText('Not yet charted')).toBeDefined();
  });

  it('does not claim an arcless story reached its ending', () => {
    // `[].every()` is vacuously true, so an empty story used to report that
    // every chapter was generated and that it had reached its ending.
    storeMocks.story = makeStory({ arcs: [] });
    renderScreen();

    expect(screen.queryByText(/Ascend/i)).toBeNull();
  });

  it('warns before changing the saved style for future chapters', async () => {
    storeMocks.story = makeStory({
      arcs: [{
        title: 'Arc 1',
        chapters: [{ number: 1, title: 'Opening', status: 'read', hasContent: true }],
      }],
    });
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByRole('button', { name: 'Story Settings' }));
    fireEvent.change(screen.getByLabelText('Chapter Writing Style'), {
      target: { value: 'Easy Read' },
    });

    expect(screen.getByRole('alert').textContent).toContain(
      'Existing chapters will stay unchanged',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(storeMocks.saveStories).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'test-story',
        chapterWritingStyle: 'Easy Read',
      }),
    ]));
  });

  it('activates a saved cover through the durable media selection handler', async () => {
    const handleSelectCover = vi.fn().mockResolvedValue(undefined);
    storeMocks.story = makeStory({
      imageHistory: [
        {
          id: 'cover-current',
          assetId: 'asset-current',
          entityType: 'cover',
          entityId: 'test-story',
          imageUrl: 'https://images.example/current.png',
          promptUsed: 'Current cover',
          createdAt: '2023-01-01T00:00:00Z',
          isCurrent: true,
          chapterNumber: 1,
        },
        {
          id: 'cover-prior',
          assetId: 'asset-prior',
          entityType: 'cover',
          entityId: 'test-story',
          imageUrl: 'https://images.example/prior.png',
          promptUsed: 'Prior cover',
          createdAt: '2023-01-02T00:00:00Z',
          isCurrent: false,
          chapterNumber: 2,
        },
      ],
    });
    renderScreen({ handleSelectCover });

    fireEvent.click(screen.getByRole('button', {
      name: 'Apply cover image from chapter 2',
    }));

    await waitFor(() => expect(handleSelectCover).toHaveBeenCalledWith('asset-prior'));
    expect(storeMocks.saveStories).not.toHaveBeenCalled();
  });
});
