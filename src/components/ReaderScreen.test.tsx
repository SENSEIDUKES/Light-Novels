import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { ReaderScreen } from './ReaderScreen';

vi.mock('../store/useAppStore', () => ({
  useAppStore: (selector?: any) => {
    const state = {
      currentScreen: 'reader',
      setCurrentScreen: vi.fn(),
      activeStoryId: 'test-story',
      stories: [{ 
        id: 'test-story', 
        title: 'Test', 
        arcs: [{ title: 'Arc 1', chapters: [{ number: 1, title: 'Chapter 1' }] }], 
        memory: { unresolvedPlotThreads: [], characters: [], glossary: [] } 
      }],
      selectedChapterNum: 1,
      setSelectedChapterNum: vi.fn(),
      isGenerating: false,
      routingConfig: {},
      streamingChapter: null,
      isReaderFullscreen: false,
      currentUser: { uid: '123' },
      immersion: { imagePopups: true, defaultVoices: {} },
      updateStory: vi.fn()
    };
    return selector ? selector(state) : state;
  }
}));

describe('ReaderScreen', () => {
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
    const { container } = render(
      <ReaderScreen 
        handleSteerArc={vi.fn()}
        handleAlterFate={vi.fn()}
        handleGenerateChapter={vi.fn()}
        handleGenerateNextFiveChapters={vi.fn()}
        handleToggleRead={vi.fn()}
        handleUpdateStoryDirect={vi.fn()}
        setIsCodexSheetOpen={vi.fn()}
        handleSealChapter={vi.fn()}
      />
    );
    expect(container).toBeDefined();
  });
});
