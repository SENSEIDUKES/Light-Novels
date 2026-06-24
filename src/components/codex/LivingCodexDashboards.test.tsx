import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LivingCodexDashboards } from './LivingCodexDashboards';

describe('LivingCodexDashboards', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <LivingCodexDashboards 
        memory={{ characters: [], currentPowerStage: 'Foundation' } as any} 
        flatChapters={[]} 
        selectedChartCharId="1" 
        setSelectedChartCharId={vi.fn()} 
        onNavigateToTab={vi.fn()} 
        charsToRender={[{id: '1'}] as any}
        affinityTimeline={[]}
        powerTimeline={[]}
      />
    );
    expect(container).toBeDefined();
  });
});
