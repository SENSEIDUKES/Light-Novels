import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCodexAnalytics } from './useCodexAnalytics';

describe('useCodexAnalytics - getPowerStageLevel', () => {
  const mockMemory = {
    currentPowerStage: 'Qi Condensation',
    characters: [],
    worldRules: [],
    unresolvedPlotThreads: [],
    resolvedPlotThreads: [],
  } as any;
  const mockArcs = [] as any[];
  const mockActiveStory = { relationships: [] } as any;

  it('correctly parses and scores standard Xianxia stages', () => {
    const { result } = renderHook(() =>
      useCodexAnalytics(mockMemory, mockArcs, mockActiveStory, '', 'Han Feng')
    );

    const levels = [
      { input: 'Primordial Sovereignty', expectedScore: 100, expectedTitle: 'Primordial Sovereignty' },
      { input: 'Immortal Emperor', expectedScore: 100, expectedTitle: 'Immortal Emperor' },
      { input: 'Nascent Soul', expectedScore: 85, expectedTitle: 'Nascent Soul' },
      { input: 'Core Formation', expectedScore: 70, expectedTitle: 'Core Formation' },
      { input: 'Foundation Establishment', expectedScore: 55, expectedTitle: 'Foundation Establishment' },
      { input: 'Qi Condensation', expectedScore: 35, expectedTitle: 'Qi Condensation' },
      { input: 'Qi Condensation Tier 1 (Crippled Roots)', expectedScore: 20, expectedTitle: 'Qi Condensation Tier 1' },
      { input: '0% Resonance (Sealed Divinity / Shaded Soul)', expectedScore: 10, expectedTitle: '0% Resonance' },
      { input: '50% Resonance (Intermediate Link)', expectedScore: 55, expectedTitle: '50% Resonance' },
      { input: 'Tier I: Blind Seeker (Fragile Destiny Line)', expectedScore: 12, expectedTitle: 'Tier I: Blind Seeker' },
      { input: 'Outer Disciple Class F (Unranked / Blocked Veins)', expectedScore: 20, expectedTitle: 'Outer Disciple Class F' },
      { input: undefined, expectedScore: 10, expectedTitle: 'Mortal' },
    ];

    levels.forEach(({ input, expectedScore, expectedTitle }) => {
      const res = result.current.getPowerStageLevel(input);
      expect(res.score).toBe(expectedScore);
      expect(res.title).toBe(expectedTitle);
    });
  });
});
