import type {
  MediaAssetRecord,
  MediaAssociation,
  MediaCleanupTask,
  MediaOwner,
  StorageUsageRow,
} from '../../contracts/mediaAssets';
import { assertPermanentMediaMetadata } from './permanentMediaGuard';

export interface MediaAssetReservation extends Omit<MediaAssetRecord,
  'status' | 'createdAt' | 'updatedAt' | 'readyAt' | 'archivedAt' | 'deletedAt' | 'cleanupAfter' | 'etag' | 'failureCode' | 'failureMessage'> {
  status?: 'UPLOADING';
  sourceKind: string;
}

export interface MediaAssetRepository {
  assertAssociationOwned(ownerUid: string, association: MediaAssociation): Promise<void>;
  assertGenerationJobOwned(ownerUid: string, generationJobId: string, storyId?: string | null): Promise<void>;
  assertReplacementSlotOwned(ownerUid: string, assetId: string, association: MediaAssociation): Promise<void>;
  reserve(owner: MediaOwner, reservation: MediaAssetReservation): Promise<MediaAssetRecord>;
  getOwned(ownerUid: string, assetId: string): Promise<MediaAssetRecord | null>;
  commitReady(ownerUid: string, assetId: string, etag: string | undefined, association: MediaAssociation): Promise<MediaAssetRecord>;
  commitReplacement(ownerUid: string, assetId: string, previous: MediaAssetRecord, etag: string | undefined, association: MediaAssociation, cleanupAfter: string): Promise<MediaAssetRecord>;
  markFailed(ownerUid: string, assetId: string, code: string, message: string): Promise<void>;
  markPendingCleanup(ownerUid: string, assetId: string, bucket: string, objectKey: string, reason: string, message?: string): Promise<string>;
  requestDeletion(ownerUid: string, assetId: string, bucket: string, objectKey: string): Promise<string>;
  listStaleUploads(staleBefore: string, limit?: number): Promise<MediaAssetRecord[]>;
  listCleanupTasks(limit?: number): Promise<MediaCleanupTask[]>;
  completeCleanup(taskId: string, assetId: string): Promise<void>;
  failCleanup(taskId: string, message: string, nextAttemptAt: string): Promise<void>;
  listStorageUsage(limit?: number): Promise<StorageUsageRow[]>;
}

export function validateMediaReservation(reservation: MediaAssetReservation): void {
  assertPermanentMediaMetadata(reservation);
  if (!reservation.objectKey.startsWith('user-media/')) throw new Error('Media object key is outside the user-media namespace.');
  if (!/^\d+$/.test(reservation.byteSize) || BigInt(reservation.byteSize) < 1n) throw new Error('Media byte size must be a positive integer string.');
  if (!/^[a-f0-9]{64}$/.test(reservation.checksumSha256)) throw new Error('Media checksum must be a SHA-256 hex digest.');
  if (!reservation.mimeType || reservation.mimeType.startsWith('data:')) throw new Error('Media MIME type is invalid.');
}
