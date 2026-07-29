/**
 * In-memory stand-in for the PostgreSQL/Data Connect engine.
 *
 * This is deliberately the ONLY faked layer of the persistence stack. Every
 * mapping, declared revision guard, idempotency receipt and hydration decision
 * still runs through the real `graphMapper`,
 * `DataConnectApplicationRepository`, `persistenceRouter` and
 * `DataConnectStorageAdapter`. The store therefore behaves like the relational
 * backend: it applies the exact row manifests the mapper emits, honours each
 * mutation's compare-and-swap contract, records persistence receipts, and
 * reassembles the normalized rows into the nested read graph the queries
 * return.
 *
 * It is intentionally strict. A write that the real schema would reject —
 * a missing scaffold, a stale sync revision, a reused idempotency key with a
 * different payload — fails here too, so a test can never pass because the
 * backend was lenient.
 */

import { canonicalAssetId, isSameAssetId } from '../../contracts/assetIdentity';
import type { MediaAssociation } from '../../contracts/mediaAssets';

type Row = Record<string, unknown>;

const STORY_COLLECTIONS = [
  'members',
  'preferences',
  'readerPreferences',
  'memoryStates',
  'memoryWarnings',
  'rules',
  'revealBackdrops',
  'arcs',
  'chapters',
  'codexEntities',
  'codexAliases',
  'codexAttributes',
  'abilityProgression',
  'codexThreadLinks',
  'codexRelationships',
  'plotThreads',
  'karmaNodes',
  'timelineEvents',
  'bookmarks',
  'readingProgresses',
  'arcReadingProgresses',
  'glossaryTerms',
  'generationJobs',
  'generationEvents',
  'generationBatches',
  'generationBatchItems',
] as const;

type StoryCollection = (typeof STORY_COLLECTIONS)[number];

interface StoryRecord {
  ownerUid: string;
  story: Row;
  collections: Record<StoryCollection, Row[]>;
}

interface ChapterContentRecord {
  content: Row | null;
  blocks: Row[];
  blockAttributes: Row[];
  blockEntityMentions: Row[];
  translations: Row[];
  fingerprints: Row[];
  facts: Row[];
  factSupersessions: Row[];
  audioManifests: Row[];
  voiceClips: Row[];
}

interface ProfileRecord {
  account: Row;
  profile: Row;
  preferences: Row[];
  inventory: Row[];
  effects: Row[];
  progressEvents: Row[];
  portraits: Row[];
}

export interface MediaAssetRow {
  id: string;
  ownerUid: string;
  storyId?: string | null;
  assetType: 'IMAGE';
  purpose: string;
  visibility: 'PRIVATE';
  status: string;
  mimeType: string;
  checksumSha256: string;
  version: number;
  byteSize: string;
  deliveryUrl: string;
  deliveryUrlExpiresAt?: string;
  createdAt: string;
}

export interface MediaSlotRow {
  ownerUid: string;
  storyId?: string | null;
  chapterId?: string | null;
  entityId?: string | null;
  targetKind: string;
  targetKey: string;
  purpose: string;
  currentAssetId: string;
  version: string;
  updatedAt: string;
}

export interface MediaAttachmentRow {
  id: string;
  ownerUid: string;
  assetId: string;
  storyId?: string | null;
  chapterId?: string | null;
  entityId?: string | null;
  targetKind: string;
  targetKey: string;
  purpose: string;
  clientHistoryId?: string | null;
  promptUsed?: string | null;
  chapterNumber?: number | null;
  arcTitle?: string | null;
  label?: string | null;
  position: number;
  isCurrent: boolean;
  createdAt: string;
  endedAt?: string | null;
}

function clone<T>(value: T): T {
  return value === undefined ? value : (structuredClone(value) as T);
}

function sameScopedId(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  if (!left || !right) return (left ?? null) === (right ?? null);
  return canonicalAssetId(left) === canonicalAssetId(right);
}

function emptyCollections(): Record<StoryCollection, Row[]> {
  return Object.fromEntries(
    STORY_COLLECTIONS.map((name) => [name, [] as Row[]]),
  ) as Record<StoryCollection, Row[]>;
}

function rows(variables: Row, key: string): Row[] {
  const value = variables[key];
  return Array.isArray(value) ? (value as Row[]).map((entry) => clone(entry)) : [];
}

function ids(variables: Row, key: string): string[] {
  const value = variables[key];
  return Array.isArray(value) ? value.map((entry) => String(entry)) : [];
}

function keyOf(row: Row, fields: readonly string[]): string {
  return fields.map((field) => String(row[field] ?? '')).join('\u0000');
}

function upsertRows(current: Row[], incoming: Row[], fields: readonly string[]): Row[] {
  const merged = new Map(current.map((row) => [keyOf(row, fields), row]));
  for (const row of incoming) merged.set(keyOf(row, fields), row);
  return [...merged.values()];
}

function staleError(what: string): Error {
  return new Error(`${what} is stale: the remote sync revision changed after it was read.`);
}

/** Key fields the relational schema uses to identify each story child row. */
const STORY_ROW_KEYS: Record<StoryCollection, readonly string[]> = {
  members: ['userUid'],
  preferences: ['storyId'],
  readerPreferences: ['userUid'],
  memoryStates: ['storyId'],
  memoryWarnings: ['id'],
  rules: ['id'],
  revealBackdrops: ['entityStableKey'],
  arcs: ['id'],
  chapters: ['id'],
  codexEntities: ['id'],
  codexAliases: ['entityId', 'normalizedAlias'],
  codexAttributes: ['entityId', 'attributeKey'],
  abilityProgression: ['id'],
  codexThreadLinks: ['entityId', 'threadId'],
  codexRelationships: ['id'],
  plotThreads: ['id'],
  karmaNodes: ['id'],
  timelineEvents: ['id'],
  bookmarks: ['id'],
  readingProgresses: ['userUid'],
  arcReadingProgresses: ['userUid', 'arcNumber'],
  glossaryTerms: ['id'],
  generationJobs: ['id'],
  generationEvents: ['id'],
  generationBatches: ['id'],
  generationBatchItems: ['batchId', 'chapterNumber'],
};

export class InMemoryDataConnect {
  private readonly stories = new Map<string, StoryRecord>();
  private readonly chapterContents = new Map<string, ChapterContentRecord>();
  private readonly profiles = new Map<string, ProfileRecord>();
  private readonly receipts = new Map<string, Row>();
  private readonly imageQuota = new Map<string, Row>();
  private readonly seeds = new Map<string, { ownerUid: string; seed: Row; fields: Row[]; entities: Row[]; entityAliases: Row[] }>();
  readonly mediaAssets = new Map<string, MediaAssetRow>();
  readonly mediaSlots: MediaSlotRow[] = [];
  readonly mediaAttachments: MediaAttachmentRow[] = [];
  /** Every mutation name applied, in order. Useful for asserting write shape. */
  readonly mutationLog: string[] = [];

  reset(): void {
    this.stories.clear();
    this.chapterContents.clear();
    this.profiles.clear();
    this.receipts.clear();
    this.imageQuota.clear();
    this.seeds.clear();
    this.mediaAssets.clear();
    this.mediaSlots.length = 0;
    this.mediaAttachments.length = 0;
    this.mutationLog.length = 0;
  }

  // ---------------------------------------------------------------- receipts

  private receiptKey(ownerUid: string, idempotencyKey: string): string {
    return `${ownerUid}\u0000${idempotencyKey}`;
  }

  private assertReceiptAvailable(operation: string, ownerUid: string, variables: Row): void {
    const idempotencyKey = String(variables.idempotencyKey ?? '');
    if (!idempotencyKey) throw new Error(`${operation} requires an idempotency key.`);
    const prior = this.receipts.get(this.receiptKey(ownerUid, idempotencyKey));
    if (!prior) return;
    if (
      prior.operation !== operation
      || (prior.requestHash ?? null) !== (variables.requestHash ?? null)
    ) {
      throw new Error(
        `Idempotency key ${idempotencyKey} was reused with a different operation or payload.`,
      );
    }
    throw new Error(`Idempotency key ${idempotencyKey} was already completed.`);
  }

  private recordReceipt(operation: string, ownerUid: string, variables: Row, extra: Row = {}): void {
    const idempotencyKey = String(variables.idempotencyKey ?? '');
    this.assertReceiptAvailable(operation, ownerUid, variables);
    this.receipts.set(this.receiptKey(ownerUid, idempotencyKey), {
      ownerUid,
      idempotencyKey,
      operation,
      requestHash: variables.requestHash ?? null,
      resultingSyncRevision: variables.newSyncRevision ?? null,
      resultingRevision: variables.newRevision ?? null,
      createdAt: new Date().toISOString(),
      ...extra,
    });
  }

  getPersistenceReceipt(ownerUid: string, idempotencyKey: string): Row | undefined {
    return clone(this.receipts.get(this.receiptKey(ownerUid, idempotencyKey)));
  }

  // ----------------------------------------------------------------- stories

  private requireOwnedStory(ownerUid: string, storyId: string): StoryRecord {
    const record = this.stories.get(storyId);
    if (!record || record.ownerUid !== ownerUid) {
      throw new Error(`Story ${storyId} is owned by another account or does not exist.`);
    }
    return record;
  }

  private assertStoryRevision(record: StoryRecord | undefined, expected: unknown): void {
    const current = record ? (record.story.syncRevision ?? null) : null;
    if ((expected ?? null) !== current) throw staleError('The story graph');
  }

  upsertStoryGraph(variables: Row): void {
    const ownerUid = String(variables.ownerUid);
    const storyId = String(variables.storyId);
    const existing = this.stories.get(storyId);
    if (existing && existing.ownerUid !== ownerUid) {
      throw new Error('The story graph is owned by another account.');
    }
    this.assertStoryRevision(existing, variables.expectedSyncRevision);

    const collections = emptyCollections();
    for (const name of STORY_COLLECTIONS) collections[name] = rows(variables, name);
    this.stories.set(storyId, {
      ownerUid,
      story: clone(variables.story as Row),
      collections,
    });
    this.recordReceipt('UPSERT_STORY_GRAPH', ownerUid, variables, { storyId });
  }

  patchStoryGraph(variables: Row): void {
    const ownerUid = String(variables.ownerUid);
    const storyId = String(variables.storyId);
    const record = this.requireOwnedStory(ownerUid, storyId);
    this.assertStoryRevision(record, variables.expectedSyncRevision);

    record.story = clone(variables.story as Row);

    const deletions: Partial<Record<StoryCollection, { field: string; values: Set<string> }>> = {
      members: { field: 'userUid', values: new Set(ids(variables, 'deletedMemberUserUids')) },
      readerPreferences: { field: 'userUid', values: new Set(ids(variables, 'deletedReaderPreferenceUserUids')) },
      memoryWarnings: { field: 'id', values: new Set(ids(variables, 'deletedMemoryWarningIds')) },
      rules: { field: 'id', values: new Set(ids(variables, 'deletedRuleIds')) },
      revealBackdrops: { field: 'entityStableKey', values: new Set(ids(variables, 'deletedRevealBackdropKeys')) },
      arcs: { field: 'id', values: new Set(ids(variables, 'deletedArcIds')) },
      chapters: { field: 'id', values: new Set(ids(variables, 'deletedChapterIds')) },
      codexEntities: { field: 'id', values: new Set(ids(variables, 'deletedCodexEntityIds')) },
      codexRelationships: { field: 'id', values: new Set(ids(variables, 'deletedCodexRelationshipIds')) },
      plotThreads: { field: 'id', values: new Set(ids(variables, 'deletedPlotThreadIds')) },
      karmaNodes: { field: 'id', values: new Set(ids(variables, 'deletedKarmaNodeIds')) },
      timelineEvents: { field: 'id', values: new Set(ids(variables, 'deletedTimelineEventIds')) },
      bookmarks: { field: 'id', values: new Set(ids(variables, 'deletedBookmarkIds')) },
      readingProgresses: { field: 'userUid', values: new Set(ids(variables, 'deletedReadingProgressUserUids')) },
      glossaryTerms: { field: 'id', values: new Set(ids(variables, 'deletedGlossaryTermIds')) },
      generationJobs: { field: 'id', values: new Set(ids(variables, 'deletedGenerationJobIds')) },
      generationBatches: { field: 'id', values: new Set(ids(variables, 'deletedGenerationBatchIds')) },
    };

    for (const [name, deletion] of Object.entries(deletions) as Array<[StoryCollection, { field: string; values: Set<string> }]>) {
      if (deletion.values.size === 0) continue;
      record.collections[name] = record.collections[name].filter(
        (row) => !deletion.values.has(String(row[deletion.field] ?? '')),
      );
    }
    const deletedArcProgress = new Set(
      (Array.isArray(variables.deletedArcReadingProgressNumbers)
        ? variables.deletedArcReadingProgressNumbers
        : []
      ).map((value) => Number(value)),
    );
    if (deletedArcProgress.size > 0) {
      record.collections.arcReadingProgresses = record.collections.arcReadingProgresses.filter(
        (row) => !deletedArcProgress.has(Number(row.arcNumber)),
      );
    }

    // Grouped children are replaced wholesale for every affected parent, which
    // is exactly how the relational mutation deletes-then-inserts them.
    const replacedEntities = new Set(ids(variables, 'replacedCodexChildEntityIds'));
    if (replacedEntities.size > 0) {
      record.collections.codexAliases = record.collections.codexAliases.filter(
        (row) => !replacedEntities.has(String(row.entityId ?? '')),
      );
      record.collections.codexAttributes = record.collections.codexAttributes.filter(
        (row) => !replacedEntities.has(String(row.entityId ?? '')),
      );
      record.collections.codexThreadLinks = record.collections.codexThreadLinks.filter(
        (row) => !replacedEntities.has(String(row.entityId ?? '')),
      );
      record.collections.abilityProgression = record.collections.abilityProgression.filter(
        (row) => !replacedEntities.has(String(row.abilityEntityId ?? '')),
      );
    }
    const replacedJobs = new Set(ids(variables, 'replacedGenerationJobIds'));
    if (replacedJobs.size > 0) {
      record.collections.generationEvents = record.collections.generationEvents.filter(
        (row) => !replacedJobs.has(String(row.jobId ?? '')),
      );
    }
    const replacedBatches = new Set(ids(variables, 'replacedGenerationBatchIds'));
    if (replacedBatches.size > 0) {
      record.collections.generationBatchItems = record.collections.generationBatchItems.filter(
        (row) => !replacedBatches.has(String(row.batchId ?? '')),
      );
    }
    // A deleted codex entity takes its children with it (ON DELETE CASCADE).
    const deletedEntities = deletions.codexEntities?.values ?? new Set<string>();
    if (deletedEntities.size > 0) {
      record.collections.codexAliases = record.collections.codexAliases.filter(
        (row) => !deletedEntities.has(String(row.entityId ?? '')),
      );
      record.collections.codexAttributes = record.collections.codexAttributes.filter(
        (row) => !deletedEntities.has(String(row.entityId ?? '')),
      );
      record.collections.codexThreadLinks = record.collections.codexThreadLinks.filter(
        (row) => !deletedEntities.has(String(row.entityId ?? '')),
      );
      record.collections.abilityProgression = record.collections.abilityProgression.filter(
        (row) => !deletedEntities.has(String(row.abilityEntityId ?? '')),
      );
    }
    const deletedChapters = deletions.chapters?.values ?? new Set<string>();
    for (const chapterId of deletedChapters) this.chapterContents.delete(chapterId);

    for (const name of STORY_COLLECTIONS) {
      const incoming = rows(variables, name);
      if (incoming.length === 0) continue;
      record.collections[name] = upsertRows(record.collections[name], incoming, STORY_ROW_KEYS[name]);
    }
    this.recordReceipt('PATCH_STORY_GRAPH', ownerUid, variables, { storyId });
  }

  upsertChapterContentGraph(variables: Row): void {
    const ownerUid = String(variables.ownerUid);
    const storyId = String(variables.storyId);
    const chapterId = String(variables.chapterId);
    const record = this.requireOwnedStory(ownerUid, storyId);
    // The chapter mutation guards the parent Story aggregate, not the chapter.
    this.assertStoryRevision(record, variables.expectedSyncRevision);
    const scaffold = record.collections.chapters.find((row) => String(row.id) === chapterId);
    if (!scaffold) throw new Error('Chapter scaffold was not found in the owned story.');

    record.collections.chapters = upsertRows(
      record.collections.chapters,
      [clone(variables.chapter as Row)],
      ['id'],
    );
    this.chapterContents.set(chapterId, {
      content: clone(variables.content as Row),
      blocks: rows(variables, 'blocks'),
      blockAttributes: rows(variables, 'blockAttributes'),
      blockEntityMentions: rows(variables, 'blockEntityMentions'),
      translations: rows(variables, 'translations'),
      fingerprints: rows(variables, 'fingerprints'),
      facts: rows(variables, 'facts'),
      factSupersessions: rows(variables, 'factSupersessions'),
      audioManifests: rows(variables, 'audioManifests'),
      voiceClips: rows(variables, 'voiceClips'),
    });
    // The same transaction advances the Story aggregate.
    record.story = {
      ...record.story,
      syncRevision: variables.newSyncRevision,
      revision: variables.newRevision,
      updatedAt: (variables.chapter as Row | undefined)?.updatedAt ?? record.story.updatedAt,
    };
    this.recordReceipt('UPSERT_CHAPTER_CONTENT_GRAPH', ownerUid, variables, { storyId, chapterId });
  }

  upsertGlossaryTerms(variables: Row): void {
    const ownerUid = String(variables.ownerUid);
    const storyId = String(variables.storyId);
    const record = this.requireOwnedStory(ownerUid, storyId);
    // The production AdminUpsertOwnedGlossaryTerms connector is owner- and
    // idempotency-guarded but does not accept a parent-story revision. Keep the
    // stand-in aligned with that contract instead of inventing a CAS input.
    record.collections.glossaryTerms = upsertRows(
      record.collections.glossaryTerms,
      rows(variables, 'terms'),
      ['id'],
    );
    this.recordReceipt('UPSERT_GLOSSARY_TERMS', ownerUid, variables, { storyId });
  }

  deleteGlossaryTerm(ownerUid: string, termId: string, idempotencyKey: string): void {
    this.assertReceiptAvailable('DELETE_GLOSSARY_TERM', ownerUid, { idempotencyKey });
    for (const record of this.stories.values()) {
      if (record.ownerUid !== ownerUid) continue;
      record.collections.glossaryTerms = record.collections.glossaryTerms.filter(
        (row) => String(row.id) !== termId,
      );
    }
    this.recordReceipt('DELETE_GLOSSARY_TERM', ownerUid, { idempotencyKey });
  }

  deleteOwnedStory(variables: Row): void {
    const ownerUid = String(variables.ownerUid);
    const storyId = String(variables.storyId);
    const record = this.requireOwnedStory(ownerUid, storyId);
    this.assertReceiptAvailable('DELETE_STORY', ownerUid, variables);
    this.assertStoryRevision(record, variables.expectedSyncRevision);
    // Production deletion is a tombstone, not an immediate child-row purge.
    // DataConnectApplicationRepository refuses chapter reads once the parent
    // story is DELETED, while the rows remain available for staged cleanup.
    record.story = {
      ...record.story,
      status: 'DELETED',
      deletedAt: new Date().toISOString(),
      syncRevision: variables.newSyncRevision,
      revision: variables.newRevision,
    };
    this.recordReceipt('DELETE_STORY', ownerUid, variables, { storyId });
  }

  /**
   * Soft-deleted stories are returned, exactly as `AdminListOwnedStories` and
   * `AdminGetOwnedStoryGraph` do — neither connector query filters on status.
   * The tombstone is the signal: `compactStorySummary` turns it into
   * `deleted: true` and the client's `applyCloudTombstone` needs it to remove a
   * story that another device deleted. Hiding them here would make a deletion
   * look like a story that simply vanished, and the replica would resurrect it.
   */
  listOwnedStories(ownerUid: string, limit: number, offset: number): Row[] {
    const all = [...this.stories.values()]
      .filter((record) => record.ownerUid === ownerUid)
      .map((record) => clone(record.story));
    return all.slice(offset, offset + limit);
  }

  /**
   * The `_select` aggregate carried by `AdminListOwnedStories`: one row per
   * story, counting the chapters that have a `chapter_content` row. Counts come
   * back as bigint strings exactly as the JSON boundary delivers them, so the
   * repository's normalization is exercised for real.
   */
  listOwnedStoryChapterCounts(ownerUid: string): Row[] {
    const counts: Row[] = [];
    for (const [storyId, record] of this.stories) {
      if (record.ownerUid !== ownerUid) continue;
      const chapters = record.collections.chapters;
      if (chapters.length === 0) continue;
      const generated = chapters.filter(
        (chapter) => Boolean(this.chapterContents.get(String(chapter.id))?.content),
      ).length;
      counts.push({
        storyId,
        totalChapterCount: String(chapters.length),
        generatedChapterCount: String(generated),
      });
    }
    return counts;
  }

  getOwnedStoryGraph(ownerUid: string, storyId: string): Row {
    const record = this.stories.get(storyId);
    if (!record || record.ownerUid !== ownerUid) {
      return this.emptyStoryGraph();
    }
    const collections = record.collections;
    const aliasesByEntity = groupBy(collections.codexAliases, 'entityId');
    const attributesByEntity = groupBy(collections.codexAttributes, 'entityId');
    const threadLinksByEntity = groupBy(collections.codexThreadLinks, 'entityId');
    const progressionByEntity = groupBy(collections.abilityProgression, 'abilityEntityId');
    const eventsByJob = groupBy(collections.generationEvents, 'jobId');
    const itemsByBatch = groupBy(collections.generationBatchItems, 'batchId');

    const sceneFingerprints = collections.chapters.flatMap((chapter) => {
      const content = this.chapterContents.get(String(chapter.id));
      return (content?.fingerprints ?? []).map((fingerprint) => ({
        chapterId: chapter.id,
        chapterNumber: fingerprint.chapterNumber,
        actionType: fingerprint.actionType,
        location: fingerprint.location ?? null,
        outcome: fingerprint.outcome,
        participants: fingerprint.participants ?? [],
      }));
    });

    return clone({
      story: record.story,
      members: collections.members,
      preferences: collections.preferences,
      readerPreferences: collections.readerPreferences,
      memoryStates: collections.memoryStates,
      memoryWarnings: collections.memoryWarnings,
      rules: collections.rules,
      revealBackdrops: collections.revealBackdrops,
      arcs: collections.arcs,
      sceneFingerprints,
      // `content: chapterContent_on_chapter { chapterId }` — the body row's
      // presence, with none of its prose.
      chapters: collections.chapters.map((chapter) => {
        const body = this.chapterContents.get(String(chapter.id))?.content;
        return body ? { ...chapter, content: { chapterId: chapter.id } } : chapter;
      }),
      codexEntities: collections.codexEntities.map((entity) => ({
        ...entity,
        aliases: aliasesByEntity.get(String(entity.id)) ?? [],
        attributes: attributesByEntity.get(String(entity.id)) ?? [],
        progression: progressionByEntity.get(String(entity.id)) ?? [],
        threadLinks: threadLinksByEntity.get(String(entity.id)) ?? [],
      })),
      codexRelationships: collections.codexRelationships,
      plotThreads: collections.plotThreads,
      karmaNodes: collections.karmaNodes,
      timelineEvents: collections.timelineEvents,
      bookmarks: collections.bookmarks,
      readingProgresses: collections.readingProgresses,
      arcReadingProgresses: collections.arcReadingProgresses,
      glossaryTerms: collections.glossaryTerms,
      generationJobs: collections.generationJobs.map((job) => ({
        ...job,
        events: eventsByJob.get(String(job.id)) ?? [],
      })),
      generationBatches: collections.generationBatches.map((batch) => ({
        ...batch,
        items: itemsByBatch.get(String(batch.id)) ?? [],
      })),
      mediaSlots: this.mediaSlots.filter(
        (slot) => slot.ownerUid === ownerUid && slot.storyId === storyId,
      ),
      mediaAttachments: this.mediaAttachments.filter(
        (attachment) => attachment.ownerUid === ownerUid && attachment.storyId === storyId,
      ),
      deletionJobs: [],
    });
  }

  private emptyStoryGraph(): Row {
    return {
      members: [],
      preferences: [],
      readerPreferences: [],
      memoryStates: [],
      memoryWarnings: [],
      rules: [],
      revealBackdrops: [],
      arcs: [],
      sceneFingerprints: [],
      chapters: [],
      codexEntities: [],
      codexRelationships: [],
      plotThreads: [],
      karmaNodes: [],
      timelineEvents: [],
      bookmarks: [],
      readingProgresses: [],
      arcReadingProgresses: [],
      glossaryTerms: [],
      generationJobs: [],
      generationBatches: [],
      mediaSlots: [],
      mediaAttachments: [],
      deletionJobs: [],
    };
  }

  getOwnedChapterContentGraph(ownerUid: string, storyId: string, chapterId: string): Row {
    const record = this.stories.get(storyId);
    if (!record || record.ownerUid !== ownerUid) return { fingerprints: [], facts: [] };
    const scaffold = record.collections.chapters.find((row) => String(row.id) === chapterId);
    if (!scaffold) return { fingerprints: [], facts: [] };
    const content = this.chapterContents.get(chapterId);
    const attributesByBlock = groupBy(content?.blockAttributes ?? [], 'blockId');
    const mentionsByBlock = groupBy(content?.blockEntityMentions ?? [], 'blockId');
    const supersessionsByFact = groupBy(content?.factSupersessions ?? [], 'newerFactId');
    return clone({
      chapter: {
        ...scaffold,
        content: content?.content ?? undefined,
        blocks: (content?.blocks ?? []).map((block) => ({
          ...block,
          attributes: attributesByBlock.get(String(block.id)) ?? [],
          entityMentions: mentionsByBlock.get(String(block.id)) ?? [],
        })),
        translations: content?.translations ?? [],
        audioManifest: content?.audioManifests?.[0],
        voiceClips: content?.voiceClips ?? [],
      },
      fingerprints: content?.fingerprints ?? [],
      facts: (content?.facts ?? []).map((fact) => ({
        ...fact,
        newerSupersessions: supersessionsByFact.get(String(fact.id)) ?? [],
      })),
    });
  }

  listOwnedGlossaryTerms(ownerUid: string, storyId: string): Row[] {
    const record = this.stories.get(storyId);
    if (!record || record.ownerUid !== ownerUid) return [];
    return clone(record.collections.glossaryTerms);
  }

  listOwnedStoryCoverSlots(ownerUid: string, limit: number, offset: number): Row[] {
    const slots = this.mediaSlots
      .filter((slot) => slot.ownerUid === ownerUid && slot.purpose === 'STORY_COVER')
      .map((slot) => {
        const asset = this.mediaAssets.get(slot.currentAssetId);
        return {
          ownerUid: slot.ownerUid,
          storyId: slot.storyId ?? null,
          targetKey: slot.targetKey,
          currentAssetId: slot.currentAssetId,
          version: slot.version,
          updatedAt: slot.updatedAt,
          currentAsset: {
            status: asset?.status ?? 'READY',
            mimeType: asset?.mimeType ?? 'image/png',
            checksumSha256: asset?.checksumSha256 ?? '',
            version: asset?.version ?? 1,
          },
        };
      });
    return clone(slots.slice(offset, offset + limit));
  }

  // ---------------------------------------------------------------- profiles

  upsertUserProfileGraph(variables: Row): void {
    const ownerUid = String(variables.ownerUid);
    const existing = this.profiles.get(ownerUid);
    const currentRevision = existing ? (existing.profile.syncRevision ?? null) : null;
    if ((variables.expectedSyncRevision ?? null) !== currentRevision) {
      throw staleError('The user profile');
    }
    this.profiles.set(ownerUid, {
      account: {
        role: existing?.account.role ?? 'USER',
        createdAt: existing?.account.createdAt ?? new Date().toISOString(),
        ...clone(variables.account as Row),
      },
      profile: clone(variables.profile as Row),
      preferences: rows(variables, 'preferences'),
      inventory: rows(variables, 'inventory'),
      effects: rows(variables, 'effects'),
      progressEvents: rows(variables, 'progressEvents'),
      portraits: existing?.portraits ?? [],
    });
    this.recordReceipt('UPSERT_USER_PROFILE_GRAPH', ownerUid, variables);
  }

  getUserProfileGraph(ownerUid: string): Row {
    const record = this.profiles.get(ownerUid);
    if (!record) return { inventory: [], activeEffects: [], progressEvents: [], portraits: [] };
    return clone({
      account: record.account,
      profile: record.profile,
      preferences: record.preferences[0],
      inventory: record.inventory,
      activeEffects: record.effects,
      progressEvents: record.progressEvents,
      portraits: record.portraits,
    });
  }

  grantSystemOwnerRole(ownerUid: string): void {
    const record = this.profiles.get(ownerUid);
    if (record) record.account = { ...record.account, role: 'OWNER' };
  }

  selectUserPortrait(variables: Row): void {
    const ownerUid = String(variables.ownerUid);
    const record = this.profiles.get(ownerUid);
    if (!record) throw new Error('User profile must exist before selecting a portrait.');
    this.assertReceiptAvailable('SELECT_USER_PORTRAIT', ownerUid, variables);
    if ((variables.expectedSyncRevision ?? null) !== (record.profile.syncRevision ?? null)) {
      throw staleError('The active portrait');
    }
    const assetId = canonicalAssetId(String(variables.assetId));
    const asset = this.mediaAssets.get(assetId);
    if (!asset || asset.ownerUid !== ownerUid || asset.status !== 'READY') {
      throw new Error('Ready portrait asset not found');
    }
    if (asset.assetType !== 'IMAGE') throw new Error('Portrait asset must be an image');
    if (asset.purpose !== 'CELESTIAL_PORTRAIT') {
      throw new Error('Portrait asset purpose mismatch');
    }
    if (asset.storyId != null) throw new Error('Portrait asset must be account scoped');
    const now = new Date().toISOString();
    record.portraits = record.portraits.map(portrait => ({
      ...portrait,
      active: false,
      updatedAt: now,
    }));
    record.portraits = [
      ...record.portraits.filter((portrait) => String(portrait.assetId) !== assetId),
      {
        assetId,
        prompt: variables.prompt ?? null,
        description: variables.description ?? null,
        daoRank: variables.daoRank ?? null,
        daoXp: variables.daoXp ?? null,
        powerStage: variables.powerStage ?? null,
        usedReferenceImage: variables.usedReferenceImage ?? false,
        frameId: variables.frameId ?? null,
        glowId: variables.glowId ?? null,
        bannerId: variables.bannerId ?? null,
        effectIds: variables.effectIds ?? [],
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
    record.profile = {
      ...record.profile,
      activePortraitAssetId: assetId,
      syncRevision: variables.newSyncRevision,
      revision: variables.newRevision,
    };
    this.recordReceipt('SELECT_USER_PORTRAIT', ownerUid, variables);
  }

  recoverPendingUserPortraits(variables: Row): number {
    const ownerUid = String(variables.ownerUid);
    const record = this.profiles.get(ownerUid);
    if (!record) throw new Error('User profile not found');
    this.assertReceiptAvailable('RECOVER_PENDING_USER_PORTRAITS', ownerUid, variables);

    const activeAssetId = typeof record.profile.activePortraitAssetId === 'string'
      ? canonicalAssetId(record.profile.activePortraitAssetId)
      : null;
    const activePortrait = activeAssetId
      ? record.portraits.find(portrait =>
        isSameAssetId(String(portrait.assetId), activeAssetId)
        && portrait.active === true)
      : undefined;
    const activeSelectedAt = Date.parse(String(activePortrait?.updatedAt ?? ''));
    const candidate = [...this.mediaAssets.values()]
      .filter(asset =>
        asset.ownerUid === ownerUid
        && asset.status === 'READY'
        && asset.assetType === 'IMAGE'
        && asset.purpose === 'CELESTIAL_PORTRAIT'
        && asset.storyId == null
        && !record.portraits.some(portrait => isSameAssetId(
          String(portrait.assetId),
          asset.id,
        ))
        && (
          activeAssetId === null
          || (!activePortrait && isSameAssetId(asset.id, activeAssetId))
          || (
            Boolean(activePortrait)
            && Date.parse(asset.createdAt) > activeSelectedAt
          )
        ))
      .sort((left, right) => {
        const leftIsActive = activeAssetId && isSameAssetId(left.id, activeAssetId) ? 1 : 0;
        const rightIsActive = activeAssetId && isSameAssetId(right.id, activeAssetId) ? 1 : 0;
        return rightIsActive - leftIsActive
          || Date.parse(right.createdAt) - Date.parse(left.createdAt);
      })[0];

    if (candidate) {
      const now = new Date().toISOString();
      record.portraits = [
        ...record.portraits.map(portrait => ({
          ...portrait,
          active: false,
          updatedAt: now,
        })),
        {
          assetId: candidate.id,
          userUid: ownerUid,
          usedReferenceImage: false,
          active: true,
          createdAt: now,
          updatedAt: now,
        },
      ];
      record.profile = {
        ...record.profile,
        activePortraitAssetId: candidate.id,
        syncRevision: variables.idempotencyKey,
        revision: String(Number(record.profile.revision ?? 0) + 1),
        updatedAt: now,
      };
    }
    this.recordReceipt('RECOVER_PENDING_USER_PORTRAITS', ownerUid, variables);
    return candidate ? 1 : 0;
  }

  consumeImageQuota(variables: Row): void {
    const ownerUid = String(variables.ownerUid);
    const idempotencyKey = String(variables.idempotencyKey ?? '');
    if (!idempotencyKey) {
      throw new Error('Image quota consumption requires an idempotency key.');
    }
    const key = this.receiptKey(ownerUid, idempotencyKey);
    if (this.imageQuota.has(key)) return;
    const record = this.profiles.get(ownerUid);
    const count = Number(record?.profile.imageGenerationCount ?? 0) + 1;
    if (record) {
      record.profile = {
        ...record.profile,
        imageGenerationCount: count,
        imageQuotaResetAt: variables.nextReset,
      };
    }
    this.imageQuota.set(key, {
      ownerUid,
      idempotencyKey,
      imageGenerationCount: count,
      imageQuotaResetAt: variables.nextReset,
      consumedAt: variables.now,
    });
  }

  getImageQuotaConsumption(ownerUid: string, idempotencyKey: string): Row | undefined {
    return clone(this.imageQuota.get(this.receiptKey(ownerUid, idempotencyKey)));
  }

  // -------------------------------------------------------------------- seeds

  upsertStorySeedGraph(variables: Row): void {
    const ownerUid = String(variables.ownerUid);
    const seedId = String(variables.seedId);
    const existing = this.seeds.get(seedId);
    if (existing && existing.ownerUid !== ownerUid) throw new Error('Seed owned by another account.');
    if ((variables.expectedSyncRevision ?? null) !== (existing?.seed.syncRevision ?? null)) {
      throw staleError('The story seed');
    }
    this.seeds.set(seedId, {
      ownerUid,
      seed: clone(variables.seed as Row),
      fields: rows(variables, 'fields'),
      entities: rows(variables, 'entities'),
      entityAliases: rows(variables, 'entityAliases'),
    });
    this.recordReceipt('UPSERT_STORY_SEED_GRAPH', ownerUid, variables, { seedId });
  }

  getOwnedStorySeedGraph(ownerUid: string, seedId: string): Row {
    const record = this.seeds.get(seedId);
    if (!record || record.ownerUid !== ownerUid) return { fields: [], entities: [] };
    const aliasesByEntity = groupBy(record.entityAliases, 'entityId');
    return clone({
      storySeed: {
        ...record.seed,
        fields: record.fields,
        entities: record.entities.map((entity) => ({
          ...entity,
          aliases: aliasesByEntity.get(String(entity.id)) ?? [],
        })),
      },
    });
  }

  listOwnedStorySeeds(ownerUid: string, limit: number, offset: number): Row[] {
    const all = [...this.seeds.values()]
      .filter((record) => record.ownerUid === ownerUid)
      .map((record) => clone(record.seed));
    return all.slice(offset, offset + limit);
  }

  deleteOwnedStorySeed(ownerUid: string, seedId: string, idempotencyKey: string): void {
    const record = this.seeds.get(seedId);
    if (!record || record.ownerUid !== ownerUid) {
      throw new Error(`Seed ${seedId} is owned by another account or does not exist.`);
    }
    this.assertReceiptAvailable('DELETE_STORY_SEED', ownerUid, { idempotencyKey });
    this.seeds.delete(seedId);
    this.recordReceipt('DELETE_STORY_SEED', ownerUid, { idempotencyKey }, { seedId });
  }

  // -------------------------------------------------------------------- media

  /**
   * Publish a permanent media asset into its slot exactly as a committed R2
   * upload does: a READY asset row, a current slot, and a current attachment.
   */
  attachMedia(input: {
    assetId: string;
    ownerUid: string;
    storyId?: string | null;
    chapterId?: string | null;
    entityId?: string | null;
    targetKind: string;
    targetKey: string;
    purpose: string;
    deliveryUrl: string;
    checksumSha256?: string;
    mimeType?: string;
    promptUsed?: string | null;
    clientHistoryId?: string | null;
    entityType?: string | null;
    chapterNumber?: number | null;
    arcTitle?: string | null;
    label?: string | null;
  }): MediaAssetRow {
    const now = new Date().toISOString();
    const assetId = canonicalAssetId(input.assetId);
    const storyId = input.storyId ? canonicalAssetId(input.storyId) : input.storyId ?? null;
    const chapterId = input.chapterId ? canonicalAssetId(input.chapterId) : input.chapterId ?? null;
    const entityId = input.entityId ? canonicalAssetId(input.entityId) : input.entityId ?? null;
    const targetKey = storyId || chapterId || entityId
      ? canonicalAssetId(input.targetKey)
      : input.targetKey;
    this.assertMediaAssociationOwned(input.ownerUid, {
      storyId,
      chapterId,
      entityId,
      targetKind: input.targetKind,
      targetKey,
      purpose: input.purpose,
    });
    if (input.purpose === 'CELESTIAL_PORTRAIT') {
      throw new Error('Account portraits must be committed without a story media slot.');
    }
    const previousSlot = this.mediaSlots.find(
      slot => slot.ownerUid === input.ownerUid
        && slot.targetKind === input.targetKind
        && slot.targetKey === targetKey
        && slot.purpose === input.purpose,
    );
    const previousVersion = previousSlot
      ? this.mediaAssets.get(previousSlot.currentAssetId)?.version ?? 0
      : 0;
    const asset: MediaAssetRow = {
      id: assetId,
      ownerUid: input.ownerUid,
      storyId,
      assetType: 'IMAGE',
      purpose: input.purpose,
      visibility: 'PRIVATE',
      status: 'READY',
      mimeType: input.mimeType ?? 'image/png',
      checksumSha256: input.checksumSha256 ?? 'a'.repeat(64),
      version: previousVersion + 1,
      byteSize: '2048',
      deliveryUrl: input.deliveryUrl,
      deliveryUrlExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      createdAt: now,
    };
    this.mediaAssets.set(asset.id, asset);

    const slotIndex = this.mediaSlots.findIndex(
      (slot) =>
        slot.ownerUid === input.ownerUid &&
        slot.targetKind === input.targetKind &&
        slot.targetKey === targetKey &&
        slot.purpose === input.purpose,
    );
    const slot: MediaSlotRow = {
      ownerUid: input.ownerUid,
      storyId,
      chapterId,
      entityId,
      targetKind: input.targetKind,
      targetKey,
      purpose: input.purpose,
      currentAssetId: asset.id,
      version: String(slotIndex >= 0 ? Number(this.mediaSlots[slotIndex].version) + 1 : 1),
      updatedAt: now,
    };
    if (slotIndex >= 0) this.mediaSlots[slotIndex] = slot;
    else this.mediaSlots.push(slot);

    for (const attachment of this.mediaAttachments) {
      if (
        attachment.ownerUid === input.ownerUid &&
        attachment.targetKind === input.targetKind &&
        attachment.targetKey === targetKey &&
        attachment.purpose === input.purpose
      ) {
        attachment.isCurrent = false;
        attachment.endedAt ??= now;
      }
    }
    this.mediaAttachments.push({
      id: `attachment-${this.mediaAttachments.length + 1}-${asset.id}`,
      ownerUid: input.ownerUid,
      assetId: asset.id,
      storyId,
      chapterId,
      entityId,
      targetKind: input.targetKind,
      targetKey,
      purpose: input.purpose,
      clientHistoryId: input.clientHistoryId ?? null,
      promptUsed: input.promptUsed ?? null,
      chapterNumber: input.chapterNumber ?? null,
      arcTitle: input.arcTitle ?? null,
      label: input.label ?? null,
      position: this.mediaAttachments.length,
      isCurrent: true,
      createdAt: now,
    });
    return asset;
  }

  /**
   * Publish account-scoped media exactly like AdminCommitAccountMediaAsset:
   * READY asset metadata only, with no story attachment or MediaSlot row.
   */
  attachAccountMedia(input: {
    assetId: string;
    ownerUid: string;
    targetKind: string;
    targetKey: string;
    purpose: string;
    deliveryUrl: string;
    checksumSha256?: string;
    mimeType?: string;
  }): MediaAssetRow {
    const targetKey = input.targetKey;
    this.assertMediaAssociationOwned(input.ownerUid, {
      targetKind: input.targetKind,
      targetKey,
      purpose: input.purpose,
    });
    const now = new Date().toISOString();
    const asset: MediaAssetRow = {
      id: canonicalAssetId(input.assetId),
      ownerUid: input.ownerUid,
      storyId: null,
      assetType: 'IMAGE',
      purpose: input.purpose,
      visibility: 'PRIVATE',
      status: 'READY',
      mimeType: input.mimeType ?? 'image/png',
      checksumSha256: input.checksumSha256 ?? 'a'.repeat(64),
      version: 1,
      byteSize: '2048',
      deliveryUrl: input.deliveryUrl,
      deliveryUrlExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      createdAt: now,
    };
    this.mediaAssets.set(asset.id, asset);
    return asset;
  }

  selectMedia(
    ownerUid: string,
    assetId: string,
    association: MediaAssociation,
  ): MediaAssetRow {
    const canonicalId = canonicalAssetId(assetId);
    this.assertMediaAssociationOwned(ownerUid, association);
    const asset = this.mediaAssets.get(canonicalId);
    if (!asset || asset.ownerUid !== ownerUid || asset.status !== 'READY') {
      throw new Error('The selected media asset is not owned by the authenticated owner.');
    }
    const targetKey = association.storyId || association.chapterId || association.entityId
      ? canonicalAssetId(association.targetKey)
      : association.targetKey;
    const history = this.mediaAttachments.filter(attachment =>
      attachment.ownerUid === ownerUid
      && isSameAssetId(attachment.assetId, canonicalId)
      && attachment.targetKind === association.targetKind
      && canonicalAssetId(attachment.targetKey) === targetKey
      && attachment.purpose === association.purpose
      && sameScopedId(attachment.storyId, association.storyId)
      && sameScopedId(attachment.chapterId, association.chapterId)
      && sameScopedId(attachment.entityId, association.entityId));
    if (history.length !== 1) {
      throw new Error('The selected media asset is not a member of this owned media slot history.');
    }
    const slot = this.mediaSlots.find(candidate =>
      candidate.ownerUid === ownerUid
      && candidate.targetKind === association.targetKind
      && canonicalAssetId(candidate.targetKey) === targetKey
      && candidate.purpose === association.purpose);
    if (!slot) throw new Error('The owned media slot does not exist.');
    const now = new Date().toISOString();
    for (const attachment of this.mediaAttachments) {
      if (attachment.ownerUid !== ownerUid
        || attachment.targetKind !== association.targetKind
        || canonicalAssetId(attachment.targetKey) !== targetKey
        || attachment.purpose !== association.purpose) continue;
      attachment.isCurrent = isSameAssetId(attachment.assetId, canonicalId);
      attachment.endedAt = attachment.isCurrent ? null : attachment.endedAt ?? now;
    }
    slot.currentAssetId = canonicalId;
    slot.version = String(Number(slot.version) + 1);
    slot.updatedAt = now;
    return asset;
  }

  /**
   * The journey's real MediaAssetService repository uses the same ownership
   * predicate as the relational fixture before it reserves an upload.
   */
  assertOwnedMediaAssociation(ownerUid: string, association: MediaAssociation): void {
    this.assertMediaAssociationOwned(ownerUid, association);
  }

  private assertMediaAssociationOwned(ownerUid: string, association: MediaAssociation): void {
    const storyId = association.storyId ? canonicalAssetId(association.storyId) : null;
    const chapterId = association.chapterId ? canonicalAssetId(association.chapterId) : null;
    const entityId = association.entityId ? canonicalAssetId(association.entityId) : null;
    const targetKey = storyId || chapterId || entityId
      ? canonicalAssetId(association.targetKey)
      : association.targetKey;
    if (association.purpose === 'CELESTIAL_PORTRAIT') {
      if (association.targetKind !== 'PORTRAIT'
        || targetKey !== ownerUid
        || storyId
        || chapterId
        || entityId) {
        throw new Error('Account portraits require the authenticated owner portrait scope.');
      }
      return;
    }
    if (!storyId) throw new Error('Story media requires an owned story scope.');
    const story = this.stories.get(storyId);
    if (story && story.ownerUid !== ownerUid) {
      throw new Error('The story media target is not owned by the authenticated owner.');
    }
    if (association.purpose === 'STORY_COVER') {
      if (association.targetKind !== 'STORY'
        || targetKey !== storyId
        || chapterId
        || entityId) {
        throw new Error('Story covers require the canonical story target.');
      }
      return;
    }
    if (association.purpose === 'CHAPTER_HERO') {
      if (association.targetKind !== 'CHAPTER'
        || !chapterId
        || targetKey !== chapterId
        || entityId) {
        throw new Error('Chapter heroes require the canonical chapter target.');
      }
      if (story && !story.collections.chapters.some(row => row.id === chapterId)) {
        throw new Error('The chapter media target is not owned by the story.');
      }
      return;
    }
    if (association.purpose === 'MANIFESTATION') {
      if (!entityId
        || targetKey !== entityId
        || chapterId
        || !['CHARACTER', 'BEAST', 'LOCATION', 'ARTIFACT', 'FACTION'].includes(
          association.targetKind,
        )) {
        throw new Error('Codex manifestations require the canonical entity target.');
      }
      if (story && !story.collections.codexEntities.some(row => row.id === entityId)) {
        throw new Error('The Codex media target is not owned by the story.');
      }
      return;
    }
    throw new Error(`Unsupported image purpose ${association.purpose}.`);
  }

  /** Descriptor loader with the exact contract the repository expects. */
  loadMediaDescriptor = async (ownerUid: string, assetId: string) => {
    const canonicalId = canonicalAssetId(assetId);
    const asset = this.mediaAssets.get(canonicalId);
    if (!asset || asset.ownerUid !== ownerUid) return null;
    return {
      id: asset.id,
      ownerUid: asset.ownerUid,
      storyId: asset.storyId,
      assetType: asset.assetType,
      purpose: asset.purpose,
      visibility: asset.visibility,
      status: asset.status as 'READY',
      mimeType: asset.mimeType,
      byteSize: asset.byteSize,
      checksumSha256: asset.checksumSha256,
      version: asset.version,
      deliveryUrl: asset.deliveryUrl,
      deliveryUrlExpiresAt: asset.deliveryUrlExpiresAt,
      createdAt: asset.createdAt,
      updatedAt: asset.createdAt,
    };
  };

  // ------------------------------------------------------------------ routing

  /** Apply one retired mutation by its connector operation name. */
  executeRetiredMutation = async (name: string, variables: Row): Promise<unknown> => {
    const operation = name === 'AdminUpsertStoryGraph' ? 'UPSERT_STORY_GRAPH'
      : name === 'AdminPatchStoryGraph' ? 'PATCH_STORY_GRAPH'
        : name === 'AdminUpsertChapterContentGraph' ? 'UPSERT_CHAPTER_CONTENT_GRAPH'
          : name === 'AdminUpsertUserProfileGraph' ? 'UPSERT_USER_PROFILE_GRAPH'
            : name === 'AdminUpsertOwnedGlossaryTerms' ? 'UPSERT_GLOSSARY_TERMS'
              : name === 'AdminUpsertStorySeedGraph' ? 'UPSERT_STORY_SEED_GRAPH'
                : name === 'AdminUpsertStorySeedBatch' ? 'UPSERT_STORY_SEED_BATCH'
                  : null;
    if (operation) {
      this.assertReceiptAvailable(operation, String(variables.ownerUid), variables);
    }
    this.mutationLog.push(name);
    switch (name) {
      case 'AdminUpsertStoryGraph':
        this.upsertStoryGraph(variables);
        return { data: {} };
      case 'AdminPatchStoryGraph':
        this.patchStoryGraph(variables);
        return { data: {} };
      case 'AdminUpsertChapterContentGraph':
        this.upsertChapterContentGraph(variables);
        return { data: {} };
      case 'AdminUpsertUserProfileGraph':
        this.upsertUserProfileGraph(variables);
        return { data: {} };
      case 'AdminUpsertOwnedGlossaryTerms':
        this.upsertGlossaryTerms(variables);
        return { data: {} };
      case 'AdminUpsertStorySeedGraph':
      case 'AdminUpsertStorySeedBatch':
        this.upsertStorySeedGraph(variables);
        return { data: {} };
      default:
        throw new Error(`Unsupported retired mutation ${name}.`);
    }
  };
}

function groupBy(rowsToGroup: Row[], field: string): Map<string, Row[]> {
  const grouped = new Map<string, Row[]>();
  for (const row of rowsToGroup) {
    const key = String(row[field] ?? '');
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }
  return grouped;
}
