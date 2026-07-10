import { describe, it, expect } from 'vitest';
import {
  anchorKey,
  anchorAttributes,
  contentSignature,
  getAnchorElements,
  findAnchorAtDocumentPosition,
  locateAnchorElement,
  scrollPositionForAnchor,
} from './anchors';

/** Build a container with paragraph blocks at known document positions. */
function makeContainer(
  blocks: Array<{ index: number; top: number; height: number; blockId?: string; text?: string }>,
  scrollTop = 0,
): HTMLElement {
  const container = document.createElement('div');
  for (const b of blocks) {
    const el = document.createElement('div');
    el.setAttribute('data-reader-anchor', anchorKey(1, b.index));
    el.setAttribute('data-paragraph-index', String(b.index));
    if (b.blockId) el.setAttribute('data-block-id', b.blockId);
    if (b.text) {
      el.textContent = b.text;
      el.setAttribute('data-content-signature', contentSignature(b.text));
    }
    // jsdom has no layout: stub client rects relative to the given scrollTop.
    el.getBoundingClientRect = () =>
      ({
        top: b.top - scrollTop,
        bottom: b.top - scrollTop + b.height,
        height: b.height,
        left: 0,
        right: 0,
        width: 0,
        x: 0,
        y: b.top - scrollTop,
        toJSON: () => ({}),
      }) as DOMRect;
    container.appendChild(el);
  }
  return container;
}

describe('anchors', () => {
  it('anchorKey is chapter:paragraph', () => {
    expect(anchorKey(3, 12)).toBe('3:12');
  });

  it('anchorAttributes exposes the normalized attribute set', () => {
    expect(anchorAttributes(2, 5, 'blk_9')).toEqual({
      'data-reader-anchor': '2:5',
      'data-paragraph-index': 5,
      'data-block-id': 'blk_9',
      'data-content-signature': undefined,
    });
    expect(anchorAttributes(2, 5)['data-block-id']).toBeUndefined();
  });

  it('contentSignature normalizes whitespace and case, capped at 24 chars', () => {
    expect(contentSignature('  The   QUICK\n\nbrown fox jumps over everything ')).toBe(
      'the quick brown fox jump',
    );
    expect(contentSignature('short')).toBe('short');
  });

  it('getAnchorElements returns blocks in document order with identities', () => {
    const container = makeContainer([
      { index: 0, top: 0, height: 100 },
      { index: 1, top: 100, height: 100, blockId: 'blk_1' },
    ]);
    const anchors = getAnchorElements(container);
    expect(anchors.map((a) => a.paragraphIndex)).toEqual([0, 1]);
    expect(anchors[1].blockId).toBe('blk_1');
  });

  describe('findAnchorAtDocumentPosition', () => {
    const blocks = [
      { index: 0, top: 0, height: 100 },
      { index: 1, top: 100, height: 200, blockId: 'blk_1' },
      { index: 2, top: 300, height: 100 },
    ];

    it('finds the block containing the focus line with intra-block ratio', () => {
      const container = makeContainer(blocks, 50);
      const found = findAnchorAtDocumentPosition(container, 150, 50);
      expect(found?.info.paragraphIndex).toBe(1);
      expect(found?.intraBlockRatio).toBeCloseTo(0.25); // 50px into a 200px block
    });

    it('falls back to the nearest block when the position is in a gap', () => {
      const container = makeContainer([
        { index: 0, top: 0, height: 100 },
        { index: 1, top: 500, height: 100 },
      ]);
      const nearTop = findAnchorAtDocumentPosition(container, 130, 0);
      expect(nearTop?.info.paragraphIndex).toBe(0);
      expect(nearTop?.intraBlockRatio).toBe(1);
      const nearBottom = findAnchorAtDocumentPosition(container, 480, 0);
      expect(nearBottom?.info.paragraphIndex).toBe(1);
      expect(nearBottom?.intraBlockRatio).toBe(0);
    });

    it('returns null for a container without anchors', () => {
      expect(findAnchorAtDocumentPosition(document.createElement('div'), 100, 0)).toBeNull();
    });
  });

  describe('locateAnchorElement', () => {
    it('prefers the stable block ID', () => {
      const container = makeContainer([
        { index: 0, top: 0, height: 100 },
        { index: 1, top: 100, height: 100, blockId: 'blk_1' },
      ]);
      const el = locateAnchorElement(container, { blockId: 'blk_1', paragraphIndex: 999 });
      expect(el?.getAttribute('data-paragraph-index')).toBe('1');
    });

    it('falls back to paragraph index when the block ID is missing', () => {
      const container = makeContainer([
        { index: 0, top: 0, height: 100 },
        { index: 1, top: 100, height: 100 },
      ]);
      const el = locateAnchorElement(container, { blockId: 'gone', paragraphIndex: 1 });
      expect(el?.getAttribute('data-paragraph-index')).toBe('1');
    });

    it('uses the content signature when paragraph indexes shifted', () => {
      const container = makeContainer([
        { index: 0, top: 0, height: 100, text: 'New introductory prose' },
        { index: 1, top: 100, height: 100, text: 'The saved paragraph' },
      ]);
      const el = locateAnchorElement(container, {
        paragraphIndex: 0,
        contentSignature: contentSignature('The saved paragraph'),
      });
      expect(el?.getAttribute('data-paragraph-index')).toBe('1');
    });

    it('refuses a stale index when its saved signature no longer exists', () => {
      const container = makeContainer([
        { index: 0, top: 0, height: 100, text: 'Completely different prose' },
      ]);
      expect(locateAnchorElement(container, {
        paragraphIndex: 0,
        contentSignature: contentSignature('Removed paragraph'),
      })).toBeNull();
    });
  });

  it('scrollPositionForAnchor places the stored intra-block point on the focus line', () => {
    const container = makeContainer([{ index: 0, top: 400, height: 200 }], 100);
    const el = container.firstElementChild as HTMLElement;
    // Block top in document = 400; point = 400 + 200*0.5 = 500; focus line 150
    expect(scrollPositionForAnchor(el, 0.5, 150, 100)).toBe(350);
    // Ratio is clamped
    expect(scrollPositionForAnchor(el, 5, 150, 100)).toBe(450);
  });
});
