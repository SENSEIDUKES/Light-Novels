import { doc, writeBatch } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, firebaseStorage } from '../lib/firebase';
import { generateUUID } from '../lib/id';
import type {
  CultivatorPortraitAsset,
  CultivatorPortraitMimeType,
} from '../types';

const MAX_PORTRAIT_BYTES = 10 * 1024 * 1024;
const FIREBASE_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const PENDING_PORTRAIT_PREFIX = 'seihouse-pending-portrait-commits-v1:';
const pendingRetries = new Map<string, Promise<void>>();

const EXTENSION_BY_MIME_TYPE: Record<CultivatorPortraitMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export interface PersistCultivatorPortraitInput {
  userId: string;
  imageSource: string;
  prompt: string;
  description: string;
  daoRank: string;
  daoXp: number;
  powerStage: string;
  equippedArtifactId: string | null;
  usedReferenceImage: boolean;
}

interface NormalizedPortraitImage {
  blob: Blob;
  mimeType: CultivatorPortraitMimeType;
}

export class CultivatorPortraitCommitDeferredError extends Error {
  readonly portrait: CultivatorPortraitAsset;

  constructor(portrait: CultivatorPortraitAsset, options?: ErrorOptions) {
    super('Portrait image is safe in cloud storage, but its account record is waiting to sync.', options);
    this.name = 'CultivatorPortraitCommitDeferredError';
    this.portrait = portrait;
  }
}

const pendingPortraitKey = (userId: string) =>
  `${PENDING_PORTRAIT_PREFIX}${encodeURIComponent(userId)}`;

function readPendingPortraits(userId: string): CultivatorPortraitAsset[] {
  try {
    const serialized = localStorage.getItem(pendingPortraitKey(userId));
    if (!serialized) return [];
    const value: unknown = JSON.parse(serialized);
    if (!Array.isArray(value)) return [];
    return value.filter((portrait): portrait is CultivatorPortraitAsset => {
      if (!portrait || typeof portrait !== 'object') return false;
      const candidate = portrait as Partial<CultivatorPortraitAsset>;
      return candidate.schemaVersion === 1
        && candidate.userId === userId
        && typeof candidate.id === 'string'
        && FIREBASE_ID_PATTERN.test(candidate.id)
        && typeof candidate.imageUrl === 'string'
        && typeof candidate.storagePath === 'string';
    });
  } catch (error) {
    console.warn('Failed to read pending portrait commits:', error);
    return [];
  }
}

function writePendingPortraits(userId: string, portraits: CultivatorPortraitAsset[]): void {
  try {
    if (portraits.length === 0) {
      localStorage.removeItem(pendingPortraitKey(userId));
      return;
    }
    localStorage.setItem(pendingPortraitKey(userId), JSON.stringify(portraits.slice(-5)));
  } catch (error) {
    console.warn('Failed to cache a pending portrait commit:', error);
  }
}

function queuePendingPortrait(portrait: CultivatorPortraitAsset): void {
  const pending = readPendingPortraits(portrait.userId)
    .filter(candidate => candidate.id !== portrait.id);
  pending.push(portrait);
  writePendingPortraits(portrait.userId, pending);
}

function isRetryableCommitError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String(error.code) : '';
  const message = 'message' in error ? String(error.message).toLowerCase() : '';
  return code.endsWith('resource-exhausted')
    || code.endsWith('unavailable')
    || code.endsWith('deadline-exceeded')
    || message.includes('quota limit exceeded')
    || message.includes('quota exceeded');
}

async function commitPortraitRecords(portrait: CultivatorPortraitAsset): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', portrait.userId, 'portraits', portrait.id), portrait);
  batch.set(doc(db, 'users', portrait.userId), {
    avatarUrl: portrait.imageUrl,
    activePortraitId: portrait.id,
    updatedAt: portrait.updatedAt,
  }, { merge: true });
  await batch.commit();
}

/** Retries account metadata for portrait images already secured in cloud storage. */
export function retryPendingCultivatorPortraits(userId: string): Promise<void> {
  if (!FIREBASE_ID_PATTERN.test(userId)) return Promise.resolve();
  const activeRetry = pendingRetries.get(userId);
  if (activeRetry) return activeRetry;

  const retry = (async () => {
    const pending = readPendingPortraits(userId);
    const remaining: CultivatorPortraitAsset[] = [];
    for (const portrait of pending) {
      try {
        await commitPortraitRecords(portrait);
      } catch (error) {
        remaining.push(portrait);
        console.warn('A pending portrait is still waiting for cloud profile access:', error);
      }
    }
    writePendingPortraits(userId, remaining);
  })().finally(() => {
    pendingRetries.delete(userId);
  });

  pendingRetries.set(userId, retry);
  return retry;
}

function requireSupportedMimeType(value: string): CultivatorPortraitMimeType {
  const mimeType = value.split(';', 1)[0].trim().toLowerCase();
  if (Object.hasOwn(EXTENSION_BY_MIME_TYPE, mimeType)) {
    return mimeType as CultivatorPortraitMimeType;
  }
  throw new Error(`Unsupported portrait image type: ${mimeType || 'unknown'}.`);
}

function rejectOversizedImage(size: number): void {
  if (size === 0) {
    throw new Error('Portrait image is empty.');
  }
  if (size > MAX_PORTRAIT_BYTES) {
    throw new Error('Portrait image exceeds the 10 MiB limit.');
  }
}

function decodeDataUrl(source: string): NormalizedPortraitImage | null {
  const match = /^data:([^;,]+);base64,([\s\S]*)$/i.exec(source);
  if (!match) {
    return null;
  }

  const mimeType = requireSupportedMimeType(match[1]);
  const payload = match[2].replace(/\s/g, '');
  const paddingLength = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  const estimatedSize = Math.max(0, Math.floor((payload.length * 3) / 4) - paddingLength);
  rejectOversizedImage(estimatedSize);

  let binary: string;
  try {
    binary = atob(payload);
  } catch (error) {
    throw new Error('Portrait data URL contains invalid base64 data.', { cause: error });
  }

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  rejectOversizedImage(bytes.byteLength);

  return {
    blob: new Blob([bytes], { type: mimeType }),
    mimeType,
  };
}

async function downloadRemoteImage(source: string): Promise<NormalizedPortraitImage> {
  let response: Response;
  try {
    response = await fetch(source);
  } catch (error) {
    throw new Error('Failed to fetch portrait image.', { cause: error });
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch portrait image (HTTP ${response.status}).`);
  }

  const contentLength = response.headers.get('content-length');
  if (contentLength) {
    const declaredSize = Number.parseInt(contentLength, 10);
    if (Number.isFinite(declaredSize) && declaredSize > MAX_PORTRAIT_BYTES) {
      throw new Error('Portrait image exceeds the 10 MiB limit.');
    }
  }

  let blob: Blob;
  try {
    blob = await response.blob();
  } catch (error) {
    throw new Error('Failed to read the fetched portrait image.', { cause: error });
  }

  const mimeType = requireSupportedMimeType(blob.type);
  rejectOversizedImage(blob.size);
  return { blob, mimeType };
}

async function normalizePortraitImage(source: string): Promise<NormalizedPortraitImage> {
  const normalizedSource = source.trim();
  const dataImage = decodeDataUrl(normalizedSource);
  if (dataImage) {
    return dataImage;
  }

  let remoteUrl: URL;
  try {
    remoteUrl = new URL(normalizedSource);
  } catch {
    throw new Error('Portrait image source must be a supported data URL or HTTP(S) URL.');
  }
  if (remoteUrl.protocol !== 'http:' && remoteUrl.protocol !== 'https:') {
    throw new Error('Portrait image source must be a supported data URL or HTTP(S) URL.');
  }

  return downloadRemoteImage(normalizedSource);
}

/** Persists a generated portrait as an account-owned asset and selects it atomically. */
export async function persistCultivatorPortrait(
  input: PersistCultivatorPortraitInput,
): Promise<CultivatorPortraitAsset> {
  if (!FIREBASE_ID_PATTERN.test(input.userId)) {
    throw new Error('A valid user ID is required to persist a cultivator portrait.');
  }

  const { blob, mimeType } = await normalizePortraitImage(input.imageSource);
  const id = generateUUID();
  const extension = EXTENSION_BY_MIME_TYPE[mimeType];
  const storagePath = `users/${input.userId}/portraits/${id}.${extension}`;
  const storageRef = ref(firebaseStorage, storagePath);

  await uploadBytes(storageRef, blob, { contentType: mimeType });

  try {
    const imageUrl = await getDownloadURL(storageRef);
    const timestamp = new Date().toISOString();
    const portrait: CultivatorPortraitAsset = {
      schemaVersion: 1,
      id,
      userId: input.userId,
      imageUrl,
      storagePath,
      mimeType,
      source: 'generated',
      createdAt: timestamp,
      updatedAt: timestamp,
      generation: {
        prompt: input.prompt.slice(0, 5000),
        description: input.description.slice(0, 2000),
        daoRank: input.daoRank.slice(0, 100),
        daoXp: Number.isFinite(input.daoXp) ? Math.max(0, input.daoXp) : 0,
        powerStage: input.powerStage.slice(0, 200),
        equippedArtifactId: input.equippedArtifactId?.slice(0, 128) ?? null,
        usedReferenceImage: input.usedReferenceImage,
      },
      customization: {
        frameId: null,
        glowId: null,
        bannerId: null,
        effectIds: [],
      },
    };

    try {
      await commitPortraitRecords(portrait);
    } catch (error) {
      if (isRetryableCommitError(error)) {
        queuePendingPortrait(portrait);
        throw new CultivatorPortraitCommitDeferredError(portrait, { cause: error });
      }
      throw error;
    }

    return portrait;
  } catch (error) {
    if (error instanceof CultivatorPortraitCommitDeferredError) {
      throw error;
    }
    try {
      await deleteObject(storageRef);
    } catch {
      // The original persistence error is more useful than a cleanup failure.
    }
    throw error;
  }
}
