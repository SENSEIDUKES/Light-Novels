import { describe, it, expect, afterEach } from 'vitest';
import { resolveScrollTarget } from './scrollTarget';

function makeEl(scrollHeight: number, clientHeight: number) {
  const el = document.createElement('div');
  Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: clientHeight, configurable: true });
  el.scrollTop = 0;
  return el;
}

describe('resolveScrollTarget', () => {
  afterEach(() => {
    // Reset any scroll we applied to the document element between cases.
    const scroller = document.scrollingElement as HTMLElement | null;
    if (scroller) scroller.scrollTop = 0;
  });

  it('returns the container itself when it genuinely overflows', () => {
    const el = makeEl(2000, 500);
    expect(resolveScrollTarget(el)).toBe(el);
  });

  it('falls back to the document scroller when the container cannot overflow', () => {
    // This is the reader-viewport case: flex-1 + overflow-y-auto, but the
    // element grew to fit its content so scrollHeight === clientHeight.
    const el = makeEl(1200, 1200);
    const target = resolveScrollTarget(el);
    expect(target).toBe(document.scrollingElement || document.documentElement);
    expect(target).not.toBe(el);
  });

  it('the resolved document target is actually writable (drives real scroll)', () => {
    const el = makeEl(1200, 1200);
    const target = resolveScrollTarget(el)!;
    target.scrollTop = 42;
    expect(target.scrollTop).toBe(42);
    // The dormant viewport div would have swallowed the write silently.
    expect(el.scrollTop).toBe(0);
  });

  it('returns the container for a null-free scrollable element even at 2px margin', () => {
    const el = makeEl(502, 500); // 2px of overflow → scrollable
    expect(resolveScrollTarget(el)).toBe(el);
  });

  it('falls back when overflow is within the 1px tolerance', () => {
    const el = makeEl(501, 500); // 1px → treated as non-scrollable
    expect(resolveScrollTarget(el)).not.toBe(el);
  });
});
