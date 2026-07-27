/**
 * Regression guard for the journey harness's media path.
 *
 * The harness fulfils jsdom's `fetch` with Node's, so a downloaded body arrives
 * as a `Blob` from a different realm than the `Blob` application code sees.
 * `IndexedDbFoundationCache.putMedia` rejects a foreign blob outright, and the
 * in-memory IndexedDB used to copy rows with `structuredClone`, which does not
 * necessarily understand a jsdom `Blob` either. Both broke every media journey
 * on CI (Node 20) while passing on a newer local Node.
 *
 * These tests pin the two properties the harness now guarantees, without
 * depending on which Node version happens to be running.
 */
import { Blob as NodeBlob } from 'node:buffer';
import { describe, expect, it } from 'vitest';
import { IndexedDbFoundationCache } from '../../lib/foundation/cache/indexedDbFoundationCache';
import { MemoryIndexedDbFactory } from './memoryIndexedDb';

const CHECKSUM = 'a'.repeat(64);

function makeCache(indexedDB: MemoryIndexedDbFactory) {
  return new IndexedDbFoundationCache({
    indexedDB: indexedDB as unknown as IDBFactory,
    databaseName: 'media-realm-test',
    ownerUid: 'owner',
    autoPrune: false,
    storageEstimate: async () => ({}),
  });
}

/** The exact normalization the harness fetch bridge applies to every body. */
async function toRealmBlob(body: { arrayBuffer(): Promise<ArrayBuffer>; type: string }) {
  return new Blob([await body.arrayBuffer()], { type: body.type });
}

describe('journey harness media realm handling', () => {
  it('normalizes a foreign Blob into one the foundation cache accepts', async () => {
    const foreign = new NodeBlob([Buffer.from('cover-bytes')], { type: 'image/png' });
    const normalized = await toRealmBlob(foreign);

    expect(normalized).toBeInstanceOf(Blob);
    expect(await normalized.text()).toBe('cover-bytes');

    const stored = await makeCache(new MemoryIndexedDbFactory()).putMedia({
      assetId: 'asset-1',
      assetVersion: '1',
      checksum: CHECKSUM,
      mimeType: 'image/png',
      blob: normalized,
    });
    expect(stored.byteSize).toBe(normalized.size);
  });

  it('round-trips a cached blob through the in-memory IndexedDB', async () => {
    const cache = makeCache(new MemoryIndexedDbFactory());
    await cache.putMedia({
      assetId: 'asset-1',
      assetVersion: '1',
      checksum: CHECKSUM,
      mimeType: 'image/png',
      blob: new Blob(['cover-bytes'], { type: 'image/png' }),
    });

    const read = await cache.getMedia('asset-1', { assetVersion: '1', checksum: CHECKSUM });
    expect(read).not.toBeNull();
    expect(read!.blob).toBeInstanceOf(Blob);
    expect(await read!.blob.text()).toBe('cover-bytes');
  });
});
