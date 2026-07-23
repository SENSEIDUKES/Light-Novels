import { createHash } from 'node:crypto';
import type {
  AdminGetOwnedChapterContentGraphData,
  AdminGetOwnedStoryGraphData,
  AdminGetOwnedStorySeedGraphData,
  AdminGetUserProfileGraphData,
} from '../../generated/dataconnect-admin';
import type {
  Ability,
  ActiveStatusEffect,
  BaseCodexEntry,
  Chapter,
  ChapterContent,
  CosmicArtifact,
  GeneratedImage,
  LoreGlossary,
  StoryArc,
  StoryBlock,
  StoryMemory,
  StorySeed,
  StoryWorld,
  UserProfile,
} from '../../types';
import { assertPermanentMediaMetadata } from '../media/permanentMediaGuard';

type GraphRow = Record<string, unknown>;
type StoryGraph = AdminGetOwnedStoryGraphData;
type ChapterGraph = AdminGetOwnedChapterContentGraphData;
type SeedGraph = AdminGetOwnedStorySeedGraphData;
type ProfileGraph = AdminGetUserProfileGraphData;

export interface GraphMutationMetadata {
  expectedSyncRevision?: string | null;
  newSyncRevision: string;
  newRevision: string | number | bigint;
  idempotencyKey: string;
  requestHash?: string | null;
}

export interface AdminUpsertStoryGraphVariables {
  ownerUid: string;
  storyId: string;
  expectedSyncRevision: string | null;
  newSyncRevision: string;
  newRevision: string;
  idempotencyKey: string;
  requestHash?: string | null;
  story: GraphRow;
  memberUserUids: string[];
  members: GraphRow[];
  preferences: GraphRow[];
  readerPreferenceUserUids: string[];
  readerPreferences: GraphRow[];
  memoryStates: GraphRow[];
  memoryWarningIds: string[];
  memoryWarnings: GraphRow[];
  ruleIds: string[];
  rules: GraphRow[];
  revealBackdropKeys: string[];
  revealBackdrops: GraphRow[];
  arcIds: string[];
  arcs: GraphRow[];
  chapterIds: string[];
  chapters: GraphRow[];
  codexEntityIds: string[];
  codexEntities: GraphRow[];
  codexAliases: GraphRow[];
  codexAttributes: GraphRow[];
  codexRelationshipIds: string[];
  codexRelationships: GraphRow[];
  plotThreadIds: string[];
  plotThreads: GraphRow[];
  codexThreadLinks: GraphRow[];
  abilityProgressionIds: string[];
  abilityProgression: GraphRow[];
  karmaNodeIds: string[];
  karmaNodes: GraphRow[];
  timelineEventIds: string[];
  timelineEvents: GraphRow[];
  bookmarkIds: string[];
  bookmarks: GraphRow[];
  readingProgressUserUids: string[];
  readingProgresses: GraphRow[];
  arcReadingProgresses: GraphRow[];
  glossaryTermIds: string[];
  glossaryTerms: GraphRow[];
  generationJobIds: string[];
  generationJobs: GraphRow[];
  generationEventIds: string[];
  generationEvents: GraphRow[];
  generationBatchIds: string[];
  generationBatches: GraphRow[];
  generationBatchItems: GraphRow[];
}

export interface AdminUpsertChapterContentGraphVariables {
  ownerUid: string;
  storyId: string;
  chapterId: string;
  expectedSyncRevision: string | null;
  newSyncRevision: string;
  newRevision: string;
  idempotencyKey: string;
  requestHash?: string | null;
  chapter: GraphRow;
  content: GraphRow;
  blockIds: string[];
  blocks: GraphRow[];
  blockAttributes: GraphRow[];
  blockEntityMentions: GraphRow[];
  translationLanguages: string[];
  translations: GraphRow[];
  fingerprintIds: string[];
  fingerprints: GraphRow[];
  factIds: string[];
  facts: GraphRow[];
  factSupersessions: GraphRow[];
  audioManifests: GraphRow[];
  voiceClipIds: string[];
  voiceClips: GraphRow[];
}

export interface AdminUpsertStorySeedGraphVariables {
  ownerUid: string;
  seedId: string;
  expectedSyncRevision: string | null;
  newSyncRevision: string;
  newRevision: string;
  idempotencyKey: string;
  requestHash?: string | null;
  seed: GraphRow;
  fields: GraphRow[];
  entityIds: string[];
  entities: GraphRow[];
  entityAliases: GraphRow[];
}

export interface AdminUpsertUserProfileGraphVariables {
  ownerUid: string;
  expectedSyncRevision: string | null;
  newSyncRevision: string;
  newRevision: string;
  idempotencyKey: string;
  requestHash?: string | null;
  account: GraphRow;
  profile: GraphRow;
  preferences: GraphRow[];
  inventoryIds: string[];
  inventory: GraphRow[];
  effectIds: string[];
  effects: GraphRow[];
  progressEventIds: string[];
  progressEvents: GraphRow[];
}

export interface StoryGraphWriteInput extends GraphMutationMetadata {
  ownerUid: string;
  story: StoryWorld;
  /** Required merge source for existing stories; null explicitly creates a graph. */
  currentGraph: StoryGraph | null;
}

export interface ChapterGraphWriteInput extends GraphMutationMetadata {
  ownerUid: string;
  storyId: string;
  content: ChapterContent;
  /** Chapter writes replace child collections and therefore require their current graph. */
  currentGraph: ChapterGraph;
}

export interface SeedGraphWriteInput extends GraphMutationMetadata {
  ownerUid: string;
  seed: StorySeed;
  currentGraph?: SeedGraph | null;
}

export interface ProfileGraphWriteInput extends GraphMutationMetadata {
  ownerUid: string;
  patch: Partial<UserProfile>;
  /** Profile PATCH semantics depend on preserving rows omitted by the client. */
  currentGraph: ProfileGraph | null;
}

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
const TRANSIENT_ANY_KEYS = new Set([
  'imageUrl',
  'customUrl',
  'audioUrl',
  'voiceClipUrl',
  'deliveryUrl',
  'providerUrl',
]);

function row(value: GraphRow): GraphRow {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

function nullable<T>(value: T | null | undefined): T | null {
  return value ?? null;
}

function int64(value: string | number | bigint): string {
  return String(value);
}

function numberFromInt64(value: string | null | undefined): number | undefined {
  if (value == null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function stableUuid(scope: string, ...parts: unknown[]): string {
  const bytes = createHash('sha256')
    .update(JSON.stringify([scope, ...parts]))
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Reuse embedded phase-one UUIDs; otherwise derive a deterministic relational ID. */
export function persistenceUuid(value: string | null | undefined, scope: string, ...parts: unknown[]): string {
  const existing = value?.match(UUID_PATTERN)?.[0];
  return existing ?? stableUuid(scope, value ?? '', ...parts);
}

function normalizeAlias(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

function enumValue(value: string | null | undefined, fallback: string): string {
  return value?.trim() ? value.trim().toUpperCase().replace(/[ -]+/g, '_') : fallback;
}

function lowerEnum(value: string | null | undefined, fallback: string): string {
  return value?.trim() ? value.trim().toLowerCase().replace(/_/g, '-') : fallback;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stripTransientAny(value: unknown, seen = new WeakMap<object, unknown>()): unknown {
  if (value === null || typeof value !== 'object') return value;
  const cached = seen.get(value);
  if (cached !== undefined) return cached;
  if (Array.isArray(value)) {
    const result: unknown[] = [];
    seen.set(value, result);
    value.forEach(entry => result.push(stripTransientAny(entry, seen)));
    return result;
  }
  const result: Record<string, unknown> = {};
  seen.set(value, result);
  for (const [key, entry] of Object.entries(value)) {
    if (!TRANSIENT_ANY_KEYS.has(key)) result[key] = stripTransientAny(entry, seen);
  }
  return result;
}

function boundedAny(value: unknown): unknown {
  const sanitized = stripTransientAny(value);
  assertPermanentMediaMetadata(sanitized);
  return sanitized;
}

function mutationBase(ownerUid: string, metadata: GraphMutationMetadata) {
  return {
    ownerUid,
    expectedSyncRevision: metadata.expectedSyncRevision ?? null,
    newSyncRevision: metadata.newSyncRevision,
    newRevision: int64(metadata.newRevision),
    idempotencyKey: metadata.idempotencyKey,
    ...(metadata.requestHash === undefined ? {} : { requestHash: metadata.requestHash }),
  };
}

function currentStoryId(story: StoryWorld): string {
  return persistenceUuid(story.persistenceId ?? story.id, 'story', story.id);
}

function currentSeedId(seed: StorySeed): string {
  return persistenceUuid(seed.id, 'seed', seed.userId);
}

function currentEntityId(
  storyId: string,
  value: { id: string; persistenceId?: string },
  kind: string,
): string {
  return persistenceUuid(value.persistenceId ?? value.id, 'codex-entity', storyId, kind, value.id);
}

function graphMediaHistory(
  graph: StoryGraph,
  target: { targetKind?: string; entityId?: string; chapterId?: string },
  entityType: GeneratedImage['entityType'],
  entityId: string,
): GeneratedImage[] {
  return graph.mediaAttachments
    .filter(attachment =>
      (target.entityId ? attachment.entityId === target.entityId : true)
      && (target.chapterId ? attachment.chapterId === target.chapterId : true)
      && (target.targetKind ? attachment.targetKind === target.targetKind : true)
      && attachment.purpose !== 'VOICE_CARD')
    .map(attachment => ({
      id: attachment.clientHistoryId ?? attachment.id,
      assetId: attachment.assetId,
      entityId,
      entityType,
      imageUrl: '',
      chapterNumber: attachment.chapterNumber ?? undefined,
      arcTitle: attachment.arcTitle ?? undefined,
      label: attachment.label ?? undefined,
      promptUsed: attachment.promptUsed ?? '',
      createdAt: attachment.createdAt,
      isCurrent: attachment.isCurrent,
    }));
}

function currentSlotAsset(
  graph: StoryGraph,
  purpose: string,
  target: { targetKind?: string; entityId?: string; chapterId?: string },
): string | undefined {
  const slot = graph.mediaSlots.find(candidate =>
    candidate.purpose === purpose
    && (target.targetKind ? candidate.targetKind === target.targetKind : true)
    && (target.entityId ? candidate.entityId === target.entityId : true)
    && (target.chapterId ? candidate.chapterId === target.chapterId : true));
  if (slot) return slot.currentAssetId;
  return graph.mediaAttachments.find(attachment =>
    attachment.isCurrent
    && attachment.purpose === purpose
    && (target.entityId ? attachment.entityId === target.entityId : true)
    && (target.chapterId ? attachment.chapterId === target.chapterId : true)
    && (target.targetKind ? attachment.targetKind === target.targetKind : true))?.assetId;
}

function attributeMap(
  attributes: StoryGraph['codexEntities'][number]['attributes'],
): Map<string, unknown> {
  return new Map(attributes.map(attribute => {
    const value = attribute.stringValue
      ?? attribute.numberValue
      ?? attribute.booleanValue
      ?? attribute.stringListValue
      ?? attribute.jsonValue;
    return [attribute.attributeKey, value];
  }));
}

function codexBase(entity: StoryGraph['codexEntities'][number]): BaseCodexEntry {
  return {
    persistenceId: entity.id,
    aliases: entity.aliases.filter(alias => !alias.isCanonical).map(alias => alias.alias),
    contextPriority: entity.contextPriority ?? undefined,
    authorContextNote: entity.authorContextNote ?? undefined,
    relevanceState: lowerEnum(entity.relevanceState, 'active') as BaseCodexEntry['relevanceState'],
    firstAppeared: entity.firstAppearedChapter ?? undefined,
    lastMajorInvolvement: entity.lastMajorInvolvementChapter ?? undefined,
    currentRelevance: entity.currentRelevance ?? undefined,
    toneMemory: entity.toneMemory ?? undefined,
    manifestationImportance: entity.manifestationImportance as unknown as BaseCodexEntry['manifestationImportance'],
    pendingEvolution: entity.pendingEvolution,
    arcAccumulation: entity.arcAccumulation ?? undefined,
    provenance: {
      sourceChapterNumber: entity.sourceChapterNumber ?? undefined,
      sourceBlockId: entity.sourceBlockId ?? undefined,
      createdBy: entity.provenanceCreatedBy ?? undefined,
      confidence: entity.provenanceConfidence ?? undefined,
      lastMentionedChapter: entity.lastMentionedChapter ?? undefined,
      supersedesMemoryId: entity.supersedesStableKey ?? undefined,
      isUserPinned: entity.isUserPinned,
    },
  };
}

function hydrateCodexEntity(
  graph: StoryGraph,
  entity: StoryGraph['codexEntities'][number],
): { collection: keyof Pick<StoryMemory, 'characters' | 'factions' | 'locations' | 'artifacts' | 'abilities'>; value: unknown } | null {
  const attributes = attributeMap(entity.attributes);
  const base = codexBase(entity);
  const imageAssetId = currentSlotAsset(graph, 'MANIFESTATION', { entityId: entity.id });
  const voiceAssetId = currentSlotAsset(graph, 'VOICE_CARD', { entityId: entity.id });
  const common = {
    ...base,
    id: entity.stableKey,
    name: entity.name,
    description: entity.description ?? '',
    imageAssetId,
    imageHistory: graphMediaHistory(
      graph,
      { entityId: entity.id },
      entity.kind === 'BEAST' ? 'beast' : lowerEnum(entity.kind, 'character') as GeneratedImage['entityType'],
      entity.stableKey,
    ),
  };

  switch (entity.kind) {
    case 'CHARACTER':
    case 'BEAST':
      return {
        collection: 'characters',
        value: {
          ...common,
          role: entity.role ?? '',
          relationshipToMC: entity.relationshipToMainCharacter ?? '',
          status: lowerEnum(entity.status, 'unknown'),
          powerLevel: attributes.get('powerLevel'),
          abilities: attributes.get('abilities'),
          faction: attributes.get('faction'),
          isBeast: entity.kind === 'BEAST' || attributes.get('isBeast') === true,
          beastProfile: attributes.get('beastProfile'),
          lastImageChapter: entity.lastImageChapter ?? undefined,
          evolutionReady: entity.evolutionReady,
          evolutionReason: entity.evolutionReason ?? undefined,
          availableVisualUpdate: entity.availableVisualUpdate,
          voicePresetId: attributes.get('voicePresetId'),
          signatureQuote: attributes.get('signatureQuote'),
          voiceAssetId,
        },
      };
    case 'FACTION':
      return {
        collection: 'factions',
        value: {
          ...common,
          alignment: attributes.get('alignment') ?? 'Neutral',
          headquarters: attributes.get('headquarters'),
          status: entity.status ?? undefined,
        },
      };
    case 'LOCATION':
      return {
        collection: 'locations',
        value: {
          ...common,
          realm: attributes.get('realm'),
          safetyLevel: attributes.get('safetyLevel'),
          lastImageChapter: entity.lastImageChapter ?? undefined,
          evolutionReady: entity.evolutionReady,
          evolutionReason: entity.evolutionReason ?? undefined,
          availableVisualUpdate: entity.availableVisualUpdate,
        },
      };
    case 'ARTIFACT':
      return {
        collection: 'artifacts',
        value: {
          ...common,
          tier: attributes.get('tier'),
          currentOwner: attributes.get('currentOwner'),
          condition: attributes.get('condition'),
          holderLocation: attributes.get('holderLocation'),
          lastStateChapter: attributes.get('lastStateChapter'),
          lastImageChapter: entity.lastImageChapter ?? undefined,
          evolutionReady: entity.evolutionReady,
          evolutionReason: entity.evolutionReason ?? undefined,
          availableVisualUpdate: entity.availableVisualUpdate,
        },
      };
    case 'ABILITY': {
      if (attributes.get('legacyString') === true) {
        return { collection: 'abilities', value: entity.name };
      }
      return {
        collection: 'abilities',
        value: {
          ...common,
          source: attributes.get('source'),
          acquiredChapter: attributes.get('acquiredChapter'),
          acquisitionMethod: attributes.get('acquisitionMethod'),
          cost: attributes.get('cost'),
          limits: attributes.get('limits'),
          masteryLevel: attributes.get('masteryLevel'),
          lastUsedChapter: attributes.get('lastUsedChapter'),
          canonStatus: attributes.get('canonStatus'),
          progression: entity.progression.map(event => ({
            chapter: event.chapterNumber,
            fromMastery: event.fromMastery ?? undefined,
            toMastery: event.toMastery ?? undefined,
            note: event.note ?? undefined,
          })),
        },
      };
    }
    default:
      return null;
  }
}

function hydrateChapterScaffold(
  chapter: StoryGraph['chapters'][number],
  graph: StoryGraph,
): Chapter {
  const heroImageAssetId = currentSlotAsset(graph, 'CHAPTER_HERO', { chapterId: chapter.id });
  return {
    persistenceId: chapter.id,
    number: chapter.chapterNumber,
    title: chapter.title,
    premise: chapter.premise ?? '',
    status: lowerEnum(chapter.status, 'unlocked') as Chapter['status'],
    hasContent: Boolean(chapter.contentHash || chapter.versionId || chapter.summary),
    isSealed: chapter.isSealed,
    contentHash: chapter.contentHash ?? undefined,
    sealedAt: chapter.sealedAt ? Date.parse(chapter.sealedAt) : undefined,
    versionId: chapter.versionId ?? undefined,
    heroImageAssetId,
    branchAnchor: chapter.branchAnchor ?? undefined,
    summary: chapter.summary ?? undefined,
    embedding: chapter.embedding ?? undefined,
    hasContinuityFaults: chapter.hasContinuityFaults,
    continuityWarnings: chapter.continuityWarnings ?? undefined,
    continuitySoftNotes: chapter.continuitySoftNotes ?? undefined,
    contractReport: chapter.contractObjectiveFulfilled == null
      ? undefined
      : {
          objectiveFulfilled: chapter.contractObjectiveFulfilled,
          evidence: chapter.contractEvidence ?? '',
          openingMatched: chapter.contractOpeningMatched ?? false,
        },
  };
}

/** Hydrate the browser StoryWorld aggregate from normalized relational rows. */
export function hydrateStoryWorld(graph: StoryGraph): StoryWorld | null {
  const source = graph.story;
  if (!source) return null;
  const memoryState = graph.memoryStates[0];
  const memory: StoryMemory = {
    powerSystem: memoryState?.powerSystem ?? '',
    currentPowerStage: memoryState?.currentPowerStage ?? '',
    worldRules: [...graph.rules].sort((a, b) => a.position - b.position).map(rule => rule.ruleValue),
    characters: [],
    unresolvedPlotThreads: graph.plotThreads
      .filter(thread => thread.status === 'ACTIVE')
      .map(thread => thread.stableKey?.startsWith('legacy-string:')
        ? thread.description
        : {
            id: thread.stableKey ?? thread.id,
            description: thread.description,
            status: 'active' as const,
            originChapter: thread.originChapterNumber ?? undefined,
            provenance: {
              sourceChapterNumber: thread.sourceChapterNumber ?? undefined,
              sourceBlockId: thread.sourceBlockId ?? undefined,
              createdBy: thread.provenanceCreatedBy ?? undefined,
              confidence: thread.provenanceConfidence ?? undefined,
              lastMentionedChapter: thread.lastMentionedChapter ?? undefined,
              supersedesMemoryId: thread.supersedesStableKey ?? undefined,
              isUserPinned: thread.isUserPinned,
            },
          }),
    resolvedPlotThreads: graph.plotThreads
      .filter(thread => thread.status === 'RESOLVED')
      .map(thread => thread.stableKey?.startsWith('legacy-string:')
        ? thread.description
        : {
            id: thread.stableKey ?? thread.id,
            description: thread.description,
            status: 'resolved' as const,
            originChapter: thread.originChapterNumber ?? undefined,
          }),
    memoryWarnings: graph.memoryWarnings
      .filter(warning => warning.resolvedAt == null)
      .map(warning => warning.warning),
    factions: [],
    locations: [],
    artifacts: [],
    abilities: [],
  };
  for (const entity of graph.codexEntities) {
    const hydrated = hydrateCodexEntity(graph, entity);
    if (!hydrated) continue;
    (memory[hydrated.collection] as unknown[] | undefined)?.push(hydrated.value);
  }

  const chaptersByArc = new Map<string, Chapter[]>();
  graph.arcs.forEach(arc => chaptersByArc.set(arc.id, []));
  for (const chapter of graph.chapters) {
    if (chapter.arcId) chaptersByArc.get(chapter.arcId)?.push(hydrateChapterScaffold(chapter, graph));
  }
  const arcs: StoryArc[] = graph.arcs.map(arc => ({
    persistenceId: arc.id,
    title: arc.title,
    chapters: chaptersByArc.get(arc.id) ?? [],
    isCompleted: arc.status === 'COMPLETED',
    summary: arc.summary ?? undefined,
    episodicSummaries: arc.episodicSummaries ?? undefined,
  }));

  const ownerReaderPreference = graph.readerPreferences.find(pref => pref.userUid === source.ownerUid);
  const reading = graph.readingProgresses.find(progress => progress.userUid === source.ownerUid);
  const ownerBookmarks = graph.bookmarks.filter(bookmark => bookmark.userUid === source.ownerUid);
  const chapterNumberById = new Map(graph.chapters.map(chapter => [chapter.id, chapter.chapterNumber]));
  const generationBatch = graph.generationBatches.at(-1);
  const coverAssetId = currentSlotAsset(graph, 'STORY_COVER', { targetKind: 'STORY' });

  return {
    persistenceId: source.id,
    userId: source.ownerUid,
    id: source.clientStoryId ?? source.legacyStoryId ?? source.id,
    sourceSeedId: source.sourceSeedId ?? undefined,
    parentStoryId: source.parentStoryId ?? undefined,
    forkChapterNumber: source.forkChapterNumber ?? undefined,
    title: source.title,
    genre: source.genre,
    mcName: source.mainCharacterName ?? '',
    customPremise: source.premise ?? '',
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    syncRevision: source.syncRevision ?? undefined,
    memory,
    arcs,
    currentChapterNumber: source.currentChapterNumber,
    coverAssetId,
    imageHistory: graphMediaHistory(graph, { targetKind: 'STORY' }, 'cover', source.id),
    lastImageChapter: source.lastImageChapter ?? undefined,
    evolutionReady: source.evolutionReady,
    evolutionReason: source.evolutionReason ?? undefined,
    availableVisualUpdate: source.availableVisualUpdate,
    isEdited: source.isEdited,
    motionCoverActive: graph.preferences[0]?.motionCoverActive ?? false,
    hardcoreFateMode: graph.preferences[0]?.hardcoreFateMode ?? false,
    fatePressure: graph.preferences[0]?.fatePressure as StoryWorld['fatePressure'],
    deleted: source.status === 'DELETED' || source.deletedAt != null,
    relationships: graph.codexRelationships.map(relationship => ({
      id: relationship.id,
      sourceCharId: relationship.sourceStableKey,
      sourceCharName: relationship.sourceName,
      targetCharId: relationship.targetStableKey,
      targetCharName: relationship.targetName,
      affinity: relationship.affinity ?? 0,
      threat: relationship.threat ?? undefined,
      description: relationship.description ?? '',
      updatedAt: relationship.updatedAt,
    })),
    karmaNodes: graph.karmaNodes.map(node => ({
      id: node.id,
      sourceId: node.sourceStableKey ?? node.sourceEntityId ?? node.sourceName,
      sourceName: node.sourceName,
      targetId: node.targetStableKey ?? node.targetEntityId ?? node.targetName,
      targetName: node.targetName,
      description: node.description,
      severity: node.severity as NonNullable<StoryWorld['karmaNodes']>[number]['severity'],
      type: node.nodeType as NonNullable<StoryWorld['karmaNodes']>[number]['type'],
      status: lowerEnum(node.status, 'active') as 'active' | 'resolved',
      createdAt: node.createdAt,
    })),
    readerPreferences: ownerReaderPreference ? row({
      fontSize: ownerReaderPreference.fontSize,
      fontFamily: ownerReaderPreference.fontFamily,
      lineHeight: ownerReaderPreference.lineHeight,
      paragraphSpacing: ownerReaderPreference.paragraphSpacing,
      lineHeightScale: ownerReaderPreference.lineHeightScale,
      paragraphSpacingScale: ownerReaderPreference.paragraphSpacingScale,
      letterSpacing: ownerReaderPreference.letterSpacing,
      wordSpacing: ownerReaderPreference.wordSpacing,
      readingWidth: ownerReaderPreference.readingWidth,
      textAlignment: ownerReaderPreference.textAlignment,
      contextEngine: ownerReaderPreference.contextEngine,
      themeOverride: ownerReaderPreference.themeOverride,
      colorPaletteId: ownerReaderPreference.colorPaletteId,
      highlightStyle: ownerReaderPreference.highlightStyle,
    }) as unknown as StoryWorld['readerPreferences'] : undefined,
    bookmarks: ownerBookmarks.map(bookmark => ({
      id: bookmark.id,
      chapterNumber: bookmark.chapterId ? chapterNumberById.get(bookmark.chapterId) ?? 0 : 0,
      paragraphIndex: bookmark.paragraphIndex,
      paragraphExcerpt: bookmark.paragraphExcerpt,
      note: bookmark.note ?? undefined,
      createdAt: bookmark.createdAt,
    })),
    assignedRevealBackdrops: Object.fromEntries(
      graph.revealBackdrops.map(backdrop => [backdrop.entityStableKey, backdrop.backdropAssetId]),
    ),
    lastReadChapter: reading?.chapterNumber,
    lastReadScrollPosition: reading?.legacyScrollPosition ?? undefined,
    readingAnchor: reading?.anchor as StoryWorld['readingAnchor'],
    readingStats: reading ? {
      totalReadingTimeMs: numberFromInt64(reading.totalReadingTimeMs),
      arcReadingTimeMs: Object.fromEntries(
        graph.arcReadingProgresses
          .filter(progress => progress.userUid === source.ownerUid)
          .map(progress => [progress.arcNumber, numberFromInt64(progress.readingTimeMs) ?? 0]),
      ),
    } : undefined,
    lastReadAt: reading?.lastReadAt,
    conflictResolvedAt: source.conflictResolvedAt ?? undefined,
    chapterGenerationBatch: generationBatch ? {
      id: generationBatch.clientBatchId,
      chapterNumbers: generationBatch.items.map(item => item.chapterNumber),
      status: lowerEnum(generationBatch.status, 'queued') as NonNullable<StoryWorld['chapterGenerationBatch']>['status'],
      currentChapterNumber: generationBatch.currentChapterNumber ?? null,
      completedChapterNumbers: generationBatch.items
        .filter(item => item.status === 'COMPLETED')
        .map(item => item.chapterNumber),
      failedChapterNumber: generationBatch.failedChapterNumber ?? undefined,
      error: generationBatch.errorMessage ?? undefined,
      createdAt: generationBatch.createdAt,
      completedAt: generationBatch.completedAt ?? undefined,
    } : undefined,
  };
}

const MANAGED_CODEX_ATTRIBUTE_KEYS = new Set([
  'powerLevel', 'abilities', 'faction', 'isBeast', 'beastProfile', 'voicePresetId',
  'signatureQuote', 'alignment', 'headquarters', 'realm', 'safetyLevel', 'tier',
  'currentOwner', 'condition', 'holderLocation', 'lastStateChapter', 'source',
  'acquiredChapter', 'acquisitionMethod', 'cost', 'limits', 'masteryLevel',
  'lastUsedChapter', 'canonStatus', 'legacyString',
]);

function attributeRow(entityId: string, key: string, value: unknown, updatedAt: string): GraphRow | null {
  if (value === undefined || value === null) return null;
  const base = { entityId, attributeKey: key, updatedAt };
  if (typeof value === 'string') return row({ ...base, stringValue: value });
  if (typeof value === 'number') return row({ ...base, numberValue: value });
  if (typeof value === 'boolean') return row({ ...base, booleanValue: value });
  if (Array.isArray(value) && value.every(entry => typeof entry === 'string')) {
    return row({ ...base, stringListValue: value });
  }
  if (key === 'beastProfile') return row({ ...base, jsonValue: boundedAny(value) });
  return null;
}

function codexWriteRows(
  story: StoryWorld,
  storyId: string,
  currentGraph: StoryGraph | null,
): {
  entities: GraphRow[];
  aliases: GraphRow[];
  attributes: GraphRow[];
  progression: GraphRow[];
  threadLinks: GraphRow[];
  entityIdsByStableKey: Map<string, string>;
} {
  const currentEntities = currentGraph?.codexEntities ?? [];
  const currentByStableKey = new Map(currentEntities.map(entity => [entity.stableKey, entity]));
  const entries: Array<{
    kind: string;
    value: BaseCodexEntry & { id: string; name: string; description?: string };
    legacyString?: boolean;
  }> = [
    ...story.memory.characters.map(value => ({ kind: value.isBeast ? 'BEAST' : 'CHARACTER', value })),
    ...(story.memory.factions ?? []).map(value => ({ kind: 'FACTION', value })),
    ...(story.memory.locations ?? []).map(value => ({ kind: 'LOCATION', value })),
    ...(story.memory.artifacts ?? []).map(value => ({ kind: 'ARTIFACT', value })),
    ...(story.memory.abilities ?? []).map((ability, index) => {
      if (typeof ability !== 'string') return { kind: 'ABILITY', value: ability };
      return {
        kind: 'ABILITY',
        legacyString: true,
        value: {
          id: `ability:${normalizeAlias(ability)}:${index}`,
          name: ability,
          description: '',
        },
      };
    }),
  ];
  const entities: GraphRow[] = [];
  const aliases: GraphRow[] = [];
  const attributes: GraphRow[] = [];
  const progression: GraphRow[] = [];
  const threadLinks: GraphRow[] = [];
  const entityIdsByStableKey = new Map<string, string>();

  for (const entry of entries) {
    const value = entry.value;
    const current = currentByStableKey.get(value.id);
    const entityId = current?.id ?? currentEntityId(storyId, value, entry.kind);
    const data = value as unknown as Record<string, unknown>;
    const provenance = value.provenance;
    const updatedAt = story.updatedAt;
    entityIdsByStableKey.set(value.id, entityId);
    entities.push(row({
      id: entityId,
      storyId,
      stableKey: value.id,
      kind: entry.kind,
      name: value.name,
      role: data.role,
      description: value.description,
      status: data.status,
      relationshipToMainCharacter: data.relationshipToMC,
      relevanceState: enumValue(value.relevanceState, 'ACTIVE'),
      contextPriority: value.contextPriority,
      authorContextNote: value.authorContextNote,
      firstAppearedChapter: value.firstAppeared,
      lastMajorInvolvementChapter: value.lastMajorInvolvement,
      currentRelevance: value.currentRelevance,
      toneMemory: value.toneMemory,
      manifestationImportance: value.manifestationImportance,
      isUserPinned: provenance?.isUserPinned ?? false,
      pendingEvolution: value.pendingEvolution ?? false,
      evolutionReady: data.evolutionReady ?? false,
      evolutionReason: data.evolutionReason,
      availableVisualUpdate: data.availableVisualUpdate ?? false,
      lastImageChapter: data.lastImageChapter,
      arcAccumulation: value.arcAccumulation,
      sourceChapterNumber: provenance?.sourceChapterNumber,
      sourceBlockId: provenance?.sourceBlockId,
      provenanceCreatedBy: provenance?.createdBy,
      provenanceConfidence: provenance?.confidence,
      lastMentionedChapter: provenance?.lastMentionedChapter,
      supersedesStableKey: provenance?.supersedesMemoryId,
      createdAt: current?.createdAt ?? story.createdAt,
      updatedAt,
    }));

    const aliasValues = value.aliases === undefined
      ? current?.aliases.map(alias => alias.alias) ?? []
      : value.aliases;
    aliasValues.forEach(alias => aliases.push(row({
      entityId,
      alias,
      normalizedAlias: normalizeAlias(alias),
      isCanonical: false,
    })));

    for (const currentAttribute of current?.attributes ?? []) {
      if (MANAGED_CODEX_ATTRIBUTE_KEYS.has(currentAttribute.attributeKey)) continue;
      attributes.push(row({ entityId, ...currentAttribute }));
    }
    const knownValues: Record<string, unknown> = entry.kind === 'CHARACTER' || entry.kind === 'BEAST'
      ? {
          powerLevel: data.powerLevel,
          abilities: Array.isArray(data.abilities)
            ? data.abilities.map(ability => typeof ability === 'string'
              ? ability
              : isObject(ability) && typeof ability.name === 'string' ? ability.name : '').filter(Boolean)
            : undefined,
          faction: data.faction,
          isBeast: entry.kind === 'BEAST',
          beastProfile: data.beastProfile,
          voicePresetId: data.voicePresetId,
          signatureQuote: data.signatureQuote,
        }
      : entry.kind === 'FACTION'
        ? { alignment: data.alignment, headquarters: data.headquarters }
        : entry.kind === 'LOCATION'
          ? { realm: data.realm, safetyLevel: data.safetyLevel }
          : entry.kind === 'ARTIFACT'
            ? {
                tier: data.tier,
                currentOwner: data.currentOwner,
                condition: data.condition,
                holderLocation: data.holderLocation,
                lastStateChapter: data.lastStateChapter,
              }
            : {
                source: data.source,
                acquiredChapter: data.acquiredChapter,
                acquisitionMethod: data.acquisitionMethod,
                cost: data.cost,
                limits: data.limits,
                masteryLevel: data.masteryLevel,
                lastUsedChapter: data.lastUsedChapter,
                canonStatus: data.canonStatus,
                legacyString: entry.legacyString,
              };
    for (const [key, attrValue] of Object.entries(knownValues)) {
      const mapped = attributeRow(entityId, key, attrValue, updatedAt);
      if (mapped) attributes.push(mapped);
    }

    if (entry.kind === 'ABILITY' && !entry.legacyString) {
      ((value as Ability).progression ?? []).forEach((event, index) => {
        progression.push(row({
          id: current?.progression[index]?.id
            ?? stableUuid('ability-progression', entityId, event.chapter, index),
          abilityEntityId: entityId,
          chapterNumber: event.chapter,
          fromMastery: event.fromMastery,
          toMastery: event.toMastery,
          note: event.note,
          createdAt: current?.progression[index]?.createdAt ?? story.updatedAt,
        }));
      });
    }
    for (const link of current?.threadLinks ?? []) {
      threadLinks.push(row({ entityId, threadId: link.threadId, createdAt: link.createdAt }));
    }
  }

  const supportedKinds = new Set(['CHARACTER', 'BEAST', 'FACTION', 'LOCATION', 'ARTIFACT', 'ABILITY']);
  for (const preserved of currentEntities.filter(entity => !supportedKinds.has(entity.kind))) {
    entities.push(row({ storyId, ...preserved, aliases: undefined, attributes: undefined, progression: undefined, threadLinks: undefined }));
    preserved.aliases.forEach(alias => aliases.push(row({ entityId: preserved.id, ...alias })));
    preserved.attributes.forEach(attribute => attributes.push(row({ entityId: preserved.id, ...attribute })));
    preserved.progression.forEach(event => progression.push(row({ abilityEntityId: preserved.id, ...event })));
    preserved.threadLinks.forEach(link => threadLinks.push(row({ entityId: preserved.id, ...link })));
    entityIdsByStableKey.set(preserved.stableKey, preserved.id);
  }

  return { entities, aliases, attributes, progression, threadLinks, entityIdsByStableKey };
}

function plotThreadRows(story: StoryWorld, storyId: string, currentGraph: StoryGraph | null): GraphRow[] {
  const currentByStable = new Map(
    (currentGraph?.plotThreads ?? []).filter(thread => thread.stableKey).map(thread => [thread.stableKey as string, thread]),
  );
  const rows: GraphRow[] = [];
  const append = (value: StoryMemory['unresolvedPlotThreads'][number], status: 'ACTIVE' | 'RESOLVED', index: number) => {
    const isLegacyString = typeof value === 'string';
    const description = isLegacyString ? value : value.description;
    const stableKey = isLegacyString
      ? `legacy-string:${stableUuid('plot-thread-text', storyId, status, description)}`
      : value.id ?? `thread:${stableUuid('plot-thread', storyId, status, description)}`;
    const current = currentByStable.get(stableKey);
    const provenance = isLegacyString ? undefined : value.provenance;
    rows.push(row({
      id: current?.id ?? persistenceUuid(isLegacyString ? undefined : value.id, 'plot-thread', storyId, status, description, index),
      storyId,
      description,
      status,
      originChapterNumber: isLegacyString ? undefined : value.originChapter,
      resolvedChapterNumber: status === 'RESOLVED' ? provenance?.lastMentionedChapter : undefined,
      confidence: provenance?.confidence,
      isUserPinned: provenance?.isUserPinned ?? false,
      stableKey,
      sourceChapterNumber: provenance?.sourceChapterNumber,
      sourceBlockId: provenance?.sourceBlockId,
      provenanceCreatedBy: provenance?.createdBy,
      provenanceConfidence: provenance?.confidence,
      lastMentionedChapter: provenance?.lastMentionedChapter,
      supersedesStableKey: provenance?.supersedesMemoryId,
      createdAt: current?.createdAt ?? story.createdAt,
      updatedAt: story.updatedAt,
    }));
  };
  story.memory.unresolvedPlotThreads.forEach((value, index) => append(value, 'ACTIVE', index));
  story.memory.resolvedPlotThreads.forEach((value, index) => append(value, 'RESOLVED', index));
  return rows;
}

/** Build the exact retired AdminUpsertStoryGraph variable manifest. */
export function mapStoryWorldToGraphVariables(input: StoryGraphWriteInput): AdminUpsertStoryGraphVariables {
  const { ownerUid, story, currentGraph } = input;
  const storyId = currentStoryId(story);
  const currentStory = currentGraph?.story;
  if (currentStory && currentStory.ownerUid !== ownerUid) {
    throw new Error('Cannot merge a story graph owned by another account.');
  }
  const codex = codexWriteRows(story, storyId, currentGraph);
  const plotThreads = plotThreadRows(story, storyId, currentGraph);
  const currentArcsById = new Map((currentGraph?.arcs ?? []).map(arc => [arc.id, arc]));
  const currentChaptersById = new Map((currentGraph?.chapters ?? []).map(chapter => [chapter.id, chapter]));
  const arcs: GraphRow[] = [];
  const chapters: GraphRow[] = [];
  const chapterIdByNumber = new Map<number, string>();
  story.arcs.forEach((arc, arcIndex) => {
    const arcId = persistenceUuid(arc.persistenceId, 'story-arc', storyId, arcIndex + 1, arc.title);
    const currentArc = currentArcsById.get(arcId);
    arcs.push(row({
      id: arcId,
      storyId,
      arcNumber: arcIndex + 1,
      title: arc.title,
      summary: arc.summary,
      status: arc.isCompleted ? 'COMPLETED' : arcIndex === story.arcs.length - 1 ? 'ACTIVE' : 'PLANNED',
      episodicSummaries: arc.episodicSummaries,
      createdAt: currentArc?.createdAt ?? story.createdAt,
      updatedAt: story.updatedAt,
    }));
    arc.chapters.forEach(chapter => {
      const chapterId = persistenceUuid(
        chapter.persistenceId,
        'chapter',
        storyId,
        chapter.number,
      );
      const current = currentChaptersById.get(chapterId);
      chapterIdByNumber.set(chapter.number, chapterId);
      chapters.push(row({
        id: chapterId,
        storyId,
        arcId,
        legacyChapterId: current?.legacyChapterId,
        clientChapterId: current?.clientChapterId ?? `chapter-${story.id}-${chapter.number}`,
        chapterNumber: chapter.number,
        title: chapter.title,
        premise: chapter.premise,
        status: chapter.isSealed ? 'SEALED' : enumValue(chapter.status, 'UNLOCKED'),
        summary: chapter.summary,
        episodicSummary: current?.episodicSummary,
        contentHash: chapter.contentHash,
        versionId: chapter.versionId,
        syncRevision: current?.syncRevision,
        revision: current?.revision ?? '0',
        branchAnchor: chapter.branchAnchor,
        continuityWarnings: chapter.continuityWarnings,
        continuitySoftNotes: chapter.continuitySoftNotes,
        contractObjectiveFulfilled: chapter.contractReport?.objectiveFulfilled,
        contractEvidence: chapter.contractReport?.evidence,
        contractOpeningMatched: chapter.contractReport?.openingMatched,
        embedding: chapter.embedding,
        isSealed: chapter.isSealed ?? false,
        sealedAt: chapter.sealedAt ? new Date(chapter.sealedAt).toISOString() : undefined,
        hasContinuityFaults: chapter.hasContinuityFaults ?? false,
        createdAt: current?.createdAt ?? story.createdAt,
        updatedAt: story.updatedAt,
      }));
    });
  });

  const currentMembers = currentGraph?.members ?? [];
  const members = currentMembers.length > 0
    ? currentMembers.map(member => row({ ...member }))
    : [row({ storyId, userUid: ownerUid, role: 'OWNER', createdAt: story.createdAt })];
  const preferences = [row({
    storyId,
    contextEngine: story.readerPreferences?.contextEngine ?? currentGraph?.preferences[0]?.contextEngine,
    hardcoreFateMode: story.hardcoreFateMode ?? false,
    fatePressure: story.fatePressure,
    motionCoverActive: story.motionCoverActive ?? false,
    assignedRevealBackdropPolicy: currentGraph?.preferences[0]?.assignedRevealBackdropPolicy,
    updatedAt: story.updatedAt,
  })];
  const preservedOtherReaderPreferences = (currentGraph?.readerPreferences ?? [])
    .filter(pref => pref.userUid !== ownerUid)
    .map(pref => row({ ...pref }));
  const readerPreferences = story.readerPreferences === undefined
    ? (currentGraph?.readerPreferences ?? []).map(pref => row({ ...pref }))
    : [
        ...preservedOtherReaderPreferences,
        row({ storyId, userUid: ownerUid, ...story.readerPreferences, updatedAt: story.updatedAt }),
      ];
  const memoryWarnings = story.memory.memoryWarnings === undefined
    ? (currentGraph?.memoryWarnings ?? []).map(warning => row({ storyId, ...warning }))
    : story.memory.memoryWarnings.map((warning, index) => row({
        id: stableUuid('memory-warning', storyId, warning, index),
        storyId,
        warning,
        createdAt: story.updatedAt,
      }));
  const rules = story.memory.worldRules.map((ruleValue, index) => row({
    id: stableUuid('story-rule', storyId, index, ruleValue),
    storyId,
    ruleKey: `world-rule-${index + 1}`,
    ruleValue,
    isPinned: false,
    position: index,
    updatedAt: story.updatedAt,
  }));
  const revealBackdrops = Object.entries(story.assignedRevealBackdrops ?? {}).map(([entityStableKey, backdropAssetId]) => row({
    storyId,
    entityStableKey,
    backdropAssetId,
    updatedAt: story.updatedAt,
  }));
  const relationships = story.relationships === undefined
    ? (currentGraph?.codexRelationships ?? []).map(relationship => row({ storyId, ...relationship }))
    : story.relationships.map(relationship => row({
        id: persistenceUuid(relationship.id, 'relationship', storyId, relationship.sourceCharId, relationship.targetCharId),
        storyId,
        sourceEntityId: codex.entityIdsByStableKey.get(relationship.sourceCharId),
        targetEntityId: codex.entityIdsByStableKey.get(relationship.targetCharId),
        sourceStableKey: relationship.sourceCharId,
        targetStableKey: relationship.targetCharId,
        sourceName: relationship.sourceCharName,
        targetName: relationship.targetCharName,
        relationshipKind: 'CHARACTER',
        affinity: relationship.affinity,
        threat: relationship.threat,
        description: relationship.description,
        status: 'ACTIVE',
        createdAt: currentGraph?.codexRelationships.find(value => value.id === relationship.id)?.createdAt ?? story.createdAt,
        updatedAt: relationship.updatedAt,
      }));
  const karmaNodes = story.karmaNodes === undefined
    ? (currentGraph?.karmaNodes ?? []).map(node => row({ storyId, ...node }))
    : story.karmaNodes.map(node => row({
        id: persistenceUuid(node.id, 'karma-node', storyId, node.sourceId, node.targetId),
        storyId,
        sourceEntityId: codex.entityIdsByStableKey.get(node.sourceId),
        targetEntityId: codex.entityIdsByStableKey.get(node.targetId),
        sourceStableKey: node.sourceId,
        targetStableKey: node.targetId,
        sourceName: node.sourceName,
        targetName: node.targetName,
        description: node.description,
        severity: node.severity,
        nodeType: node.type,
        status: enumValue(node.status, 'ACTIVE'),
        createdAt: node.createdAt,
        resolvedAt: node.status === 'resolved' ? story.updatedAt : undefined,
      }));

  const currentBookmarks = currentGraph?.bookmarks ?? [];
  const bookmarks = story.bookmarks === undefined
    ? currentBookmarks.map(bookmark => row({ storyId, ...bookmark }))
    : [
        ...currentBookmarks.filter(bookmark => bookmark.userUid !== ownerUid).map(bookmark => row({ storyId, ...bookmark })),
        ...story.bookmarks.map(bookmark => row({
          id: persistenceUuid(bookmark.id, 'bookmark', storyId, ownerUid, bookmark.chapterNumber, bookmark.paragraphIndex),
          userUid: ownerUid,
          storyId,
          chapterId: chapterIdByNumber.get(bookmark.chapterNumber),
          paragraphIndex: bookmark.paragraphIndex,
          paragraphExcerpt: bookmark.paragraphExcerpt,
          note: bookmark.note,
          createdAt: bookmark.createdAt,
        })),
      ];
  const currentReading = currentGraph?.readingProgresses ?? [];
  const hasReadingPatch = story.lastReadChapter !== undefined
    || story.readingAnchor !== undefined
    || story.lastReadAt !== undefined
    || story.readingStats !== undefined;
  const readingProgresses = !hasReadingPatch
    ? currentReading.map(progress => row({ storyId, ...progress }))
    : [
        ...currentReading.filter(progress => progress.userUid !== ownerUid).map(progress => row({ storyId, ...progress })),
        row({
          userUid: ownerUid,
          storyId,
          chapterNumber: story.lastReadChapter ?? story.readingAnchor?.chapterNumber ?? 1,
          anchorBlockId: story.readingAnchor?.blockId,
          anchorParagraphIndex: story.readingAnchor?.paragraphIndex,
          anchorContentSignature: story.readingAnchor?.contentSignature,
          anchorIntraBlockRatio: story.readingAnchor?.intraBlockRatio,
          anchorSavedAt: story.readingAnchor?.savedAt,
          legacyScrollPosition: story.lastReadScrollPosition,
          anchor: story.readingAnchor ? boundedAny(story.readingAnchor) : undefined,
          totalReadingTimeMs: int64(story.readingStats?.totalReadingTimeMs ?? 0),
          lastReadAt: story.lastReadAt ?? story.updatedAt,
          updatedAt: story.updatedAt,
        }),
      ];
  const arcReadingProgresses = story.readingStats?.arcReadingTimeMs === undefined
    ? (currentGraph?.arcReadingProgresses ?? []).map(progress => row({ storyId, ...progress }))
    : Object.entries(story.readingStats.arcReadingTimeMs).map(([arcNumber, readingTimeMs]) => row({
        userUid: ownerUid,
        storyId,
        arcNumber: Number(arcNumber),
        readingTimeMs: int64(readingTimeMs),
        updatedAt: story.updatedAt,
      }));

  const currentBatches = currentGraph?.generationBatches ?? [];
  const generationBatches = story.chapterGenerationBatch === undefined
    ? currentBatches.map(batch => row({ storyId, ...batch, items: undefined }))
    : [row({
        id: persistenceUuid(story.chapterGenerationBatch.id, 'generation-batch', storyId),
        storyId,
        clientBatchId: story.chapterGenerationBatch.id,
        status: enumValue(story.chapterGenerationBatch.status, 'QUEUED'),
        currentChapterNumber: story.chapterGenerationBatch.currentChapterNumber,
        failedChapterNumber: story.chapterGenerationBatch.failedChapterNumber,
        errorMessage: story.chapterGenerationBatch.error,
        createdAt: story.chapterGenerationBatch.createdAt,
        completedAt: story.chapterGenerationBatch.completedAt,
        updatedAt: story.updatedAt,
      })];
  const generationBatchItems = story.chapterGenerationBatch === undefined
    ? currentBatches.flatMap(batch => batch.items.map(item => row({ batchId: batch.id, ...item })))
    : story.chapterGenerationBatch.chapterNumbers.map(chapterNumber => row({
        batchId: generationBatches[0].id,
        chapterNumber,
        status: story.chapterGenerationBatch?.completedChapterNumbers.includes(chapterNumber)
          ? 'COMPLETED'
          : story.chapterGenerationBatch?.failedChapterNumber === chapterNumber ? 'FAILED' : 'QUEUED',
        completedAt: story.chapterGenerationBatch?.completedChapterNumbers.includes(chapterNumber)
          ? story.chapterGenerationBatch.completedAt ?? story.updatedAt
          : undefined,
        updatedAt: story.updatedAt,
      }));

  const timelineEvents = (currentGraph?.timelineEvents ?? []).map(event => row({ storyId, ...event }));
  const glossaryTerms = (currentGraph?.glossaryTerms ?? []).map(term => row({ storyId, ...term }));
  const generationJobs = (currentGraph?.generationJobs ?? []).map(job => row({
    id: job.id,
    ownerUid,
    storyId,
    chapterId: job.chapterId,
    kind: job.kind,
    status: job.status,
    provider: job.provider,
    model: job.model,
    inputHash: job.inputHash,
    idempotencyKey: job.idempotencyKey,
    attemptCount: job.attemptCount,
    errorCode: job.errorCode,
    errorMessage: job.errorMessage,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  }));
  const generationEvents = (currentGraph?.generationJobs ?? []).flatMap(job =>
    job.events.map(event => row({ jobId: job.id, ...event })));

  const result: AdminUpsertStoryGraphVariables = {
    ...mutationBase(ownerUid, input),
    storyId,
    story: row({
      id: storyId,
      ownerUid,
      sourceSeedId: story.sourceSeedId ? persistenceUuid(story.sourceSeedId, 'seed', ownerUid) : undefined,
      parentStoryId: story.parentStoryId ? persistenceUuid(story.parentStoryId, 'story', ownerUid) : undefined,
      legacyStoryId: currentStory?.legacyStoryId ?? (story.id === storyId ? undefined : story.id),
      clientStoryId: story.id,
      title: story.title,
      genre: story.genre,
      mainCharacterName: story.mcName,
      premise: story.customPremise,
      status: story.deleted ? 'DELETED' : currentStory?.status === 'DELETED' ? 'DELETED' : currentStory?.status ?? 'ACTIVE',
      visibility: currentStory?.visibility ?? 'PRIVATE',
      currentChapterNumber: story.currentChapterNumber,
      forkChapterNumber: story.forkChapterNumber,
      syncRevision: input.newSyncRevision,
      revision: int64(input.newRevision),
      schemaVersion: currentStory?.schemaVersion ?? 1,
      lastImageChapter: story.lastImageChapter,
      evolutionReady: story.evolutionReady ?? false,
      evolutionReason: story.evolutionReason,
      availableVisualUpdate: story.availableVisualUpdate ?? false,
      isEdited: story.isEdited ?? false,
      conflictResolvedAt: story.conflictResolvedAt,
      deletedAt: story.deleted ? story.updatedAt : undefined,
      createdAt: story.createdAt,
      updatedAt: story.updatedAt,
    }),
    memberUserUids: members.map(member => String(member.userUid)),
    members,
    preferences,
    readerPreferenceUserUids: readerPreferences.map(pref => String(pref.userUid)),
    readerPreferences,
    memoryStates: [row({
      storyId,
      powerSystem: story.memory.powerSystem,
      currentPowerStage: story.memory.currentPowerStage,
      updatedAt: story.updatedAt,
    })],
    memoryWarningIds: memoryWarnings.map(warning => String(warning.id)),
    memoryWarnings,
    ruleIds: rules.map(rule => String(rule.id)),
    rules,
    revealBackdropKeys: revealBackdrops.map(backdrop => String(backdrop.entityStableKey)),
    revealBackdrops,
    arcIds: arcs.map(arc => String(arc.id)),
    arcs,
    chapterIds: chapters.map(chapter => String(chapter.id)),
    chapters,
    codexEntityIds: codex.entities.map(entity => String(entity.id)),
    codexEntities: codex.entities,
    codexAliases: codex.aliases,
    codexAttributes: codex.attributes,
    codexRelationshipIds: relationships.map(relationship => String(relationship.id)),
    codexRelationships: relationships,
    plotThreadIds: plotThreads.map(thread => String(thread.id)),
    plotThreads,
    codexThreadLinks: codex.threadLinks,
    abilityProgressionIds: codex.progression.map(event => String(event.id)),
    abilityProgression: codex.progression,
    karmaNodeIds: karmaNodes.map(node => String(node.id)),
    karmaNodes,
    timelineEventIds: timelineEvents.map(event => String(event.id)),
    timelineEvents,
    bookmarkIds: bookmarks.map(bookmark => String(bookmark.id)),
    bookmarks,
    readingProgressUserUids: readingProgresses.map(progress => String(progress.userUid)),
    readingProgresses,
    arcReadingProgresses,
    glossaryTermIds: glossaryTerms.map(term => String(term.id)),
    glossaryTerms,
    generationJobIds: generationJobs.map(job => String(job.id)),
    generationJobs,
    generationEventIds: generationEvents.map(event => String(event.id)),
    generationEvents,
    generationBatchIds: generationBatches.map(batch => String(batch.id)),
    generationBatches,
    generationBatchItems,
  };
  assertPermanentMediaMetadata(result);
  return result;
}

function hydrateBlock(
  block: NonNullable<ChapterGraph['chapter']>['blocks'][number],
): StoryBlock {
  const metadata = row({
    sceneType: block.sceneType,
    environment: block.environment,
    atmosphereCategory: block.atmosphereCategory,
    atmosphereTags: block.atmosphereTags,
    theme: block.theme,
    motion: block.motion,
    emotion: block.emotion,
    intensity: block.intensity,
    tension: block.tension,
    danger: block.danger,
    mysticism: block.mysticism,
    audioSignature: block.audioSignature,
    speakerName: block.speakerName,
    speakerRole: block.speakerRole,
    mode: block.mode,
    entities: block.entityMentions.map(mention => ({
      name: mention.name,
      type: lowerEnum(mention.entityType, 'character'),
      mention: lowerEnum(mention.mentionKind, 'reference'),
    })),
    music: block.music,
    beastEvent: block.beastEvent,
  });
  return {
    id: block.legacyBlockId ?? block.id,
    type: block.blockType,
    text: block.text,
    metadata: Object.keys(metadata).length > 0
      ? metadata as unknown as StoryBlock['metadata']
      : undefined,
    system: block.systemEvent as StoryBlock['system'],
    worldCard: block.worldCard as StoryBlock['worldCard'],
  };
}

/** Hydrate a single independently loaded chapter body graph. */
export function hydrateChapterContent(graph: ChapterGraph): ChapterContent | null {
  const chapter = graph.chapter;
  if (!chapter?.content) return null;
  const activeBlocks = chapter.blocks.filter(block => !block.isArchived).map(hydrateBlock);
  const archivedBlocks = chapter.blocks.filter(block => block.isArchived).map(hydrateBlock);
  const translations = Object.fromEntries(chapter.translations.map(translation => [
    translation.languageCode,
    {
      title: translation.title,
      content: translation.content,
      translatedAt: Date.parse(translation.translatedAt),
    },
  ]));
  const clips = chapter.voiceClips.map(clip => ({
    blockId: chapter.blocks.find(block => block.id === clip.blockId)?.legacyBlockId
      ?? clip.blockId
      ?? '',
    // Catalog IDs remain usable locally; R2 asset IDs are resolved by the media layer.
    audioUrl: clip.catalogId ?? '',
    speakerVoice: clip.speakerVoice,
    ...(clip.assetId ? { assetId: clip.assetId } : {}),
    ...(clip.catalogId ? { catalogId: clip.catalogId } : {}),
  }));
  return {
    storyId: chapter.storyId,
    chapterNumber: chapter.chapterNumber,
    generatedContent: chapter.content.generatedContent,
    blocks: activeBlocks.length > 0 ? activeBlocks : undefined,
    archivedBlocks: archivedBlocks.length > 0 ? archivedBlocks : undefined,
    summary: chapter.summary ?? undefined,
    episodicSummary: chapter.episodicSummary ?? undefined,
    statsChangeMessage: chapter.content.statsChangeMessage ?? undefined,
    cuePayload: chapter.content.cuePayload as ChapterContent['cuePayload'],
    translations: Object.keys(translations).length > 0 ? translations : undefined,
    audioManifest: chapter.audioManifest ? {
      version: chapter.audioManifest.version,
      language: chapter.audioManifest.language,
      clips,
      generatedAt: Date.parse(chapter.audioManifest.generatedAt),
    } : undefined,
    syncStatus: 'synced',
    revisionId: chapter.content.revisionId ?? undefined,
    syncRevision: chapter.content.syncRevision ?? chapter.syncRevision ?? undefined,
    updatedAt: chapter.content.updatedAt,
    contextManifest: chapter.content.contextManifest as ChapterContent['contextManifest'],
    handoff: chapter.content.handoff as ChapterContent['handoff'],
    contract: chapter.content.contract as ChapterContent['contract'],
  };
}

function chapterRowFromCurrent(
  current: NonNullable<ChapterGraph['chapter']>,
  content: ChapterContent,
  syncRevision: string,
  revision: string,
): GraphRow {
  return row({
    id: current.id,
    storyId: current.storyId,
    arcId: current.arcId,
    legacyChapterId: current.legacyChapterId,
    clientChapterId: current.clientChapterId,
    chapterNumber: current.chapterNumber,
    title: current.title,
    premise: current.premise,
    status: current.status,
    summary: content.summary ?? current.summary,
    episodicSummary: content.episodicSummary ?? current.episodicSummary,
    contentHash: current.contentHash,
    versionId: current.versionId,
    syncRevision,
    revision,
    branchAnchor: current.branchAnchor,
    continuityWarnings: current.continuityWarnings,
    continuitySoftNotes: current.continuitySoftNotes,
    contractObjectiveFulfilled: current.contractObjectiveFulfilled,
    contractEvidence: current.contractEvidence,
    contractOpeningMatched: current.contractOpeningMatched,
    embedding: current.embedding,
    isSealed: current.isSealed,
    sealedAt: current.sealedAt,
    hasContinuityFaults: current.hasContinuityFaults,
    createdAt: current.createdAt,
    updatedAt: content.updatedAt ?? current.updatedAt,
  });
}

/** Build the exact retired AdminUpsertChapterContentGraph variable manifest. */
export function mapChapterContentToGraphVariables(
  input: ChapterGraphWriteInput,
): AdminUpsertChapterContentGraphVariables {
  const chapter = input.currentGraph.chapter;
  if (!chapter) throw new Error('Cannot replace chapter content without its current relational scaffold.');
  if (chapter.storyId !== input.storyId || chapter.chapterNumber !== input.content.chapterNumber) {
    throw new Error('Chapter content identity does not match the current relational graph.');
  }
  const currentContent = chapter.content;
  const allInputBlocks = [
    ...(input.content.blocks ?? []).map(block => ({ block, isArchived: false })),
    ...(input.content.archivedBlocks ?? []).map(block => ({ block, isArchived: true })),
  ];
  const currentByLegacyId = new Map(
    chapter.blocks.map(block => [block.legacyBlockId ?? block.id, block]),
  );
  const blockIdByClientId = new Map<string, string>();
  const blocks: GraphRow[] = [];
  const blockAttributes: GraphRow[] = [];
  const blockEntityMentions: GraphRow[] = [];
  allInputBlocks.forEach(({ block, isArchived }, position) => {
    const current = currentByLegacyId.get(block.id);
    const blockId = current?.id
      ?? persistenceUuid(block.id, 'chapter-block', chapter.id, isArchived, position);
    blockIdByClientId.set(block.id, blockId);
    const metadata = block.metadata;
    const theme = Array.isArray(metadata?.theme)
      ? metadata.theme
      : metadata?.theme ? [metadata.theme] : undefined;
    blocks.push(row({
      id: blockId,
      chapterId: chapter.id,
      legacyBlockId: block.id,
      position,
      blockType: block.type,
      text: block.text,
      speakerName: metadata?.speakerName,
      speakerRole: metadata?.speakerRole,
      mode: metadata?.mode,
      sceneType: metadata?.sceneType,
      environment: metadata?.environment,
      atmosphereCategory: metadata?.atmosphereCategory,
      atmosphereTags: metadata?.atmosphereTags,
      theme,
      motion: metadata?.motion,
      emotion: metadata?.emotion,
      intensity: metadata?.intensity,
      tension: metadata?.tension,
      danger: metadata?.danger,
      mysticism: metadata?.mysticism,
      audioSignature: metadata?.audioSignature,
      isArchived,
      music: metadata?.music ? boundedAny(metadata.music) : undefined,
      beastEvent: metadata?.beastEvent ? boundedAny(metadata.beastEvent) : undefined,
      systemEvent: block.system ? boundedAny(block.system) : undefined,
      worldCard: block.worldCard ? boundedAny(block.worldCard) : undefined,
    }));
    for (const attribute of current?.attributes ?? []) {
      blockAttributes.push(row({ blockId, ...attribute }));
    }
    (metadata?.entities ?? []).forEach((entity, mentionPosition) => {
      blockEntityMentions.push(row({
        blockId,
        position: mentionPosition,
        entityId: undefined,
        name: entity.name,
        entityType: enumValue(entity.type, 'CHARACTER'),
        mentionKind: enumValue(entity.mention, 'REFERENCE'),
      }));
    });
  });

  const translations = input.content.translations === undefined
    ? chapter.translations.map(translation => row({ chapterId: chapter.id, ...translation }))
    : Object.entries(input.content.translations).map(([languageCode, translation]) => row({
        chapterId: chapter.id,
        languageCode,
        title: translation.title,
        content: translation.content,
        translatedAt: new Date(translation.translatedAt).toISOString(),
      }));
  const fingerprintSource = input.content.handoff?.fingerprints;
  const fingerprints = fingerprintSource === undefined
    ? input.currentGraph.fingerprints.map(fingerprint => row({
        id: fingerprint.id,
        storyId: input.storyId,
        chapterId: chapter.id,
        chapterNumber: fingerprint.chapterNumber,
        actionType: fingerprint.actionType,
        location: fingerprint.location,
        outcome: fingerprint.outcome,
        participants: fingerprint.participants,
        createdAt: fingerprint.createdAt,
      }))
    : fingerprintSource.map((fingerprint, index) => row({
        id: input.currentGraph.fingerprints[index]?.id
          ?? stableUuid('scene-fingerprint', chapter.id, fingerprint.actionType, fingerprint.outcome, index),
        storyId: input.storyId,
        chapterId: chapter.id,
        chapterNumber: fingerprint.chapterNumber,
        actionType: fingerprint.actionType,
        location: fingerprint.location,
        outcome: fingerprint.outcome,
        participants: fingerprint.participants,
        createdAt: input.content.updatedAt ?? chapter.updatedAt,
      }));
  const completedEvents = input.content.handoff?.completedEvents;
  const facts = completedEvents === undefined
    ? input.currentGraph.facts.map(fact => row({
        id: fact.id,
        storyId: input.storyId,
        chapterId: chapter.id,
        chapterNumber: fact.chapterNumber,
        factKind: fact.factKind,
        subjectKey: fact.subjectKey,
        factText: fact.factText,
        confidence: fact.confidence,
        isPinned: fact.isPinned,
        createdAt: fact.createdAt,
      }))
    : completedEvents.map((factText, index) => row({
        id: input.currentGraph.facts[index]?.id
          ?? stableUuid('chapter-fact', chapter.id, factText, index),
        storyId: input.storyId,
        chapterId: chapter.id,
        chapterNumber: chapter.chapterNumber,
        factKind: 'COMPLETED_EVENT',
        factText,
        isPinned: false,
        createdAt: input.content.updatedAt ?? chapter.updatedAt,
      }));
  const retainedFactIds = new Set(facts.map(fact => fact.id));
  const factSupersessions = input.currentGraph.facts.flatMap(fact =>
    retainedFactIds.has(fact.id)
      ? fact.newerSupersessions.map(link => row({
          newerFactId: fact.id,
          olderFactId: link.olderFactId,
          createdAt: link.createdAt,
        }))
      : []);

  const audioManifest = input.content.audioManifest;
  const audioManifests = audioManifest === undefined
    ? chapter.audioManifest ? [row({ chapterId: chapter.id, ...chapter.audioManifest })] : []
    : [row({
        chapterId: chapter.id,
        version: audioManifest.version,
        language: audioManifest.language,
        generatedAt: new Date(audioManifest.generatedAt).toISOString(),
        updatedAt: input.content.updatedAt ?? chapter.updatedAt,
      })];
  const currentVoiceByBlock = new Map(
    chapter.voiceClips.map(clip => [
      chapter.blocks.find(block => block.id === clip.blockId)?.legacyBlockId ?? clip.blockId ?? '',
      clip,
    ]),
  );
  const voiceClips = audioManifest === undefined
    ? chapter.voiceClips.map(clip => row({ chapterId: chapter.id, ...clip }))
    : audioManifest.clips.flatMap((clip, position) => {
        const extended = clip as typeof clip & { assetId?: string; catalogId?: string };
        const current = currentVoiceByBlock.get(clip.blockId);
        const assetId = extended.assetId ?? current?.assetId;
        const catalogId = extended.catalogId ?? current?.catalogId;
        if (!assetId && !catalogId) return [];
        return [row({
          id: current?.id ?? stableUuid('voice-clip', chapter.id, clip.blockId, position),
          chapterId: chapter.id,
          blockId: blockIdByClientId.get(clip.blockId),
          position,
          speakerVoice: clip.speakerVoice,
          assetId,
          catalogId,
          createdAt: current?.createdAt ?? input.content.updatedAt ?? chapter.updatedAt,
        })];
      });

  const result: AdminUpsertChapterContentGraphVariables = {
    ...mutationBase(input.ownerUid, input),
    storyId: input.storyId,
    chapterId: chapter.id,
    chapter: chapterRowFromCurrent(
      chapter,
      input.content,
      input.newSyncRevision,
      int64(input.newRevision),
    ),
    content: row({
      chapterId: chapter.id,
      generatedContent: input.content.generatedContent,
      statsChangeMessage: input.content.statsChangeMessage,
      contextEngine: currentContent?.contextEngine,
      contextRoute: currentContent?.contextRoute,
      contextEstimatedTokens: currentContent?.contextEstimatedTokens,
      contextBudgetTokens: currentContent?.contextBudgetTokens,
      contractObjective: input.content.contract?.objective ?? currentContent?.contractObjective,
      contractRequiredOpening: input.content.contract?.requiredOpening ?? currentContent?.contractRequiredOpening,
      handoffNextImmediateAction: input.content.handoff?.nextImmediateAction,
      handoffEndLocation: input.content.handoff?.endState.location,
      handoffEndTimeMarker: input.content.handoff?.endState.timeMarker,
      handoffMainCharacterCondition: input.content.handoff?.endState.mcCondition,
      handoffOpenTension: input.content.handoff?.endState.openTension,
      revisionId: input.content.revisionId,
      syncRevision: input.newSyncRevision,
      revision: int64(input.newRevision),
      cuePayload: input.content.cuePayload ? boundedAny(input.content.cuePayload) : undefined,
      contextManifest: input.content.contextManifest ? boundedAny(input.content.contextManifest) : undefined,
      handoff: input.content.handoff ? boundedAny(input.content.handoff) : undefined,
      contract: input.content.contract ? boundedAny(input.content.contract) : undefined,
      updatedAt: input.content.updatedAt ?? chapter.updatedAt,
    }),
    blockIds: blocks.map(block => String(block.id)),
    blocks,
    blockAttributes,
    blockEntityMentions,
    translationLanguages: translations.map(translation => String(translation.languageCode)),
    translations,
    fingerprintIds: fingerprints.map(fingerprint => String(fingerprint.id)),
    fingerprints,
    factIds: facts.map(fact => String(fact.id)),
    facts,
    factSupersessions,
    audioManifests,
    voiceClipIds: voiceClips.map(clip => String(clip.id)),
    voiceClips,
  };
  assertPermanentMediaMetadata(result);
  return result;
}

const SEED_ARRAY_FIELDS = new Set([
  'storyTags',
  'majorFactions',
  'initialCharacters',
  'majorMysteries',
  'unresolvedPlotThreads',
]);

function seedFieldValue(field: NonNullable<SeedGraph['storySeed']>['fields'][number]): unknown {
  return field.stringValue ?? field.numberValue ?? field.booleanValue;
}

/** Hydrate a reusable creation seed from independently addressable field rows. */
export function hydrateStorySeed(graph: SeedGraph): StorySeed | null {
  const source = graph.storySeed;
  if (!source) return null;
  const intake: Record<string, unknown> = {};
  const blueprint: Record<string, unknown> = {};
  const grouped = new Map<string, typeof source.fields>();
  for (const field of source.fields) {
    const key = `${field.section}:${field.fieldKey}`;
    const values = grouped.get(key) ?? [];
    values.push(field);
    grouped.set(key, values);
  }
  for (const [key, fields] of grouped) {
    const separator = key.indexOf(':');
    const section = key.slice(0, separator);
    const fieldKey = key.slice(separator + 1);
    const target = section === 'blueprint' ? blueprint : intake;
    const sorted = [...fields].sort((a, b) => a.position - b.position);
    target[fieldKey] = SEED_ARRAY_FIELDS.has(fieldKey) || sorted.length > 1
      ? sorted.map(seedFieldValue)
      : seedFieldValue(sorted[0]);
  }
  intake.customCharacters = source.entities
    .filter(entity => entity.entityKind === 'CHARACTER')
    .sort((a, b) => a.position - b.position)
    .map(entity => row({
      id: entity.clientEntityId,
      name: entity.name,
      aliases: entity.aliases.sort((a, b) => a.position - b.position).map(alias => alias.alias),
      age: entity.age,
      skinTone: entity.skinTone,
      eyeColor: entity.eyeColor,
      powerType: entity.powerType,
      rankLevel: entity.rankLevel,
      role: entity.role,
      connectionToMC: entity.connectionToMainCharacter,
      bio: entity.description,
    }));
  intake.customFactions = source.entities
    .filter(entity => entity.entityKind === 'FACTION')
    .sort((a, b) => a.position - b.position)
    .map(entity => row({
      id: entity.clientEntityId,
      name: entity.name,
      aliases: entity.aliases.sort((a, b) => a.position - b.position).map(alias => alias.alias),
      role: entity.role,
      title: entity.description ?? entity.name,
    }));
  return {
    schemaVersion: 1,
    id: source.clientSeedId ?? source.legacySeedId ?? `seed-${source.id}`,
    userId: source.ownerUid,
    title: source.title,
    intake: intake as unknown as StorySeed['intake'],
    blueprint: blueprint as unknown as StorySeed['blueprint'],
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

function flattenSeedSection(
  seedId: string,
  section: 'intake' | 'blueprint',
  value: object,
): GraphRow[] {
  const fields: GraphRow[] = [];
  for (const [fieldKey, fieldValue] of Object.entries(value)) {
    if (fieldKey === 'customCharacters' || fieldKey === 'customFactions' || fieldValue === undefined) continue;
    const values = Array.isArray(fieldValue) ? fieldValue : [fieldValue];
    values.forEach((entry, position) => {
      if (!['string', 'number', 'boolean'].includes(typeof entry)) return;
      fields.push(row({
        seedId,
        section,
        fieldKey,
        position,
        stringValue: typeof entry === 'string' ? entry : undefined,
        numberValue: typeof entry === 'number' ? entry : undefined,
        booleanValue: typeof entry === 'boolean' ? entry : undefined,
      }));
    });
  }
  return fields;
}

/** Build the exact retired AdminUpsertStorySeedGraph variable manifest. */
export function mapStorySeedToGraphVariables(
  input: SeedGraphWriteInput,
): AdminUpsertStorySeedGraphVariables {
  if (input.seed.userId !== input.ownerUid) {
    throw new Error('Cannot write a story seed owned by another account.');
  }
  const seedId = input.currentGraph?.storySeed?.id ?? currentSeedId(input.seed);
  const currentEntityByClientKey = new Map(
    (input.currentGraph?.storySeed?.entities ?? []).map(entity => [
      `${entity.entityKind}:${entity.clientEntityId}`,
      entity,
    ]),
  );
  const entities: GraphRow[] = [];
  const entityAliases: GraphRow[] = [];
  const appendEntities = (
    kind: 'CHARACTER' | 'FACTION',
    values: Array<Record<string, unknown>>,
  ) => {
    values.forEach((value, position) => {
      const clientEntityId = String(value.id ?? `${kind.toLowerCase()}-${position}`);
      const current = currentEntityByClientKey.get(`${kind}:${clientEntityId}`);
      const entityId = current?.id
        ?? persistenceUuid(undefined, 'seed-entity', seedId, kind, clientEntityId);
      entities.push(row({
        id: entityId,
        seedId,
        entityKind: kind,
        clientEntityId,
        position,
        name: String(value.name ?? ''),
        age: value.age,
        skinTone: value.skinTone,
        eyeColor: value.eyeColor,
        powerType: value.powerType,
        rankLevel: value.rankLevel,
        role: value.role,
        powerLevel: value.powerLevel,
        alignment: value.alignment,
        connectionToMainCharacter: value.connectionToMC,
        description: kind === 'CHARACTER' ? value.bio : value.title,
      }));
      const aliasValues = Array.isArray(value.aliases)
        ? value.aliases.filter((alias): alias is string => typeof alias === 'string')
        : [];
      aliasValues.forEach((alias, aliasPosition) => entityAliases.push(row({
        seedEntityId: entityId,
        alias,
        normalizedAlias: normalizeAlias(alias),
        position: aliasPosition,
      })));
    });
  };
  appendEntities(
    'CHARACTER',
    (input.seed.intake.customCharacters ?? []) as unknown as Array<Record<string, unknown>>,
  );
  appendEntities(
    'FACTION',
    (input.seed.intake.customFactions ?? []) as unknown as Array<Record<string, unknown>>,
  );
  const fields = [
    ...flattenSeedSection(seedId, 'intake', input.seed.intake),
    ...flattenSeedSection(seedId, 'blueprint', input.seed.blueprint),
  ];
  const managedFieldKeys = new Set(fields.map(field => `${field.section}:${field.fieldKey}`));
  for (const current of input.currentGraph?.storySeed?.fields ?? []) {
    if (!managedFieldKeys.has(`${current.section}:${current.fieldKey}`)) {
      fields.push(row({ seedId, ...current }));
    }
  }
  const result: AdminUpsertStorySeedGraphVariables = {
    ...mutationBase(input.ownerUid, input),
    seedId,
    seed: row({
      id: seedId,
      ownerUid: input.ownerUid,
      legacySeedId: input.currentGraph?.storySeed?.legacySeedId
        ?? (input.seed.id.includes(seedId) ? undefined : input.seed.id),
      clientSeedId: input.seed.id,
      title: input.seed.title,
      schemaVersion: input.seed.schemaVersion,
      syncRevision: input.newSyncRevision,
      revision: int64(input.newRevision),
      createdAt: input.seed.createdAt,
      updatedAt: input.seed.updatedAt,
    }),
    fields,
    entityIds: entities.map(entity => String(entity.id)),
    entities,
    entityAliases,
  };
  assertPermanentMediaMetadata(result);
  return result;
}

function mergeDefined<T extends object>(base: T, patch: Partial<T>): T {
  const merged = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) (merged as Record<string, unknown>)[key] = value;
  }
  return merged;
}

/** Hydrate the public profile shape; signed portrait URLs are added separately. */
export function hydrateUserProfile(graph: ProfileGraph): UserProfile | null {
  const account = graph.account;
  const profile = graph.profile;
  if (!account || !profile) return null;
  const inventory: CosmicArtifact[] = graph.inventory.map(item => ({
    id: item.clientItemId ?? item.id,
    name: item.name,
    description: item.description ?? '',
    unlockedAt: item.acquiredAt,
    sourceStoryId: item.sourceStoryId ?? undefined,
    sourceStoryTitle: item.sourceStoryTitle ?? undefined,
    milestoneType: (item.milestoneType ?? 'codex_linked') as CosmicArtifact['milestoneType'],
    milestoneName: item.sourceMilestone ?? item.name,
    rarity: (item.rarity ?? 'Common') as CosmicArtifact['rarity'],
    attributeBoost: item.attributeBoost ?? undefined,
    statusEffectDef: item.statusEffectDefinition as CosmicArtifact['statusEffectDef'],
    offeringWeekId: item.offeringWeekId ?? undefined,
    gatheredAt: item.gatheredAt ?? undefined,
    status: item.status as CosmicArtifact['status'],
    rewardValueQi: numberFromInt64(item.rewardValueQi),
    rewardValueSectMerit: numberFromInt64(item.rewardValueSectMerit),
  }));
  const inventoryClientId = new Map(
    graph.inventory.map(item => [item.id, item.clientItemId ?? item.id]),
  );
  const activeStatusEffects: ActiveStatusEffect[] = graph.activeEffects.map(effect => ({
    id: effect.clientEffectId ?? effect.id,
    effectDef: {
      name: effect.name,
      type: effect.effectType as ActiveStatusEffect['effectDef']['type'],
      description: effect.description,
      durationMs: numberFromInt64(effect.durationMs) ?? 0,
      scope: effect.scope as ActiveStatusEffect['effectDef']['scope'],
      visual: effect.visual ?? undefined,
      counterplay: effect.counterplay ?? undefined,
      rewardHook: effect.rewardHook ?? undefined,
      qiMultiplier: effect.qiMultiplier ?? undefined,
      sectQiMultiplier: effect.sectQiMultiplier ?? undefined,
      targetProgress: effect.targetProgress ?? undefined,
    },
    appliedAt: effect.appliedAt,
    expiresAt: effect.expiresAt,
    sourceArtifactId: effect.sourceInventoryItemId
      ? inventoryClientId.get(effect.sourceInventoryItemId) ?? effect.sourceInventoryItemId
      : undefined,
    progress: effect.progress ?? undefined,
    targetProgress: effect.targetProgress ?? undefined,
    completedAt: effect.completedAt ?? undefined,
    isUnlockedReward: effect.isUnlockedReward,
  }));
  return {
    uid: account.uid,
    username: profile.username ?? account.displayName ?? '',
    displayName: account.displayName ?? profile.username ?? '',
    displayNameColor: profile.displayNameColor ?? undefined,
    avatarUrl: '',
    activePortraitId: profile.activePortraitAssetId ?? undefined,
    preferredLanguage: profile.preferredLanguage ?? 'en',
    defaultTranslationLanguage: profile.defaultTranslationLanguage ?? 'en',
    savedStoryCount: profile.savedStoryCount,
    activeStories: [],
    inactiveStories: [],
    joinedDate: account.createdAt,
    updatedAt: profile.updatedAt,
    role: account.role.toLowerCase() as UserProfile['role'],
    qi: numberFromInt64(profile.legacyQi),
    dao_xp: numberFromInt64(profile.daoXp),
    dao_rank: profile.daoRank ?? undefined,
    heavenly_qi: numberFromInt64(profile.heavenlyQi),
    sect_qi: numberFromInt64(profile.sectQi),
    demonic_qi: numberFromInt64(profile.demonicQi),
    premiumTier: profile.subscriptionTier.toLowerCase() as UserProfile['premiumTier'],
    imageGenerationCount: profile.imageGenerationCount,
    imageQuotaResetAt: profile.imageQuotaResetAt ?? undefined,
    writingStreak: profile.writingStreak,
    lastSessionEnd: profile.lastSessionEnd ?? undefined,
    daoPillarStreak: profile.daoPillarStreak,
    daoPillarCracked: profile.daoPillarCracked,
    lastReadDate: profile.lastReadDate ?? undefined,
    lastInteractionDate: profile.lastInteractionDate ?? undefined,
    cosmicInventory: inventory,
    equippedArtifactId: profile.equippedInventoryItemId
      ? inventoryClientId.get(profile.equippedInventoryItemId) ?? profile.equippedInventoryItemId
      : undefined,
    activeStatusEffects,
  };
}

function defaultProfile(ownerUid: string, now: string): UserProfile {
  return {
    uid: ownerUid,
    username: '',
    displayName: '',
    avatarUrl: '',
    preferredLanguage: 'en',
    defaultTranslationLanguage: 'en',
    savedStoryCount: 0,
    activeStories: [],
    inactiveStories: [],
    joinedDate: now,
    updatedAt: now,
    role: 'user',
    premiumTier: 'mortal',
    cosmicInventory: [],
    activeStatusEffects: [],
  };
}

/** Build the exact retired AdminUpsertUserProfileGraph manifest with PATCH merge semantics. */
export function mapUserProfileToGraphVariables(
  input: ProfileGraphWriteInput,
): AdminUpsertUserProfileGraphVariables {
  if (input.patch.uid !== undefined && input.patch.uid !== input.ownerUid) {
    throw new Error('Cannot update a profile owned by another account.');
  }
  const currentValue = input.currentGraph ? hydrateUserProfile(input.currentGraph) : null;
  const now = input.patch.updatedAt
    ?? input.currentGraph?.profile?.updatedAt
    ?? new Date(0).toISOString();
  const value = mergeDefined(currentValue ?? defaultProfile(input.ownerUid, now), input.patch);
  const currentInventoryByClientId = new Map(
    (input.currentGraph?.inventory ?? []).map(item => [item.clientItemId ?? item.id, item]),
  );
  const inventory = input.patch.cosmicInventory === undefined
    ? (input.currentGraph?.inventory ?? []).map(item => row({ userUid: input.ownerUid, ...item }))
    : (value.cosmicInventory ?? []).map(item => {
        const current = currentInventoryByClientId.get(item.id);
        const itemId = current?.id ?? persistenceUuid(item.id, 'profile-inventory', input.ownerUid);
        return row({
          id: itemId,
          userUid: input.ownerUid,
          clientItemId: item.id,
          catalogItemId: current?.catalogItemId,
          itemKind: current?.itemKind ?? 'COSMIC_ARTIFACT',
          name: item.name,
          description: item.description,
          rarity: item.rarity,
          status: item.status ?? 'unsubmitted',
          sourceStoryId: item.sourceStoryId
            ? persistenceUuid(item.sourceStoryId, 'story', input.ownerUid)
            : undefined,
          sourceStoryTitle: item.sourceStoryTitle,
          sourceMilestone: item.milestoneName,
          milestoneType: item.milestoneType,
          imageAssetId: current?.imageAssetId,
          attributeBoost: item.attributeBoost,
          statusEffectDefinition: item.statusEffectDef
            ? boundedAny(item.statusEffectDef)
            : undefined,
          offeringWeekId: item.offeringWeekId,
          gatheredAt: item.gatheredAt,
          rewardValueQi: item.rewardValueQi == null ? undefined : int64(item.rewardValueQi),
          rewardValueSectMerit: item.rewardValueSectMerit == null
            ? undefined
            : int64(item.rewardValueSectMerit),
          acquiredAt: item.unlockedAt,
          updatedAt: now,
        });
      });
  const inventoryIdByClientId = new Map(inventory.map(item => [String(item.clientItemId ?? item.id), String(item.id)]));
  const currentEffectsByClientId = new Map(
    (input.currentGraph?.activeEffects ?? []).map(effect => [effect.clientEffectId ?? effect.id, effect]),
  );
  const effects = input.patch.activeStatusEffects === undefined
    ? (input.currentGraph?.activeEffects ?? []).map(effect => row({ userUid: input.ownerUid, ...effect }))
    : (value.activeStatusEffects ?? []).map(effect => {
        const current = currentEffectsByClientId.get(effect.id);
        return row({
          id: current?.id ?? persistenceUuid(effect.id, 'profile-effect', input.ownerUid),
          userUid: input.ownerUid,
          clientEffectId: effect.id,
          sourceInventoryItemId: effect.sourceArtifactId
            ? inventoryIdByClientId.get(effect.sourceArtifactId)
            : undefined,
          name: effect.effectDef.name,
          effectType: effect.effectDef.type,
          description: effect.effectDef.description,
          durationMs: int64(effect.effectDef.durationMs),
          scope: effect.effectDef.scope,
          visual: effect.effectDef.visual,
          counterplay: effect.effectDef.counterplay,
          rewardHook: effect.effectDef.rewardHook,
          qiMultiplier: effect.effectDef.qiMultiplier,
          sectQiMultiplier: effect.effectDef.sectQiMultiplier,
          appliedAt: effect.appliedAt,
          expiresAt: effect.expiresAt,
          progress: effect.progress,
          targetProgress: effect.targetProgress ?? effect.effectDef.targetProgress,
          completedAt: effect.completedAt,
          isUnlockedReward: effect.isUnlockedReward ?? false,
          createdAt: current?.createdAt ?? effect.appliedAt,
          updatedAt: now,
        });
      });
  const progressEvents = (input.currentGraph?.progressEvents ?? []).map(event => row({
    id: event.id,
    userUid: input.ownerUid,
    eventType: event.eventType,
    amount: event.amount,
    sourceType: event.sourceType,
    sourceId: event.sourceId,
    idempotencyKey: event.idempotencyKey,
    createdAt: event.createdAt,
  }));
  const equippedInventoryItemId = value.equippedArtifactId
    ? inventoryIdByClientId.get(value.equippedArtifactId)
      ?? input.currentGraph?.profile?.equippedInventoryItemId
    : undefined;
  const result: AdminUpsertUserProfileGraphVariables = {
    ...mutationBase(input.ownerUid, input),
    account: row({
      uid: input.ownerUid,
      email: input.currentGraph?.account?.email,
      displayName: value.displayName,
      updatedAt: now,
    }),
    profile: row({
      userUid: input.ownerUid,
      username: value.username,
      displayNameColor: value.displayNameColor,
      preferredLanguage: value.preferredLanguage,
      defaultTranslationLanguage: value.defaultTranslationLanguage,
      subscriptionTier: enumValue(value.premiumTier, 'MORTAL'),
      legacyQi: value.qi == null ? undefined : int64(value.qi),
      daoXp: int64(value.dao_xp ?? 0),
      daoRank: value.dao_rank,
      heavenlyQi: int64(value.heavenly_qi ?? 0),
      sectQi: int64(value.sect_qi ?? 0),
      demonicQi: int64(value.demonic_qi ?? 0),
      writingStreak: value.writingStreak ?? 0,
      savedStoryCount: value.savedStoryCount,
      activePortraitAssetId: value.activePortraitId,
      imageGenerationCount: value.imageGenerationCount ?? 0,
      imageQuotaResetAt: value.imageQuotaResetAt,
      lastSessionEnd: value.lastSessionEnd,
      daoPillarStreak: value.daoPillarStreak ?? 0,
      daoPillarCracked: value.daoPillarCracked ?? false,
      lastReadDate: value.lastReadDate,
      lastInteractionDate: value.lastInteractionDate,
      equippedInventoryItemId,
      syncRevision: input.newSyncRevision,
      revision: int64(input.newRevision),
      lastReadAt: input.currentGraph?.profile?.lastReadAt,
      createdAt: input.currentGraph?.profile?.createdAt ?? value.joinedDate,
      updatedAt: now,
    }),
    preferences: input.currentGraph?.preferences
      ? [row({ ...input.currentGraph.preferences })]
      : [],
    inventoryIds: inventory.map(item => String(item.id)),
    inventory,
    effectIds: effects.map(effect => String(effect.id)),
    effects,
    progressEventIds: progressEvents.map(event => String(event.id)),
    progressEvents,
  };
  assertPermanentMediaMetadata(result);
  return result;
}
