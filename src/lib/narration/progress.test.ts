import { describe, it, expect } from 'vitest';
import { makeNarrationProgress, estimateSpokenDurationMs } from './progress';

describe('makeNarrationProgress', () => {
  const base = {
    chapterNumber: 2,
    blockIndex: 4,
    nextBlockIndex: 5,
    chunkIndex: 1,
    chunkCount: 3,
    estimatedDurationMs: 4000,
  };

  it('produces canonical block keys', () => {
    const p = makeNarrationProgress({ ...base, elapsedMs: 0 });
    expect(p.blockKey).toBe('2:4');
    expect(p.nextBlockKey).toBe('2:5');
  });

  it('omits nextBlockKey for the final block', () => {
    const p = makeNarrationProgress({ ...base, nextBlockIndex: undefined, elapsedMs: 0 });
    expect(p.nextBlockKey).toBeUndefined();
  });

  it('computes clamped progress from the estimate', () => {
    expect(makeNarrationProgress({ ...base, elapsedMs: 2000 }).progress).toBe(0.5);
    expect(makeNarrationProgress({ ...base, elapsedMs: -50 }).progress).toBe(0);
    expect(makeNarrationProgress({ ...base, elapsedMs: 99_999 }).progress).toBe(1);
  });

  it('prefers actual media duration over the estimate', () => {
    const p = makeNarrationProgress({ ...base, elapsedMs: 4000, actualDurationMs: 8000 });
    expect(p.progress).toBe(0.5);
  });

  it('treats a zero-duration chunk as complete', () => {
    const p = makeNarrationProgress({ ...base, estimatedDurationMs: 0, elapsedMs: 0 });
    expect(p.progress).toBe(1);
  });

  it('progress is monotonic in elapsed time', () => {
    let last = -1;
    for (let elapsed = 0; elapsed <= 5000; elapsed += 250) {
      const p = makeNarrationProgress({ ...base, elapsedMs: elapsed }).progress;
      expect(p).toBeGreaterThanOrEqual(last);
      last = p;
    }
  });
});

describe('estimateSpokenDurationMs', () => {
  it('scales inversely with speech rate', () => {
    const text = 'one two three four five six seven eight nine ten';
    const at1 = estimateSpokenDurationMs(text, 1);
    const at2 = estimateSpokenDurationMs(text, 2);
    expect(at1).toBeGreaterThan(0);
    expect(at2).toBeCloseTo(at1 / 2);
  });

  it('guards against a non-positive rate', () => {
    const text = 'hello world';
    expect(estimateSpokenDurationMs(text, 0)).toBe(estimateSpokenDurationMs(text, 1));
  });

  it('returns 0 for empty text', () => {
    expect(estimateSpokenDurationMs('', 1)).toBe(0);
  });

  it('estimates non-space-delimited CJK text by grapheme duration', () => {
    expect(estimateSpokenDurationMs('天地玄黃宇宙洪荒', 1)).toBeGreaterThan(1000);
  });
});
