import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import LivingCodex from './LivingCodex';

vi.mock('../store/useAppStore', () => ({
  useAppStore: () => ({
    activeStoryId: 'test',
    stories: [{ id: 'test', memory: { characters: [], relationships: [] }, arcs: [] }],
    setCurrentScreen: vi.fn(),
    setSelectedChapterNum: vi.fn()
  })
}));

describe('LivingCodex', () => {
  it('renders without crashing', () => {
    const mockMemory = { characters: [], unresolvedPlotThreads: [], resolvedPlotThreads: [], powerSystem: '', currentPowerStage: '', worldRules: [] };
    const mockStory = { id: 'test', title: 'test', genre: '', mcName: 'testMc', customPremise: '', createdAt: '', updatedAt: '', memory: mockMemory, arcs: [], currentChapterNumber: 1 };
    const { container } = render(
      <LivingCodex 
        memory={mockMemory}
        arcs={[]}
        onUpdateMemory={vi.fn()}
        mcName="testMc"
        activeStory={mockStory}
        onUpdateStory={vi.fn()}
      />
    );
    expect(container).toBeDefined();
  });
});
