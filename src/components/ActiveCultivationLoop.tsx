import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Activity } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { awardDirectQi } from '../lib/qi';
import { auth } from '../lib/firebase';
import type { CultivationMessage, CultivationResponse, CultivationState } from '../workers/cultivationWorker';

export function ActiveCultivationLoop() {
  const store = useAppStore();
  const workerRef = useRef<Worker | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // Initialize Web Worker
    workerRef.current = new Worker(new URL('../workers/cultivationWorker.ts', import.meta.url), { type: 'module' });

    workerRef.current.onmessage = (e: MessageEvent<CultivationResponse>) => {
      const { type, payload } = e.data;

      if (type === 'TICK') {
        store.updateCultivationState(payload);
      } else if (type === 'AUTOSYNC') {
        // Sync the accumulated Qi back to the backend
        if (auth.currentUser && payload.qiFlow > 0) {
          const syncAmount = Math.floor(payload.qiFlow);
          if (syncAmount > 0) {
            // We just give 1 qi per autosync if they accumulated enough, or whatever logic.
            // For now, let's just award 1 Qi periodically as a background reward
            awardDirectQi(1, `active-cultivation-sync`);
          }
        }
      }
    };

    // Start the worker
    const initialPayload: Partial<CultivationState> = {
      qiFlow: 0,
      daoInsights: 0,
      breakthroughRate: 0.001,
      resources: 0,
    };
    workerRef.current.postMessage({ type: 'START', payload: initialPayload });

    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'STOP' });
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []); // Run once on mount

  // Render a tiny subtle HUD
  return (
    <div 
      className="fixed bottom-4 left-4 z-50 flex items-end gap-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="w-8 h-8 rounded-full bg-black/40 border border-white/10 backdrop-blur-md flex items-center justify-center cursor-help">
        <Activity className="w-4 h-4 text-portal/60" />
      </div>
      
      <motion.div 
        initial={{ opacity: 0, width: 0 }}
        animate={{ 
          opacity: isHovered ? 1 : 0,
          width: isHovered ? 'auto' : 0
        }}
        className="overflow-hidden"
      >
        <div className="bg-black/60 border border-white/10 backdrop-blur-md rounded-lg p-2 text-[10px] font-mono whitespace-nowrap space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-neutral-500">Qi Flow:</span>
            <span className="text-portal">{store.idleQiFlow.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-neutral-500">Dao Insights:</span>
            <span className="text-amber-400">{store.idleDaoInsights.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-neutral-500">Breakthrough Chance:</span>
            <span className="text-rose-400">{(store.idleBreakthroughRate * 100).toFixed(2)}%</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
