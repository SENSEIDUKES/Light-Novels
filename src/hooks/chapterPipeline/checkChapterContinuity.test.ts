import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkChapterContinuity } from './checkChapterContinuity';

afterEach(() => vi.unstubAllGlobals());

describe('checkChapterContinuity', () => {
  it('sends only reader-facing prose and classifies against the full memory', async () => {
    const warning = 'Elder Zhao is marked deceased but speaks in the present scene.';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ warnings: [warning] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const raw = JSON.stringify({
      text: 'Elder Zhao entered the hall.',
      imageUrl: 'data:image/png;base64,AAAA',
      codexEntryId: 'char-1',
    });
    const memory = {
      characters: [{ name: 'Elder Zhao', status: 'deceased' }],
      factions: [],
    } as any;
    const slimMemory = {
      characters: [{ name: 'Elder Zhao', status: 'deceased' }],
      factions: [],
    } as any;

    const result = await checkChapterContinuity(
      raw,
      memory,
      slimMemory,
      { provider: 'test' },
      { Authorization: 'Bearer test' }
    );

    const request = fetchMock.mock.calls[0][1];
    const body = JSON.parse(request.body);
    expect(body).toEqual({
      chapterText: 'Elder Zhao entered the hall.',
      memory: slimMemory,
      routingConfig: { provider: 'test' },
    });
    expect(result).toEqual({
      classified: { severe: [warning], soft: [] },
      surfaceLeaks: [],
    });
  });

  it('keeps deterministic surface leaks repairable when the advisory check fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const result = await checkChapterContinuity(
      'Their slow burn was obvious.',
      { characters: [], factions: [] } as any,
      { characters: [], factions: [] } as any,
      {},
      {}
    );

    expect(result).toEqual({
      classified: { severe: [], soft: [] },
      surfaceLeaks: ['slow burn'],
    });
  });
});
