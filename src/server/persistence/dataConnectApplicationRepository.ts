import { createHash, randomUUID } from 'node:crypto';
import { getDataConnect } from 'firebase-admin/data-connect';
import {
  AccountRole,
  SubscriptionTier,
  adminConsumeImageGenerationQuota,
  adminDeleteOwnedGlossaryTerm,
  adminDeleteOwnedStory,
  adminDeleteOwnedStorySeed,
  adminDeleteStoryAsAdmin,
  adminGetAdminOverview,
  adminGetImageQuotaConsumption,
  adminGetOwnedChapterContentGraph,
  adminGetOwnedStoryGraph,
  adminGetOwnedStorySeedGraph,
  adminGetPersistenceReceipt,
  adminGetUserProfileGraph,
  adminListOwnedGlossaryTerms,
  adminListOwnedStories,
  adminListOwnedStoryCoverSlots,
  adminListOwnedStorySeeds,
  adminRecoverPendingUserPortraits,
  adminSelectUserPortrait,
  adminUpdateAccountAccess,
  connectorConfig,
  type AdminGetOwnedChapterContentGraphData,
  type AdminGetOwnedStoryGraphData,
  type AdminGetOwnedStorySeedGraphData,
} from '../../generated/dataconnect-admin';
import type {
  ChapterContent,
  LoreGlossary,
  StorySeed,
  StoryWorld,
  UserProfile,
} from '../../types';
import { applyStoryPatch, type StoryPatchOperation } from '../../lib/storage/storyPatch';
import { getFirebaseAdminApp } from '../firebaseAdmin';
import type { MediaAssetDescriptor } from '../../contracts/mediaAssets';
import type {
  ApplicationPersistenceRepository,
  PersistenceAdminOverview,
  PersistenceMutationContext,
  PortraitSelectionInput,
} from './applicationPersistenceRepository';
import {
  hydrateChapterContent,
  hydrateStorySeed,
  hydrateStoryWorld,
  hydrateUserProfile,
  mapChapterContentToGraphVariables,
  mapStorySeedToGraphVariables,
  mapStoryWorldToGraphVariables,
  mapStoryWorldToPatchVariables,
  mapUserProfileToGraphVariables,
  persistenceUuid,
  type AdminUpsertChapterContentGraphVariables,
  type AdminUpsertStoryGraphVariables,
  type AdminPatchStoryGraphVariables,
  type AdminUpsertStorySeedGraphVariables,
  type AdminUpsertUserProfileGraphVariables,
} from './graphMapper';
import {
  hydrateProfilePortraitDelivery,
  hydrateStoryMediaDelivery,
} from './mediaDeliveryHydrator';

const PAGE_SIZE = 200;

type RetiredMutationVariables = Record<string, unknown>;
type RetiredMutationExecutor = (
  name: string,
  variables: RetiredMutationVariables,
) => Promise<unknown>;
type MediaDescriptorLoader = (
  ownerUid: string,
  assetId: string,
) => Promise<MediaAssetDescriptor | null>;

export interface DataConnectApplicationRepositoryOptions {
  executeRetiredMutation?: RetiredMutationExecutor;
  loadMediaDescriptor?: MediaDescriptorLoader;
  now?: () => Date;
  createId?: () => string;
}

let defaultMediaServicePromise: Promise<{
  get(ownerUid: string, assetId: string): Promise<MediaAssetDescriptor | null>;
}> | undefined;

async function loadDefaultMediaDescriptor(
  ownerUid: string,
  assetId: string,
): Promise<MediaAssetDescriptor | null> {
  defaultMediaServicePromise ??= Promise.all([
    import('../media/dataConnectMediaAssetRepository'),
    import('../media/r2ObjectStore'),
    import('../media/mediaAssetService'),
  ]).then(([repositoryModule, objectStoreModule, serviceModule]) => (
    new serviceModule.MediaAssetService(
      new repositoryModule.DataConnectMediaAssetRepository(),
      new objectStoreModule.R2ObjectStore(),
    )
  ));
  try {
    return await (await defaultMediaServicePromise).get(ownerUid, assetId);
  } catch (error) {
    defaultMediaServicePromise = undefined;
    throw error;
  }
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
    .join(',')}}`;
}

function requestHash(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

function mutationIntentHash(
  operation: string,
  ownerUid: string,
  payload: unknown,
  expected?: PersistenceMutationContext['expected'],
): string {
  return requestHash({ operation, ownerUid, payload, expected });
}

function syncRevisionFor(ownerUid: string, operation: string, idempotencyKey: string): string {
  return requestHash({ ownerUid, operation, idempotencyKey });
}

function revisionAfter(value: string | number | bigint | null | undefined): string {
  try {
    return (BigInt(value ?? 0) + 1n).toString();
  } catch {
    return '1';
  }
}

function taggedError(message: string, code: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

function normalizePersistenceError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (/stale|revision changed|compare-and-swap|active portrait changed/i.test(message)) {
    throw taggedError(message, 'revision_conflict');
  }
  if (/administrator access|required owner|owned by another|owner mismatch/i.test(message)) {
    throw taggedError(message, 'forbidden');
  }
  throw error;
}

function assertExpected(
  expected: PersistenceMutationContext['expected'],
  current: { syncRevision?: string | null; updatedAt?: string | null } | null | undefined,
): void {
  if (!expected) return;
  if (expected.exists !== Boolean(current)) {
    throw taggedError('The remote record existence changed after it was read.', 'revision_conflict');
  }
  if (!current) return;
  if (
    expected.syncRevision !== undefined
    && (expected.syncRevision ?? null) !== (current.syncRevision ?? null)
  ) {
    throw taggedError('The remote sync revision changed after it was read.', 'revision_conflict');
  }
  if (
    expected.syncRevision === undefined
    && expected.updatedAt !== null
    && expected.updatedAt !== current.updatedAt
  ) {
    throw taggedError('The remote update timestamp changed after it was read.', 'revision_conflict');
  }
}

function glossaryRow(term: LoreGlossary) {
  return {
    id: term.id,
    novel_id: term.novel_id,
    source_text: term.source_text,
    target_text: term.target_text,
    target_lang: term.target_lang,
  } satisfies LoreGlossary;
}

function roleFromSql(value: string): UserProfile['role'] {
  const normalized = value.toLowerCase();
  return normalized === 'owner' || normalized === 'admin' ? normalized : 'user';
}

function tierFromSql(value: string): NonNullable<UserProfile['premiumTier']> {
  const normalized = value.toLowerCase();
  if (
    normalized === 'outer_sect'
    || normalized === 'inner_sect'
    || normalized === 'sect_master'
    || normalized === 'immortal'
  ) return normalized;
  return 'mortal';
}

function tierToSql(value: UserProfile['premiumTier']): SubscriptionTier {
  switch (value) {
    case 'outer_sect': return SubscriptionTier.OUTER_SECT;
    case 'inner_sect': return SubscriptionTier.INNER_SECT;
    case 'sect_master': return SubscriptionTier.SECT_MASTER;
    case 'immortal': return SubscriptionTier.IMMORTAL;
    default: return SubscriptionTier.MORTAL;
  }
}

function roleToSql(value: UserProfile['role']): AccountRole {
  if (value === 'owner') return AccountRole.OWNER;
  if (value === 'admin') return AccountRole.ADMIN;
  return AccountRole.USER;
}

function compactStorySummary(
  ownerUid: string,
  row: Awaited<ReturnType<typeof adminListOwnedStories>>['data']['stories'][number],
  cover?: MediaAssetDescriptor,
): StoryWorld {
  const summary: StoryWorld = {
    persistenceHydration: 'summary',
    persistenceId: row.id,
    userId: ownerUid,
    id: row.clientStoryId ?? row.legacyStoryId ?? row.id,
    sourceSeedId: row.sourceSeedId ?? undefined,
    parentStoryId: row.parentStoryId ?? undefined,
    forkChapterNumber: row.forkChapterNumber ?? undefined,
    title: row.title,
    genre: row.genre,
    mcName: row.mainCharacterName ?? '',
    customPremise: row.premise ?? '',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    syncRevision: row.syncRevision ?? undefined,
    memory: {
      powerSystem: '',
      currentPowerStage: '',
      worldRules: [],
      characters: [],
      unresolvedPlotThreads: [],
      resolvedPlotThreads: [],
    },
    arcs: [],
    currentChapterNumber: row.currentChapterNumber,
    coverAssetId: cover?.id,
    imageUrl: cover?.deliveryUrl,
    lastImageChapter: row.lastImageChapter ?? undefined,
    evolutionReady: row.evolutionReady,
    evolutionReason: row.evolutionReason ?? undefined,
    availableVisualUpdate: row.availableVisualUpdate,
    isEdited: row.isEdited,
    conflictResolvedAt: row.conflictResolvedAt ?? undefined,
    deleted: row.status === 'DELETED' || row.deletedAt != null,
  };
  if (cover) summary.mediaDescriptors = { [cover.id]: cover };
  return summary;
}

export class DataConnectApplicationRepository implements ApplicationPersistenceRepository {
  private readonly executeRetiredMutation: RetiredMutationExecutor;
  private readonly loadMediaDescriptor: MediaDescriptorLoader;
  private readonly now: () => Date;
  private readonly createId: () => string;

  constructor(options: DataConnectApplicationRepositoryOptions = {}) {
    getFirebaseAdminApp();
    this.executeRetiredMutation = options.executeRetiredMutation ?? (async (name, variables) => {
      const dataConnect = getDataConnect(connectorConfig, getFirebaseAdminApp());
      return dataConnect.executeMutation(name, variables);
    });
    this.loadMediaDescriptor = options.loadMediaDescriptor ?? loadDefaultMediaDescriptor;
    this.now = options.now ?? (() => new Date());
    this.createId = options.createId ?? randomUUID;
  }

  private async receipt(
    ownerUid: string,
    idempotencyKey: string,
    operation?: string,
    expectedHash?: string,
  ) {
    const result = await adminGetPersistenceReceipt({ ownerUid, idempotencyKey });
    const receipt = result.data.persistenceReceipt;
    if (!receipt) return null;
    if (operation && receipt.operation !== operation) {
      throw taggedError('The idempotency key belongs to a different persistence operation.', 'revision_conflict');
    }
    if (expectedHash && receipt.requestHash !== expectedHash) {
      throw taggedError('The idempotency key was reused with a different payload.', 'revision_conflict');
    }
    return receipt;
  }

  private async runRetired(
    operation: string,
    ownerUid: string,
    idempotencyKey: string,
    variables: RetiredMutationVariables,
    hash?: string,
  ): Promise<void> {
    if (await this.receipt(ownerUid, idempotencyKey, operation, hash)) return;
    try {
      await this.executeRetiredMutation(
        operation === 'UPSERT_STORY_GRAPH' ? 'AdminUpsertStoryGraph'
          : operation === 'PATCH_STORY_GRAPH' ? 'AdminPatchStoryGraph'
          : operation === 'UPSERT_CHAPTER_CONTENT_GRAPH' ? 'AdminUpsertChapterContentGraph'
            : operation === 'UPSERT_STORY_SEED_GRAPH' ? 'AdminUpsertStorySeedGraph'
              : operation === 'UPSERT_STORY_SEED_BATCH' ? 'AdminUpsertStorySeedBatch'
                : operation === 'UPSERT_USER_PROFILE_GRAPH' ? 'AdminUpsertUserProfileGraph'
                  : 'AdminUpsertOwnedGlossaryTerms',
        variables,
      );
    } catch (error) {
      if (await this.receipt(ownerUid, idempotencyKey, operation, hash)) return;
      normalizePersistenceError(error);
    }
  }

  private async listStoryRows(ownerUid: string) {
    const rows: Awaited<ReturnType<typeof adminListOwnedStories>>['data']['stories'] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const result = await adminListOwnedStories({ ownerUid, limit: PAGE_SIZE, offset });
      rows.push(...result.data.stories);
      if (result.data.stories.length < PAGE_SIZE) return rows;
    }
  }

  private async resolveStoryId(ownerUid: string, storyId: string): Promise<string | null> {
    const match = (await this.listStoryRows(ownerUid)).find(row =>
      row.id === storyId || row.clientStoryId === storyId || row.legacyStoryId === storyId,
    );
    return match?.id ?? null;
  }

  private async storyGraph(ownerUid: string, storyId: string): Promise<AdminGetOwnedStoryGraphData | null> {
    const resolved = await this.resolveStoryId(ownerUid, storyId);
    if (!resolved) return null;
    const result = await adminGetOwnedStoryGraph({ ownerUid, storyId: resolved });
    return result.data.story ? result.data : null;
  }

  private async hydrateStory(
    ownerUid: string,
    graph: AdminGetOwnedStoryGraphData,
  ): Promise<StoryWorld | null> {
    const story = hydrateStoryWorld(graph);
    if (!story) return null;
    // Historical attachment metadata stays in the graph, but signed delivery
    // descriptors are loaded only for assets visible on the current surface.
    const assetIds = [...new Set(graph.mediaSlots.map(slot => slot.currentAssetId))];
    const descriptors = new Map<string, MediaAssetDescriptor>();
    await Promise.all(assetIds.map(async assetId => {
      const descriptor = await this.loadMediaDescriptor(ownerUid, assetId);
      if (descriptor) descriptors.set(assetId, descriptor);
    }));
    const hydrated = hydrateStoryMediaDelivery(story, graph.mediaAttachments, descriptors);
    hydrated.mediaDescriptors = Object.fromEntries(descriptors);
    return hydrated;
  }

  private async hydrateChapter(
    ownerUid: string,
    graph: AdminGetOwnedChapterContentGraphData,
    clientStoryId: string,
  ): Promise<ChapterContent | null> {
    const content = hydrateChapterContent(graph);
    if (!content) return null;
    const assetIds = [...new Set(
      (graph.chapter?.voiceClips ?? [])
        .map(clip => clip.assetId)
        .filter((assetId): assetId is string => Boolean(assetId)),
    )];
    const descriptors = new Map<string, MediaAssetDescriptor>();
    await Promise.all(assetIds.map(async assetId => {
      const descriptor = await this.loadMediaDescriptor(ownerUid, assetId);
      if (descriptor) descriptors.set(assetId, descriptor);
    }));
    return {
      ...content,
      storyId: clientStoryId,
      audioManifest: content.audioManifest ? {
        ...content.audioManifest,
        clips: content.audioManifest.clips.map(clip => {
          const extended = clip as typeof clip & { assetId?: string };
          return {
            ...extended,
            audioUrl: (extended.assetId ? descriptors.get(extended.assetId)?.deliveryUrl : undefined)
              ?? clip.audioUrl,
          };
        }),
      } : undefined,
    };
  }

  async listStories(ownerUid: string): Promise<StoryWorld[]> {
    const rows = await this.listStoryRows(ownerUid);
    const coverAssetIdByStoryId = new Map<string, string>();
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const result = await adminListOwnedStoryCoverSlots({
        ownerUid,
        limit: PAGE_SIZE,
        offset,
      });
      for (const slot of result.data.coverSlots) {
        if (slot.storyId && !coverAssetIdByStoryId.has(slot.storyId)) {
          coverAssetIdByStoryId.set(slot.storyId, slot.currentAssetId);
        }
      }
      if (result.data.coverSlots.length < PAGE_SIZE) break;
    }
    const descriptors = new Map<string, MediaAssetDescriptor>();
    await Promise.all([...new Set(coverAssetIdByStoryId.values())].map(async assetId => {
      const descriptor = await this.loadMediaDescriptor(ownerUid, assetId);
      if (descriptor) descriptors.set(assetId, descriptor);
    }));
    return rows.map(row => compactStorySummary(
      ownerUid,
      row,
      descriptors.get(coverAssetIdByStoryId.get(row.id) ?? ''),
    ));
  }

  async getStory(ownerUid: string, storyId: string): Promise<StoryWorld | null> {
    const graph = await this.storyGraph(ownerUid, storyId);
    return graph ? this.hydrateStory(ownerUid, graph) : null;
  }

  async saveStory(
    ownerUid: string,
    story: StoryWorld,
    context: PersistenceMutationContext,
  ): Promise<StoryWorld> {
    if (story.userId && story.userId !== ownerUid) throw taggedError('Story owner mismatch.', 'forbidden');
    const operation = 'UPSERT_STORY_GRAPH';
    const hash = mutationIntentHash(operation, ownerUid, story, context.expected);
    if (await this.receipt(ownerUid, context.idempotencyKey, operation, hash)) {
      const replay = await this.getStory(ownerUid, story.persistenceId ?? story.id);
      if (!replay) throw new Error('Story persistence receipt exists without its story graph.');
      return replay;
    }
    const storyId = story.persistenceId
      ? persistenceUuid(story.persistenceId, 'story', story.id)
      : await this.resolveStoryId(ownerUid, story.id)
        ?? persistenceUuid(story.id, 'story', story.id);
    const currentResult = await adminGetOwnedStoryGraph({ ownerUid, storyId });
    const current = currentResult.data.story ? currentResult.data : null;
    assertExpected(context.expected, current?.story);
    const variables: AdminUpsertStoryGraphVariables = mapStoryWorldToGraphVariables({
      ownerUid,
      story: { ...story, userId: ownerUid, persistenceId: storyId },
      currentGraph: current,
      expectedSyncRevision: current?.story?.syncRevision ?? null,
      newSyncRevision: story.syncRevision
        ?? syncRevisionFor(ownerUid, operation, context.idempotencyKey),
      newRevision: revisionAfter(current?.story?.revision),
      idempotencyKey: context.idempotencyKey,
      requestHash: hash,
    });
    await this.runRetired(
      operation,
      ownerUid,
      context.idempotencyKey,
      variables as unknown as RetiredMutationVariables,
      hash,
    );
    const saved = await this.getStory(ownerUid, storyId);
    if (!saved) throw new Error('Story graph committed but could not be read back.');
    return saved;
  }

  async patchStory(
    ownerUid: string,
    storyId: string,
    patch: StoryPatchOperation[],
    context: PersistenceMutationContext,
  ) {
    const operation = 'PATCH_STORY_GRAPH';
    const hash = mutationIntentHash(operation, ownerUid, { storyId, patch }, context.expected);
    if (await this.receipt(ownerUid, context.idempotencyKey, operation, hash)) {
      const replay = await this.getStory(ownerUid, storyId);
      if (!replay) throw new Error('Story patch receipt exists without its story graph.');
      return { story: replay, affectedRows: 0, durationMs: 0 };
    }
    const graph = await this.storyGraph(ownerUid, storyId);
    if (!graph?.story) throw new Error('Owned story was not found for a bounded patch.');
    assertExpected(context.expected, graph.story);
    const current = hydrateStoryWorld(graph);
    if (!current) throw new Error('Owned story graph could not be hydrated for a bounded patch.');
    const desired = applyStoryPatch(current, patch);
    if (
      desired.id !== current.id
      || desired.persistenceId !== current.persistenceId
      || (desired.userId && desired.userId !== ownerUid)
    ) {
      throw taggedError('Story patch cannot change aggregate ownership or identity.', 'forbidden');
    }
    const mapped: AdminPatchStoryGraphVariables = mapStoryWorldToPatchVariables({
      ownerUid,
      story: { ...desired, userId: ownerUid, persistenceHydration: 'full' },
      currentGraph: graph,
      expectedSyncRevision: graph.story.syncRevision ?? null,
      newSyncRevision: desired.syncRevision
        ?? syncRevisionFor(ownerUid, operation, context.idempotencyKey),
      newRevision: revisionAfter(graph.story.revision),
      idempotencyKey: context.idempotencyKey,
      requestHash: hash,
    });
    const { affectedRowCount, ...variables } = mapped;
    const startedAt = performance.now();
    await this.runRetired(
      operation,
      ownerUid,
      context.idempotencyKey,
      variables as unknown as RetiredMutationVariables,
      hash,
    );
    const durationMs = performance.now() - startedAt;
    const saved = await this.getStory(ownerUid, graph.story.id);
    if (!saved) throw new Error('Story patch committed but could not be read back.');
    return { story: saved, affectedRows: affectedRowCount, durationMs };
  }

  async deleteStory(
    ownerUid: string,
    storyId: string,
    context: PersistenceMutationContext,
  ): Promise<void> {
    if (await this.receipt(ownerUid, context.idempotencyKey, 'DELETE_STORY')) return;
    const graph = await this.storyGraph(ownerUid, storyId);
    if (!graph?.story) return;
    assertExpected(context.expected, graph.story);
    try {
      await adminDeleteOwnedStory({
        ownerUid,
        storyId: graph.story.id,
        expectedSyncRevision: graph.story.syncRevision,
        newSyncRevision: this.createId(),
        newRevision: revisionAfter(graph.story.revision),
        idempotencyKey: context.idempotencyKey,
        deletionJobId: this.createId(),
      });
    } catch (error) {
      if (await this.receipt(ownerUid, context.idempotencyKey, 'DELETE_STORY')) return;
      normalizePersistenceError(error);
    }
  }

  async getChapterContent(ownerUid: string, storyId: string, chapterNumber: number) {
    const graph = await this.storyGraph(ownerUid, storyId);
    const chapter = graph?.chapters.find(value => value.chapterNumber === chapterNumber);
    if (!graph?.story || !chapter || graph.story.status === 'DELETED') return null;
    const result = await adminGetOwnedChapterContentGraph({
      ownerUid,
      storyId: graph.story.id,
      chapterId: chapter.id,
    });
    return this.hydrateChapter(
      ownerUid,
      result.data,
      graph.story.clientStoryId ?? graph.story.legacyStoryId ?? graph.story.id,
    );
  }

  async saveChapterContent(
    ownerUid: string,
    storyId: string,
    content: Parameters<ApplicationPersistenceRepository['saveChapterContent']>[2],
    context: PersistenceMutationContext,
  ) {
    if (content.userId && content.userId !== ownerUid) {
      throw taggedError('Chapter content owner mismatch.', 'forbidden');
    }
    const operation = 'UPSERT_CHAPTER_CONTENT_GRAPH';
    const hash = mutationIntentHash(
      operation,
      ownerUid,
      { storyId, content },
      context.expected,
    );
    if (await this.receipt(ownerUid, context.idempotencyKey, operation, hash)) {
      const replay = await this.getChapterContent(ownerUid, storyId, content.chapterNumber);
      if (!replay) throw new Error('Chapter persistence receipt exists without its content graph.');
      return replay;
    }
    const storyGraph = await this.storyGraph(ownerUid, storyId);
    const chapter = storyGraph?.chapters.find(value => value.chapterNumber === content.chapterNumber);
    if (!storyGraph?.story || !chapter) throw new Error('Chapter scaffold was not found in the owned story.');
    const currentResult = await adminGetOwnedChapterContentGraph({
      ownerUid,
      storyId: storyGraph.story.id,
      chapterId: chapter.id,
    });
    assertExpected(context.expected, currentResult.data.chapter);
    const variables: AdminUpsertChapterContentGraphVariables = mapChapterContentToGraphVariables({
      ownerUid,
      storyId: storyGraph.story.id,
      content: { ...content, storyId: storyGraph.story.clientStoryId ?? content.storyId },
      currentGraph: currentResult.data,
      expectedSyncRevision: currentResult.data.chapter?.syncRevision ?? null,
      newSyncRevision: syncRevisionFor(ownerUid, operation, context.idempotencyKey),
      newRevision: revisionAfter(currentResult.data.chapter?.revision),
      idempotencyKey: context.idempotencyKey,
      requestHash: hash,
    });
    await this.runRetired(
      operation, ownerUid, context.idempotencyKey,
      variables as unknown as RetiredMutationVariables, hash,
    );
    const saved = await this.getChapterContent(ownerUid, storyGraph.story.id, content.chapterNumber);
    if (!saved) throw new Error('Chapter content committed but could not be read back.');
    return saved;
  }

  async listGlossary(ownerUid: string, storyId: string): Promise<LoreGlossary[]> {
    const resolved = await this.resolveStoryId(ownerUid, storyId);
    if (!resolved) return [];
    const result = await adminListOwnedGlossaryTerms({ ownerUid, storyId: resolved, limit: 1000 });
    return result.data.glossaryTerms.map(term => glossaryRow({
      id: term.id,
      novel_id: storyId,
      source_text: term.sourceText,
      target_text: term.targetText,
      target_lang: term.targetLanguage,
    }));
  }

  async saveGlossaryTerms(
    ownerUid: string,
    storyId: string,
    terms: Array<Omit<LoreGlossary, 'id'> & { id?: string }>,
    idempotencyKey: string,
  ): Promise<LoreGlossary[]> {
    const resolved = await this.resolveStoryId(ownerUid, storyId);
    if (!resolved) throw new Error('Owned story was not found for glossary terms.');
    const now = this.now().toISOString();
    const rows = terms.map(term => ({
      id: persistenceUuid(term.id, 'glossary-term', resolved, term.source_text, term.target_lang),
      storyId: resolved,
      sourceText: term.source_text,
      targetText: term.target_text,
      targetLanguage: term.target_lang,
      createdAt: now,
      updatedAt: now,
    }));
    await this.runRetired(
      'UPSERT_GLOSSARY_TERMS', ownerUid, idempotencyKey,
      { ownerUid, storyId: resolved, idempotencyKey, terms: rows },
    );
    return rows.map(term => glossaryRow({
      id: term.id,
      novel_id: storyId,
      source_text: term.sourceText,
      target_text: term.targetText,
      target_lang: term.targetLanguage,
    }));
  }

  async deleteGlossaryTerm(ownerUid: string, termId: string, idempotencyKey: string): Promise<void> {
    if (await this.receipt(ownerUid, idempotencyKey, 'DELETE_GLOSSARY_TERM')) return;
    try {
      await adminDeleteOwnedGlossaryTerm({ ownerUid, termId, idempotencyKey });
    } catch (error) {
      if (await this.receipt(ownerUid, idempotencyKey, 'DELETE_GLOSSARY_TERM')) return;
      normalizePersistenceError(error);
    }
  }

  private async listSeedRows(ownerUid: string) {
    const rows: Awaited<ReturnType<typeof adminListOwnedStorySeeds>>['data']['storySeeds'] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const result = await adminListOwnedStorySeeds({ ownerUid, limit: PAGE_SIZE, offset });
      rows.push(...result.data.storySeeds);
      if (result.data.storySeeds.length < PAGE_SIZE) return rows;
    }
  }

  private async resolveSeedId(ownerUid: string, seedId: string): Promise<string | null> {
    const row = (await this.listSeedRows(ownerUid)).find(value =>
      value.id === seedId || value.clientSeedId === seedId || value.legacySeedId === seedId,
    );
    return row?.id ?? null;
  }

  private async seedGraph(ownerUid: string, seedId: string): Promise<AdminGetOwnedStorySeedGraphData | null> {
    const resolved = await this.resolveSeedId(ownerUid, seedId);
    if (!resolved) return null;
    const result = await adminGetOwnedStorySeedGraph({ ownerUid, seedId: resolved });
    return result.data.storySeed && !result.data.storySeed.deletedAt ? result.data : null;
  }

  async listSeeds(ownerUid: string): Promise<StorySeed[]> {
    const rows = (await this.listSeedRows(ownerUid)).filter(row => !row.deletedAt);
    const seeds = await Promise.all(rows.map(async row => {
      const result = await adminGetOwnedStorySeedGraph({ ownerUid, seedId: row.id });
      return result.data.storySeed && !result.data.storySeed.deletedAt
        ? hydrateStorySeed(result.data)
        : null;
    }));
    return seeds.filter((seed): seed is StorySeed => Boolean(seed));
  }

  async getSeed(ownerUid: string, seedId: string): Promise<StorySeed | null> {
    const graph = await this.seedGraph(ownerUid, seedId);
    return graph ? hydrateStorySeed(graph) : null;
  }

  async saveSeed(
    ownerUid: string,
    seed: StorySeed,
    context: PersistenceMutationContext,
  ): Promise<StorySeed> {
    if (seed.userId !== ownerUid) throw taggedError('Story seed owner mismatch.', 'forbidden');
    const operation = 'UPSERT_STORY_SEED_GRAPH';
    const hash = mutationIntentHash(operation, ownerUid, seed, context.expected);
    if (await this.receipt(ownerUid, context.idempotencyKey, operation, hash)) {
      const replay = await this.getSeed(ownerUid, seed.id);
      if (!replay) throw new Error('Story seed persistence receipt exists without its graph.');
      return replay;
    }
    const seedId = await this.resolveSeedId(ownerUid, seed.id)
      ?? persistenceUuid(seed.id, 'seed', ownerUid);
    const currentResult = await adminGetOwnedStorySeedGraph({ ownerUid, seedId });
    const current = currentResult.data.storySeed ? currentResult.data : null;
    if (current?.storySeed.deletedAt) {
      throw taggedError('A deleted story seed cannot be overwritten.', 'revision_conflict');
    }
    assertExpected(context.expected, current?.storySeed);
    const variables: AdminUpsertStorySeedGraphVariables = mapStorySeedToGraphVariables({
      ownerUid,
      seed,
      currentGraph: current,
      expectedSyncRevision: current?.storySeed?.syncRevision ?? null,
      newSyncRevision: syncRevisionFor(ownerUid, operation, context.idempotencyKey),
      newRevision: revisionAfter(current?.storySeed?.revision),
      idempotencyKey: context.idempotencyKey,
      requestHash: hash,
    });
    await this.runRetired(
      operation, ownerUid, context.idempotencyKey,
      variables as unknown as RetiredMutationVariables, hash,
    );
    const saved = await this.getSeed(ownerUid, seedId);
    if (!saved) throw new Error('Story seed committed but could not be read back.');
    return saved;
  }

  async saveSeeds(ownerUid: string, seeds: StorySeed[], idempotencyKey: string): Promise<StorySeed[]> {
    if (seeds.length === 0) return [];
    for (const seed of seeds) {
      if (seed.userId !== ownerUid) throw taggedError('Story seed owner mismatch.', 'forbidden');
    }
    if (new Set(seeds.map(seed => seed.id)).size !== seeds.length) {
      throw taggedError('Seed batch contains duplicate client seed IDs.', 'revision_conflict');
    }
    const operation = 'UPSERT_STORY_SEED_BATCH';
    const hash = mutationIntentHash(operation, ownerUid, seeds);
    if (await this.receipt(ownerUid, idempotencyKey, operation, hash)) {
      const replay = await Promise.all(seeds.map(seed => this.getSeed(ownerUid, seed.id)));
      if (replay.some(seed => !seed)) {
        throw new Error('Seed batch persistence receipt exists without every seed graph.');
      }
      return replay as StorySeed[];
    }
    const existingRows = await this.listSeedRows(ownerUid);
    const rowByExternalId = new Map<string, (typeof existingRows)[number]>();
    for (const row of existingRows) {
      rowByExternalId.set(row.id, row);
      if (row.clientSeedId) rowByExternalId.set(row.clientSeedId, row);
      if (row.legacySeedId) rowByExternalId.set(row.legacySeedId, row);
    }
    const seedIds = seeds.map(seed => rowByExternalId.get(seed.id)?.id
      ?? persistenceUuid(seed.id, 'seed', ownerUid));
    if (new Set(seedIds).size !== seedIds.length) {
      throw taggedError('Seed batch resolves multiple inputs to the same seed.', 'revision_conflict');
    }
    const manifests = await Promise.all(seeds.map(async (seed, index) => {
      const seedId = seedIds[index];
      const currentResult = await adminGetOwnedStorySeedGraph({ ownerUid, seedId });
      const current = currentResult.data.storySeed ? currentResult.data : null;
      if (current?.storySeed.deletedAt) {
        throw taggedError('A deleted story seed cannot be overwritten.', 'revision_conflict');
      }
      return mapStorySeedToGraphVariables({
        ownerUid,
        seed,
        currentGraph: current,
        expectedSyncRevision: current?.storySeed?.syncRevision ?? null,
        newSyncRevision: syncRevisionFor(ownerUid, `${operation}:${seedId}`, idempotencyKey),
        newRevision: revisionAfter(current?.storySeed?.revision),
        idempotencyKey,
        requestHash: hash,
      });
    }));
    const variables = {
      ownerUid,
      idempotencyKey,
      seedIds: manifests.map(value => value.seedId),
      seeds: manifests.map(value => value.seed),
      fields: manifests.flatMap(value => value.fields),
      entityIds: manifests.flatMap(value => value.entityIds),
      entities: manifests.flatMap(value => value.entities),
      entityAliases: manifests.flatMap(value => value.entityAliases),
    };
    await this.runRetired(
      operation, ownerUid, idempotencyKey,
      { ...variables, requestHash: hash }, hash,
    );
    const saved = await Promise.all(manifests.map(value => this.getSeed(ownerUid, value.seedId)));
    if (saved.some(seed => !seed)) throw new Error('Seed batch committed but could not be read back.');
    return saved as StorySeed[];
  }

  async deleteSeed(ownerUid: string, seedId: string, idempotencyKey: string): Promise<void> {
    if (await this.receipt(ownerUid, idempotencyKey, 'DELETE_STORY_SEED')) return;
    const resolved = await this.resolveSeedId(ownerUid, seedId);
    if (!resolved) return;
    try {
      await adminDeleteOwnedStorySeed({ ownerUid, seedId: resolved, idempotencyKey });
    } catch (error) {
      if (await this.receipt(ownerUid, idempotencyKey, 'DELETE_STORY_SEED')) return;
      normalizePersistenceError(error);
    }
  }

  async getProfile(ownerUid: string): Promise<UserProfile | null> {
    const result = await adminGetUserProfileGraph({ ownerUid });
    const profile = hydrateUserProfile(result.data);
    if (!profile?.activePortraitId) return profile;
    const descriptor = await this.loadMediaDescriptor(ownerUid, profile.activePortraitId);
    return hydrateProfilePortraitDelivery(profile, descriptor);
  }

  async saveProfile(
    ownerUid: string,
    patch: Partial<UserProfile>,
    context: PersistenceMutationContext,
  ): Promise<UserProfile> {
    if (patch.uid && patch.uid !== ownerUid) throw taggedError('Profile owner mismatch.', 'forbidden');
    const operation = 'UPSERT_USER_PROFILE_GRAPH';
    const hash = mutationIntentHash(operation, ownerUid, patch, context.expected);
    if (await this.receipt(ownerUid, context.idempotencyKey, operation, hash)) {
      const replay = await this.getProfile(ownerUid);
      if (!replay) throw new Error('Profile persistence receipt exists without its graph.');
      return replay;
    }
    const currentResult = await adminGetUserProfileGraph({ ownerUid });
    assertExpected(context.expected, currentResult.data.profile);
    const variables: AdminUpsertUserProfileGraphVariables = mapUserProfileToGraphVariables({
      ownerUid,
      patch: { ...patch, uid: ownerUid },
      currentGraph: currentResult.data.profile ? currentResult.data : null,
      expectedSyncRevision: currentResult.data.profile?.syncRevision ?? null,
      newSyncRevision: syncRevisionFor(ownerUid, operation, context.idempotencyKey),
      newRevision: revisionAfter(currentResult.data.profile?.revision),
      idempotencyKey: context.idempotencyKey,
      requestHash: hash,
    });
    await this.runRetired(
      operation, ownerUid, context.idempotencyKey,
      variables as unknown as RetiredMutationVariables, hash,
    );
    const saved = await this.getProfile(ownerUid);
    if (!saved) throw new Error('User profile committed but could not be read back.');
    return saved;
  }

  async consumeImageQuota(ownerUid: string, idempotencyKey: string) {
    const existing = await adminGetImageQuotaConsumption({ ownerUid, idempotencyKey });
    if (existing.data.imageQuotaConsumption) {
      return {
        imageGenerationCount: existing.data.imageQuotaConsumption.imageGenerationCount,
        imageQuotaResetAt: existing.data.imageQuotaConsumption.imageQuotaResetAt,
      };
    }
    const now = this.now();
    const nextReset = new Date(now);
    nextReset.setUTCDate(nextReset.getUTCDate() + 1);
    nextReset.setUTCHours(0, 0, 0, 0);
    try {
      await adminConsumeImageGenerationQuota({
        ownerUid,
        idempotencyKey,
        now: now.toISOString(),
        nextReset: nextReset.toISOString(),
      });
    } catch (error) {
      const replay = await adminGetImageQuotaConsumption({ ownerUid, idempotencyKey });
      if (!replay.data.imageQuotaConsumption) throw error;
    }
    const result = await adminGetImageQuotaConsumption({ ownerUid, idempotencyKey });
    if (!result.data.imageQuotaConsumption) throw new Error('Image quota was consumed without a receipt.');
    return {
      imageGenerationCount: result.data.imageQuotaConsumption.imageGenerationCount,
      imageQuotaResetAt: result.data.imageQuotaConsumption.imageQuotaResetAt,
    };
  }

  async selectPortrait(
    ownerUid: string,
    input: PortraitSelectionInput,
    idempotencyKey: string,
  ): Promise<UserProfile> {
    if (await this.receipt(ownerUid, idempotencyKey, 'SELECT_USER_PORTRAIT')) {
      const replay = await this.getProfile(ownerUid);
      if (!replay) throw new Error('Portrait selection receipt exists without a profile.');
      return replay;
    }
    const current = await adminGetUserProfileGraph({ ownerUid });
    if (!current.data.profile) throw new Error('User profile must exist before selecting a portrait.');
    try {
      await adminSelectUserPortrait({
        ownerUid,
        assetId: input.assetId,
        idempotencyKey,
        expectedActivePortraitAssetId: current.data.profile.activePortraitAssetId,
        expectedSyncRevision: current.data.profile.syncRevision,
        newSyncRevision: this.createId(),
        newRevision: revisionAfter(current.data.profile.revision),
        prompt: input.prompt,
        description: input.description,
        daoRank: input.daoRank,
        daoXp: input.daoXp == null ? null : String(input.daoXp),
        powerStage: input.powerStage,
        equippedInventoryItemId: input.equippedArtifactId
          ? persistenceUuid(input.equippedArtifactId, 'profile-inventory', ownerUid)
          : null,
        usedReferenceImage: input.usedReferenceImage ?? false,
        frameId: input.customization?.frameId,
        glowId: input.customization?.glowId,
        bannerId: input.customization?.bannerId,
        effectIds: input.customization?.effectIds,
      });
    } catch (error) {
      if (!(await this.receipt(ownerUid, idempotencyKey, 'SELECT_USER_PORTRAIT'))) {
        normalizePersistenceError(error);
      }
    }
    const saved = await this.getProfile(ownerUid);
    if (!saved) throw new Error('Portrait selected but profile could not be read back.');
    return saved;
  }

  async recoverPortraits(ownerUid: string, idempotencyKey: string): Promise<number> {
    if (await this.receipt(ownerUid, idempotencyKey, 'RECOVER_USER_PORTRAITS')) return 0;
    try {
      const result = await adminRecoverPendingUserPortraits({ ownerUid, idempotencyKey });
      return result.data.recovered ?? 0;
    } catch (error) {
      if (await this.receipt(ownerUid, idempotencyKey, 'RECOVER_USER_PORTRAITS')) return 0;
      throw error;
    }
  }

  async getAdminOverview(actorUid: string): Promise<PersistenceAdminOverview> {
    const result = await adminGetAdminOverview({ actorUid, limit: 1000 });
    const profiles = new Map(result.data.profiles.map(profile => [profile.userUid, profile]));
    return {
      users: result.data.accounts.map(account => {
        const profile = profiles.get(account.uid);
        return {
          uid: account.uid,
          username: profile?.username ?? account.email?.split('@')[0] ?? account.uid,
          displayName: account.displayName ?? '',
          avatarUrl: '',
          preferredLanguage: 'English',
          defaultTranslationLanguage: 'English',
          savedStoryCount: profile?.savedStoryCount ?? 0,
          activeStories: [],
          inactiveStories: [],
          joinedDate: account.createdAt,
          updatedAt: profile?.updatedAt ?? account.updatedAt,
          role: roleFromSql(account.role),
          premiumTier: tierFromSql(profile?.subscriptionTier ?? 'MORTAL'),
          qi: profile?.legacyQi == null ? undefined : Number(profile.legacyQi),
          dao_xp: Number(profile?.daoXp ?? 0),
          dao_rank: profile?.daoRank ?? undefined,
          heavenly_qi: Number(profile?.heavenlyQi ?? 0),
          sect_qi: Number(profile?.sectQi ?? 0),
          demonic_qi: Number(profile?.demonicQi ?? 0),
          writingStreak: profile?.writingStreak ?? 0,
          activePortraitId: profile?.activePortraitAssetId ?? undefined,
          imageGenerationCount: profile?.imageGenerationCount ?? 0,
          imageQuotaResetAt: profile?.imageQuotaResetAt ?? undefined,
          syncRevision: profile?.syncRevision ?? undefined,
        } as UserProfile;
      }),
      stories: result.data.stories.map(story => ({
        id: story.clientStoryId ?? story.legacyStoryId ?? story.id,
        ownerUid: story.ownerUid,
        title: story.title,
        deleted: story.status === 'DELETED',
        updatedAt: story.updatedAt,
      })),
    };
  }

  async updateAdminAccount(
    actorUid: string,
    ownerUid: string,
    patch: Pick<UserProfile, 'role' | 'premiumTier'>,
    idempotencyKey: string,
  ): Promise<UserProfile> {
    if (await this.receipt(ownerUid, idempotencyKey, 'UPDATE_ACCOUNT_ACCESS')) {
      const replay = await this.getProfile(ownerUid);
      if (!replay) throw new Error('Account access receipt exists without a profile.');
      return replay;
    }
    const current = await adminGetUserProfileGraph({ ownerUid });
    if (!current.data.account || !current.data.profile) throw new Error('Target account was not found.');
    try {
      await adminUpdateAccountAccess({
        actorUid,
        ownerUid,
        role: roleToSql(patch.role ?? roleFromSql(current.data.account.role)),
        subscriptionTier: tierToSql(
          patch.premiumTier ?? tierFromSql(current.data.profile.subscriptionTier),
        ),
        idempotencyKey,
      });
    } catch (error) {
      if (!(await this.receipt(ownerUid, idempotencyKey, 'UPDATE_ACCOUNT_ACCESS'))) {
        normalizePersistenceError(error);
      }
    }
    const saved = await this.getProfile(ownerUid);
    if (!saved) throw new Error('Account access updated but profile could not be read back.');
    return { ...saved, role: patch.role ?? saved.role, premiumTier: patch.premiumTier ?? saved.premiumTier };
  }

  async deleteAdminStory(actorUid: string, storyId: string, idempotencyKey: string): Promise<void> {
    const overview = await adminGetAdminOverview({ actorUid, limit: 1000 });
    const row = overview.data.stories.find(story =>
      story.id === storyId || story.clientStoryId === storyId || story.legacyStoryId === storyId,
    );
    if (!row || row.status === 'DELETED') return;
    if (await this.receipt(row.ownerUid, idempotencyKey, 'DELETE_STORY_ADMIN')) return;
    try {
      await adminDeleteStoryAsAdmin({
        actorUid,
        ownerUid: row.ownerUid,
        storyId: row.id,
        expectedSyncRevision: row.syncRevision,
        newSyncRevision: this.createId(),
        newRevision: revisionAfter(row.revision),
        idempotencyKey,
        deletionJobId: this.createId(),
      });
    } catch (error) {
      if (await this.receipt(row.ownerUid, idempotencyKey, 'DELETE_STORY_ADMIN')) return;
      normalizePersistenceError(error);
    }
  }
}

export type DataConnectApplicationRepositoryContract = ApplicationPersistenceRepository;
