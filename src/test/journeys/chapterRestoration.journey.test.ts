/**
 * Journey: a chapter generated in one session is still generated — and still
 * readable — after signing in on a device with an empty cache, and the Library
 * Hub reports its real progress before any story graph is downloaded.
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
import { JOURNEY_UID, STORY_ID, makeChapterBlocks, makeStory } from '../support/journeyFixtures';
import { ChapterContentReadError } from '../../lib/storage/persistentStorageManager';
import type { PersistentStorageManager } from '../../lib/storage/persistentStorageManager';
import { resolveChapterCounts } from '../../lib/chapterCounts';
import type { StoryWorld } from '../../types';

const CHAPTER_COUNT = 10;

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

/** A story scaffolded the way the blueprint stage leaves it: ten empty chapters. */
function scaffoldedStory(): StoryWorld {
  return makeStory({
    currentChapterNumber: 1,
    arcs: [
      {
        title: 'Act I: The Thousand Steps',
        isCompleted: false,
        chapters: Array.from({ length: CHAPTER_COUNT }, (_, index) => ({
          number: index + 1,
          title: `Chapter ${index + 1}`,
          premise: `Premise for chapter ${index + 1}.`,
          status: 'unread' as const,
        })),
      },
    ],
  });
}

const CHAPTER_ONE_SUMMARY = 'Shuye climbs the thousand steps and reaches the gate.';

/**
 * Commit chapter 1 exactly as the generation pipeline does: prose and blocks are
 * written onto the scaffold with `_isNewContent`, and the storage manager is
 * responsible for splitting the body into its own record and leaving the
 * `hasContent` marker behind.
 */
async function generateChapterOne(storage: PersistentStorageManager): Promise<void> {
  const blocks = makeChapterBlocks();
  const story = await storage.getStory(STORY_ID);
  if (!story) throw new Error('The scaffolded story is missing.');
  story.arcs[0].chapters[0] = {
    ...story.arcs[0].chapters[0],
    _isNewContent: true,
    generatedContent: blocks.map((block) => block.text).join('\n\n'),
    blocks,
    summary: CHAPTER_ONE_SUMMARY,
    status: 'read',
  };
  story.updatedAt = '2026-02-01T09:00:00.000Z';
  await storage.saveStory(story);
}

function chapterOne(story: StoryWorld | null) {
  return story?.arcs.flatMap((arc) => arc.chapters).find((chapter) => chapter.number === 1);
}

describe('Fresh-login chapter restoration journey', () => {
  it('restores a generated chapter, its prose and the Hub counts on an empty cache', async () => {
    // 1. Generate a chapter, and confirm both halves of the split record: the
    //    body in its own store and the `hasContent` marker on the scaffold.
    await harness.storage.saveStory(scaffoldedStory());
    await generateChapterOne(harness.storage);
    await harness.sync();

    const authored = await harness.storage.getStory(STORY_ID);
    expect(chapterOne(authored)?.hasContent).toBe(true);
    // The prose left the story document: the scaffold is a marker, not a body.
    expect(chapterOne(authored)?.generatedContent).toBeUndefined();
    expect((await harness.storage.getChapterContent(STORY_ID, 1))?.generatedContent)
      .toContain('azure gate hummed');

    // 2. A second device with nothing cached signs into the same account.
    const fresh = await harness.newDevice();
    await harness.signIn(JOURNEY_UID, 'reader@example.com');

    // 3. The Hub renders from the catalog alone, before any story is opened.
    const catalog = await fresh.getStories();
    expect(catalog).toHaveLength(1);
    expect(catalog[0].persistenceHydration).toBe('summary');
    expect(catalog[0].arcs).toHaveLength(0);
    expect(resolveChapterCounts(catalog[0])).toEqual({
      totalChapterCount: CHAPTER_COUNT,
      generatedChapterCount: 1,
    });

    // 4. Opening the story restores all ten scaffolds, with chapter 1 generated.
    const opened = await fresh.getStory(STORY_ID);
    expect(opened?.persistenceHydration).toBe('full');
    expect(opened?.arcs.flatMap((arc) => arc.chapters)).toHaveLength(CHAPTER_COUNT);
    expect(chapterOne(opened)?.hasContent).toBe(true);
    expect(chapterOne(opened)?.summary).toBe(CHAPTER_ONE_SUMMARY);
    expect(
      opened?.arcs.flatMap((arc) => arc.chapters).filter((chapter) => chapter.hasContent),
    ).toHaveLength(1);

    // 5. Opening the chapter restores the original prose, blocks and annotations.
    const restored = await fresh.getChapterContent(STORY_ID, 1);
    expect(restored?.generatedContent).toContain('azure gate hummed');
    expect(restored?.blocks?.map((block) => block.id)).toEqual([
      'block-1',
      'block-2',
      'block-3',
      'block-4',
    ]);
    expect(
      restored?.blocks?.find((block) => block.type === 'dialogue')?.metadata?.speakerName,
    ).toBe('Elder Kang');

    // 6. Returning to the Hub still reports 1/10 — from the hydrated arcs now,
    //    which must agree with the catalog tally that produced the first paint.
    const afterOpening = (await fresh.getStories()).find((story) => story.id === STORY_ID);
    expect(resolveChapterCounts(afterOpening)).toEqual({
      totalChapterCount: CHAPTER_COUNT,
      generatedChapterCount: 1,
    });
  });

  it('keeps the Hub counts correct across a sign-out and a browser reload', async () => {
    await harness.storage.saveStory(scaffoldedStory());
    await generateChapterOne(harness.storage);
    await harness.sync();

    await harness.signOut();
    const reloaded = await harness.reload();
    await harness.signIn(JOURNEY_UID, 'reader@example.com');

    const catalog = await reloaded.getStories();
    expect(resolveChapterCounts(catalog.find((story) => story.id === STORY_ID))).toEqual({
      totalChapterCount: CHAPTER_COUNT,
      generatedChapterCount: 1,
    });
  });

  /**
   * Regression: the Library Hub holds catalog summaries for every story it has
   * not opened. A summary has no arcs and no Codex, so publishing one as a whole
   * story deleted every chapter scaffold — and with them every generated
   * chapter's body. Any Hub-originated save (a rename, a cover choice, a paused
   * batch) was enough to wipe a fully written story.
   */
  it('never publishes a catalog summary as a whole story', async () => {
    await harness.storage.saveStory(scaffoldedStory());
    await generateChapterOne(harness.storage);
    await harness.sync();

    const fresh = await harness.newDevice();
    await harness.signIn(JOURNEY_UID, 'reader@example.com');
    const summary = (await fresh.getStories())[0];
    expect(summary.arcs).toHaveLength(0);

    // Exactly what a Hub edit produces: the summary the card was rendered from,
    // with the one field the user changed.
    await fresh.saveStory({
      ...summary,
      title: 'Ledger of the Azure Gate (Revised)',
      updatedAt: '2026-03-01T09:00:00.000Z',
    });
    await harness.sync();

    const survivor = await harness.newDevice();
    await harness.signIn(JOURNEY_UID, 'reader@example.com');
    const reopened = await survivor.getStory(STORY_ID);

    expect(reopened?.title).toBe('Ledger of the Azure Gate (Revised)');
    expect(reopened?.arcs.flatMap((arc) => arc.chapters)).toHaveLength(CHAPTER_COUNT);
    expect(chapterOne(reopened)?.hasContent).toBe(true);
    expect(reopened?.memory.characters.map((character) => character.name))
      .toContain('Elder Kang');
    expect((await survivor.getChapterContent(STORY_ID, 1))?.generatedContent)
      .toContain('azure gate hummed');
    expect(resolveChapterCounts((await survivor.getStories())[0])).toEqual({
      totalChapterCount: CHAPTER_COUNT,
      generatedChapterCount: 1,
    });
  });
});

describe('Chapter read and write failures', () => {
  /**
   * Replace the bridged fetch for the duration of one call so a specific
   * persistence request fails the way a server fault or a dropped connection
   * would. The client stack — adapter, outbox, storage manager — is untouched.
   */
  async function withFailingRequests<T>(
    matches: (url: string, method: string) => boolean,
    run: () => Promise<T>,
  ): Promise<T> {
    const bridged = globalThis.fetch;
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
      if (matches(url, (init?.method ?? 'GET').toUpperCase())) {
        return Promise.reject(new Error('Simulated persistence transport failure'));
      }
      return bridged(input, init);
    }) as typeof globalThis.fetch;
    try {
      return await run();
    } finally {
      globalThis.fetch = bridged;
    }
  }

  /**
   * Regression: a failed cloud read used to be logged and turned into `null`,
   * which is the same answer as "this chapter has no body". Callers then treated
   * a stored chapter as empty.
   */
  it('surfaces a failed chapter read instead of reporting an ungenerated chapter', async () => {
    await harness.storage.saveStory(scaffoldedStory());
    await generateChapterOne(harness.storage);
    await harness.sync();

    const fresh = await harness.newDevice();
    await harness.signIn(JOURNEY_UID, 'reader@example.com');
    // Hydrate the scaffold first so the marker is present but the body is not.
    expect(chapterOne(await fresh.getStory(STORY_ID))?.hasContent).toBe(true);

    const read = withFailingRequests(
      (url, method) => method === 'GET' && url.includes('/chapters/1'),
      () => fresh.getChapterContent(STORY_ID, 1),
    );
    await expect(read).rejects.toBeInstanceOf(ChapterContentReadError);

    // The failure changed nothing: the marker stands and the body is still
    // there once the transport recovers.
    expect(chapterOne(await fresh.getStory(STORY_ID))?.hasContent).toBe(true);
    expect((await fresh.getChapterContent(STORY_ID, 1))?.generatedContent)
      .toContain('azure gate hummed');
  });

  it('does not let a failed chapter write look like a successful save', async () => {
    await harness.storage.saveStory(scaffoldedStory());
    await harness.sync();

    await withFailingRequests(
      (url, method) => method === 'PUT' && url.includes('/chapters/1'),
      async () => {
        await generateChapterOne(harness.storage);
        await harness.sync();
      },
    );

    // The pass reported failure rather than settling as synced, and the durable
    // task is still queued for retry.
    expect(harness.storage.getSyncStatus()).not.toBe('synced');

    // No other device may see the chapter as generated while its body has not
    // reached PostgreSQL.
    const other = await harness.newDevice();
    await harness.signIn(JOURNEY_UID, 'reader@example.com');
    expect(await other.getChapterContent(STORY_ID, 1)).toBeNull();
    expect(chapterOne(await other.getStory(STORY_ID))?.hasContent).toBeFalsy();
    expect(resolveChapterCounts((await other.getStories())[0])).toEqual({
      totalChapterCount: CHAPTER_COUNT,
      generatedChapterCount: 0,
    });
  });
});
