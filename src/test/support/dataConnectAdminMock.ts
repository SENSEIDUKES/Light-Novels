/**
 * Module replacement for the generated Data Connect Admin SDK.
 *
 * Only the network/SQL boundary is replaced. The generated enums and connector
 * configuration are re-exported unchanged so the repository keeps using the
 * real values, and every query answers from {@link dataConnectStore}, which
 * applies the real row manifests produced by `graphMapper`.
 */
import { InMemoryDataConnect } from './inMemoryDataConnect';

/** Shared backend instance. Reset it between tests with `dataConnectStore.reset()`. */
export const dataConnectStore = new InMemoryDataConnect();

type Vars = Record<string, any>;

function ok<T>(data: T) {
  return { data } as { data: T };
}

/**
 * Build the mocked module. Pass the real module so generated enums,
 * `connectorConfig` and unused operations keep their production values.
 */
export function createDataConnectAdminMock(actual: Record<string, unknown>) {
  return {
    ...actual,

    // ------------------------------------------------------------- receipts
    adminGetPersistenceReceipt: async (vars: Vars) =>
      ok({ persistenceReceipt: dataConnectStore.getPersistenceReceipt(vars.ownerUid, vars.idempotencyKey) }),

    // -------------------------------------------------------------- stories
    // `@skip(if: $skipChapterCounts)` omits the field entirely rather than
    // returning an empty array, so a caller that skips it and then reads it
    // fails here the same way it would against the real connector.
    adminListOwnedStories: async (vars: Vars) =>
      ok({
        stories: dataConnectStore.listOwnedStories(vars.ownerUid, vars.limit ?? 200, vars.offset ?? 0),
        ...(vars.skipChapterCounts
          ? {}
          : { chapterCounts: dataConnectStore.listOwnedStoryChapterCounts(vars.ownerUid) }),
      }),
    adminListOwnedStoryCoverSlots: async (vars: Vars) =>
      ok({ coverSlots: dataConnectStore.listOwnedStoryCoverSlots(vars.ownerUid, vars.limit ?? 200, vars.offset ?? 0) }),
    adminGetOwnedStoryGraph: async (vars: Vars) =>
      ok(dataConnectStore.getOwnedStoryGraph(vars.ownerUid, vars.storyId)),
    adminDeleteOwnedStory: async (vars: Vars) => {
      dataConnectStore.deleteOwnedStory(vars);
      return ok({});
    },

    // ------------------------------------------------------------- chapters
    adminGetOwnedChapterContentGraph: async (vars: Vars) =>
      ok(dataConnectStore.getOwnedChapterContentGraph(vars.ownerUid, vars.storyId, vars.chapterId)),

    // ------------------------------------------------------------- glossary
    adminListOwnedGlossaryTerms: async (vars: Vars) =>
      ok({ glossaryTerms: dataConnectStore.listOwnedGlossaryTerms(vars.ownerUid, vars.storyId) }),
    adminDeleteOwnedGlossaryTerm: async (vars: Vars) => {
      dataConnectStore.deleteGlossaryTerm(vars.ownerUid, vars.termId, vars.idempotencyKey);
      return ok({});
    },

    // ---------------------------------------------------------------- seeds
    adminListOwnedStorySeeds: async (vars: Vars) =>
      ok({ storySeeds: dataConnectStore.listOwnedStorySeeds(vars.ownerUid, vars.limit ?? 200, vars.offset ?? 0) }),
    adminGetOwnedStorySeedGraph: async (vars: Vars) =>
      ok(dataConnectStore.getOwnedStorySeedGraph(vars.ownerUid, vars.seedId)),
    adminDeleteOwnedStorySeed: async (vars: Vars) => {
      dataConnectStore.deleteOwnedStorySeed(vars.ownerUid, vars.seedId, vars.idempotencyKey);
      return ok({});
    },

    // -------------------------------------------------------------- profile
    adminGetUserProfileGraph: async (vars: Vars) => ok(dataConnectStore.getUserProfileGraph(vars.ownerUid)),
    adminGrantSystemOwnerRole: async (vars: Vars) => {
      dataConnectStore.grantSystemOwnerRole(vars.ownerUid);
      return ok({});
    },
    adminSelectUserPortrait: async (vars: Vars) => {
      dataConnectStore.selectUserPortrait(vars);
      return ok({});
    },
    adminRecoverPendingUserPortraits: async () => ok({ recovered: 0 }),
    adminConsumeImageGenerationQuota: async (vars: Vars) => {
      dataConnectStore.consumeImageQuota(vars);
      return ok({});
    },
    adminGetImageQuotaConsumption: async (vars: Vars) =>
      ok({ imageQuotaConsumption: dataConnectStore.getImageQuotaConsumption(vars.ownerUid, vars.idempotencyKey) }),

    // ---------------------------------------------------------------- admin
    adminGetAdminOverview: async () => ok({ users: [], stories: [] }),
    adminUpdateAccountAccess: async () => ok({}),
    adminDeleteStoryAsAdmin: async () => ok({}),
  };
}
