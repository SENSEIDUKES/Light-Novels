import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StoryDetailScreen } from './StoryDetailScreen';

const storeMocks = vi.hoisted(() => ({
  story: null as any,
  saveStories: vi.fn().mockResolvedValue(undefined),
  setAppError: vi.fn(),
}));
const mediaMocks = vi.hoisted(() => ({
  getMediaAsset: vi.fn(),
  resolveMediaAssetForDisplay: vi.fn(),
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
vi.mock('../lib/media/mediaAssetClient', () => ({
  getMediaAsset: mediaMocks.getMediaAsset,
}));
vi.mock('../lib/media/privateMediaResolver', () => ({
  resolveMediaAssetForDisplay: mediaMocks.resolveMediaAssetForDisplay,
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
  handleGenerateCover?: () => Promise<{ imageUrls: string[]; promptUsed: string } | undefined>;
  handleSelectCover?: (assetId: string) => Promise<void>;
} = {}) {
  return render(
    <StoryDetailScreen
      handleGenerateCover={options.handleGenerateCover ?? vi.fn()}
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
    mediaMocks.getMediaAsset.mockImplementation(async (assetId: string) => ({
      id: assetId,
      deliveryUrl: `https://signed.example/${assetId}`,
    }));
    mediaMocks.resolveMediaAssetForDisplay.mockImplementation(async (descriptor: any) => ({
      assetId: descriptor.id,
      descriptor,
      url: `blob:${descriptor.id}`,
      source: 'network',
    }));
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

  it('lazily restores a saved historical cover whose delivery URL is blank', async () => {
    storeMocks.story = makeStory({
      userId: 'reader',
      coverAssetId: 'asset-current',
      imageUrl: 'blob:asset-current',
      imageHistory: [
        {
          id: 'cover-current',
          assetId: 'asset-current',
          entityType: 'cover',
          entityId: 'test-story',
          imageUrl: '',
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
          imageUrl: '',
          promptUsed: 'Prior cover',
          createdAt: '2023-01-02T00:00:00Z',
          isCurrent: false,
          chapterNumber: 2,
        },
      ],
    });
    renderScreen();

    const priorButton = screen.getByRole('button', {
      name: 'Apply cover image from chapter 2',
    });
    await waitFor(() => {
      expect(priorButton.querySelector('img')).toHaveProperty(
        'src',
        'blob:asset-prior',
      );
    });
    expect(mediaMocks.getMediaAsset).toHaveBeenCalledWith(
      'asset-prior',
      'reader',
    );
    expect(mediaMocks.getMediaAsset).not.toHaveBeenCalledWith(
      'asset-current',
      expect.anything(),
    );
  });

  it('reports delivery failure separately when the cover selection was persisted', async () => {
    const failure = Object.assign(
      new Error('R2 signing unavailable'),
      { selectionPersisted: true },
    );
    const handleSelectCover = vi.fn().mockRejectedValue(failure);
    storeMocks.story = makeStory({
      imageHistory: [
        {
          id: 'cover-current',
          assetId: 'asset-current',
          entityType: 'cover',
          entityId: 'test-story',
          imageUrl: 'blob:asset-current',
          isCurrent: true,
          chapterNumber: 1,
        },
        {
          id: 'cover-prior',
          assetId: 'asset-prior',
          entityType: 'cover',
          entityId: 'test-story',
          imageUrl: 'blob:asset-prior',
          isCurrent: false,
          chapterNumber: 2,
        },
      ],
    });
    renderScreen({ handleSelectCover });

    fireEvent.click(screen.getByRole('button', {
      name: 'Apply cover image from chapter 2',
    }));

    await waitFor(() => expect(storeMocks.setAppError).toHaveBeenCalledWith(
      'The cover selection was saved, but its image could not be loaded yet. It will retry from permanent media.',
    ));
  });

  it('does not offer a replacement when a permanent cover only lacks its delivery URL', () => {
    storeMocks.story = makeStory({
      coverAssetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      imageUrl: '',
    });
    renderScreen();

    const progressionButtons = screen.getAllByRole('button', { name: /Progression/i });
    expect(progressionButtons).toHaveLength(2);
    progressionButtons.forEach(button => expect((button as HTMLButtonElement).disabled).toBe(true));
    expect(screen.queryByRole('button', { name: /Forge.*Cover/i })).toBeNull();
  });
});
