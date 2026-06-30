import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from './useAppStore';
import * as qiLib from '../lib/qi';

vi.mock('../lib/qi', () => ({
  awardDirectQi: vi.fn(),
}));

vi.mock('../lib/artifacts', () => ({
  unlockCosmicArtifact: vi.fn().mockResolvedValue(null),
}));

describe('ChallengeSlice via useAppStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({ activeChallenge: null, activeChallengeRun: null, userProfile: { dao_xp: 0, qi: 0, heavenly_qi: 0, sect_qi: 0 } as any });
  });

  const mockChallenge = {
    id: 'c1',
    title: 'Test',
    description: 'desc',
    totalSteps: 2,
    rewards: { attemptQi: 10, successQi: 100, partialSuccessQi: 50, failureQi: 10 },
    choicePoints: [
      { stepNumber: 1, text: 'Step 1', choices: [
        { id: 'c1-s1', text: 'Good', effects: { fateResistance: 6, danger: 0 } },
        { id: 'c1-s2', text: 'Bad', effects: { fateResistance: 0, danger: 10 } }
      ] },
      { stepNumber: 2, text: 'Step 2', choices: [
        { id: 'c2-s1', text: 'End', effects: { } }
      ] }
    ]
  } as any;

  it('startChallenge initializes run and gives attempt Qi', async () => {
    const store = useAppStore.getState();
    await store.startChallenge(mockChallenge);
    
    const state = useAppStore.getState();
    expect(state.activeChallenge?.id).toBe('c1');
    expect(state.activeChallengeRun?.status).toBe('active');
    expect(state.activeChallengeRun?.currentStep).toBe(1);
    expect(state.userProfile?.dao_xp).toBe(10);
  });

  it('progressChallenge processes choice and updates state', async () => {
    const store = useAppStore.getState();
    await store.startChallenge(mockChallenge);
    
    await useAppStore.getState().progressChallenge('c1-s1');
    
    const state = useAppStore.getState();
    expect(state.activeChallengeRun?.currentStep).toBe(2);
    expect(state.activeChallengeRun?.state.fateResistance).toBe(6);
  });

  it('progressChallenge completes challenge successfully', async () => {
    const store = useAppStore.getState();
    await store.startChallenge(mockChallenge);
    await useAppStore.getState().progressChallenge('c1-s1'); // get 6 fateResistance
    await useAppStore.getState().progressChallenge('c2-s1'); // complete
    
    const state = useAppStore.getState();
    expect(state.activeChallengeRun?.status).toBe('completed');
    expect(state.activeChallengeRun?.result).toBe('success');
    expect(state.userProfile?.dao_xp).toBe(110); // 10 attempt + 100 success
  });

  it('resetChallenge clears challenge state', async () => {
    const store = useAppStore.getState();
    await store.startChallenge(mockChallenge);
    store.resetChallenge();
    
    const state = useAppStore.getState();
    expect(state.activeChallenge).toBeNull();
    expect(state.activeChallengeRun).toBeNull();
    expect(state.currentScreen).toBe('home');
  });
});
