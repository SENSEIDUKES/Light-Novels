import { useEffect, useRef, useState, RefObject, useCallback } from 'react';
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
  return wpm / 2;
};

export const calculatePacedVelocity = (distanceToCover: number, durationMs: number): number => {
  if (durationMs <= 0) return 0;
  // returns px per second
  return (distanceToCover / durationMs) * 1000;
};

export function useAutoScroll({ containerRef, mode, wpm = 200, onManualPause }: UseAutoScrollOptions) {
  const [isScrolling, setIsScrollingState] = useState(false);
  const isScrollingRef = useRef(false);

  const setIsScrolling = useCallback((val: boolean) => {
    setIsScrollingState(val);
    isScrollingRef.current = val;
  }, []);

  const [currentWpm, setWpm] = useState(wpm);

  useEffect(() => {
    setWpm(wpm);
  }, [wpm]);

  const rAFRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const targetVelocityRef = useRef<number>(0);
  const currentVelocityRef = useRef<number>(0);
  
  // High-precision accumulator to solve subpixel scroll rounding drops
  const floatScrollTopRef = useRef<number | null>(null);
  
  // Spring physics state for natural momentum tracking
  const springPosRef = useRef<number | null>(null);
  const springVelRef = useRef<number>(0);

  const stopLoop = useCallback(() => {
    if (rAFRef.current !== null) {
      cancelAnimationFrame(rAFRef.current);
      rAFRef.current = null;
    }
    lastTimeRef.current = null;
    
    // Clear subpixel transform when stopped to avoid blurring
    if (containerRef.current) {
       const inner = containerRef.current.firstElementChild as HTMLElement;
       if (inner) inner.style.transform = '';
    }
  }, [containerRef]);

  const play = useCallback(() => {
    if (mode === 'off') return;
    if (containerRef.current) {
        // Sync our float accumulator on start
        floatScrollTopRef.current = containerRef.current.scrollTop;
        springPosRef.current = containerRef.current.scrollTop;
        springVelRef.current = 0;
    }
    setIsScrolling(true);
  }, [mode, setIsScrolling, containerRef]);

  const pause = useCallback(() => {
    setIsScrolling(false);
    stopLoop();
  }, [setIsScrolling, stopLoop]);

  const onManualPauseRef = useRef(onManualPause);
  useEffect(() => {
    onManualPauseRef.current = onManualPause;
  }, [onManualPause]);

  const handleManualPause = useCallback(() => {
    if (isScrollingRef.current) {
      pause();
      onManualPauseRef.current?.();
    }
  }, [pause]);

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
  }, [containerRef, handleManualPause]);

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
  }, [pause]);

  const tickRef = useRef<(time: number) => void>(() => {});

  // Main cinematic scroll loop
  const tick = useCallback((time: number) => {
    if (!isScrollingRef.current) {
      stopLoop();
      return;
    }

    if (!lastTimeRef.current) {
      lastTimeRef.current = time;
      rAFRef.current = requestAnimationFrame(tickRef.current);
      return;
    }

    const dt = time - lastTimeRef.current;
    lastTimeRef.current = time;

    const container = containerRef.current;
    if (container && isScrollingRef.current && !prefersReducedMotion.current) {
      const dtSec = dt / 1000;
      
      // Accelerate rapidly towards target velocity for realistic TTS tracking
      const velocityDiff = targetVelocityRef.current - currentVelocityRef.current;
      currentVelocityRef.current += velocityDiff * (mode === 'paced' ? 5 : 2) * dtSec; 
      
      if (Math.abs(currentVelocityRef.current - targetVelocityRef.current) < 0.5) {
        currentVelocityRef.current = targetVelocityRef.current;
      }

      const step = currentVelocityRef.current * dtSec;
      
      if (step > 0 && floatScrollTopRef.current !== null && springPosRef.current !== null) {
        floatScrollTopRef.current += step;
        
        // Prevent logical target from overflowing bounds
        const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
        if (floatScrollTopRef.current > maxScroll) {
            floatScrollTopRef.current = maxScroll;
        }

        // Spring interpolation towards the logical pacing target (floatScrollTopRef)
        // using critically damped spring physics for natural momentum
        const stiffness = 80; 
        const damping = 18; // approx 2 * sqrt(stiffness)
        
        const displacement = floatScrollTopRef.current - springPosRef.current;
        const springForce = displacement * stiffness;
        const damperForce = springVelRef.current * damping;
        const acceleration = springForce - damperForce;
        
        springVelRef.current += acceleration * dtSec;
        springPosRef.current += springVelRef.current * dtSec;
        
        // Clamp spring position to valid scroll bounds
        if (springPosRef.current < 0) {
            springPosRef.current = 0;
            springVelRef.current = 0;
        } else if (springPosRef.current > maxScroll) {
            springPosRef.current = maxScroll;
            springVelRef.current = 0;
        }

        // Cinematic 'Fake Scroll': move words via transform for subpixel smoothness,
        // and keep native scroll snapped to integers to retain scroll bounds capability.
        const intScroll = Math.floor(springPosRef.current);
        const fraction = springPosRef.current - intScroll;

        if (container.scrollTop !== intScroll) {
          container.scrollTop = intScroll;
        }

        // Apply visual subpixel translation to the words wrapper
        const inner = container.firstElementChild as HTMLElement;
        if (inner) {
          inner.style.transform = `translateY(-${fraction}px)`;
        }
      }
    }

    if (isScrollingRef.current) {
      rAFRef.current = requestAnimationFrame(tickRef.current);
    } else {
      stopLoop();
    }
  }, [containerRef, stopLoop, mode]);

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  useEffect(() => {
    if (isScrolling && !prefersReducedMotion.current) {
      stopLoop();
      rAFRef.current = requestAnimationFrame(tickRef.current);
    } else {
      stopLoop();
    }
    return () => stopLoop();
  }, [isScrolling, stopLoop]);

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
              const optimalTop = Math.max(0, blockEl.offsetTop - focusBandOffset);
              
              if (floatScrollTopRef.current === null) {
                  floatScrollTopRef.current = container.scrollTop;
              }
              if (springPosRef.current === null) {
                  springPosRef.current = container.scrollTop;
                  springVelRef.current = 0;
              }

              // Smoothly converge current position towards the optimal cinematic block position
              // We want to progress through the block exactly over durationMs
              const distanceToCover = (optimalTop + blockEl.offsetHeight) - floatScrollTopRef.current;
              
              // Only move downward naturally
              if (distanceToCover > 0) {
                 targetVelocityRef.current = calculatePacedVelocity(distanceToCover, durationMs);
              } else {
                 targetVelocityRef.current = calculateConstantVelocity(currentWpm);
              }
            } else {
              targetVelocityRef.current = calculateConstantVelocity(currentWpm);
            }
          }
          play();
        }
      };

      window.addEventListener('seihouse-narration', onNarration as EventListener);
      return () => window.removeEventListener('seihouse-narration', onNarration as EventListener);
    }
  }, [mode, currentWpm, containerRef, play, pause]);

  useEffect(() => {
    if (mode === 'constant' && isScrolling) {
      targetVelocityRef.current = calculateConstantVelocity(currentWpm);
    }
  }, [currentWpm, mode, isScrolling]);

  return { isScrolling, play, pause, setWpm };
}

