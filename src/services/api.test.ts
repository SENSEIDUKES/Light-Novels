import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { storyApi } from './api';
import * as helpers from '../hooks/storyEngineHelpers';

vi.mock('../hooks/storyEngineHelpers', () => ({
  getApiHeaders: vi.fn().mockResolvedValue({ 'Content-Type': 'application/json' })
}));

describe('api', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('generateBlueprint calls correct endpoint and returns data', async () => {
    const mockData = { some: 'blueprint' };
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => mockData
    } as any);

    const result = await storyApi.generateBlueprint({} as any, {});
    expect(global.fetch).toHaveBeenCalledWith('/api/generate-blueprint', expect.any(Object));
    expect(result).toEqual(mockData);
  });

  it('generateBlueprint throws on error', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' })
    } as any);

    await expect(storyApi.generateBlueprint({} as any, {})).rejects.toThrow('Server error');
  });

  it('generateInitialArc calls correct endpoint and returns data', async () => {
    const mockData = { initial: 'arc' };
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => mockData
    } as any);

    const result = await storyApi.generateInitialArc({} as any, {} as any, 5, {});
    expect(global.fetch).toHaveBeenCalledWith('/api/generate-initial-arc', expect.any(Object));
    expect(result).toEqual(mockData);
  });

  it('generateInitialArc throws on error', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Bad req' })
    } as any);

    await expect(storyApi.generateInitialArc({} as any, {} as any, 5, {})).rejects.toThrow('Bad req');
  });

  it('generateCardImage calls correct endpoint and returns data', async () => {
    const mockData = { imageUrl: 'http://test' };
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => mockData
    } as any);

    const result = await storyApi.generateCardImage('prompt', 'type', {});
    expect(global.fetch).toHaveBeenCalledWith('/api/generate-card-image', expect.any(Object));
    expect(result).toEqual(mockData);
  });

  it('checkConsistency returns warnings on success', async () => {
    const mockData = { warnings: ['warn 1'] };
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => mockData
    } as any);

    const result = await storyApi.checkConsistency('text', {} as any, {});
    expect(global.fetch).toHaveBeenCalledWith('/api/check-consistency', expect.any(Object));
    expect(result).toEqual(['warn 1']);
  });

  it('checkConsistency returns empty array on failure', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500
    } as any);

    const result = await storyApi.checkConsistency('text', {} as any, {});
    expect(result).toEqual([]);
  });
});
