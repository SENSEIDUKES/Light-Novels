import { auth } from '../lib/firebase';
import { generateUUID } from '../lib/id';
import {
  MEDIA_PURPOSE,
  MEDIA_TARGET_KIND,
  saveMediaAsset,
} from '../lib/media/mediaAssetClient';
import { resolveMediaAssetForDisplay } from '../lib/media/privateMediaResolver';
import {
  PersistenceClientError,
  recoverPendingUserPortraits,
  selectUserPortrait,
} from '../lib/persistence/persistenceClient';
import type { ProfilePictureAsset } from '../types';

export interface PersistProfilePictureInput {
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

export class ProfilePictureCommitDeferredError extends Error {
  readonly portrait: ProfilePictureAsset;

  constructor(portrait: ProfilePictureAsset, options?: ErrorOptions) {
    super('Portrait image is safe in R2, but its PostgreSQL profile selection is waiting to sync.', options);
    this.name = 'ProfilePictureCommitDeferredError';
    this.portrait = portrait;
  }
}

const boundedText = (value: unknown, maximumLength: number): string =>
  typeof value === 'string' ? value.slice(0, maximumLength) : '';

function accountChangedError(): Error & { code: string } {
  return Object.assign(
    new Error('The active Firebase account changed during portrait persistence.'),
    { code: 'auth/account-changed' },
  );
}

function assertPortraitOwner(userId: string): void {
  if (auth.currentUser?.uid !== userId) throw accountChangedError();
}

function isAccountChanged(error: unknown): boolean {
  return Boolean(
    error
    && typeof error === 'object'
    && 'code' in error
    && String(error.code) === 'auth/account-changed',
  );
}

async function activatePortrait(
  portrait: ProfilePictureAsset,
  input: PersistProfilePictureInput,
): Promise<void> {
  await selectUserPortrait({
    assetId: portrait.id,
    prompt: boundedText(input.prompt, 5_000),
    description: boundedText(input.description, 2_000),
    daoRank: boundedText(input.daoRank, 100),
    daoXp: Number.isFinite(input.daoXp) ? Math.max(0, Math.floor(input.daoXp)) : 0,
    powerStage: boundedText(input.powerStage, 200),
    equippedArtifactId: input.equippedArtifactId?.slice(0, 128) ?? null,
    usedReferenceImage: input.usedReferenceImage,
    customization: portrait.customization,
  }, input.userId, generateUUID());
}

/**
 * Server-side recovery owns incomplete portrait selections. No signed URL or
 * media body is stored in localStorage.
 */
export async function retryPendingProfilePictures(userId: string): Promise<number> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return 0;
  return recoverPendingUserPortraits(userId, generateUUID());
}

/**
 * Persists the generated preview through the authenticated R2 pipeline, then
 * atomically selects its PostgreSQL UserPortrait row. R2 owns the permanent
 * object while PostgreSQL owns its metadata and active selection.
 */
export async function persistProfilePicture(
  input: PersistProfilePictureInput,
): Promise<ProfilePictureAsset> {
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
      promptUsed: boundedText(input.prompt, 12_000),
      label: boundedText(input.description, 500),
    },
    idempotencyKey: generateUUID(),
    expectedOwnerUid: input.userId,
  });
  assertPortraitOwner(input.userId);

  const createdAt = asset.readyAt || asset.createdAt;
  let portrait: ProfilePictureAsset = {
    schemaVersion: 1,
    id: asset.id,
    userId: input.userId,
    // The generated preview stays in memory until canonical delivery resolves.
    // It is never placed in the account-profile cache.
    imageUrl: input.imageSource,
    avatarMediaDescriptor: { ...asset, deliveryUrl: '' },
    assetVersion: asset.version,
    checksumSha256: asset.checksumSha256,
    deliveryUrlExpiresAt: asset.deliveryUrlExpiresAt ?? undefined,
    mimeType: asset.mimeType as ProfilePictureAsset['mimeType'],
    source: 'generated',
    createdAt,
    updatedAt: createdAt,
    generation: {
      prompt: boundedText(input.prompt, 5_000),
      description: boundedText(input.description, 2_000),
      daoRank: boundedText(input.daoRank, 100),
      daoXp: Number.isFinite(input.daoXp) ? Math.max(0, Math.floor(input.daoXp)) : 0,
      powerStage: boundedText(input.powerStage, 200),
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
    if (isAccountChanged(error)) throw error;
    if (!(error instanceof PersistenceClientError) || error.recoverable) {
      throw new ProfilePictureCommitDeferredError(portrait, { cause: error });
    }
    throw error;
  }
  assertPortraitOwner(input.userId);

  // PostgreSQL selection is already durable. Delivery hydration is a separate
  // projection: if R2 signing or IndexedDB is temporarily unavailable, keep the
  // generated preview visible and the canonical blank descriptor recoverable.
  try {
    const resolved = await resolveMediaAssetForDisplay(asset, input.userId);
    assertPortraitOwner(input.userId);
    portrait = {
      ...portrait,
      imageUrl: resolved.url,
      avatarMediaDescriptor: { ...resolved.descriptor, deliveryUrl: '' },
    };
  } catch (error) {
    if (isAccountChanged(error) || auth.currentUser?.uid !== input.userId) throw error;
    console.warn('Portrait selected, but canonical delivery is temporarily unavailable:', error);
  }
  return portrait;
}
