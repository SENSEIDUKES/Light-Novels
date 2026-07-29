/**
 * Journey: every permanent image owner survives the complete relational-media
 * lifecycle. Firebase Auth and the external R2/PostgreSQL engines are mocked;
 * the storage manager, outbox, HTTP clients and routers, application
 * repository, graph mapper, media resolver, local IndexedDB cache and checksum
 * verification are the production implementations.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/firebase', async () => (await import('../support/testAuth')).firebaseModuleMock());
vi.mock('firebase/auth', async () => (await import('../support/testAuth')).firebaseAuthModuleMock());
vi.mock('../../generated/dataconnect-admin', async (importActual) => {
  const actual = await importActual<Record<string, unknown>>();
  const { createDataConnectAdminMock } = await import('../support/dataConnectAdminMock');
  return createDataConnectAdminMock(actual);
});

import type { MediaAssociation, MediaAssetDescriptor } from '../../contracts/mediaAssets';
import {
  getMediaAsset,
  MediaAssetClientError,
  saveMediaAsset,
  selectMediaAsset,
} from '../../lib/media/mediaAssetClient';
import {
  resetPrivateMediaResolver,
  resolveMediaAssetForDisplay,
} from '../../lib/media/privateMediaResolver';
import {
  getUserProfile,
  persistenceRequest,
  saveUserProfile,
  selectUserPortrait,
} from '../../lib/persistence/persistenceClient';
import type { PersistentStorageManager } from '../../lib/storage/persistentStorageManager';
import type { BaseCodexEntry, Chapter, StoryWorld } from '../../types';
import {
  createCelestialHarness,
  resetCelestialWorld,
  stopCelestialServer,
  type CelestialHarness,
  type MediaFailureStage,
} from '../support/celestialHarness';
import {
  JOURNEY_UID,
  OTHER_UID,
  STORY_ID,
  makeStory,
} from '../support/journeyFixtures';

const ASSET = {
  portrait: '10000000-0000-4000-8000-000000000001',
  coverOld: '10000000-0000-4000-8000-000000000101',
  coverNew: '10000000-0000-4000-8000-000000000102',
  characterOld: '10000000-0000-4000-8000-000000000201',
  characterNew: '10000000-0000-4000-8000-000000000202',
  location: '10000000-0000-4000-8000-000000000301',
  artifact: '10000000-0000-4000-8000-000000000401',
  factionOld: '10000000-0000-4000-8000-000000000501',
  factionNew: '10000000-0000-4000-8000-000000000502',
  chapterOld: '10000000-0000-4000-8000-000000000601',
  chapterNew: '10000000-0000-4000-8000-000000000602',
} as const;
const PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

interface CanonicalTargets {
  character: string;
  location: string;
  artifact: string;
  faction: string;
  chapter: string;
}

type VisualCodexEntry = BaseCodexEntry & {
  imageUrl?: string;
  imageHistory?: StoryWorld['imageHistory'];
};

let harness: CelestialHarness;

beforeEach(async () => {
  resetCelestialWorld();
  harness = await createCelestialHarness();
  await harness.signIn(JOURNEY_UID, 'reader@example.com');
});

afterEach(async () => {
  await harness.dispose();
});

afterAll(async () => {
  await stopCelestialServer();
});

function entityByName(story: StoryWorld, collection: 'characters' | 'locations' | 'artifacts' | 'factions') {
  return story.memory[collection]?.[0] as VisualCodexEntry | undefined;
}

function canonicalTargets(story: StoryWorld): CanonicalTargets {
  const character = entityByName(story, 'characters')?.persistenceId;
  const location = entityByName(story, 'locations')?.persistenceId;
  const artifact = entityByName(story, 'artifacts')?.persistenceId;
  const faction = entityByName(story, 'factions')?.persistenceId;
  const chapter = story.arcs[0]?.chapters[1]?.persistenceId;
  if (!character || !location || !artifact || !faction || !chapter) {
    throw new Error('The story did not hydrate canonical PostgreSQL media targets.');
  }
  return { character, location, artifact, faction, chapter };
}

function association(
  target: 'cover' | 'character' | 'faction' | 'chapter',
  targets: CanonicalTargets,
): MediaAssociation {
  if (target === 'cover') {
    return {
      storyId: STORY_ID,
      targetKind: 'STORY',
      targetKey: STORY_ID,
      purpose: 'STORY_COVER',
    };
  }
  if (target === 'character') {
    return {
      storyId: STORY_ID,
      entityId: targets.character,
      targetKind: 'CHARACTER',
      targetKey: targets.character,
      purpose: 'MANIFESTATION',
    };
  }
  if (target === 'faction') {
    return {
      storyId: STORY_ID,
      entityId: targets.faction,
      targetKind: 'FACTION',
      targetKey: targets.faction,
      purpose: 'MANIFESTATION',
    };
  }
  return {
    storyId: STORY_ID,
    chapterId: targets.chapter,
    targetKind: 'CHAPTER',
    targetKey: targets.chapter,
    purpose: 'CHAPTER_HERO',
  };
}

async function selectPortrait(): Promise<void> {
  await selectUserPortrait({
    assetId: ASSET.portrait,
    prompt: 'A celestial auditor beneath an azure gate',
    description: 'The reader chosen Celestial Profile portrait',
    daoRank: 'Auditor',
    daoXp: 4200,
    powerStage: 'Foundation Establishment',
    equippedArtifactId: null,
    usedReferenceImage: false,
    customization: { effectIds: [] },
  }, JOURNEY_UID, '20000000-0000-4000-8000-000000000001');
}

async function publishImageSet(targets: CanonicalTargets): Promise<void> {
  await harness.publishAccountMedia({
    assetId: ASSET.portrait,
    ownerUid: JOURNEY_UID,
    targetKind: 'PORTRAIT',
    targetKey: JOURNEY_UID,
    purpose: 'CELESTIAL_PORTRAIT',
    body: 'celestial-profile-portrait',
    promptUsed: 'A celestial auditor',
  });
  await selectPortrait();

  await harness.publishMedia({
    assetId: ASSET.coverOld,
    ownerUid: JOURNEY_UID,
    storyId: STORY_ID,
    targetKind: 'STORY',
    targetKey: STORY_ID,
    purpose: 'STORY_COVER',
    body: 'cover-version-one',
    promptUsed: 'Azure Gate at dawn',
    clientHistoryId: 'cover-history-one',
    entityType: 'cover',
  });
  await harness.publishMedia({
    assetId: ASSET.coverNew,
    ownerUid: JOURNEY_UID,
    storyId: STORY_ID,
    targetKind: 'STORY',
    targetKey: STORY_ID,
    purpose: 'STORY_COVER',
    body: 'cover-version-two',
    promptUsed: 'Azure Gate beneath the moon',
    clientHistoryId: 'cover-history-two',
    entityType: 'cover',
  });

  await harness.publishMedia({
    assetId: ASSET.characterOld,
    ownerUid: JOURNEY_UID,
    storyId: STORY_ID,
    entityId: targets.character,
    targetKind: 'CHARACTER',
    targetKey: targets.character,
    purpose: 'MANIFESTATION',
    body: 'character-version-one',
    promptUsed: 'Lin Shuye, novice auditor',
    clientHistoryId: 'character-history-one',
    entityType: 'character',
  });
  await harness.publishMedia({
    assetId: ASSET.characterNew,
    ownerUid: JOURNEY_UID,
    storyId: STORY_ID,
    entityId: targets.character,
    targetKind: 'CHARACTER',
    targetKey: targets.character,
    purpose: 'MANIFESTATION',
    body: 'character-version-two',
    promptUsed: 'Lin Shuye, celestial auditor',
    clientHistoryId: 'character-history-two',
    entityType: 'character',
  });

  const manifestations = [
    ['location', ASSET.location, targets.location, 'LOCATION', 'Azure Gate in cloud'],
    ['artifact', ASSET.artifact, targets.artifact, 'ARTIFACT', 'The Ledger of Names'],
  ] as const;
  for (const [entityType, assetId, entityId, targetKind, promptUsed] of manifestations) {
    await harness.publishMedia({
      assetId,
      ownerUid: JOURNEY_UID,
      storyId: STORY_ID,
      entityId,
      targetKind,
      targetKey: entityId,
      purpose: 'MANIFESTATION',
      body: `${entityType}-manifestation`,
      promptUsed,
      clientHistoryId: `${entityType}-history-one`,
      entityType,
    });
  }
  await harness.publishMedia({
    assetId: ASSET.factionOld,
    ownerUid: JOURNEY_UID,
    storyId: STORY_ID,
    entityId: targets.faction,
    targetKind: 'FACTION',
    targetKey: targets.faction,
    purpose: 'MANIFESTATION',
    body: 'faction-manifestation-one',
    promptUsed: 'Azure Gate Sect before the schism',
    clientHistoryId: 'faction-history-one',
    entityType: 'faction',
  });
  await harness.publishMedia({
    assetId: ASSET.factionNew,
    ownerUid: JOURNEY_UID,
    storyId: STORY_ID,
    entityId: targets.faction,
    targetKind: 'FACTION',
    targetKey: targets.faction,
    purpose: 'MANIFESTATION',
    body: 'faction-manifestation-two',
    promptUsed: 'Azure Gate Sect reunited',
    clientHistoryId: 'faction-history-two',
    entityType: 'faction',
  });

  await harness.publishMedia({
    assetId: ASSET.chapterOld,
    ownerUid: JOURNEY_UID,
    storyId: STORY_ID,
    chapterId: targets.chapter,
    targetKind: 'CHAPTER',
    targetKey: targets.chapter,
    purpose: 'CHAPTER_HERO',
    body: 'chapter-hero-version-one',
    promptUsed: 'The sealed vault',
    clientHistoryId: 'chapter-history-one',
    entityType: 'chapterHero',
    chapterNumber: 2,
    arcTitle: 'Act I: The Thousand Steps',
  });
  await harness.publishMedia({
    assetId: ASSET.chapterNew,
    ownerUid: JOURNEY_UID,
    storyId: STORY_ID,
    chapterId: targets.chapter,
    targetKind: 'CHAPTER',
    targetKey: targets.chapter,
    purpose: 'CHAPTER_HERO',
    body: 'chapter-hero-version-two',
    promptUsed: 'The vault opens',
    clientHistoryId: 'chapter-history-two',
    entityType: 'chapterHero',
    chapterNumber: 2,
    arcTitle: 'Act I: The Thousand Steps',
  });
}

function expectCurrentImage(
  value: VisualCodexEntry | undefined,
  assetId: string,
): void {
  expect(value).toMatchObject({
    imageAssetId: assetId,
    imageUrl: expect.stringMatching(/^blob:/),
  });
  expect(value?.imageHistory?.find(image => image.assetId === assetId)?.isCurrent).toBe(true);
}

function expectCurrentChapter(chapter: Chapter | undefined, assetId: string): void {
  expect(chapter).toMatchObject({
    heroImageAssetId: assetId,
    assetManifest: { heroImage: expect.stringMatching(/^blob:/) },
  });
  expect(chapter?.imageHistory?.find(image => image.assetId === assetId)?.isCurrent).toBe(true);
}

function expectFullImageSet(
  story: StoryWorld | null,
  selected: { cover: string; character: string; faction: string; chapter: string },
): asserts story is StoryWorld {
  expect(story?.persistenceHydration).toBe('full');
  expect(story).toMatchObject({
    coverAssetId: selected.cover,
    imageUrl: expect.stringMatching(/^blob:/),
  });
  expect(story?.imageHistory?.find(image => image.assetId === selected.cover)?.isCurrent).toBe(true);
  expectCurrentImage(entityByName(story!, 'characters'), selected.character);
  expectCurrentImage(entityByName(story!, 'locations'), ASSET.location);
  expectCurrentImage(entityByName(story!, 'artifacts'), ASSET.artifact);
  expectCurrentImage(entityByName(story!, 'factions'), selected.faction);
  expectCurrentChapter(story?.arcs[0]?.chapters[1], selected.chapter);
}

async function rawLocalStory(storage: PersistentStorageManager): Promise<StoryWorld | null> {
  const local = Reflect.get(storage, 'localAdapter') as {
    getStory(id: string): Promise<StoryWorld | null>;
  };
  return local.getStory(STORY_ID);
}

describe('complete permanent-image restoration journey', () => {
  it('restores every owner, history selection and signed projection across accounts and devices', async () => {
    await saveUserProfile({ uid: JOURNEY_UID, username: 'LedgerKeeper' });
    await harness.storage.saveStory(makeStory());
    await harness.sync({ catalog: true, deep: true });

    // Re-open through the real read graph so every media association uses the
    // canonical PostgreSQL entity/chapter id, never a stable display key.
    const canonicalDevice = await harness.newDevice();
    await harness.signIn(JOURNEY_UID, 'reader@example.com');
    const canonicalStory = await canonicalDevice.getStory(STORY_ID);
    expect(canonicalStory).not.toBeNull();
    const targets = canonicalTargets(canonicalStory!);

    await publishImageSet(targets);
    await harness.sync({ catalog: true, deep: false });

    expect(harness.store.mediaAssets.size).toBe(11);
    expect([...harness.store.mediaAssets.values()].every(asset =>
      asset.ownerUid === JOURNEY_UID && asset.status === 'READY')).toBe(true);
    // Account portraits deliberately have no story slot; UserPortrait is their
    // selection owner. Every other type has an isolated relational slot.
    expect(harness.store.mediaSlots).toHaveLength(6);
    expect(harness.store.mediaAttachments).toHaveLength(10);
    expect(harness.store.mediaSlots.some(slot =>
      slot.purpose === 'CELESTIAL_PORTRAIT')).toBe(false);

    const expectedCurrent = new Map([
      [`STORY:${STORY_ID}:STORY_COVER`, ASSET.coverNew],
      [`CHARACTER:${targets.character}:MANIFESTATION`, ASSET.characterNew],
      [`LOCATION:${targets.location}:MANIFESTATION`, ASSET.location],
      [`ARTIFACT:${targets.artifact}:MANIFESTATION`, ASSET.artifact],
      [`FACTION:${targets.faction}:MANIFESTATION`, ASSET.factionNew],
      [`CHAPTER:${targets.chapter}:CHAPTER_HERO`, ASSET.chapterNew],
    ]);
    for (const slot of harness.store.mediaSlots) {
      expect(slot.storyId).toBe(STORY_ID);
      expect(slot.currentAssetId).toBe(
        expectedCurrent.get(`${slot.targetKind}:${slot.targetKey}:${slot.purpose}`),
      );
    }
    expect(harness.store.mediaAttachments.filter(entry =>
      entry.entityId === targets.character)).toHaveLength(2);
    expect(harness.store.mediaAttachments.filter(entry =>
      entry.chapterId === targets.chapter)).toHaveLength(2);
    expect(harness.store.mediaAttachments.filter(entry =>
      entry.targetKind === 'STORY')).toHaveLength(2);
    expect(harness.store.mediaAttachments.filter(entry =>
      entry.entityId === targets.faction)).toHaveLength(2);

    const relationalHistory = structuredClone(harness.store.mediaAttachments);
    const fresh = await harness.newDevice();
    await harness.signIn(JOURNEY_UID, 'reader@example.com');

    // Library Hub first paint stays summary-only and resolves only its cover.
    const catalog = await fresh.getStories();
    expect(catalog).toHaveLength(1);
    expect(catalog[0]).toMatchObject({
      persistenceHydration: 'summary',
      coverAssetId: ASSET.coverNew,
      imageUrl: expect.stringMatching(/^blob:/),
      arcs: [],
    });
    expect(Object.keys(catalog[0].mediaDescriptors ?? {})).toEqual([ASSET.coverNew]);
    expect(harness.store.mediaAttachments).toEqual(relationalHistory);

    const opened = await fresh.getStory(STORY_ID);
    expectFullImageSet(opened, {
      cover: ASSET.coverNew,
      character: ASSET.characterNew,
      faction: ASSET.factionNew,
      chapter: ASSET.chapterNew,
    });
    expect(opened.imageHistory).toHaveLength(2);
    expect(entityByName(opened, 'characters')?.imageHistory).toHaveLength(2);
    expect(opened.arcs[0].chapters[1].imageHistory).toHaveLength(2);

    const profile = await getUserProfile();
    expect(profile).toMatchObject({
      activePortraitId: ASSET.portrait,
      avatarUrl: expect.stringMatching(/^blob:/),
      avatarMediaDescriptor: {
        id: ASSET.portrait,
        deliveryUrl: '',
      },
    });

    // The local relational replica keeps only canonical IDs and blank delivery
    // descriptors. Object URLs and signatures are page-local projections.
    const durableStory = JSON.stringify(await rawLocalStory(fresh));
    expect(durableStory).not.toMatch(/(?:blob:|data:image|signature=|[?&]expires=)/);
    expect(durableStory).not.toContain(harness.origin);

    // Same-device reload exercises IndexedDB story restoration separately from
    // the empty-cache/fresh-device path.
    const reloaded = await harness.reload();
    await harness.signIn(JOURNEY_UID, 'reader@example.com');
    expectFullImageSet(await reloaded.getStory(STORY_ID), {
      cover: ASSET.coverNew,
      character: ASSET.characterNew,
      faction: ASSET.factionNew,
      chapter: ASSET.chapterNew,
    });

    // Selection goes through the real media client and Express media router.
    await selectMediaAsset(ASSET.coverOld, association('cover', targets));
    await selectMediaAsset(ASSET.characterOld, association('character', targets));
    await selectMediaAsset(ASSET.factionOld, association('faction', targets));
    await selectMediaAsset(ASSET.chapterOld, association('chapter', targets));
    const selectedFresh = await harness.newDevice();
    await harness.signIn(JOURNEY_UID, 'reader@example.com');
    expectFullImageSet(await selectedFresh.getStory(STORY_ID), {
      cover: ASSET.coverOld,
      character: ASSET.characterOld,
      faction: ASSET.factionOld,
      chapter: ASSET.chapterOld,
    });

    // A cover cannot impersonate a character manifestation even for its owner.
    await expect(selectMediaAsset(
      ASSET.coverNew,
      association('character', targets),
    )).rejects.toMatchObject({
      code: 'history_asset_not_found',
      status: 404,
    });

    await harness.signOut();
    await harness.signIn(OTHER_UID, 'stranger@example.com');
    expect(await harness.storage.getStories()).toEqual([]);
    expect((await getUserProfile())?.activePortraitId).not.toBe(ASSET.portrait);
    await expect(getMediaAsset(ASSET.coverOld)).rejects.toMatchObject({
      name: 'MediaAssetClientError',
      code: 'not_found',
      status: 404,
    });
    await expect(selectMediaAsset(
      ASSET.coverOld,
      association('cover', targets),
    )).rejects.toMatchObject({
      code: 'forbidden',
      status: 403,
    });

    // Re-selecting the latest versions is itself a durable revert and survives
    // one more completely empty browser profile.
    await harness.signOut();
    await harness.signIn(JOURNEY_UID, 'reader@example.com');
    await selectMediaAsset(ASSET.coverNew, association('cover', targets));
    await selectMediaAsset(ASSET.characterNew, association('character', targets));
    await selectMediaAsset(ASSET.factionNew, association('faction', targets));
    await selectMediaAsset(ASSET.chapterNew, association('chapter', targets));
    const revertedFresh = await harness.newDevice();
    await harness.signIn(JOURNEY_UID, 'reader@example.com');
    expectFullImageSet(await revertedFresh.getStory(STORY_ID), {
      cover: ASSET.coverNew,
      character: ASSET.characterNew,
      faction: ASSET.factionNew,
      chapter: ASSET.chapterNew,
    });

    // An expired historical projection is refreshed by canonical asset id. It
    // is not treated as a deleted image merely because its old URL expired.
    resetPrivateMediaResolver();
    const expired = await getMediaAsset(ASSET.coverOld);
    const resolved = await resolveMediaAssetForDisplay({
      ...expired,
      deliveryUrlExpiresAt: '2000-01-01T00:00:00.000Z',
    });
    expect(resolved).toMatchObject({
      assetId: ASSET.coverOld,
      url: expect.stringMatching(/^blob:/),
      descriptor: {
        deliveryUrl: expect.stringContaining(`/media-object/${ASSET.coverOld}`),
      },
    });
  });

  it.each([
    ['upload', 'upload_failed', 502],
    ['association', 'forbidden', 403],
    ['database', 'database_commit_failed', 503],
  ] as const)('surfaces a distinct %s failure without fabricating an asset', async (
    stage,
    code,
    status,
  ) => {
    await harness.storage.saveStory(makeStory());
    await harness.sync();
    const before = harness.store.mediaAssets.size;
    harness.failNextMediaStage(stage as MediaFailureStage);

    const failure = saveMediaAsset({
      source: PNG_DATA_URL,
      assetType: 'IMAGE',
      purpose: 'STORY_COVER',
      association: {
        storyId: STORY_ID,
        targetKind: 'STORY',
        targetKey: STORY_ID,
      },
      idempotencyKey: `30000000-0000-4000-8000-00000000000${
        stage === 'upload' ? '1' : stage === 'association' ? '2' : '3'
      }`,
    });

    await expect(failure).rejects.toMatchObject({
      name: 'MediaAssetClientError',
      code,
      status,
    } satisfies Partial<MediaAssetClientError>);
    expect(harness.store.mediaAssets.size).toBe(before);
  });

  it('keeps catalog and full-story identity during signing failure, then renders the same asset after recovery', async () => {
    await harness.storage.saveStory(makeStory());
    await harness.sync();
    const saved = await saveMediaAsset({
      source: PNG_DATA_URL,
      assetType: 'IMAGE',
      purpose: 'STORY_COVER',
      association: {
        storyId: STORY_ID,
        targetKind: 'STORY',
        targetKey: STORY_ID,
      },
      idempotencyKey: '30000000-0000-4000-8000-000000000004',
    });

    // The upload travelled through the browser client, real Express media
    // router and real MediaAssetService before the in-memory R2/PostgreSQL
    // boundaries recorded it.
    expect(saved).toMatchObject({
      status: 'READY',
      deliveryUrl: expect.stringContaining('/media-object/'),
    });
    expect(harness.store.mediaAssets.get(saved.id)).toMatchObject({
      id: saved.id,
      ownerUid: JOURNEY_UID,
      status: 'READY',
    });

    harness.failNextMediaStage('delivery');
    const catalog = await persistenceRequest<{ stories: StoryWorld[] }>('/stories');
    expect(catalog.stories[0]).toMatchObject({
      id: STORY_ID,
      coverAssetId: saved.id,
    });
    expect(catalog.stories[0].imageUrl ?? '').toBe('');

    harness.failNextMediaStage('delivery');
    const full = await persistenceRequest<{ story: StoryWorld | null }>(
      `/stories/${STORY_ID}`,
    );
    expect(full.story).toMatchObject({
      id: STORY_ID,
      coverAssetId: saved.id,
    });
    expect(full.story?.imageUrl ?? '').toBe('');

    // Delivery has its own failure mode and cannot erase or roll back the
    // canonical READY row.
    harness.failNextMediaStage('delivery');
    await expect(getMediaAsset(saved.id)).rejects.toMatchObject({
      name: 'MediaAssetClientError',
      code: 'delivery_not_configured',
      status: 503,
    });
    expect(harness.store.mediaAssets.get(saved.id)).toMatchObject({
      id: saved.id,
      ownerUid: JOURNEY_UID,
      status: 'READY',
    });
    const recovered = await getMediaAsset(saved.id);
    await expect(resolveMediaAssetForDisplay(recovered)).resolves.toMatchObject({
      assetId: saved.id,
      url: expect.stringMatching(/^blob:/),
      descriptor: {
        id: saved.id,
        deliveryUrl: expect.stringContaining('/media-object/'),
      },
    });
    expect(recovered).toMatchObject({
      id: saved.id,
      deliveryUrl: expect.stringContaining('/media-object/'),
    } satisfies Partial<MediaAssetDescriptor>);
  });
});
