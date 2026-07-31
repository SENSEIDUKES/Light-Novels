import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import ReaderChamber from './ReaderChamber';

vi.mock('../store/useAppStore', () => ({
  useAppStore: (selector?: any) => {
    const state = {
      activeStoryId: 'test-story',
      stories: [{ id: 'test-story', title: 'Test', arcs: [{ chapters: [{ number: 1, title: 'Ch 1', status: 'read' }] }] }],
      updateChapterContent: vi.fn(),
      sealChapter: vi.fn(),
      canShowRelicInReader: true,
      pendingRelicQueue: [],
      enqueueRelicReveal: vi.fn(),
      popPendingRelic: vi.fn(() => null),
      setCanShowRelicInReader: vi.fn(),
      immersion: { imagePopups: true, master: true, autoScroll: true },
      audioMix: { master: 1, bgm: 1, sfx: 1 }
    };
    return typeof selector === 'function' ? selector(state) : state;
  }
}));

const chapters = [{
  number: 1,
  title: 'Ch 1',
  status: 'read' as const,
  premise: 'Some premise',
  generatedContent: 'Hello',
}];

function renderReader(vignetteStyle?: 'off' | 'radial' | 'cosmic' | 'scroll') {
  const mockStory = {
    id: 'test-story',
    title: 'Test',
    memory: { glossary: [] },
    arcs: [{ chapters }],
    readerPreferences: vignetteStyle ? { vignetteStyle, themeOverride: 'abyss' } : undefined,
  };

  return render(
    <ReaderChamber
      chapters={chapters}
      currentPowerStage="Foundation"
      selectedChapterNum={1}
      setSelectedChapterNum={vi.fn()}
      onGenerateChapter={vi.fn()}
      onGenerateNextFiveChapters={vi.fn()}
      isGenerating={false}
      onToggleRead={vi.fn()}
      arcTitle="First Arc"
      onSwitchTab={vi.fn()}
      activeStory={mockStory as any}
      updateStoryFields={vi.fn()}
    />
  );
}

describe('ReaderChamber', () => {
  beforeEach(() => {
    window.IntersectionObserver = vi.fn().mockImplementation(function() {
      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      };
    }) as any;
  });

  it('renders without crashing', () => {
    const { container } = renderReader();
    expect(container).toBeDefined();
  });

  it('presents the fate-lock contract through reader controls', () => {
    const fateChapters = [{
      number: 2,
      title: 'Ch 2',
      status: 'read' as const,
      premise: 'Some premise',
      generatedContent: 'Hello',
    }];
    const mockStory = {
      id: 'test-story',
      title: 'Test',
      memory: { glossary: [] },
      arcs: [{ chapters: fateChapters }],
      chapterGenerationBatch: {
        id: 'batch-1',
        chapterNumbers: [1, 2, 3, 4, 5],
        status: 'generating',
        currentChapterNumber: 3,
        completedChapterNumbers: [1, 2],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    };

    const { getAllByRole, getByText } = render(
      <ReaderChamber
        chapters={fateChapters}
        currentPowerStage="Foundation"
        selectedChapterNum={2}
        setSelectedChapterNum={vi.fn()}
        onGenerateChapter={vi.fn()}
        onGenerateNextFiveChapters={vi.fn()}
        isGenerating={false}
        onToggleRead={vi.fn()}
        arcTitle="First Arc"
        onSwitchTab={vi.fn()}
        activeStory={mockStory as any}
        updateStoryFields={vi.fn()}
        handleAlterFate={vi.fn()}
      />,
    );

    const message = 'Fate may be altered after Chapter 5.';
    expect(getByText(message)).toBeDefined();
    const alterFateButtons = getAllByRole('button', { name: message });
    expect(alterFateButtons).toHaveLength(2);
    alterFateButtons.forEach(button => {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    });
  });

  it.each(['radial', 'cosmic', 'scroll'] as const)(
    'renders a stable, non-interactive %s vignette overlay',
    (vignetteStyle) => {
      const { queryByTestId } = renderReader(vignetteStyle);
      const overlay = queryByTestId('vignette-overlay');

      expect(overlay).not.toBeNull();
      expect(overlay?.getAttribute('data-style')).toBe(vignetteStyle);
      expect(overlay?.classList.contains('pointer-events-none')).toBe(true);
      expect(overlay?.classList.contains('z-0')).toBe(true);
    },
  );

  it('does not render a vignette overlay when the preference is off', () => {
    const { queryByTestId } = renderReader('off');
    expect(queryByTestId('vignette-overlay')).toBeNull();
  });
});
