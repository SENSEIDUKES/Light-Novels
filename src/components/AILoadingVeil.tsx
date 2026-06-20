import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const AILoadingVeil: React.FC = () => {
  const { isGenerating, generationPhase, generationProgressMessage, estimatedSecondsRemaining } = useAppStore();

  return (
    <AnimatePresence>
      {(isGenerating && generationPhase !== 'chapter') && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-void/95 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-6 text-center"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-[420px] h-[420px] rounded-full bg-radial-gradient from-portal/10 via-human/5 to-transparent blur-3xl pointer-events-none"></div>

          <div className="relative w-40 h-40 mb-10 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              className="absolute inset-0 rounded-full border border-dashed border-human/60 border-t-human scale-110"
            />
            
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
              className="absolute inset-2 rounded-full border border-dotted border-portal/80 border-b-portal"
            />
            
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="absolute inset-6 rounded-full bg-gradient-to-tr from-human/20 to-portal/20 blur-sm"
            />

            <div className="relative z-10 text-signal animate-pulse flex flex-col items-center justify-center">
              <Sparkles size={36} className="text-portal drop-shadow-[0_0_12px_rgba(4,172,255,0.7)]" />
            </div>
          </div>

          <div className="mb-4">
            <span className="font-sc text-[10px] tracking-[0.25em] font-bold uppercase text-portal/90 bg-portal/5 px-3 py-1.5 border border-portal/20 rounded shadow-[0_0_12px_rgba(4,172,255,0.1)]">
              {generationPhase === 'blueprint' && "Aetherial Mapping"}
              {generationPhase === 'initial-arc' && "Scripture Initiation"}
              {generationPhase === 'steer' && "Sovereign Shift"}
              {generationPhase === 'cover' && "Cover Reforging"}
              {!generationPhase && "Consciousness Sync"}
            </span>
          </div>

          <h3 className="font-display font-medium text-xl sm:text-2xl text-signal max-w-lg leading-snug tracking-wide mb-3">
            {generationProgressMessage || "Manifesting spiritual matrices..."}
          </h3>

          <p className="font-serif italic text-xs text-neutral-450 max-w-md leading-relaxed mb-8">
            {generationPhase === 'blueprint' && "Establishing foundational laws, power limitations, and planetary properties."}
            {generationPhase === 'initial-arc' && "Transcribing the grand volume ledger, compiling chapter milestones and character templates."}
            {generationPhase === 'steer' && "Merging your custom instructions with fate timelines to trigger the subsequent 10 chapters."}
            {generationPhase === 'cover' && "Translating core premise variables into bespoke high-fidelity digital art scrolls."}
            {!generationPhase && "Interfacing with the SEIHouse deep narrative engine."}
          </p>

          {estimatedSecondsRemaining !== null && (
            <div className="w-full max-w-xs space-y-3 font-sans">
              <div className="flex justify-between items-center text-[10px] tracking-wider uppercase text-neutral-500 font-medium">
                <span className="font-mono">TEMPORAL CONVERGENCE</span>
                <span className="font-mono text-portal font-semibold">
                  ~{estimatedSecondsRemaining}S REMAINING
                </span>
              </div>
              
              <div className="w-full h-1.5 bg-neutral-950 border border-neutral-905 rounded-full overflow-hidden shadow-inner relative">
                {(() => {
                  const totalDuration = generationPhase === 'blueprint' ? 15 
                    : generationPhase === 'initial-arc' ? 25 
                    : generationPhase === 'steer' ? 25 
                    : generationPhase === 'cover' ? 15 
                    : 20;
                  
                  const pct = Math.max(2, Math.min(98, Math.round(((totalDuration - estimatedSecondsRemaining) / totalDuration) * 100)));
                  return (
                    <div 
                      className="h-full bg-gradient-to-r from-human via-portal to-portal shadow-[0_0_8px_rgba(4,172,255,0.5)] transition-all duration-1000 ease-out rounded-full" 
                      style={{ width: `${pct}%` }} 
                    />
                  );
                })()}
              </div>

              <div className="text-[9px] uppercase tracking-widest text-neutral-600 font-mono">
                DO NOT PURGE CONNECTION • PRESERVING CONTEXT LOCK
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
