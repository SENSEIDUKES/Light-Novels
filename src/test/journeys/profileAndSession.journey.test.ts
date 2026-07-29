/**
 * Journey: the reader's own state — profile and portrait, reading progress,
 * bookmarks and reader settings — survives a reload, a sign-out and a later
 * sign-in, and never leaks into another account.
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
  getUserProfile,
  persistenceRequest,
  recoverPendingUserPortraits,
  saveUserProfile,
  selectUserPortrait,
} from '../../lib/persistence/persistenceClient';
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

const PORTRAIT_ASSET_ID = '7d5b1c98-3a62-4c14-b6f7-51e0c8a2d43b';
const OLDER_PENDING_PORTRAIT_ID = '6d5b1c98-3a62-4c14-b6f7-51e0c8a2d43a';

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

describe('Profile journey', () => {
  it('persists profile settings across a sign-out and a later sign-in', async () => {
    await saveUserProfile({
      uid: JOURNEY_UID,
      username: 'LedgerKeeper',
      displayNameColor: '#7dd3fc',
      preferredLanguage: 'en',
      defaultTranslationLanguage: 'fr',
      dao_rank: 'Auditor of the Third Ledger',
    });

    await harness.signOut();
    await harness.signIn(JOURNEY_UID, 'reader@example.com');
    const profile = await getUserProfile();

    expect(profile?.username).toBe('LedgerKeeper');
    expect(profile?.displayNameColor).toBe('#7dd3fc');
    expect(profile?.defaultTranslationLanguage).toBe('fr');
    expect(profile?.dao_rank).toBe('Auditor of the Third Ledger');
  });

  it('applies successive profile updates instead of failing after the first', async () => {
    await saveUserProfile({ uid: JOURNEY_UID, username: 'FirstName' });
    await saveUserProfile({ uid: JOURNEY_UID, username: 'SecondName' });
    await saveUserProfile({ uid: JOURNEY_UID, dao_xp: 4200 });

    const profile = await getUserProfile();
    expect(profile?.username).toBe('SecondName');
    expect(profile?.dao_xp).toBe(4200);
  });

  it('renders the account portrait from its canonical asset after a sign-in', async () => {
    await saveUserProfile({ uid: JOURNEY_UID, username: 'LedgerKeeper' });
    await harness.publishAccountMedia({
      assetId: PORTRAIT_ASSET_ID,
      ownerUid: JOURNEY_UID,
      targetKind: 'PORTRAIT',
      targetKey: JOURNEY_UID,
      purpose: 'CELESTIAL_PORTRAIT',
      body: 'portrait-bytes',
    });
    await selectUserPortrait({
      assetId: PORTRAIT_ASSET_ID,
      prompt: 'A portrait selected through the production profile route.',
      usedReferenceImage: false,
    }, JOURNEY_UID, 'portrait-selection-journey-key');

    // Production account portraits do not create story slots or attachments.
    expect(harness.store.mediaSlots).toHaveLength(0);
    expect(harness.store.mediaAttachments).toHaveLength(0);

    await harness.newDevice();
    await harness.signOut();
    await harness.signIn(JOURNEY_UID, 'reader@example.com');
    const profile = await getUserProfile(JOURNEY_UID);

    expect(profile?.activePortraitId).toBe(PORTRAIT_ASSET_ID);
    expect(profile?.avatarUrl).toMatch(/^blob:/);
    // A signed portrait link must never be retained by the client.
    expect(profile?.avatarMediaDescriptor?.deliveryUrl).toBe('');
  });

  it('recovers a READY account portrait stranded before profile selection', async () => {
    await saveUserProfile({ uid: JOURNEY_UID, username: 'LedgerKeeper' });
    await harness.publishAccountMedia({
      assetId: PORTRAIT_ASSET_ID,
      ownerUid: JOURNEY_UID,
      targetKind: 'PORTRAIT',
      targetKey: JOURNEY_UID,
      purpose: 'CELESTIAL_PORTRAIT',
      body: 'recoverable-portrait-bytes',
    });

    await expect(recoverPendingUserPortraits(
      JOURNEY_UID,
      'portrait-recovery-journey-key',
    )).resolves.toBe(1);
    await harness.newDevice();
    const profile = await getUserProfile(JOURNEY_UID);

    expect(profile).toMatchObject({
      activePortraitId: PORTRAIT_ASSET_ID,
      avatarUrl: expect.stringMatching(/^blob:/),
      avatarMediaDescriptor: {
        id: PORTRAIT_ASSET_ID,
        deliveryUrl: '',
      },
    });
    expect(harness.store.mediaSlots).toHaveLength(0);
  });

  it('retains the PostgreSQL profile when portrait signing is unavailable', async () => {
    await saveUserProfile({ uid: JOURNEY_UID, username: 'LedgerKeeper' });
    await harness.publishAccountMedia({
      assetId: PORTRAIT_ASSET_ID,
      ownerUid: JOURNEY_UID,
      targetKind: 'PORTRAIT',
      targetKey: JOURNEY_UID,
      purpose: 'CELESTIAL_PORTRAIT',
      body: 'portrait-with-temporary-delivery-failure',
    });
    await selectUserPortrait({
      assetId: PORTRAIT_ASSET_ID,
      usedReferenceImage: false,
    }, JOURNEY_UID, 'portrait-delivery-degradation-key');
    harness.failNextMediaStage('delivery');

    await expect(getUserProfile(JOURNEY_UID)).resolves.toMatchObject({
      uid: JOURNEY_UID,
      username: 'LedgerKeeper',
      activePortraitId: PORTRAIT_ASSET_ID,
      avatarUrl: '',
      avatarDeliveryError: {
        code: 'portrait_delivery_unavailable',
        recoverable: true,
      },
    });

    // The next read can project the same canonical asset once signing recovers.
    await expect(getUserProfile(JOURNEY_UID)).resolves.toMatchObject({
      activePortraitId: PORTRAIT_ASSET_ID,
      avatarUrl: expect.stringMatching(/^blob:/),
      avatarMediaDescriptor: { deliveryUrl: '' },
    });
  });

  it('does not let recovery overwrite a newer explicit portrait selection', async () => {
    await saveUserProfile({ uid: JOURNEY_UID, username: 'LedgerKeeper' });
    await harness.publishAccountMedia({
      assetId: OLDER_PENDING_PORTRAIT_ID,
      ownerUid: JOURNEY_UID,
      targetKind: 'PORTRAIT',
      targetKey: JOURNEY_UID,
      purpose: 'CELESTIAL_PORTRAIT',
      body: 'older-pending-portrait',
    });
    await harness.publishAccountMedia({
      assetId: PORTRAIT_ASSET_ID,
      ownerUid: JOURNEY_UID,
      targetKind: 'PORTRAIT',
      targetKey: JOURNEY_UID,
      purpose: 'CELESTIAL_PORTRAIT',
      body: 'newer-selected-portrait',
    });
    await selectUserPortrait({
      assetId: PORTRAIT_ASSET_ID,
      usedReferenceImage: false,
    }, JOURNEY_UID, 'newer-explicit-selection-key');

    await expect(recoverPendingUserPortraits(
      JOURNEY_UID,
      'do-not-overwrite-newer-selection-key',
    )).resolves.toBe(0);
    await expect(getUserProfile(JOURNEY_UID)).resolves.toMatchObject({
      activePortraitId: PORTRAIT_ASSET_ID,
    });
  });

  it('rejects a story-scoped image that tries to impersonate an account portrait', async () => {
    await saveUserProfile({ uid: JOURNEY_UID, username: 'LedgerKeeper' });
    await harness.storage.saveStory(makeStory());
    await harness.sync();
    await harness.publishMedia({
      assetId: PORTRAIT_ASSET_ID,
      ownerUid: JOURNEY_UID,
      storyId: STORY_ID,
      targetKind: 'STORY',
      targetKey: STORY_ID,
      purpose: 'STORY_COVER',
      body: 'not-an-account-portrait',
    });

    await expect(selectUserPortrait({
      assetId: PORTRAIT_ASSET_ID,
      usedReferenceImage: false,
    }, JOURNEY_UID, 'reject-cover-as-portrait-key')).rejects.toMatchObject({
      code: 'invalid_argument',
      status: 400,
      recoverable: false,
    });
    expect((await getUserProfile(JOURNEY_UID))?.activePortraitId).toBeUndefined();
  });

  it('rejects generic profile patches that bypass portrait selection', async () => {
    await saveUserProfile({ uid: JOURNEY_UID, username: 'LedgerKeeper' });

    await expect(persistenceRequest('/profile', {
      method: 'PUT',
      body: JSON.stringify({
        value: {
          uid: JOURNEY_UID,
          activePortraitId: PORTRAIT_ASSET_ID,
        },
        idempotencyKey: 'generic-portrait-bypass-key',
      }),
    }, JOURNEY_UID)).rejects.toMatchObject({
      code: 'invalid_argument',
      status: 400,
      recoverable: false,
    });
    expect((await getUserProfile(JOURNEY_UID))?.activePortraitId).toBeUndefined();
  });

  it('never returns one account profile to another account', async () => {
    await saveUserProfile({ uid: JOURNEY_UID, username: 'LedgerKeeper' });

    await harness.signOut();
    await harness.signIn(OTHER_UID, 'stranger@example.com');
    const profile = await getUserProfile();

    expect(profile?.uid).toBe(OTHER_UID);
    expect(profile?.username).not.toBe('LedgerKeeper');
  });
});

describe('Reading state journey', () => {
  it('restores reading position, bookmarks and reader settings on a fresh device', async () => {
    const story = makeStory();
    await harness.storage.saveStory(story);
    await harness.storage.saveChapterContent(makeChapterContent());
    await harness.sync();

    await harness.storage.saveStory({
      ...story,
      updatedAt: '2026-01-10T09:00:00.000Z',
      lastReadChapter: 2,
      lastReadAt: '2026-01-10T08:55:00.000Z',
      readingAnchor: {
        chapterNumber: 2,
        blockId: 'block-2',
        paragraphIndex: 1,
        contentSignature: 'sig-block-2',
        intraBlockRatio: 0.5,
        savedAt: '2026-01-10T08:55:00.000Z',
      },
      readingStats: { totalReadingTimeMs: 930_000, arcReadingTimeMs: { 1: 930_000 } },
      bookmarks: [
        {
          id: 'bookmark-1',
          chapterNumber: 2,
          paragraphIndex: 1,
          paragraphExcerpt: 'You audit the heavens with a borrowed brush.',
          note: 'Kang shows his hand.',
          createdAt: '2026-01-10T08:50:00.000Z',
        },
      ],
      readerPreferences: {
        fontSize: 'lg',
        fontFamily: 'serif',
        lineHeight: 'relaxed',
        paragraphSpacing: 'wide',
        lineHeightScale: 1.6,
        colorPaletteId: 'high_contrast_dark',
      },
    });
    await harness.sync();

    const fresh = await harness.newDevice();
    await harness.signIn(JOURNEY_UID, 'reader@example.com');
    const reloaded = await fresh.getStory(STORY_ID);

    expect(reloaded?.lastReadChapter).toBe(2);
    expect(reloaded?.readingAnchor?.blockId).toBe('block-2');
    expect(reloaded?.readingAnchor?.contentSignature).toBe('sig-block-2');
    expect(reloaded?.readingStats?.totalReadingTimeMs).toBe(930_000);
    expect(reloaded?.readingStats?.arcReadingTimeMs?.[1]).toBe(930_000);
    expect(reloaded?.bookmarks?.[0].paragraphExcerpt).toBe(
      'You audit the heavens with a borrowed brush.',
    );
    expect(reloaded?.bookmarks?.[0].note).toBe('Kang shows his hand.');
    expect(reloaded?.readerPreferences?.fontSize).toBe('lg');
    expect(reloaded?.readerPreferences?.colorPaletteId).toBe('high_contrast_dark');
  });
});

describe('Session journey', () => {
  it('hides the library while signed out and restores it on sign-in', async () => {
    await harness.storage.saveStory(makeStory());
    await harness.storage.saveChapterContent(makeChapterContent());
    await harness.sync();

    await harness.signOut();
    expect(await harness.storage.getStories()).toEqual([]);
    expect(await harness.storage.getChapterContent(STORY_ID, 2)).toBeNull();

    await harness.signIn(JOURNEY_UID, 'reader@example.com');
    const stories = await harness.storage.getStories();
    expect(stories.map((story) => story.id)).toContain(STORY_ID);
    expect((await harness.storage.getChapterContent(STORY_ID, 2))?.generatedContent)
      .toContain('azure gate hummed');
  });

  it('does not show one account content after another account signs in on the same device', async () => {
    await harness.storage.saveStory(makeStory());
    await harness.storage.saveChapterContent(makeChapterContent());
    await harness.sync();

    await harness.signOut();
    await harness.signIn(OTHER_UID, 'stranger@example.com');

    expect(await harness.storage.getStories()).toEqual([]);
    expect(await harness.storage.getChapterContent(STORY_ID, 2)).toBeNull();

    await harness.signOut();
    await harness.signIn(JOURNEY_UID, 'reader@example.com');
    expect((await harness.storage.getStories()).map((story) => story.id)).toContain(STORY_ID);
  });
});
