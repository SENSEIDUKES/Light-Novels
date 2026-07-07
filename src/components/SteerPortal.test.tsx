import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import SteerPortal from './SteerPortal';

vi.mock('../store/useAppStore', () => ({
  useAppStore: vi.fn((selector) => {
    const state = {
      currentScreen: 'steer',
      setCurrentScreen: vi.fn(),
      activeStoryId: 'test-story',
      stories: [{ 
        id: 'test-story', 
        title: 'Test', 
        arcs: [], 
        memory: { unresolvedPlotThreads: [], factions: [], characters: [] } 
      }],
      isGenerating: false
    };
    return selector ? selector(state) : state;
  })
}));

describe('SteerPortal', () => {
  it('renders without crashing', () => {
    const mockStory = { 
      id: 'test-story', 
      title: 'Test', 
      arcs: [], 
      memory: { unresolvedPlotThreads: [], factions: [], characters: [] } 
    };
    const { container } = render(
      <SteerPortal 
        onSteerArc={vi.fn()}
        isSteering={false}
        currentArcIndex={0}
        activeStory={mockStory}
        routingConfig={{}}
      />
    );
    expect(container).toBeDefined();
  });
});
