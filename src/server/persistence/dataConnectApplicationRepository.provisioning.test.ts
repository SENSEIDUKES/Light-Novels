// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const NOW = '2026-07-22T10:00:00.000Z';
const ownerUid = 'user-1';

const state = vi.hoisted(() => ({
  profileGraph: null as any,
  storyGraph: null as any,
  seedGraph: null as any,
  chapterGraph: null as any,
  recoveryCalls: 0,
  storyReadIds: [] as string[],
  receipts: new Map<string, any>(),
  executed: [] as string[],
  executedVars: [] as Array<{ name: string; variables: any }>,
}));

vi.mock('../firebaseAdmin', () => ({ getFirebaseAdminApp: () => ({}) }));
vi.mock('firebase-admin/data-connect', () => ({ getDataConnect: () => ({ executeMutation: vi.fn() }) }));

function emptyProfileGraph() {
  return {
    account: { uid: ownerUid, email: null, displayName: '', role: 'USER', createdAt: NOW, updatedAt: NOW },
    profile: {
      userUid: ownerUid, username: 'cultivator', subscriptionTier: 'MORTAL',
      daoXp: '0', heavenlyQi: '0', sectQi: '0', demonicQi: '0', writingStreak: 0,
      savedStoryCount: 0, imageGenerationCount: 0, daoPillarStreak: 0, daoPillarCracked: false,
      revision: '1', syncRevision: 'rev-1', createdAt: NOW, updatedAt: NOW,
    },
    preferences: [], inventory: [], activeEffects: [], statusEffects: [], progressEvents: [],
  };
}

function emptyStoryGraph() {
  return {
    story: {
      id: '770b6a28-d1ed-4d4d-926a-86e592ef656d', ownerUid, clientStoryId: 'demo-matrix-1-user-1',
      title: 'Default World', genre: 'Xianxia', mainCharacterName: 'Lin', premise: '',
      status: 'DRAFT', visibility: 'PRIVATE', currentChapterNumber: 1,
      syncRevision: 'srev-1', revision: '1', schemaVersion: 1, evolutionReady: false,
      availableVisualUpdate: false, isEdited: false, createdAt: NOW, updatedAt: NOW,
    },
    members: [{ storyId: '770b6a28-d1ed-4d4d-926a-86e592ef656d', userUid: ownerUid, role: 'OWNER', createdAt: NOW }],
    preferences: [], readerPreferences: [], memoryStates: [], memoryWarnings: [], rules: [],
    revealBackdrops: [], arcs: [], chapters: [], codexEntities: [], codexRelationships: [],
    plotThreads: [], karmaNodes: [], timelineEvents: [], bookmarks: [], readingProgresses: [],
    arcReadingProgresses: [], glossaryTerms: [], generationJobs: [], generationEvents: [],
    generationBatches: [], generationBatchItems: [], mediaSlots: [], mediaAttachments: [],
  };
}

function emptySeedGraph(seedId: string, clientSeedId: string) {
  return {
    storySeed: {
      id: seedId,
      ownerUid,
      legacySeedId: clientSeedId,
      clientSeedId,
      title: 'Fresh Blueprint',
      schemaVersion: 1,
      syncRevision: 'seed-rev-1',
      revision: '1',
      deletedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
      fields: [],
      entities: [],
    },
  };
}

function storyGraphWithNewChapter() {
  const graph = emptyStoryGraph();
  graph.story.clientStoryId = 'story-client-1';
  graph.story.syncRevision = 'story-rev-5';
  graph.story.revision = '5';
  graph.arcs = [{
    id: '4c36e07c-66e2-46c9-b4b5-c3b2cd675eee',
    storyId: graph.story.id,
    arcNumber: 1,
    title: 'Volume I',
    status: 'ACTIVE',
    createdAt: NOW,
    updatedAt: NOW,
  }];
  graph.chapters = [{
    id: 'f40966fe-aef8-41f8-b660-c8715695d80e',
    storyId: graph.story.id,
    arcId: graph.arcs[0].id,
    clientChapterId: 'chapter-story-client-1-1',
    chapterNumber: 1,
    title: 'Awakening',
    premise: 'The archive opens.',
    status: 'UNREAD',
    syncRevision: null,
    revision: '0',
    isSealed: false,
    hasContinuityFaults: false,
    createdAt: NOW,
    updatedAt: NOW,
  }];
  return graph;
}

function newChapterGraph() {
  return {
    chapter: {
      ...storyGraphWithNewChapter().chapters[0],
      content: null,
      blocks: [],
      translations: [],
      audioManifest: null,
      voiceClips: [],
    },
    fingerprints: [],
    facts: [],
  };
}

vi.mock('../../generated/dataconnect-admin', () => ({
  AccountRole: { USER: 'USER', ADMIN: 'ADMIN', OWNER: 'OWNER' },
  SubscriptionTier: { MORTAL: 'MORTAL', OUTER_SECT: 'OUTER_SECT', INNER_SECT: 'INNER_SECT', SECT_MASTER: 'SECT_MASTER', IMMORTAL: 'IMMORTAL' },
  connectorConfig: {},
  adminGetUserProfileGraph: vi.fn(async () => ({ data: state.profileGraph ?? { profile: null, account: null, preferences: [], inventory: [], statusEffects: [], progressEvents: [] } })),
  adminGetOwnedStoryGraph: vi.fn(async ({ storyId }: any) => {
    state.storyReadIds.push(storyId);
    return { data: state.storyGraph ?? { story: null } };
  }),
  adminGetPersistenceReceipt: vi.fn(async ({ idempotencyKey }: any) => ({ data: { persistenceReceipt: state.receipts.get(idempotencyKey) ?? null } })),
  adminListOwnedStories: vi.fn(async () => ({ data: { stories: [] } })),
  adminConsumeImageGenerationQuota: vi.fn(),
  adminDeleteOwnedGlossaryTerm: vi.fn(), adminDeleteOwnedStory: vi.fn(), adminDeleteOwnedStorySeed: vi.fn(),
  adminDeleteStoryAsAdmin: vi.fn(), adminGetAdminOverview: vi.fn(), adminGetImageQuotaConsumption: vi.fn(),
  adminGetOwnedChapterContentGraph: vi.fn(async () => ({ data: state.chapterGraph })),
  adminGetOwnedStorySeedGraph: vi.fn(async ({ seedId }: any) => ({
    data: state.seedGraph?.storySeed?.id === seedId ? state.seedGraph : { storySeed: null },
  })),
  adminListOwnedGlossaryTerms: vi.fn(), adminListOwnedStoryCoverSlots: vi.fn(async () => ({ data: { storyCoverSlots: [] } })),
  adminListOwnedStorySeeds: vi.fn(async () => ({ data: { storySeeds: [] } })),
  adminRecoverPendingUserPortraits: vi.fn(async () => {
    state.recoveryCalls++;
    return { data: { recovered: 1 } };
  }),
  adminSelectUserPortrait: vi.fn(), adminUpdateAccountAccess: vi.fn(),
}));

import { DataConnectApplicationRepository } from './dataConnectApplicationRepository';

function makeRepo() {
  return new DataConnectApplicationRepository({
    executeRetiredMutation: async (name: string, variables: any) => {
      state.executed.push(name);
      state.executedVars.push({ name, variables });
      // Reflect provisioning / story creation so read-backs succeed.
      if (name === 'AdminUpsertUserProfileGraph') state.profileGraph = emptyProfileGraph();
      if (name === 'AdminUpsertStoryGraph') state.storyGraph = emptyStoryGraph();
      if (name === 'AdminUpsertStorySeedGraph') {
        state.seedGraph = emptySeedGraph(variables.seedId, variables.seed.clientSeedId);
      }
      if (name === 'AdminUpsertChapterContentGraph') {
        state.storyGraph.story.syncRevision = variables.newSyncRevision;
        state.storyGraph.story.revision = variables.newRevision;
        state.chapterGraph.chapter = {
          ...state.chapterGraph.chapter,
          ...variables.chapter,
          content: variables.content,
        };
      }
      return { data: {} };
    },
    loadMediaDescriptor: async () => null,
  });
}

describe('canonical profile provisioning', () => {
  beforeEach(() => {
    state.profileGraph = null;
    state.storyGraph = null;
    state.seedGraph = null;
    state.chapterGraph = null;
    state.recoveryCalls = 0;
    state.storyReadIds = [];
    state.receipts.clear();
    state.executed = [];
    state.executedVars = [];
  });

  it('provisions a canonical account + profile when a new user is first read (sign-in)', async () => {
    const repo = makeRepo();
    const profile = await repo.getProfile(ownerUid);
    expect(profile).toBeTruthy();
    expect(state.executed).toContain('AdminUpsertUserProfileGraph');
    // The provisioned account + profile must be stamped with the real server
    // time, not the Unix epoch that the mapper falls back to without one.
    const provision = state.executedVars.find(e => e.name === 'AdminUpsertUserProfileGraph')!;
    expect(provision.variables.account.updatedAt).not.toBe('1970-01-01T00:00:00.000Z');
    expect(new Date(provision.variables.account.updatedAt).getUTCFullYear()).toBeGreaterThan(2000);
  });

  it('does not re-provision (or overwrite) when the profile already exists', async () => {
    state.profileGraph = emptyProfileGraph();
    const repo = makeRepo();
    await repo.getProfile(ownerUid);
    expect(state.executed).not.toContain('AdminUpsertUserProfileGraph');
  });

  it('provisions the owner account before writing a built-in story to the library', async () => {
    const repo = makeRepo();
    const story: any = {
      id: 'demo-matrix-1-user-1', userId: ownerUid,
      persistenceId: '770b6a28-d1ed-4d4d-926a-86e592ef656d',
      title: 'Default World', genre: 'Xianxia', mcName: 'Lin',
      createdAt: NOW, updatedAt: NOW, currentChapterNumber: 1,
      memory: { powerSystem: 'Qi', currentPowerStage: 'Mortal', characters: [], worldRules: [], unresolvedPlotThreads: [], resolvedPlotThreads: [] },
      arcs: [],
    };
    await expect(repo.saveStory(ownerUid, story, { idempotencyKey: 'idem-story-key-0000004', expected: undefined })).resolves.toBeTruthy();
    // Account provisioning must run, and it must precede the story graph write.
    expect(state.executed).toContain('AdminUpsertUserProfileGraph');
    expect(state.executed).toContain('AdminUpsertStoryGraph');
    expect(state.executed.indexOf('AdminUpsertUserProfileGraph'))
      .toBeLessThan(state.executed.indexOf('AdminUpsertStoryGraph'));
  });

  it('canonicalizes compact UUIDs before direct story lookup', async () => {
    state.profileGraph = emptyProfileGraph();
    state.storyGraph = emptyStoryGraph();
    const repo = makeRepo();

    await expect(repo.getStory(
      ownerUid,
      '770b6a28d1ed4d4d926a86e592ef656d',
    )).resolves.toBeTruthy();

    expect(state.storyReadIds[0]).toBe('770b6a28-d1ed-4d4d-926a-86e592ef656d');
  });

  it('reads a newly committed seed directly while the list query is still stale', async () => {
    state.profileGraph = emptyProfileGraph();
    const repo = makeRepo();
    const seed: any = {
      schemaVersion: 1,
      id: 'seed-client-1',
      userId: ownerUid,
      title: 'Fresh Blueprint',
      intake: { customCharacters: [], customFactions: [] },
      blueprint: {},
      createdAt: NOW,
      updatedAt: NOW,
    };

    await expect(repo.saveSeed(ownerUid, seed, {
      idempotencyKey: '00000000-0000-4000-8000-000000000001',
      expected: undefined,
    })).resolves.toMatchObject({
      id: 'seed-client-1',
      userId: ownerUid,
      title: 'Fresh Blueprint',
    });
    expect(state.executed).toContain('AdminUpsertStorySeedGraph');
  });

  it('provisions the canonical profile before recovering a pending portrait', async () => {
    const repo = makeRepo();

    await expect(repo.recoverPortraits(
      ownerUid,
      '00000000-0000-4000-8000-000000000002',
    )).resolves.toBe(1);

    expect(state.executed[0]).toBe('AdminUpsertUserProfileGraph');
    expect(state.recoveryCalls).toBe(1);
  });

  it('guards the first chapter content write with the parent story revision', async () => {
    state.profileGraph = emptyProfileGraph();
    state.storyGraph = storyGraphWithNewChapter();
    state.chapterGraph = newChapterGraph();
    const repo = makeRepo();

    await expect(repo.saveChapterContent(
      ownerUid,
      'story-client-1',
      {
        storyId: 'story-client-1',
        userId: ownerUid,
        chapterNumber: 1,
        generatedContent: 'The archive opened beneath a truthful moon.',
        updatedAt: NOW,
      },
      {
        idempotencyKey: '00000000-0000-4000-8000-000000000003',
        expected: undefined,
      },
    )).resolves.toMatchObject({
      content: {
        storyId: 'story-client-1',
        chapterNumber: 1,
        generatedContent: 'The archive opened beneath a truthful moon.',
      },
      // The chapter mutation advances the parent Story aggregate, so the write
      // reports the new revision for the browser replica to adopt.
      story: { updatedAt: expect.any(String) },
    });

    const write = state.executedVars.find(
      entry => entry.name === 'AdminUpsertChapterContentGraph',
    )!;
    expect(write.variables.expectedSyncRevision).toBe('story-rev-5');
    expect(write.variables.newRevision).toBe('6');
  });
});
