// @vitest-environment node
/**
 * The Library catalog read: the story rows the Hub renders, and the chapter
 * tallies it renders them with.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const NOW = '2026-07-22T10:00:00.000Z';
const ownerUid = 'user-1';

const state = vi.hoisted(() => ({
  /** One entry per page, returned in order. */
  pages: [] as any[][],
  chapterCounts: [] as any[],
  coverSlots: [] as any[],
  listCalls: [] as any[],
}));

vi.mock('../firebaseAdmin', () => ({ getFirebaseAdminApp: () => ({}) }));
vi.mock('firebase-admin/data-connect', () => ({ getDataConnect: () => ({ executeMutation: vi.fn() }) }));
vi.mock('../../generated/dataconnect-admin', () => ({
  AccountRole: { USER: 'USER', ADMIN: 'ADMIN', OWNER: 'OWNER' },
  SubscriptionTier: { MORTAL: 'MORTAL' },
  connectorConfig: {},
  adminListOwnedStories: vi.fn(async (vars: any) => {
    state.listCalls.push(vars);
    const page = state.pages[vars.offset / 200] ?? [];
    return {
      data: {
        stories: page,
        ...(vars.skipChapterCounts ? {} : { chapterCounts: state.chapterCounts }),
      },
    };
  }),
  adminListOwnedStoryCoverSlots: vi.fn(async () => ({ data: { coverSlots: state.coverSlots } })),
  adminGetUserProfileGraph: vi.fn(),
  adminGetOwnedStoryGraph: vi.fn(),
  adminGetOwnedChapterContentGraph: vi.fn(),
  adminGetOwnedStorySeedGraph: vi.fn(),
  adminGetPersistenceReceipt: vi.fn(async () => ({ data: { persistenceReceipt: null } })),
  adminListOwnedGlossaryTerms: vi.fn(),
  adminListOwnedStorySeeds: vi.fn(),
  adminConsumeImageGenerationQuota: vi.fn(),
  adminDeleteOwnedGlossaryTerm: vi.fn(),
  adminDeleteOwnedStory: vi.fn(),
  adminDeleteOwnedStorySeed: vi.fn(),
  adminDeleteStoryAsAdmin: vi.fn(),
  adminGetAdminOverview: vi.fn(),
  adminGetImageQuotaConsumption: vi.fn(),
  adminGrantSystemOwnerRole: vi.fn(),
  adminRecoverPendingUserPortraits: vi.fn(),
  adminSelectUserPortrait: vi.fn(),
  adminUpdateAccountAccess: vi.fn(),
}));

import { DataConnectApplicationRepository } from './dataConnectApplicationRepository';

function storyRow(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    ownerUid,
    clientStoryId: `client-${id}`,
    title: `Story ${id}`,
    genre: 'Xianxia',
    mainCharacterName: 'Lin',
    premise: '',
    status: 'DRAFT',
    visibility: 'PRIVATE',
    currentChapterNumber: 1,
    syncRevision: 'srev-1',
    revision: '1',
    schemaVersion: 1,
    evolutionReady: false,
    availableVisualUpdate: false,
    isEdited: false,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function repository(
  loadMediaDescriptor: (ownerUid: string, assetId: string) => Promise<any> = async () => null,
) {
  return new DataConnectApplicationRepository({ loadMediaDescriptor });
}

beforeEach(() => {
  state.pages = [];
  state.chapterCounts = [];
  state.coverSlots = [];
  state.listCalls = [];
});

describe('catalog chapter tallies', () => {
  it('carries the tallies onto the matching summaries', async () => {
    state.pages = [[storyRow('story-a'), storyRow('story-b')]];
    // PostgreSQL returns bigint counts as strings across the JSON boundary.
    state.chapterCounts = [
      { storyId: 'story-a', totalChapterCount: '10', generatedChapterCount: '1' },
    ];

    const [a, b] = await repository().listStories(ownerUid);

    expect(a.totalChapterCount).toBe(10);
    expect(a.generatedChapterCount).toBe(1);
    // A story with no chapters produces no aggregate row, which is a real 0/0.
    expect(b.totalChapterCount).toBe(0);
    expect(b.generatedChapterCount).toBe(0);
  });

  it('ignores an aggregate row it cannot understand rather than guessing', async () => {
    state.pages = [[storyRow('story-a')]];
    state.chapterCounts = [
      { storyId: 'story-a', totalChapterCount: 'not-a-number', generatedChapterCount: '1' },
      { totalChapterCount: '5', generatedChapterCount: '5' },
    ];

    const [a] = await repository().listStories(ownerUid);

    expect(a.totalChapterCount).toBe(0);
    expect(a.generatedChapterCount).toBe(0);
  });

  it('joins compact Data Connect UUIDs to canonical story rows and cover descriptors', async () => {
    const storyCanonical = '7da538b7-75ce-44f9-bdf9-82e7f9e4d7ae';
    const storyCompact = '7da538b775ce44f9bdf982e7f9e4d7ae';
    const assetCanonical = 'fc0aac17-fb01-4f7e-a9bc-e3121204125d';
    const assetCompact = 'fc0aac17fb014f7ea9bce3121204125d';
    state.pages = [[storyRow(storyCanonical)]];
    state.chapterCounts = [{
      storyId: storyCompact,
      totalChapterCount: '7',
      generatedChapterCount: '5',
    }];
    state.coverSlots = [{
      storyId: storyCompact,
      currentAssetId: assetCompact,
    }];
    const loadMediaDescriptor = vi.fn(async () => ({
      id: assetCompact,
      ownerUid,
      assetType: 'IMAGE',
      purpose: 'STORY_COVER',
      visibility: 'PRIVATE',
      status: 'READY',
      mimeType: 'image/png',
      byteSize: '3',
      checksumSha256: 'a'.repeat(64),
      version: 1,
      deliveryUrl: 'https://media.example.test/cover',
      createdAt: NOW,
    }));

    const [story] = await repository(loadMediaDescriptor).listStories(ownerUid);

    expect(loadMediaDescriptor).toHaveBeenCalledWith(ownerUid, assetCanonical);
    expect(story).toMatchObject({
      totalChapterCount: 7,
      generatedChapterCount: 5,
      coverAssetId: assetCanonical,
      imageUrl: 'https://media.example.test/cover',
    });
    expect(story.mediaDescriptors).toHaveProperty(assetCanonical);
  });

  it('retains the canonical cover slot when delivery signing is unavailable', async () => {
    const storyCanonical = '7da538b7-75ce-44f9-bdf9-82e7f9e4d7ae';
    const storyCompact = '7da538b775ce44f9bdf982e7f9e4d7ae';
    const assetCanonical = 'fc0aac17-fb01-4f7e-a9bc-e3121204125d';
    const assetCompact = 'fc0aac17fb014f7ea9bce3121204125d';
    state.pages = [[storyRow(storyCanonical)]];
    state.coverSlots = [{
      storyId: storyCompact,
      currentAssetId: assetCompact,
    }];
    const loadMediaDescriptor = vi.fn(async () => {
      throw new Error('R2 signing unavailable');
    });

    const [story] = await repository(loadMediaDescriptor).listStories(ownerUid);

    expect(loadMediaDescriptor).toHaveBeenCalledWith(ownerUid, assetCanonical);
    expect(story).toMatchObject({
      persistenceHydration: 'summary',
      persistenceId: storyCanonical,
      coverAssetId: assetCanonical,
    });
    expect(story.imageUrl).toBeUndefined();
    expect(story.mediaDescriptors).toBeUndefined();
  });

  /**
   * The aggregate covers the whole account and would repeat identically on
   * every page, so only the first page pays for it.
   */
  it('requests the aggregate once, however many pages of stories there are', async () => {
    state.pages = [
      Array.from({ length: 200 }, (_, index) => storyRow(`page-1-${index}`)),
      [storyRow('page-2-0')],
    ];
    state.chapterCounts = [
      { storyId: 'page-2-0', totalChapterCount: '4', generatedChapterCount: '2' },
    ];

    const stories = await repository().listStories(ownerUid);

    expect(state.listCalls.map((call) => call.skipChapterCounts)).toEqual([false, true]);
    expect(stories).toHaveLength(201);
    // A tally read on the first page still reaches a story listed on the second.
    const paged = stories.find((story) => story.id === 'client-page-2-0');
    expect(paged?.totalChapterCount).toBe(4);
    expect(paged?.generatedChapterCount).toBe(2);
  });
});
