import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import SteerPortal from './SteerPortal';

vi.mock('../store/useAppStore', () => ({
  useAppStore: () => ({
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
  })
}));

describe('SteerPortal', () => {
  it('renders without crashing', () => {
    const { container } = render(<SteerPortal onSteer={vi.fn()} />);
    expect(container).toBeDefined();
  });
});
