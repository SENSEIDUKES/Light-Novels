import { auth } from '../lib/firebase';
import { generateUUID } from '../lib/id';
import {
  MEDIA_PURPOSE,
  MEDIA_TARGET_KIND,
  saveMediaAsset,
} from '../lib/media/mediaAssetClient';
import { resolveMediaAssetForDisplay } from '../lib/media/privateMediaResolver';
import type { CultivatorPortraitAsset } from '../types';

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

export class CultivatorPortraitCommitDeferredError extends Error {
  readonly portrait: CultivatorPortraitAsset;

  constructor(portrait: CultivatorPortraitAsset, options?: ErrorOptions) {
    super('Portrait image is safe in R2, but its PostgreSQL profile selection is waiting to sync.', options);
    this.name = 'CultivatorPortraitCommitDeferredError';
    this.portrait = portrait;
  }
}

async function profileHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to save a Celestial Portrait.');
  return {
    Authorization: `Bearer ${await user.getIdToken()}`,
    'Content-Type': 'application/json',
  };
}

async function activatePortrait(
  portrait: CultivatorPortraitAsset,
  input: PersistCultivatorPortraitInput,
): Promise<void> {
  const response = await fetch('/api/persistence/profile/portrait', {
    method: 'PUT',
    headers: await profileHeaders(),
    body: JSON.stringify({
      assetId: portrait.id,
      prompt: input.prompt.slice(0, 5_000),
      description: input.description.slice(0, 2_000),
      daoRank: input.daoRank.slice(0, 100),
      daoXp: Number.isFinite(input.daoXp) ? Math.max(0, Math.floor(input.daoXp)) : 0,
      powerStage: input.powerStage.slice(0, 200),
      equippedArtifactId: input.equippedArtifactId?.slice(0, 128) ?? null,
      usedReferenceImage: input.usedReferenceImage,
      customization: portrait.customization,
      idempotencyKey: generateUUID(),
    }),
  });
  if (response.ok) return;
  let message = 'The portrait profile record could not be committed.';
  try {
    const payload = await response.json();
    if (typeof payload?.error?.message === 'string') message = payload.error.message;
  } catch {
    // Keep the sanitized fallback; never include the transient image source.
  }
  throw new Error(message);
}

/**
 * Server-side recovery owns incomplete portrait selections. No signed URL or
 * media body is stored in localStorage.
 */
export async function retryPendingCultivatorPortraits(userId: string): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return;
  const response = await fetch('/api/persistence/profile/portraits/recover', {
    method: 'POST',
    headers: await profileHeaders(),
    body: JSON.stringify({ idempotencyKey: generateUUID() }),
  });
  if (!response.ok && response.status !== 404) {
    throw new Error('Pending portrait recovery could not be scheduled.');
  }
}

/**
 * Persists the generated preview through the authenticated R2 pipeline, then
 * atomically selects its PostgreSQL UserPortrait row. R2 owns the permanent
 * object while PostgreSQL owns its metadata and active selection.
 */
export async function persistCultivatorPortrait(
  input: PersistCultivatorPortraitInput,
): Promise<CultivatorPortraitAsset> {
  const user = auth.currentUser;
  if (!user || user.uid !== input.userId) {
    throw new Error('The active Firebase account does not own this portrait request.');
  }

  const asset = await saveMediaAsset({
    source: input.imageSource,
    assetType: 'IMAGE',
    purpose: MEDIA_PURPOSE.CELESTIAL_PORTRAIT,
    association: {
      targetKind: MEDIA_TARGET_KIND.PORTRAIT,
      targetKey: input.userId,
      legacyMediaId: generateUUID(),
      entityType: 'portrait',
      promptUsed: input.prompt,
      label: input.description,
    },
    idempotencyKey: generateUUID(),
  });
  const resolved = await resolveMediaAssetForDisplay(asset);

  const createdAt = asset.readyAt || asset.createdAt;
  const portrait: CultivatorPortraitAsset = {
    schemaVersion: 1,
    id: asset.id,
    userId: input.userId,
    imageUrl: resolved.url,
    assetVersion: asset.version,
    checksumSha256: asset.checksumSha256,
    deliveryUrlExpiresAt: asset.deliveryUrlExpiresAt ?? undefined,
    mimeType: asset.mimeType as CultivatorPortraitAsset['mimeType'],
    source: 'generated',
    createdAt,
    updatedAt: createdAt,
    generation: {
      prompt: input.prompt.slice(0, 5_000),
      description: input.description.slice(0, 2_000),
      daoRank: input.daoRank.slice(0, 100),
      daoXp: Number.isFinite(input.daoXp) ? Math.max(0, Math.floor(input.daoXp)) : 0,
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
    await activatePortrait(portrait, input);
  } catch (error) {
    throw new CultivatorPortraitCommitDeferredError(portrait, { cause: error });
  }
  return portrait;
}
