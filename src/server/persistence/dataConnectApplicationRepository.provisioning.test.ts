// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const NOW = '2026-07-22T10:00:00.000Z';
const ownerUid = 'user-1';

const state = vi.hoisted(() => ({
  profileGraph: null as any,
  storyGraph: null as any,
  receipts: new Map<string, any>(),
  executed: [] as string[],
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

vi.mock('../../generated/dataconnect-admin', () => ({
  AccountRole: { USER: 'USER', ADMIN: 'ADMIN', OWNER: 'OWNER' },
  SubscriptionTier: { MORTAL: 'MORTAL', OUTER_SECT: 'OUTER_SECT', INNER_SECT: 'INNER_SECT', SECT_MASTER: 'SECT_MASTER', IMMORTAL: 'IMMORTAL' },
  connectorConfig: {},
  adminGetUserProfileGraph: vi.fn(async () => ({ data: state.profileGraph ?? { profile: null, account: null, preferences: [], inventory: [], statusEffects: [], progressEvents: [] } })),
  adminGetOwnedStoryGraph: vi.fn(async () => ({ data: state.storyGraph ?? { story: null } })),
  adminGetPersistenceReceipt: vi.fn(async ({ idempotencyKey }: any) => ({ data: { persistenceReceipt: state.receipts.get(idempotencyKey) ?? null } })),
  adminListOwnedStories: vi.fn(async () => ({ data: { stories: [] } })),
  adminConsumeImageGenerationQuota: vi.fn(),
  adminDeleteOwnedGlossaryTerm: vi.fn(), adminDeleteOwnedStory: vi.fn(), adminDeleteOwnedStorySeed: vi.fn(),
  adminDeleteStoryAsAdmin: vi.fn(), adminGetAdminOverview: vi.fn(), adminGetImageQuotaConsumption: vi.fn(),
  adminGetOwnedChapterContentGraph: vi.fn(), adminGetOwnedStorySeedGraph: vi.fn(),
  adminListOwnedGlossaryTerms: vi.fn(), adminListOwnedStoryCoverSlots: vi.fn(async () => ({ data: { storyCoverSlots: [] } })),
  adminListOwnedStorySeeds: vi.fn(), adminRecoverPendingUserPortraits: vi.fn(),
  adminSelectUserPortrait: vi.fn(), adminUpdateAccountAccess: vi.fn(),
}));

import { DataConnectApplicationRepository } from './dataConnectApplicationRepository';

function makeRepo() {
  return new DataConnectApplicationRepository({
    executeRetiredMutation: async (name: string) => {
      state.executed.push(name);
      // Reflect provisioning / story creation so read-backs succeed.
      if (name === 'AdminUpsertUserProfileGraph') state.profileGraph = emptyProfileGraph();
      if (name === 'AdminUpsertStoryGraph') state.storyGraph = emptyStoryGraph();
      return { data: {} };
    },
    loadMediaDescriptor: async () => null,
  });
}

describe('canonical profile provisioning', () => {
  beforeEach(() => {
    state.profileGraph = null;
    state.storyGraph = null;
    state.receipts.clear();
    state.executed = [];
  });

  it('provisions a canonical account + profile when a new user is first read (sign-in)', async () => {
    const repo = makeRepo();
    const profile = await repo.getProfile(ownerUid);
    expect(profile).toBeTruthy();
    expect(state.executed).toContain('AdminUpsertUserProfileGraph');
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
});
