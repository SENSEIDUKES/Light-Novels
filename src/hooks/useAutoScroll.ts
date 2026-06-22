import { useEffect, useRef, useState, RefObject } from 'react';
import { NarrationEventDetail } from '../lib/narrativeCues';

interface UseAutoScrollOptions {
  containerRef: RefObject<HTMLElement | null>;
  mode: 'paced' | 'constant' | 'off';
  wpm?: number;
  onManualPause?: () => void;
}

// Math for velocity (exported for testing)
export const calculateConstantVelocity = (wpm: number): number => {
  // px per second. Assume ~200 wpm = ~100 px / sec.
  // 1 word = ~30px.
  // v = (wpm / 60) * 30 -> wpm / 2
  return wpm / 2;
};

export const calculatePacedVelocity = (distanceToCover: number, durationMs: number): number => {
  if (durationMs <= 0) return 0;
  // returns px per second
  return (distanceToCover / durationMs) * 1000;
};

export function useAutoScroll({ containerRef, mode, wpm = 200, onManualPause }: UseAutoScrollOptions) {
  const [isScrolling, setIsScrolling] = useState(false);
  const [currentWpm, setWpm] = useState(wpm);

  useEffect(() => {
    setWpm(wpm);
  }, [wpm]);
  const rAFRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const targetVelocityRef = useRef<number>(0);
  const currentVelocityRef = useRef<number>(0);

  const stopLoop = () => {
    if (rAFRef.current !== null) {
      cancelAnimationFrame(rAFRef.current);
      rAFRef.current = null;
    }
    lastTimeRef.current = null;
  };

  const play = () => {
    if (mode === 'off') return;
    setIsScrolling(true);
  };

  const pause = () => {
    setIsScrolling(false);
    stopLoop();
  };

  const handleManualPause = () => {
    if (isScrolling) {
      pause();
      onManualPause?.();
    }
  };

  // Listen for user interaction to manually pause scrolling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onUserInteraction = (e: Event) => {
      if (e.type === 'keydown') {
        const key = (e as KeyboardEvent).key;
        if (!['ArrowUp', 'ArrowDown', ' ', 'PageUp', 'PageDown', 'Home', 'End'].includes(key)) {
          return;
        }
      }
      handleManualPause();
    };

    container.addEventListener('wheel', onUserInteraction, { passive: true });
    container.addEventListener('touchmove', onUserInteraction, { passive: true });
    container.addEventListener('keydown', onUserInteraction as EventListener);

    return () => {
      container.removeEventListener('wheel', onUserInteraction);
      container.removeEventListener('touchmove', onUserInteraction);
      container.removeEventListener('keydown', onUserInteraction as EventListener);
    };
  }, [isScrolling, onManualPause, containerRef]);

  // Respect user's motion preferences
  const prefersReducedMotion = useRef(
    window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
  );

  useEffect(() => {
    if (!window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
      if (e.matches) pause();
    };
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  // Main scroll loop
  const tick = (time: number) => {
    if (!lastTimeRef.current) {
      lastTimeRef.current = time;
      rAFRef.current = requestAnimationFrame(tick);
      return;
    }

    const dt = time - lastTimeRef.current;
    lastTimeRef.current = time;

    const container = containerRef.current;
    if (container && isScrolling && !prefersReducedMotion.current) {
      // Smooth ramp to target velocity over ~0.5s
      const dtSec = dt / 1000;
      const velocityDiff = targetVelocityRef.current - currentVelocityRef.current;
      currentVelocityRef.current += velocityDiff * 2 * dtSec; 
      
      if (Math.abs(currentVelocityRef.current - targetVelocityRef.current) < 0.5) {
        currentVelocityRef.current = targetVelocityRef.current;
      }

      const step = currentVelocityRef.current * dtSec;
      
      if (step > 0) {
        container.scrollTop += step;
      }
    }

    if (isScrolling) {
      rAFRef.current = requestAnimationFrame(tick);
    }
  };

  useEffect(() => {
    if (isScrolling && !prefersReducedMotion.current) {
      rAFRef.current = requestAnimationFrame(tick);
    } else {
      stopLoop();
    }
    return () => stopLoop();
  }, [isScrolling]);

  // Handle Mode changes & Narration event subscription
  useEffect(() => {
    if (mode === 'off' || prefersReducedMotion.current) {
      pause();
      return;
    }

    if (mode === 'constant') {
      targetVelocityRef.current = calculateConstantVelocity(currentWpm);
      play();
    }

    if (mode === 'paced') {
      const onNarration = (e: CustomEvent<NarrationEventDetail>) => {
        const { status, blockIndex, durationMs } = e.detail;

        if (status === 'start' || status === 'resume') {
          play();
        } else if (status === 'pause' || status === 'end') {
          pause();
        } else if (status === 'block' && blockIndex !== undefined && durationMs) {
          const container = containerRef.current;
          if (container) {
            const blockEl = container.querySelector(`[data-block-index="${blockIndex}"]`) as HTMLElement;
            if (blockEl) {
              const focusBandOffset = container.clientHeight ? container.clientHeight / 3 : 150;
              const targetScrollTop = Math.max(0, blockEl.offsetTop - focusBandOffset);
              
              // Nudge scrollTop toward the block's desired position to correct accumulated drift
              container.scrollTop = container.scrollTop + (targetScrollTop - container.scrollTop) * 0.7;

              // the height of the block spread over its spoken duration
              const distanceToCover = blockEl.offsetHeight; 
              targetVelocityRef.current = calculatePacedVelocity(distanceToCover, durationMs);
            } else {
              // Fallback if element not yet rendered
              targetVelocityRef.current = calculateConstantVelocity(currentWpm);
            }
          }
          play();
        }
      };

      window.addEventListener('seihouse-narration', onNarration as EventListener);
      return () => window.removeEventListener('seihouse-narration', onNarration as EventListener);
    }
  }, [mode, currentWpm, containerRef]);

  // Sync mode changes to targetVelocity if scrolling (for 'constant' mode updates like WPM slider)
  useEffect(() => {
    if (mode === 'constant' && isScrolling) {
      targetVelocityRef.current = calculateConstantVelocity(currentWpm);
    }
  }, [currentWpm, mode, isScrolling]);

  return { isScrolling, play, pause, setWpm };
}
