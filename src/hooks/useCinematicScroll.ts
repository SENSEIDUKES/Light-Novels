import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';

/**
 * useCinematicScroll
 *
 * Flawless, cinematic "requestAnimationFrame" engine for infinite auto-scrolling.
 * Reads global scroll state and physically increments scrollTop using a sub-pixel
 * accumulator for maximum frame-by-frame smoothness.
 */
export function useCinematicScroll(containerRef: React.RefObject<HTMLElement>) {
  const isAutoScrolling = useAppStore(state => state.immersion.autoScroll);
  const scrollSpeed = useAppStore(state => state.scrollSpeed);

  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();
  const scrollAccumulatorRef = useRef<number>(0);
  const isYieldingRef = useRef<boolean>(false);
  const yieldTimeoutRef = useRef<NodeJS.Timeout>();

  const animate = useCallback((time: number) => {
    // If user is actively yielding, or auto-scroll is disabled, stop animating
    if (isYieldingRef.current || !isAutoScrolling) {
      lastTimeRef.current = undefined;
      return;
    }

    if (lastTimeRef.current != null && containerRef.current) {
      const deltaTime = time - lastTimeRef.current;
      
      // Calculate how many pixels we should scroll based on time elapsed
      // v = d/t => d = v * t
      // scrollSpeed is pixels per second, so we divide by 1000 for milliseconds
      const scrollAmount = (scrollSpeed * deltaTime) / 1000;
      
      // Accumulate fractional sub-pixels to avoid integer-rounding stutter
      scrollAccumulatorRef.current += scrollAmount;

      // When our accumulator hits at least 1 pixel, physically scroll the container
      if (scrollAccumulatorRef.current >= 1) {
        const pixelsToScroll = Math.floor(scrollAccumulatorRef.current);
        
        // Prevent scrolling past the maximum bottom
        const maxScroll = containerRef.current.scrollHeight - containerRef.current.clientHeight;
        if (containerRef.current.scrollTop < maxScroll) {
            containerRef.current.scrollTop += pixelsToScroll;
        }
        
        // Subtract only the whole pixels we applied, keeping the decimal fraction
        scrollAccumulatorRef.current -= pixelsToScroll;
      }
    }
    
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, [isAutoScrolling, scrollSpeed, containerRef]);

  // Main lifecycle for the rAF loop
  useEffect(() => {
    if (isAutoScrolling && !isYieldingRef.current) {
      lastTimeRef.current = undefined;
      requestRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isAutoScrolling, animate]);

  // User Yield Logic: instantly pause the rAF loop upon user interaction,
  // and set a 2000ms debounce before resuming.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleUserInteraction = () => {
      if (!useAppStore.getState().immersion.autoScroll) return;

      isYieldingRef.current = true;
      
      // Stop the current animation frame immediately to yield to user
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        lastTimeRef.current = undefined; 
      }

      if (yieldTimeoutRef.current) {
        clearTimeout(yieldTimeoutRef.current);
      }

      // Resume engine after 2000ms of no interactions
      yieldTimeoutRef.current = setTimeout(() => {
        isYieldingRef.current = false;
        
        // If the global state still wants us to scroll, restart the loop
        if (useAppStore.getState().immersion.autoScroll) {
          lastTimeRef.current = undefined;
          requestRef.current = requestAnimationFrame(animate);
        }
      }, 2000);
    };

    // Add passive listeners for smooth scrolling interactions
    container.addEventListener('wheel', handleUserInteraction, { passive: true });
    container.addEventListener('touchstart', handleUserInteraction, { passive: true });
    container.addEventListener('touchmove', handleUserInteraction, { passive: true });

    return () => {
      container.removeEventListener('wheel', handleUserInteraction);
      container.removeEventListener('touchstart', handleUserInteraction);
      container.removeEventListener('touchmove', handleUserInteraction);
      if (yieldTimeoutRef.current) {
        clearTimeout(yieldTimeoutRef.current);
      }
    };
  }, [containerRef, animate]);
}
