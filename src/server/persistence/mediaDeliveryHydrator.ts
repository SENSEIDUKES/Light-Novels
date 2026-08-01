import { canonicalAssetId, isSameAssetId } from '../../contracts/assetIdentity';
import type { MediaAssetDescriptor } from '../../contracts/mediaAssets';
import type { BaseCodexEntry, GeneratedImage, StoryWorld, UserProfile } from '../../types';

interface GraphMediaAttachment {
  assetId: string;
  targetKind: string;
  targetKey: string;
  purpose: string;
  chapterId?: string | null;
  entityId?: string | null;
  isCurrent: boolean;
}

type VisualEntity = BaseCodexEntry & {
  id: string;
  isBeast?: boolean;
  imageUrl?: string;
  imageAssetId?: string;
  imageHistory?: GeneratedImage[];
  voiceAssetId?: string;
  voiceClipUrl?: string;
};

interface VisualEntityOwner {
  entity: VisualEntity;
  targetKind: string;
}

function visualEntityOwners(story: StoryWorld): VisualEntityOwner[] {
  return [
    ...story.memory.characters.map(entity => ({
      entity,
      targetKind: entity.isBeast ? 'BEAST' : 'CHARACTER',
    })),
    ...(story.memory.locations ?? []).map(entity => ({
      entity,
      targetKind: 'LOCATION',
    })),
    ...(story.memory.artifacts ?? []).map(entity => ({
      entity,
      targetKind: 'ARTIFACT',
    })),
    ...(story.memory.factions ?? []).map(entity => ({
      entity,
      targetKind: 'FACTION',
    })),
    ...(story.memory.abilities ?? []).filter(
      (ability): ability is Exclude<typeof ability, string> => typeof ability !== 'string',
    ).map(entity => ({
      entity,
      targetKind: 'ABILITY',
    })),
  ] as VisualEntityOwner[];
}

function delivery(
  descriptors: ReadonlyMap<string, MediaAssetDescriptor>,
  assetId: string | undefined,
): string | undefined {
  return descriptorFor(descriptors, assetId)?.deliveryUrl;
}

function descriptorFor(
  descriptors: ReadonlyMap<string, MediaAssetDescriptor>,
  assetId: string | undefined,
): MediaAssetDescriptor | undefined {
  if (!assetId) return undefined;
  const canonical = canonicalAssetId(assetId);
  const directMatch = descriptors.get(assetId) ?? descriptors.get(canonical);
  if (directMatch) return directMatch;

  for (const descriptor of descriptors.values()) {
    if (isSameAssetId(descriptor.id, canonical)) {
      return descriptor;
    }
  }
  return undefined;
}

function hydrateHistory(
  history: GeneratedImage[] | undefined,
  descriptors: ReadonlyMap<string, MediaAssetDescriptor>,
): GeneratedImage[] | undefined {
  if (!Array.isArray(history)) return undefined;
  return history.map(image => {
    const descriptor = image.assetId ? descriptorFor(descriptors, image.assetId) : undefined;
    return {
      ...image,
      ...(image.assetId ? { assetId: canonicalAssetId(image.assetId) } : {}),
      imageUrl: descriptor?.deliveryUrl ?? image.imageUrl,
      assetVersion: descriptor?.version ?? image.assetVersion,
      checksumSha256: descriptor?.checksumSha256 ?? image.checksumSha256,
      deliveryUrlExpiresAt: descriptor?.deliveryUrlExpiresAt ?? image.deliveryUrlExpiresAt,
    };
  });
}

/** Hydrate transient signed URLs only after canonical asset references exist. */
export function hydrateStoryMediaDelivery(
  story: StoryWorld,
  attachments: readonly GraphMediaAttachment[],
  descriptors: ReadonlyMap<string, MediaAssetDescriptor>,
): StoryWorld {
  const clone = structuredClone(story);
  if (clone.coverAssetId) clone.coverAssetId = canonicalAssetId(clone.coverAssetId);
  clone.imageHistory = hydrateHistory(clone.imageHistory, descriptors);
  clone.imageUrl = delivery(descriptors, clone.coverAssetId) ?? clone.imageUrl;

  const entityOwners = visualEntityOwners(clone);
  const byPersistenceId = new Map(
    entityOwners
      .filter(({ entity }) => entity.persistenceId)
      .map(owner => [
        canonicalAssetId(owner.entity.persistenceId as string),
        owner,
      ]),
  );
  for (const { entity } of entityOwners) {
    if (entity.imageAssetId) entity.imageAssetId = canonicalAssetId(entity.imageAssetId);
    if (entity.voiceAssetId) entity.voiceAssetId = canonicalAssetId(entity.voiceAssetId);
    entity.imageHistory = hydrateHistory(entity.imageHistory, descriptors);
    entity.imageUrl = delivery(descriptors, entity.imageAssetId) ?? entity.imageUrl;
    entity.voiceClipUrl = delivery(descriptors, entity.voiceAssetId) ?? entity.voiceClipUrl;
  }

  const chapters = new Map(
    clone.arcs.flatMap(arc => arc.chapters)
      .filter(chapter => chapter.persistenceId)
      .map(chapter => [canonicalAssetId(chapter.persistenceId as string), chapter]),
  );
  for (const chapter of chapters.values()) {
    if (chapter.heroImageAssetId) {
      chapter.heroImageAssetId = canonicalAssetId(chapter.heroImageAssetId);
      const heroImage = delivery(descriptors, chapter.heroImageAssetId);
      if (heroImage) {
        chapter.assetManifest = {
          ...(chapter.assetManifest ?? {}),
          heroImage,
        };
      }
    }
    chapter.imageHistory = hydrateHistory(chapter.imageHistory, descriptors);
  }
  for (const attachment of attachments) {
    if (!attachment.isCurrent) continue;
    const assetId = canonicalAssetId(attachment.assetId);
    const url = delivery(descriptors, assetId);
    if (!url) continue;
    if (
      attachment.purpose === 'STORY_COVER'
      && attachment.targetKind === 'STORY'
      && !attachment.chapterId
      && !attachment.entityId
      && (
        !clone.persistenceId
        || isSameAssetId(attachment.targetKey, clone.persistenceId)
      )
    ) {
      if (
        clone.coverAssetId
        && !isSameAssetId(clone.coverAssetId, assetId)
      ) {
        continue;
      }
      clone.coverAssetId = assetId;
      clone.imageUrl = url;
      continue;
    }
    if (
      attachment.entityId
      && isSameAssetId(attachment.targetKey, attachment.entityId)
      && (
        attachment.purpose === 'MANIFESTATION'
        || attachment.purpose === 'VOICE_CARD'
      )
    ) {
      const owner = byPersistenceId.get(canonicalAssetId(attachment.entityId));
      if (!owner) continue;
      if (
        attachment.targetKind !== owner.targetKind
        && attachment.targetKind !== 'ENTITY'
        && attachment.targetKind !== 'CODEX_ENTITY'
      ) {
        continue;
      }
      const { entity } = owner;
      if (attachment.purpose === 'VOICE_CARD') {
        if (
          entity.voiceAssetId
          && !isSameAssetId(entity.voiceAssetId, assetId)
        ) {
          continue;
        }
        entity.voiceAssetId = assetId;
        entity.voiceClipUrl = url;
      } else if (attachment.purpose === 'MANIFESTATION') {
        if (
          entity.imageAssetId
          && !isSameAssetId(entity.imageAssetId, assetId)
        ) {
          continue;
        }
        entity.imageAssetId = assetId;
        entity.imageUrl = url;
      }
      continue;
    }
    if (
      attachment.chapterId
      && attachment.purpose === 'CHAPTER_HERO'
      && attachment.targetKind === 'CHAPTER'
      && isSameAssetId(attachment.targetKey, attachment.chapterId)
    ) {
      const chapter = chapters.get(canonicalAssetId(attachment.chapterId));
      if (!chapter) continue;
      if (
        chapter.heroImageAssetId
        && !isSameAssetId(chapter.heroImageAssetId, assetId)
      ) {
        continue;
      }
      chapter.heroImageAssetId = assetId;
      chapter.assetManifest = { ...(chapter.assetManifest ?? {}), heroImage: url };
    }
  }
  return clone;
}

export function hydrateProfilePortraitDelivery(
  profile: UserProfile,
  descriptor: MediaAssetDescriptor | null,
): UserProfile {
  // `activePortraitId` is re-hyphenated when the profile row is hydrated while
  // the descriptor keeps the media row's own UUID form, so a strict `!==`
  // rejected the account's real portrait and returned a blank avatar.
  if (!descriptor || !isSameAssetId(profile.activePortraitId, descriptor.id)) return profile;
  return {
    ...profile,
    avatarUrl: descriptor.deliveryUrl,
    avatarMediaDescriptor: descriptor,
  };
}
