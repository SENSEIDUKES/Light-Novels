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

afterEach(() => vi.unstubAllGlobals());

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
});
