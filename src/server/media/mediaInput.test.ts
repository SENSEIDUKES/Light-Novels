// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createPinnedLookup, hostMatchesAllowlist, MediaInputError, normalizeMediaInput, readImageDimensions, sniffMediaMimeType } from './mediaInput';

const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');

describe('media input normalization', () => {
  it('accepts uploaded bytes and records checksum and dimensions', async () => {
    const result = await normalizeMediaInput({ kind: 'bytes', bytes: PNG_1X1, mimeType: 'image/png', filename: '../cover.png' }, 'IMAGE');
    expect(result.mimeType).toBe('image/png');
    expect(result.extension).toBe('png');
    expect(result.byteSize).toBe(PNG_1X1.length);
    expect(result.checksumSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
    expect(result.originalFilename).toBe('cover.png');
  });

  it('accepts Blob and data URL sources', async () => {
    const blob = await normalizeMediaInput({ kind: 'blob', blob: new Blob([PNG_1X1], { type: 'image/png' }) }, 'IMAGE');
    const dataUrl = await normalizeMediaInput({ kind: 'data-url', dataUrl: `data:image/png;base64,${PNG_1X1.toString('base64')}` }, 'IMAGE');
    expect(blob.checksumSha256).toBe(dataUrl.checksumSha256);
  });

  it('rejects MIME spoofing, malformed base64, and oversize input', async () => {
    await expect(normalizeMediaInput({ kind: 'bytes', bytes: PNG_1X1, mimeType: 'image/jpeg' }, 'IMAGE')).rejects.toMatchObject({ code: 'mime_mismatch' });
    await expect(normalizeMediaInput({ kind: 'data-url', dataUrl: 'data:image/png;base64,%%%%' }, 'IMAGE')).rejects.toBeInstanceOf(MediaInputError);
    await expect(normalizeMediaInput({ kind: 'bytes', bytes: PNG_1X1, mimeType: 'image/png' }, 'IMAGE', { maxBytesByType: { IMAGE: 10 } })).rejects.toMatchObject({ code: 'media_too_large' });
  });

  it('rejects unconfigured and private remote hosts before fetching', async () => {
    const fetchImpl = vi.fn();
    await expect(normalizeMediaInput({ kind: 'remote-url', url: 'https://provider.example/image.png' }, 'IMAGE', { fetchImpl })).rejects.toMatchObject({ code: 'remote_host_not_allowed' });
    await expect(normalizeMediaInput({ kind: 'remote-url', url: 'https://provider.example/image.png' }, 'IMAGE', {
      fetchImpl,
      allowedRemoteHosts: ['provider.example'],
      resolveHost: async () => ['127.0.0.1'],
    })).rejects.toMatchObject({ code: 'unsafe_remote_address' });
    await expect(normalizeMediaInput({ kind: 'remote-url', url: 'https://provider.example/image.png' }, 'IMAGE', {
      fetchImpl,
      allowedRemoteHosts: ['provider.example'],
      resolveHost: async () => ['2001:db8::1'],
    })).rejects.toMatchObject({ code: 'unsafe_remote_address' });
    await expect(normalizeMediaInput({ kind: 'remote-url', url: 'https://provider.example/image.png' }, 'IMAGE', {
      fetchImpl,
      allowedRemoteHosts: ['provider.example'],
      resolveHost: async () => ['64:ff9b:1::7f00:1'],
    })).rejects.toMatchObject({ code: 'unsafe_remote_address' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('treats exact and wildcard provider allowlist entries distinctly', () => {
    expect(hostMatchesAllowlist('provider.example', ['provider.example'])).toBe(true);
    expect(hostMatchesAllowlist('cdn.provider.example', ['provider.example'])).toBe(false);
    expect(hostMatchesAllowlist('cdn.provider.example', ['*.provider.example'])).toBe(true);
    expect(hostMatchesAllowlist('provider.example', ['*.provider.example'])).toBe(false);
    expect(hostMatchesAllowlist('provider.example.evil.test', ['*.provider.example'])).toBe(false);
  });

  it('returns the pinned address in both Node lookup callback modes', () => {
    const lookup = createPinnedLookup('8.8.8.8');
    const one = vi.fn();
    const all = vi.fn();

    lookup('provider.example', { all: false }, one);
    lookup('provider.example', { all: true }, all);

    expect(one).toHaveBeenCalledWith(null, '8.8.8.8', 4);
    expect(all).toHaveBeenCalledWith(null, [{ address: '8.8.8.8', family: 4 }]);
  });

  it('revalidates an allowed redirect and downloads a provider URL', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: 'https://cdn.example/image.png' } }))
      .mockResolvedValueOnce(new Response(PNG_1X1, { status: 200, headers: { 'content-type': 'image/png' } }));
    const result = await normalizeMediaInput({ kind: 'remote-url', url: 'https://provider.example/start' }, 'IMAGE', {
      fetchImpl,
      allowedRemoteHosts: ['provider.example', 'cdn.example'],
      resolveHost: async () => ['8.8.8.8'],
    });
    expect(result.mimeType).toBe('image/png');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('recognizes signatures without trusting an extension', () => {
    expect(sniffMediaMimeType(PNG_1X1)).toBe('image/png');
    expect(readImageDimensions(PNG_1X1, 'image/png')).toEqual({ width: 1, height: 1 });
  });
});
