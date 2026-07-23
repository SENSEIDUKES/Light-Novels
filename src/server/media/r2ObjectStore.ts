import { createHash, randomUUID } from 'node:crypto';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { MediaAssetType, MediaVisibility } from '../../contracts/mediaAssets';

export const USER_MEDIA_PREFIX = 'user-media';
export const CLEANUP_MARKER_PREFIX = `${USER_MEDIA_PREFIX}/_cleanup`;
export const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';
export const PRIVATE_CACHE_CONTROL = 'private, max-age=0, no-store';

export interface R2Config {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  privateBucket: string;
  publicBucket?: string;
  region: string;
  publicBaseUrl?: string;
}

export interface PutMediaObjectInput {
  bucket: string;
  objectKey: string;
  bytes: Uint8Array;
  mimeType: string;
  cacheControl: string;
  checksumSha256: string;
  originalFilename?: string;
}

export interface StoredObjectMetadata {
  byteSize: number;
  etag?: string;
  checksumSha256?: string;
  mimeType?: string;
}

export interface CleanupMarker {
  assetId: string;
  ownerUid: string;
  bucket: string;
  objectKey: string;
  reason: string;
  createdAt: string;
  error?: string;
}

export interface MediaObjectStore {
  bucketFor(visibility: MediaVisibility): string;
  assertDeliveryConfigured(visibility: MediaVisibility): void;
  put(input: PutMediaObjectInput): Promise<{ etag?: string }>;
  head(bucket: string, objectKey: string): Promise<StoredObjectMetadata | null>;
  delete(bucket: string, objectKey: string): Promise<void>;
  getDeliveryUrl(bucket: string, objectKey: string, visibility: MediaVisibility, expiresInSeconds?: number): Promise<string>;
  writeCleanupMarker(marker: CleanupMarker): Promise<string>;
  listCleanupMarkerKeys(limit?: number): Promise<string[]>;
  readCleanupMarker(markerKey: string): Promise<CleanupMarker>;
  deleteCleanupMarker(markerKey: string): Promise<void>;
}

function requireServerSecret(env: NodeJS.ProcessEnv, name: string): string {
  if (name.startsWith('VITE_')) throw new Error('R2 credentials must never use browser-exposed VITE_ variables.');
  const value = env[name]?.trim();
  if (!value) throw new Error(`Missing required server environment variable ${name}.`);
  return value;
}

export function loadR2Config(env: NodeJS.ProcessEnv = process.env): R2Config {
  const endpoint = requireServerSecret(env, 'R2_ENDPOINT_URL').replace(/\/+$/, '');
  const endpointUrl = new URL(endpoint);
  if (endpointUrl.protocol !== 'https:' || endpointUrl.username || endpointUrl.password) {
    throw new Error('R2_ENDPOINT_URL must be an HTTPS URL without embedded credentials.');
  }
  const publicBaseUrl = env.R2_PUBLIC_BASE_URL?.trim().replace(/\/+$/, '') || undefined;
  if (publicBaseUrl) {
    const publicUrl = new URL(publicBaseUrl);
    if (publicUrl.protocol !== 'https:' || publicUrl.username || publicUrl.password) {
      throw new Error('R2_PUBLIC_BASE_URL must be an HTTPS URL without embedded credentials.');
    }
  }
  const privateBucket = requireServerSecret(env, 'R2_PRIVATE_BUCKET_NAME');
  const publicBucket = env.R2_PUBLIC_BUCKET_NAME?.trim() || env.R2_BUCKET_NAME?.trim() || undefined;
  if (publicBaseUrl && !publicBucket) {
    throw new Error('R2_PUBLIC_BUCKET_NAME is required when R2_PUBLIC_BASE_URL is configured.');
  }
  if (publicBaseUrl && publicBucket === privateBucket) {
    throw new Error('Private and public media must use different R2 buckets.');
  }
  return {
    endpoint,
    accessKeyId: requireServerSecret(env, 'R2_ACCESS_KEY_ID'),
    secretAccessKey: requireServerSecret(env, 'R2_SECRET_ACCESS_KEY'),
    privateBucket,
    publicBucket,
    region: env.AWS_REGION?.trim() || 'auto',
    publicBaseUrl,
  };
}

export function createR2Client(config: R2Config): S3Client {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

function cleanEtag(value: string | undefined): string | undefined {
  return value?.replace(/^"|"$/g, '') || undefined;
}

function encodeObjectKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

/**
 * Rejects catalog, system, and cleanup-marker keys before a destructive media
 * operation reaches R2. User-generated objects live in visibility-isolated
 * prefixes; curated catalog objects intentionally do not.
 */
export function assertIsolatedUserMediaObjectKey(objectKey: string): void {
  if (
    !objectKey.startsWith(`${USER_MEDIA_PREFIX}/private/`)
    && !objectKey.startsWith(`${USER_MEDIA_PREFIX}/public/`)
  ) {
    throw new Error('Media operations are restricted to the isolated user-media namespace.');
  }
}

function assertCleanupMarkerKey(markerKey: string): void {
  if (!markerKey.startsWith(`${CLEANUP_MARKER_PREFIX}/`) || !markerKey.endsWith('.json')) {
    throw new Error('Cleanup marker operations are restricted to the cleanup namespace.');
  }
}

function parseCleanupMarker(value: string, allowedBuckets: ReadonlySet<string>): CleanupMarker {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error('R2 cleanup marker is not valid JSON.', { cause: error });
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('R2 cleanup marker is invalid.');
  const marker = parsed as Record<string, unknown>;
  for (const field of ['assetId', 'ownerUid', 'bucket', 'objectKey', 'reason', 'createdAt'] as const) {
    if (typeof marker[field] !== 'string' || !marker[field]) throw new Error(`R2 cleanup marker field ${field} is invalid.`);
  }
  if (!allowedBuckets.has(marker.bucket as string)) throw new Error('R2 cleanup marker targets an unconfigured bucket.');
  assertIsolatedUserMediaObjectKey(marker.objectKey as string);
  return marker as unknown as CleanupMarker;
}

export function buildImmutableObjectKey(input: {
  ownerUid: string;
  storyId?: string | null;
  assetType: MediaAssetType;
  visibility: MediaVisibility;
  assetId: string;
  version: number;
  checksumSha256: string;
  extension: string;
  now?: Date;
}): string {
  const ownerNamespace = createHash('sha256').update(input.ownerUid).digest('hex').slice(0, 24);
  const storyNamespace = input.storyId?.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64) || '_account';
  const date = input.now ?? new Date();
  const year = date.getUTCFullYear().toString();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const extension = input.extension.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!extension) throw new Error('Media object extension is invalid.');
  return [
    USER_MEDIA_PREFIX,
    input.visibility.toLowerCase(),
    ownerNamespace,
    storyNamespace,
    input.assetType.toLowerCase(),
    year,
    month,
    input.assetId,
    `v${input.version}-${input.checksumSha256.slice(0, 16)}.${extension}`,
  ].join('/');
}

export class R2ObjectStore implements MediaObjectStore {
  constructor(
    private readonly config: R2Config = loadR2Config(),
    private readonly client: S3Client = createR2Client(config),
  ) {}

  assertDeliveryConfigured(visibility: MediaVisibility): void {
    if (visibility === 'PUBLIC' && (!this.config.publicBaseUrl || !this.config.publicBucket)) {
      throw new Error('Public media delivery requires a separate R2_PUBLIC_BUCKET_NAME and R2_PUBLIC_BASE_URL.');
    }
  }

  bucketFor(visibility: MediaVisibility): string {
    this.assertDeliveryConfigured(visibility);
    return visibility === 'PUBLIC' ? this.config.publicBucket! : this.config.privateBucket;
  }

  private get configuredBuckets(): ReadonlySet<string> {
    return new Set([this.config.privateBucket, ...(this.config.publicBucket ? [this.config.publicBucket] : [])]);
  }

  private assertConfiguredBucket(bucket: string): void {
    if (!this.configuredBuckets.has(bucket)) throw new Error('Media operation targets an unconfigured R2 bucket.');
  }

  private assertObjectBucket(bucket: string, objectKey: string): void {
    this.assertConfiguredBucket(bucket);
    const expectedVisibility = bucket === this.config.privateBucket ? 'private' : 'public';
    if (!objectKey.startsWith(`${USER_MEDIA_PREFIX}/${expectedVisibility}/`)) {
      throw new Error('Media object visibility does not match its configured R2 bucket.');
    }
  }

  async put(input: PutMediaObjectInput): Promise<{ etag?: string }> {
    assertIsolatedUserMediaObjectKey(input.objectKey);
    this.assertObjectBucket(input.bucket, input.objectKey);
    const result = await this.client.send(new PutObjectCommand({
      Bucket: input.bucket,
      Key: input.objectKey,
      Body: input.bytes,
      ContentLength: input.bytes.byteLength,
      ContentType: input.mimeType,
      CacheControl: input.cacheControl,
      Metadata: {
        'sha256': input.checksumSha256,
        ...(input.originalFilename ? { 'original-filename': encodeURIComponent(input.originalFilename) } : {}),
      },
    }));
    return { etag: cleanEtag(result.ETag) };
  }

  async head(bucket: string, objectKey: string): Promise<StoredObjectMetadata | null> {
    assertIsolatedUserMediaObjectKey(objectKey);
    this.assertObjectBucket(bucket, objectKey);
    try {
      const result = await this.client.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }));
      return {
        byteSize: result.ContentLength ?? 0,
        etag: cleanEtag(result.ETag),
        checksumSha256: result.Metadata?.sha256,
        mimeType: result.ContentType,
      };
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number }; name?: string }).$metadata?.httpStatusCode;
      const name = (error as { name?: string }).name;
      if (status === 404 || name === 'NotFound' || name === 'NoSuchKey') return null;
      throw error;
    }
  }

  async delete(bucket: string, objectKey: string): Promise<void> {
    assertIsolatedUserMediaObjectKey(objectKey);
    this.assertObjectBucket(bucket, objectKey);
    await this.client.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
  }

  async getDeliveryUrl(bucket: string, objectKey: string, visibility: MediaVisibility, expiresInSeconds = 900): Promise<string> {
    assertIsolatedUserMediaObjectKey(objectKey);
    const expectedBucket = this.bucketFor(visibility);
    if (bucket !== expectedBucket) throw new Error('Media visibility does not match its configured R2 bucket.');
    this.assertObjectBucket(bucket, objectKey);
    if (visibility === 'PUBLIC') {
      return `${this.config.publicBaseUrl!}/${encodeObjectKey(objectKey)}`;
    }
    const boundedExpiry = Math.max(60, Math.min(expiresInSeconds, 3600));
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: bucket, Key: objectKey }),
      { expiresIn: boundedExpiry },
    );
  }

  async writeCleanupMarker(marker: CleanupMarker): Promise<string> {
    assertIsolatedUserMediaObjectKey(marker.objectKey);
    this.assertObjectBucket(marker.bucket, marker.objectKey);
    const key = `${CLEANUP_MARKER_PREFIX}/${marker.assetId}/${Date.now()}-${randomUUID()}.json`;
    await this.client.send(new PutObjectCommand({
      Bucket: this.config.privateBucket,
      Key: key,
      Body: Buffer.from(JSON.stringify(marker)),
      ContentType: 'application/json',
      CacheControl: PRIVATE_CACHE_CONTROL,
    }));
    return key;
  }

  async listCleanupMarkerKeys(limit = 100): Promise<string[]> {
    const result = await this.client.send(new ListObjectsV2Command({
      Bucket: this.config.privateBucket,
      Prefix: `${CLEANUP_MARKER_PREFIX}/`,
      MaxKeys: Math.max(1, Math.min(limit, 1000)),
    }));
    return (result.Contents ?? []).flatMap((entry) => entry.Key ? [entry.Key] : []);
  }

  async readCleanupMarker(markerKey: string): Promise<CleanupMarker> {
    assertCleanupMarkerKey(markerKey);
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.config.privateBucket, Key: markerKey }));
    if (!result.Body) throw new Error('R2 cleanup marker body is missing.');
    const marker = parseCleanupMarker(await result.Body.transformToString(), this.configuredBuckets);
    this.assertObjectBucket(marker.bucket, marker.objectKey);
    return marker;
  }

  async deleteCleanupMarker(markerKey: string): Promise<void> {
    assertCleanupMarkerKey(markerKey);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.privateBucket, Key: markerKey }));
  }
}
