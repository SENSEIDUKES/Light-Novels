import type { GeneratedImage, StoryWorld } from '../../types';

type ImageOwner = {
  id: string;
  persistenceId?: string;
  imageHistory?: GeneratedImage[];
  imageAssetId?: string;
  imageUrl?: string;
  isBeast?: boolean;
};

type ChapterOwner = StoryWorld['arcs'][number]['chapters'][number];

/**
 * Legacy clients stored every visual record in `story.imageHistory`. Media slots
 * have always had a narrower owner, so collapse those duplicate records into the
 * actual owner before state is rendered or persisted. Refuse to erase a record
 * whose owner no longer exists; callers can surface that data problem instead of
 * silently losing an image.
 */
export class UnownedLegacyImageError extends Error {
  constructor(image: GeneratedImage) {
    super(`Cannot relocate legacy ${image.entityType} image ${image.id}: its owner is unavailable.`);
    this.name = 'UnownedLegacyImageError';
  }
}

function historyKey(image: GeneratedImage): string {
  return image.assetId || image.id || image.imageUrl;
}

function mergeHistory(
  existing: GeneratedImage[] | undefined,
  additions: readonly GeneratedImage[],
): GeneratedImage[] | undefined {
  if (!existing?.length && additions.length === 0) return existing;
  const merged: GeneratedImage[] = [];
  const seen = new Set<string>();
  for (const image of [...(existing ?? []), ...additions]) {
    const key = historyKey(image);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(image);
  }
  return merged;
}

function legacyChapterNumber(image: GeneratedImage): number | undefined {
  if (Number.isInteger(image.chapterNumber) && (image.chapterNumber as number) > 0) {
    return image.chapterNumber;
  }
  const match = /^chapter-hero-(\d+)$/.exec(image.entityId);
  const parsed = match ? Number(match[1]) : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function currentOwnerImage<T extends ImageOwner>(owner: T, image: GeneratedImage): T {
  if (!image.isCurrent) return owner;
  return {
    ...owner,
    imageAssetId: owner.imageAssetId ?? image.assetId,
    imageUrl: owner.imageUrl || image.imageUrl,
  };
}

function currentChapterImage(chapter: ChapterOwner, image: GeneratedImage): ChapterOwner {
  if (!image.isCurrent) return chapter;
  return {
    ...chapter,
    heroImageAssetId: chapter.heroImageAssetId ?? image.assetId,
    assetManifest: image.imageUrl && !chapter.assetManifest?.heroImage
      ? { ...(chapter.assetManifest ?? {}), heroImage: image.imageUrl }
      : chapter.assetManifest,
  };
}

function sameOwner(owner: ImageOwner, image: GeneratedImage): boolean {
  return image.entityId === owner.id || image.entityId === owner.persistenceId;
}

function copyOwners<T extends ImageOwner>(owners: readonly T[] | undefined): T[] {
  return (owners ?? []).map(owner => ({ ...owner }));
}

/**
 * Return an owner-scoped image shape without mutating the original story. The
 * story retains covers only; Codex and chapter visuals retain their full history
 * on the object that owns the media slot.
 */
export function normalizeStoryImageOwnership(story: StoryWorld): StoryWorld {
  // Catalog summaries and small test/repair payloads can omit the full Codex.
  // Leave such a shell untouched; a complete StoryWorld takes the migration
  // path below when its owners are actually present.
  const memory = story.memory;
  const characters = copyOwners(memory?.characters);
  const locations = copyOwners(memory?.locations);
  const artifacts = copyOwners(memory?.artifacts);
  const factions = copyOwners(memory?.factions);
  const hasArcs = Array.isArray(story.arcs);
  const arcs = (story.arcs ?? []).map(arc => ({
    ...arc,
    chapters: (arc.chapters ?? []).map(chapter => ({ ...chapter })),
  }));
  const legacyHistory = story.imageHistory ?? [];
  const isStoryCover = (image: GeneratedImage) => image.entityType === 'cover'
    || (!image.entityType && (!image.entityId
      || image.entityId === story.id
      || image.entityId === story.persistenceId));
  const covers = legacyHistory
    .filter(isStoryCover)
    .map(image => image.entityType === 'cover'
      ? image
      : { ...image, entityId: story.id, entityType: 'cover' as const });
  const ownerAdditions = new Map<ImageOwner | ChapterOwner, GeneratedImage[]>();

  const addToOwner = (owner: ImageOwner | ChapterOwner, image: GeneratedImage) => {
    ownerAdditions.set(owner, [...(ownerAdditions.get(owner) ?? []), image]);
  };

  for (const image of legacyHistory) {
    if (isStoryCover(image)) continue;

    if (image.entityType === 'chapterHero') {
      const number = legacyChapterNumber(image);
      const chapter = number === undefined
        ? undefined
        : arcs.flatMap(arc => arc.chapters).find(candidate => candidate.number === number);
      if (!chapter) throw new UnownedLegacyImageError(image);
      addToOwner(chapter, {
        ...image,
        entityId: chapter.persistenceId ?? `chapter-hero-${chapter.number}`,
        entityType: 'chapterHero',
        chapterNumber: chapter.number,
      });
      continue;
    }

    const candidates = image.entityType === 'character' || image.entityType === 'beast'
      ? characters
      : image.entityType === 'location'
        ? locations
        : image.entityType === 'artifact'
          ? artifacts
          : image.entityType === 'faction'
            ? factions
            : [];
    const owner: ImageOwner | undefined = candidates.find(candidate => sameOwner(candidate, image));
    if (!owner) throw new UnownedLegacyImageError(image);
    addToOwner(owner, {
      ...image,
      entityId: owner.id,
      entityType: owner.isBeast ? 'beast' : image.entityType,
    });
  }

  const normalizeOwner = <T extends ImageOwner>(owner: T): T => {
    const additions = ownerAdditions.get(owner) ?? [];
    const history = mergeHistory(owner.imageHistory, additions);
    const withHistory = history === undefined
      ? { ...owner }
      : { ...owner, imageHistory: history };
    return additions.reduce(currentOwnerImage, withHistory);
  };
  const normalizedChapters = arcs.map(arc => ({
    ...arc,
    chapters: arc.chapters.map(chapter => {
      const additions = ownerAdditions.get(chapter) ?? [];
      const history = mergeHistory(chapter.imageHistory, additions);
      const withHistory = history === undefined
        ? { ...chapter }
        : { ...chapter, imageHistory: history };
      return additions.reduce(currentChapterImage, withHistory);
    }),
  }));
  const currentCover = covers.find(image => image.isCurrent);
  const normalizedMemory = memory
    ? { ...memory }
    : undefined;
  if (normalizedMemory && Array.isArray(memory?.characters)) {
    normalizedMemory.characters = characters.map(normalizeOwner);
  }
  if (normalizedMemory && memory?.locations !== undefined) {
    normalizedMemory.locations = locations.map(normalizeOwner);
  }
  if (normalizedMemory && memory?.artifacts !== undefined) {
    normalizedMemory.artifacts = artifacts.map(normalizeOwner);
  }
  if (normalizedMemory && memory?.factions !== undefined) {
    normalizedMemory.factions = factions.map(normalizeOwner);
  }

  const normalizedStory: StoryWorld = { ...story };
  if (story.imageHistory !== undefined) normalizedStory.imageHistory = covers;
  if (!normalizedStory.coverAssetId && currentCover?.assetId) {
    normalizedStory.coverAssetId = currentCover.assetId;
  }
  if (!normalizedStory.imageUrl && currentCover?.imageUrl) {
    normalizedStory.imageUrl = currentCover.imageUrl;
  }
  if (normalizedMemory) normalizedStory.memory = normalizedMemory;
  if (hasArcs) normalizedStory.arcs = normalizedChapters;
  return normalizedStory;
}
