import { sniffMediaMimeType } from './mediaInput';

const EMBEDDED_MEDIA_PREFIX = /^\s*(?:data:[^;,]+;base64,|blob:)/i;
const BASE64_ONLY = /^[A-Za-z0-9+/]+={0,2}$/;
const MIN_SUSPICIOUS_BASE64_LENGTH = 1024;

function decodeCanonicalBase64(compact: string): Buffer | undefined {
  if (compact.length < 12 || !BASE64_ONLY.test(compact)) return undefined;
  const unpadded = compact.replace(/=+$/, '');
  if (unpadded.length % 4 === 1) return undefined;
  try {
    const decoded = Buffer.from(`${unpadded}${'='.repeat((4 - unpadded.length % 4) % 4)}`, 'base64');
    return decoded.toString('base64').replace(/=+$/, '') === unpadded ? decoded : undefined;
  } catch {
    return undefined;
  }
}

export class PermanentMediaPayloadError extends Error {
  constructor(message: string, readonly path: string) {
    super(`${message} at ${path}`);
    this.name = 'PermanentMediaPayloadError';
  }
}

function isBlobValue(value: unknown): value is Blob {
  return typeof Blob !== 'undefined' && value instanceof Blob;
}

function inspect(value: unknown, path: string, seen: WeakSet<object>): void {
  if (value == null || typeof value === 'boolean' || typeof value === 'number') return;

  if (typeof value === 'string') {
    const compact = value.replace(/\s/g, '');
    if (EMBEDDED_MEDIA_PREFIX.test(value)) {
      throw new PermanentMediaPayloadError('Embedded data/blob URLs are not permanent metadata', path);
    }
    const decodedBase64 = decodeCanonicalBase64(compact);
    if (decodedBase64 && (sniffMediaMimeType(decodedBase64) !== undefined || compact.length >= MIN_SUSPICIOUS_BASE64_LENGTH)) {
      throw new PermanentMediaPayloadError('Raw base64 media is not permanent metadata', path);
    }
    return;
  }

  if (
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value) ||
    (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) ||
    isBlobValue(value)
  ) {
    throw new PermanentMediaPayloadError('Binary media is not permanent metadata', path);
  }

  if (typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((entry, index) => inspect(entry, `${path}[${index}]`, seen));
    return;
  }

  for (const [key, entry] of Object.entries(value)) {
    inspect(entry, `${path}.${key}`, seen);
  }
}

/** Reject media bodies before a DTO can reach SQL Connect/PostgreSQL. */
export function assertPermanentMediaMetadata(value: unknown): void {
  inspect(value, '$', new WeakSet<object>());
}
