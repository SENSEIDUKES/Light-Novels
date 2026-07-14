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

    const batch = writeBatch(db);
    batch.set(doc(db, 'users', input.userId, 'portraits', id), portrait);
    batch.set(doc(db, 'users', input.userId), {
      avatarUrl: imageUrl,
      activePortraitId: id,
      updatedAt: timestamp,
    }, { merge: true });
    await batch.commit();

    return portrait;
  } catch (error) {
    try {
      await deleteObject(storageRef);
    } catch {
      // The original persistence error is more useful than a cleanup failure.
    }
    throw error;
  }
}
