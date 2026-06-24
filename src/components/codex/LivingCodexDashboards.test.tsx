import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LivingCodexDashboards } from './LivingCodexDashboards';

describe('LivingCodexDashboards', () => {
  it('renders without crashing', () => {
    const mockMemory = { characters: [], currentPowerStage: 'Foundation', powerSystem: '', worldRules: [], unresolvedPlotThreads: [], resolvedPlotThreads: [] };
    const mockStory = { id: 'test', title: 'test', genre: '', mcName: 'test', customPremise: '', createdAt: '', updatedAt: '', memory: mockMemory, arcs: [], currentChapterNumber: 1 };
    const { container } = render(
      <LivingCodexDashboards 
        memory={mockMemory} 
        activeStory={mockStory}
        flatChapters={[]} 
        charsToRender={[{id: '1', name: 'Char 1', role: 'Role', description: 'Desc', relationshipToMC: 'Friend', status: 'alive'}] as any}
        affinityTimelineOfChar={[]}
        powerTimeline={[]}
      />
    );
    expect(container).toBeDefined();
  });
});
