import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { StoryDetailScreen } from './StoryDetailScreen';

vi.mock('../store/useAppStore', () => ({
  useAppStore: () => ({
    currentScreen: 'detail',
    setCurrentScreen: vi.fn(),
    activeStoryId: 'test-story',
    stories: [{ 
      id: 'test-story', 
      title: 'Test', 
      createdAt: '2023-01-01T00:00:00Z',
      arcs: [{ title: 'Arc 1', chapters: [] }], 
      memory: { unresolvedPlotThreads: [] } 
    }],
    isGenerating: false,
    setSelectedChapterNum: vi.fn(),
    userProfile: { qi: 0 },
    saveStories: vi.fn()
  })
}));

describe('StoryDetailScreen', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <StoryDetailScreen 
        handleGenerateCover={vi.fn()} 
        handleApplyCover={vi.fn()} 
        handleExportFullTome={vi.fn()} 
        handleExportEPUB={vi.fn()} 
        handleExportSingleStory={vi.fn()} 
        handleDeleteStory={vi.fn()} 
        setIsCodexSheetOpen={vi.fn()} 
      />
    );
    expect(container).toBeDefined();
  });
});
