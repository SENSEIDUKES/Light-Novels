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
  adminListOwnedStoryCoverSlots: vi.fn(async () => ({ data: { coverSlots: [] } })),
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

function repository() {
  return new DataConnectApplicationRepository({ loadMediaDescriptor: async () => null });
}

beforeEach(() => {
  state.pages = [];
  state.chapterCounts = [];
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
