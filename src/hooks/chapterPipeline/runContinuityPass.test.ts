import { afterEach, describe, expect, it, vi } from 'vitest';
import { runContinuityPass } from './runContinuityPass';

const makeSseResponse = (chunk: string) => {
  const reader = {
    read: vi
      .fn()
      .mockResolvedValueOnce({ value: new TextEncoder().encode(`data: ${JSON.stringify({ chunk })}\n\n`), done: false })
      .mockResolvedValueOnce({ value: undefined, done: true }),
  };
  return { ok: true, body: { getReader: () => reader } };
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('runContinuityPass surface hygiene', () => {
  it('silently repairs leaked prose without creating a reader-facing continuity fault', async () => {
    const original = JSON.stringify({ id: 'p1', type: 'paragraph', text: `Their slow burn was obvious. ${'A'.repeat(140)}` });
    const repaired = JSON.stringify({ id: 'p1', type: 'paragraph', text: `They withdrew their hands before either could speak. ${'B'.repeat(140)}` });
    const fetchMock = vi.fn((url: string) => {
      if (url === '/api/check-consistency') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ warnings: [] }) });
      }
      if (url === '/api/repair-chapter-stream') {
        return Promise.resolve(makeSseResponse(repaired));
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await runContinuityPass(
      original,
      { memory: { characters: [], factions: [] } } as any,
      {},
      { 'Content-Type': 'application/json' }
    );

    expect(fetchMock).toHaveBeenCalledWith('/api/repair-chapter-stream', expect.objectContaining({ method: 'POST' }));
    expect(result.finalRawBlocksStr).toBe(repaired);
    expect(result.hasContinuityFaults).toBe(false);
    expect(result.continuityWarnings).toEqual([]);
  });

  it('rechecks repaired prose and returns the same public result shape', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const original = JSON.stringify({ text: `Elder Zhao entered the hall. ${'A'.repeat(160)}` });
    const repaired = JSON.stringify({ text: `The empty hall remained silent. ${'B'.repeat(160)}` });
    const severeWarning = 'Elder Zhao is marked deceased but speaks in the present scene.';
    const progress = vi.fn();
    let checkCount = 0;

    const fetchMock = vi.fn((url: string) => {
      if (url === '/api/check-consistency') {
        checkCount += 1;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ warnings: checkCount === 1 ? [severeWarning] : [] }),
        });
      }
      if (url === '/api/repair-chapter-stream') {
        return Promise.resolve(makeSseResponse(repaired));
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await runContinuityPass(
      original,
      {
        memory: {
          characters: [{ name: 'Elder Zhao', status: 'deceased' }],
          factions: [],
        },
      } as any,
      { provider: 'test' },
      { 'Content-Type': 'application/json' },
      progress
    );

    expect(checkCount).toBe(2);
    expect(progress.mock.calls).toEqual([['checking'], ['repairing']]);
    expect(result).toEqual({
      hasContinuityFaults: false,
      continuityWarnings: [],
      continuitySoftNotes: [],
      finalRawBlocksStr: repaired,
    });
  });
});
