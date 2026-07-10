import { afterEach, describe, expect, it, vi } from 'vitest';
import { repairChapterStream } from './repairChapterStream';

afterEach(() => vi.unstubAllGlobals());

describe('repairChapterStream', () => {
  it('preserves the repair request contract and joins SSE chunks', async () => {
    const encoder = new TextEncoder();
    const reader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({
          value: encoder.encode('data: {"chunk":"first"}\n\ndata: {"ch'),
          done: false,
        })
        .mockResolvedValueOnce({
          value: encoder.encode('unk":"second"}\n\ndata: [DONE]\n\n'),
          done: false,
        })
        .mockResolvedValueOnce({ value: undefined, done: true }),
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: { getReader: () => reader },
    });
    vi.stubGlobal('fetch', fetchMock);

    const memory = { characters: [], factions: [] } as any;
    const warnings = ['warning'];
    const result = await repairChapterStream(
      'raw chapter',
      memory,
      warnings,
      { provider: 'test' },
      { Authorization: 'Bearer test' }
    );

    expect(fetchMock).toHaveBeenCalledWith('/api/repair-chapter-stream', {
      method: 'POST',
      headers: { Authorization: 'Bearer test' },
      body: JSON.stringify({
        chapterText: 'raw chapter',
        memory,
        warnings,
        routingConfig: { provider: 'test' },
      }),
    });
    expect(result).toBe('firstsecond');
  });

  it('returns no repaired chapter for a non-streaming response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, body: null }));

    await expect(repairChapterStream('raw', {} as any, [], {}, {})).resolves.toBe('');
  });
});
