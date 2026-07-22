/**
 * Browser cache contracts for the SQL/R2 foundation.
 *
 * These entries are disposable replicas. PostgreSQL and R2 remain the source
 * of truth; callers must never infer that a successful cache write committed a
 * server mutation.
 */

export type CacheRecordNamespace = string;

export interface CacheIdentity {
  ownerUid: string;
}

export interface CacheLifetime {
  cachedAt: number;
  expiresAt: number;
  lastAccessedAt: number;
  byteSize: number;
}

export interface FoundationCacheRecord<T = unknown>
  extends CacheIdentity,
    CacheLifetime {
  storageKey: string;
  namespace: CacheRecordNamespace;
  recordId: string;
  value: T;
  serverVersion?: string;
  checksum?: string;
}

export interface PutCacheRecord<T = unknown> {
  namespace: CacheRecordNamespace;
  recordId: string;
  value: T;
  serverVersion?: string;
  checksum?: string;
  ttlMs?: number;
}

export interface FoundationCachedMedia extends CacheIdentity, CacheLifetime {
  storageKey: string;
  assetId: string;
  assetVersion: string;
  checksum: string;
  mimeType: string;
  blob: Blob;
}

export interface PutCachedMedia {
  assetId: string;
  assetVersion: string;
  checksum: string;
  mimeType: string;
  blob: Blob;
  ttlMs?: number;
}

export interface ExpectedMediaIdentity {
  assetVersion: string;
  checksum: string;
}

export type FoundationOutboxState = "PENDING" | "IN_FLIGHT" | "FAILED";

export interface FoundationOutboxItem<T = unknown> extends CacheIdentity {
  storageKey: string;
  id: string;
  operation: string;
  payload: T;
  idempotencyKey: string;
  state: FoundationOutboxState;
  attempts: number;
  createdAt: number;
  updatedAt: number;
  lastAccessedAt: number;
  nextAttemptAt: number;
  leaseExpiresAt?: number;
  lastError?: string;
}

export interface EnqueueFoundationOutboxItem<T = unknown> {
  id?: string;
  operation: string;
  payload: T;
  idempotencyKey: string;
  nextAttemptAt?: number;
}

export interface FoundationRecoveryCheckpoint<T = unknown>
  extends CacheIdentity {
  storageKey: string;
  recoveryKey: string;
  state: T;
  createdAt: number;
  updatedAt: number;
  lastAccessedAt: number;
  expiresAt?: number;
}

export interface PutFoundationRecoveryCheckpoint<T = unknown> {
  recoveryKey: string;
  state: T;
  ttlMs?: number;
}

export interface FoundationRecoveryBundle {
  outbox: FoundationOutboxItem[];
  checkpoints: FoundationRecoveryCheckpoint[];
}

export interface FoundationCachePruneReport {
  expiredEntries: number;
  evictedEntries: number;
  reclaimedBytes: number;
  remainingEntries: number;
  remainingBytes: number;
  effectiveByteLimit: number;
}

export interface FoundationCache {
  /** A compile-time and runtime warning that this store is never authoritative. */
  readonly authoritative: false;
  readonly sourceOfTruth: "remote";
  readonly ownerUid: string;

  putRecord<T>(input: PutCacheRecord<T>): Promise<FoundationCacheRecord<T>>;
  getRecord<T>(
    namespace: CacheRecordNamespace,
    recordId: string,
  ): Promise<FoundationCacheRecord<T> | null>;
  deleteRecord(namespace: CacheRecordNamespace, recordId: string): Promise<void>;

  putMedia(input: PutCachedMedia): Promise<FoundationCachedMedia>;
  getMedia(
    assetId: string,
    expected: ExpectedMediaIdentity,
  ): Promise<FoundationCachedMedia | null>;
  invalidateMedia(
    assetId: string,
    expected: ExpectedMediaIdentity,
  ): Promise<boolean>;
  deleteMedia(assetId: string): Promise<void>;

  enqueueOutbox<T>(
    input: EnqueueFoundationOutboxItem<T>,
  ): Promise<FoundationOutboxItem<T>>;
  listRecoverableOutbox(limit?: number): Promise<FoundationOutboxItem[]>;
  claimOutbox(id: string, leaseMs: number): Promise<FoundationOutboxItem | null>;
  failOutbox(id: string, error: string, nextAttemptAt: number): Promise<void>;
  completeOutbox(id: string): Promise<void>;

  putRecoveryCheckpoint<T>(
    input: PutFoundationRecoveryCheckpoint<T>,
  ): Promise<FoundationRecoveryCheckpoint<T>>;
  getRecoveryCheckpoint<T>(
    recoveryKey: string,
  ): Promise<FoundationRecoveryCheckpoint<T> | null>;
  deleteRecoveryCheckpoint(recoveryKey: string): Promise<void>;
  listRecoveryCheckpoints(): Promise<FoundationRecoveryCheckpoint[]>;
  getRecoveryBundle(outboxLimit?: number): Promise<FoundationRecoveryBundle>;

  prune(): Promise<FoundationCachePruneReport>;
  clearOwner(): Promise<void>;
  close(): void;
}
