import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';

/**
 * useCinematicScroll
 *
 * The ONE and only auto-scroll engine for the SEIHOUSE reader.
 *
 * Two modes — selected automatically:
 *
 * 1. **TTS-paced** (when `ttsVelocityRef` is provided and non-null):
 *    Velocity is computed externally by `useReaderPlayback` from narration
 *    `block` events.  The formula is:
 *      velocity = (DOM top of next block − current scrollTop at focus line)
 *               ÷ (durationMs / 1000)
 *    The constant `scrollSpeed` store value is ignored while voice is playing.
 *
 * 2. **Constant free-scroll** (when `ttsVelocityRef` is null/undefined):
 *    Reads `scrollSpeed` from the global store (px/sec).  Used for the
 *    teleprompter / "free" auto-scroll mode when no voice is active.
 *
 * UX invariants:
 * - Sub-pixel accumulator for smooth, stutter-free motion every frame.
 * - User wheel / touchstart / touchmove / keyboard (arrow keys, Space,
 *   PageUp/Down, Home/End) instantly yields control; resumes after 2000 ms
 *   of inactivity.
 * - Stops at the bottom of content.
 * - Respects `prefers-reduced-motion`: the loop exits immediately and does
 *   not scroll at all when the user has requested reduced motion.
 */
export function useCinematicScroll(
  containerRef: React.RefObject<HTMLElement | null>,
  isActive: boolean,
  ttsVelocityRef?: React.MutableRefObject<number | null>,
  onYieldChange?: (yielded: boolean) => void,
) {
  const scrollSpeed = useAppStore((state) => state.scrollSpeed);

  // --- Refs that persist across renders without causing re-renders ----------
  const requestRef        = useRef<number | undefined>(undefined);
  const lastTimeRef       = useRef<number | undefined>(undefined);
  const scrollAccumulator = useRef<number>(0);
  const isYieldingRef     = useRef<boolean>(false);
  const yieldTimeoutRef   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Keep isActive readable from inside the rAF callback without stale closure
  const isActiveRef = useRef(isActive);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

  // Keep scrollSpeed readable without stale closure
  const scrollSpeedRef = useRef(scrollSpeed);
  useEffect(() => { scrollSpeedRef.current = scrollSpeed; }, [scrollSpeed]);

  // Reduced-motion: read once on mount, then track changes via media query
  const prefersReducedMotionRef = useRef(
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => {
      prefersReducedMotionRef.current = e.matches;
      // Immediately stop if user enables reduced motion while scrolling
      if (e.matches && requestRef.current !== undefined) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = undefined;
        lastTimeRef.current = undefined;
      }
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // --- rAF loop (useCallback so the closure is stable & dependency-aware) --
  // Using useCallback means the animate function is recreated only when its
  // deps change (containerRef, ttsVelocityRef), not on every render.  All hot
  // refs (isActiveRef, scrollSpeedRef, prefersReducedMotionRef, isYieldingRef)
  // are read at call time via refs so they don't need to be in the dep array.
  const animate = useCallback((time: number) => {
    if (isYieldingRef.current || !isActiveRef.current || prefersReducedMotionRef.current) {
      lastTimeRef.current = undefined;
      return;
    }

    if (lastTimeRef.current != null && containerRef.current) {
      const deltaTime = time - lastTimeRef.current;

      // Pick velocity source: TTS-paced overrides constant free-scroll
      const velocity =
        ttsVelocityRef != null && ttsVelocityRef.current != null
          ? ttsVelocityRef.current
          : scrollSpeedRef.current;

      // v = d/t → d = v * t  (scrollSpeed is px/sec, deltaTime is ms)
      const scrollAmount = (velocity * deltaTime) / 1000;

      // Sub-pixel accumulator — avoids integer-rounding stutter
      scrollAccumulator.current += scrollAmount;

      if (scrollAccumulator.current >= 1) {
        const pixelsToScroll = Math.floor(scrollAccumulator.current);
        const maxScroll =
          containerRef.current.scrollHeight - containerRef.current.clientHeight;

        if (containerRef.current.scrollTop < maxScroll) {
          containerRef.current.scrollTop += pixelsToScroll;
        }
        scrollAccumulator.current -= pixelsToScroll;
      }
    }

    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, [containerRef, ttsVelocityRef]); // scrollSpeedRef read via ref — no dep needed

  // --- Start / stop lifecycle ----------------------------------------------
  // When isActive becomes true we also clear any in-flight yield state so that
  // "Resume Reading" works immediately even if the 2000ms debounce is still
  // running (fixes the immediate-resume bug from the code review).
  useEffect(() => {
    if (isActive) {
      isYieldingRef.current = false;
      onYieldChange?.(false);
      if (yieldTimeoutRef.current !== undefined) {
        clearTimeout(yieldTimeoutRef.current);
        yieldTimeoutRef.current = undefined;
      }
      if (!prefersReducedMotionRef.current) {
        lastTimeRef.current = undefined;
        scrollAccumulator.current = 0;
        requestRef.current = requestAnimationFrame(animate);
      }
    }
    return () => {
      if (requestRef.current !== undefined) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = undefined;
      }
    };
  }, [isActive, animate, onYieldChange]);

  // --- User yield: pause on interaction, resume after 2000 ms -------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleUserInteraction = (e: Event) => {
      if (!isActiveRef.current) return;

      // For keyboard events, only yield on scroll-related keys
      if (e.type === 'keydown') {
        const key = (e as KeyboardEvent).key;
        if (
          !['ArrowUp', 'ArrowDown', ' ', 'PageUp', 'PageDown', 'Home', 'End'].includes(key)
        ) {
          return;
        }
      }

      // Only fire onYieldChange once per yield session (not on every wheel tick)
      if (!isYieldingRef.current) {
        isYieldingRef.current = true;
        onYieldChange?.(true);
      }

      if (requestRef.current !== undefined) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = undefined;
        lastTimeRef.current = undefined;
      }

      if (yieldTimeoutRef.current !== undefined) {
        clearTimeout(yieldTimeoutRef.current);
      }

      // Resume auto-scroll 2000ms after the last user interaction
      yieldTimeoutRef.current = setTimeout(() => {
        isYieldingRef.current = false;
        onYieldChange?.(false);
        if (isActiveRef.current && !prefersReducedMotionRef.current) {
          lastTimeRef.current = undefined;
          scrollAccumulator.current = 0;
          requestRef.current = requestAnimationFrame(animate);
        }
      }, 2000);
    };

    container.addEventListener('wheel',      handleUserInteraction, { passive: true });
    container.addEventListener('touchstart', handleUserInteraction, { passive: true });
    container.addEventListener('touchmove',  handleUserInteraction, { passive: true });
    container.addEventListener('keydown',    handleUserInteraction as EventListener);

    return () => {
      container.removeEventListener('wheel',      handleUserInteraction);
      container.removeEventListener('touchstart', handleUserInteraction);
      container.removeEventListener('touchmove',  handleUserInteraction);
      container.removeEventListener('keydown',    handleUserInteraction as EventListener);
      if (yieldTimeoutRef.current !== undefined) {
        clearTimeout(yieldTimeoutRef.current);
      }
    };
  }, [containerRef, onYieldChange, animate]);
}

