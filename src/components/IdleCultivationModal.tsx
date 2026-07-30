import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

const PORTAL_RGB = '4,172,255';
const COLLAPSE_AFTER_MS = 7000;
/** Full claim sequence: cloud burst → dantian stream → pulse → dissolve. */
const CLAIM_CLOSE_MS = 1400;
/** Reduced-motion users get a simple fade instead of the particle sequence. */
const REDUCED_CLAIM_CLOSE_MS = 500;

/**
 * Progression lines keyed by days spent in the Library. The highest reached
 * threshold wins, so the message grows more prestigious the longer the path.
 * Append new [minDays, quote] entries to extend the ladder.
 */
const PROGRESSION_QUOTES: ReadonlyArray<readonly [minDays: number, quote: string]> = [
  [0, 'Your cultivation begins.'],
  [1, 'The first step has been taken.'],
  [3, 'Still finding your footing.'],
  [7, 'Just getting your feet wet.'],
  [10, 'The Library is becoming familiar.'],
  [14, 'Two weeks upon the path.'],
  [21, 'Your roots are beginning to take hold.'],
  [30, 'One month of steady cultivation.'],
  [40, 'The path no longer feels foreign.'],
  [50, 'Your foundation grows stronger.'],
  [60, 'Two months within the Library.'],
  [70, 'Consistency has become discipline.'],
  [80, 'Your presence has taken root.'],
  [90, 'A full season of cultivation.'],
  [105, 'The novice days are behind you.'],
  [120, 'Your foundation is firmly established.'],
  [135, 'The Library remembers your footsteps.'],
  [150, 'Few paths are walked this faithfully.'],
  [165, 'Your dedication speaks for itself.'],
  [180, 'Half a year upon the path.'],
];

/** Timeless lines occasionally mixed in between the progression quotes. */
const TIMELESS_QUOTES: readonly string[] = [
  'Even the longest paths begin in silence.',
  'The heavens favor those who return.',
  'A quiet mind gathers boundless Qi.',
  "Today's effort shapes tomorrow's realm.",
  'Some breakthroughs happen when no one is watching.',
];

/** Roughly one appearance in five carries a timeless line instead. */
const TIMELESS_QUOTE_CHANCE = 0.2;

function progressionQuote(days: number): string {
  let quote = PROGRESSION_QUOTES[0][1];
  for (const [minDays, q] of PROGRESSION_QUOTES) {
    if (days < minDays) break;
    quote = q;
  }
  return quote;
}

/** Heuristic for weaker hardware: trim effect density instead of dropping atmosphere. */
function isLowPowerDevice(): boolean {
  return typeof navigator !== 'undefined' && (navigator.hardwareConcurrency ?? 8) <= 4;
}

interface AbsorptionPath {
  sx: number;
  sy: number;
  ex: number;
  ey: number;
}

/** Silhouette of a cross-legged cultivator: deep navy robes, thin cyan rim light, no face. */
function CultivatorSvg({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const robeGradId = `cdc-robe-${useId()}`;
  return (
    <svg viewBox="0 0 120 100" className={className} style={style} aria-hidden="true">
      <defs>
        <linearGradient id={robeGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#101a30" />
          <stop offset="100%" stopColor="#04060d" />
        </linearGradient>
      </defs>
      {/* meditation platform rings */}
      <ellipse cx="60" cy="92" rx="46" ry="5.5" fill="none" stroke={`rgba(${PORTAL_RGB},0.28)`} strokeWidth="0.8" />
      <ellipse cx="60" cy="92" rx="54" ry="7.5" fill="none" stroke={`rgba(${PORTAL_RGB},0.12)`} strokeWidth="0.6" />
      <g stroke="rgba(140,233,255,0.55)" strokeWidth="0.7">
        {/* neck */}
        <path d="M56.5 25.5 L63.5 25.5 L63 31 L57 31 Z" fill="#04060d" stroke="none" />
        {/* crossed legs: low wide mound, knees poking above the lap */}
        <path
          d="M60 66.5 C53 63 44 61 36.5 61.5 C30.5 62 26 63.5 23.5 66 C20.5 69 18.5 72.5 18.5 76 C18.5 80.5 22 84.5 28.5 87 C36 89.8 48 91 60 91 C72 91 84 89.8 91.5 87 C98 84.5 101.5 80.5 101.5 76 C101.5 72.5 99.5 69 96.5 66 C94 63.5 89.5 62 83.5 61.5 C76 61 67 63 60 66.5 Z"
          fill={`url(#${robeGradId})`}
        />
        {/* torso: shoulders, tapered robe, forearms folding into the lap */}
        <path
          d="M54.5 30 C50.5 31 47 32.5 45 34.5 C43.5 36.5 42.8 39 42.5 42 C42 46 41.5 50 40.8 53.5 C40.3 56 39.5 58 38.5 59.5 C42.5 63 50 65.5 60 65.5 C70 65.5 77.5 63 81.5 59.5 C80.5 58 79.7 56 79.2 53.5 C78.5 50 78 46 77.5 42 C77.2 39 76.5 36.5 75 34.5 C73 32.5 69.5 31 65.5 30 Z"
          fill={`url(#${robeGradId})`}
        />
        {/* robe fold pooling between the legs */}
        <path d="M60 69 C60 75 59.5 83 60 89.5" fill="none" stroke="rgba(140,233,255,0.28)" strokeWidth="0.6" />
        {/* folded hands resting in the lap */}
        <ellipse cx="60" cy="65" rx="6" ry="2.8" fill="#0d1626" stroke="rgba(140,233,255,0.4)" strokeWidth="0.5" />
        {/* head + topknot */}
        <circle cx="60" cy="21" r="6.5" fill="#04060d" />
        <ellipse cx="60" cy="12.5" rx="2.2" ry="2.8" fill="#04060d" />
      </g>
    </svg>
  );
}

/** The meditating figure with its breathing aura. Pulses once as the qi lands, then dissolves. */
function CultivatorFigure({ claiming, calm = false }: { claiming: boolean; calm?: boolean }) {
  const lowPower = useReducedMotion() || isLowPowerDevice();
  return (
    <motion.div
      className="relative w-32 h-28 sm:w-[9.5rem] sm:h-[8.25rem] lg:w-48 lg:h-40"
      animate={
        claiming
          ? { opacity: 0, y: -14, filter: 'blur(6px)' }
          : { opacity: 1, y: 0, filter: 'blur(0px)' }
      }
      transition={claiming ? { duration: 0.65, delay: 0.75, ease: 'easeOut' } : { duration: 0.6 }}
    >
      {/* soft cyan aura breathing around the body; one gentle pulse as the qi is absorbed */}
      <motion.div
        className="absolute -inset-[18%] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 65%, rgba(${PORTAL_RGB},0.45) 0%, rgba(${PORTAL_RGB},0.12) 45%, transparent 70%)`,
          filter: 'blur(6px)',
        }}
        animate={
          claiming
            ? { opacity: [0.5, 1, 0], scale: [1, 1.3, 1.05] }
            : calm
              ? { opacity: 0.5, scale: 1 }
              : { opacity: [0.35, 0.65, 0.35], scale: [1, 1.12, 1] }
        }
        transition={
          claiming
            ? { duration: 0.8, delay: 0.55, times: [0, 0.35, 1] }
            : { duration: 4.2, repeat: Infinity, ease: 'easeInOut' }
        }
      />
      <CultivatorSvg
        className="relative w-full h-full"
        style={{ filter: `drop-shadow(0 0 6px rgba(${PORTAL_RGB},0.35))` }}
      />
      {/* qi motes drifting up from the cultivator (skipped on weak hardware) */}
      {!claiming && !lowPower &&
        [0, 1, 2].map(i => (
          <motion.span
            key={i}
            className="absolute left-1/2 top-[18%] w-1 h-1 rounded-full"
            style={{
              background: 'rgba(160,240,255,0.9)',
              boxShadow: `0 0 6px rgba(${PORTAL_RGB},0.9)`,
              x: (i - 1) * 10,
            }}
            animate={{ y: [-2, -20], opacity: [0, 0.9, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.9, ease: 'easeOut' }}
          />
        ))}
    </motion.div>
  );
}

/**
 * The burst cloud breaking into qi particles that stream down into the
 * cultivator's dantian, ending in a single soft pulse of absorbed energy.
 */
function DantianAbsorption({ path }: { path: AbsorptionPath }) {
  const { sx, sy, ex, ey } = path;
  const lowPower = useReducedMotion() || isLowPowerDevice();
  // Freeze the random particle paths per claim so unrelated re-renders don't retarget the burst.
  const particles = useMemo(() => {
    const { sx, sy } = path;
    return Array.from({ length: lowPower ? 8 : 16 }).map((_, i) => ({
      // break out of the cloud with a small scatter, then stream into the dantian
      bx: sx + (Math.random() - 0.5) * 56,
      by: sy + (Math.random() - 0.5) * 30,
      duration: 0.6 + Math.random() * 0.15,
      delay: i * 0.018 + Math.random() * 0.05,
      size: 2 + Math.random() * 3,
    }));
  }, [path, lowPower]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[110] overflow-hidden">
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            background: '#a5f3fc',
            boxShadow: `0 0 8px rgba(${PORTAL_RGB},1), 0 0 16px rgba(${PORTAL_RGB},0.6)`,
            filter: 'blur(0.5px)',
          }}
          initial={{ x: sx, y: sy, opacity: 0, scale: 0.4 }}
          animate={{
            x: [sx, p.bx, ex],
            y: [sy, p.by, ey],
            opacity: [0, 1, 0],
            scale: [0.4, 1, 0.3],
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn', times: [0, 0.35, 1] }}
        />
      ))}
      {/* the dantian flashes once as it absorbs the qi */}
      <motion.div
        className="absolute rounded-full"
        style={{
          left: ex,
          top: ey,
          width: 72,
          height: 72,
          x: '-50%',
          y: '-50%',
          background: `radial-gradient(circle, rgba(${PORTAL_RGB},0.8) 0%, rgba(${PORTAL_RGB},0.25) 45%, transparent 70%)`,
          filter: 'blur(4px)',
        }}
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: [0, 0.9, 0], scale: [0.4, 1.3, 1.75] }}
        transition={{ duration: 0.55, delay: 0.6, times: [0, 0.35, 1] }}
      />
    </div>
  );
}

export interface IdleCultivationModalProps {
  qiEarned: number | null;
  onClose: () => void;
  /**
   * Records the reward in the user's real balance. Must resolve only after
   * the transaction is confirmed, and reject when it failed — the veil stays
   * open for a retry on rejection.
   */
  onClaim: (qi: number) => Promise<void>;
  /** Lifetime active Library days; drives the day count and progression line. */
  daysCultivating?: number;
}

type ClaimPhase = 'idle' | 'confirming' | 'absorbing';

export function IdleCultivationModal({ qiEarned, onClose, onClaim, daysCultivating = 1 }: IdleCultivationModalProps) {
  const [claimPhase, setClaimPhase] = useState<ClaimPhase>('idle');
  const [collapsed, setCollapsed] = useState(false);
  const [absorption, setAbsorption] = useState<AbsorptionPath | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const figureRef = useRef<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cloudGradId = `cdc-cloud-${useId()}`;
  const cloudClipId = `cdc-cloudclip-${useId()}`;
  const shimmerGradId = `cdc-shimmer-${useId()}`;
  const titleId = `cdc-title-${useId()}`;
  const reduceMotion = useReducedMotion();
  const lowPower = reduceMotion || isLowPowerDevice();
  const days = Math.max(0, Math.floor(daysCultivating));
  const isClaiming = claimPhase !== 'idle';

  // Rolled once per veil opening: mostly the progression line for the user's
  // Library tenure, occasionally one of the timeless lines mixed in. Stable
  // across re-renders while the same reward is showing.
  const quote = useMemo(() => {
    if (qiEarned === null) return progressionQuote(days);
    if (Math.random() < TIMELESS_QUOTE_CHANCE) {
      return TIMELESS_QUOTES[Math.floor(Math.random() * TIMELESS_QUOTES.length)];
    }
    return progressionQuote(days);
  }, [qiEarned, days]);

  // If the reward sits unclaimed, fold the vignette away into a tiny waiting icon.
  useEffect(() => {
    if (qiEarned === null || isClaiming || collapsed) return;
    const timer = setTimeout(() => setCollapsed(true), COLLAPSE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [qiEarned, isClaiming, collapsed]);

  // Start each new reward cycle fresh.
  useEffect(() => {
    if (qiEarned === null) {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      setCollapsed(false);
      setClaimPhase('idle');
      setAbsorption(null);
    }
  }, [qiEarned]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const handleClaim = async () => {
    if (claimPhase !== 'idle' || !qiEarned) return;
    setClaimPhase('confirming');

    try {
      // The reward must be recorded in the real balance before the
      // disappearance animation may begin.
      await onClaim(qiEarned);
    } catch (e) {
      console.error("Failed to claim idle qi:", e);
      // The claim did not land (offline, timeout, server error): restore the
      // vignette so the user can retry instead of silently losing the reward.
      setClaimPhase('idle');
      return;
    }

    // The cloud breaks where it floats; the stream ends at the cultivator's dantian.
    const bubble = bubbleRef.current?.getBoundingClientRect();
    const figure = figureRef.current?.getBoundingClientRect();
    setAbsorption({
      sx: bubble ? bubble.left + bubble.width / 2 : window.innerWidth / 2,
      sy: bubble ? bubble.top + bubble.height / 2 : window.innerHeight - 220,
      ex: figure ? figure.left + figure.width / 2 : window.innerWidth / 2,
      ey: figure ? figure.top + figure.height * 0.6 : window.innerHeight - 120,
    });
    setClaimPhase('absorbing');

    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setClaimPhase('idle');
      setAbsorption(null);
      onClose();
    }, reduceMotion ? REDUCED_CLAIM_CLOSE_MS : CLAIM_CLOSE_MS);
  };

  const absorbing = claimPhase === 'absorbing';

  return (
    <>
      {absorption && !reduceMotion && <DantianAbsorption path={absorption} />}
      <AnimatePresence>
        {/* Full-viewport dim + soften: the Library stays visible enough to place the user, */}
        {/* not readable enough to compete, and stays up until claimed or minimized. */}
        {qiEarned !== null && !collapsed && (
          <motion.div
            key="cdc-scrim"
            aria-hidden="true"
            className="fixed inset-0 z-[95] pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at 50% 62%, rgba(2,5,12,0.55) 0%, rgba(2,5,12,0.72) 55%, rgba(2,5,12,0.82) 100%)',
              // Full-viewport backdrop blur is the costliest effect here; weak
              // devices and reduced-motion users keep the dim but skip the blur.
              ...(lowPower
                ? {}
                : { backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }),
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          />
        )}
        {qiEarned !== null &&
          (collapsed && !isClaiming ? (
            <motion.button
              key="cdc-collapsed"
              type="button"
              onClick={() => setCollapsed(false)}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              className="fixed right-4 bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] sm:right-6 lg:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] z-[100] w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#05080f]/95 backdrop-blur-lg border border-portal/40 shadow-[0_8px_24px_rgba(0,0,0,0.65),0_0_0_1px_rgba(4,172,255,0.12)] flex items-center justify-center overflow-visible touch-manipulation"
              aria-label="Open closed-door cultivation reward"
            >
              {/* soft ink aura so the orb sits on shadow instead of competing artwork */}
              <div
                aria-hidden="true"
                className="absolute -inset-6 rounded-full pointer-events-none -z-10"
                style={{
                  background: 'radial-gradient(circle, rgba(2,5,12,0.85) 0%, rgba(2,5,12,0.45) 55%, transparent 75%)',
                  filter: 'blur(6px)',
                }}
              />
              <motion.div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{ boxShadow: `0 0 14px rgba(${PORTAL_RGB},0.35)` }}
                animate={reduceMotion ? { opacity: 0.7 } : { opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <CultivatorSvg className="w-9 h-8 sm:w-10 sm:h-9" style={{ filter: `drop-shadow(0 0 4px rgba(${PORTAL_RGB},0.5))` }} />
              <span className="absolute -top-1.5 -right-1.5 px-1 rounded-full bg-portal/25 border border-portal/50 text-[9px] sm:text-[10px] font-bold text-cyan-100">
                +{qiEarned}
              </span>
            </motion.button>
          ) : (
            <motion.div
              key="cdc-vignette"
              role="dialog"
              aria-labelledby={titleId}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] sm:inset-x-auto sm:right-6 sm:justify-end lg:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] z-[100] flex justify-center pointer-events-none"
            >
              {/* The cloud and the cultivator's body are one tap target — swipes everywhere else pass through to the page. */}
              {/* Short viewports (mobile landscape, split-screen) compress the whole column from the bottom anchor. */}
              <div className="relative pointer-events-none flex flex-col items-center px-6 origin-bottom [@media(max-height:480px)]:scale-[0.85]">
                {/* soft dark ink aura: gently obscures whatever is underneath, no hard box */}
                <div
                  aria-hidden="true"
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none w-[min(94vw,440px)] h-[22rem] sm:w-[min(84vw,510px)] sm:h-[25.5rem] lg:w-[min(64vw,600px)] lg:h-[30rem]"
                  style={{
                    background:
                      'radial-gradient(ellipse at 50% 55%, rgba(2,5,12,0.92) 0%, rgba(2,5,12,0.7) 42%, rgba(2,5,12,0.35) 62%, transparent 78%)',
                    filter: 'blur(10px)',
                  }}
                />

                {/* progression block: how long the user has walked the Library's path */}
                <motion.div
                  aria-hidden="true"
                  className="relative flex flex-col items-center mb-1.5 sm:mb-2.5 pointer-events-none"
                  animate={absorbing ? { opacity: 0, y: -8 } : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                  <span className="text-[9px] sm:text-[10px] lg:text-[11px] font-sc uppercase tracking-[0.4em] text-portal/70">
                    Cultivating
                  </span>
                  <span
                    className="mt-1 font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-cyan-50 tracking-[0.15em] whitespace-nowrap"
                    style={{ textShadow: `0 0 12px rgba(${PORTAL_RGB},0.9), 0 0 32px rgba(${PORTAL_RGB},0.45)` }}
                  >
                    {days === 1 ? '1 DAY' : `${days} DAYS`}
                  </span>
                  <span className="mt-1.5 flex items-center gap-2.5" aria-hidden="true">
                    <span
                      className="block w-10 sm:w-12 h-px"
                      style={{ background: `linear-gradient(to right, transparent, rgba(${PORTAL_RGB},0.6))` }}
                    />
                    <span
                      className="text-[9px] leading-none"
                      style={{ color: `rgba(${PORTAL_RGB},0.9)`, textShadow: `0 0 6px rgba(${PORTAL_RGB},0.8)` }}
                    >
                      ✦
                    </span>
                    <span
                      className="block w-10 sm:w-12 h-px"
                      style={{ background: `linear-gradient(to left, transparent, rgba(${PORTAL_RGB},0.6))` }}
                    />
                  </span>
                  {/* the quote breathes with a slow, restrained glow */}
                  <motion.span
                    className="mt-2 font-display italic text-sm sm:text-base lg:text-lg text-cyan-200/90"
                    style={{ textShadow: `0 0 10px rgba(${PORTAL_RGB},0.5)` }}
                    animate={reduceMotion ? { opacity: 0.92 } : { opacity: [0.72, 1, 0.72] }}
                    transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {quote}
                  </motion.span>
                </motion.div>

                {/* single hit area spanning the cloud down through the cultivator's body — tap either to gather the qi */}
                <button
                  type="button"
                  onClick={handleClaim}
                  disabled={isClaiming}
                  aria-label={isClaiming ? 'Absorbing Qi...' : 'Gather Qi'}
                  className="relative flex flex-col items-center rounded-[2rem] pointer-events-auto touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-portal/60"
                >
                {/* thought cloud of condensed qi */}
                <motion.div
                  ref={bubbleRef}
                  className="relative block rounded-2xl"
                  animate={
                    absorbing
                      ? { scale: 0.15, opacity: 0, y: 6 }
                      : reduceMotion
                        ? { y: 0, scale: 1, opacity: 1 }
                        : { y: [0, -6, 0], scale: 1, opacity: 1 }
                  }
                  transition={
                    absorbing
                      ? { duration: 0.25, ease: 'easeIn' }
                      : { duration: 3.6, repeat: Infinity, ease: 'easeInOut' }
                  }
                >
                  {/* pulsing halo: signals the cloud is collectible */}
                  <motion.span
                    aria-hidden="true"
                    className="absolute -inset-3 rounded-full pointer-events-none -z-10"
                    style={{
                      background: `radial-gradient(ellipse at 50% 50%, rgba(${PORTAL_RGB},0.5) 0%, rgba(${PORTAL_RGB},0.18) 55%, transparent 75%)`,
                      filter: 'blur(8px)',
                    }}
                    animate={reduceMotion ? { opacity: 0.6 } : { opacity: [0.45, 0.95, 0.45], scale: [0.95, 1.12, 0.95] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <svg
                    viewBox="0 0 130 64"
                    className="w-32 h-16 sm:w-[9.5rem] sm:h-[4.75rem] lg:w-48 lg:h-24"
                    style={{ filter: `drop-shadow(0 0 12px rgba(${PORTAL_RGB},0.65))` }}
                    aria-hidden="true"
                  >
                    <defs>
                      <radialGradient id={cloudGradId} cx="50%" cy="45%" r="65%">
                        <stop offset="0%" stopColor={`rgba(${PORTAL_RGB},0.85)`} />
                        <stop offset="55%" stopColor={`rgba(${PORTAL_RGB},0.35)`} />
                        <stop offset="100%" stopColor={`rgba(${PORTAL_RGB},0.05)`} />
                      </radialGradient>
                      <linearGradient id={shimmerGradId} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="rgba(220,248,255,0)" />
                        <stop offset="50%" stopColor="rgba(220,248,255,0.75)" />
                        <stop offset="100%" stopColor="rgba(220,248,255,0)" />
                      </linearGradient>
                      <clipPath id={cloudClipId}>
                        <path d="M32 50 C16 50 10 39 19 31 C14 20 27 13 36 18 C41 8 57 6 65 14 C73 6 89 8 94 18 C103 13 116 20 111 31 C120 39 114 50 98 50 Z" />
                      </clipPath>
                    </defs>
                    <path
                      d="M32 50 C16 50 10 39 19 31 C14 20 27 13 36 18 C41 8 57 6 65 14 C73 6 89 8 94 18 C103 13 116 20 111 31 C120 39 114 50 98 50 Z"
                      fill={`url(#${cloudGradId})`}
                    />
                    {/* shimmer sweep inviting the tap (skipped on weak hardware: SMIL runs on the main thread) */}
                    {!lowPower && (
                      <g clipPath={`url(#${cloudClipId})`}>
                        <rect x="-46" y="0" width="26" height="64" fill={`url(#${shimmerGradId})`} transform="skewX(-18)">
                          <animate attributeName="x" from="-46" to="150" dur="2.6s" repeatCount="indefinite" />
                        </rect>
                      </g>
                    )}
                  </svg>
                  <span
                    className="absolute inset-0 flex items-center justify-center font-display font-bold text-base sm:text-lg lg:text-xl text-cyan-100 tracking-wider whitespace-nowrap"
                    style={{ textShadow: `0 0 10px rgba(${PORTAL_RGB},1), 0 0 22px rgba(${PORTAL_RGB},0.55)` }}
                  >
                    {`+${qiEarned} QI`}
                  </span>
                </motion.div>

                {/* trailing wisps as the cultivator dissolves */}
                {absorbing &&
                  [0, 1, 2].map(i => (
                    <motion.span
                      key={i}
                      className="absolute bottom-8 w-6 h-6 rounded-full pointer-events-none"
                      style={{
                        left: `${42 + i * 8}%`,
                        background: 'rgba(180,240,255,0.35)',
                        filter: 'blur(6px)',
                      }}
                      initial={{ opacity: 0, y: 0, scale: 0.6 }}
                      animate={{ opacity: [0, 0.7, 0], y: -46, x: (i - 1) * 14, scale: 1.3 }}
                      transition={{ duration: 0.75, delay: 0.6 + i * 0.1, ease: 'easeOut' }}
                    />
                  ))}

                  <div ref={figureRef} className="relative">
                    <CultivatorFigure claiming={absorbing} calm={!!reduceMotion} />
                  </div>
                </button>

                <span
                  id={titleId}
                  className="relative mt-1.5 text-[10px] sm:text-[11px] lg:text-xs font-sc uppercase tracking-[0.35em] text-portal/60"
                >
                  Closed-Door Cultivation
                </span>
              </div>
            </motion.div>
          ))}
      </AnimatePresence>
    </>
  );
}
