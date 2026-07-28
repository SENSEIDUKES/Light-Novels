import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store/useAppStore';
import { awardDirectQi } from '../lib/qi';
import { auth } from '../lib/firebase';

const PORTAL_RGB = '4,172,255';
const COLLAPSE_AFTER_MS = 7000;
const CLAIM_CLOSE_MS = 2000;

interface Flight {
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
        {/* robed body flaring into crossed legs */}
        <path
          d="M60 33 C49 35 43.5 43 41.5 53 C40 61 35.5 67.5 27.5 72.5 C19.5 77.5 15.5 84.5 22.5 88.5 C28.5 91.8 43 92.8 60 92.8 C77 92.8 91.5 91.8 97.5 88.5 C104.5 84.5 100.5 77.5 92.5 72.5 C84.5 67.5 80 61 78.5 53 C76.5 43 71 35 60 33 Z"
          fill={`url(#${robeGradId})`}
        />
        {/* folded hands */}
        <ellipse cx="60" cy="75" rx="8.5" ry="3.6" fill="#0d1626" stroke="none" />
        {/* head + topknot */}
        <circle cx="60" cy="24" r="7" fill="#04060d" />
        <ellipse cx="60" cy="14.5" rx="2.4" ry="3" fill="#04060d" />
      </g>
    </svg>
  );
}

/** The meditating figure with its breathing aura. Dissolves into mist while claiming. */
function CultivatorFigure({ claiming }: { claiming: boolean }) {
  return (
    <motion.div
      className="relative w-28 h-24"
      animate={
        claiming
          ? { opacity: 0, y: -14, filter: 'blur(6px)' }
          : { opacity: 1, y: 0, filter: 'blur(0px)' }
      }
      transition={claiming ? { duration: 1.2, delay: 0.5, ease: 'easeOut' } : { duration: 0.6 }}
    >
      {/* soft cyan aura breathing around the body; flashes once on claim */}
      <motion.div
        className="absolute -inset-[18%] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 65%, rgba(${PORTAL_RGB},0.45) 0%, rgba(${PORTAL_RGB},0.12) 45%, transparent 70%)`,
          filter: 'blur(6px)',
        }}
        animate={
          claiming
            ? { opacity: [0.5, 1, 0], scale: [1, 1.35, 1.1] }
            : { opacity: [0.35, 0.65, 0.35], scale: [1, 1.12, 1] }
        }
        transition={
          claiming
            ? { duration: 1.0, delay: 0.25, times: [0, 0.35, 1] }
            : { duration: 4.2, repeat: Infinity, ease: 'easeInOut' }
        }
      />
      <CultivatorSvg
        className="relative w-full h-full"
        style={{ filter: `drop-shadow(0 0 6px rgba(${PORTAL_RGB},0.35))` }}
      />
      {/* qi motes drifting up from the cultivator */}
      {!claiming &&
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

/** Glowing qi particles spiraling from the popped bubble up into the Celestial Library emblem. */
function QiFlight({ flight }: { flight: Flight }) {
  const { sx, sy, ex, ey } = flight;
  // Freeze the random particle paths per claim so unrelated re-renders don't retarget the burst.
  const particles = useMemo(() => {
    const dx = ex - sx;
    const dy = ey - sy;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len;
    const py = dx / len;
    return Array.from({ length: 26 }).map((_, i) => {
      const sign = i % 2 === 0 ? 1 : -1;
      const sway1 = (50 + Math.random() * 70) * sign;
      const sway2 = (25 + Math.random() * 40) * -sign;
      return {
        m1x: sx + dx * 0.35 + px * sway1,
        m1y: sy + dy * 0.35 + py * sway1 - 50,
        m2x: sx + dx * 0.72 + px * sway2,
        m2y: sy + dy * 0.72 + py * sway2 - 24,
        duration: 0.85 + Math.random() * 0.3,
        delay: 0.25 + i * 0.018 + Math.random() * 0.08,
        size: 2 + Math.random() * 3,
      };
    });
  }, [flight]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[110] overflow-hidden">
      {particles.map((p, i) => {
        return (
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
              x: [sx, p.m1x, p.m2x, ex],
              y: [sy, p.m1y, p.m2y, ey],
              opacity: [0, 1, 1, 0],
              scale: [0.4, 1, 0.9, 0.2],
            }}
            transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn', times: [0, 0.4, 0.75, 1] }}
          />
        );
      })}
      {/* the Library emblem briefly glows as it absorbs the qi */}
      <motion.div
        className="absolute rounded-full"
        style={{
          left: ex,
          top: ey,
          width: 64,
          height: 64,
          x: '-50%',
          y: '-50%',
          background: `radial-gradient(circle, rgba(${PORTAL_RGB},0.8) 0%, rgba(${PORTAL_RGB},0.25) 45%, transparent 70%)`,
          filter: 'blur(4px)',
        }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 0.95, 0], scale: [0.5, 1.5, 1.9] }}
        transition={{ duration: 0.8, delay: 1.05, times: [0, 0.35, 1] }}
      />
    </div>
  );
}

interface Props {
  qiEarned: number | null;
  onClose: () => void;
}

export function IdleCultivationModal({ qiEarned, onClose }: Props) {
  const userProfile = useAppStore(state => state.userProfile);
  const setUserProfile = useAppStore(state => state.setUserProfile);
  const [isClaiming, setIsClaiming] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  const bubbleRef = useRef<HTMLButtonElement | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cloudGradId = `cdc-cloud-${useId()}`;

  // If the reward sits unclaimed, fold the vignette away into a tiny waiting icon.
  useEffect(() => {
    if (qiEarned === null || isClaiming || collapsed) return;
    const timer = setTimeout(() => setCollapsed(true), COLLAPSE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [qiEarned, isClaiming, collapsed]);

  // Start each new reward cycle fresh.
  useEffect(() => {
    if (qiEarned === null) {
      setCollapsed(false);
      setIsClaiming(false);
    }
  }, [qiEarned]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const handleClaim = async () => {
    if (isClaiming) return;
    setIsClaiming(true);

    const bubble = bubbleRef.current?.getBoundingClientRect();
    const emblem = document.getElementById('celestial-library-emblem')?.getBoundingClientRect();
    setFlight({
      sx: bubble ? bubble.left + bubble.width / 2 : window.innerWidth / 2,
      sy: bubble ? bubble.top + bubble.height / 2 : window.innerHeight - 140,
      ex: emblem ? emblem.left + emblem.width / 2 : 48,
      ey: emblem ? emblem.top + emblem.height / 2 : 40,
    });

    try {
      if (auth.currentUser && qiEarned) {
        await awardDirectQi(qiEarned, `idle-cultivation-${Date.now()}`);
      }

      if (userProfile && qiEarned) {
        const updated = {
          ...userProfile,
          dao_xp: (userProfile.dao_xp || 0) + qiEarned,
          qi: (userProfile.qi || 0) + qiEarned,
          heavenly_qi: (userProfile.heavenly_qi || userProfile.dao_xp || 0) + qiEarned,
          sect_qi: (userProfile.sect_qi || 0) + qiEarned,
        };
        setUserProfile(updated);
      }
    } catch (e) {
      console.error("Failed to claim idle qi:", e);
    } finally {
      closeTimeoutRef.current = setTimeout(() => {
        setIsClaiming(false);
        setFlight(null);
        onClose();
      }, CLAIM_CLOSE_MS);
    }
  };

  return (
    <>
      {flight && <QiFlight flight={flight} />}
      <AnimatePresence>
        {qiEarned !== null &&
          (collapsed && !isClaiming ? (
            <motion.button
              key="cdc-collapsed"
              type="button"
              onClick={() => setCollapsed(false)}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              className="fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-[100] w-12 h-12 rounded-full bg-[#04070f]/90 backdrop-blur-md border border-portal/30 flex items-center justify-center overflow-visible"
              aria-label="Open closed-door cultivation reward"
            >
              <motion.div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{ boxShadow: `0 0 14px rgba(${PORTAL_RGB},0.35)` }}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <CultivatorSvg className="w-8 h-7" style={{ filter: `drop-shadow(0 0 4px rgba(${PORTAL_RGB},0.5))` }} />
              <span className="absolute -top-1.5 -right-1.5 px-1 rounded-full bg-portal/25 border border-portal/50 text-[8px] font-bold text-cyan-100">
                +{qiEarned}
              </span>
            </motion.button>
          ) : (
            <motion.div
              key="cdc-vignette"
              role="dialog"
              aria-labelledby="idle-cultivation-title"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="fixed bottom-24 inset-x-0 sm:inset-x-auto sm:bottom-6 sm:right-6 z-[100] flex justify-center sm:justify-end pointer-events-none"
            >
              <div className="relative pointer-events-auto flex flex-col items-center px-6">
                {/* thought cloud of condensed qi — tap to claim */}
                <motion.button
                  ref={bubbleRef}
                  type="button"
                  onClick={handleClaim}
                  disabled={isClaiming}
                  aria-label={isClaiming ? 'Absorbing Qi...' : 'Claim & Awaken'}
                  className="relative block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-portal/60"
                  animate={
                    isClaiming
                      ? { scale: 0.15, opacity: 0, y: 6 }
                      : { y: [0, -6, 0], scale: 1, opacity: 1 }
                  }
                  transition={
                    isClaiming
                      ? { duration: 0.35, ease: 'easeIn' }
                      : { duration: 3.6, repeat: Infinity, ease: 'easeInOut' }
                  }
                >
                  <svg
                    viewBox="0 0 130 64"
                    className="w-28 h-14"
                    style={{ filter: `drop-shadow(0 0 10px rgba(${PORTAL_RGB},0.55))` }}
                    aria-hidden="true"
                  >
                    <defs>
                      <radialGradient id={cloudGradId} cx="50%" cy="45%" r="65%">
                        <stop offset="0%" stopColor={`rgba(${PORTAL_RGB},0.85)`} />
                        <stop offset="55%" stopColor={`rgba(${PORTAL_RGB},0.35)`} />
                        <stop offset="100%" stopColor={`rgba(${PORTAL_RGB},0.05)`} />
                      </radialGradient>
                    </defs>
                    <path
                      d="M32 50 C16 50 10 39 19 31 C14 20 27 13 36 18 C41 8 57 6 65 14 C73 6 89 8 94 18 C103 13 116 20 111 31 C120 39 114 50 98 50 Z"
                      fill={`url(#${cloudGradId})`}
                    />
                  </svg>
                  <span
                    className="absolute inset-0 flex items-center justify-center font-display font-bold text-sm text-cyan-100 tracking-wider"
                    style={{ textShadow: `0 0 8px rgba(${PORTAL_RGB},0.9)` }}
                  >
                    {`+${qiEarned} QI`}
                  </span>
                </motion.button>

                {/* trailing wisps as the cultivator dissolves */}
                {isClaiming &&
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
                      transition={{ duration: 1.4, delay: 0.55 + i * 0.18, ease: 'easeOut' }}
                    />
                  ))}

                <CultivatorFigure claiming={isClaiming} />

                <span
                  id="idle-cultivation-title"
                  className="mt-1 text-[9px] font-sc uppercase tracking-[0.35em] text-portal/60"
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
