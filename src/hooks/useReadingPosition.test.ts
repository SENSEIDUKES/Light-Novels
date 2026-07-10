/**
 * Tests for semantic reading-position persistence: debounced anchor saves,
 * anchor-based restoration, and the one-time legacy pixel migration.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReadingPosition } from './useReadingPosition';
import { useAppStore } from '../store/useAppStore';
import type { StoryWorld } from '../types';

const CLIENT_HEIGHT = 500;
const FOCUS_LINE = CLIENT_HEIGHT * 0.33;

function buildReaderDom(
  paragraphs: Array<{ index: number; top: number; height: number; blockId?: string }>,
) {
  const container = document.createElement('div');
  const doc = document.documentElement;
  for (const p of paragraphs) {
    const el = document.createElement('div');
    el.setAttribute('data-reader-anchor', `1:${p.index}`);
    el.setAttribute('data-paragraph-index', String(p.index));
    if (p.blockId) el.setAttribute('data-block-id', p.blockId);
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

function makeStory(overrides: Partial<StoryWorld> = {}): StoryWorld {
  return { id: 'story-1', ...overrides } as StoryWorld;
}

describe('useReadingPosition', () => {
  let container: HTMLElement;
  let rafCallbacks: FrameRequestCallback[];

  beforeEach(() => {
    vi.useFakeTimers();
    rafCallbacks = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.stubGlobal('visualViewport', undefined);
    const doc = document.documentElement;
    Object.defineProperty(doc, 'scrollHeight', { value: 5000, configurable: true });
    Object.defineProperty(doc, 'clientHeight', { value: CLIENT_HEIGHT, configurable: true });
    doc.scrollTop = 0;
    container = buildReaderDom([
      { index: 0, top: 0, height: 300 },
      { index: 1, top: 300, height: 300, blockId: 'blk_1' },
      { index: 2, top: 600, height: 300 },
    ]);
  });

  afterEach(() => {
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const setup = (story: StoryWorld, onUpdateStory = vi.fn()) => {
    useAppStore.setState({ stories: [story] });
    const contentRef = { current: container };
    renderHook(() =>
      useReadingPosition({
        contentRef,
        activeStory: story,
        selectedChapterNum: 1,
        onUpdateStory,
        hasRenderableContent: true,
      }),
    );
    return onUpdateStory;
  };

  it('saves the anchor nearest the focus line on debounced scroll', () => {
    const onUpdateStory = setup(makeStory());
    act(() => {
      // Focus line lands at 400 + 165 = 565 → paragraph 1 (300..600).
      document.documentElement.scrollTop = 400;
      window.dispatchEvent(new Event('scroll'));
      vi.advanceTimersByTime(2100);
    });
    expect(onUpdateStory).toHaveBeenCalledTimes(1);
    const saved = onUpdateStory.mock.calls[0][0];
    expect(saved.readingAnchor.paragraphIndex).toBe(1);
    expect(saved.readingAnchor.blockId).toBe('blk_1');
    expect(saved.readingAnchor.chapterNumber).toBe(1);
    expect(saved.readingAnchor.intraBlockRatio).toBeCloseTo((565 - 300) / 300);
    expect(saved.lastReadChapter).toBe(1);
    // Raw pixels are never written anymore.
    expect(saved.lastReadScrollPosition).toBeUndefined();
  });

  it('does not save on every scroll event (debounce)', () => {
    const onUpdateStory = setup(makeStory());
    act(() => {
      for (let i = 0; i < 10; i++) {
        document.documentElement.scrollTop = 100 + i * 10;
        window.dispatchEvent(new Event('scroll'));
        vi.advanceTimersByTime(500);
      }
    });
    expect(onUpdateStory).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(2100); });
    expect(onUpdateStory).toHaveBeenCalledTimes(1);
  });

  it('restores a saved semantic anchor to the focus line', async () => {
    setup(
      makeStory({
        lastReadChapter: 1,
        readingAnchor: {
          chapterNumber: 1,
          paragraphIndex: 2,
          intraBlockRatio: 0.5,
          savedAt: new Date().toISOString(),
        },
      }),
    );
    // document.fonts is undefined in jsdom → restoration proceeds directly,
    // but it is still async; flush microtasks.
    await act(async () => { await Promise.resolve(); });
    // Block 2 spans 600..900; midpoint 750 minus focus line 165 = 585.
    expect(document.documentElement.scrollTop).toBeCloseTo(750 - FOCUS_LINE, 0);
  });

  it('locates the anchor by stable block ID even if paragraph indexes shifted', async () => {
    setup(
      makeStory({
        lastReadChapter: 1,
        readingAnchor: {
          chapterNumber: 1,
          blockId: 'blk_1',
          paragraphIndex: 99, // stale index — block ID must win
          intraBlockRatio: 0,
          savedAt: new Date().toISOString(),
        },
      }),
    );
    await act(async () => { await Promise.resolve(); });
    // Block blk_1 top = 300 minus focus line 165 = 135.
    expect(document.documentElement.scrollTop).toBeCloseTo(300 - FOCUS_LINE, 0);
  });

  it('migrates a legacy pixel position once into a semantic anchor', async () => {
    const onUpdateStory = setup(
      makeStory({ lastReadChapter: 1, lastReadScrollPosition: 400 }),
    );
    await act(async () => { await Promise.resolve(); });
    // Legacy offset restored…
    expect(document.documentElement.scrollTop).toBe(400);
    // …then resolved to a semantic anchor on the corrective frame.
    act(() => { rafCallbacks.splice(0).forEach((cb) => cb(0)); });
    expect(onUpdateStory).toHaveBeenCalledTimes(1);
    const saved = onUpdateStory.mock.calls[0][0];
    expect(saved.readingAnchor.paragraphIndex).toBe(1);
    expect(saved.lastReadScrollPosition).toBeUndefined();
  });

  it('does not restore when the saved chapter differs', async () => {
    setup(
      makeStory({
        lastReadChapter: 7,
        readingAnchor: {
          chapterNumber: 7,
          paragraphIndex: 2,
          intraBlockRatio: 0,
          savedAt: new Date().toISOString(),
        },
      }),
    );
    await act(async () => { await Promise.resolve(); });
    expect(document.documentElement.scrollTop).toBe(0);
  });
});
