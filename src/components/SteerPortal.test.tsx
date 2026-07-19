import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import SteerPortal from './SteerPortal';

vi.mock('../lib/rag', () => ({
  retrieveRelevantContext: vi.fn().mockResolvedValue([]),
}));

vi.mock('../lib/encryption', () => ({
  secureStorage: {
    getItem: vi.fn().mockResolvedValue(null),
  },
}));

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
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        directions: [{
          title: 'Continue',
          directionType: 'continue',
          description: 'Proceed.',
        }],
      }),
    });
  });

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

  it('uses v2 for direction requests despite a stored v1 preference', async () => {
    const mockStory = {
      id: 'test-story',
      title: 'Test',
      mcName: 'Lin',
      genre: 'Xianxia',
      customPremise: 'A journey',
      arcs: [],
      readerPreferences: { contextEngine: 'v1' },
      memory: {
        powerSystem: 'Ranks',
        currentPowerStage: 'First',
        worldRules: [],
        unresolvedPlotThreads: [],
        resolvedPlotThreads: [],
        factions: [],
        characters: [],
      },
    };

    render(
      <SteerPortal
        onSteerArc={vi.fn()}
        isSteering={false}
        currentArcIndex={0}
        activeStory={mockStory}
        routingConfig={{}}
      />,
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const requestBody = JSON.parse(
      String((global.fetch as any).mock.calls[0][1].body),
    );
    expect(requestBody.contextEngine).toBe('v2');
  });
});
