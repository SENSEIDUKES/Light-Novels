import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { CosmicBookmarksPanel } from './CosmicBookmarksPanel';

vi.mock('../store/useAppStore', () => ({
  useAppStore: () => ({
    stories: [{
      id: 'test-story',
      title: 'Test',
      arcs: [],
      memory: { unresolvedPlotThreads: [] }
    }],
    activeStoryId: 'test-story',
    setSelectedChapterNum: vi.fn()
  })
}));

describe('CosmicBookmarksPanel', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <CosmicBookmarksPanel 
        showBookmarksPanel={true}
        setShowBookmarksPanel={vi.fn()}
        activeBookmarks={[]}
        chapters={[]}
        handleRemoveBookmark={vi.fn()}
        handleJumpToBookmark={vi.fn()}
      />
    );
    expect(container).toBeDefined();
  });
});
