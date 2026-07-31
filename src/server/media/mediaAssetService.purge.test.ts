// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import type { MediaAssetRepository } from './mediaAssetRepository';
import type { MediaObjectStore } from './r2ObjectStore';
import { MediaAssetService } from './mediaAssetService';

describe('MediaAssetService story tombstone purge', () => {
  it('bounds concurrency and isolates individual purge failures', async () => {
    const jobs = Array.from({ length: 12 }, (_, index) => ({
      id: `job-${index}`,
      storyId: `story-${index}`,
    }));
    let active = 0;
    let maxActive = 0;

    const purgeExpiredStoryTombstone = vi.fn(async (jobId: string) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      if (jobId === 'job-4') throw new Error('database unavailable');
    });

    const repository = {
      listExpiredStoryTombstones: vi.fn().mockResolvedValue(jobs),
      purgeExpiredStoryTombstone,
    } as unknown as MediaAssetRepository;
    const service = new MediaAssetService(
      repository,
      {} as MediaObjectStore,
      { now: () => new Date('2026-07-31T12:00:00.000Z') },
    );

    const result = await service.runStoryTombstonePurge(undefined, 500);

    expect(result).toEqual({ attempted: 12, completed: 11, failed: 1 });
    expect(purgeExpiredStoryTombstone).toHaveBeenCalledTimes(12);
    expect(maxActive).toBeGreaterThan(1);
    expect(maxActive).toBeLessThanOrEqual(8);
  });
});
