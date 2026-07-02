import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, BrainCircuit, Compass, AlertCircle, RefreshCw, Maximize2, Minimize2, Loader2 } from 'lucide-react';
import { AGENTS } from '../lib/agents';
import { AgentBadge } from './AgentBadge';

export default function AILoadingVeil() {
  const [showDetails, setShowDetails] = React.useState(false);
  const isGenerating = useAppStore(state => state.isGenerating);
    const generationPhase = useAppStore(state => state.generationPhase);
    const generationProgressMessage = useAppStore(state => state.generationProgressMessage);
    const estimatedSecondsRemaining = useAppStore(state => state.estimatedSecondsRemaining);
    const activeAgentId = useAppStore(state => state.activeAgentId);
    const streamingChapter = useAppStore(state => state.streamingChapter);
    const isVeilMinimized = useAppStore(state => state.isVeilMinimized);
    const setIsVeilMinimized = useAppStore(state => state.setIsVeilMinimized);
    const generatingChapterNum = useAppStore(state => state.generatingChapterNum);

  const activeAgent = activeAgentId ? (activeAgentId === 'versa' ? AGENTS.VERSA : AGENTS.SCOUT) : null;
  const isVersa = !activeAgentId || activeAgentId === 'versa';
  const activeAgentWithDefault = activeAgent || AGENTS.VERSA;

  // Determine if we should show the full-screen immersive veil or the minimized floating widget.
  // The veil stays up for the ENTIRE chapter generation — streaming AND the continuity pass —
  // so the reader never sees an unverified draft or a jarring re-show. The finished, continuity-
  // checked chapter is revealed in a single clean reveal when generation completes.
  // (The reader can still opt into watching live by manually minimizing the veil.)
  const shouldShowFullScreen = isGenerating && !isVeilMinimized;

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
                <p className="text-xs font-medium text-signal">
                  {streamingChapter?.blocks?.length
                    ? `Woven ${streamingChapter.blocks.length} passages so far...`
                    : "Initiating Cosmic Channel..."}
                </p>
                <p className="text-[10px] text-neutral-400">
                  The chapter is revealed once its continuity is verified.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* 2. PERSISTENT FLOATING CORNER INDICATOR (BOTTOM-LEFT GLOWING ICON) */}
      {isGenerating && (!shouldShowFullScreen) && (
        <div className="fixed bottom-32 left-6 z-[9999] flex flex-col items-start select-none">
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={`absolute bottom-20 left-0 w-72 bg-zinc-950/95 border ${isVersa ? 'border-amber-500/30 hover:border-amber-500/50' : 'border-portal/30 hover:border-portal/50'} text-zinc-100 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.95)] backdrop-blur-md flex flex-col gap-3 transition-all duration-300 pointer-events-auto`}
              >
                {/* Floating Widget Header */}
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className={`w-2 h-2 rounded-full ${isVersa ? 'bg-amber-500' : 'bg-portal'} animate-ping absolute inset-0`}></div>
                      <div className={`w-2 h-2 rounded-full ${isVersa ? 'bg-amber-500' : 'bg-portal'} relative`}></div>
                    </div>
                    <span className={`font-sc text-[10px] tracking-[0.15em] ${isVersa ? 'text-amber-500' : 'text-portal'} uppercase font-bold`}>
                      {generationPhase === 'chapter' ? `Forging Chapter ${generatingChapterNum || ''}` : "Celestial Engine"}
                    </span>
                  </div>
                  
                  <button
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }}
                    onClick={() => {
                      setIsVeilMinimized(false);
                      setShowDetails(false);
                    }}
                    title="Expand Visual Chamber"
                    className={`p-1 rounded text-zinc-400 ${isVersa ? 'hover:text-amber-500' : 'hover:text-portal'} hover:bg-zinc-900/50 transition-all cursor-pointer`}
                  >
                    <Maximize2 size={13} />
                  </button>
                </div>

                {/* Floating Widget Body */}
                <div className="text-left">
                  <p className="text-xs font-semibold text-zinc-150 leading-tight">
                    {generationPhase === 'chapter' 
                      ? `Chapter ${generatingChapterNum || ''} is generating.`
                      : "Engine is forging spiritual matrix."}
                  </p>
                  <p className="text-[11px] text-zinc-400 italic mt-1 leading-relaxed">
                    {generationProgressMessage || "Manifesting spiritual matrices..."}
                  </p>
                </div>

                {/* Progress / Time Footer */}
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 bg-zinc-900/40 px-2.5 py-1.5 rounded-lg border border-zinc-900">
                  <div className="flex items-center gap-1.5">
                    <Loader2 size={11} className={`animate-spin ${isVersa ? 'text-amber-500' : 'text-portal'}`} />
                    <span>Aether Stream Active</span>
                  </div>
                  {estimatedSecondsRemaining !== null && (
                    <span>~{estimatedSecondsRemaining}s left</span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* The compact glowing circular icon button */}
          <motion.button
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }}
            onClick={() => setShowDetails(prev => !prev)}
            onMouseEnter={() => setShowDetails(true)}
            onMouseLeave={() => setShowDetails(false)}
            className={`relative w-14 h-14 rounded-full bg-zinc-950/90 border ${isVersa ? 'border-amber-500/40 hover:border-amber-500/80' : 'border-portal/40 hover:border-portal/80'} flex items-center justify-center cursor-pointer pointer-events-auto transition-all duration-300 outline-none`}
            animate={{
              scale: [1, 1.04, 1],
              boxShadow: isVersa 
                ? [
                    "0 0 10px rgba(245, 158, 11, 0.15)",
                    "0 0 25px rgba(245, 158, 11, 0.65)",
                    "0 0 10px rgba(245, 158, 11, 0.15)"
                  ]
                : [
                    "0 0 10px rgba(4, 172, 255, 0.15)",
                    "0 0 25px rgba(4, 172, 255, 0.65)",
                    "0 0 10px rgba(4, 172, 255, 0.15)"
                  ]
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {/* Slow-Rotating Outer Ritual Ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
              className={`absolute -inset-1 rounded-full border border-dashed ${isVersa ? 'border-amber-500/25' : 'border-portal/25'}`}
            />

            {/* Glowing Ambient Radial BG */}
            <div className={`absolute inset-0.5 rounded-full bg-gradient-to-tr ${isVersa ? 'from-amber-500/10 to-red-500/5' : 'from-portal/10 to-blue-500/5'} blur-xs`} />

            {/* Main Icon Content Wrapper */}
            <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden relative shadow-inner">
              {activeAgentWithDefault ? (
                <img 
                  src={activeAgentWithDefault.logoUrl} 
                  alt={activeAgentWithDefault.name}
                  className="w-full h-full object-contain relative z-10 p-0.5"
                  referrerPolicy="no-referrer"
                  style={isVersa ? { filter: 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.5))' } : { filter: 'drop-shadow(0 0 4px rgba(4, 172, 255, 0.5))' }}
                />
              ) : (
                <Compass size={18} className={`${isVersa ? 'text-amber-500' : 'text-portal'} animate-pulse`} />
              )}
            </div>

            {/* Dynamic blink status node on top-right of the circle badge */}
            <div className={`absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-zinc-950 border ${isVersa ? 'border-amber-500/30' : 'border-portal/30'} flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.8)]`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isVersa ? 'bg-amber-500' : 'bg-portal'} animate-pulse`} />
            </div>
          </motion.button>
        </div>
      )}
    </AnimatePresence>
  );
}
