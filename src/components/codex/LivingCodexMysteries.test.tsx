import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LivingCodexMysteries } from './LivingCodexMysteries';

describe('LivingCodexMysteries', () => {
  it('renders without crashing', () => {
    const mockMemory = { characters: [], currentPowerStage: 'Foundation', powerSystem: '', worldRules: [], unresolvedPlotThreads: [], resolvedPlotThreads: [] };
    const { container } = render(
      <LivingCodexMysteries 
        memory={mockMemory}
      />
    );
    expect(container).toBeDefined();
  });
});
