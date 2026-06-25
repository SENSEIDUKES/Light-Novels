import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, BrainCircuit, Compass, AlertCircle, RefreshCw, Maximize2, Minimize2, Loader2 } from 'lucide-react';
import { AGENTS } from '../lib/agents';
import { AgentBadge } from './AgentBadge';

export default function AILoadingVeil() {
  const {
    isGenerating,
    generationPhase,
    generationProgressMessage,
    estimatedSecondsRemaining,
    activeAgentId,
    streamingChapter,
    isVeilMinimized,
    setIsVeilMinimized,
    generatingChapterNum
  } = useAppStore();

  const activeAgent = activeAgentId ? (activeAgentId === 'versa' ? AGENTS.VERSA : AGENTS.SCOUT) : null;

  // Determine if we should show the full-screen immersive veil or the minimized floating widget.
  // By default, if blocks are already streaming, we don't show the full-screen veil.
  const shouldShowFullScreen = isGenerating && !isVeilMinimized && !(generationPhase === 'chapter' && streamingChapter?.blocks?.length);

  return (
    <AnimatePresence>
      {/* 1. FULL-SCREEN IMMERSIVE VEIL */}
      {shouldShowFullScreen && (
        <motion.div
          key="fullscreen-veil"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 bg-void/95 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-6 text-center"
        >
          {/* Top Minimize Control Bar */}
          <div className="absolute top-6 right-6 flex items-center gap-3">
            <button
               tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setIsVeilMinimized(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-portal/35 bg-portal/10 hover:bg-portal/20 text-portal text-xs font-sc tracking-widest uppercase transition-all duration-300 shadow-[0_0_15px_rgba(4,172,255,0.1)] hover:shadow-[0_0_20px_rgba(4,172,255,0.3)] cursor-pointer"
            >
              <Minimize2 size={13} />
              <span>Minimize to Background</span>
            </button>
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-[420px] h-[420px] rounded-full bg-radial-gradient from-portal/10 via-human/5 to-transparent blur-3xl pointer-events-none"></div>

          {activeAgent ? (
            <div className="mb-10 w-full flex justify-center">
              <AgentBadge agent={activeAgent} task={generationProgressMessage || `Active in ${generationPhase} phase...`} isWorking={true} />
            </div>
          ) : (
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
          )}

          <div className="mb-4">
            <span className="font-sc text-[10px] tracking-[0.25em] font-bold uppercase text-portal/90 bg-portal/5 px-3 py-1.5 border border-portal/20 rounded shadow-[0_0_12px_rgba(4,172,255,0.1)]">
              {generationPhase === 'blueprint' && "Aetherial Mapping"}
              {generationPhase === 'initial-arc' && "Scripture Initiation"}
              {generationPhase === 'steer' && "Sovereign Shift"}
              {generationPhase === 'cover' && "Cover Reforging"}
              {generationPhase === 'chapter' && `Chapter ${generatingChapterNum || ''} Manifestation`}
              {!generationPhase && "Consciousness Sync"}
            </span>
          </div>

          <h3 className="font-display font-medium text-xl sm:text-2xl text-signal max-w-lg leading-snug tracking-wide mb-3">
            {generationProgressMessage || (activeAgent ? 
              (activeAgent.id === 'versa' ? "VERSA is forging the requested timeline..." : "SCOUT is parsing the narrative flow...") : 
              "Manifesting spiritual matrices...")}
          </h3>

          <p className="font-serif italic text-xs text-neutral-450 max-w-md leading-relaxed mb-8">
            {generationPhase === 'blueprint' && "Establishing foundational laws, power limitations, and planetary properties."}
            {generationPhase === 'initial-arc' && "Transcribing the grand volume ledger, compiling chapter milestones and character templates."}
            {generationPhase === 'steer' && "Merging your custom instructions with fate timelines to trigger the subsequent 10 chapters."}
            {generationPhase === 'cover' && "Translating core premise variables into bespoke high-fidelity digital art."}
            {generationPhase === 'chapter' && "Weaving celestial threads into reality, condensing spiritual essence into narrative form."}
            {!generationPhase && "Interfacing with the SEIHouse deep narrative engine."}
          </p>

          {estimatedSecondsRemaining !== null && (
            <div className="mb-6 flex items-center justify-center gap-2 text-xs font-mono text-neutral-450 bg-neutral-900/40 px-3 py-1 border border-neutral-800/50 rounded-full">
              <RefreshCw size={12} className="animate-spin text-portal" />
              <span>Forging completes in ~{estimatedSecondsRemaining}s</span>
            </div>
          )}

          {generationPhase === 'chapter' && (
            <div className="w-full max-w-sm bg-neutral-900/60 border border-neutral-800/80 rounded-lg p-4 flex items-center gap-3">
              <RefreshCw size={16} className="animate-spin text-portal" />
              <div className="text-left">
                <p className="text-xs font-medium text-signal">Initiating Cosmic Channel...</p>
                <p className="text-[10px] text-neutral-400">Whispering prompt vectors to the local node.</p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* 2. PERSISTENT FLOATING CORNER INDICATOR */}
      {isGenerating && (!shouldShowFullScreen) && (
        <motion.div
          key="minimized-floating-badge"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-6 right-6 z-[9999] w-80 bg-zinc-950/95 border border-amber-500/30 text-zinc-100 rounded-2xl p-4 shadow-2xl shadow-black/90 backdrop-blur-md flex flex-col gap-3 select-none hover:border-amber-500/50 transition-all duration-300"
        >
          {/* Floating Widget Header */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping absolute inset-0"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 relative"></div>
              </div>
              <span className="font-sc text-[10px] tracking-[0.2em] text-amber-500 uppercase font-bold">
                {generationPhase === 'chapter' ? `Forging Chapter ${generatingChapterNum || ''}` : "Celestial Engine Working"}
              </span>
            </div>
            
            <button
               tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setIsVeilMinimized(false)}
              title="Expand Visual Chamber"
              className="p-1 rounded-md text-zinc-400 hover:text-amber-500 hover:bg-zinc-900 transition-all cursor-pointer"
            >
              <Maximize2 size={13} />
            </button>
          </div>

          {/* Floating Widget Body */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center shrink-0 overflow-hidden relative">
              {activeAgent ? (
                <img 
                  src={activeAgent.logoUrl} 
                  alt={activeAgent.name}
                  className="w-full h-full object-contain relative z-10"
                  style={activeAgent.id === 'versa' ? { filter: 'drop-shadow(0 0 5px rgba(139, 0, 0, 0.6))' } : { filter: 'drop-shadow(0 0 5px rgba(4, 172, 255, 0.6))' }}
                />
              ) : (
                <Compass size={16} className="text-portal animate-pulse" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-100 truncate">
                {generationPhase === 'chapter' 
                  ? `Chapter ${generatingChapterNum || ''} is still generating.`
                  : "Engine is forging spiritual matrix."}
              </p>
              <p className="text-[11px] text-zinc-400 italic mt-0.5 leading-relaxed truncate">
                {generationProgressMessage || "Manifesting spiritual matrices..."}
              </p>
            </div>
          </div>

          {/* Progress / Time Footer */}
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 bg-zinc-900/40 px-2 py-1 rounded-md border border-zinc-800/40">
            <div className="flex items-center gap-1.5">
              <Loader2 size={10} className="animate-spin text-amber-500" />
              <span>Aether Stream Active</span>
            </div>
            {estimatedSecondsRemaining !== null && (
              <span>~{estimatedSecondsRemaining}s left</span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
