import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StoryDetailScreen } from './StoryDetailScreen';

const storeMocks = vi.hoisted(() => ({
  saveStories: vi.fn().mockResolvedValue(undefined),
  setAppError: vi.fn(),
  state: {} as any,
}));

vi.mock('../store/useAppStore', () => ({
  useAppStore: (selector: any) => selector(storeMocks.state),
}));

const renderDetail = () => render(
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

describe('StoryDetailScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeMocks.state = {
    currentScreen: 'detail',
    setCurrentScreen: vi.fn(),
    activeStoryId: 'test-story',
    stories: [{
      id: 'test-story',
      title: 'Test',
      genre: 'Fantasy',
      mcName: 'Lin',
      customPremise: 'A gate opens.',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      chapterWritingStyle: 'Standard',
      arcs: [{
        title: 'Arc 1',
        chapters: [{ number: 1, title: 'Opening', status: 'read', hasContent: true }],
      }],
      memory: {
        currentPowerStage: 'Mortal',
        unresolvedPlotThreads: [],
      },
    }],
    isGenerating: false,
    setSelectedChapterNum: vi.fn(),
    userProfile: { qi: 0 },
    saveStories: storeMocks.saveStories,
    setAppError: storeMocks.setAppError,
    };
  });

  it('renders without crashing', () => {
    const { container } = renderDetail();
    expect(container).toBeDefined();
  });

  it('warns before changing the saved style for future chapters', async () => {
    renderDetail();

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
});
