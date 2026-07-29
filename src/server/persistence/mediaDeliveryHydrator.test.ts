// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { MediaAssetDescriptor } from '../../contracts/mediaAssets';
import type { StoryWorld, UserProfile } from '../../types';
import {
  hydrateProfilePortraitDelivery,
  hydrateStoryMediaDelivery,
} from './mediaDeliveryHydrator';

const COMPACT_ID = '1dc21be263c047bda086980e44d67029';
const HYPHENATED_ID = '1dc21be2-63c0-47bd-a086-980e44d67029';

function descriptor(id: string): MediaAssetDescriptor {
  return {
    id,
    ownerUid: 'owner-a',
    assetType: 'IMAGE',
    purpose: 'CELESTIAL_PORTRAIT',
    visibility: 'PRIVATE',
    status: 'READY',
    mimeType: 'image/png',
    byteSize: '128',
    checksumSha256: 'a'.repeat(64),
    version: 1,
    deliveryUrl: 'https://signed.example/portrait',
    deliveryUrlExpiresAt: '2026-07-26T00:15:00.000Z',
    createdAt: '2026-07-26T00:00:00.000Z',
    updatedAt: '2026-07-26T00:00:00.000Z',
  } as unknown as MediaAssetDescriptor;
}

function profile(activePortraitId?: string): UserProfile {
  return {
    uid: 'owner-a',
    username: 'owner',
    displayName: 'Owner',
    avatarUrl: '',
    activePortraitId,
    preferredLanguage: 'en',
    defaultTranslationLanguage: 'en',
    savedStoryCount: 0,
    activeStories: [],
    inactiveStories: [],
    joinedDate: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-26T00:00:00.000Z',
  } as unknown as UserProfile;
}

describe('hydrateProfilePortraitDelivery', () => {
  // The profile hydrator re-hyphenates activePortraitAssetId while the media
  // descriptor keeps the media row's own UUID form. A strict `!==` therefore
  // decided the account's own portrait belonged to someone else and answered
  // with a blank avatar, so a saved Celestial Portrait never came back.
  it('matches a portrait whose descriptor uses the other UUID form', () => {
    const hydrated = hydrateProfilePortraitDelivery(
      profile(HYPHENATED_ID),
      descriptor(COMPACT_ID),
    );
    expect(hydrated.avatarUrl).toBe('https://signed.example/portrait');
    expect(hydrated.avatarMediaDescriptor?.id).toBe(COMPACT_ID);
  });

  it('leaves the profile untouched for a different asset', () => {
    const original = profile(HYPHENATED_ID);
    expect(hydrateProfilePortraitDelivery(
      original,
      descriptor('99999999-9999-4999-8999-999999999999'),
    )).toBe(original);
  });

  it('leaves the profile untouched when no portrait is selected', () => {
    const original = profile();
    expect(hydrateProfilePortraitDelivery(original, descriptor(COMPACT_ID))).toBe(original);
  });
});

describe('hydrateStoryMediaDelivery', () => {
  it('matches compact graph references to canonical descriptors and target ids', () => {
    const entityIdCompact = '33333333333343338333333333333333';
    const entityIdCanonical = '33333333-3333-4333-8333-333333333333';
    const story = {
      id: 'story-1',
      title: 'Moon Archive',
      coverAssetId: COMPACT_ID,
      imageUrl: '',
      imageHistory: [{
        id: 'cover-history',
        assetId: COMPACT_ID,
        entityId: 'story-1',
        entityType: 'cover',
        imageUrl: '',
        promptUsed: 'Moon archive',
        createdAt: '2026-07-01T00:00:00.000Z',
        isCurrent: true,
      }],
      memory: {
        characters: [{
          id: 'character-1',
          persistenceId: entityIdCanonical,
          name: 'Shuye',
          imageAssetId: COMPACT_ID,
          imageUrl: '',
        }],
      },
      arcs: [],
    } as unknown as StoryWorld;

    const hydrated = hydrateStoryMediaDelivery(story, [{
      assetId: COMPACT_ID,
      // Generic CODEX_ENTITY was used by older clients and remains a valid
      // entity target as long as its relational id and purpose are exact.
      targetKind: 'CODEX_ENTITY',
      targetKey: entityIdCompact,
      purpose: 'MANIFESTATION',
      entityId: entityIdCompact,
      isCurrent: true,
    }], new Map([[HYPHENATED_ID, descriptor(HYPHENATED_ID)]]));

    expect(hydrated.coverAssetId).toBe(HYPHENATED_ID);
    expect(hydrated.imageUrl).toBe('https://signed.example/portrait');
    expect(hydrated.imageHistory?.[0]).toMatchObject({
      assetId: HYPHENATED_ID,
      imageUrl: 'https://signed.example/portrait',
    });
    expect(hydrated.memory.characters[0]).toMatchObject({
      imageAssetId: HYPHENATED_ID,
      imageUrl: 'https://signed.example/portrait',
    });
  });

  it('does not hydrate one Codex kind from another kind target', () => {
    const entityId = '33333333-3333-4333-8333-333333333333';
    const story = {
      id: 'story-1',
      title: 'Moon Archive',
      memory: {
        characters: [{
          id: 'character-1',
          persistenceId: entityId,
          name: 'Shuye',
          imageUrl: '',
        }],
      },
      arcs: [],
    } as unknown as StoryWorld;

    const hydrated = hydrateStoryMediaDelivery(story, [{
      assetId: HYPHENATED_ID,
      targetKind: 'LOCATION',
      targetKey: entityId,
      purpose: 'MANIFESTATION',
      entityId,
      isCurrent: true,
    }], new Map([[HYPHENATED_ID, descriptor(HYPHENATED_ID)]]));

    expect(hydrated.memory.characters[0]).toMatchObject({ imageUrl: '' });
    expect(hydrated.memory.characters[0].imageAssetId).toBeUndefined();
  });

  it('hydrates every chapter-owned hero version without placing it on story history', () => {
    const historicalId = '11111111-1111-4111-8111-111111111111';
    const currentId = '22222222-2222-4222-8222-222222222222';
    const chapterId = '33333333-3333-4333-8333-333333333333';
    const story = {
      id: 'story-1',
      title: 'Moon Archive',
      memory: { characters: [] },
      arcs: [{
        title: 'Arc One',
        isCompleted: false,
        chapters: [{
          persistenceId: chapterId,
          number: 1,
          title: 'Awakening',
          premise: 'Lin wakes.',
          status: 'read',
          imageHistory: [{
            id: 'hero-before',
            assetId: historicalId,
            entityId: chapterId,
            entityType: 'chapterHero',
            imageUrl: '',
            promptUsed: 'First dawn',
            createdAt: '2026-07-01T00:00:00.000Z',
            isCurrent: false,
            chapterNumber: 1,
          }, {
            id: 'hero-current',
            assetId: currentId,
            entityId: chapterId,
            entityType: 'chapterHero',
            imageUrl: '',
            promptUsed: 'Second dawn',
            createdAt: '2026-07-02T00:00:00.000Z',
            isCurrent: true,
            chapterNumber: 1,
          }],
        }],
      }],
    } as unknown as StoryWorld;
    const hydrated = hydrateStoryMediaDelivery(story, [{
      assetId: currentId,
      targetKind: 'CHAPTER',
      targetKey: chapterId,
      purpose: 'CHAPTER_HERO',
      chapterId,
      isCurrent: true,
    }], new Map([
      [historicalId, descriptor(historicalId)],
      [currentId, descriptor(currentId)],
    ]));

    const chapter = hydrated.arcs[0].chapters[0];
    expect(chapter.heroImageAssetId).toBe(currentId);
    expect(chapter.assetManifest?.heroImage).toBe('https://signed.example/portrait');
    expect(chapter.imageHistory?.map(image => image.imageUrl)).toEqual([
      'https://signed.example/portrait',
      'https://signed.example/portrait',
    ]);
    expect(hydrated.imageHistory).toBeUndefined();
    expect(story.arcs[0].chapters[0].imageHistory?.[0].imageUrl).toBe('');
  });

  it('does not let a mismatched purpose or target impersonate another image slot', () => {
    const storyId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const entityId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const chapterId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const coverId = '11111111-1111-4111-8111-111111111111';
    const manifestationId = '22222222-2222-4222-8222-222222222222';
    const chapterHeroId = '33333333-3333-4333-8333-333333333333';
    const falseCoverId = '44444444-4444-4444-8444-444444444444';
    const falseManifestationId = '55555555-5555-4555-8555-555555555555';
    const falseChapterHeroId = '66666666-6666-4666-8666-666666666666';
    const story = {
      id: 'story-client-id',
      persistenceId: storyId,
      title: 'Moon Archive',
      coverAssetId: coverId,
      memory: {
        characters: [{
          id: 'character-1',
          persistenceId: entityId,
          name: 'Shuye',
          imageAssetId: manifestationId,
          imageUrl: '',
        }],
      },
      arcs: [{
        title: 'Arc One',
        chapters: [{
          persistenceId: chapterId,
          number: 1,
          title: 'Awakening',
          premise: '',
          status: 'read',
          heroImageAssetId: chapterHeroId,
        }],
      }],
    } as unknown as StoryWorld;
    const descriptors = new Map([
      coverId,
      manifestationId,
      chapterHeroId,
      falseCoverId,
      falseManifestationId,
      falseChapterHeroId,
    ].map(id => [id, descriptor(id)]));

    const hydrated = hydrateStoryMediaDelivery(story, [{
      assetId: falseCoverId,
      targetKind: 'CHARACTER',
      targetKey: entityId,
      purpose: 'STORY_COVER',
      entityId,
      isCurrent: true,
    }, {
      assetId: falseManifestationId,
      targetKind: 'CHARACTER',
      targetKey: entityId,
      purpose: 'CHAPTER_HERO',
      entityId,
      isCurrent: true,
    }, {
      assetId: falseChapterHeroId,
      targetKind: 'STORY',
      targetKey: storyId,
      purpose: 'CHAPTER_HERO',
      chapterId,
      isCurrent: true,
    }], descriptors);

    expect(hydrated.coverAssetId).toBe(coverId);
    expect(hydrated.memory.characters[0].imageAssetId).toBe(manifestationId);
    expect(hydrated.arcs[0].chapters[0].heroImageAssetId).toBe(chapterHeroId);
  });

  it('keeps MediaSlot selections authoritative over stale current attachments', () => {
    const storyId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const entityId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const chapterId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const coverId = '11111111-1111-4111-8111-111111111111';
    const manifestationId = '22222222-2222-4222-8222-222222222222';
    const chapterHeroId = '33333333-3333-4333-8333-333333333333';
    const staleCoverId = '44444444-4444-4444-8444-444444444444';
    const staleManifestationId = '55555555-5555-4555-8555-555555555555';
    const staleChapterHeroId = '66666666-6666-4666-8666-666666666666';
    const story = {
      id: 'story-client-id',
      persistenceId: storyId,
      title: 'Moon Archive',
      coverAssetId: coverId,
      memory: {
        characters: [{
          id: 'character-1',
          persistenceId: entityId,
          name: 'Shuye',
          imageAssetId: manifestationId,
          imageUrl: '',
        }],
      },
      arcs: [{
        title: 'Arc One',
        chapters: [{
          persistenceId: chapterId,
          number: 1,
          title: 'Awakening',
          premise: '',
          status: 'read',
          heroImageAssetId: chapterHeroId,
        }],
      }],
    } as unknown as StoryWorld;
    const descriptors = new Map([
      coverId,
      manifestationId,
      chapterHeroId,
      staleCoverId,
      staleManifestationId,
      staleChapterHeroId,
    ].map(id => [
      id,
      {
        ...descriptor(id),
        deliveryUrl: `https://signed.example/${id}`,
      },
    ]));

    const hydrated = hydrateStoryMediaDelivery(story, [{
      assetId: staleCoverId,
      targetKind: 'STORY',
      targetKey: storyId,
      purpose: 'STORY_COVER',
      isCurrent: true,
    }, {
      assetId: staleManifestationId,
      targetKind: 'CHARACTER',
      targetKey: entityId,
      purpose: 'MANIFESTATION',
      entityId,
      isCurrent: true,
    }, {
      assetId: staleChapterHeroId,
      targetKind: 'CHAPTER',
      targetKey: chapterId,
      purpose: 'CHAPTER_HERO',
      chapterId,
      isCurrent: true,
    }], descriptors);

    expect(hydrated).toMatchObject({
      coverAssetId: coverId,
      imageUrl: `https://signed.example/${coverId}`,
      memory: {
        characters: [{
          imageAssetId: manifestationId,
          imageUrl: `https://signed.example/${manifestationId}`,
        }],
      },
      arcs: [{
        chapters: [{
          heroImageAssetId: chapterHeroId,
          assetManifest: {
            heroImage: `https://signed.example/${chapterHeroId}`,
          },
        }],
      }],
    });
  });
});
