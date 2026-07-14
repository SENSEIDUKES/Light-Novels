import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../aiRouter', () => ({
  routeImageGeneration: vi.fn(),
  routeTextGeneration: vi.fn(),
  routeTextGenerationStream: vi.fn(),
  ROUTER_PRESETS: {},
}));

import { routeImageGeneration } from '../../aiRouter';
import { generateCultivatorPortrait } from './mediaRouter';
import { generateCultivatorPortraitSchema } from '../schemas';

describe('cultivator portrait route', () => {
  const originalGeminiKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = '';
    vi.mocked(routeImageGeneration).mockResolvedValue({
      imageUrls: ['data:image/jpeg;base64,portrait'],
    });
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalGeminiKey;
    vi.clearAllMocks();
  });

  it('accepts description-only portrait generation and forwards it to the image provider', async () => {
    expect(generateCultivatorPortraitSchema.safeParse({
      description: 'A scholar beneath a starry sky',
      routingConfig: {},
    }).success).toBe(true);

    const json = vi.fn();
    const req = {
      body: {
        description: 'A scholar beneath a starry sky',
        daoRank: 'Dao Adept',
        powerStage: 'Core Formation',
        routingConfig: {},
      },
      header: vi.fn(),
    } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json,
    } as any;

    await generateCultivatorPortrait(req, res);

    expect(routeImageGeneration).toHaveBeenCalledWith(
      expect.stringContaining('A scholar beneath a starry sky'),
      'portrait',
      {},
      expect.any(Object),
    );
    const generatedPrompt = vi.mocked(routeImageGeneration).mock.calls[0][0];
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      imageUrl: 'data:image/jpeg;base64,portrait',
      promptUsed: generatedPrompt,
      note: 'Source and reference images are not retained by this endpoint. An accepted generated portrait may be saved to your signed-in account by the client.',
    }));
  });
});
