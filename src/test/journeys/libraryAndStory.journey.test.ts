/**
 * Journey: the Library loads a signed-in account's stories and cover art, and a
 * story opens to the correct chapter with the data the reader needs.
 *
 * Everything below the Firebase Auth boundary is the real stack: the storage
 * manager, the durable outbox, the HTTP persistence client, the Express
 * persistence router, the application repository and the whole graph mapper.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/firebase', async () => (await import('../support/testAuth')).firebaseModuleMock());
vi.mock('firebase/auth', async () => (await import('../support/testAuth')).firebaseAuthModuleMock());
vi.mock('../../generated/dataconnect-admin', async (importActual) => {
  const actual = await importActual<Record<string, unknown>>();
  const { createDataConnectAdminMock } = await import('../support/dataConnectAdminMock');
  return createDataConnectAdminMock(actual);
});

import {
  createCelestialHarness,
  resetCelestialWorld,
  stopCelestialServer,
  type CelestialHarness,
} from '../support/celestialHarness';
import {
  JOURNEY_UID,
  OTHER_UID,
  STORY_ID,
  makeChapterContent,
  makeStory,
} from '../support/journeyFixtures';

const COVER_ASSET_ID = '9f6bcb2c-0f2d-4d8b-93a6-4b2f9d1f7d10';

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

describe('Library journey', () => {
  it('loads the signed-in account library from PostgreSQL after a reload', async () => {
    await harness.storage.saveStory(makeStory());
    await harness.sync();

    const reloaded = await harness.reload();
    await harness.signIn(JOURNEY_UID, 'reader@example.com');
    const stories = await reloaded.getStories();

    expect(stories.map((story) => story.title)).toContain('Ledger of the Azure Gate');
    const story = stories.find((entry) => entry.id === STORY_ID);
    expect(story?.userId).toBe(JOURNEY_UID);
    expect(story?.currentChapterNumber).toBe(2);
  });

  it('renders cover art on a fresh device without persisting a signed URL', async () => {
    // Exactly what `useVisualAssets.handleApplyCover` does: commit the asset,
    // then save the story carrying the canonical asset id.
    const coverAssetId = await harness.publishMedia({
      assetId: COVER_ASSET_ID,
      ownerUid: JOURNEY_UID,
      storyId: STORY_ID,
      targetKind: 'STORY',
      targetKey: STORY_ID,
      purpose: 'STORY_COVER',
      body: 'azure-gate-cover-bytes',
    });
    await harness.storage.saveStory(
      makeStory({
        coverAssetId,
        imageUrl: `${harness.origin}/media-object/${coverAssetId}?signature=test&expires=9999`,
        updatedAt: '2026-01-06T09:00:00.000Z',
      }),
    );
    await harness.sync();

    const fresh = await harness.newDevice();
    await harness.signIn(JOURNEY_UID, 'reader@example.com');
    const story = (await fresh.getStories()).find((entry) => entry.id === STORY_ID);

    expect(story?.coverAssetId).toBe(coverAssetId);
    // The cover was downloaded, checksum-verified and handed to the UI as an
    // object URL — never as the signed link, which must not be persisted.
    expect(story?.imageUrl).toMatch(/^blob:/);
    expect(story?.mediaDescriptors?.[coverAssetId]?.deliveryUrl ?? '').toBe('');

    // The replica on disk must hold the asset id and no signature at all.
    const persisted = JSON.stringify(await fresh.getStory(STORY_ID));
    expect(persisted).not.toContain('signature=');
  });

  it('never exposes another account library to the signed-in reader', async () => {
    await harness.storage.saveStory(makeStory());
    await harness.sync();

    await harness.signOut();
    await harness.signIn(OTHER_UID, 'stranger@example.com');
    const stories = await harness.storage.getStories();

    expect(stories.find((entry) => entry.id === STORY_ID)).toBeUndefined();
  });
});

describe('Story open journey', () => {
  it('opens the requested chapter with its prose, blocks and immersion payload', async () => {
    await harness.storage.saveStory(makeStory());
    await harness.storage.saveChapterContent(makeChapterContent());
    await harness.sync();

    const reloaded = await harness.reload();
    await harness.signIn(JOURNEY_UID, 'reader@example.com');
    const content = await reloaded.getChapterContent(STORY_ID, 2);

    expect(content).not.toBeNull();
    expect(content?.chapterNumber).toBe(2);
    expect(content?.generatedContent).toContain('azure gate hummed');
    expect(content?.blocks?.map((block) => block.type)).toEqual([
      'narration',
      'dialogue',
      'system',
      'world-card',
    ]);
    expect(content?.blocks?.[1].metadata?.speakerName).toBe('Elder Kang');
    expect(content?.blocks?.[2].system?.promptType).toBe('breakthrough');
    expect(content?.blocks?.[3].worldCard?.entityName).toBe('Ledger of Names');
    expect(content?.summary).toBe('Shuye reaches the sealed vault and breaks through.');
  });

  it('hydrates the full story graph — Codex, arcs and world rules — on open', async () => {
    await harness.storage.saveStory(makeStory());
    await harness.sync();

    const reloaded = await harness.reload();
    await harness.signIn(JOURNEY_UID, 'reader@example.com');
    const story = await reloaded.getStory(STORY_ID);

    expect(story?.persistenceHydration).not.toBe('summary');
    expect(story?.memory.characters.map((character) => character.name)).toEqual(
      expect.arrayContaining(['Lin Shuye', 'Elder Kang']),
    );
    expect(story?.memory.locations?.[0].name).toBe('Azure Gate');
    expect(story?.memory.artifacts?.[0].name).toBe('Ledger of Names');
    expect(story?.memory.factions?.[0].name).toBe('Azure Gate Sect');
    expect(story?.memory.worldRules).toEqual([
      'Oaths bind spirits.',
      'Names spoken thrice summon karma.',
    ]);
    expect(story?.arcs[0].chapters.map((entry) => entry.number)).toEqual([1, 2, 3]);
    expect(story?.arcs[0].chapters[0].title).toBe('The Thousand Steps');
  });
});
