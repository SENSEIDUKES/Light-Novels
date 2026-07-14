import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateCultivatorPortrait } from './cultivatorPortrait';

describe('generateCultivatorPortrait', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('fires a description-only request and returns the generated image URL with its prompt', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        imageUrl: 'data:image/jpeg;base64,portrait',
        promptUsed: 'A celestial scholar beneath a starry sky',
      }),
    } as Response);

    await expect(generateCultivatorPortrait({
      description: 'A silver-haired scholar in azure robes',
      daoRank: 'Dao Adept',
      equippedArtifact: {
        id: 'artifact-1',
        name: 'Moon Mirror',
        description: 'A mirror that reflects starlight',
        rarity: 'Mythic',
      },
      routingConfig: {},
    }, { 'x-gemini-key': 'key' })).resolves.toEqual({
      imageUrl: 'data:image/jpeg;base64,portrait',
      promptUsed: 'A celestial scholar beneath a starry sky',
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/generate-cultivator-portrait', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    }));
    expect(JSON.parse(vi.mocked(global.fetch).mock.calls[0][1]!.body as string)).toMatchObject({
      description: 'A silver-haired scholar in azure robes',
      equippedArtifact: { id: 'artifact-1', rarity: 'Mythic' },
    });
  });

  it('uses an empty prompt when a successful legacy response omits promptUsed', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ imageUrl: 'data:image/jpeg;base64,portrait' }),
    } as Response);

    await expect(generateCultivatorPortrait({}, {})).resolves.toEqual({
      imageUrl: 'data:image/jpeg;base64,portrait',
      promptUsed: '',
    });
  });

  it('rejects a successful but unusable response before the UI tries to render it', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);

    await expect(generateCultivatorPortrait({}, {})).rejects.toThrow('No image URL returned');
  });
});
