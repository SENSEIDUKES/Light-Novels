import { useEffect, useRef, useState, RefObject, useCallback } from 'react';
import { NarrationEventDetail } from '../lib/narrativeCues';

interface UseReadingDriftOptions {
  containerRef: RefObject<HTMLElement | null>;
  innerRef: RefObject<HTMLElement | null>;
  mode: 'paced' | 'constant' | 'off';
  wpm?: number;
  onManualPause?: () => void;
}

export function useReadingDrift({ containerRef, innerRef, mode, wpm = 200, onManualPause }: UseReadingDriftOptions) {
  const [isDriftingState, setIsDriftingState] = useState(false);
  const isDriftingRef = useRef(false);

  const setIsDrifting = useCallback((val: boolean) => {
    setIsDriftingState(val);
    isDriftingRef.current = val;
  }, []);

  const driftOffsetRef = useRef<number>(0);
  const baseScrollRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);
  
  const rAFRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const stopDrift = useCallback(() => {
    if (rAFRef.current !== null) {
      cancelAnimationFrame(rAFRef.current);
      rAFRef.current = null;
    }
    lastTimeRef.current = null;
    setIsDrifting(false);
    
    // Restore native scroll
    if (containerRef.current && innerRef.current) {
       containerRef.current.scrollTop = baseScrollRef.current + driftOffsetRef.current;
       innerRef.current.style.transform = '';
       containerRef.current.style.overflow = '';
    }
  }, [containerRef, innerRef, setIsDrifting]);

  const startDrift = useCallback(() => {
    if (mode === 'off') return;
    if (containerRef.current && innerRef.current) {
        baseScrollRef.current = containerRef.current.scrollTop;
        containerRef.current.style.overflow = 'hidden';
        driftOffsetRef.current = 0;
        innerRef.current.style.transform = 'translateY(0px)';
    }
    setIsDrifting(true);
  }, [mode, setIsDrifting, containerRef, innerRef]);

  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
      if (e.matches) stopDrift();
    };
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, [stopDrift]);

  const tickRef = useRef<(time: number) => void>(() => {});

  const tick = useCallback((time: number) => {
    if (!isDriftingRef.current) {
      return;
    }

    if (!lastTimeRef.current) {
      lastTimeRef.current = time;
      rAFRef.current = requestAnimationFrame(tickRef.current);
      return;
    }

    const dt = time - lastTimeRef.current;
    lastTimeRef.current = time;

    if (isDriftingRef.current && !prefersReducedMotion.current && containerRef.current && innerRef.current) {
      const dtSec = dt / 1000;
      driftOffsetRef.current += velocityRef.current * dtSec;

      // Prevent scrolling past the end
      const maxScroll = Math.max(0, containerRef.current.scrollHeight - containerRef.current.clientHeight);
      if (baseScrollRef.current + driftOffsetRef.current > maxScroll) {
          driftOffsetRef.current = maxScroll - baseScrollRef.current;
      }

      innerRef.current.style.transform = `translateY(-${driftOffsetRef.current}px)`;
    }

    if (isDriftingRef.current) {
      rAFRef.current = requestAnimationFrame(tickRef.current);
    }
  }, [containerRef, innerRef]);

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  useEffect(() => {
    if (isDriftingState && !prefersReducedMotion.current) {
      if (rAFRef.current === null) {
        lastTimeRef.current = null;
        rAFRef.current = requestAnimationFrame(tickRef.current);
      }
    } else {
      if (rAFRef.current !== null) {
        cancelAnimationFrame(rAFRef.current);
        rAFRef.current = null;
      }
    }
    return () => {
      if (rAFRef.current !== null) {
        cancelAnimationFrame(rAFRef.current);
        rAFRef.current = null;
      }
    };
  }, [isDriftingState]);

  // Handle Mode changes & Narration event subscription
  useEffect(() => {
    if (mode === 'off' || prefersReducedMotion.current) {
      stopDrift();
      return;
    }

    if (mode === 'constant') {
      velocityRef.current = wpm / 2;
      startDrift();
    }

    if (mode === 'paced') {
      const onNarration = (e: Event) => {
        const customEvent = e as CustomEvent<NarrationEventDetail>;
        const { status, blockIndex, durationMs } = customEvent.detail;

        if (status === 'start' || status === 'resume') {
          startDrift();
        } else if (status === 'pause' || status === 'end') {
          stopDrift();
        } else if (status === 'block' && blockIndex !== undefined && durationMs) {
          if (containerRef.current && innerRef.current) {
            const blockEl = innerRef.current.querySelector(`[data-block-index="${blockIndex}"]`) as HTMLElement;
            if (blockEl) {
              const focusBandOffset = containerRef.current.clientHeight / 3;
              
              let offsetTop = 0;
              let curr: HTMLElement | null = blockEl;
              while (curr && curr !== innerRef.current && curr !== containerRef.current) {
                offsetTop += curr.offsetTop;
                curr = curr.offsetParent as HTMLElement | null;
              }

              const targetVisible = offsetTop - focusBandOffset;
              const targetDriftOffset = targetVisible - baseScrollRef.current;
              
              const vel = (targetDriftOffset - driftOffsetRef.current) / (durationMs / 1000);
              velocityRef.current = Math.max(0, vel);
            } else {
              velocityRef.current = wpm / 2;
            }
          }
        }
      };

      window.addEventListener('seihouse-narration', onNarration);
      return () => window.removeEventListener('seihouse-narration', onNarration);
    }
  }, [mode, wpm, containerRef, innerRef, startDrift, stopDrift]);

  // Handle user interaction for manual pause
  const onManualPauseRef = useRef(onManualPause);
  useEffect(() => {
    onManualPauseRef.current = onManualPause;
  }, [onManualPause]);

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
      if (isDriftingRef.current) {
        stopDrift();
        onManualPauseRef.current?.();
      }
    };

    container.addEventListener('wheel', onUserInteraction, { passive: true });
    container.addEventListener('touchmove', onUserInteraction, { passive: true });
    container.addEventListener('keydown', onUserInteraction as EventListener);

    return () => {
      container.removeEventListener('wheel', onUserInteraction);
      container.removeEventListener('touchmove', onUserInteraction);
      container.removeEventListener('keydown', onUserInteraction as EventListener);
    };
  }, [containerRef, stopDrift]);

  return { isDrifting: isDriftingState, startDrift, stopDrift };
}
