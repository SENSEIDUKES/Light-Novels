/**
 * Deterministic tests for the smooth-motion behaviour of useCinematicScroll.
 *
 * Unlike the migrated useReadingDrift tests (which use a setTimeout-based rAF
 * and only assert scrollTop >= 0), these drive the rAF callback by hand with
 * explicit, advancing timestamps so we can assert the actual motion profile:
 * sub-pixel (fractional) increments and eased ramp-up.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCinematicScroll } from './useCinematicScroll';
import React from 'react';

function makeMockContainer(scrollHeight = 5000, clientHeight = 500) {
  const el = document.createElement('div');
  Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: clientHeight, configurable: true });
  el.scrollTop = 0;
  return el;
}

function mockMatchMedia(prefersReducedMotion = false) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: prefersReducedMotion && query.includes('reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('useCinematicScroll — smooth motion', () => {
  // The latest rAF callback the hook has registered.
  let frameCb: FrameRequestCallback | null = null;

  beforeEach(() => {
    mockMatchMedia();
    frameCb = null;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      frameCb = cb;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {
      frameCb = null;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  /** Drive one frame at the given timestamp (ms). */
  function frame(time: number) {
    act(() => {
      frameCb?.(time);
    });
  }

  it('advances by fractional (sub-pixel) amounts rather than whole-pixel steps', () => {
    const container = makeMockContainer();
    const containerRef = { current: container } as React.RefObject<HTMLDivElement>;
    // Constant free-scroll fallback (ttsVelocityRef.current = null) uses the
    // store default scrollSpeed of 30 px/sec.
    const ttsVelocityRef = { current: null } as React.MutableRefObject<number | null>;

    renderHook(() => useCinematicScroll(containerRef, true, ttsVelocityRef));

    // First frame only establishes the baseline timestamp (no movement yet).
    frame(0);
    expect(container.scrollTop).toBe(0);

    // Second frame, 100ms later, produces real motion.
    frame(100);
    expect(container.scrollTop).toBeGreaterThan(0);
    // Motion is sub-pixel/eased — it must NOT be an integer whole-pixel jump.
    expect(Number.isInteger(container.scrollTop)).toBe(false);
  });

  it('eases up from rest (first step slower than a later step at constant speed)', () => {
    const container = makeMockContainer();
    const containerRef = { current: container } as React.RefObject<HTMLDivElement>;
    const ttsVelocityRef = { current: null } as React.MutableRefObject<number | null>;

    renderHook(() => useCinematicScroll(containerRef, true, ttsVelocityRef));

    frame(0);
    frame(100);
    const firstStep = container.scrollTop; // ramp-up: velocity still below target

    const before = container.scrollTop;
    frame(200);
    const laterStep = container.scrollTop - before; // velocity now closer to target

    // Eased ramp: the later 100ms step should cover more ground than the first.
    expect(laterStep).toBeGreaterThan(firstStep);
  });

  it('resume() restarts the loop immediately after a user yield (no 2s wait)', () => {
    const container = makeMockContainer();
    const containerRef = { current: container } as React.RefObject<HTMLDivElement>;
    const ttsVelocityRef = { current: null } as React.MutableRefObject<number | null>;
    const onYield = vi.fn();

    const { result } = renderHook(() =>
      useCinematicScroll(containerRef, true, ttsVelocityRef, onYield),
    );

    // Establish motion.
    frame(0);
    frame(100);
    const beforeYield = container.scrollTop;
    expect(beforeYield).toBeGreaterThan(0);

    // User scrolls → engine yields (cancels its rAF; there is no live frameCb).
    act(() => {
      container.dispatchEvent(new Event('wheel'));
    });
    expect(onYield).toHaveBeenLastCalledWith(true);
    frameCb = null;

    // Click "Resume Reading" → imperative resume re-registers a frame callback
    // and reports the un-yield, without waiting for the 2000ms debounce.
    act(() => {
      result.current.resume();
    });
    expect(onYield).toHaveBeenLastCalledWith(false);
    expect(frameCb).not.toBeNull();

    // And the newly-restarted loop advances again.
    const resumeBase = container.scrollTop;
    frame(200);
    frame(300);
    expect(container.scrollTop).toBeGreaterThan(resumeBase);
  });

  it('never scrolls past the bottom of the content', () => {
    const container = makeMockContainer(600, 500); // only 100px of scroll range
    const containerRef = { current: container } as React.RefObject<HTMLDivElement>;
    const ttsVelocityRef = { current: 800 } as React.MutableRefObject<number | null>;

    renderHook(() => useCinematicScroll(containerRef, true, ttsVelocityRef));

    frame(0);
    // Drive well past the point where 800px/sec would overshoot 100px.
    for (let t = 100; t <= 2000; t += 100) frame(t);

    expect(container.scrollTop).toBeLessThanOrEqual(100);
    expect(container.scrollTop).toBeGreaterThan(0);
  });
});
