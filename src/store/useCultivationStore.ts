import { StateCreator } from 'zustand';
import { AppState } from './useAppStore';

export interface CultivationSlice {
  idleQiFlow: number;
  idleDaoInsights: number;
  idleBreakthroughRate: number;
  idleResources: number;
  
  updateCultivationState: (state: { qiFlow: number, daoInsights: number, breakthroughRate: number, resources: number }) => void;
}

export const createCultivationSlice: StateCreator<AppState, [], [], CultivationSlice> = (set) => ({
  idleQiFlow: 0,
  idleDaoInsights: 0,
  idleBreakthroughRate: 0,
  idleResources: 0,

  updateCultivationState: (state) => set({
    idleQiFlow: state.qiFlow,
    idleDaoInsights: state.daoInsights,
    idleBreakthroughRate: state.breakthroughRate,
    idleResources: state.resources,
  }),
});
