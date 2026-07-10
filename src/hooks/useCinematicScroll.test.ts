/**
 * Integration tests for the rewritten cinematic scroll orchestration:
 * narration events → state machine → cached geometry → spring → scrollTop.
 *
 * Uses a controllable animation-frame scheduler, a fake narration clock
 * (event dispatch + manually pumped frame times), and stubbed document
 * geometry. Assertions check exact state transitions, movement direction,
 * and bounded positions — not just "scrollTop >= 0".
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCinematicScroll } from './useCinematicScroll';
import { dispatchNarration } from '../lib/narrativeCues';
import { useAppStore } from '../store/useAppStore';

// --- Controllable rAF scheduler ---------------------------------------------
let rafQueue: Map<number, FrameRequestCallback>;
let rafId: number;

function pumpFrames(count: number, stepMs = 16, startTime = performance.now()) {
  let time = startTime;
  for (let i = 0; i < count; i++) {
    time += stepMs;
    const callbacks = Array.from(rafQueue.values());
    rafQueue.clear();
    for (const cb of callbacks) cb(time);
  }
  return time;
}

// --- Document geometry -------------------------------------------------------
const CLIENT_HEIGHT = 500;
const SCROLL_HEIGHT = 5000;
const FOCUS_LINE = CLIENT_HEIGHT * 0.33; // no VisualViewport in these tests

/** Paragraph blocks at fixed document positions; rects track scrollTop. */
function buildReaderDom(paragraphs: Array<{ index: number; top: number; height: number }>) {
  const container = document.createElement('div');
  const doc = document.documentElement;
  for (const p of paragraphs) {
    const el = document.createElement('div');
    el.setAttribute('data-reader-anchor', `1:${p.index}`);
    el.setAttribute('data-paragraph-index', String(p.index));
    el.getBoundingClientRect = () =>
      ({
        top: p.top - doc.scrollTop,
        bottom: p.top + p.height - doc.scrollTop,
        height: p.height,
        left: 0, right: 0, width: 0, x: 0, y: p.top - doc.scrollTop,
        toJSON: () => ({}),
      }) as DOMRect;
    container.appendChild(el);
  }
  document.body.appendChild(container);
  return container;
}

function mockMatchMedia(reduced = false) {
  const listeners = new Set<(e: { matches: boolean }) => void>();
  const mq = {
    matches: reduced,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: (_: string, fn: any) => listeners.add(fn),
    removeEventListener: (_: string, fn: any) => listeners.delete(fn),
  };
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mq));
  return {
    setReduced(matches: boolean) {
      mq.matches = matches;
      listeners.forEach((fn) => fn({ matches }));
    },
  };
}

describe('useCinematicScroll', () => {
  let container: HTMLElement;

  beforeEach(() => {
    rafQueue = new Map();
    rafId = 0;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafQueue.set(++rafId, cb);
      return rafId;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      rafQueue.delete(id);
    });
    vi.stubGlobal('visualViewport', undefined);
    mockMatchMedia(false);

    const doc = document.documentElement;
    Object.defineProperty(doc, 'scrollHeight', { value: SCROLL_HEIGHT, configurable: true });
    Object.defineProperty(doc, 'clientHeight', { value: CLIENT_HEIGHT, configurable: true });
    doc.scrollTop = 0;

    useAppStore.getState().setImmersion({ master: true, autoScroll: true });

    container = buildReaderDom([
      { index: 0, top: 400, height: 100 },
      { index: 1, top: 600, height: 100 },
      { index: 2, top: 900, height: 100 },
    ]);
  });

  afterEach(() => {
    container.remove();
    vi.unstubAllGlobals();
  });

  const setup = () => {
    const contentRef = { current: container };
    return renderHook(() => useCinematicScroll(contentRef));
  };

  const startNarration = (durationMs = 1000) => {
    act(() => {
      dispatchNarration({ status: 'start' });
      dispatchNarration({ status: 'block', blockIndex: 0, durationMs });
    });
  };

  it('is idle before narration and following once narration starts', () => {
    const { result } = setup();
    expect(result.current.state).toBe('idle');
    startNarration();
    expect(result.current.state).toBe('following');
  });

  it('advances document scrollTop forward while following a block event', () => {
    setup();
    startNarration(1000);
    act(() => {
      pumpFrames(30);
    });
    const pos = document.documentElement.scrollTop;
    // Target for block 0 is 400 - focusLine ≈ 235; movement must be forward,
    // bounded, and strictly positive after half a second of frames.
    expect(pos).toBeGreaterThan(0);
    expect(pos).toBeLessThanOrEqual(600 - FOCUS_LINE + 1);
  });

  it('progresses toward the NEXT block as the narration timeline elapses', () => {
    setup();
    startNarration(500); // short duration: timeline reaches the next block fast
    act(() => {
      pumpFrames(120);
    });
    const pos = document.documentElement.scrollTop;
    // Timeline end target = next block top (600) on focus line ≈ 435.
    expect(pos).toBeGreaterThan(300);
    expect(pos).toBeLessThanOrEqual(600 - FOCUS_LINE + 1);
  });

  it('never writes outside document bounds', () => {
    setup();
    startNarration(1);
    act(() => {
      pumpFrames(500, 32);
    });
    const pos = document.documentElement.scrollTop;
    expect(pos).toBeGreaterThanOrEqual(0);
    expect(pos).toBeLessThanOrEqual(SCROLL_HEIGHT - CLIENT_HEIGHT);
  });

  it('pause stops animation-frame writes; resume event continues them', () => {
    const { result } = setup();
    startNarration();
    act(() => { pumpFrames(10); });
    act(() => { dispatchNarration({ status: 'pause' }); });
    expect(result.current.state).toBe('paused');
    const frozen = document.documentElement.scrollTop;
    act(() => { pumpFrames(20); });
    expect(document.documentElement.scrollTop).toBe(frozen);
    act(() => { dispatchNarration({ status: 'resume' }); });
    expect(result.current.state).toBe('following');
  });

  it('narration end returns to idle and stops movement', () => {
    const { result } = setup();
    startNarration();
    act(() => { pumpFrames(5); });
    act(() => { dispatchNarration({ status: 'end' }); });
    expect(result.current.state).toBe('idle');
    const frozen = document.documentElement.scrollTop;
    act(() => { pumpFrames(20); });
    expect(document.documentElement.scrollTop).toBe(frozen);
  });

  describe('user intervention', () => {
    it('wheel input yields immediately and movement stays stopped', () => {
      const { result } = setup();
      startNarration();
      act(() => { pumpFrames(5); });
      act(() => { window.dispatchEvent(new Event('wheel')); });
      expect(result.current.state).toBe('yielded');
      const frozen = document.documentElement.scrollTop;
      // Far more frames than any old timed-resume window (2s / 4s / 10s).
      act(() => { pumpFrames(700, 16); });
      expect(document.documentElement.scrollTop).toBe(frozen);
      expect(result.current.state).toBe('yielded');
    });

    it('touch scrolling yields', () => {
      const { result } = setup();
      startNarration();
      act(() => { window.dispatchEvent(new Event('touchmove')); });
      expect(result.current.state).toBe('yielded');
    });

    it('scroll keys yield; non-scroll keys do not', () => {
      const { result } = setup();
      startNarration();
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      });
      expect(result.current.state).toBe('following');
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown' }));
      });
      expect(result.current.state).toBe('yielded');
    });

    it('an external scroll (scrollbar drag) yields', () => {
      const { result } = setup();
      startNarration();
      act(() => { pumpFrames(5); });
      act(() => {
        document.documentElement.scrollTop += 400; // far from controller write
        window.dispatchEvent(new Event('scroll'));
      });
      expect(result.current.state).toBe('yielded');
    });

    it('the imperative intervene() yields (programmatic jumps)', () => {
      const { result } = setup();
      startNarration();
      act(() => { result.current.intervene(); });
      expect(result.current.state).toBe('yielded');
    });

    it('explicit resume() returns to following and movement restarts', () => {
      const { result } = setup();
      startNarration();
      act(() => { window.dispatchEvent(new Event('wheel')); });
      expect(result.current.state).toBe('yielded');
      act(() => { result.current.resume(); });
      expect(result.current.state).toBe('following');
      const before = document.documentElement.scrollTop;
      act(() => { pumpFrames(30); });
      expect(document.documentElement.scrollTop).toBeGreaterThan(before);
    });

    it('resume() stays yielded when the reader scrolled ahead of narration', () => {
      const { result } = setup();
      startNarration();
      act(() => { window.dispatchEvent(new Event('wheel')); });
      act(() => {
        // User scrolls way past the narration target (~435 max).
        document.documentElement.scrollTop = 2000;
        window.dispatchEvent(new Event('scroll'));
      });
      act(() => { result.current.resume(); });
      expect(result.current.state).toBe('yielded');
      const frozen = document.documentElement.scrollTop;
      act(() => { pumpFrames(20); });
      expect(document.documentElement.scrollTop).toBe(frozen);
    });
  });

  describe('preferences and reduced motion', () => {
    it('disabling Auto Scroll suppresses movement without stopping narration', () => {
      const { result } = setup();
      startNarration();
      act(() => {
        useAppStore.getState().setImmersion({ autoScroll: false });
      });
      expect(result.current.state).toBe('suppressed');
      const frozen = document.documentElement.scrollTop;
      act(() => { pumpFrames(20); });
      expect(document.documentElement.scrollTop).toBe(frozen);

      act(() => {
        useAppStore.getState().setImmersion({ autoScroll: true });
      });
      expect(result.current.state).toBe('following');
    });

    it('immersion master off also suppresses', () => {
      const { result } = setup();
      startNarration();
      act(() => {
        useAppStore.getState().setImmersion({ master: false });
      });
      expect(result.current.state).toBe('suppressed');
      act(() => {
        useAppStore.getState().setImmersion({ master: true });
      });
      expect(result.current.state).toBe('following');
    });

    it('reduced motion never allows continuous movement', () => {
      rafQueue.clear();
      const media = mockMatchMedia(true);
      const { result } = setup();
      startNarration();
      expect(result.current.state).toBe('suppressed');
      act(() => { pumpFrames(30); });
      expect(document.documentElement.scrollTop).toBe(0);

      // Turning it off mid-narration re-enables following.
      act(() => { media.setReduced(false); });
      expect(result.current.state).toBe('following');
    });
  });

  it('chapter change (narration end + new start) begins a fresh following session', () => {
    const { result } = setup();
    startNarration();
    act(() => { window.dispatchEvent(new Event('wheel')); });
    expect(result.current.state).toBe('yielded');
    act(() => {
      dispatchNarration({ status: 'end' });
      dispatchNarration({ status: 'start' });
      dispatchNarration({ status: 'block', blockIndex: 1, durationMs: 1000 });
    });
    // The old yield does not leak into the new narration session.
    expect(result.current.state).toBe('following');
  });
});
