import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createDocumentScrollSurface,
  getVisibleViewport,
  getFocusLine,
  resolveScrollingElement,
} from './scrollSurface';

function mockScrollingElement(scrollHeight: number, clientHeight: number) {
  const el = document.documentElement;
  Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: clientHeight, configurable: true });
  el.scrollTop = 0;
  return el;
}

describe('scrollSurface', () => {
  beforeEach(() => {
    mockScrollingElement(2000, 500);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves document.scrollingElement (or documentElement fallback)', () => {
    const el = resolveScrollingElement();
    expect(el === document.scrollingElement || el === document.documentElement).toBe(true);
  });

  it('reports the max position from scrollHeight - clientHeight', () => {
    const surface = createDocumentScrollSurface();
    expect(surface.getMaxPosition()).toBe(1500);
  });

  it('clamps writes to valid bounds', () => {
    const surface = createDocumentScrollSurface();
    surface.setPosition(99_999);
    expect(surface.getPosition()).toBe(1500);
    surface.setPosition(-50);
    expect(surface.getPosition()).toBe(0);
    surface.setPosition(700);
    expect(surface.getPosition()).toBe(700);
  });

  it('ignores non-finite writes', () => {
    const surface = createDocumentScrollSurface();
    surface.setPosition(300);
    surface.setPosition(NaN);
    surface.setPosition(Infinity * -1 + Infinity); // NaN
    expect(surface.getPosition()).toBe(300);
  });

  it('notifies subscribers on window scroll and stops after unsubscribe', () => {
    const surface = createDocumentScrollSurface();
    const listener = vi.fn();
    const unsubscribe = surface.subscribe(listener);
    window.dispatchEvent(new Event('scroll'));
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    window.dispatchEvent(new Event('scroll'));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  describe('visible viewport', () => {
    it('prefers VisualViewport offsets when available', () => {
      vi.stubGlobal('visualViewport', { offsetTop: 40, height: 600 });
      expect(getVisibleViewport()).toEqual({ top: 40, height: 600, bottom: 640 });
    });

    it('falls back to documentElement.clientHeight without VisualViewport', () => {
      vi.stubGlobal('visualViewport', undefined);
      const vp = getVisibleViewport();
      expect(vp.top).toBe(0);
      expect(vp.height).toBe(document.documentElement.clientHeight);
    });

    it('computes the focus line one third into the usable visible area', () => {
      vi.stubGlobal('visualViewport', { offsetTop: 100, height: 300 });
      // visibleTop(100) + occlusion(60) + (300-60) * 0.33
      expect(getFocusLine(60)).toBeCloseTo(100 + 60 + 240 * 0.33);
    });

    it('never returns a negative usable height', () => {
      vi.stubGlobal('visualViewport', { offsetTop: 0, height: 50 });
      expect(getFocusLine(200)).toBe(200); // usable clamped to 0
    });
  });
});
