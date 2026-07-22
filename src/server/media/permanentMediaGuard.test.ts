// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { assertPermanentMediaMetadata, PermanentMediaPayloadError } from './permanentMediaGuard';

describe('assertPermanentMediaMetadata', () => {
  it('accepts compact R2 metadata', () => {
    expect(() => assertPermanentMediaMetadata({
      id: 'asset-id',
      objectKey: 'user-media/abc/image/asset.webp',
      mimeType: 'image/webp',
      checksumSha256: 'a'.repeat(64),
      byteSize: '1234',
    })).not.toThrow();
  });

  it.each([
    ['data URL', { image: 'data:image/png;base64,AAEC' }],
    ['blob URL', { image: 'blob:https://example.com/id' }],
    ['buffer', { body: Buffer.from([1, 2, 3]) }],
    ['typed array', { body: new Uint8Array([1, 2, 3]) }],
    ['blob', { body: new Blob(['hello']) }],
    ['short raw media base64', { body: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' }],
    ['short unpadded raw media base64', { body: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII' }],
    ['raw base64', { body: Buffer.alloc(2048, 7).toString('base64') }],
  ])('rejects a permanent %s body', (_label, value) => {
    expect(() => assertPermanentMediaMetadata(value)).toThrow(PermanentMediaPayloadError);
  });
});
