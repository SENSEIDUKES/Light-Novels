/**
 * Journey: generated chapters, chapter edits, Living Codex entries and Codex
 * imagery must reach PostgreSQL and still be there after the browser is
 * reloaded or the account is opened on another device.
 *
 * These run against the real persistence stack (see `celestialHarness`).
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
  STORY_ID,
  makeChapterContent,
  makeStory,
} from '../support/journeyFixtures';

const ENTITY_ASSET_ID = '2c4e8a10-9b3d-4f57-8c21-6e0d5a7b9f34';

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

describe('Chapter persistence journey', () => {
  /**
   * Regression: the first content write for a freshly scaffolded chapter was
   * rejected with `revision_conflict` because the server compared the client's
   * "no body yet" expectation against the chapter *scaffold* row. The write
   * stayed in the outbox forever and the prose was lost on reload.
   */
  it('publishes a newly generated chapter to the cloud on the first attempt', async () => {
    await harness.storage.saveStory(makeStory());
    await harness.sync();
    await harness.storage.saveChapterContent(makeChapterContent());
    await harness.sync();

    expect(harness.store.mutationLog).toContain('AdminUpsertChapterContentGraph');

    const fresh = await harness.newDevice();
    await harness.signIn(JOURNEY_UID, 'reader@example.com');
    const content = await fresh.getChapterContent(STORY_ID, 2);

    expect(content?.generatedContent).toContain('azure gate hummed');
    expect(content?.blocks).toHaveLength(4);
  });

  it('keeps a chapter edit after a reload and republishes it to the cloud', async () => {
    await harness.storage.saveStory(makeStory());
    await harness.storage.saveChapterContent(makeChapterContent());
    await harness.sync();

    const original = makeChapterContent();
    await harness.storage.saveChapterContent({
      ...original,
      generatedContent: `${original.generatedContent}\n\nThe auditor closed the ledger.`,
      blocks: [
        ...original.blocks!,
        { id: 'block-5', type: 'narration', text: 'The auditor closed the ledger.' },
      ],
      summary: 'Shuye breaks through and closes the ledger.',
      updatedAt: '2026-01-07T09:00:00.000Z',
    });
    await harness.sync();

    const fresh = await harness.newDevice();
    await harness.signIn(JOURNEY_UID, 'reader@example.com');
    const content = await fresh.getChapterContent(STORY_ID, 2);

    expect(content?.generatedContent).toContain('The auditor closed the ledger.');
    expect(content?.blocks?.map((block) => block.id)).toContain('block-5');
    expect(content?.summary).toBe('Shuye breaks through and closes the ledger.');
  });

  it('preserves immersion annotations — speakers, system events and cue payload', async () => {
    await harness.storage.saveStory(makeStory());
    await harness.storage.saveChapterContent(makeChapterContent());
    await harness.sync();

    const fresh = await harness.newDevice();
    await harness.signIn(JOURNEY_UID, 'reader@example.com');
    const content = await fresh.getChapterContent(STORY_ID, 2);

    const dialogue = content?.blocks?.find((block) => block.type === 'dialogue');
    expect(dialogue?.metadata?.speakerName).toBe('Elder Kang');
    expect(dialogue?.metadata?.emotion).toBe('contempt');

    const system = content?.blocks?.find((block) => block.type === 'system');
    expect(system?.system?.title).toBe('Realm Ascension');
    expect(system?.system?.promptType).toBe('breakthrough');
    expect(system?.system?.rows?.[0]).toEqual({
      label: 'Realm',
      value: 'Foundation Establishment',
    });

    const narration = content?.blocks?.find((block) => block.type === 'narration');
    expect(narration?.metadata?.music?.mood).toBe('travel');
    expect(narration?.metadata?.atmosphereCategory).toBe('wind');
    expect(content?.cuePayload?.sceneType).toBe('ascent');
  });

  it('does not lose a chapter body when a block carries a temporary provider preview', async () => {
    await harness.storage.saveStory(makeStory());
    const content = makeChapterContent();
    await harness.storage.saveChapterContent({
      ...content,
      blocks: [
        ...content.blocks!,
        {
          id: 'block-preview',
          type: 'world-card',
          text: 'Sealed Vault',
          worldCard: {
            entityType: 'location',
            entityName: 'Sealed Vault',
            displayTitle: 'Sealed Vault',
            // A provider preview the reader renders inline; it is not permanent
            // metadata and must be dropped rather than failing the whole write.
            imageUrl: 'https://image.pollinations.ai/prompt/sealed-vault',
          },
        },
      ],
    });
    await harness.sync();

    const fresh = await harness.newDevice();
    await harness.signIn(JOURNEY_UID, 'reader@example.com');
    const stored = await fresh.getChapterContent(STORY_ID, 2);

    expect(stored?.generatedContent).toContain('azure gate hummed');
    expect(stored?.blocks?.map((block) => block.id)).toContain('block-preview');
    expect(JSON.stringify(stored)).not.toContain('image.pollinations.ai');
  });
});

describe('Living Codex journey', () => {
  it('keeps a new Codex entry and its attributes after a reload', async () => {
    const story = makeStory();
    await harness.storage.saveStory(story);
    await harness.sync();

    await harness.storage.saveStory({
      ...story,
      updatedAt: '2026-01-08T09:00:00.000Z',
      memory: {
        ...story.memory,
        characters: [
          ...story.memory.characters,
          {
            id: 'shen-liu',
            name: 'Shen Liu',
            role: 'Ally',
            description: 'A wandering scribe who owes Shuye a debt.',
            relationshipToMC: 'ally',
            status: 'alive',
            powerLevel: 'Qi Condensation',
            faction: 'Azure Gate',
            aliases: ['The Scribe'],
            signatureQuote: 'Ink outlives iron.',
          },
        ],
      },
    });
    await harness.sync();

    const fresh = await harness.newDevice();
    await harness.signIn(JOURNEY_UID, 'reader@example.com');
    const reloaded = await fresh.getStory(STORY_ID);
    const scribe = reloaded?.memory.characters.find((entry) => entry.id === 'shen-liu');

    expect(scribe?.name).toBe('Shen Liu');
    expect(scribe?.powerLevel).toBe('Qi Condensation');
    expect(scribe?.faction).toBe('Azure Gate');
    expect(scribe?.aliases).toContain('The Scribe');
    expect(scribe?.signatureQuote).toBe('Ink outlives iron.');
  });

  it('keeps an edited Codex description and a removed entry after a reload', async () => {
    const story = makeStory();
    await harness.storage.saveStory(story);
    await harness.sync();

    await harness.storage.saveStory({
      ...story,
      updatedAt: '2026-01-09T09:00:00.000Z',
      memory: {
        ...story.memory,
        characters: story.memory.characters
          .filter((entry) => entry.id !== 'elder-kang')
          .map((entry) => ({ ...entry, description: 'Rewritten by the author.' })),
      },
    });
    await harness.sync();

    const fresh = await harness.newDevice();
    await harness.signIn(JOURNEY_UID, 'reader@example.com');
    const reloaded = await fresh.getStory(STORY_ID);

    expect(reloaded?.memory.characters.map((entry) => entry.id)).toEqual(['lin-shuye']);
    expect(reloaded?.memory.characters[0].description).toBe('Rewritten by the author.');
  });

  it('renders a manifested Codex image on a fresh device from its canonical asset id', async () => {
    const story = makeStory();
    await harness.storage.saveStory(story);
    await harness.sync();

    // The entity's relational id is the association key the media slot uses,
    // and it is assigned by the server — read it back the way the app does.
    const downloaded = await harness.newDevice();
    await harness.signIn(JOURNEY_UID, 'reader@example.com');
    const entityId = (await downloaded.getStory(STORY_ID))?.memory.characters.find(
      (entry) => entry.id === 'lin-shuye',
    )?.persistenceId;
    expect(entityId).toBeTruthy();

    await harness.publishMedia({
      assetId: ENTITY_ASSET_ID,
      ownerUid: JOURNEY_UID,
      storyId: STORY_ID,
      entityId,
      targetKind: 'CHARACTER',
      targetKey: entityId!,
      purpose: 'MANIFESTATION',
      body: 'lin-shuye-portrait-bytes',
      promptUsed: 'a ledger-keeper on a cloud stair',
    });

    const fresh = await harness.newDevice();
    await harness.signIn(JOURNEY_UID, 'reader@example.com');
    const reloaded = await fresh.getStory(STORY_ID);
    const shuye = reloaded?.memory.characters.find((entry) => entry.id === 'lin-shuye');

    expect(shuye?.imageAssetId).toBe(ENTITY_ASSET_ID);
    expect(shuye?.imageUrl).toMatch(/^blob:/);
    expect(JSON.stringify(await fresh.getStory(STORY_ID))).not.toContain('signature=');
  });
});
