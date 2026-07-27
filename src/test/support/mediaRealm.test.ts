/**
 * Regression guard for the journey harness's media path.
 *
 * The harness fulfils jsdom's `fetch` with Node's, which splits one browser
 * realm into two. Two separate consumers reject a foreign object, and both
 * broke every media journey on CI (Node 20) while passing on a newer local
 * Node:
 *
 *  - `IndexedDbFoundationCache.putMedia` checks `instanceof Blob` against the
 *    global jsdom class and rejects undici's `Blob`.
 *  - `verifyChecksum` in `privateMediaResolver` passes
 *    `await blob.arrayBuffer()` to `crypto.subtle.digest`, and Node's WebCrypto
 *    rejects an `ArrayBuffer` it did not create.
 *
 * These tests pin both properties of `toRealmBlob` directly, so a regression
 * shows up here rather than as three confusing journey failures.
 */
import { Blob as NodeBlob } from 'node:buffer';
import { describe, expect, it } from 'vitest';
import { IndexedDbFoundationCache } from '../../lib/foundation/cache/indexedDbFoundationCache';
import { toRealmBlob } from './celestialHarness';
import { MemoryIndexedDbFactory } from './memoryIndexedDb';

const CHECKSUM = 'a'.repeat(64);

function makeCache() {
  return new IndexedDbFoundationCache({
    indexedDB: new MemoryIndexedDbFactory() as unknown as IDBFactory,
    databaseName: 'media-realm-test',
    ownerUid: 'owner',
    autoPrune: false,
    storageEstimate: async () => ({}),
  });
}

/** A body shaped like what undici hands back — deliberately not the global Blob. */
function foreignBody(contents: string) {
  return new NodeBlob([Buffer.from(contents)], { type: 'image/png' });
}

describe('journey harness media realm handling', () => {
  it('produces a Blob the foundation cache accepts', async () => {
    const normalized = await toRealmBlob(foreignBody('cover-bytes'));

    expect(normalized).toBeInstanceOf(Blob);
    expect(normalized.type).toBe('image/png');
    expect(await normalized.text()).toBe('cover-bytes');

    const stored = await makeCache().putMedia({
      assetId: 'asset-1',
      assetVersion: '1',
      checksum: CHECKSUM,
      mimeType: 'image/png',
      blob: normalized,
    });
    expect(stored.byteSize).toBe(normalized.size);
  });

  it('produces bytes WebCrypto will digest, as checksum verification requires', async () => {
    const normalized = await toRealmBlob(foreignBody('cover-bytes'));

    // The exact call `verifyChecksum` makes.
    const digest = await globalThis.crypto.subtle.digest(
      'SHA-256',
      await normalized.arrayBuffer(),
    );
    const actual = Array.from(new Uint8Array(digest), (value) =>
      value.toString(16).padStart(2, '0')).join('');

    expect(actual).toMatch(/^[0-9a-f]{64}$/);
  });

  it('round-trips a cached blob through the in-memory IndexedDB', async () => {
    const cache = makeCache();
    await cache.putMedia({
      assetId: 'asset-1',
      assetVersion: '1',
      checksum: CHECKSUM,
      mimeType: 'image/png',
      blob: await toRealmBlob(foreignBody('cover-bytes')),
    });

    const read = await cache.getMedia('asset-1', { assetVersion: '1', checksum: CHECKSUM });
    expect(read).not.toBeNull();
    expect(read!.blob).toBeInstanceOf(Blob);
    expect(await read!.blob.text()).toBe('cover-bytes');
  });
});
