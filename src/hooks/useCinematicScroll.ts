import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { resolveScrollTarget } from '../lib/scrollTarget';

/**
 * Time constant (ms) for easing the scroll velocity toward its target. Larger =
 * gentler, laggier; smaller = snappier, more abrupt. ~220ms glides through TTS
 * chunk-boundary velocity changes without visibly trailing the narration.
 */
const VELOCITY_EASE_MS = 220;

/** Cap the per-frame time step so a backgrounded tab can't produce one huge jump. */
const MAX_FRAME_MS = 50;

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
  // Actual float scroll position we drive; written back to the target each
  // frame. null = "re-sync from the element on the next frame" (used on start,
  // resume, or when the resolved target changes).
  const scrollPosRef      = useRef<number | null>(null);
  // Eased velocity (px/sec). We glide this toward the target velocity so abrupt
  // changes — a new TTS chunk, or the very first frame — don't jerk the page.
  const currentVelocity   = useRef<number>(0);
  const isYieldingRef     = useRef<boolean>(false);
  const yieldTimeoutRef   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onYieldChangeRef  = useRef(onYieldChange);
  onYieldChangeRef.current = onYieldChange;

  // Cache of the resolved scroll target. Resolving reads scrollHeight/
  // clientHeight, so we throttle it (the target is very stable) to keep the
  // per-frame hot path free of layout reads.
  const scrollTargetRef   = useRef<HTMLElement | null>(null);
  const targetResolvedAt  = useRef<number>(0);

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
  const animate = useCallback(function step(time: number) {
    if (isYieldingRef.current || !isActiveRef.current || prefersReducedMotionRef.current) {
      lastTimeRef.current = undefined;
      return;
    }

    if (lastTimeRef.current != null && containerRef.current) {
      const deltaTime = Math.min(time - lastTimeRef.current, MAX_FRAME_MS);

      // The viewport div is styled to scroll, but the layout lets it grow
      // instead of overflow — so the real scroll target is usually the
      // document. Resolve it (throttled: the target is stable and resolving
      // reads layout) so we drive whatever actually scrolls, picking up the
      // container once a fixed-height/fullscreen layout makes it overflow.
      let target = scrollTargetRef.current;
      if (target == null || time - targetResolvedAt.current > 1000) {
        const resolved = resolveScrollTarget(containerRef.current);
        if (resolved !== target) {
          target = resolved;
          scrollTargetRef.current = resolved;
          // New element → re-sync our float position to its real offset.
          scrollPosRef.current = resolved ? resolved.scrollTop : null;
        }
        targetResolvedAt.current = time;
      }

      if (target) {
        // Target velocity: TTS-paced overrides constant free-scroll.
        const targetVelocity =
          ttsVelocityRef != null && ttsVelocityRef.current != null
            ? ttsVelocityRef.current
            : scrollSpeedRef.current;

        // Ease the actual velocity toward the target (frame-rate independent).
        const smoothing = 1 - Math.exp(-deltaTime / VELOCITY_EASE_MS);
        currentVelocity.current += (targetVelocity - currentVelocity.current) * smoothing;

        // Drive a float position and write it back each frame. Fractional
        // scrollTop lets the browser step by device pixels (especially on
        // HiDPI screens) instead of jumping whole CSS pixels — the integer
        // flooring is what made low-speed scrolling look stuttery/choppy.
        if (scrollPosRef.current == null) scrollPosRef.current = target.scrollTop;
        const maxScroll = Math.max(0, target.scrollHeight - target.clientHeight);
        scrollPosRef.current = Math.min(
          scrollPosRef.current + (currentVelocity.current * deltaTime) / 1000,
          maxScroll,
        );
        target.scrollTop = scrollPosRef.current;
      }
    }

    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(step);
  }, [containerRef, ttsVelocityRef]); // scrollSpeedRef read via ref — no dep needed

  // --- Start / stop lifecycle ----------------------------------------------
  // When isActive becomes true we also clear any in-flight yield state so that
  // "Resume Reading" works immediately even if the 2000ms debounce is still
  // running (fixes the immediate-resume bug from the code review).
  const prevIsActiveRef = useRef(false);
  useEffect(() => {
    const justBecameActive = isActive && !prevIsActiveRef.current;
    prevIsActiveRef.current = isActive;

    if (isActive) {
      if (justBecameActive) {
        isYieldingRef.current = false;
        onYieldChangeRef.current?.(false);
        if (yieldTimeoutRef.current !== undefined) {
          clearTimeout(yieldTimeoutRef.current);
          yieldTimeoutRef.current = undefined;
        }
      }

      if (!isYieldingRef.current && !prefersReducedMotionRef.current) {
        if (justBecameActive) {
          lastTimeRef.current = undefined;
          currentVelocity.current = 0;     // ramp up smoothly from rest
          scrollPosRef.current = null;      // re-sync to the live scroll offset
        }
        requestRef.current = requestAnimationFrame(animate);
      }
    }
    return () => {
      if (requestRef.current !== undefined) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = undefined;
      }
    };
  }, [isActive, animate]);

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
        onYieldChangeRef.current?.(true);
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
        onYieldChangeRef.current?.(false);
        if (isActiveRef.current && !prefersReducedMotionRef.current) {
          lastTimeRef.current = undefined;
          currentVelocity.current = 0;    // ramp up smoothly after a yield
          scrollPosRef.current = null;     // user may have scrolled — re-sync
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
  }, [containerRef, animate]);

  // --- Imperative resume ---------------------------------------------------
  // Cancels the pending 2000ms debounce and restarts the loop right away.
  // `isActive` is driven by playback state (not the yield flag), so a "Resume
  // Reading" click can't rely on an isActive change to re-run the start effect;
  // this gives the UI a direct way to resume without waiting out the debounce.
  const resume = useCallback(() => {
    if (yieldTimeoutRef.current !== undefined) {
      clearTimeout(yieldTimeoutRef.current);
      yieldTimeoutRef.current = undefined;
    }
    isYieldingRef.current = false;
    onYieldChangeRef.current?.(false);
    if (
      isActiveRef.current &&
      !prefersReducedMotionRef.current &&
      requestRef.current === undefined
    ) {
      lastTimeRef.current = undefined;
      currentVelocity.current = 0;   // ramp up smoothly
      scrollPosRef.current = null;    // user may have scrolled — re-sync
      requestRef.current = requestAnimationFrame(animate);
    }
  }, [animate]);

  return { resume };
}

