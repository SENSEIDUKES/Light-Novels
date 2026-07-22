// @vitest-environment node
import type { S3Client } from '@aws-sdk/client-s3';
import { describe, expect, it, vi } from 'vitest';
import { buildImmutableObjectKey, loadR2Config, R2ObjectStore } from './r2ObjectStore';

describe('R2 object storage boundaries', () => {
  it('builds immutable user-media keys without exposing the Firebase uid', () => {
    const key = buildImmutableObjectKey({
      ownerUid: 'private-user-uid',
      storyId: 'story-id',
      assetType: 'IMAGE',
      visibility: 'PRIVATE',
      assetId: 'asset-id',
      version: 2,
      checksumSha256: 'a'.repeat(64),
      extension: 'webp',
      now: new Date('2026-07-21T00:00:00.000Z'),
    });
    expect(key).toMatch(/^user-media\/private\/[a-f0-9]{24}\/story-id\/image\/2026\/07\/asset-id\/v2-a{16}\.webp$/);
    expect(key).not.toContain('private-user-uid');
    expect(key).not.toMatch(/^(DEFAULT|AUDIO)\//);
  });

  it('loads credentials only from server environment names', () => {
    const config = loadR2Config({
      R2_ENDPOINT_URL: 'https://account.r2.cloudflarestorage.com',
      R2_ACCESS_KEY_ID: 'access',
      R2_SECRET_ACCESS_KEY: 'secret',
      R2_PRIVATE_BUCKET_NAME: 'private-bucket',
      R2_PUBLIC_BUCKET_NAME: 'public-bucket',
      R2_PUBLIC_BASE_URL: 'https://media.example.com/',
      AWS_REGION: 'auto',
    });
    expect(config.publicBaseUrl).toBe('https://media.example.com');
    expect(config.privateBucket).toBe('private-bucket');
    expect(config.publicBucket).toBe('public-bucket');
    expect(config).not.toHaveProperty('VITE_R2_SECRET_ACCESS_KEY');
  });

  it('refuses operations on curated catalog prefixes', async () => {
    const send = vi.fn();
    const store = new R2ObjectStore({
      endpoint: 'https://account.r2.cloudflarestorage.com',
      accessKeyId: 'access',
      secretAccessKey: 'secret',
      privateBucket: 'private-bucket',
      publicBucket: 'public-bucket',
      region: 'auto',
    }, { send } as unknown as S3Client);

    await expect(store.head('private-bucket', 'AUDIO/story-track.mp3')).rejects.toThrow('isolated user-media namespace');
    await expect(store.delete('private-bucket', 'DEFAULT/world-card.wav')).rejects.toThrow('isolated user-media namespace');
    await expect(store.getDeliveryUrl('private-bucket', 'AUDIO/story-track.mp3', 'PRIVATE')).rejects.toThrow('isolated user-media namespace');
    expect(send).not.toHaveBeenCalled();
  });

  it('keeps private and public object namespaces bound to separate buckets', async () => {
    const send = vi.fn();
    const store = new R2ObjectStore({
      endpoint: 'https://account.r2.cloudflarestorage.com',
      accessKeyId: 'access',
      secretAccessKey: 'secret',
      privateBucket: 'private-bucket',
      publicBucket: 'public-bucket',
      region: 'auto',
      publicBaseUrl: 'https://media.example.com',
    }, { send } as unknown as S3Client);

    expect(store.bucketFor('PRIVATE')).toBe('private-bucket');
    expect(store.bucketFor('PUBLIC')).toBe('public-bucket');
    await expect(store.head('public-bucket', 'user-media/private/owner/asset.png')).rejects.toThrow('visibility');
    await expect(store.delete('private-bucket', 'user-media/public/owner/asset.png')).rejects.toThrow('visibility');
    await expect(store.getDeliveryUrl('private-bucket', 'user-media/public/owner/asset.png', 'PUBLIC')).rejects.toThrow('visibility');
    expect(send).not.toHaveBeenCalled();
  });

  it('rejects configurations that expose private objects through the public bucket', () => {
    expect(() => loadR2Config({
      R2_ENDPOINT_URL: 'https://account.r2.cloudflarestorage.com',
      R2_ACCESS_KEY_ID: 'access',
      R2_SECRET_ACCESS_KEY: 'secret',
      R2_PRIVATE_BUCKET_NAME: 'shared-bucket',
      R2_PUBLIC_BUCKET_NAME: 'shared-bucket',
      R2_PUBLIC_BASE_URL: 'https://media.example.com',
    })).toThrow('different R2 buckets');
  });
});
