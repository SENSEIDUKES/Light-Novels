import { ConnectorConfig, DataConnect, OperationOptions, ExecuteOperationResponse } from 'firebase-admin/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;

export enum AccountRole {
  USER = "USER",
  ADMIN = "ADMIN",
  OWNER = "OWNER",
}
export enum ArcStatus {
  PLANNED = "PLANNED",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  ARCHIVED = "ARCHIVED",
}
export enum ChapterStatus {
  LOCKED = "LOCKED",
  UNLOCKED = "UNLOCKED",
  GENERATING = "GENERATING",
  UNREAD = "UNREAD",
  READ = "READ",
  SEALED = "SEALED",
  FAILED = "FAILED",
  DELETED = "DELETED",
}
export enum CodexEntityKind {
  CHARACTER = "CHARACTER",
  BEAST = "BEAST",
  LOCATION = "LOCATION",
  ARTIFACT = "ARTIFACT",
  FACTION = "FACTION",
  ABILITY = "ABILITY",
  MYSTERY = "MYSTERY",
  POWER = "POWER",
  EVENT = "EVENT",
  GLOSSARY = "GLOSSARY",
  OTHER = "OTHER",
}
export enum CodexRelevanceState {
  ACTIVE = "ACTIVE",
  WARM = "WARM",
  DORMANT = "DORMANT",
  ARCHIVED = "ARCHIVED",
  REACTIVATED = "REACTIVATED",
}
export enum GenerationJobKind {
  STORY_BLUEPRINT = "STORY_BLUEPRINT",
  STORY_ARC = "STORY_ARC",
  CHAPTER = "CHAPTER",
  CONTINUITY = "CONTINUITY",
  TRANSLATION = "TRANSLATION",
  IMAGE = "IMAGE",
  AUDIO = "AUDIO",
  VIDEO = "VIDEO",
  EXPORT = "EXPORT",
  OTHER = "OTHER",
}
export enum GenerationJobStatus {
  QUEUED = "QUEUED",
  RUNNING = "RUNNING",
  PAUSED = "PAUSED",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}
export enum MediaAssetStatus {
  GENERATING = "GENERATING",
  PROCESSING = "PROCESSING",
  UPLOADING = "UPLOADING",
  READY = "READY",
  FAILED = "FAILED",
  ARCHIVED = "ARCHIVED",
  DELETED = "DELETED",
  ORPHANED = "ORPHANED",
  PENDING_CLEANUP = "PENDING_CLEANUP",
}
export enum MediaAssetType {
  IMAGE = "IMAGE",
  AUDIO = "AUDIO",
  VIDEO = "VIDEO",
  MOTION_COVER = "MOTION_COVER",
  PDF = "PDF",
  EPUB = "EPUB",
  MANGA_PAGE = "MANGA_PAGE",
  EXPORT = "EXPORT",
  OTHER = "OTHER",
}
export enum MediaCleanupStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
}
export enum MediaDeletionIntentStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
}
export enum MediaVisibility {
  PRIVATE = "PRIVATE",
  PUBLIC = "PUBLIC",
}
export enum PlotThreadStatus {
  ACTIVE = "ACTIVE",
  RESOLVED = "RESOLVED",
  ARCHIVED = "ARCHIVED",
}
export enum StorageQuotaReservationStatus {
  RESERVED = "RESERVED",
  COMMITTED = "COMMITTED",
  RELEASED = "RELEASED",
  EXPIRED = "EXPIRED",
}
export enum StoryChangeKind {
  UPSERTED = "UPSERTED",
  CHAPTER_UPDATED = "CHAPTER_UPDATED",
  PROFILE_UPDATED = "PROFILE_UPDATED",
  DELETED = "DELETED",
}
export enum StoryDeletionStageKind {
  TOMBSTONE = "TOMBSTONE",
  STRUCTURED_DATA = "STRUCTURED_DATA",
  MEDIA = "MEDIA",
  LOCAL_CACHE = "LOCAL_CACHE",
  FINALIZE = "FINALIZE",
}
export enum StoryDeletionStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
}
export enum StoryMemberRole {
  OWNER = "OWNER",
  EDITOR = "EDITOR",
  READER = "READER",
}
export enum StoryStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  ARCHIVED = "ARCHIVED",
  DELETED = "DELETED",
}
export enum StoryVisibility {
  PRIVATE = "PRIVATE",
  SHARED = "SHARED",
  PUBLIC = "PUBLIC",
}
export enum SubscriptionTier {
  MORTAL = "MORTAL",
  OUTER_SECT = "OUTER_SECT",
  INNER_SECT = "INNER_SECT",
  SECT_MASTER = "SECT_MASTER",
  IMMORTAL = "IMMORTAL",
}

export interface AbilityProgressionEvent_Key {
  id: UUIDString;
  __typename?: 'AbilityProgressionEvent_Key';
}

export interface AdminAdvanceStoryDeletionJobData {
  storyDeletionStage_update?: StoryDeletionStage_Key | null;
  storyDeletionJob_update?: StoryDeletionJob_Key | null;
}

export interface AdminAdvanceStoryDeletionJobVariables {
  jobId: UUIDString;
  leaseOwner: string;
  completedStage: StoryDeletionStageKind;
  nextStage: StoryDeletionStageKind;
}

export interface AdminClaimMediaCleanupTaskData {
  mediaCleanupTask_update?: MediaCleanupTask_Key | null;
  mediaDeletionIntent_update?: MediaDeletionIntent_Key | null;
}

export interface AdminClaimMediaCleanupTaskVariables {
  taskId: UUIDString;
  assetId: UUIDString;
  ownerUid: string;
  idempotencyKey: string;
  leaseOwner: string;
  leaseExpiresAt: TimestampString;
}

export interface AdminClaimStoryDeletionJobData {
  storyDeletionJob_update?: StoryDeletionJob_Key | null;
  storyDeletionStage_update?: StoryDeletionStage_Key | null;
}

export interface AdminClaimStoryDeletionJobVariables {
  jobId: UUIDString;
  leaseOwner: string;
  leaseExpiresAt: TimestampString;
  stage: StoryDeletionStageKind;
}

export interface AdminCommitMediaAssetReadyData {
  assetReady?: MediaAsset_Key | null;
  mediaAttachment_insert: MediaAttachment_Key;
  mediaUploadAttempt_updateMany: number;
}

export interface AdminCommitMediaAssetReadyVariables {
  id: UUIDString;
  ownerUid: string;
  etag?: string | null;
  targetKind: string;
  targetKey: string;
  purpose: string;
  storyId?: UUIDString | null;
  chapterId?: UUIDString | null;
  entityId?: UUIDString | null;
}

export interface AdminCommitMediaAssetReplacementData {
  replacementReady?: MediaAsset_Key | null;
  mediaAttachment_updateMany: number;
  mediaAttachment_insert: MediaAttachment_Key;
  archivedPrevious?: MediaAsset_Key | null;
  mediaCleanupTask_insert: MediaCleanupTask_Key;
  mediaUploadAttempt_updateMany: number;
}

export interface AdminCommitMediaAssetReplacementVariables {
  id: UUIDString;
  ownerUid: string;
  replacesAssetId: UUIDString;
  replacesBucket: string;
  replacesObjectKey: string;
  etag?: string | null;
  targetKind: string;
  targetKey: string;
  purpose: string;
  storyId?: UUIDString | null;
  chapterId?: UUIDString | null;
  entityId?: UUIDString | null;
  cleanupAfter: TimestampString;
}

export interface AdminCommitMediaAssetToSlotData {
  mediaAttachment_updateMany: number;
  mediaAsset_update?: MediaAsset_Key | null;
  mediaAttachment_upsert: MediaAttachment_Key;
  mediaSlot_upsert: MediaSlot_Key;
  mediaUploadAttempt_updateMany: number;
  mediaUploadReceipt_update?: MediaUploadReceipt_Key | null;
  committedQuota?: number | null;
}

export interface AdminCommitMediaAssetToSlotVariables {
  id: UUIDString;
  ownerUid: string;
  quotaReservationId: UUIDString;
  idempotencyKey: string;
  etag?: string | null;
  storyId?: UUIDString | null;
  chapterId?: UUIDString | null;
  entityId?: UUIDString | null;
  targetKind: string;
  targetKey: string;
  purpose: string;
  attachmentId: UUIDString;
  historyEntityType?: string | null;
  clientHistoryId?: string | null;
  promptUsed?: string | null;
  chapterNumber?: number | null;
  arcTitle?: string | null;
  label?: string | null;
  position: number;
  expectedCurrentAssetId?: UUIDString | null;
  expectedSlotVersion?: Int64String | null;
  newSlotVersion: Int64String;
}

export interface AdminCompleteMediaCleanupData {
  mediaCleanupTask_update?: MediaCleanupTask_Key | null;
  mediaAsset_update?: MediaAsset_Key | null;
}

export interface AdminCompleteMediaCleanupVariables {
  taskId: UUIDString;
  assetId: UUIDString;
}

export interface AdminCompleteMediaDeletionIntentData {
  completed?: number | null;
}

export interface AdminCompleteMediaDeletionIntentVariables {
  taskId: UUIDString;
  assetId: UUIDString;
  ownerUid: string;
  idempotencyKey: string;
  leaseOwner: string;
}

export interface AdminCompleteStoryDeletionJobData {
  storyDeletionStage_update?: StoryDeletionStage_Key | null;
  storyDeletionJob_update?: StoryDeletionJob_Key | null;
}

export interface AdminCompleteStoryDeletionJobVariables {
  jobId: UUIDString;
  leaseOwner: string;
}

export interface AdminConsumeImageGenerationQuotaData {
  consumed?: number | null;
}

export interface AdminConsumeImageGenerationQuotaVariables {
  ownerUid: string;
  idempotencyKey: string;
  now: TimestampString;
  nextReset: TimestampString;
}

export interface AdminDeleteOwnedGlossaryTermData {
  glossaryTerm_delete?: GlossaryTerm_Key | null;
  persistenceReceipt_insert: PersistenceReceipt_Key;
}

export interface AdminDeleteOwnedGlossaryTermVariables {
  ownerUid: string;
  termId: UUIDString;
  idempotencyKey: string;
}

export interface AdminDeleteOwnedStoryData {
  storyVersionGuard?: unknown | null;
  story_update?: Story_Key | null;
  storyDeletionJob_insert: StoryDeletionJob_Key;
  storyDeletionStage_insertMany: StoryDeletionStage_Key[];
  persistenceReceipt_insert: PersistenceReceipt_Key;
  storyChange_insert: StoryChange_Key;
}

export interface AdminDeleteOwnedStorySeedData {
  story_updateMany: number;
  storySeed_update?: StorySeed_Key | null;
  seedVersionRecorded?: number | null;
  persistenceReceipt_insert: PersistenceReceipt_Key;
}

export interface AdminDeleteOwnedStorySeedVariables {
  ownerUid: string;
  seedId: UUIDString;
  idempotencyKey: string;
}

export interface AdminDeleteOwnedStoryVariables {
  ownerUid: string;
  storyId: UUIDString;
  expectedSyncRevision?: string | null;
  newSyncRevision: string;
  newRevision: Int64String;
  idempotencyKey: string;
  deletionJobId: UUIDString;
}

export interface AdminDeleteStoryAsAdminData {
  storyVersionGuard?: unknown | null;
  story_update?: Story_Key | null;
  storyDeletionJob_insert: StoryDeletionJob_Key;
  storyDeletionStage_insertMany: StoryDeletionStage_Key[];
  persistenceReceipt_insert: PersistenceReceipt_Key;
  storyChange_insert: StoryChange_Key;
}

export interface AdminDeleteStoryAsAdminVariables {
  actorUid: string;
  ownerUid: string;
  storyId: UUIDString;
  expectedSyncRevision?: string | null;
  newSyncRevision: string;
  newRevision: Int64String;
  idempotencyKey: string;
  deletionJobId: UUIDString;
}

export interface AdminEnsureMediaDeletionIntentData {
  mediaSlot_deleteMany: number;
  mediaAttachment_updateMany: number;
  mediaAsset_update?: MediaAsset_Key | null;
  mediaDeletionIntent_upsert: MediaDeletionIntent_Key;
  mediaCleanupTask_upsert: MediaCleanupTask_Key;
}

export interface AdminEnsureMediaDeletionIntentVariables {
  taskId: UUIDString;
  ownerUid: string;
  assetId: UUIDString;
  storyId?: UUIDString | null;
  idempotencyKey: string;
  bucket: string;
  objectKey: string;
  reason: string;
}

export interface AdminFailMediaCleanupData {
  mediaCleanupTask_update?: MediaCleanupTask_Key | null;
}

export interface AdminFailMediaCleanupVariables {
  taskId: UUIDString;
  lastError: string;
  nextAttemptAt: TimestampString;
}

export interface AdminFailMediaDeletionIntentData {
  mediaCleanupTask_update?: MediaCleanupTask_Key | null;
  mediaDeletionIntent_update?: MediaDeletionIntent_Key | null;
}

export interface AdminFailMediaDeletionIntentVariables {
  taskId: UUIDString;
  ownerUid: string;
  idempotencyKey: string;
  leaseOwner: string;
  lastError: string;
  nextAttemptAt: TimestampString;
}

export interface AdminFailStoryDeletionJobData {
  storyDeletionStage_update?: StoryDeletionStage_Key | null;
  storyDeletionJob_update?: StoryDeletionJob_Key | null;
}

export interface AdminFailStoryDeletionJobVariables {
  jobId: UUIDString;
  leaseOwner: string;
  stage: StoryDeletionStageKind;
  lastError: string;
}

export interface AdminGetAdminOverviewData {
  actor?: {
    uid: string;
    role: AccountRole;
  } & UserAccount_Key;
  accounts: ({
    uid: string;
    email?: string | null;
    displayName?: string | null;
    role: AccountRole;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & UserAccount_Key)[];
  profiles: ({
    userUid: string;
    username?: string | null;
    subscriptionTier: SubscriptionTier;
    legacyQi?: Int64String | null;
    daoXp: Int64String;
    daoRank?: string | null;
    heavenlyQi: Int64String;
    sectQi: Int64String;
    demonicQi: Int64String;
    writingStreak: number;
    savedStoryCount: number;
    activePortraitAssetId?: UUIDString | null;
    imageGenerationCount: number;
    imageQuotaResetAt?: TimestampString | null;
    syncRevision?: string | null;
    revision: Int64String;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & UserProfile_Key)[];
  stories: ({
    id: UUIDString;
    ownerUid: string;
    legacyStoryId?: string | null;
    clientStoryId?: string | null;
    title: string;
    status: StoryStatus;
    syncRevision?: string | null;
    revision: Int64String;
    deletedAt?: TimestampString | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & Story_Key)[];
}

export interface AdminGetAdminOverviewVariables {
  actorUid: string;
  limit?: number | null;
}

export interface AdminGetImageQuotaConsumptionData {
  imageQuotaConsumption?: {
    ownerUid: string;
    idempotencyKey: string;
    imageGenerationCount: number;
    imageQuotaResetAt: TimestampString;
    consumedAt: TimestampString;
  } & ImageQuotaConsumption_Key;
}

export interface AdminGetImageQuotaConsumptionVariables {
  ownerUid: string;
  idempotencyKey: string;
}

export interface AdminGetMediaDeletionIntentData {
  mediaDeletionIntent?: {
    ownerUid: string;
    idempotencyKey: string;
    assetId: UUIDString;
    storyId?: UUIDString | null;
    reason: string;
    status: MediaDeletionIntentStatus;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    completedAt?: TimestampString | null;
    lastError?: string | null;
  } & MediaDeletionIntent_Key;
}

export interface AdminGetMediaDeletionIntentVariables {
  ownerUid: string;
  idempotencyKey: string;
}

export interface AdminGetMediaUploadReceiptData {
  mediaUploadReceipt?: {
    ownerUid: string;
    idempotencyKey: string;
    assetId: UUIDString;
    requestHash: string;
    status: string;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & MediaUploadReceipt_Key;
}

export interface AdminGetMediaUploadReceiptVariables {
  ownerUid: string;
  idempotencyKey: string;
}

export interface AdminGetOwnedChapterContentGraphData {
  chapter?: {
    id: UUIDString;
    storyId: UUIDString;
    arcId?: UUIDString | null;
    legacyChapterId?: string | null;
    clientChapterId?: string | null;
    chapterNumber: number;
    title: string;
    premise?: string | null;
    status: ChapterStatus;
    summary?: string | null;
    episodicSummary?: string | null;
    contentHash?: string | null;
    versionId?: string | null;
    syncRevision?: string | null;
    revision: Int64String;
    branchAnchor?: string | null;
    continuityWarnings?: string[] | null;
    continuitySoftNotes?: string[] | null;
    contractObjectiveFulfilled?: boolean | null;
    contractEvidence?: string | null;
    contractOpeningMatched?: boolean | null;
    embedding?: number[] | null;
    isSealed: boolean;
    sealedAt?: TimestampString | null;
    hasContinuityFaults: boolean;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    content?: {
      generatedContent: string;
      statsChangeMessage?: string | null;
      contextEngine?: string | null;
      contextRoute?: string | null;
      contextEstimatedTokens?: number | null;
      contextBudgetTokens?: number | null;
      contractObjective?: string | null;
      contractRequiredOpening?: string | null;
      handoffNextImmediateAction?: string | null;
      handoffEndLocation?: string | null;
      handoffEndTimeMarker?: string | null;
      handoffMainCharacterCondition?: string | null;
      handoffOpenTension?: string | null;
      revisionId?: string | null;
      syncRevision?: string | null;
      revision: Int64String;
      cuePayload?: unknown | null;
      contextManifest?: unknown | null;
      handoff?: unknown | null;
      contract?: unknown | null;
      updatedAt: TimestampString;
    };
    blocks: ({
      id: UUIDString;
      legacyBlockId?: string | null;
      position: number;
      blockType: string;
      text: string;
      speakerName?: string | null;
      speakerRole?: string | null;
      mode?: string | null;
      sceneType?: string | null;
      environment?: string[] | null;
      atmosphereCategory?: string | null;
      atmosphereTags?: string[] | null;
      theme?: string[] | null;
      motion?: string | null;
      emotion?: string | null;
      intensity?: number | null;
      tension?: number | null;
      danger?: number | null;
      mysticism?: number | null;
      audioSignature?: string | null;
      isArchived: boolean;
      music?: unknown | null;
      beastEvent?: unknown | null;
      systemEvent?: unknown | null;
      worldCard?: unknown | null;
      attributes: ({
        attributeKey: string;
        stringValue?: string | null;
        numberValue?: number | null;
        booleanValue?: boolean | null;
      })[];
      entityMentions: ({
        position: number;
        entityId?: UUIDString | null;
        name: string;
        entityType: string;
        mentionKind: string;
      })[];
    } & ChapterBlock_Key)[];
    translations: ({
      languageCode: string;
      title: string;
      content: string;
      translatedAt: TimestampString;
    })[];
    audioManifest?: {
      version: string;
      language: string;
      generatedAt: TimestampString;
      updatedAt: TimestampString;
    };
    voiceClips: ({
      id: UUIDString;
      blockId?: UUIDString | null;
      position: number;
      speakerVoice: string;
      assetId?: UUIDString | null;
      catalogId?: string | null;
      createdAt: TimestampString;
    } & ChapterVoiceClip_Key)[];
  } & Chapter_Key;
  fingerprints: ({
    id: UUIDString;
    chapterNumber: number;
    actionType: string;
    location?: string | null;
    outcome: string;
    participants: string[];
    createdAt: TimestampString;
  } & ChapterSceneFingerprint_Key)[];
  facts: ({
    id: UUIDString;
    chapterNumber: number;
    factKind: string;
    subjectKey?: string | null;
    factText: string;
    confidence?: number | null;
    isPinned: boolean;
    createdAt: TimestampString;
    newerSupersessions: ({
      olderFactId: UUIDString;
      createdAt: TimestampString;
    })[];
  } & ChapterFact_Key)[];
}

export interface AdminGetOwnedChapterContentGraphVariables {
  ownerUid: string;
  storyId: UUIDString;
  chapterId: UUIDString;
}

export interface AdminGetOwnedChapterScopeData {
  chapter?: {
    id: UUIDString;
    storyId: UUIDString;
  } & Chapter_Key;
}

export interface AdminGetOwnedChapterScopeVariables {
  ownerUid: string;
  chapterId: UUIDString;
}

export interface AdminGetOwnedEntityScopeData {
  codexEntity?: {
    id: UUIDString;
    storyId: UUIDString;
  } & CodexEntity_Key;
}

export interface AdminGetOwnedEntityScopeVariables {
  ownerUid: string;
  entityId: UUIDString;
}

export interface AdminGetOwnedGenerationJobScopeData {
  generationJob?: {
    id: UUIDString;
    ownerUid: string;
    storyId?: UUIDString | null;
  } & GenerationJob_Key;
}

export interface AdminGetOwnedGenerationJobScopeVariables {
  ownerUid: string;
  generationJobId: UUIDString;
}

export interface AdminGetOwnedMediaAssetData {
  mediaAsset?: {
    id: UUIDString;
    ownerUid: string;
    storyId?: UUIDString | null;
    generationJobId?: UUIDString | null;
    replacesAssetId?: UUIDString | null;
    assetType: MediaAssetType;
    purpose: string;
    visibility: MediaVisibility;
    status: MediaAssetStatus;
    bucket: string;
    objectKey: string;
    originalFilename?: string | null;
    mimeType: string;
    extension: string;
    byteSize: Int64String;
    checksumSha256: string;
    etag?: string | null;
    width?: number | null;
    height?: number | null;
    durationMs?: Int64String | null;
    version: number;
    cacheControl: string;
    failureCode?: string | null;
    failureMessage?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    readyAt?: TimestampString | null;
    archivedAt?: TimestampString | null;
    deletedAt?: TimestampString | null;
    cleanupAfter?: TimestampString | null;
  } & MediaAsset_Key;
}

export interface AdminGetOwnedMediaAssetVariables {
  ownerUid: string;
  id: UUIDString;
}

export interface AdminGetOwnedMediaReplacementScopeData {
  mediaAsset?: {
    id: UUIDString;
    currentAttachments: ({
      targetKind: string;
      targetKey: string;
      purpose: string;
      storyId?: UUIDString | null;
      chapterId?: UUIDString | null;
      entityId?: UUIDString | null;
    })[];
  } & MediaAsset_Key;
}

export interface AdminGetOwnedMediaReplacementScopeVariables {
  ownerUid: string;
  assetId: UUIDString;
}

export interface AdminGetOwnedMediaSlotData {
  mediaSlot?: {
    ownerUid: string;
    storyId?: UUIDString | null;
    chapterId?: UUIDString | null;
    entityId?: UUIDString | null;
    targetKind: string;
    targetKey: string;
    purpose: string;
    currentAssetId: UUIDString;
    version: Int64String;
    updatedAt: TimestampString;
    currentAsset: {
      id: UUIDString;
      assetType: MediaAssetType;
      purpose: string;
      status: MediaAssetStatus;
      bucket: string;
      objectKey: string;
      mimeType: string;
      byteSize: Int64String;
      checksumSha256: string;
      width?: number | null;
      height?: number | null;
      durationMs?: Int64String | null;
      version: number;
      readyAt?: TimestampString | null;
    } & MediaAsset_Key;
  } & MediaSlot_Key;
}

export interface AdminGetOwnedMediaSlotVariables {
  ownerUid: string;
  targetKind: string;
  targetKey: string;
  purpose: string;
}

export interface AdminGetOwnedPortraitAssetData {
  asset?: {
    id: UUIDString;
    ownerUid: string;
    storyId?: UUIDString | null;
    assetType: MediaAssetType;
    purpose: string;
    status: MediaAssetStatus;
    bucket: string;
    objectKey: string;
    originalFilename?: string | null;
    mimeType: string;
    extension: string;
    byteSize: Int64String;
    checksumSha256: string;
    etag?: string | null;
    width?: number | null;
    height?: number | null;
    version: number;
    readyAt?: TimestampString | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & MediaAsset_Key;
  portrait?: {
    assetId: UUIDString;
    userUid: string;
    prompt?: string | null;
    description?: string | null;
    daoRank?: string | null;
    daoXp?: Int64String | null;
    powerStage?: string | null;
    equippedInventoryItemId?: UUIDString | null;
    usedReferenceImage: boolean;
    frameId?: string | null;
    glowId?: string | null;
    bannerId?: string | null;
    effectIds?: string[] | null;
    active: boolean;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & UserPortrait_Key;
}

export interface AdminGetOwnedPortraitAssetVariables {
  ownerUid: string;
  assetId: UUIDString;
}

export interface AdminGetOwnedStorageQuotaReservationData {
  storageQuotaReservation?: {
    id: UUIDString;
    ownerUid: string;
    storyId?: UUIDString | null;
    assetId?: UUIDString | null;
    idempotencyKey: string;
    requestedBytes: Int64String;
    status: StorageQuotaReservationStatus;
    expiresAt: TimestampString;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    completedAt?: TimestampString | null;
  } & StorageQuotaReservation_Key;
}

export interface AdminGetOwnedStorageQuotaReservationVariables {
  ownerUid: string;
  idempotencyKey: string;
}

export interface AdminGetOwnedStoryGraphData {
  story?: {
    id: UUIDString;
    ownerUid: string;
    sourceSeedId?: UUIDString | null;
    parentStoryId?: UUIDString | null;
    legacyStoryId?: string | null;
    clientStoryId?: string | null;
    title: string;
    genre: string;
    mainCharacterName?: string | null;
    premise?: string | null;
    status: StoryStatus;
    visibility: StoryVisibility;
    currentChapterNumber: number;
    forkChapterNumber?: number | null;
    syncRevision?: string | null;
    revision: Int64String;
    schemaVersion: number;
    lastImageChapter?: number | null;
    evolutionReady: boolean;
    evolutionReason?: string | null;
    availableVisualUpdate: boolean;
    isEdited: boolean;
    conflictResolvedAt?: TimestampString | null;
    deletedAt?: TimestampString | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & Story_Key;
  members: ({
    storyId: UUIDString;
    userUid: string;
    role: StoryMemberRole;
    createdAt: TimestampString;
  } & StoryMember_Key)[];
  preferences: ({
    storyId: UUIDString;
    contextEngine?: string | null;
    hardcoreFateMode: boolean;
    fatePressure?: string | null;
    motionCoverActive: boolean;
    assignedRevealBackdropPolicy?: string | null;
    updatedAt: TimestampString;
  } & StoryPreference_Key)[];
  readerPreferences: ({
    storyId: UUIDString;
    userUid: string;
    fontSize?: string | null;
    fontFamily?: string | null;
    lineHeight?: string | null;
    paragraphSpacing?: string | null;
    lineHeightScale?: number | null;
    paragraphSpacingScale?: number | null;
    letterSpacing?: number | null;
    wordSpacing?: number | null;
    readingWidth?: number | null;
    textAlignment?: string | null;
    contextEngine?: string | null;
    themeOverride?: string | null;
    colorPaletteId?: string | null;
    highlightStyle?: string | null;
    updatedAt: TimestampString;
  } & StoryReaderPreference_Key)[];
  memoryStates: ({
    storyId: UUIDString;
    powerSystem?: string | null;
    currentPowerStage?: string | null;
    updatedAt: TimestampString;
  } & StoryMemoryState_Key)[];
  memoryWarnings: ({
    id: UUIDString;
    warning: string;
    resolvedAt?: TimestampString | null;
    createdAt: TimestampString;
  } & StoryMemoryWarning_Key)[];
  rules: ({
    id: UUIDString;
    ruleKey: string;
    ruleValue: string;
    isPinned: boolean;
    position: number;
    updatedAt: TimestampString;
  } & StoryRule_Key)[];
  revealBackdrops: ({
    entityStableKey: string;
    backdropAssetId: string;
    updatedAt: TimestampString;
  })[];
  arcs: ({
    id: UUIDString;
    arcNumber: number;
    title: string;
    summary?: string | null;
    episodicSummaries?: string[] | null;
    status: ArcStatus;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & StoryArc_Key)[];
  chapters: ({
    id: UUIDString;
    storyId: UUIDString;
    arcId?: UUIDString | null;
    legacyChapterId?: string | null;
    clientChapterId?: string | null;
    chapterNumber: number;
    title: string;
    premise?: string | null;
    status: ChapterStatus;
    summary?: string | null;
    episodicSummary?: string | null;
    contentHash?: string | null;
    versionId?: string | null;
    syncRevision?: string | null;
    revision: Int64String;
    branchAnchor?: string | null;
    continuityWarnings?: string[] | null;
    continuitySoftNotes?: string[] | null;
    contractObjectiveFulfilled?: boolean | null;
    contractEvidence?: string | null;
    contractOpeningMatched?: boolean | null;
    embedding?: number[] | null;
    isSealed: boolean;
    sealedAt?: TimestampString | null;
    hasContinuityFaults: boolean;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & Chapter_Key)[];
  codexEntities: ({
    id: UUIDString;
    stableKey: string;
    kind: CodexEntityKind;
    name: string;
    role?: string | null;
    description?: string | null;
    status?: string | null;
    relationshipToMainCharacter?: string | null;
    relevanceState: CodexRelevanceState;
    contextPriority?: number | null;
    authorContextNote?: string | null;
    firstAppearedChapter?: number | null;
    lastMajorInvolvementChapter?: number | null;
    currentRelevance?: string | null;
    toneMemory?: string | null;
    manifestationImportance?: string | null;
    isUserPinned: boolean;
    pendingEvolution: boolean;
    evolutionReady: boolean;
    evolutionReason?: string | null;
    availableVisualUpdate: boolean;
    lastImageChapter?: number | null;
    arcAccumulation?: string | null;
    sourceChapterNumber?: number | null;
    sourceBlockId?: string | null;
    provenanceCreatedBy?: string | null;
    provenanceConfidence?: number | null;
    lastMentionedChapter?: number | null;
    supersedesStableKey?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    aliases: ({
      alias: string;
      normalizedAlias: string;
      isCanonical: boolean;
    })[];
    attributes: ({
      attributeKey: string;
      stringValue?: string | null;
      numberValue?: number | null;
      booleanValue?: boolean | null;
      stringListValue?: string[] | null;
      jsonValue?: unknown | null;
      updatedAt: TimestampString;
    })[];
    progression: ({
      id: UUIDString;
      chapterNumber: number;
      fromMastery?: string | null;
      toMastery?: string | null;
      note?: string | null;
      createdAt: TimestampString;
    } & AbilityProgressionEvent_Key)[];
    threadLinks: ({
      threadId: UUIDString;
      createdAt: TimestampString;
    })[];
  } & CodexEntity_Key)[];
  codexRelationships: ({
    id: UUIDString;
    sourceEntityId?: UUIDString | null;
    targetEntityId?: UUIDString | null;
    sourceStableKey: string;
    targetStableKey: string;
    sourceName: string;
    targetName: string;
    relationshipKind: string;
    affinity?: number | null;
    threat?: number | null;
    description?: string | null;
    status?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & CodexRelationship_Key)[];
  plotThreads: ({
    id: UUIDString;
    stableKey?: string | null;
    description: string;
    status: PlotThreadStatus;
    originChapterNumber?: number | null;
    resolvedChapterNumber?: number | null;
    confidence?: number | null;
    isUserPinned: boolean;
    sourceChapterNumber?: number | null;
    sourceBlockId?: string | null;
    provenanceCreatedBy?: string | null;
    provenanceConfidence?: number | null;
    lastMentionedChapter?: number | null;
    supersedesStableKey?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & PlotThread_Key)[];
  karmaNodes: ({
    id: UUIDString;
    sourceEntityId?: UUIDString | null;
    targetEntityId?: UUIDString | null;
    sourceStableKey?: string | null;
    targetStableKey?: string | null;
    sourceName: string;
    targetName: string;
    description: string;
    severity: string;
    nodeType: string;
    status: string;
    createdAt: TimestampString;
    resolvedAt?: TimestampString | null;
  } & KarmaNode_Key)[];
  timelineEvents: ({
    id: UUIDString;
    chapterId?: UUIDString | null;
    chapterNumber?: number | null;
    title: string;
    description: string;
    eventType?: string | null;
    occurredAtLabel?: string | null;
    createdAt: TimestampString;
  } & TimelineEvent_Key)[];
  bookmarks: ({
    id: UUIDString;
    userUid: string;
    chapterId?: UUIDString | null;
    paragraphIndex: number;
    paragraphExcerpt: string;
    note?: string | null;
    createdAt: TimestampString;
  } & Bookmark_Key)[];
  readingProgresses: ({
    userUid: string;
    chapterNumber: number;
    anchorBlockId?: string | null;
    anchorText?: string | null;
    anchorOffset?: number | null;
    anchorParagraphIndex?: number | null;
    anchorContentSignature?: string | null;
    anchorIntraBlockRatio?: number | null;
    anchorSavedAt?: TimestampString | null;
    legacyScrollPosition?: number | null;
    anchor?: unknown | null;
    totalReadingTimeMs: Int64String;
    lastReadAt: TimestampString;
    updatedAt: TimestampString;
  })[];
  arcReadingProgresses: ({
    userUid: string;
    arcNumber: number;
    readingTimeMs: Int64String;
    updatedAt: TimestampString;
  })[];
  glossaryTerms: ({
    id: UUIDString;
    sourceText: string;
    targetText: string;
    targetLanguage: string;
    note?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & GlossaryTerm_Key)[];
  generationJobs: ({
    id: UUIDString;
    chapterId?: UUIDString | null;
    kind: GenerationJobKind;
    status: GenerationJobStatus;
    provider?: string | null;
    model?: string | null;
    inputHash?: string | null;
    idempotencyKey?: string | null;
    attemptCount: number;
    errorCode?: string | null;
    errorMessage?: string | null;
    startedAt?: TimestampString | null;
    completedAt?: TimestampString | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    events: ({
      id: UUIDString;
      eventType: string;
      message?: string | null;
      progress?: number | null;
      createdAt: TimestampString;
    } & GenerationEvent_Key)[];
  } & GenerationJob_Key)[];
  generationBatches: ({
    id: UUIDString;
    clientBatchId: string;
    status: string;
    currentChapterNumber?: number | null;
    failedChapterNumber?: number | null;
    errorMessage?: string | null;
    createdAt: TimestampString;
    completedAt?: TimestampString | null;
    updatedAt: TimestampString;
    items: ({
      chapterNumber: number;
      status: string;
      completedAt?: TimestampString | null;
      updatedAt: TimestampString;
    })[];
  } & ChapterGenerationBatch_Key)[];
  mediaSlots: ({
    targetKind: string;
    targetKey: string;
    purpose: string;
    chapterId?: UUIDString | null;
    entityId?: UUIDString | null;
    currentAssetId: UUIDString;
    version: Int64String;
    updatedAt: TimestampString;
  })[];
  mediaAttachments: ({
    id: UUIDString;
    assetId: UUIDString;
    chapterId?: UUIDString | null;
    entityId?: UUIDString | null;
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
    createdAt: TimestampString;
    endedAt?: TimestampString | null;
  } & MediaAttachment_Key)[];
  deletionJobs: ({
    id: UUIDString;
    idempotencyKey: string;
    status: StoryDeletionStatus;
    currentStage: StoryDeletionStageKind;
    leaseOwner?: string | null;
    leaseExpiresAt?: TimestampString | null;
    attemptCount: number;
    lastError?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    completedAt?: TimestampString | null;
    stages: ({
      stage: StoryDeletionStageKind;
      status: StoryDeletionStageStatus;
      attemptCount: number;
      lastError?: string | null;
      startedAt?: TimestampString | null;
      completedAt?: TimestampString | null;
      updatedAt: TimestampString;
    })[];
  } & StoryDeletionJob_Key)[];
}

export interface AdminGetOwnedStoryGraphVariables {
  ownerUid: string;
  storyId: UUIDString;
}

export interface AdminGetOwnedStoryScopeData {
  story?: {
    id: UUIDString;
    ownerUid: string;
  } & Story_Key;
}

export interface AdminGetOwnedStoryScopeVariables {
  ownerUid: string;
  storyId: UUIDString;
}

export interface AdminGetOwnedStorySeedGraphData {
  storySeed?: {
    id: UUIDString;
    ownerUid: string;
    legacySeedId?: string | null;
    clientSeedId?: string | null;
    title: string;
    schemaVersion: number;
    syncRevision?: string | null;
    revision: Int64String;
    deletedAt?: TimestampString | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    fields: ({
      section: string;
      fieldKey: string;
      position: number;
      stringValue?: string | null;
      numberValue?: number | null;
      booleanValue?: boolean | null;
    })[];
    entities: ({
      id: UUIDString;
      entityKind: string;
      clientEntityId: string;
      position: number;
      name: string;
      age?: string | null;
      skinTone?: string | null;
      eyeColor?: string | null;
      powerType?: string | null;
      rankLevel?: string | null;
      role?: string | null;
      powerLevel?: string | null;
      alignment?: string | null;
      connectionToMainCharacter?: string | null;
      description?: string | null;
      aliases: ({
        alias: string;
        normalizedAlias: string;
        position: number;
      })[];
    } & StorySeedEntity_Key)[];
  } & StorySeed_Key;
}

export interface AdminGetOwnedStorySeedGraphVariables {
  ownerUid: string;
  seedId: UUIDString;
}

export interface AdminGetPersistenceReceiptData {
  persistenceReceipt?: {
    ownerUid: string;
    idempotencyKey: string;
    operation: string;
    storyId?: UUIDString | null;
    chapterId?: UUIDString | null;
    seedId?: UUIDString | null;
    resultingSyncRevision?: string | null;
    resultingRevision?: Int64String | null;
    requestHash?: string | null;
    createdAt: TimestampString;
  } & PersistenceReceipt_Key;
}

export interface AdminGetPersistenceReceiptVariables {
  ownerUid: string;
  idempotencyKey: string;
}

export interface AdminGetStorageUsageReportData {
  totals?: unknown | null;
  byUser?: unknown[] | null;
  byStory?: unknown[] | null;
  byType?: unknown[] | null;
}

export interface AdminGetUserProfileGraphData {
  account?: {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    role: AccountRole;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & UserAccount_Key;
  profile?: {
    userUid: string;
    username?: string | null;
    displayNameColor?: string | null;
    preferredLanguage?: string | null;
    defaultTranslationLanguage?: string | null;
    subscriptionTier: SubscriptionTier;
    legacyQi?: Int64String | null;
    daoXp: Int64String;
    daoRank?: string | null;
    heavenlyQi: Int64String;
    sectQi: Int64String;
    demonicQi: Int64String;
    writingStreak: number;
    savedStoryCount: number;
    activePortraitAssetId?: UUIDString | null;
    imageGenerationCount: number;
    imageQuotaResetAt?: TimestampString | null;
    lastSessionEnd?: TimestampString | null;
    daoPillarStreak: number;
    daoPillarCracked: boolean;
    lastReadDate?: string | null;
    lastInteractionDate?: string | null;
    equippedInventoryItemId?: UUIDString | null;
    syncRevision?: string | null;
    revision: Int64String;
    lastReadAt?: TimestampString | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & UserProfile_Key;
  preferences?: {
    userUid: string;
    fontSize?: string | null;
    fontFamily?: string | null;
    lineHeightScale?: number | null;
    paragraphSpacingScale?: number | null;
    letterSpacing?: number | null;
    wordSpacing?: number | null;
    readingWidth?: number | null;
    textAlignment?: string | null;
    contextEngine?: string | null;
    theme?: string | null;
    colorPaletteId?: string | null;
    highlightStyle?: string | null;
    audioMusicVolume?: number | null;
    audioAtmosphereVolume?: number | null;
    audioVoiceVolume?: number | null;
    updatedAt: TimestampString;
  } & UserPreference_Key;
  inventory: ({
    id: UUIDString;
    clientItemId?: string | null;
    catalogItemId?: string | null;
    itemKind: string;
    name: string;
    description?: string | null;
    rarity?: string | null;
    status: string;
    sourceStoryId?: UUIDString | null;
    sourceStoryTitle?: string | null;
    sourceMilestone?: string | null;
    milestoneType?: string | null;
    imageAssetId?: UUIDString | null;
    attributeBoost?: string | null;
    statusEffectDefinition?: unknown | null;
    offeringWeekId?: string | null;
    gatheredAt?: TimestampString | null;
    rewardValueQi?: Int64String | null;
    rewardValueSectMerit?: Int64String | null;
    acquiredAt: TimestampString;
    updatedAt: TimestampString;
  } & UserInventoryItem_Key)[];
  activeEffects: ({
    id: UUIDString;
    clientEffectId?: string | null;
    sourceInventoryItemId?: UUIDString | null;
    name: string;
    effectType: string;
    description: string;
    durationMs: Int64String;
    scope: string;
    visual?: string | null;
    counterplay?: string | null;
    rewardHook?: string | null;
    qiMultiplier?: number | null;
    sectQiMultiplier?: number | null;
    appliedAt: TimestampString;
    expiresAt: TimestampString;
    progress?: number | null;
    targetProgress?: number | null;
    completedAt?: TimestampString | null;
    isUnlockedReward: boolean;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & UserStatusEffect_Key)[];
  progressEvents: ({
    id: UUIDString;
    eventType: string;
    amount: Int64String;
    sourceType?: string | null;
    sourceId?: string | null;
    idempotencyKey?: string | null;
    createdAt: TimestampString;
  } & UserProgressEvent_Key)[];
  portraits: ({
    assetId: UUIDString;
    prompt?: string | null;
    description?: string | null;
    daoRank?: string | null;
    daoXp?: Int64String | null;
    powerStage?: string | null;
    equippedInventoryItemId?: UUIDString | null;
    usedReferenceImage: boolean;
    frameId?: string | null;
    glowId?: string | null;
    bannerId?: string | null;
    effectIds?: string[] | null;
    active: boolean;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & UserPortrait_Key)[];
  storageUsage?: {
    hardLimitBytes: Int64String;
    usedBytes: Int64String;
    reservedBytes: Int64String;
    assetCount: Int64String;
    revision: Int64String;
    updatedAt: TimestampString;
  };
}

export interface AdminGetUserProfileGraphVariables {
  ownerUid: string;
}

export interface AdminListExpiredStoryTombstonesData {
  storyDeletionJobs: ({
    id: UUIDString;
    ownerUid: string;
    storyId: UUIDString;
    idempotencyKey: string;
    status: StoryDeletionStatus;
    currentStage: StoryDeletionStageKind;
    attemptCount: number;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    completedAt?: TimestampString | null;
  } & StoryDeletionJob_Key)[];
}

export interface AdminListExpiredStoryTombstonesVariables {
  completedBefore: TimestampString;
  limit?: number | null;
}

export interface AdminListMediaAssetsForStorageReportData {
  mediaAssets: ({
    id: UUIDString;
    ownerUid: string;
    storyId?: UUIDString | null;
    assetType: MediaAssetType;
    status: MediaAssetStatus;
    byteSize: Int64String;
    mimeType: string;
    objectKey: string;
    createdAt: TimestampString;
  } & MediaAsset_Key)[];
}

export interface AdminListMediaAssetsForStorageReportVariables {
  limit?: number | null;
  offset?: number | null;
}

export interface AdminListMediaCleanupTasksData {
  mediaCleanupTasks: ({
    id: UUIDString;
    assetId: UUIDString;
    ownerUid: string;
    bucket: string;
    objectKey: string;
    reason: string;
    idempotencyKey?: string | null;
    status: MediaCleanupStatus;
    attemptCount: number;
    lastError?: string | null;
    nextAttemptAt: TimestampString;
    leaseOwner?: string | null;
    leaseExpiresAt?: TimestampString | null;
    createdAt: TimestampString;
  } & MediaCleanupTask_Key)[];
}

export interface AdminListMediaCleanupTasksVariables {
  limit?: number | null;
}

export interface AdminListOwnedGlossaryTermsData {
  glossaryTerms: ({
    id: UUIDString;
    storyId: UUIDString;
    sourceText: string;
    targetText: string;
    targetLanguage: string;
    note?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & GlossaryTerm_Key)[];
}

export interface AdminListOwnedGlossaryTermsVariables {
  ownerUid: string;
  storyId: UUIDString;
  limit?: number | null;
}

export interface AdminListOwnedMediaSlotHistoryData {
  mediaAttachments: ({
    id: UUIDString;
    assetId: UUIDString;
    storyId?: UUIDString | null;
    chapterId?: UUIDString | null;
    entityId?: UUIDString | null;
    historyEntityType?: string | null;
    clientHistoryId?: string | null;
    promptUsed?: string | null;
    chapterNumber?: number | null;
    arcTitle?: string | null;
    label?: string | null;
    position: number;
    isCurrent: boolean;
    createdAt: TimestampString;
    endedAt?: TimestampString | null;
    asset: {
      id: UUIDString;
      assetType: MediaAssetType;
      purpose: string;
      status: MediaAssetStatus;
      bucket: string;
      objectKey: string;
      mimeType: string;
      byteSize: Int64String;
      checksumSha256: string;
      width?: number | null;
      height?: number | null;
      durationMs?: Int64String | null;
      version: number;
      readyAt?: TimestampString | null;
    } & MediaAsset_Key;
  } & MediaAttachment_Key)[];
}

export interface AdminListOwnedMediaSlotHistoryVariables {
  ownerUid: string;
  targetKind: string;
  targetKey: string;
  purpose: string;
  limit?: number | null;
}

export interface AdminListOwnedStoriesData {
  stories: ({
    id: UUIDString;
    ownerUid: string;
    sourceSeedId?: UUIDString | null;
    parentStoryId?: UUIDString | null;
    legacyStoryId?: string | null;
    clientStoryId?: string | null;
    title: string;
    genre: string;
    mainCharacterName?: string | null;
    premise?: string | null;
    status: StoryStatus;
    visibility: StoryVisibility;
    currentChapterNumber: number;
    forkChapterNumber?: number | null;
    syncRevision?: string | null;
    revision: Int64String;
    schemaVersion: number;
    lastImageChapter?: number | null;
    evolutionReady: boolean;
    evolutionReason?: string | null;
    availableVisualUpdate: boolean;
    isEdited: boolean;
    conflictResolvedAt?: TimestampString | null;
    deletedAt?: TimestampString | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & Story_Key)[];
}

export interface AdminListOwnedStoriesVariables {
  ownerUid: string;
  limit?: number | null;
  offset?: number | null;
}

export interface AdminListOwnedStoryChangesData {
  storyChanges: ({
    id: UUIDString;
    ownerUid: string;
    storyId: UUIDString;
    changeKind: StoryChangeKind;
    storyRevision: Int64String;
    syncRevision: string;
    idempotencyKey: string;
    changedAt: TimestampString;
  } & StoryChange_Key)[];
}

export interface AdminListOwnedStoryChangesVariables {
  ownerUid: string;
  changedAfter: TimestampString;
  limit?: number | null;
}

export interface AdminListOwnedStoryCoverSlotsData {
  coverSlots: ({
    ownerUid: string;
    storyId?: UUIDString | null;
    targetKey: string;
    currentAssetId: UUIDString;
    version: Int64String;
    updatedAt: TimestampString;
    currentAsset: {
      status: MediaAssetStatus;
      mimeType: string;
      checksumSha256: string;
      version: number;
    };
  })[];
}

export interface AdminListOwnedStoryCoverSlotsVariables {
  ownerUid: string;
  limit?: number | null;
  offset?: number | null;
}

export interface AdminListOwnedStorySeedsData {
  storySeeds: ({
    id: UUIDString;
    legacySeedId?: string | null;
    clientSeedId?: string | null;
    title: string;
    schemaVersion: number;
    syncRevision?: string | null;
    revision: Int64String;
    deletedAt?: TimestampString | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & StorySeed_Key)[];
}

export interface AdminListOwnedStorySeedsVariables {
  ownerUid: string;
  limit?: number | null;
  offset?: number | null;
}

export interface AdminListStaleMediaUploadsData {
  mediaAssets: ({
    id: UUIDString;
    ownerUid: string;
    storyId?: UUIDString | null;
    generationJobId?: UUIDString | null;
    replacesAssetId?: UUIDString | null;
    assetType: MediaAssetType;
    purpose: string;
    visibility: MediaVisibility;
    status: MediaAssetStatus;
    bucket: string;
    objectKey: string;
    originalFilename?: string | null;
    mimeType: string;
    extension: string;
    byteSize: Int64String;
    checksumSha256: string;
    etag?: string | null;
    width?: number | null;
    height?: number | null;
    durationMs?: Int64String | null;
    version: number;
    cacheControl: string;
    failureCode?: string | null;
    failureMessage?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    readyAt?: TimestampString | null;
    archivedAt?: TimestampString | null;
    deletedAt?: TimestampString | null;
    cleanupAfter?: TimestampString | null;
  } & MediaAsset_Key)[];
}

export interface AdminListStaleMediaUploadsVariables {
  staleBefore: TimestampString;
  limit?: number | null;
}

export interface AdminListStoryDeletionJobsData {
  storyDeletionJobs: ({
    id: UUIDString;
    ownerUid: string;
    storyId: UUIDString;
    idempotencyKey: string;
    status: StoryDeletionStatus;
    currentStage: StoryDeletionStageKind;
    leaseOwner?: string | null;
    leaseExpiresAt?: TimestampString | null;
    attemptCount: number;
    lastError?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & StoryDeletionJob_Key)[];
}

export interface AdminListStoryDeletionJobsVariables {
  limit?: number | null;
}

export interface AdminListStoryDeletionMediaCandidatesData {
  mediaAssets: ({
    id: UUIDString;
    ownerUid: string;
    storyId?: UUIDString | null;
    assetType: MediaAssetType;
    purpose: string;
    status: MediaAssetStatus;
    bucket: string;
    objectKey: string;
    byteSize: Int64String;
    checksumSha256: string;
    cleanupAfter?: TimestampString | null;
    attachments: ({
      id: UUIDString;
      storyId?: UUIDString | null;
      chapterId?: UUIDString | null;
      entityId?: UUIDString | null;
      targetKind: string;
      targetKey: string;
      purpose: string;
      isCurrent: boolean;
    } & MediaAttachment_Key)[];
  } & MediaAsset_Key)[];
}

export interface AdminListStoryDeletionMediaCandidatesVariables {
  ownerUid: string;
  storyId: UUIDString;
  limit?: number | null;
}

export interface AdminMarkMediaAssetFailedData {
  mediaAsset_update?: MediaAsset_Key | null;
  mediaUploadAttempt_updateMany: number;
}

export interface AdminMarkMediaAssetFailedVariables {
  id: UUIDString;
  ownerUid: string;
  failureCode: string;
  failureMessage: string;
}

export interface AdminMarkMediaAssetPendingCleanupData {
  mediaAsset_update?: MediaAsset_Key | null;
  mediaCleanupTask_insert: MediaCleanupTask_Key;
}

export interface AdminMarkMediaAssetPendingCleanupVariables {
  id: UUIDString;
  ownerUid: string;
  bucket: string;
  objectKey: string;
  reason: string;
  failureMessage?: string | null;
}

export interface AdminPurgeExpiredStoryTombstoneData {
  eligibleTombstone?: unknown | null;
  story_delete?: Story_Key | null;
}

export interface AdminPurgeExpiredStoryTombstoneVariables {
  jobId: UUIDString;
  storyId: UUIDString;
  completedBefore: TimestampString;
}

export interface AdminPurgeFoundationProbeData {
  foundationProbe_delete?: FoundationProbe_Key | null;
}

export interface AdminPurgeFoundationProbeVariables {
  id: UUIDString;
}

export interface AdminPurgeFoundationStoryData {
  story_delete?: Story_Key | null;
}

export interface AdminPurgeFoundationStoryVariables {
  id: UUIDString;
}

export interface AdminRecoverPendingUserPortraitsData {
  recovered?: number | null;
  persistenceReceipt_insert: PersistenceReceipt_Key;
}

export interface AdminRecoverPendingUserPortraitsVariables {
  ownerUid: string;
  idempotencyKey: string;
}

export interface AdminReleaseStorageQuotaReservationData {
  released?: number | null;
}

export interface AdminReleaseStorageQuotaReservationVariables {
  reservationId: UUIDString;
  ownerUid: string;
}

export interface AdminRequestMediaAssetDeletionData {
  mediaAsset_update?: MediaAsset_Key | null;
  mediaAttachment_updateMany: number;
  mediaCleanupTask_insert: MediaCleanupTask_Key;
}

export interface AdminRequestMediaAssetDeletionVariables {
  id: UUIDString;
  ownerUid: string;
  bucket: string;
  objectKey: string;
}

export interface AdminReserveMediaAssetData {
  userAccount_upsert: UserAccount_Key;
  mediaAsset_insert: MediaAsset_Key;
  mediaUploadAttempt_insert: MediaUploadAttempt_Key;
}

export interface AdminReserveMediaAssetIdempotentData {
  mediaAsset_insert: MediaAsset_Key;
  storageQuotaReservation_update?: StorageQuotaReservation_Key | null;
  mediaUploadAttempt_insert: MediaUploadAttempt_Key;
  mediaUploadReceipt_insert: MediaUploadReceipt_Key;
}

export interface AdminReserveMediaAssetIdempotentVariables {
  id: UUIDString;
  ownerUid: string;
  storyId?: UUIDString | null;
  generationJobId?: UUIDString | null;
  replacesAssetId?: UUIDString | null;
  quotaReservationId: UUIDString;
  idempotencyKey: string;
  requestHash: string;
  assetType: MediaAssetType;
  purpose: string;
  visibility: MediaVisibility;
  bucket: string;
  objectKey: string;
  originalFilename?: string | null;
  mimeType: string;
  extension: string;
  byteSize: Int64String;
  checksumSha256: string;
  width?: number | null;
  height?: number | null;
  durationMs?: Int64String | null;
  version: number;
  cacheControl: string;
  sourceKind: string;
}

export interface AdminReserveMediaAssetVariables {
  id: UUIDString;
  ownerUid: string;
  ownerEmail?: string | null;
  ownerDisplayName?: string | null;
  storyId?: UUIDString | null;
  generationJobId?: UUIDString | null;
  replacesAssetId?: UUIDString | null;
  assetType: MediaAssetType;
  purpose: string;
  visibility: MediaVisibility;
  bucket: string;
  objectKey: string;
  originalFilename?: string | null;
  mimeType: string;
  extension: string;
  byteSize: Int64String;
  checksumSha256: string;
  width?: number | null;
  height?: number | null;
  durationMs?: Int64String | null;
  version: number;
  cacheControl: string;
  sourceKind: string;
}

export interface AdminReserveStorageQuotaData {
  quota?: unknown | null;
  storageQuotaReservation_insert: StorageQuotaReservation_Key;
}

export interface AdminReserveStorageQuotaVariables {
  reservationId: UUIDString;
  ownerUid: string;
  storyId?: UUIDString | null;
  idempotencyKey: string;
  requestedBytes: Int64String;
  hardLimitBytes: Int64String;
  expiresAt: TimestampString;
}

export interface AdminSelectOwnedMediaSlotAssetData {
  mediaAttachment_updateMany: number;
  mediaAttachment_update?: MediaAttachment_Key | null;
  mediaSlot_update?: MediaSlot_Key | null;
}

export interface AdminSelectOwnedMediaSlotAssetVariables {
  assetId: UUIDString;
  ownerUid: string;
  storyId?: UUIDString | null;
  chapterId?: UUIDString | null;
  entityId?: UUIDString | null;
  targetKind: string;
  targetKey: string;
  purpose: string;
  attachmentId: UUIDString;
  expectedCurrentAssetId?: UUIDString | null;
  expectedSlotVersion?: Int64String | null;
  newSlotVersion: Int64String;
}

export interface AdminSelectUserPortraitData {
  profileVersionGuard?: unknown | null;
  userPortrait_updateMany: number;
  userPortrait_upsert: UserPortrait_Key;
  userProfile_update?: UserProfile_Key | null;
  persistenceReceipt_insert: PersistenceReceipt_Key;
}

export interface AdminSelectUserPortraitVariables {
  ownerUid: string;
  assetId: UUIDString;
  idempotencyKey: string;
  expectedActivePortraitAssetId?: UUIDString | null;
  expectedSyncRevision?: string | null;
  newSyncRevision: string;
  newRevision: Int64String;
  prompt?: string | null;
  description?: string | null;
  daoRank?: string | null;
  daoXp?: Int64String | null;
  powerStage?: string | null;
  equippedInventoryItemId?: UUIDString | null;
  usedReferenceImage: boolean;
  frameId?: string | null;
  glowId?: string | null;
  bannerId?: string | null;
  effectIds?: string[] | null;
}

export interface AdminUpdateAccountAccessData {
  userAccount_update?: UserAccount_Key | null;
  userProfile_update?: UserProfile_Key | null;
  persistenceReceipt_insert: PersistenceReceipt_Key;
}

export interface AdminUpdateAccountAccessVariables {
  actorUid: string;
  ownerUid: string;
  role: AccountRole;
  subscriptionTier: SubscriptionTier;
  idempotencyKey: string;
}

export interface ArcReadingProgress_Key {
  userUid: string;
  storyId: UUIDString;
  arcNumber: number;
  __typename?: 'ArcReadingProgress_Key';
}

export interface Bookmark_Key {
  id: UUIDString;
  __typename?: 'Bookmark_Key';
}

export interface ChapterAudioManifest_Key {
  chapterId: UUIDString;
  __typename?: 'ChapterAudioManifest_Key';
}

export interface ChapterBlockAttribute_Key {
  blockId: UUIDString;
  attributeKey: string;
  __typename?: 'ChapterBlockAttribute_Key';
}

export interface ChapterBlockEntityMention_Key {
  blockId: UUIDString;
  position: number;
  __typename?: 'ChapterBlockEntityMention_Key';
}

export interface ChapterBlock_Key {
  id: UUIDString;
  __typename?: 'ChapterBlock_Key';
}

export interface ChapterContent_Key {
  chapterId: UUIDString;
  __typename?: 'ChapterContent_Key';
}

export interface ChapterFactSupersession_Key {
  newerFactId: UUIDString;
  olderFactId: UUIDString;
  __typename?: 'ChapterFactSupersession_Key';
}

export interface ChapterFact_Key {
  id: UUIDString;
  __typename?: 'ChapterFact_Key';
}

export interface ChapterGenerationBatchItem_Key {
  batchId: UUIDString;
  chapterNumber: number;
  __typename?: 'ChapterGenerationBatchItem_Key';
}

export interface ChapterGenerationBatch_Key {
  id: UUIDString;
  __typename?: 'ChapterGenerationBatch_Key';
}

export interface ChapterSceneFingerprint_Key {
  id: UUIDString;
  __typename?: 'ChapterSceneFingerprint_Key';
}

export interface ChapterTranslation_Key {
  chapterId: UUIDString;
  languageCode: string;
  __typename?: 'ChapterTranslation_Key';
}

export interface ChapterVoiceClip_Key {
  id: UUIDString;
  __typename?: 'ChapterVoiceClip_Key';
}

export interface Chapter_Key {
  id: UUIDString;
  __typename?: 'Chapter_Key';
}

export interface CodexAlias_Key {
  entityId: UUIDString;
  normalizedAlias: string;
  __typename?: 'CodexAlias_Key';
}

export interface CodexEntityAttribute_Key {
  entityId: UUIDString;
  attributeKey: string;
  __typename?: 'CodexEntityAttribute_Key';
}

export interface CodexEntity_Key {
  id: UUIDString;
  __typename?: 'CodexEntity_Key';
}

export interface CodexRelationship_Key {
  id: UUIDString;
  __typename?: 'CodexRelationship_Key';
}

export interface CodexThreadLink_Key {
  entityId: UUIDString;
  threadId: UUIDString;
  __typename?: 'CodexThreadLink_Key';
}

export interface CreateFoundationProbeData {
  userAccount_upsert: UserAccount_Key;
  foundationProbe_insert: FoundationProbe_Key;
}

export interface CreateFoundationProbeVariables {
  label: string;
}

export interface CreateMyChapterData {
  chapter_insert: Chapter_Key;
}

export interface CreateMyChapterVariables {
  storyId: UUIDString;
  chapterNumber: number;
  title: string;
  premise?: string | null;
}

export interface CreateStoryWithFirstChapterData {
  userAccount_upsert: UserAccount_Key;
  story_insert: Story_Key;
  storyMember_insert: StoryMember_Key;
  chapter_insert: Chapter_Key;
}

export interface CreateStoryWithFirstChapterVariables {
  title: string;
  genre: string;
  mainCharacterName?: string | null;
  premise?: string | null;
  chapterTitle: string;
  chapterPremise?: string | null;
}

export interface DeleteMyFoundationProbeData {
  foundationProbe_delete?: FoundationProbe_Key | null;
}

export interface DeleteMyFoundationProbeVariables {
  id: UUIDString;
}

export interface FoundationProbe_Key {
  id: UUIDString;
  __typename?: 'FoundationProbe_Key';
}

export interface GenerationEvent_Key {
  id: UUIDString;
  __typename?: 'GenerationEvent_Key';
}

export interface GenerationJob_Key {
  id: UUIDString;
  __typename?: 'GenerationJob_Key';
}

export interface GetMyAccountData {
  userAccount?: {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    role: AccountRole;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & UserAccount_Key;
}

export interface GetMyChapterData {
  chapter?: {
    id: UUIDString;
    chapterNumber: number;
    title: string;
    premise?: string | null;
    status: ChapterStatus;
    summary?: string | null;
    contentHash?: string | null;
    versionId?: string | null;
    isSealed: boolean;
    content?: {
      generatedContent: string;
      statsChangeMessage?: string | null;
      contextEngine?: string | null;
      contractObjective?: string | null;
      contractRequiredOpening?: string | null;
      handoffNextImmediateAction?: string | null;
      handoffEndLocation?: string | null;
      handoffOpenTension?: string | null;
      revisionId?: string | null;
      syncRevision?: string | null;
      updatedAt: TimestampString;
    };
    blocks: ({
      id: UUIDString;
      legacyBlockId?: string | null;
      position: number;
      blockType: string;
      text: string;
      speakerName?: string | null;
      speakerRole?: string | null;
      sceneType?: string | null;
      environment?: string[] | null;
      atmosphereCategory?: string | null;
      atmosphereTags?: string[] | null;
      theme?: string[] | null;
      emotion?: string | null;
      intensity?: number | null;
    } & ChapterBlock_Key)[];
  } & Chapter_Key;
}

export interface GetMyChapterVariables {
  storyId: UUIDString;
  chapterNumber: number;
}

export interface GetMyCurrentMediaSlotData {
  mediaSlot?: {
    targetKind: string;
    targetKey: string;
    purpose: string;
    storyId?: UUIDString | null;
    chapterId?: UUIDString | null;
    entityId?: UUIDString | null;
    currentAssetId: UUIDString;
    version: Int64String;
    updatedAt: TimestampString;
    currentAsset: {
      id: UUIDString;
      assetType: MediaAssetType;
      status: MediaAssetStatus;
      mimeType: string;
      byteSize: Int64String;
      checksumSha256: string;
      width?: number | null;
      height?: number | null;
      durationMs?: Int64String | null;
      version: number;
      readyAt?: TimestampString | null;
    } & MediaAsset_Key;
  };
}

export interface GetMyCurrentMediaSlotVariables {
  targetKind: string;
  targetKey: string;
  purpose: string;
}

export interface GetMyFoundationProbeData {
  foundationProbe?: {
    id: UUIDString;
    label: string;
    createdAt: TimestampString;
  } & FoundationProbe_Key;
}

export interface GetMyFoundationProbeVariables {
  id: UUIDString;
}

export interface GetMyMediaAssetData {
  mediaAsset?: {
    id: UUIDString;
    storyId?: UUIDString | null;
    assetType: MediaAssetType;
    purpose: string;
    visibility: MediaVisibility;
    status: MediaAssetStatus;
    bucket: string;
    objectKey: string;
    originalFilename?: string | null;
    mimeType: string;
    extension: string;
    byteSize: Int64String;
    checksumSha256: string;
    etag?: string | null;
    width?: number | null;
    height?: number | null;
    durationMs?: Int64String | null;
    version: number;
    cacheControl: string;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    readyAt?: TimestampString | null;
  } & MediaAsset_Key;
}

export interface GetMyMediaAssetVariables {
  id: UUIDString;
}

export interface GetMyStoryData {
  story?: {
    id: UUIDString;
    legacyStoryId?: string | null;
    title: string;
    genre: string;
    mainCharacterName?: string | null;
    premise?: string | null;
    status: StoryStatus;
    visibility: StoryVisibility;
    currentChapterNumber: number;
    syncRevision?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    arcs: ({
      id: UUIDString;
      arcNumber: number;
      title: string;
      summary?: string | null;
      status: ArcStatus;
    } & StoryArc_Key)[];
    chapters: ({
      id: UUIDString;
      chapterNumber: number;
      title: string;
      premise?: string | null;
      status: ChapterStatus;
      summary?: string | null;
      contentHash?: string | null;
      versionId?: string | null;
      isSealed: boolean;
      updatedAt: TimestampString;
    } & Chapter_Key)[];
  } & Story_Key;
}

export interface GetMyStoryVariables {
  id: UUIDString;
}

export interface GlossaryTerm_Key {
  id: UUIDString;
  __typename?: 'GlossaryTerm_Key';
}

export interface ImageQuotaConsumption_Key {
  ownerUid: string;
  idempotencyKey: string;
  __typename?: 'ImageQuotaConsumption_Key';
}

export interface KarmaNode_Key {
  id: UUIDString;
  __typename?: 'KarmaNode_Key';
}

export interface ListMyFoundationProbesData {
  foundationProbes: ({
    id: UUIDString;
    label: string;
    createdAt: TimestampString;
  } & FoundationProbe_Key)[];
}

export interface ListMyMediaAssetsData {
  mediaAssets: ({
    id: UUIDString;
    storyId?: UUIDString | null;
    assetType: MediaAssetType;
    purpose: string;
    visibility: MediaVisibility;
    status: MediaAssetStatus;
    bucket: string;
    objectKey: string;
    mimeType: string;
    byteSize: Int64String;
    width?: number | null;
    height?: number | null;
    durationMs?: Int64String | null;
    createdAt: TimestampString;
    readyAt?: TimestampString | null;
    cleanupAfter?: TimestampString | null;
  } & MediaAsset_Key)[];
}

export interface ListMyMediaAssetsVariables {
  storyId?: UUIDString | null;
  status?: MediaAssetStatus | null;
  limit?: number | null;
}

export interface ListMyMediaSlotHistoryData {
  mediaAttachments: ({
    id: UUIDString;
    assetId: UUIDString;
    clientHistoryId?: string | null;
    promptUsed?: string | null;
    chapterNumber?: number | null;
    arcTitle?: string | null;
    label?: string | null;
    position: number;
    isCurrent: boolean;
    createdAt: TimestampString;
    endedAt?: TimestampString | null;
    asset: {
      assetType: MediaAssetType;
      status: MediaAssetStatus;
      mimeType: string;
      byteSize: Int64String;
      checksumSha256: string;
      width?: number | null;
      height?: number | null;
      durationMs?: Int64String | null;
      version: number;
      readyAt?: TimestampString | null;
    };
  } & MediaAttachment_Key)[];
}

export interface ListMyMediaSlotHistoryVariables {
  targetKind: string;
  targetKey: string;
  purpose: string;
  limit?: number | null;
}

export interface ListMyStoriesData {
  stories: ({
    id: UUIDString;
    legacyStoryId?: string | null;
    title: string;
    genre: string;
    mainCharacterName?: string | null;
    premise?: string | null;
    status: StoryStatus;
    visibility: StoryVisibility;
    currentChapterNumber: number;
    syncRevision?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & Story_Key)[];
}

export interface ListMyStoryChangesData {
  storyChanges: ({
    id: UUIDString;
    storyId: UUIDString;
    changeKind: StoryChangeKind;
    storyRevision: Int64String;
    syncRevision: string;
    idempotencyKey: string;
    changedAt: TimestampString;
  } & StoryChange_Key)[];
}

export interface ListMyStoryChangesVariables {
  changedAfter: TimestampString;
  limit?: number | null;
}

export interface MediaAsset_Key {
  id: UUIDString;
  __typename?: 'MediaAsset_Key';
}

export interface MediaAttachment_Key {
  id: UUIDString;
  __typename?: 'MediaAttachment_Key';
}

export interface MediaCatalogEntry_Key {
  catalogId: string;
  __typename?: 'MediaCatalogEntry_Key';
}

export interface MediaCleanupTask_Key {
  id: UUIDString;
  __typename?: 'MediaCleanupTask_Key';
}

export interface MediaDeletionIntent_Key {
  ownerUid: string;
  idempotencyKey: string;
  __typename?: 'MediaDeletionIntent_Key';
}

export interface MediaDerivative_Key {
  id: UUIDString;
  __typename?: 'MediaDerivative_Key';
}

export interface MediaSlot_Key {
  ownerUid: string;
  targetKind: string;
  targetKey: string;
  purpose: string;
  __typename?: 'MediaSlot_Key';
}

export interface MediaUploadAttempt_Key {
  id: UUIDString;
  __typename?: 'MediaUploadAttempt_Key';
}

export interface MediaUploadReceipt_Key {
  ownerUid: string;
  idempotencyKey: string;
  __typename?: 'MediaUploadReceipt_Key';
}

export interface PersistenceAggregateVersion_Key {
  ownerUid: string;
  aggregateKind: string;
  aggregateId: string;
  __typename?: 'PersistenceAggregateVersion_Key';
}

export interface PersistenceReceipt_Key {
  ownerUid: string;
  idempotencyKey: string;
  __typename?: 'PersistenceReceipt_Key';
}

export interface PlotThread_Key {
  id: UUIDString;
  __typename?: 'PlotThread_Key';
}

export interface ReadingProgress_Key {
  userUid: string;
  storyId: UUIDString;
  __typename?: 'ReadingProgress_Key';
}

export interface SoftDeleteMyStoryData {
  story_update?: Story_Key | null;
}

export interface SoftDeleteMyStoryVariables {
  id: UUIDString;
}

export interface StorageQuotaReservation_Key {
  id: UUIDString;
  __typename?: 'StorageQuotaReservation_Key';
}

export interface StoryArc_Key {
  id: UUIDString;
  __typename?: 'StoryArc_Key';
}

export interface StoryChange_Key {
  id: UUIDString;
  __typename?: 'StoryChange_Key';
}

export interface StoryDeletionJob_Key {
  id: UUIDString;
  __typename?: 'StoryDeletionJob_Key';
}

export interface StoryDeletionStage_Key {
  jobId: UUIDString;
  stage: StoryDeletionStageKind;
  __typename?: 'StoryDeletionStage_Key';
}

export interface StoryMember_Key {
  storyId: UUIDString;
  userUid: string;
  __typename?: 'StoryMember_Key';
}

export interface StoryMemoryState_Key {
  storyId: UUIDString;
  __typename?: 'StoryMemoryState_Key';
}

export interface StoryMemoryWarning_Key {
  id: UUIDString;
  __typename?: 'StoryMemoryWarning_Key';
}

export interface StoryPreference_Key {
  storyId: UUIDString;
  __typename?: 'StoryPreference_Key';
}

export interface StoryReaderPreference_Key {
  storyId: UUIDString;
  userUid: string;
  __typename?: 'StoryReaderPreference_Key';
}

export interface StoryRevealBackdrop_Key {
  storyId: UUIDString;
  entityStableKey: string;
  __typename?: 'StoryRevealBackdrop_Key';
}

export interface StoryRule_Key {
  id: UUIDString;
  __typename?: 'StoryRule_Key';
}

export interface StorySeedEntityAlias_Key {
  seedEntityId: UUIDString;
  normalizedAlias: string;
  __typename?: 'StorySeedEntityAlias_Key';
}

export interface StorySeedEntity_Key {
  id: UUIDString;
  __typename?: 'StorySeedEntity_Key';
}

export interface StorySeedField_Key {
  seedId: UUIDString;
  section: string;
  fieldKey: string;
  position: number;
  __typename?: 'StorySeedField_Key';
}

export interface StorySeed_Key {
  id: UUIDString;
  __typename?: 'StorySeed_Key';
}

export interface StoryStorageUsage_Key {
  storyId: UUIDString;
  __typename?: 'StoryStorageUsage_Key';
}

export interface Story_Key {
  id: UUIDString;
  __typename?: 'Story_Key';
}

export interface TimelineEvent_Key {
  id: UUIDString;
  __typename?: 'TimelineEvent_Key';
}

export interface UpsertMyAccountData {
  userAccount_upsert: UserAccount_Key;
}

export interface UserAccount_Key {
  uid: string;
  __typename?: 'UserAccount_Key';
}

export interface UserInventoryItem_Key {
  id: UUIDString;
  __typename?: 'UserInventoryItem_Key';
}

export interface UserPortrait_Key {
  assetId: UUIDString;
  __typename?: 'UserPortrait_Key';
}

export interface UserPreference_Key {
  userUid: string;
  __typename?: 'UserPreference_Key';
}

export interface UserProfile_Key {
  userUid: string;
  __typename?: 'UserProfile_Key';
}

export interface UserProgressEvent_Key {
  id: UUIDString;
  __typename?: 'UserProgressEvent_Key';
}

export interface UserStatusEffect_Key {
  id: UUIDString;
  __typename?: 'UserStatusEffect_Key';
}

export interface UserStorageUsage_Key {
  userUid: string;
  __typename?: 'UserStorageUsage_Key';
}

/** Generated Node Admin SDK operation action function for the 'UpsertMyAccount' Mutation. Allow users to execute without passing in DataConnect. */
export function upsertMyAccount(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<UpsertMyAccountData>>;
/** Generated Node Admin SDK operation action function for the 'UpsertMyAccount' Mutation. Allow users to pass in custom DataConnect instances. */
export function upsertMyAccount(options?: OperationOptions): Promise<ExecuteOperationResponse<UpsertMyAccountData>>;

/** Generated Node Admin SDK operation action function for the 'CreateFoundationProbe' Mutation. Allow users to execute without passing in DataConnect. */
export function createFoundationProbe(dc: DataConnect, vars: CreateFoundationProbeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateFoundationProbeData>>;
/** Generated Node Admin SDK operation action function for the 'CreateFoundationProbe' Mutation. Allow users to pass in custom DataConnect instances. */
export function createFoundationProbe(vars: CreateFoundationProbeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateFoundationProbeData>>;

/** Generated Node Admin SDK operation action function for the 'DeleteMyFoundationProbe' Mutation. Allow users to execute without passing in DataConnect. */
export function deleteMyFoundationProbe(dc: DataConnect, vars: DeleteMyFoundationProbeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteMyFoundationProbeData>>;
/** Generated Node Admin SDK operation action function for the 'DeleteMyFoundationProbe' Mutation. Allow users to pass in custom DataConnect instances. */
export function deleteMyFoundationProbe(vars: DeleteMyFoundationProbeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeleteMyFoundationProbeData>>;

/** Generated Node Admin SDK operation action function for the 'CreateStoryWithFirstChapter' Mutation. Allow users to execute without passing in DataConnect. */
export function createStoryWithFirstChapter(dc: DataConnect, vars: CreateStoryWithFirstChapterVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateStoryWithFirstChapterData>>;
/** Generated Node Admin SDK operation action function for the 'CreateStoryWithFirstChapter' Mutation. Allow users to pass in custom DataConnect instances. */
export function createStoryWithFirstChapter(vars: CreateStoryWithFirstChapterVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateStoryWithFirstChapterData>>;

/** Generated Node Admin SDK operation action function for the 'CreateMyChapter' Mutation. Allow users to execute without passing in DataConnect. */
export function createMyChapter(dc: DataConnect, vars: CreateMyChapterVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateMyChapterData>>;
/** Generated Node Admin SDK operation action function for the 'CreateMyChapter' Mutation. Allow users to pass in custom DataConnect instances. */
export function createMyChapter(vars: CreateMyChapterVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateMyChapterData>>;

/** Generated Node Admin SDK operation action function for the 'SoftDeleteMyStory' Mutation. Allow users to execute without passing in DataConnect. */
export function softDeleteMyStory(dc: DataConnect, vars: SoftDeleteMyStoryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SoftDeleteMyStoryData>>;
/** Generated Node Admin SDK operation action function for the 'SoftDeleteMyStory' Mutation. Allow users to pass in custom DataConnect instances. */
export function softDeleteMyStory(vars: SoftDeleteMyStoryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SoftDeleteMyStoryData>>;

/** Generated Node Admin SDK operation action function for the 'AdminPurgeFoundationProbe' Mutation. Allow users to execute without passing in DataConnect. */
export function adminPurgeFoundationProbe(dc: DataConnect, vars: AdminPurgeFoundationProbeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminPurgeFoundationProbeData>>;
/** Generated Node Admin SDK operation action function for the 'AdminPurgeFoundationProbe' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminPurgeFoundationProbe(vars: AdminPurgeFoundationProbeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminPurgeFoundationProbeData>>;

/** Generated Node Admin SDK operation action function for the 'AdminPurgeFoundationStory' Mutation. Allow users to execute without passing in DataConnect. */
export function adminPurgeFoundationStory(dc: DataConnect, vars: AdminPurgeFoundationStoryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminPurgeFoundationStoryData>>;
/** Generated Node Admin SDK operation action function for the 'AdminPurgeFoundationStory' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminPurgeFoundationStory(vars: AdminPurgeFoundationStoryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminPurgeFoundationStoryData>>;

/** Generated Node Admin SDK operation action function for the 'AdminReserveMediaAsset' Mutation. Allow users to execute without passing in DataConnect. */
export function adminReserveMediaAsset(dc: DataConnect, vars: AdminReserveMediaAssetVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminReserveMediaAssetData>>;
/** Generated Node Admin SDK operation action function for the 'AdminReserveMediaAsset' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminReserveMediaAsset(vars: AdminReserveMediaAssetVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminReserveMediaAssetData>>;

/** Generated Node Admin SDK operation action function for the 'AdminCommitMediaAssetReady' Mutation. Allow users to execute without passing in DataConnect. */
export function adminCommitMediaAssetReady(dc: DataConnect, vars: AdminCommitMediaAssetReadyVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminCommitMediaAssetReadyData>>;
/** Generated Node Admin SDK operation action function for the 'AdminCommitMediaAssetReady' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminCommitMediaAssetReady(vars: AdminCommitMediaAssetReadyVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminCommitMediaAssetReadyData>>;

/** Generated Node Admin SDK operation action function for the 'AdminCommitMediaAssetReplacement' Mutation. Allow users to execute without passing in DataConnect. */
export function adminCommitMediaAssetReplacement(dc: DataConnect, vars: AdminCommitMediaAssetReplacementVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminCommitMediaAssetReplacementData>>;
/** Generated Node Admin SDK operation action function for the 'AdminCommitMediaAssetReplacement' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminCommitMediaAssetReplacement(vars: AdminCommitMediaAssetReplacementVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminCommitMediaAssetReplacementData>>;

/** Generated Node Admin SDK operation action function for the 'AdminMarkMediaAssetFailed' Mutation. Allow users to execute without passing in DataConnect. */
export function adminMarkMediaAssetFailed(dc: DataConnect, vars: AdminMarkMediaAssetFailedVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminMarkMediaAssetFailedData>>;
/** Generated Node Admin SDK operation action function for the 'AdminMarkMediaAssetFailed' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminMarkMediaAssetFailed(vars: AdminMarkMediaAssetFailedVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminMarkMediaAssetFailedData>>;

/** Generated Node Admin SDK operation action function for the 'AdminMarkMediaAssetPendingCleanup' Mutation. Allow users to execute without passing in DataConnect. */
export function adminMarkMediaAssetPendingCleanup(dc: DataConnect, vars: AdminMarkMediaAssetPendingCleanupVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminMarkMediaAssetPendingCleanupData>>;
/** Generated Node Admin SDK operation action function for the 'AdminMarkMediaAssetPendingCleanup' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminMarkMediaAssetPendingCleanup(vars: AdminMarkMediaAssetPendingCleanupVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminMarkMediaAssetPendingCleanupData>>;

/** Generated Node Admin SDK operation action function for the 'AdminRequestMediaAssetDeletion' Mutation. Allow users to execute without passing in DataConnect. */
export function adminRequestMediaAssetDeletion(dc: DataConnect, vars: AdminRequestMediaAssetDeletionVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminRequestMediaAssetDeletionData>>;
/** Generated Node Admin SDK operation action function for the 'AdminRequestMediaAssetDeletion' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminRequestMediaAssetDeletion(vars: AdminRequestMediaAssetDeletionVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminRequestMediaAssetDeletionData>>;

/** Generated Node Admin SDK operation action function for the 'AdminCompleteMediaCleanup' Mutation. Allow users to execute without passing in DataConnect. */
export function adminCompleteMediaCleanup(dc: DataConnect, vars: AdminCompleteMediaCleanupVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminCompleteMediaCleanupData>>;
/** Generated Node Admin SDK operation action function for the 'AdminCompleteMediaCleanup' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminCompleteMediaCleanup(vars: AdminCompleteMediaCleanupVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminCompleteMediaCleanupData>>;

/** Generated Node Admin SDK operation action function for the 'AdminFailMediaCleanup' Mutation. Allow users to execute without passing in DataConnect. */
export function adminFailMediaCleanup(dc: DataConnect, vars: AdminFailMediaCleanupVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminFailMediaCleanupData>>;
/** Generated Node Admin SDK operation action function for the 'AdminFailMediaCleanup' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminFailMediaCleanup(vars: AdminFailMediaCleanupVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminFailMediaCleanupData>>;

/** Generated Node Admin SDK operation action function for the 'AdminDeleteOwnedStory' Mutation. Allow users to execute without passing in DataConnect. */
export function adminDeleteOwnedStory(dc: DataConnect, vars: AdminDeleteOwnedStoryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminDeleteOwnedStoryData>>;
/** Generated Node Admin SDK operation action function for the 'AdminDeleteOwnedStory' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminDeleteOwnedStory(vars: AdminDeleteOwnedStoryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminDeleteOwnedStoryData>>;

/** Generated Node Admin SDK operation action function for the 'AdminClaimStoryDeletionJob' Mutation. Allow users to execute without passing in DataConnect. */
export function adminClaimStoryDeletionJob(dc: DataConnect, vars: AdminClaimStoryDeletionJobVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminClaimStoryDeletionJobData>>;
/** Generated Node Admin SDK operation action function for the 'AdminClaimStoryDeletionJob' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminClaimStoryDeletionJob(vars: AdminClaimStoryDeletionJobVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminClaimStoryDeletionJobData>>;

/** Generated Node Admin SDK operation action function for the 'AdminFailStoryDeletionJob' Mutation. Allow users to execute without passing in DataConnect. */
export function adminFailStoryDeletionJob(dc: DataConnect, vars: AdminFailStoryDeletionJobVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminFailStoryDeletionJobData>>;
/** Generated Node Admin SDK operation action function for the 'AdminFailStoryDeletionJob' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminFailStoryDeletionJob(vars: AdminFailStoryDeletionJobVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminFailStoryDeletionJobData>>;

/** Generated Node Admin SDK operation action function for the 'AdminAdvanceStoryDeletionJob' Mutation. Allow users to execute without passing in DataConnect. */
export function adminAdvanceStoryDeletionJob(dc: DataConnect, vars: AdminAdvanceStoryDeletionJobVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminAdvanceStoryDeletionJobData>>;
/** Generated Node Admin SDK operation action function for the 'AdminAdvanceStoryDeletionJob' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminAdvanceStoryDeletionJob(vars: AdminAdvanceStoryDeletionJobVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminAdvanceStoryDeletionJobData>>;

/** Generated Node Admin SDK operation action function for the 'AdminCompleteStoryDeletionJob' Mutation. Allow users to execute without passing in DataConnect. */
export function adminCompleteStoryDeletionJob(dc: DataConnect, vars: AdminCompleteStoryDeletionJobVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminCompleteStoryDeletionJobData>>;
/** Generated Node Admin SDK operation action function for the 'AdminCompleteStoryDeletionJob' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminCompleteStoryDeletionJob(vars: AdminCompleteStoryDeletionJobVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminCompleteStoryDeletionJobData>>;

/** Generated Node Admin SDK operation action function for the 'AdminPurgeExpiredStoryTombstone' Mutation. Allow users to execute without passing in DataConnect. */
export function adminPurgeExpiredStoryTombstone(dc: DataConnect, vars: AdminPurgeExpiredStoryTombstoneVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminPurgeExpiredStoryTombstoneData>>;
/** Generated Node Admin SDK operation action function for the 'AdminPurgeExpiredStoryTombstone' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminPurgeExpiredStoryTombstone(vars: AdminPurgeExpiredStoryTombstoneVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminPurgeExpiredStoryTombstoneData>>;

/** Generated Node Admin SDK operation action function for the 'AdminReserveStorageQuota' Mutation. Allow users to execute without passing in DataConnect. */
export function adminReserveStorageQuota(dc: DataConnect, vars: AdminReserveStorageQuotaVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminReserveStorageQuotaData>>;
/** Generated Node Admin SDK operation action function for the 'AdminReserveStorageQuota' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminReserveStorageQuota(vars: AdminReserveStorageQuotaVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminReserveStorageQuotaData>>;

/** Generated Node Admin SDK operation action function for the 'AdminReleaseStorageQuotaReservation' Mutation. Allow users to execute without passing in DataConnect. */
export function adminReleaseStorageQuotaReservation(dc: DataConnect, vars: AdminReleaseStorageQuotaReservationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminReleaseStorageQuotaReservationData>>;
/** Generated Node Admin SDK operation action function for the 'AdminReleaseStorageQuotaReservation' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminReleaseStorageQuotaReservation(vars: AdminReleaseStorageQuotaReservationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminReleaseStorageQuotaReservationData>>;

/** Generated Node Admin SDK operation action function for the 'AdminReserveMediaAssetIdempotent' Mutation. Allow users to execute without passing in DataConnect. */
export function adminReserveMediaAssetIdempotent(dc: DataConnect, vars: AdminReserveMediaAssetIdempotentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminReserveMediaAssetIdempotentData>>;
/** Generated Node Admin SDK operation action function for the 'AdminReserveMediaAssetIdempotent' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminReserveMediaAssetIdempotent(vars: AdminReserveMediaAssetIdempotentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminReserveMediaAssetIdempotentData>>;

/** Generated Node Admin SDK operation action function for the 'AdminCommitMediaAssetToSlot' Mutation. Allow users to execute without passing in DataConnect. */
export function adminCommitMediaAssetToSlot(dc: DataConnect, vars: AdminCommitMediaAssetToSlotVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminCommitMediaAssetToSlotData>>;
/** Generated Node Admin SDK operation action function for the 'AdminCommitMediaAssetToSlot' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminCommitMediaAssetToSlot(vars: AdminCommitMediaAssetToSlotVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminCommitMediaAssetToSlotData>>;

/** Generated Node Admin SDK operation action function for the 'AdminSelectOwnedMediaSlotAsset' Mutation. Allow users to execute without passing in DataConnect. */
export function adminSelectOwnedMediaSlotAsset(dc: DataConnect, vars: AdminSelectOwnedMediaSlotAssetVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminSelectOwnedMediaSlotAssetData>>;
/** Generated Node Admin SDK operation action function for the 'AdminSelectOwnedMediaSlotAsset' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminSelectOwnedMediaSlotAsset(vars: AdminSelectOwnedMediaSlotAssetVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminSelectOwnedMediaSlotAssetData>>;

/** Generated Node Admin SDK operation action function for the 'AdminSelectUserPortrait' Mutation. Allow users to execute without passing in DataConnect. */
export function adminSelectUserPortrait(dc: DataConnect, vars: AdminSelectUserPortraitVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminSelectUserPortraitData>>;
/** Generated Node Admin SDK operation action function for the 'AdminSelectUserPortrait' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminSelectUserPortrait(vars: AdminSelectUserPortraitVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminSelectUserPortraitData>>;

/** Generated Node Admin SDK operation action function for the 'AdminEnsureMediaDeletionIntent' Mutation. Allow users to execute without passing in DataConnect. */
export function adminEnsureMediaDeletionIntent(dc: DataConnect, vars: AdminEnsureMediaDeletionIntentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminEnsureMediaDeletionIntentData>>;
/** Generated Node Admin SDK operation action function for the 'AdminEnsureMediaDeletionIntent' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminEnsureMediaDeletionIntent(vars: AdminEnsureMediaDeletionIntentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminEnsureMediaDeletionIntentData>>;

/** Generated Node Admin SDK operation action function for the 'AdminClaimMediaCleanupTask' Mutation. Allow users to execute without passing in DataConnect. */
export function adminClaimMediaCleanupTask(dc: DataConnect, vars: AdminClaimMediaCleanupTaskVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminClaimMediaCleanupTaskData>>;
/** Generated Node Admin SDK operation action function for the 'AdminClaimMediaCleanupTask' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminClaimMediaCleanupTask(vars: AdminClaimMediaCleanupTaskVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminClaimMediaCleanupTaskData>>;

/** Generated Node Admin SDK operation action function for the 'AdminCompleteMediaDeletionIntent' Mutation. Allow users to execute without passing in DataConnect. */
export function adminCompleteMediaDeletionIntent(dc: DataConnect, vars: AdminCompleteMediaDeletionIntentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminCompleteMediaDeletionIntentData>>;
/** Generated Node Admin SDK operation action function for the 'AdminCompleteMediaDeletionIntent' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminCompleteMediaDeletionIntent(vars: AdminCompleteMediaDeletionIntentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminCompleteMediaDeletionIntentData>>;

/** Generated Node Admin SDK operation action function for the 'AdminFailMediaDeletionIntent' Mutation. Allow users to execute without passing in DataConnect. */
export function adminFailMediaDeletionIntent(dc: DataConnect, vars: AdminFailMediaDeletionIntentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminFailMediaDeletionIntentData>>;
/** Generated Node Admin SDK operation action function for the 'AdminFailMediaDeletionIntent' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminFailMediaDeletionIntent(vars: AdminFailMediaDeletionIntentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminFailMediaDeletionIntentData>>;

/** Generated Node Admin SDK operation action function for the 'AdminDeleteOwnedStorySeed' Mutation. Allow users to execute without passing in DataConnect. */
export function adminDeleteOwnedStorySeed(dc: DataConnect, vars: AdminDeleteOwnedStorySeedVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminDeleteOwnedStorySeedData>>;
/** Generated Node Admin SDK operation action function for the 'AdminDeleteOwnedStorySeed' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminDeleteOwnedStorySeed(vars: AdminDeleteOwnedStorySeedVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminDeleteOwnedStorySeedData>>;

/** Generated Node Admin SDK operation action function for the 'AdminDeleteOwnedGlossaryTerm' Mutation. Allow users to execute without passing in DataConnect. */
export function adminDeleteOwnedGlossaryTerm(dc: DataConnect, vars: AdminDeleteOwnedGlossaryTermVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminDeleteOwnedGlossaryTermData>>;
/** Generated Node Admin SDK operation action function for the 'AdminDeleteOwnedGlossaryTerm' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminDeleteOwnedGlossaryTerm(vars: AdminDeleteOwnedGlossaryTermVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminDeleteOwnedGlossaryTermData>>;

/** Generated Node Admin SDK operation action function for the 'AdminConsumeImageGenerationQuota' Mutation. Allow users to execute without passing in DataConnect. */
export function adminConsumeImageGenerationQuota(dc: DataConnect, vars: AdminConsumeImageGenerationQuotaVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminConsumeImageGenerationQuotaData>>;
/** Generated Node Admin SDK operation action function for the 'AdminConsumeImageGenerationQuota' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminConsumeImageGenerationQuota(vars: AdminConsumeImageGenerationQuotaVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminConsumeImageGenerationQuotaData>>;

/** Generated Node Admin SDK operation action function for the 'AdminRecoverPendingUserPortraits' Mutation. Allow users to execute without passing in DataConnect. */
export function adminRecoverPendingUserPortraits(dc: DataConnect, vars: AdminRecoverPendingUserPortraitsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminRecoverPendingUserPortraitsData>>;
/** Generated Node Admin SDK operation action function for the 'AdminRecoverPendingUserPortraits' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminRecoverPendingUserPortraits(vars: AdminRecoverPendingUserPortraitsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminRecoverPendingUserPortraitsData>>;

/** Generated Node Admin SDK operation action function for the 'AdminUpdateAccountAccess' Mutation. Allow users to execute without passing in DataConnect. */
export function adminUpdateAccountAccess(dc: DataConnect, vars: AdminUpdateAccountAccessVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminUpdateAccountAccessData>>;
/** Generated Node Admin SDK operation action function for the 'AdminUpdateAccountAccess' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminUpdateAccountAccess(vars: AdminUpdateAccountAccessVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminUpdateAccountAccessData>>;

/** Generated Node Admin SDK operation action function for the 'AdminDeleteStoryAsAdmin' Mutation. Allow users to execute without passing in DataConnect. */
export function adminDeleteStoryAsAdmin(dc: DataConnect, vars: AdminDeleteStoryAsAdminVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminDeleteStoryAsAdminData>>;
/** Generated Node Admin SDK operation action function for the 'AdminDeleteStoryAsAdmin' Mutation. Allow users to pass in custom DataConnect instances. */
export function adminDeleteStoryAsAdmin(vars: AdminDeleteStoryAsAdminVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminDeleteStoryAsAdminData>>;

/** Generated Node Admin SDK operation action function for the 'GetMyAccount' Query. Allow users to execute without passing in DataConnect. */
export function getMyAccount(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<GetMyAccountData>>;
/** Generated Node Admin SDK operation action function for the 'GetMyAccount' Query. Allow users to pass in custom DataConnect instances. */
export function getMyAccount(options?: OperationOptions): Promise<ExecuteOperationResponse<GetMyAccountData>>;

/** Generated Node Admin SDK operation action function for the 'ListMyFoundationProbes' Query. Allow users to execute without passing in DataConnect. */
export function listMyFoundationProbes(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListMyFoundationProbesData>>;
/** Generated Node Admin SDK operation action function for the 'ListMyFoundationProbes' Query. Allow users to pass in custom DataConnect instances. */
export function listMyFoundationProbes(options?: OperationOptions): Promise<ExecuteOperationResponse<ListMyFoundationProbesData>>;

/** Generated Node Admin SDK operation action function for the 'GetMyFoundationProbe' Query. Allow users to execute without passing in DataConnect. */
export function getMyFoundationProbe(dc: DataConnect, vars: GetMyFoundationProbeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetMyFoundationProbeData>>;
/** Generated Node Admin SDK operation action function for the 'GetMyFoundationProbe' Query. Allow users to pass in custom DataConnect instances. */
export function getMyFoundationProbe(vars: GetMyFoundationProbeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetMyFoundationProbeData>>;

/** Generated Node Admin SDK operation action function for the 'ListMyStories' Query. Allow users to execute without passing in DataConnect. */
export function listMyStories(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListMyStoriesData>>;
/** Generated Node Admin SDK operation action function for the 'ListMyStories' Query. Allow users to pass in custom DataConnect instances. */
export function listMyStories(options?: OperationOptions): Promise<ExecuteOperationResponse<ListMyStoriesData>>;

/** Generated Node Admin SDK operation action function for the 'GetMyStory' Query. Allow users to execute without passing in DataConnect. */
export function getMyStory(dc: DataConnect, vars: GetMyStoryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetMyStoryData>>;
/** Generated Node Admin SDK operation action function for the 'GetMyStory' Query. Allow users to pass in custom DataConnect instances. */
export function getMyStory(vars: GetMyStoryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetMyStoryData>>;

/** Generated Node Admin SDK operation action function for the 'GetMyChapter' Query. Allow users to execute without passing in DataConnect. */
export function getMyChapter(dc: DataConnect, vars: GetMyChapterVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetMyChapterData>>;
/** Generated Node Admin SDK operation action function for the 'GetMyChapter' Query. Allow users to pass in custom DataConnect instances. */
export function getMyChapter(vars: GetMyChapterVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetMyChapterData>>;

/** Generated Node Admin SDK operation action function for the 'GetMyMediaAsset' Query. Allow users to execute without passing in DataConnect. */
export function getMyMediaAsset(dc: DataConnect, vars: GetMyMediaAssetVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetMyMediaAssetData>>;
/** Generated Node Admin SDK operation action function for the 'GetMyMediaAsset' Query. Allow users to pass in custom DataConnect instances. */
export function getMyMediaAsset(vars: GetMyMediaAssetVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetMyMediaAssetData>>;

/** Generated Node Admin SDK operation action function for the 'ListMyMediaAssets' Query. Allow users to execute without passing in DataConnect. */
export function listMyMediaAssets(dc: DataConnect, vars?: ListMyMediaAssetsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListMyMediaAssetsData>>;
/** Generated Node Admin SDK operation action function for the 'ListMyMediaAssets' Query. Allow users to pass in custom DataConnect instances. */
export function listMyMediaAssets(vars?: ListMyMediaAssetsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListMyMediaAssetsData>>;

/** Generated Node Admin SDK operation action function for the 'AdminGetOwnedMediaAsset' Query. Allow users to execute without passing in DataConnect. */
export function adminGetOwnedMediaAsset(dc: DataConnect, vars: AdminGetOwnedMediaAssetVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetOwnedMediaAssetData>>;
/** Generated Node Admin SDK operation action function for the 'AdminGetOwnedMediaAsset' Query. Allow users to pass in custom DataConnect instances. */
export function adminGetOwnedMediaAsset(vars: AdminGetOwnedMediaAssetVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetOwnedMediaAssetData>>;

/** Generated Node Admin SDK operation action function for the 'AdminGetOwnedStoryScope' Query. Allow users to execute without passing in DataConnect. */
export function adminGetOwnedStoryScope(dc: DataConnect, vars: AdminGetOwnedStoryScopeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetOwnedStoryScopeData>>;
/** Generated Node Admin SDK operation action function for the 'AdminGetOwnedStoryScope' Query. Allow users to pass in custom DataConnect instances. */
export function adminGetOwnedStoryScope(vars: AdminGetOwnedStoryScopeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetOwnedStoryScopeData>>;

/** Generated Node Admin SDK operation action function for the 'AdminGetOwnedChapterScope' Query. Allow users to execute without passing in DataConnect. */
export function adminGetOwnedChapterScope(dc: DataConnect, vars: AdminGetOwnedChapterScopeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetOwnedChapterScopeData>>;
/** Generated Node Admin SDK operation action function for the 'AdminGetOwnedChapterScope' Query. Allow users to pass in custom DataConnect instances. */
export function adminGetOwnedChapterScope(vars: AdminGetOwnedChapterScopeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetOwnedChapterScopeData>>;

/** Generated Node Admin SDK operation action function for the 'AdminGetOwnedEntityScope' Query. Allow users to execute without passing in DataConnect. */
export function adminGetOwnedEntityScope(dc: DataConnect, vars: AdminGetOwnedEntityScopeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetOwnedEntityScopeData>>;
/** Generated Node Admin SDK operation action function for the 'AdminGetOwnedEntityScope' Query. Allow users to pass in custom DataConnect instances. */
export function adminGetOwnedEntityScope(vars: AdminGetOwnedEntityScopeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetOwnedEntityScopeData>>;

/** Generated Node Admin SDK operation action function for the 'AdminGetOwnedGenerationJobScope' Query. Allow users to execute without passing in DataConnect. */
export function adminGetOwnedGenerationJobScope(dc: DataConnect, vars: AdminGetOwnedGenerationJobScopeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetOwnedGenerationJobScopeData>>;
/** Generated Node Admin SDK operation action function for the 'AdminGetOwnedGenerationJobScope' Query. Allow users to pass in custom DataConnect instances. */
export function adminGetOwnedGenerationJobScope(vars: AdminGetOwnedGenerationJobScopeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetOwnedGenerationJobScopeData>>;

/** Generated Node Admin SDK operation action function for the 'AdminGetOwnedMediaReplacementScope' Query. Allow users to execute without passing in DataConnect. */
export function adminGetOwnedMediaReplacementScope(dc: DataConnect, vars: AdminGetOwnedMediaReplacementScopeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetOwnedMediaReplacementScopeData>>;
/** Generated Node Admin SDK operation action function for the 'AdminGetOwnedMediaReplacementScope' Query. Allow users to pass in custom DataConnect instances. */
export function adminGetOwnedMediaReplacementScope(vars: AdminGetOwnedMediaReplacementScopeVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetOwnedMediaReplacementScopeData>>;

/** Generated Node Admin SDK operation action function for the 'AdminListStaleMediaUploads' Query. Allow users to execute without passing in DataConnect. */
export function adminListStaleMediaUploads(dc: DataConnect, vars: AdminListStaleMediaUploadsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminListStaleMediaUploadsData>>;
/** Generated Node Admin SDK operation action function for the 'AdminListStaleMediaUploads' Query. Allow users to pass in custom DataConnect instances. */
export function adminListStaleMediaUploads(vars: AdminListStaleMediaUploadsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminListStaleMediaUploadsData>>;

/** Generated Node Admin SDK operation action function for the 'AdminListMediaCleanupTasks' Query. Allow users to execute without passing in DataConnect. */
export function adminListMediaCleanupTasks(dc: DataConnect, vars?: AdminListMediaCleanupTasksVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminListMediaCleanupTasksData>>;
/** Generated Node Admin SDK operation action function for the 'AdminListMediaCleanupTasks' Query. Allow users to pass in custom DataConnect instances. */
export function adminListMediaCleanupTasks(vars?: AdminListMediaCleanupTasksVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminListMediaCleanupTasksData>>;

/** Generated Node Admin SDK operation action function for the 'AdminListMediaAssetsForStorageReport' Query. Allow users to execute without passing in DataConnect. */
export function adminListMediaAssetsForStorageReport(dc: DataConnect, vars?: AdminListMediaAssetsForStorageReportVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminListMediaAssetsForStorageReportData>>;
/** Generated Node Admin SDK operation action function for the 'AdminListMediaAssetsForStorageReport' Query. Allow users to pass in custom DataConnect instances. */
export function adminListMediaAssetsForStorageReport(vars?: AdminListMediaAssetsForStorageReportVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminListMediaAssetsForStorageReportData>>;

/** Generated Node Admin SDK operation action function for the 'ListMyStoryChanges' Query. Allow users to execute without passing in DataConnect. */
export function listMyStoryChanges(dc: DataConnect, vars: ListMyStoryChangesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListMyStoryChangesData>>;
/** Generated Node Admin SDK operation action function for the 'ListMyStoryChanges' Query. Allow users to pass in custom DataConnect instances. */
export function listMyStoryChanges(vars: ListMyStoryChangesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListMyStoryChangesData>>;

/** Generated Node Admin SDK operation action function for the 'GetMyCurrentMediaSlot' Query. Allow users to execute without passing in DataConnect. */
export function getMyCurrentMediaSlot(dc: DataConnect, vars: GetMyCurrentMediaSlotVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetMyCurrentMediaSlotData>>;
/** Generated Node Admin SDK operation action function for the 'GetMyCurrentMediaSlot' Query. Allow users to pass in custom DataConnect instances. */
export function getMyCurrentMediaSlot(vars: GetMyCurrentMediaSlotVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<GetMyCurrentMediaSlotData>>;

/** Generated Node Admin SDK operation action function for the 'ListMyMediaSlotHistory' Query. Allow users to execute without passing in DataConnect. */
export function listMyMediaSlotHistory(dc: DataConnect, vars: ListMyMediaSlotHistoryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListMyMediaSlotHistoryData>>;
/** Generated Node Admin SDK operation action function for the 'ListMyMediaSlotHistory' Query. Allow users to pass in custom DataConnect instances. */
export function listMyMediaSlotHistory(vars: ListMyMediaSlotHistoryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<ListMyMediaSlotHistoryData>>;

/** Generated Node Admin SDK operation action function for the 'AdminListOwnedStories' Query. Allow users to execute without passing in DataConnect. */
export function adminListOwnedStories(dc: DataConnect, vars: AdminListOwnedStoriesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminListOwnedStoriesData>>;
/** Generated Node Admin SDK operation action function for the 'AdminListOwnedStories' Query. Allow users to pass in custom DataConnect instances. */
export function adminListOwnedStories(vars: AdminListOwnedStoriesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminListOwnedStoriesData>>;

/** Generated Node Admin SDK operation action function for the 'AdminListOwnedStoryCoverSlots' Query. Allow users to execute without passing in DataConnect. */
export function adminListOwnedStoryCoverSlots(dc: DataConnect, vars: AdminListOwnedStoryCoverSlotsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminListOwnedStoryCoverSlotsData>>;
/** Generated Node Admin SDK operation action function for the 'AdminListOwnedStoryCoverSlots' Query. Allow users to pass in custom DataConnect instances. */
export function adminListOwnedStoryCoverSlots(vars: AdminListOwnedStoryCoverSlotsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminListOwnedStoryCoverSlotsData>>;

/** Generated Node Admin SDK operation action function for the 'AdminListOwnedStoryChanges' Query. Allow users to execute without passing in DataConnect. */
export function adminListOwnedStoryChanges(dc: DataConnect, vars: AdminListOwnedStoryChangesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminListOwnedStoryChangesData>>;
/** Generated Node Admin SDK operation action function for the 'AdminListOwnedStoryChanges' Query. Allow users to pass in custom DataConnect instances. */
export function adminListOwnedStoryChanges(vars: AdminListOwnedStoryChangesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminListOwnedStoryChangesData>>;

/** Generated Node Admin SDK operation action function for the 'AdminGetPersistenceReceipt' Query. Allow users to execute without passing in DataConnect. */
export function adminGetPersistenceReceipt(dc: DataConnect, vars: AdminGetPersistenceReceiptVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetPersistenceReceiptData>>;
/** Generated Node Admin SDK operation action function for the 'AdminGetPersistenceReceipt' Query. Allow users to pass in custom DataConnect instances. */
export function adminGetPersistenceReceipt(vars: AdminGetPersistenceReceiptVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetPersistenceReceiptData>>;

/** Generated Node Admin SDK operation action function for the 'AdminGetOwnedStoryGraph' Query. Allow users to execute without passing in DataConnect. */
export function adminGetOwnedStoryGraph(dc: DataConnect, vars: AdminGetOwnedStoryGraphVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetOwnedStoryGraphData>>;
/** Generated Node Admin SDK operation action function for the 'AdminGetOwnedStoryGraph' Query. Allow users to pass in custom DataConnect instances. */
export function adminGetOwnedStoryGraph(vars: AdminGetOwnedStoryGraphVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetOwnedStoryGraphData>>;

/** Generated Node Admin SDK operation action function for the 'AdminGetOwnedChapterContentGraph' Query. Allow users to execute without passing in DataConnect. */
export function adminGetOwnedChapterContentGraph(dc: DataConnect, vars: AdminGetOwnedChapterContentGraphVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetOwnedChapterContentGraphData>>;
/** Generated Node Admin SDK operation action function for the 'AdminGetOwnedChapterContentGraph' Query. Allow users to pass in custom DataConnect instances. */
export function adminGetOwnedChapterContentGraph(vars: AdminGetOwnedChapterContentGraphVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetOwnedChapterContentGraphData>>;

/** Generated Node Admin SDK operation action function for the 'AdminListOwnedStorySeeds' Query. Allow users to execute without passing in DataConnect. */
export function adminListOwnedStorySeeds(dc: DataConnect, vars: AdminListOwnedStorySeedsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminListOwnedStorySeedsData>>;
/** Generated Node Admin SDK operation action function for the 'AdminListOwnedStorySeeds' Query. Allow users to pass in custom DataConnect instances. */
export function adminListOwnedStorySeeds(vars: AdminListOwnedStorySeedsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminListOwnedStorySeedsData>>;

/** Generated Node Admin SDK operation action function for the 'AdminGetOwnedStorySeedGraph' Query. Allow users to execute without passing in DataConnect. */
export function adminGetOwnedStorySeedGraph(dc: DataConnect, vars: AdminGetOwnedStorySeedGraphVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetOwnedStorySeedGraphData>>;
/** Generated Node Admin SDK operation action function for the 'AdminGetOwnedStorySeedGraph' Query. Allow users to pass in custom DataConnect instances. */
export function adminGetOwnedStorySeedGraph(vars: AdminGetOwnedStorySeedGraphVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetOwnedStorySeedGraphData>>;

/** Generated Node Admin SDK operation action function for the 'AdminGetUserProfileGraph' Query. Allow users to execute without passing in DataConnect. */
export function adminGetUserProfileGraph(dc: DataConnect, vars: AdminGetUserProfileGraphVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetUserProfileGraphData>>;
/** Generated Node Admin SDK operation action function for the 'AdminGetUserProfileGraph' Query. Allow users to pass in custom DataConnect instances. */
export function adminGetUserProfileGraph(vars: AdminGetUserProfileGraphVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetUserProfileGraphData>>;

/** Generated Node Admin SDK operation action function for the 'AdminGetOwnedMediaSlot' Query. Allow users to execute without passing in DataConnect. */
export function adminGetOwnedMediaSlot(dc: DataConnect, vars: AdminGetOwnedMediaSlotVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetOwnedMediaSlotData>>;
/** Generated Node Admin SDK operation action function for the 'AdminGetOwnedMediaSlot' Query. Allow users to pass in custom DataConnect instances. */
export function adminGetOwnedMediaSlot(vars: AdminGetOwnedMediaSlotVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetOwnedMediaSlotData>>;

/** Generated Node Admin SDK operation action function for the 'AdminListOwnedMediaSlotHistory' Query. Allow users to execute without passing in DataConnect. */
export function adminListOwnedMediaSlotHistory(dc: DataConnect, vars: AdminListOwnedMediaSlotHistoryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminListOwnedMediaSlotHistoryData>>;
/** Generated Node Admin SDK operation action function for the 'AdminListOwnedMediaSlotHistory' Query. Allow users to pass in custom DataConnect instances. */
export function adminListOwnedMediaSlotHistory(vars: AdminListOwnedMediaSlotHistoryVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminListOwnedMediaSlotHistoryData>>;

/** Generated Node Admin SDK operation action function for the 'AdminGetMediaUploadReceipt' Query. Allow users to execute without passing in DataConnect. */
export function adminGetMediaUploadReceipt(dc: DataConnect, vars: AdminGetMediaUploadReceiptVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetMediaUploadReceiptData>>;
/** Generated Node Admin SDK operation action function for the 'AdminGetMediaUploadReceipt' Query. Allow users to pass in custom DataConnect instances. */
export function adminGetMediaUploadReceipt(vars: AdminGetMediaUploadReceiptVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetMediaUploadReceiptData>>;

/** Generated Node Admin SDK operation action function for the 'AdminGetOwnedStorageQuotaReservation' Query. Allow users to execute without passing in DataConnect. */
export function adminGetOwnedStorageQuotaReservation(dc: DataConnect, vars: AdminGetOwnedStorageQuotaReservationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetOwnedStorageQuotaReservationData>>;
/** Generated Node Admin SDK operation action function for the 'AdminGetOwnedStorageQuotaReservation' Query. Allow users to pass in custom DataConnect instances. */
export function adminGetOwnedStorageQuotaReservation(vars: AdminGetOwnedStorageQuotaReservationVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetOwnedStorageQuotaReservationData>>;

/** Generated Node Admin SDK operation action function for the 'AdminGetMediaDeletionIntent' Query. Allow users to execute without passing in DataConnect. */
export function adminGetMediaDeletionIntent(dc: DataConnect, vars: AdminGetMediaDeletionIntentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetMediaDeletionIntentData>>;
/** Generated Node Admin SDK operation action function for the 'AdminGetMediaDeletionIntent' Query. Allow users to pass in custom DataConnect instances. */
export function adminGetMediaDeletionIntent(vars: AdminGetMediaDeletionIntentVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetMediaDeletionIntentData>>;

/** Generated Node Admin SDK operation action function for the 'AdminListStoryDeletionMediaCandidates' Query. Allow users to execute without passing in DataConnect. */
export function adminListStoryDeletionMediaCandidates(dc: DataConnect, vars: AdminListStoryDeletionMediaCandidatesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminListStoryDeletionMediaCandidatesData>>;
/** Generated Node Admin SDK operation action function for the 'AdminListStoryDeletionMediaCandidates' Query. Allow users to pass in custom DataConnect instances. */
export function adminListStoryDeletionMediaCandidates(vars: AdminListStoryDeletionMediaCandidatesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminListStoryDeletionMediaCandidatesData>>;

/** Generated Node Admin SDK operation action function for the 'AdminListStoryDeletionJobs' Query. Allow users to execute without passing in DataConnect. */
export function adminListStoryDeletionJobs(dc: DataConnect, vars?: AdminListStoryDeletionJobsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminListStoryDeletionJobsData>>;
/** Generated Node Admin SDK operation action function for the 'AdminListStoryDeletionJobs' Query. Allow users to pass in custom DataConnect instances. */
export function adminListStoryDeletionJobs(vars?: AdminListStoryDeletionJobsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminListStoryDeletionJobsData>>;

/** Generated Node Admin SDK operation action function for the 'AdminListExpiredStoryTombstones' Query. Allow users to execute without passing in DataConnect. */
export function adminListExpiredStoryTombstones(dc: DataConnect, vars: AdminListExpiredStoryTombstonesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminListExpiredStoryTombstonesData>>;
/** Generated Node Admin SDK operation action function for the 'AdminListExpiredStoryTombstones' Query. Allow users to pass in custom DataConnect instances. */
export function adminListExpiredStoryTombstones(vars: AdminListExpiredStoryTombstonesVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminListExpiredStoryTombstonesData>>;

/** Generated Node Admin SDK operation action function for the 'AdminGetStorageUsageReport' Query. Allow users to execute without passing in DataConnect. */
export function adminGetStorageUsageReport(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetStorageUsageReportData>>;
/** Generated Node Admin SDK operation action function for the 'AdminGetStorageUsageReport' Query. Allow users to pass in custom DataConnect instances. */
export function adminGetStorageUsageReport(options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetStorageUsageReportData>>;

/** Generated Node Admin SDK operation action function for the 'AdminListOwnedGlossaryTerms' Query. Allow users to execute without passing in DataConnect. */
export function adminListOwnedGlossaryTerms(dc: DataConnect, vars: AdminListOwnedGlossaryTermsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminListOwnedGlossaryTermsData>>;
/** Generated Node Admin SDK operation action function for the 'AdminListOwnedGlossaryTerms' Query. Allow users to pass in custom DataConnect instances. */
export function adminListOwnedGlossaryTerms(vars: AdminListOwnedGlossaryTermsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminListOwnedGlossaryTermsData>>;

/** Generated Node Admin SDK operation action function for the 'AdminGetImageQuotaConsumption' Query. Allow users to execute without passing in DataConnect. */
export function adminGetImageQuotaConsumption(dc: DataConnect, vars: AdminGetImageQuotaConsumptionVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetImageQuotaConsumptionData>>;
/** Generated Node Admin SDK operation action function for the 'AdminGetImageQuotaConsumption' Query. Allow users to pass in custom DataConnect instances. */
export function adminGetImageQuotaConsumption(vars: AdminGetImageQuotaConsumptionVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetImageQuotaConsumptionData>>;

/** Generated Node Admin SDK operation action function for the 'AdminGetOwnedPortraitAsset' Query. Allow users to execute without passing in DataConnect. */
export function adminGetOwnedPortraitAsset(dc: DataConnect, vars: AdminGetOwnedPortraitAssetVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetOwnedPortraitAssetData>>;
/** Generated Node Admin SDK operation action function for the 'AdminGetOwnedPortraitAsset' Query. Allow users to pass in custom DataConnect instances. */
export function adminGetOwnedPortraitAsset(vars: AdminGetOwnedPortraitAssetVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetOwnedPortraitAssetData>>;

/** Generated Node Admin SDK operation action function for the 'AdminGetAdminOverview' Query. Allow users to execute without passing in DataConnect. */
export function adminGetAdminOverview(dc: DataConnect, vars: AdminGetAdminOverviewVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetAdminOverviewData>>;
/** Generated Node Admin SDK operation action function for the 'AdminGetAdminOverview' Query. Allow users to pass in custom DataConnect instances. */
export function adminGetAdminOverview(vars: AdminGetAdminOverviewVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AdminGetAdminOverviewData>>;

