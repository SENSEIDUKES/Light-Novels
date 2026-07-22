import { createHash } from 'node:crypto';
import { lookup as dnsLookup } from 'node:dns/promises';
import type { IncomingHttpHeaders } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { BlockList, isIP, type LookupFunction } from 'node:net';
import type { MediaAssetType, MediaSource } from '../../contracts/mediaAssets';

const MAX_BYTES_BY_TYPE: Record<MediaAssetType, number> = {
  IMAGE: 20 * 1024 * 1024,
  AUDIO: 100 * 1024 * 1024,
  VIDEO: 512 * 1024 * 1024,
  MOTION_COVER: 100 * 1024 * 1024,
  PDF: 100 * 1024 * 1024,
  EPUB: 200 * 1024 * 1024,
  MANGA_PAGE: 25 * 1024 * 1024,
  EXPORT: 512 * 1024 * 1024,
  OTHER: 25 * 1024 * 1024,
};

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/flac': 'flac',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'application/pdf': 'pdf',
  'application/epub+zip': 'epub',
  'application/zip': 'zip',
  'application/json': 'json',
  'text/plain': 'txt',
  'text/csv': 'csv',
};

const ALLOWED_MIME_BY_TYPE: Record<MediaAssetType, ReadonlySet<string>> = {
  IMAGE: new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']),
  AUDIO: new Set(['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac']),
  VIDEO: new Set(['video/mp4', 'video/webm']),
  MOTION_COVER: new Set(['video/mp4', 'video/webm', 'image/gif', 'image/webp']),
  PDF: new Set(['application/pdf']),
  EPUB: new Set(['application/epub+zip']),
  MANGA_PAGE: new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  EXPORT: new Set(['application/pdf', 'application/epub+zip', 'application/zip', 'application/json', 'text/plain', 'text/csv']),
  OTHER: new Set(['application/zip', 'application/json', 'text/plain', 'text/csv']),
};

const SAFE_TEXT_MIMES = new Set(['application/json', 'text/plain', 'text/csv']);

const BLOCKED_IPV6_RANGES = new BlockList();
for (const [network, prefix] of [
  ['::', 96],
  ['::1', 128],
  ['::ffff:0:0', 96],
  ['64:ff9b::', 96],
  ['64:ff9b:1::', 48],
  ['100::', 64],
  ['100:0:0:1::', 64],
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['3fff::', 20],
  ['5f00::', 16],
  ['fc00::', 7],
  ['fe80::', 10],
  ['fec0::', 10],
  ['ff00::', 8],
] as const) {
  BLOCKED_IPV6_RANGES.addSubnet(network, prefix, 'ipv6');
}

export interface NormalizedMediaInput {
  bytes: Uint8Array;
  mimeType: string;
  extension: string;
  byteSize: number;
  checksumSha256: string;
  width?: number;
  height?: number;
  originalFilename?: string;
  sourceKind: MediaSource['kind'];
}

export interface MediaInputPolicy {
  allowedRemoteHosts?: readonly string[];
  allowHttpForTests?: boolean;
  requestTimeoutMs?: number;
  maxRedirects?: number;
  fetchImpl?: typeof fetch;
  resolveHost?: (hostname: string) => Promise<readonly string[]>;
  maxBytesByType?: Partial<Record<MediaAssetType, number>>;
}

export class MediaInputError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = 'MediaInputError';
  }
}

function normalizeMime(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const mime = value.split(';', 1)[0].trim().toLowerCase();
  if (mime === 'image/jpg') return 'image/jpeg';
  if (mime === 'audio/mp3') return 'audio/mpeg';
  if (mime === 'audio/x-wav') return 'audio/wav';
  return mime || undefined;
}

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

export function sniffMediaMimeType(bytes: Uint8Array): string | undefined {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (ascii(bytes, 0, 6) === 'GIF87a' || ascii(bytes, 0, 6) === 'GIF89a') return 'image/gif';
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'image/webp';
  if (bytes.length >= 12 && ascii(bytes, 4, 4) === 'ftyp' && /^(?:avif|avis)$/.test(ascii(bytes, 8, 4))) return 'image/avif';
  if (ascii(bytes, 0, 3) === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) return 'audio/mpeg';
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WAVE') return 'audio/wav';
  if (ascii(bytes, 0, 4) === 'OggS') return 'audio/ogg';
  if (ascii(bytes, 0, 4) === 'fLaC') return 'audio/flac';
  if (bytes.length >= 12 && ascii(bytes, 4, 4) === 'ftyp') return 'video/mp4';
  if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return 'video/webm';
  if (ascii(bytes, 0, 5) === '%PDF-') return 'application/pdf';
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return 'application/zip';
  return undefined;
}

function readUint24LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

export function readImageDimensions(bytes: Uint8Array, mimeType: string): { width: number; height: number } | undefined {
  if (mimeType === 'image/png' && bytes.length >= 24) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (mimeType === 'image/gif' && bytes.length >= 10) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
  }
  if (mimeType === 'image/webp' && bytes.length >= 30 && ascii(bytes, 12, 4) === 'VP8X') {
    return { width: readUint24LE(bytes, 24) + 1, height: readUint24LE(bytes, 27) + 1 };
  }
  if (mimeType === 'image/jpeg') {
    let offset = 2;
    while (offset + 8 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = bytes[offset + 1];
      const length = (bytes[offset + 2] << 8) + bytes[offset + 3];
      if (length < 2) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return {
          height: (bytes[offset + 5] << 8) + bytes[offset + 6],
          width: (bytes[offset + 7] << 8) + bytes[offset + 8],
        };
      }
      offset += length + 2;
    }
  }
  return undefined;
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b, c] = parts;
  return a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224;
}

function isPrivateIp(address: string): boolean {
  if (isIP(address) === 4) return isPrivateIpv4(address);
  if (isIP(address) !== 6) return true;
  return BLOCKED_IPV6_RANGES.check(address, 'ipv6');
}

function normalizeHostname(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, '').replace(/^\[|\]$/g, '');
}

export function hostMatchesAllowlist(hostname: string, allowedHosts: readonly string[]): boolean {
  const normalized = normalizeHostname(hostname);
  return allowedHosts.some((entry) => {
    const candidate = normalizeHostname(entry);
    const wildcard = candidate.startsWith('*.');
    const allowed = wildcard ? candidate.slice(2) : candidate;
    return Boolean(allowed) && (wildcard
      ? normalized.endsWith(`.${allowed}`)
      : normalized === allowed);
  });
}

async function validateRemoteUrl(url: URL, policy: MediaInputPolicy): Promise<readonly string[]> {
  const protocolAllowed = url.protocol === 'https:' || (policy.allowHttpForTests && url.protocol === 'http:');
  if (!protocolAllowed || url.username || url.password) {
    throw new MediaInputError('Remote media URLs must use HTTPS without embedded credentials.', 'unsafe_remote_url');
  }
  const hostname = normalizeHostname(url.hostname);
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new MediaInputError('Remote media URL resolves to a local host.', 'unsafe_remote_host');
  }
  const allowedHosts = policy.allowedRemoteHosts ?? [];
  if (allowedHosts.length === 0 || !hostMatchesAllowlist(hostname, allowedHosts)) {
    throw new MediaInputError('Remote media host is not on the configured provider allowlist.', 'remote_host_not_allowed');
  }
  let addresses: readonly string[];
  try {
    addresses = isIP(hostname)
      ? [hostname]
      : await (policy.resolveHost ?? (async (host) => (await dnsLookup(host, { all: true, verbatim: true })).map((entry) => entry.address)))(hostname);
  } catch (error) {
    throw new MediaInputError('Remote media host DNS lookup failed: ' + (error instanceof Error ? error.message : String(error)), 'remote_host_not_found');
  }
  if (addresses.length === 0 || addresses.some(isPrivateIp)) {
    throw new MediaInputError('Remote media host resolved to a private or reserved network.', 'unsafe_remote_address');
  }
  return addresses;
}

interface PinnedResponse {
  status: number;
  headers: Headers;
  bytes: Uint8Array;
}

function toHeaders(values: IncomingHttpHeaders): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(values)) {
    if (Array.isArray(value)) value.forEach((entry) => headers.append(name, entry));
    else if (value !== undefined) headers.set(name, String(value));
  }
  return headers;
}

async function requestPinnedHttps(
  url: URL,
  address: string,
  maxBytes: number,
  timeoutMs: number,
): Promise<PinnedResponse> {
  return new Promise<PinnedResponse>((resolve, reject) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const request = httpsRequest(url, {
      agent: false,
      signal: controller.signal,
      servername: url.hostname,
      lookup: createPinnedLookup(address),
    }, (response) => {
      const status = response.statusCode ?? 0;
      const headers = toHeaders(response.headers);
      if ([301, 302, 303, 307, 308].includes(status) || status < 200 || status >= 300) {
        // Redirect and error bodies are irrelevant. Stop the socket instead of
        // draining an attacker-controlled body after the request timeout clears.
        response.destroy();
        clearTimeout(timeout);
        resolve({ status, headers, bytes: new Uint8Array() });
        return;
      }

      void (async () => {
        try {
          const declaredLength = Number(headers.get('content-length'));
          if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
            throw new MediaInputError(`Remote media exceeds the ${maxBytes} byte limit.`, 'media_too_large');
          }
          const chunks: Uint8Array[] = [];
          let size = 0;
          for await (const chunk of response) {
            const bytes = typeof chunk === 'string' ? Buffer.from(chunk) : new Uint8Array(chunk);
            size += bytes.byteLength;
            if (size > maxBytes) throw new MediaInputError(`Remote media exceeds the ${maxBytes} byte limit.`, 'media_too_large');
            chunks.push(bytes);
          }
          const bytes = new Uint8Array(size);
          let offset = 0;
          for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.byteLength;
          }
          clearTimeout(timeout);
          resolve({ status, headers, bytes });
        } catch (error) {
          request.destroy();
          clearTimeout(timeout);
          reject(error);
        }
      })();
    });
    request.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    request.end();
  });
}

export function createPinnedLookup(address: string): LookupFunction {
  const family = isIP(address);
  if (family !== 4 && family !== 6) throw new MediaInputError('Pinned media address is invalid.', 'unsafe_remote_address');
  return (_hostname, options, callback) => {
    const cb = typeof options === 'function' ? options : callback;
    const opts = typeof options === 'object' && options !== null ? options : {};
    if (opts.all) {
      cb(null, [{ address, family }]);
      return;
    }
    cb(null, address, family);
  };
}

async function readResponseBytes(response: Response, maxBytes: number): Promise<Uint8Array> {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new MediaInputError(`Remote media exceeds the ${maxBytes} byte limit.`, 'media_too_large');
  }
  if (!response.body) return new Uint8Array(await response.arrayBuffer());

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new MediaInputError(`Remote media exceeds the ${maxBytes} byte limit.`, 'media_too_large');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function fetchRemoteMedia(source: Extract<MediaSource, { kind: 'remote-url' }>, maxBytes: number, policy: MediaInputPolicy): Promise<{ bytes: Uint8Array; mimeType?: string }> {
  const maxRedirects = policy.maxRedirects ?? 3;
  let current = new URL(source.url);
  for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
    const addresses = await validateRemoteUrl(current, policy);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), policy.requestTimeoutMs ?? 15_000);
    try {
      const response = policy.fetchImpl || current.protocol !== 'https:'
        ? await (policy.fetchImpl ?? fetch)(current, { redirect: 'manual', signal: controller.signal })
        : await requestPinnedHttps(current, addresses[0], maxBytes, policy.requestTimeoutMs ?? 15_000);
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location || redirect === maxRedirects) throw new MediaInputError('Remote media exceeded the redirect limit.', 'remote_redirect_failed');
        current = new URL(location, current);
        continue;
      }
      const ok = response instanceof Response ? response.ok : response.status >= 200 && response.status < 300;
      if (!ok) throw new MediaInputError(`Remote media returned HTTP ${response.status}.`, 'remote_fetch_failed');
      const bytes = response instanceof Response ? await readResponseBytes(response, maxBytes) : response.bytes;
      return { bytes, mimeType: normalizeMime(response.headers.get('content-type')) };
    } catch (error) {
      if (error instanceof MediaInputError) throw error;
      throw new MediaInputError(`Unable to download remote media: ${error instanceof Error ? error.message : String(error)}`, 'remote_fetch_failed');
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new MediaInputError('Remote media exceeded the redirect limit.', 'remote_redirect_failed');
}

function decodeDataUrl(dataUrl: string): { bytes: Uint8Array; mimeType: string } {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/\s]*={0,2})$/i.exec(dataUrl);
  if (!match) throw new MediaInputError('Media data URL must contain a MIME type and base64 body.', 'invalid_data_url');
  const encoded = match[2].replace(/\s/g, '');
  if (!encoded) throw new MediaInputError('Media data URL is empty.', 'empty_media');
  let buffer: Buffer;
  try {
    buffer = Buffer.from(encoded, 'base64');
  } catch {
    throw new MediaInputError('Media data URL contains invalid base64.', 'invalid_base64');
  }
  if (buffer.length === 0 || buffer.toString('base64').replace(/=+$/, '') !== encoded.replace(/=+$/, '')) {
    throw new MediaInputError('Media data URL contains invalid base64.', 'invalid_base64');
  }
  return { bytes: new Uint8Array(buffer), mimeType: normalizeMime(match[1])! };
}

function validateMime(assetType: MediaAssetType, declaredMime: string | undefined, sniffedMime: string | undefined): string {
  let resolved = sniffedMime ?? declaredMime;
  if (assetType === 'EPUB' && sniffedMime === 'application/zip' && declaredMime === 'application/epub+zip') resolved = declaredMime;
  if (!resolved || !ALLOWED_MIME_BY_TYPE[assetType].has(resolved)) {
    throw new MediaInputError(`MIME type ${resolved ?? 'unknown'} is not allowed for ${assetType}.`, 'unsupported_media_type');
  }
  if (sniffedMime && declaredMime && sniffedMime !== declaredMime && !(resolved === 'application/epub+zip' && sniffedMime === 'application/zip')) {
    throw new MediaInputError(`Declared MIME ${declaredMime} does not match file signature ${sniffedMime}.`, 'mime_mismatch');
  }
  if (!sniffedMime && !SAFE_TEXT_MIMES.has(resolved)) {
    throw new MediaInputError('The media file signature is not recognized.', 'unrecognized_media_signature');
  }
  return resolved;
}

function sanitizeFilename(filename: string | undefined): string | undefined {
  if (!filename) return undefined;
  const leaf = Array.from(filename.replace(/\\/g, '/').split('/').pop()!)
    .filter((character) => character.charCodeAt(0) > 31 && character.charCodeAt(0) !== 127)
    .join('')
    .trim();
  return leaf ? leaf.slice(0, 240) : undefined;
}

export async function normalizeMediaInput(source: MediaSource, assetType: MediaAssetType, policy: MediaInputPolicy = {}): Promise<NormalizedMediaInput> {
  const maxBytes = policy.maxBytesByType?.[assetType] ?? MAX_BYTES_BY_TYPE[assetType];
  let bytes: Uint8Array;
  let declaredMime: string | undefined;

  if (source.kind === 'bytes') {
    bytes = new Uint8Array(source.bytes);
    declaredMime = normalizeMime(source.mimeType);
  } else if (source.kind === 'blob') {
    bytes = new Uint8Array(await source.blob.arrayBuffer());
    declaredMime = normalizeMime(source.blob.type);
  } else if (source.kind === 'data-url') {
    const decoded = decodeDataUrl(source.dataUrl);
    bytes = decoded.bytes;
    declaredMime = decoded.mimeType;
  } else {
    const downloaded = await fetchRemoteMedia(source, maxBytes, policy);
    bytes = downloaded.bytes;
    declaredMime = normalizeMime(source.expectedMimeType) ?? downloaded.mimeType;
  }

  if (bytes.byteLength === 0) throw new MediaInputError('Media file is empty.', 'empty_media');
  if (bytes.byteLength > maxBytes) throw new MediaInputError(`Media exceeds the ${maxBytes} byte limit.`, 'media_too_large');

  const sniffedMime = sniffMediaMimeType(bytes);
  const mimeType = validateMime(assetType, declaredMime, sniffedMime);
  const dimensions = readImageDimensions(bytes, mimeType);
  if (dimensions && (dimensions.width < 1 || dimensions.height < 1 || dimensions.width > 40_000 || dimensions.height > 40_000)) {
    throw new MediaInputError('Image dimensions are invalid or exceed 40000 pixels.', 'invalid_image_dimensions');
  }

  return {
    bytes,
    mimeType,
    extension: MIME_EXTENSIONS[mimeType],
    byteSize: bytes.byteLength,
    checksumSha256: createHash('sha256').update(bytes).digest('hex'),
    width: dimensions?.width,
    height: dimensions?.height,
    originalFilename: sanitizeFilename(source.filename),
    sourceKind: source.kind,
  };
}
