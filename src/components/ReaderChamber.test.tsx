import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import ReaderChamber from './ReaderChamber';

vi.mock('../store/useAppStore', () => ({
  useAppStore: () => ({
    activeStoryId: 'test-story',
    stories: [{ id: 'test-story', title: 'Test', arcs: [{ chapters: [{ number: 1, title: 'Ch 1', status: 'read' }] }] }],
    updateChapterContent: vi.fn(),
    sealChapter: vi.fn(),
  })
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
    const chapters = [{ number: 1, title: 'Ch 1', status: 'read', generatedContent: 'Hello' }];
    const mockStory = { 
      id: 'test-story', 
      title: 'Test', 
      memory: { glossary: [] }, 
      arcs: [{ chapters }] 
    };
    
    const { container } = render(
      <ReaderChamber 
        chapters={chapters} 
        selectedChapterNum={1} 
        setSelectedChapterNum={vi.fn()} 
        onGenerateChapter={vi.fn()} 
        isGenerating={false}
        onToggleRead={vi.fn()}
        onSwitchTab={vi.fn()}
        activeStory={mockStory as any}
      />
    );
    expect(container).toBeDefined();
  });
});
