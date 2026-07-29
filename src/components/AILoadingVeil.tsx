import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { selectGenerationPhase, selectIsGenerating } from '../store/useGenerationStore';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Compass, Maximize2, Minimize2, Loader2 } from 'lucide-react';
import { AGENTS } from '../lib/agents';

// Short atmospheric status lines Versa cycles through while a chapter is forged.
const VERSA_QUOTES = [
  'Cooking the chapter...',
  'Forging continuity...',
  'Weaving celestial threads...',
  'Condensing spiritual essence...',
  'Consulting the Codex...',
  'Binding narrative threads...',
];

const ACCENT = {
  versa: '#8B0000',
  scout: '#04ACFF',
} as const;

/**
 * Library Seal — the order's pen-nib sigil inside a circular seal ring.
 * The outer arc slowly fills as the chapter forms, so the emblem itself
 * is the loading indicator.
 */
const LibrarySeal: React.FC<{ progress: number | null; isVersa: boolean }> = ({ progress, isVersa }) => {
  const accent = isVersa ? ACCENT.versa : ACCENT.scout;
  const R = 26;
  const CIRCUMFERENCE = 2 * Math.PI * R;
  const filled = progress !== null ? (CIRCUMFERENCE * (1 - progress / 100)) : CIRCUMFERENCE * 0.72;

  return (
    <svg
      viewBox="0 0 64 64"
      className="w-16 h-16 shrink-0"
      style={{ filter: `drop-shadow(0 0 6px ${isVersa ? 'rgba(139,0,0,0.45)' : 'rgba(4,172,255,0.45)'})` }}
      aria-hidden="true"
    >
      {/* Cardinal seal ticks */}
      <g stroke={accent} strokeWidth="1" opacity="0.5">
        <line x1="32" y1="1" x2="32" y2="5" />
        <line x1="32" y1="59" x2="32" y2="63" />
        <line x1="1" y1="32" x2="5" y2="32" />
        <line x1="59" y1="32" x2="63" y2="32" />
      </g>

      {/* Track ring */}
      <circle cx="32" cy="32" r={R} fill="none" stroke="#262626" strokeWidth="2.5" />

      {/* Filling arc — indeterminate phases sweep a partial arc instead */}
      {progress !== null ? (
        <circle
          cx="32" cy="32" r={R} fill="none"
          stroke={accent} strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={filled}
          transform="rotate(-90 32 32)"
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
      ) : (
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        >
          <circle
            cx="32" cy="32" r={R} fill="none"
            stroke={accent} strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={filled}
          />
        </motion.g>
      )}

      {/* Inner dashed ornament ring */}
      <circle cx="32" cy="32" r="19" fill="none" stroke={accent} strokeWidth="1" strokeDasharray="2 4" opacity="0.35" />

      {/* Pen-nib glyph */}
      <g stroke={accent} strokeWidth="1.5" fill="none" opacity="0.9">
        <path d="M32 19 L37 33 L32 45 L27 33 Z" />
        <line x1="32" y1="31" x2="32" y2="40" />
      </g>
      <circle cx="32" cy="29" r="1.2" fill={accent} opacity="0.9" />
    </svg>
  );
};

/**
 * Celestial matrix — faint concentric rings, star points, and cardinal sparks
 * drifting behind the agent emblem so the top section reads as a cosmic sigil.
 */
const CelestialSigil: React.FC<{ isVersa: boolean }> = ({ isVersa }) => {
  const accent = isVersa ? ACCENT.versa : ACCENT.scout;
  const stars = React.useMemo<Array<[number, number, number, number]>>(() => [
    // [cx, cy, r, opacity]
    [38, 52, 1.1, 0.5], [196, 64, 0.9, 0.4], [52, 178, 1.2, 0.45], [188, 186, 0.8, 0.35],
    [86, 30, 0.7, 0.4], [152, 34, 1.0, 0.45], [28, 118, 0.8, 0.35], [210, 122, 1.1, 0.4],
    [104, 208, 0.9, 0.4], [140, 204, 0.7, 0.3], [64, 96, 0.6, 0.3], [176, 100, 0.6, 0.3],
  ], []);
  const ticks = React.useMemo(() => Array.from({ length: 12 }, (_, i) => i * 30), []);

  return (
    <svg viewBox="0 0 240 240" className="absolute w-[280px] h-[280px] pointer-events-none" aria-hidden="true">
      {/* Slow-drifting outer dashed ring */}
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 80, ease: 'linear' }}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      >
        <circle cx="120" cy="120" r="110" fill="none" stroke={accent} strokeWidth="0.8" strokeDasharray="1 6" opacity="0.3" />
        {/* Cardinal diamond sparks riding the outer ring */}
        {[0, 90, 180, 270].map((deg) => (
          <path
            key={deg}
            d="M120 6 L123 10 L120 14 L117 10 Z"
            fill={accent}
            opacity="0.55"
            transform={`rotate(${deg} 120 120)`}
          />
        ))}
      </motion.g>

      {/* Counter-drifting mid ring with tick marks */}
      <motion.g
        animate={{ rotate: -360 }}
        transition={{ repeat: Infinity, duration: 120, ease: 'linear' }}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      >
        <circle cx="120" cy="120" r="96" fill="none" stroke={accent} strokeWidth="0.6" opacity="0.18" />
        <circle cx="120" cy="120" r="70" fill="none" stroke={accent} strokeWidth="0.7" strokeDasharray="3 5" opacity="0.22" />
        {ticks.map((deg) => (
          <line
            key={deg}
            x1="120" y1="17" x2="120" y2="22"
            stroke={accent} strokeWidth="0.8" opacity="0.3"
            transform={`rotate(${deg} 120 120)`}
          />
        ))}
      </motion.g>

      {/* Fixed star field */}
      {stars.map(([cx, cy, r, opacity], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="#E8E4F0" opacity={opacity} />
      ))}
    </svg>
  );
};

export default function AILoadingVeil() {
  const [showDetails, setShowDetails] = React.useState(false);
  const [quoteIndex, setQuoteIndex] = React.useState(0);
  const isGenerating = useAppStore(selectIsGenerating);
    const generationPhase = useAppStore(selectGenerationPhase);
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

  // Live progress signal, folded into the unified card instead of a separate status box.
  const passagesWoven = Array.isArray(streamingChapter?.blocks) ? streamingChapter.blocks.length : 0;
  const isChapterPhase = generationPhase === 'chapter';
  const progressWidth = isChapterPhase
    ? Math.min(6 + passagesWoven * 4.5, 96)
    : null;

  // Rotate Versa's status quotes every few seconds while she works.
  React.useEffect(() => {
    if (!shouldShowFullScreen || !isChapterPhase) {
      setQuoteIndex(0);
      return;
    }
    const id = setInterval(() => {
      setQuoteIndex(i => (i + 1) % VERSA_QUOTES.length);
    }, 3500);
    return () => clearInterval(id);
  }, [shouldShowFullScreen, isChapterPhase, generatingChapterNum]);

  const statusQuote = isChapterPhase
    ? VERSA_QUOTES[quoteIndex]
    : (generationProgressMessage || 'Manifesting spiritual matrices...');

  return (
    <AnimatePresence>
      {/* 1. FULL-SCREEN IMMERSIVE VEIL */}
      {shouldShowFullScreen && (
        <motion.div
          key="fullscreen-veil"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.985, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 bg-void/95 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-6 text-center overflow-y-auto"
        >
          {/* Top-right icon-only minimize control */}
          <button
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }}
            onClick={() => setIsVeilMinimized(true)}
            title="Minimize to Background"
            aria-label="Minimize to Background"
            className="absolute top-5 right-5 sm:top-6 sm:right-6 w-10 h-10 rounded-full border border-portal/35 bg-portal/10 hover:bg-portal/20 text-portal flex items-center justify-center transition-all duration-300 shadow-[0_0_15px_rgba(4,172,255,0.1)] hover:shadow-[0_0_20px_rgba(4,172,255,0.3)] cursor-pointer"
          >
            <Minimize2 size={15} />
          </button>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-[420px] h-[420px] rounded-full bg-radial-gradient from-portal/10 via-human/5 to-transparent blur-3xl pointer-events-none"></div>

          {/* Agent character — floating emblem inside a celestial matrix sigil */}
          <div className="relative w-36 h-36 sm:w-40 sm:h-40 mb-10 mt-4 flex items-center justify-center shrink-0">
            <CelestialSigil isVersa={isVersa} />
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 0.4, 0], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className={`absolute inset-[-20%] rounded-full blur-2xl ${isVersa ? 'bg-human/20' : 'bg-portal/20'}`}
            />
            <motion.div
              className="relative z-10 w-full h-full flex items-center justify-center"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <img
                src={activeAgentWithDefault.logoUrl}
                alt={activeAgentWithDefault.name}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
                style={isVersa ? { filter: 'drop-shadow(0 0 15px rgba(139, 0, 0, 0.4))' } : { filter: 'drop-shadow(0 0 15px rgba(4, 172, 255, 0.4))' }}
              />
            </motion.div>
          </div>

          {/* Unified agent card — name, rotating status quote, seal progress, atmospheric phrase */}
          <div className={`w-full max-w-md bg-neutral-950/80 border ${isVersa ? 'border-human/25' : 'border-portal/25'} rounded-xl px-5 sm:px-6 py-6 shadow-[0_0_40px_rgba(0,0,0,0.6)]`}>
            {/* Card header — the agent's name alone carries the hierarchy */}
            <div className="mb-2">
              <span className={`font-display font-bold text-2xl tracking-[0.35em] ${activeAgentWithDefault.colorClass}`}>
                {activeAgentWithDefault.name}
              </span>
            </div>

            {/* Ornamented divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`h-px flex-1 ${isVersa ? 'bg-human/20' : 'bg-portal/20'}`} />
              <Sparkles size={10} className={isVersa ? 'text-human/60' : 'text-portal/60'} />
              <div className={`h-px flex-1 ${isVersa ? 'bg-human/20' : 'bg-portal/20'}`} />
            </div>

            {/* Rotating status quote — soft crossfade, the only text allowed to change */}
            <div className="min-h-[24px] flex items-center justify-center mb-6">
              <AnimatePresence mode="wait">
                <motion.span
                  key={statusQuote}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.45, ease: 'easeInOut' }}
                  className="font-serif italic text-sm text-neutral-300 leading-snug"
                >
                  {statusQuote}
                </motion.span>
              </AnimatePresence>
            </div>

            {/* Progress row — Library Seal left, persistent chapter tracker beside it */}
            <div className="flex items-center gap-4 mb-5">
              <LibrarySeal progress={progressWidth} isVersa={isVersa} />

              <div className="flex-1 text-left">
                {/* Persistent — never fades while Versa works */}
                <p className="font-display text-base text-signal tracking-wide mb-1">
                  {isChapterPhase ? `Chapter ${generatingChapterNum || ''}` : 'Celestial Engine'}
                </p>
                <div className="flex items-baseline justify-between gap-2 mb-2">
                  <span className="font-sans text-[11px] text-neutral-400">
                    {isChapterPhase
                      ? (passagesWoven > 0 ? `${passagesWoven} passages formed` : 'Initiating Cosmic Channel')
                      : 'Spiritual matrix forming'}
                  </span>
                  {estimatedSecondsRemaining !== null && (
                    <span className="font-mono text-[10px] text-neutral-450 shrink-0">~{estimatedSecondsRemaining}s</span>
                  )}
                </div>
                <div className="h-1 rounded-full bg-neutral-800/90 overflow-hidden">
                  {progressWidth !== null ? (
                    <motion.div
                      className={`h-full rounded-full ${isVersa ? 'bg-human shadow-[0_0_8px_rgba(139,0,0,0.6)]' : 'bg-portal shadow-[0_0_8px_rgba(4,172,255,0.6)]'}`}
                      initial={{ width: '6%' }}
                      animate={{ width: `${progressWidth}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  ) : (
                    <motion.div
                      className={`h-full rounded-full ${isVersa ? 'bg-human shadow-[0_0_8px_rgba(139,0,0,0.6)]' : 'bg-portal shadow-[0_0_8px_rgba(4,172,255,0.6)]'}`}
                      animate={{ width: ['12%', '55%', '12%'] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}
                </div>
                {isChapterPhase && (
                  <p className="font-sans text-[10px] text-neutral-500 mt-2 leading-snug">
                    The chapter is revealed once its continuity is verified.
                  </p>
                )}
              </div>
            </div>

            {/* Ornamented divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1 bg-neutral-800" />
              <Sparkles size={10} className={isVersa ? 'text-human/60' : 'text-portal/60'} />
              <div className="h-px flex-1 bg-neutral-800" />
            </div>

            {/* Atmospheric phrase */}
            <p className="font-serif italic text-sm text-neutral-300 leading-relaxed max-w-sm mx-auto">
              {generationPhase === 'blueprint' && "Establishing foundational laws, power limitations, and planetary properties."}
              {generationPhase === 'initial-arc' && "Transcribing the grand volume ledger, compiling chapter milestones and character templates."}
              {generationPhase === 'steer' && "Merging your custom instructions with fate timelines to trigger the subsequent 10 chapters."}
              {generationPhase === 'cover' && "Translating core premise variables into bespoke high-fidelity digital art."}
              {generationPhase === 'chapter' && "Celestial threads are being woven into narrative form."}
              {!generationPhase && "Interfacing with the SEIHouse deep narrative engine."}
            </p>
          </div>

          {/* Phase marker beneath the card — stable for the whole generation */}
          <div className="mt-8">
            <span className="font-sc text-[10px] tracking-[0.3em] font-bold uppercase text-portal/90 bg-portal/5 px-4 py-2 border border-portal/25 rounded-full shadow-[0_0_12px_rgba(4,172,255,0.1)]">
              {generationPhase === 'blueprint' && "Aetherial Mapping"}
              {generationPhase === 'initial-arc' && "Scripture Initiation"}
              {generationPhase === 'steer' && "Sovereign Shift"}
              {generationPhase === 'cover' && "Cover Reforging"}
              {generationPhase === 'chapter' && `Chapter ${generatingChapterNum || ''} Manifestation`}
              {!generationPhase && "Consciousness Sync"}
            </span>
          </div>
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
                    aria-label="Expand Visual Chamber"
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
            aria-label={showDetails ? "Hide generation details" : "Show generation details"}
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
