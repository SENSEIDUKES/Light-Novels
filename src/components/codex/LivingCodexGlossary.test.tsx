import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LivingCodexGlossary } from './LivingCodexGlossary';

describe('LivingCodexGlossary', () => {
  it('renders without crashing', () => {
    const mockMemory = { characters: [], currentPowerStage: 'Foundation', powerSystem: '', worldRules: [], unresolvedPlotThreads: [], resolvedPlotThreads: [] };
    const { container } = render(
      <LivingCodexGlossary 
        memory={mockMemory} 
        arcs={[]}
        mcName="testMc"
      />
    );
    expect(container).toBeDefined();
  });
});
