import { describe, expect, it } from 'vitest';
import type { GeneratedImage, StoryWorld } from '../../types';
import {
  normalizeStoryImageOwnership,
  UnownedLegacyImageError,
} from './imageOwnership';

function image(overrides: Partial<GeneratedImage> = {}): GeneratedImage {
  return {
    id: 'image-1',
    entityId: 'character-local',
    entityType: 'character',
    imageUrl: 'https://media.example/image-1.png',
    promptUsed: 'A precise visual manifestation.',
    createdAt: '2026-07-20T00:00:00.000Z',
    isCurrent: false,
    ...overrides,
  };
}

function storyWithLegacyCombinedHistory(): StoryWorld {
  return {
    id: 'story-1',
    title: 'The Azure Archive',
    genre: 'xianxia',
    mcName: 'Wei',
    customPremise: 'A scholar pursues an ancient archive.',
    createdAt: '2026-07-20T00:00:00.000Z',
    updatedAt: '2026-07-20T00:00:00.000Z',
    currentChapterNumber: 1,
    memory: {
      powerSystem: 'Qi',
      currentPowerStage: 'Mortal',
      worldRules: [],
      unresolvedPlotThreads: [],
      resolvedPlotThreads: [],
      characters: [
        {
          id: 'character-local',
          persistenceId: 'character-db',
          name: 'Lan',
          role: 'Guide',
          description: 'A frost-robed guide.',
          relationshipToMC: 'Mentor',
          status: 'alive',
          // This duplicate must remain once, retaining its existing URL.
          imageHistory: [image({ id: 'owner-character-old', assetId: 'character-old' })],
        },
        {
          id: 'beast-local',
          name: 'Cloud Lion',
          role: 'Spirit beast',
          description: 'A silver-maned guardian.',
          relationshipToMC: 'Bonded companion',
          status: 'alive',
          isBeast: true,
        },
      ],
      locations: [
        {
          id: 'location-local',
          persistenceId: 'location-db',
          name: 'Jade Observatory',
          description: 'An observatory above the clouds.',
        },
      ],
      artifacts: [
        {
          id: 'artifact-local',
          name: 'Mirror of Returning Stars',
          description: 'A relic that reflects possible futures.',
        },
      ],
      factions: [
        {
          id: 'faction-local',
          persistenceId: 'faction-db',
          name: 'The Archive Keepers',
          description: 'Guardians of sealed knowledge.',
          alignment: 'Mysterious',
        },
      ],
    },
    arcs: [
      {
        title: 'The First Seal',
        isCompleted: false,
        chapters: [
          {
            persistenceId: 'chapter-db-1',
            number: 1,
            title: 'The Observatory',
            premise: 'Wei reaches the archive.',
            status: 'unread',
          },
        ],
      },
    ],
    imageHistory: [
      image({
        id: 'cover-old',
        assetId: 'cover-old',
        entityId: 'story-1',
        entityType: 'cover',
      }),
      image({
        id: 'cover-current',
        assetId: 'cover-current',
        entityId: 'story-1',
        entityType: 'cover',
        imageUrl: 'https://media.example/cover-current.png',
        isCurrent: true,
      }),
      image({
        id: 'legacy-character-duplicate',
        assetId: 'character-old',
        entityId: 'character-db',
        entityType: 'character',
      }),
      image({
        id: 'legacy-character-current',
        assetId: 'character-current',
        entityId: 'character-db',
        entityType: 'character',
        isCurrent: true,
      }),
      image({
        id: 'legacy-beast',
        assetId: 'beast-asset',
        entityId: 'beast-local',
        entityType: 'beast',
      }),
      image({
        id: 'legacy-location',
        assetId: 'location-asset',
        entityId: 'location-db',
        entityType: 'location',
      }),
      image({
        id: 'legacy-artifact',
        assetId: 'artifact-asset',
        entityId: 'artifact-local',
        entityType: 'artifact',
      }),
      image({
        id: 'legacy-faction',
        assetId: 'faction-asset',
        entityId: 'faction-db',
        entityType: 'faction',
      }),
      image({
        id: 'legacy-chapter',
        assetId: 'chapter-asset',
        entityId: 'chapter-hero-1',
        entityType: 'chapterHero',
        imageUrl: 'https://media.example/chapter-asset.png',
        isCurrent: true,
      }),
    ],
  };
}

function assetIds(images: GeneratedImage[] | undefined): string[] {
  return (images ?? []).flatMap(entry => entry.assetId ? [entry.assetId] : []);
}

describe('normalizeStoryImageOwnership', () => {
  it('moves each legacy visual record to its real owner, retaining covers on the story', () => {
    const legacy = storyWithLegacyCombinedHistory();
    const normalized = normalizeStoryImageOwnership(legacy);
    const [character, beast] = normalized.memory.characters;
    const location = normalized.memory.locations?.[0];
    const artifact = normalized.memory.artifacts?.[0];
    const faction = normalized.memory.factions?.[0];
    const chapter = normalized.arcs[0].chapters[0];

    expect(assetIds(normalized.imageHistory)).toEqual(['cover-old', 'cover-current']);
    expect(normalized.coverAssetId).toBe('cover-current');
    expect(normalized.imageUrl).toBe('https://media.example/cover-current.png');

    expect(assetIds(character.imageHistory)).toEqual(['character-old', 'character-current']);
    expect(character.imageAssetId).toBe('character-current');
    expect(character.imageHistory?.[1].entityId).toBe('character-local');
    expect(assetIds(beast.imageHistory)).toEqual(['beast-asset']);
    expect(beast.imageHistory?.[0].entityType).toBe('beast');
    expect(assetIds(location?.imageHistory)).toEqual(['location-asset']);
    expect(assetIds(artifact?.imageHistory)).toEqual(['artifact-asset']);
    expect(assetIds(faction?.imageHistory)).toEqual(['faction-asset']);
    expect(assetIds(chapter.imageHistory)).toEqual(['chapter-asset']);
    expect(chapter.imageHistory?.[0]).toMatchObject({
      entityId: 'chapter-db-1',
      entityType: 'chapterHero',
      chapterNumber: 1,
    });
    expect(chapter.heroImageAssetId).toBe('chapter-asset');

    const legacyAssetIds = assetIds(legacy.imageHistory).sort();
    const ownerAssetIds = [
      ...assetIds(normalized.imageHistory),
      ...assetIds(character.imageHistory),
      ...assetIds(beast.imageHistory),
      ...assetIds(location?.imageHistory),
      ...assetIds(artifact?.imageHistory),
      ...assetIds(faction?.imageHistory),
      ...assetIds(chapter.imageHistory),
    ].sort();
    expect(ownerAssetIds).toEqual([...new Set(legacyAssetIds)].sort());

    // Normalization is a migration boundary, not an in-place mutation of the
    // caller's legacy local replica.
    expect(legacy.imageHistory).toHaveLength(9);
    expect(legacy.memory.characters[0].imageHistory).toHaveLength(1);
  });

  it('refuses to silently drop a legacy image whose owner no longer exists', () => {
    const legacy = storyWithLegacyCombinedHistory();
    legacy.imageHistory = [image({
      id: 'orphaned-location',
      assetId: 'orphan-asset',
      entityId: 'deleted-location',
      entityType: 'location',
    })];

    expect(() => normalizeStoryImageOwnership(legacy)).toThrow(UnownedLegacyImageError);
    expect(() => normalizeStoryImageOwnership(legacy)).toThrow(
      'Cannot relocate legacy location image orphaned-location',
    );
  });

  it('sanitizes malformed cached collections instead of crashing on them', () => {
    const malformed = storyWithLegacyCombinedHistory() as unknown as {
      memory: { characters: unknown; locations: unknown };
      arcs: unknown;
      imageHistory: unknown;
    };
    malformed.memory.characters = { stale: true };
    malformed.memory.locations = 'stale';
    malformed.arcs = { stale: true };
    malformed.imageHistory = { stale: true };

    expect(() => normalizeStoryImageOwnership(malformed as StoryWorld)).not.toThrow();
    const normalized = normalizeStoryImageOwnership(malformed as StoryWorld);
    expect(normalized.memory.characters).toEqual([]);
    expect(normalized.memory.locations).toEqual([]);
    expect(normalized.arcs).toEqual([]);
    expect(normalized.imageHistory).toEqual([]);
  });
});
