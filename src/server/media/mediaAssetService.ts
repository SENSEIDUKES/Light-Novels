import type { MediaAssetRepository } from './mediaAssetRepository';
import { MediaAssetService as MediaAssetServiceBase } from './mediaAssetServiceBase';

export {
  MediaAssetServiceError,
  buildMediaStorageReport,
} from './mediaAssetServiceBase';
export type {
  MediaAssetServiceOptions,
  MediaStorageReport,
} from './mediaAssetServiceBase';

const MAX_STORY_TOMBSTONE_PURGE_CONCURRENCY = 8;

export class MediaAssetService extends MediaAssetServiceBase {
  override async runStoryTombstonePurge(
    retentionMs = 30 * 24 * 60 * 60 * 1000,
    limit = 100,
  ): Promise<{ attempted: number; completed: number; failed: number }> {
    if (!Number.isSafeInteger(retentionMs) || retentionMs < 24 * 60 * 60 * 1000) {
      throw new Error('Story tombstone retention must be at least one day.');
    }

    const internal = this as unknown as {
      repository: MediaAssetRepository;
      now: () => Date;
    };
    const completedBefore = new Date(internal.now().getTime() - retentionMs).toISOString();
    const jobs = await internal.repository.listExpiredStoryTombstones(completedBefore, limit);
    const workerCount = Math.min(MAX_STORY_TOMBSTONE_PURGE_CONCURRENCY, jobs.length);

    let nextIndex = 0;
    let completed = 0;
    let failed = 0;

    const worker = async () => {
      while (nextIndex < jobs.length) {
        const job = jobs[nextIndex++];
        try {
          await internal.repository.purgeExpiredStoryTombstone(
            job.id,
            job.storyId,
            completedBefore,
          );
          completed += 1;
        } catch {
          failed += 1;
        }
      }
    };

    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    return { attempted: jobs.length, completed, failed };
  }
}
