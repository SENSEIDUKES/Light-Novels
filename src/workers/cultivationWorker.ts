export type CultivationState = {
  qiFlow: number;
  daoInsights: number;
  breakthroughRate: number;
  resources: number;
};

export type CultivationMessage = 
  | { type: 'START'; payload?: Partial<CultivationState> }
  | { type: 'STOP' }
  | { type: 'SET_RATES'; payload: { baseQiRate: number, baseInsightRate: number } };

export type CultivationResponse = 
  | { type: 'TICK'; payload: CultivationState }
  | { type: 'AUTOSYNC'; payload: CultivationState };

let intervalId: ReturnType<typeof setInterval> | null = null;

let state: CultivationState = {
  qiFlow: 0,
  daoInsights: 0,
  breakthroughRate: 0.001,
  resources: 0,
};

let baseQiRate = 1;
let baseInsightRate = 0.1;
let ticksSinceLastSync = 0;
const SYNC_INTERVAL_TICKS = 30; // sync every 30 seconds

function tick() {
  // Mathematical formulas
  const flowGain = baseQiRate * (1 + state.daoInsights * 0.05);
  state.qiFlow += flowGain;
  
  state.daoInsights += baseInsightRate;
  state.resources += 0.5 * (1 + state.daoInsights * 0.01);

  // Breakthrough rates calculation
  if (Math.random() < state.breakthroughRate) {
    // Breakthrough! Huge boost to Qi flow
    state.qiFlow += 100 * baseQiRate;
    state.daoInsights += 10;
    state.breakthroughRate = 0.001; // reset after breakthrough
  } else {
    // Gradually increase breakthrough chance
    state.breakthroughRate += 0.0005; 
  }

  // Send visual/UI state update
  self.postMessage({ type: 'TICK', payload: { ...state } });

  // Handle auto-syncs
  ticksSinceLastSync++;
  if (ticksSinceLastSync >= SYNC_INTERVAL_TICKS) {
    self.postMessage({ type: 'AUTOSYNC', payload: { ...state } });
    ticksSinceLastSync = 0;
  }
}

self.onmessage = (e: MessageEvent<CultivationMessage>) => {
  const { type, payload } = e.data;

  if (type === 'START') {
    if (payload) {
      state = { ...state, ...payload };
    }
    if (!intervalId) {
      intervalId = setInterval(tick, 1000);
    }
  } else if (type === 'STOP') {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  } else if (type === 'SET_RATES') {
    baseQiRate = payload.baseQiRate ?? baseQiRate;
    baseInsightRate = payload.baseInsightRate ?? baseInsightRate;
  }
};
