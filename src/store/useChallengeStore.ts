import { StateCreator } from 'zustand';
import { FateSurvivalChallenge, FateSurvivalRun } from '../types';
import { AppState } from './useAppStore';
import { auth } from '../lib/firebase';

export interface ChallengeSlice {
  activeChallenge: FateSurvivalChallenge | null;
  activeChallengeRun: FateSurvivalRun | null;
  
  startChallenge: (challenge: FateSurvivalChallenge) => void;
  progressChallenge: (choiceId: string) => void;
  resetChallenge: () => void;
}

export const createChallengeSlice: StateCreator<AppState, [], [], ChallengeSlice> = (set, get) => ({
  activeChallenge: null,
  activeChallengeRun: null,

  startChallenge: async (challenge) => {
    const run: FateSurvivalRun = {
      id: 'run-' + Date.now(),
      challengeId: challenge.id,
      userId: auth.currentUser?.uid || 'anonymous',
      currentStep: 1,
      status: 'active',
      selectedChoices: [],
      state: {
        survival: 5,
        relationship: 5,
        danger: 0,
        fateResistance: 0,
        trust: 5,
      },
      createdAt: new Date().toISOString(),
    };
    set({
      activeChallenge: challenge,
      activeChallengeRun: run,
      currentScreen: 'challenge',
    });
    
    
    const localProfile = get().userProfile;
    if (localProfile) {
      const updatedProfile = {
        ...localProfile,
        dao_xp: (localProfile.dao_xp || 0) + challenge.rewards.attemptQi,
        qi: (localProfile.qi || 0) + challenge.rewards.attemptQi,
        heavenly_qi: (localProfile.heavenly_qi || localProfile.dao_xp || 0) + challenge.rewards.attemptQi,
        sect_qi: (localProfile.sect_qi || 0) + challenge.rewards.attemptQi,
      };
      set({ userProfile: updatedProfile });
    }
  },

  progressChallenge: async (choiceId) => {
    const { activeChallenge, activeChallengeRun } = get();
    if (!activeChallenge || !activeChallengeRun) return;
    if (activeChallengeRun.status !== 'active') return;

    const currentChoicePoint = activeChallenge.choicePoints.find(
      cp => cp.stepNumber === activeChallengeRun.currentStep
    );
    const choice = currentChoicePoint?.choices.find(c => c.id === choiceId);
    if (!choice) return;

    const nextState = { ...activeChallengeRun.state };
    if (choice.effects) {
      nextState.survival = Math.max(0, (nextState.survival || 5) + (choice.effects.survival || 0));
      nextState.relationship = Math.max(0, (nextState.relationship || 5) + (choice.effects.relationship || 0));
      nextState.danger = Math.max(0, (nextState.danger || 0) + (choice.effects.danger || 0));
      nextState.fateResistance = Math.max(0, (nextState.fateResistance || 0) + (choice.effects.fateResistance || 0));
      nextState.trust = Math.max(0, (nextState.trust || 5) + (choice.effects.trust || 0));
    }

    const nextStep = activeChallengeRun.currentStep + 1;
    const isCompleted = nextStep > activeChallenge.totalSteps - 1; 
    
    let updatedRun: FateSurvivalRun = {
      ...activeChallengeRun,
      currentStep: nextStep,
      selectedChoices: [...activeChallengeRun.selectedChoices, choiceId],
      state: nextState,
    };

    let qiEarned = 0;
    let outcome: 'success' | 'partial_success' | 'failure' = 'failure';

    if (isCompleted) {
      if (nextState.fateResistance >= 6 && nextState.danger <= 4) {
        outcome = 'success';
      } else if (nextState.fateResistance >= 3 && nextState.danger <= 7) {
        outcome = 'partial_success';
      }

      if (outcome === 'success') {
        qiEarned = activeChallenge.rewards.successQi;
      } else if (outcome === 'partial_success') {
        qiEarned = activeChallenge.rewards.partialSuccessQi;
      } else {
        qiEarned = activeChallenge.rewards.failureQi;
      }

      updatedRun = {
        ...updatedRun,
        status: outcome === 'failure' ? 'failed' : 'completed',
        result: outcome,
        qiAwarded: qiEarned,
        completedAt: new Date().toISOString(),
      };
    }

    set({ activeChallengeRun: updatedRun });

    if (isCompleted) {
      
      if (outcome === 'success') {
        import('../lib/artifacts').then(({ unlockCosmicArtifact }) => {
          unlockCosmicArtifact('challenge_complete', activeChallenge.id, activeChallenge.title).catch(err => {
            console.error('Failed to unlock Fate Challenge artifact:', err);
          });
        });
      }
      
      const localProfile = get().userProfile;
      if (localProfile) {
        const updatedProfile = {
          ...localProfile,
          dao_xp: (localProfile.dao_xp || 0) + qiEarned,
          qi: (localProfile.qi || 0) + qiEarned,
          heavenly_qi: (localProfile.heavenly_qi || localProfile.dao_xp || 0) + qiEarned,
          sect_qi: (localProfile.sect_qi || 0) + qiEarned,
        };
        set({ userProfile: updatedProfile });
      }
    }
  },

  resetChallenge: () => {
    set({
      activeChallenge: null,
      activeChallengeRun: null,
      currentScreen: 'home',
    });
  }
});
