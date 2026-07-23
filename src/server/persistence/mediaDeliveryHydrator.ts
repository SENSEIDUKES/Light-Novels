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
  imageUrl?: string;
  imageAssetId?: string;
  imageHistory?: GeneratedImage[];
  voiceAssetId?: string;
  voiceClipUrl?: string;
};

function visualEntities(story: StoryWorld): VisualEntity[] {
  return [
    ...story.memory.characters,
    ...(story.memory.locations ?? []),
    ...(story.memory.artifacts ?? []),
    ...(story.memory.factions ?? []),
    ...(story.memory.abilities ?? []).filter(
      (ability): ability is Exclude<typeof ability, string> => typeof ability !== 'string',
    ),
  ] as VisualEntity[];
}

function delivery(
  descriptors: ReadonlyMap<string, MediaAssetDescriptor>,
  assetId: string | undefined,
): string | undefined {
  return assetId ? descriptors.get(assetId)?.deliveryUrl : undefined;
}

function hydrateHistory(
  history: GeneratedImage[] | undefined,
  descriptors: ReadonlyMap<string, MediaAssetDescriptor>,
): GeneratedImage[] | undefined {
  return history?.map(image => ({
    ...image,
    imageUrl: delivery(descriptors, image.assetId) ?? image.imageUrl,
    assetVersion: image.assetId
      ? descriptors.get(image.assetId)?.version ?? image.assetVersion
      : image.assetVersion,
    checksumSha256: image.assetId
      ? descriptors.get(image.assetId)?.checksumSha256 ?? image.checksumSha256
      : image.checksumSha256,
    deliveryUrlExpiresAt: image.assetId
      ? descriptors.get(image.assetId)?.deliveryUrlExpiresAt ?? image.deliveryUrlExpiresAt
      : image.deliveryUrlExpiresAt,
  }));
}

/** Hydrate transient signed URLs only after canonical asset references exist. */
export function hydrateStoryMediaDelivery(
  story: StoryWorld,
  attachments: readonly GraphMediaAttachment[],
  descriptors: ReadonlyMap<string, MediaAssetDescriptor>,
): StoryWorld {
  const clone = structuredClone(story);
  clone.imageHistory = hydrateHistory(clone.imageHistory, descriptors);
  clone.imageUrl = delivery(descriptors, clone.coverAssetId) ?? clone.imageUrl;

  const byPersistenceId = new Map(
    visualEntities(clone)
      .filter(entity => entity.persistenceId)
      .map(entity => [entity.persistenceId as string, entity]),
  );
  for (const entity of visualEntities(clone)) {
    entity.imageHistory = hydrateHistory(entity.imageHistory, descriptors);
    entity.imageUrl = delivery(descriptors, entity.imageAssetId) ?? entity.imageUrl;
    entity.voiceClipUrl = delivery(descriptors, entity.voiceAssetId) ?? entity.voiceClipUrl;
  }

  const chapters = new Map(
    clone.arcs.flatMap(arc => arc.chapters)
      .filter(chapter => chapter.persistenceId)
      .map(chapter => [chapter.persistenceId as string, chapter]),
  );
  for (const attachment of attachments) {
    if (!attachment.isCurrent) continue;
    const url = delivery(descriptors, attachment.assetId);
    if (!url) continue;
    if (attachment.purpose === 'STORY_COVER') {
      clone.coverAssetId = attachment.assetId;
      clone.imageUrl = url;
      continue;
    }
    if (attachment.entityId) {
      const entity = byPersistenceId.get(attachment.entityId);
      if (!entity) continue;
      if (attachment.purpose === 'VOICE_CARD') {
        entity.voiceAssetId = attachment.assetId;
        entity.voiceClipUrl = url;
      } else {
        entity.imageAssetId = attachment.assetId;
        entity.imageUrl = url;
      }
      continue;
    }
    if (attachment.chapterId && attachment.purpose === 'CHAPTER_HERO') {
      const chapter = chapters.get(attachment.chapterId);
      if (!chapter) continue;
      chapter.heroImageAssetId = attachment.assetId;
      chapter.assetManifest = { ...(chapter.assetManifest ?? {}), heroImage: url };
    }
  }
  return clone;
}

export function hydrateProfilePortraitDelivery(
  profile: UserProfile,
  descriptor: MediaAssetDescriptor | null,
): UserProfile {
  if (!descriptor || profile.activePortraitId !== descriptor.id) return profile;
  return { ...profile, avatarUrl: descriptor.deliveryUrl };
}
