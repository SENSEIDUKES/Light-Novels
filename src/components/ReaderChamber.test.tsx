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
    const chapters = [{ number: 1, title: 'Ch 1', status: 'read' as const, premise: 'Some premise', generatedContent: 'Hello' }];
    const mockStory = {
      id: 'test-story',
      title: 'Test',
      memory: { glossary: [] },
      arcs: [{ chapters }]
    };

    const { container } = render(
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
    expect(container).toBeDefined();
  });

  it('presents the fate-lock contract through reader controls', () => {
    const chapters = [{
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
      arcs: [{ chapters }],
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
        chapters={chapters}
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

  it('renders correct vignette overlay according to vignetteStyle', () => {
    const chapters = [{ number: 1, title: 'Ch 1', status: 'read' as const, premise: 'Some premise', generatedContent: 'Hello' }];
    const mockStory = {
      id: 'test-story',
      title: 'Test',
      memory: { glossary: [] },
      arcs: [{ chapters }],
      readerPreferences: { vignetteStyle: 'radial' }
    };

    const { container, rerender } = render(
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

    let vignetteEl = container.querySelector('[data-testid="vignette-overlay"]');
    expect(vignetteEl).not.toBeNull();
    expect(vignetteEl?.getAttribute('data-style')).toBe('radial');
    expect(vignetteEl?.classList.contains('pointer-events-none')).toBe(true);

    // Test with cosmic style
    const cosmicStory = { ...mockStory, readerPreferences: { vignetteStyle: 'cosmic' } };
    rerender(
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
        activeStory={cosmicStory as any}
        updateStoryFields={vi.fn()}
      />
    );
    vignetteEl = container.querySelector('[data-testid="vignette-overlay"]');
    expect(vignetteEl).not.toBeNull();
    expect(vignetteEl?.getAttribute('data-style')).toBe('cosmic');

    // Test with scroll style
    const scrollStory = { ...mockStory, readerPreferences: { vignetteStyle: 'scroll' } };
    rerender(
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
        activeStory={scrollStory as any}
        updateStoryFields={vi.fn()}
      />
    );
    vignetteEl = container.querySelector('[data-testid="vignette-overlay"]');
    expect(vignetteEl).not.toBeNull();
    expect(vignetteEl?.getAttribute('data-style')).toBe('scroll');

    // Test with off style
    const offStory = { ...mockStory, readerPreferences: { vignetteStyle: 'off' } };
    rerender(
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
        activeStory={offStory as any}
        updateStoryFields={vi.fn()}
      />
    );
    vignetteEl = container.querySelector('[data-testid="vignette-overlay"]');
    expect(vignetteEl).toBeNull();
  });
});
