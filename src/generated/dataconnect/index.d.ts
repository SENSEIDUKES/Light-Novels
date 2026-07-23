import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;


export enum AccountRole {
  USER = "USER",
  ADMIN = "ADMIN",
  OWNER = "OWNER",
};

export enum ArcStatus {
  PLANNED = "PLANNED",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  ARCHIVED = "ARCHIVED",
};

export enum ChapterStatus {
  LOCKED = "LOCKED",
  UNLOCKED = "UNLOCKED",
  GENERATING = "GENERATING",
  UNREAD = "UNREAD",
  READ = "READ",
  SEALED = "SEALED",
  FAILED = "FAILED",
  DELETED = "DELETED",
};

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
};

export enum CodexRelevanceState {
  ACTIVE = "ACTIVE",
  WARM = "WARM",
  DORMANT = "DORMANT",
  ARCHIVED = "ARCHIVED",
  REACTIVATED = "REACTIVATED",
};

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
};

export enum GenerationJobStatus {
  QUEUED = "QUEUED",
  RUNNING = "RUNNING",
  PAUSED = "PAUSED",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
};

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
};

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
};

export enum MediaCleanupStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
};

export enum MediaDeletionIntentStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
};

export enum MediaVisibility {
  PRIVATE = "PRIVATE",
  PUBLIC = "PUBLIC",
};

export enum PlotThreadStatus {
  ACTIVE = "ACTIVE",
  RESOLVED = "RESOLVED",
  ARCHIVED = "ARCHIVED",
};

export enum StorageQuotaReservationStatus {
  RESERVED = "RESERVED",
  COMMITTED = "COMMITTED",
  RELEASED = "RELEASED",
  EXPIRED = "EXPIRED",
};

export enum StoryChangeKind {
  UPSERTED = "UPSERTED",
  CHAPTER_UPDATED = "CHAPTER_UPDATED",
  PROFILE_UPDATED = "PROFILE_UPDATED",
  DELETED = "DELETED",
};

export enum StoryDeletionStageKind {
  TOMBSTONE = "TOMBSTONE",
  STRUCTURED_DATA = "STRUCTURED_DATA",
  MEDIA = "MEDIA",
  LOCAL_CACHE = "LOCAL_CACHE",
  FINALIZE = "FINALIZE",
};

export enum StoryDeletionStageStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
};

export enum StoryDeletionStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
};

export enum StoryMemberRole {
  OWNER = "OWNER",
  EDITOR = "EDITOR",
  READER = "READER",
};

export enum StoryStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  ARCHIVED = "ARCHIVED",
  DELETED = "DELETED",
};

export enum StoryVisibility {
  PRIVATE = "PRIVATE",
  SHARED = "SHARED",
  PUBLIC = "PUBLIC",
};

export enum SubscriptionTier {
  MORTAL = "MORTAL",
  OUTER_SECT = "OUTER_SECT",
  INNER_SECT = "INNER_SECT",
  SECT_MASTER = "SECT_MASTER",
  IMMORTAL = "IMMORTAL",
};



export interface AbilityProgressionEvent_Data {
  id?: UUIDString;
  abilityEntityId: UUIDString;
  chapterNumber: number;
  createdAt?: TimestampString;
  fromMastery?: string | null;
  note?: string | null;
  toMastery?: string | null;
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

export interface ArcReadingProgress_Data {
  userUid: string;
  storyId: UUIDString;
  arcNumber: number;
  readingTimeMs?: Int64String;
  updatedAt?: TimestampString;
}

export interface ArcReadingProgress_Key {
  userUid: string;
  storyId: UUIDString;
  arcNumber: number;
  __typename?: 'ArcReadingProgress_Key';
}

export interface Bookmark_Data {
  id?: UUIDString;
  chapterId?: UUIDString | null;
  storyId: UUIDString;
  userUid: string;
  createdAt?: TimestampString;
  note?: string | null;
  paragraphExcerpt: string;
  paragraphIndex: number;
}

export interface Bookmark_Key {
  id: UUIDString;
  __typename?: 'Bookmark_Key';
}

export interface ChapterAudioManifest_Data {
  chapterId: UUIDString;
  generatedAt: TimestampString;
  language: string;
  updatedAt?: TimestampString;
  version: string;
}

export interface ChapterAudioManifest_Key {
  chapterId: UUIDString;
  __typename?: 'ChapterAudioManifest_Key';
}

export interface ChapterBlockAttribute_Data {
  blockId: UUIDString;
  attributeKey: string;
  booleanValue?: boolean | null;
  numberValue?: number | null;
  stringValue?: string | null;
}

export interface ChapterBlockAttribute_Key {
  blockId: UUIDString;
  attributeKey: string;
  __typename?: 'ChapterBlockAttribute_Key';
}

export interface ChapterBlockEntityMention_Data {
  blockId: UUIDString;
  position: number;
  entityId?: UUIDString | null;
  entityType: string;
  mentionKind: string;
  name: string;
}

export interface ChapterBlockEntityMention_Key {
  blockId: UUIDString;
  position: number;
  __typename?: 'ChapterBlockEntityMention_Key';
}

export interface ChapterBlock_Data {
  id?: UUIDString;
  chapterId: UUIDString;
  atmosphereCategory?: string | null;
  atmosphereTags?: string[] | null;
  audioSignature?: string | null;
  beastEvent?: unknown | null;
  blockType: string;
  danger?: number | null;
  emotion?: string | null;
  environment?: string[] | null;
  intensity?: number | null;
  isArchived?: boolean;
  legacyBlockId?: string | null;
  mode?: string | null;
  motion?: string | null;
  music?: unknown | null;
  mysticism?: number | null;
  position: number;
  sceneType?: string | null;
  speakerName?: string | null;
  speakerRole?: string | null;
  systemEvent?: unknown | null;
  tension?: number | null;
  text: string;
  theme?: string[] | null;
  worldCard?: unknown | null;
  chapterBlockAttributes_on_block?: Omit<ChapterBlockAttribute_Data, 'blockId'>[];
  chapterBlockEntityMentions_on_block?: Omit<ChapterBlockEntityMention_Data, 'blockId'>[];
  chapterVoiceClips_on_block?: Omit<ChapterVoiceClip_Data, 'blockId'>[];
}

export interface ChapterBlock_Key {
  id: UUIDString;
  __typename?: 'ChapterBlock_Key';
}

export interface ChapterContent_Data {
  chapterId: UUIDString;
  contextBudgetTokens?: number | null;
  contextEngine?: string | null;
  contextEstimatedTokens?: number | null;
  contextManifest?: unknown | null;
  contextRoute?: string | null;
  contract?: unknown | null;
  contractObjective?: string | null;
  contractRequiredOpening?: string | null;
  cuePayload?: unknown | null;
  generatedContent: string;
  handoff?: unknown | null;
  handoffEndLocation?: string | null;
  handoffEndTimeMarker?: string | null;
  handoffMainCharacterCondition?: string | null;
  handoffNextImmediateAction?: string | null;
  handoffOpenTension?: string | null;
  revision?: Int64String;
  revisionId?: string | null;
  statsChangeMessage?: string | null;
  syncRevision?: string | null;
  updatedAt?: TimestampString;
}

export interface ChapterContent_Key {
  chapterId: UUIDString;
  __typename?: 'ChapterContent_Key';
}

export interface ChapterFactSupersession_Data {
  newerFactId: UUIDString;
  olderFactId: UUIDString;
  createdAt?: TimestampString;
}

export interface ChapterFactSupersession_Key {
  newerFactId: UUIDString;
  olderFactId: UUIDString;
  __typename?: 'ChapterFactSupersession_Key';
}

export interface ChapterFact_Data {
  id?: UUIDString;
  chapterId?: UUIDString | null;
  storyId: UUIDString;
  chapterNumber: number;
  confidence?: number | null;
  createdAt?: TimestampString;
  factKind: string;
  factText: string;
  isPinned?: boolean;
  subjectKey?: string | null;
  chapterFactSupersessions_on_newerFact?: Omit<ChapterFactSupersession_Data, 'newerFactId'>[];
  chapterFactSupersessions_on_olderFact?: Omit<ChapterFactSupersession_Data, 'olderFactId'>[];
}

export interface ChapterFact_Key {
  id: UUIDString;
  __typename?: 'ChapterFact_Key';
}

export interface ChapterGenerationBatchItem_Data {
  batchId: UUIDString;
  chapterNumber: number;
  completedAt?: TimestampString | null;
  status: string;
  updatedAt?: TimestampString;
}

export interface ChapterGenerationBatchItem_Key {
  batchId: UUIDString;
  chapterNumber: number;
  __typename?: 'ChapterGenerationBatchItem_Key';
}

export interface ChapterGenerationBatch_Data {
  id?: UUIDString;
  storyId: UUIDString;
  clientBatchId: string;
  completedAt?: TimestampString | null;
  createdAt?: TimestampString;
  currentChapterNumber?: number | null;
  errorMessage?: string | null;
  failedChapterNumber?: number | null;
  status: string;
  updatedAt?: TimestampString;
  chapterGenerationBatchItems_on_batch?: Omit<ChapterGenerationBatchItem_Data, 'batchId'>[];
}

export interface ChapterGenerationBatch_Key {
  id: UUIDString;
  __typename?: 'ChapterGenerationBatch_Key';
}

export interface ChapterSceneFingerprint_Data {
  id?: UUIDString;
  chapterId: UUIDString;
  storyId: UUIDString;
  actionType: string;
  chapterNumber: number;
  createdAt?: TimestampString;
  location?: string | null;
  outcome: string;
  participants: string[];
}

export interface ChapterSceneFingerprint_Key {
  id: UUIDString;
  __typename?: 'ChapterSceneFingerprint_Key';
}

export interface ChapterTranslation_Data {
  chapterId: UUIDString;
  languageCode: string;
  content: string;
  title: string;
  translatedAt?: TimestampString;
}

export interface ChapterTranslation_Key {
  chapterId: UUIDString;
  languageCode: string;
  __typename?: 'ChapterTranslation_Key';
}

export interface ChapterVoiceClip_Data {
  id?: UUIDString;
  assetId?: UUIDString | null;
  blockId?: UUIDString | null;
  chapterId: UUIDString;
  catalogId?: string | null;
  createdAt?: TimestampString;
  position?: number;
  speakerVoice: string;
}

export interface ChapterVoiceClip_Key {
  id: UUIDString;
  __typename?: 'ChapterVoiceClip_Key';
}

export interface Chapter_Data {
  id?: UUIDString;
  arcId?: UUIDString | null;
  storyId: UUIDString;
  branchAnchor?: string | null;
  chapterNumber: number;
  clientChapterId?: string | null;
  contentHash?: string | null;
  continuitySoftNotes?: string[] | null;
  continuityWarnings?: string[] | null;
  contractEvidence?: string | null;
  contractObjectiveFulfilled?: boolean | null;
  contractOpeningMatched?: boolean | null;
  createdAt?: TimestampString;
  embedding?: number[] | null;
  episodicSummary?: string | null;
  hasContinuityFaults?: boolean;
  isSealed?: boolean;
  legacyChapterId?: string | null;
  premise?: string | null;
  revision?: Int64String;
  sealedAt?: TimestampString | null;
  status?: ChapterStatus;
  summary?: string | null;
  syncRevision?: string | null;
  title: string;
  updatedAt?: TimestampString;
  versionId?: string | null;
  bookmarks_on_chapter?: Omit<Bookmark_Data, 'chapterId'>[];
  chapterBlocks_on_chapter?: Omit<ChapterBlock_Data, 'chapterId'>[];
  chapterFacts_on_chapter?: Omit<ChapterFact_Data, 'chapterId'>[];
  chapterSceneFingerprints_on_chapter?: Omit<ChapterSceneFingerprint_Data, 'chapterId'>[];
  chapterTranslations_on_chapter?: Omit<ChapterTranslation_Data, 'chapterId'>[];
  chapterVoiceClips_on_chapter?: Omit<ChapterVoiceClip_Data, 'chapterId'>[];
  generationJobs_on_chapter?: Omit<GenerationJob_Data, 'chapterId'>[];
  mediaAttachments_on_chapter?: Omit<MediaAttachment_Data, 'chapterId'>[];
  mediaSlots_on_chapter?: Omit<MediaSlot_Data, 'chapterId'>[];
  persistenceReceipts_on_chapter?: Omit<PersistenceReceipt_Data, 'chapterId'>[];
  timelineEvents_on_chapter?: Omit<TimelineEvent_Data, 'chapterId'>[];
}

export interface Chapter_Key {
  id: UUIDString;
  __typename?: 'Chapter_Key';
}

export interface CodexAlias_Data {
  entityId: UUIDString;
  normalizedAlias: string;
  alias: string;
  isCanonical?: boolean;
}

export interface CodexAlias_Key {
  entityId: UUIDString;
  normalizedAlias: string;
  __typename?: 'CodexAlias_Key';
}

export interface CodexEntityAttribute_Data {
  entityId: UUIDString;
  attributeKey: string;
  booleanValue?: boolean | null;
  jsonValue?: unknown | null;
  numberValue?: number | null;
  stringListValue?: string[] | null;
  stringValue?: string | null;
  updatedAt?: TimestampString;
}

export interface CodexEntityAttribute_Key {
  entityId: UUIDString;
  attributeKey: string;
  __typename?: 'CodexEntityAttribute_Key';
}

export interface CodexEntity_Data {
  id?: UUIDString;
  storyId: UUIDString;
  arcAccumulation?: string | null;
  authorContextNote?: string | null;
  availableVisualUpdate?: boolean;
  contextPriority?: number | null;
  createdAt?: TimestampString;
  currentRelevance?: string | null;
  description?: string | null;
  evolutionReady?: boolean;
  evolutionReason?: string | null;
  firstAppearedChapter?: number | null;
  isUserPinned?: boolean;
  kind: CodexEntityKind;
  lastImageChapter?: number | null;
  lastMajorInvolvementChapter?: number | null;
  lastMentionedChapter?: number | null;
  manifestationImportance?: string | null;
  name: string;
  pendingEvolution?: boolean;
  provenanceConfidence?: number | null;
  provenanceCreatedBy?: string | null;
  relationshipToMainCharacter?: string | null;
  relevanceState?: CodexRelevanceState;
  role?: string | null;
  sourceBlockId?: string | null;
  sourceChapterNumber?: number | null;
  stableKey: string;
  status?: string | null;
  supersedesStableKey?: string | null;
  toneMemory?: string | null;
  updatedAt?: TimestampString;
  abilityProgressionEvents_on_abilityEntity?: Omit<AbilityProgressionEvent_Data, 'abilityEntityId'>[];
  chapterBlockEntityMentions_on_entity?: Omit<ChapterBlockEntityMention_Data, 'entityId'>[];
  codexAliases_on_entity?: Omit<CodexAlias_Data, 'entityId'>[];
  codexEntityAttributes_on_entity?: Omit<CodexEntityAttribute_Data, 'entityId'>[];
  codexRelationships_on_sourceEntity?: Omit<CodexRelationship_Data, 'sourceEntityId'>[];
  codexRelationships_on_targetEntity?: Omit<CodexRelationship_Data, 'targetEntityId'>[];
  codexThreadLinks_on_entity?: Omit<CodexThreadLink_Data, 'entityId'>[];
  karmaNodes_on_sourceEntity?: Omit<KarmaNode_Data, 'sourceEntityId'>[];
  karmaNodes_on_targetEntity?: Omit<KarmaNode_Data, 'targetEntityId'>[];
  mediaAttachments_on_entity?: Omit<MediaAttachment_Data, 'entityId'>[];
  mediaSlots_on_entity?: Omit<MediaSlot_Data, 'entityId'>[];
}

export interface CodexEntity_Key {
  id: UUIDString;
  __typename?: 'CodexEntity_Key';
}

export interface CodexRelationship_Data {
  id?: UUIDString;
  sourceEntityId?: UUIDString | null;
  storyId: UUIDString;
  targetEntityId?: UUIDString | null;
  affinity?: number | null;
  createdAt?: TimestampString;
  description?: string | null;
  relationshipKind: string;
  sourceName: string;
  sourceStableKey: string;
  status?: string | null;
  targetName: string;
  targetStableKey: string;
  threat?: number | null;
  updatedAt?: TimestampString;
}

export interface CodexRelationship_Key {
  id: UUIDString;
  __typename?: 'CodexRelationship_Key';
}

export interface CodexThreadLink_Data {
  entityId: UUIDString;
  threadId: UUIDString;
  createdAt?: TimestampString;
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

export interface GenerationEvent_Data {
  id?: UUIDString;
  jobId: UUIDString;
  createdAt?: TimestampString;
  eventType: string;
  message?: string | null;
  progress?: number | null;
}

export interface GenerationEvent_Key {
  id: UUIDString;
  __typename?: 'GenerationEvent_Key';
}

export interface GenerationJob_Data {
  id?: UUIDString;
  chapterId?: UUIDString | null;
  ownerUid: string;
  storyId?: UUIDString | null;
  attemptCount?: number;
  completedAt?: TimestampString | null;
  createdAt?: TimestampString;
  errorCode?: string | null;
  errorMessage?: string | null;
  idempotencyKey?: string | null;
  inputHash?: string | null;
  kind: GenerationJobKind;
  model?: string | null;
  provider?: string | null;
  startedAt?: TimestampString | null;
  status?: GenerationJobStatus;
  updatedAt?: TimestampString;
  generationEvents_on_job?: Omit<GenerationEvent_Data, 'jobId'>[];
  mediaAssets_on_generationJob?: Omit<MediaAsset_Data, 'generationJobId'>[];
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

export interface GlossaryTerm_Data {
  id?: UUIDString;
  storyId: UUIDString;
  createdAt?: TimestampString;
  note?: string | null;
  sourceText: string;
  targetLanguage: string;
  targetText: string;
  updatedAt?: TimestampString;
}

export interface GlossaryTerm_Key {
  id: UUIDString;
  __typename?: 'GlossaryTerm_Key';
}

export interface ImageQuotaConsumption_Data {
  ownerUid: string;
  idempotencyKey: string;
  consumedAt?: TimestampString;
  imageGenerationCount: number;
  imageQuotaResetAt: TimestampString;
}

export interface ImageQuotaConsumption_Key {
  ownerUid: string;
  idempotencyKey: string;
  __typename?: 'ImageQuotaConsumption_Key';
}

export interface KarmaNode_Data {
  id?: UUIDString;
  sourceEntityId?: UUIDString | null;
  storyId: UUIDString;
  targetEntityId?: UUIDString | null;
  createdAt?: TimestampString;
  description: string;
  nodeType: string;
  resolvedAt?: TimestampString | null;
  severity: string;
  sourceName: string;
  sourceStableKey?: string | null;
  status: string;
  targetName: string;
  targetStableKey?: string | null;
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

export interface MediaAsset_Data {
  id?: UUIDString;
  generationJobId?: UUIDString | null;
  ownerUid: string;
  replacesAssetId?: UUIDString | null;
  storyId?: UUIDString | null;
  archivedAt?: TimestampString | null;
  assetType: MediaAssetType;
  bucket: string;
  byteSize: Int64String;
  cacheControl: string;
  checksumSha256: string;
  cleanupAfter?: TimestampString | null;
  createdAt?: TimestampString;
  deletedAt?: TimestampString | null;
  durationMs?: Int64String | null;
  etag?: string | null;
  extension: string;
  failureCode?: string | null;
  failureMessage?: string | null;
  height?: number | null;
  mimeType: string;
  objectKey: string;
  originalFilename?: string | null;
  purpose: string;
  readyAt?: TimestampString | null;
  status?: MediaAssetStatus;
  updatedAt?: TimestampString;
  uploadOperationId?: string | null;
  version?: number;
  visibility?: MediaVisibility;
  width?: number | null;
  chapterVoiceClips_on_asset?: Omit<ChapterVoiceClip_Data, 'assetId'>[];
  mediaAssets_on_replacesAsset?: Omit<MediaAsset_Data, 'replacesAssetId'>[];
  mediaAttachments_on_asset?: Omit<MediaAttachment_Data, 'assetId'>[];
  mediaCleanupTasks_on_asset?: Omit<MediaCleanupTask_Data, 'assetId'>[];
  mediaDeletionIntents_on_asset?: Omit<MediaDeletionIntent_Data, 'assetId'>[];
  mediaDerivatives_on_derivedAsset?: Omit<MediaDerivative_Data, 'derivedAssetId'>[];
  mediaDerivatives_on_sourceAsset?: Omit<MediaDerivative_Data, 'sourceAssetId'>[];
  mediaSlots_on_currentAsset?: Omit<MediaSlot_Data, 'currentAssetId'>[];
  mediaUploadAttempts_on_asset?: Omit<MediaUploadAttempt_Data, 'assetId'>[];
  mediaUploadReceipts_on_asset?: Omit<MediaUploadReceipt_Data, 'assetId'>[];
  storageQuotaReservations_on_asset?: Omit<StorageQuotaReservation_Data, 'assetId'>[];
  userInventoryItems_on_imageAsset?: Omit<UserInventoryItem_Data, 'imageAssetId'>[];
  userProfiles_on_activePortrait?: Omit<UserProfile_Data, 'activePortraitAssetId'>[];
}

export interface MediaAsset_Key {
  id: UUIDString;
  __typename?: 'MediaAsset_Key';
}

export interface MediaAttachment_Data {
  id?: UUIDString;
  assetId: UUIDString;
  chapterId?: UUIDString | null;
  entityId?: UUIDString | null;
  storyId?: UUIDString | null;
  arcTitle?: string | null;
  chapterNumber?: number | null;
  clientHistoryId?: string | null;
  createdAt?: TimestampString;
  endedAt?: TimestampString | null;
  historyEntityType?: string | null;
  isCurrent?: boolean;
  label?: string | null;
  position?: number;
  promptUsed?: string | null;
  purpose: string;
  targetKey: string;
  targetKind: string;
}

export interface MediaAttachment_Key {
  id: UUIDString;
  __typename?: 'MediaAttachment_Key';
}

export interface MediaCatalogEntry_Key {
  catalogId: string;
  __typename?: 'MediaCatalogEntry_Key';
}

export interface MediaCleanupTask_Data {
  id?: UUIDString;
  assetId: UUIDString;
  attemptCount?: number;
  bucket: string;
  completedAt?: TimestampString | null;
  createdAt?: TimestampString;
  idempotencyKey?: string | null;
  lastError?: string | null;
  leaseExpiresAt?: TimestampString | null;
  leaseOwner?: string | null;
  nextAttemptAt?: TimestampString;
  objectKey: string;
  ownerUid: string;
  reason: string;
  status?: MediaCleanupStatus;
  updatedAt?: TimestampString;
}

export interface MediaCleanupTask_Key {
  id: UUIDString;
  __typename?: 'MediaCleanupTask_Key';
}

export interface MediaDeletionIntent_Data {
  ownerUid: string;
  idempotencyKey: string;
  assetId: UUIDString;
  storyId?: UUIDString | null;
  completedAt?: TimestampString | null;
  createdAt?: TimestampString;
  lastError?: string | null;
  reason: string;
  status?: MediaDeletionIntentStatus;
  updatedAt?: TimestampString;
}

export interface MediaDeletionIntent_Key {
  ownerUid: string;
  idempotencyKey: string;
  __typename?: 'MediaDeletionIntent_Key';
}

export interface MediaDerivative_Data {
  id?: UUIDString;
  derivedAssetId: UUIDString;
  sourceAssetId: UUIDString;
  createdAt?: TimestampString;
  variant: string;
}

export interface MediaDerivative_Key {
  id: UUIDString;
  __typename?: 'MediaDerivative_Key';
}

export interface MediaSlot_Data {
  ownerUid: string;
  targetKind: string;
  targetKey: string;
  purpose: string;
  chapterId?: UUIDString | null;
  currentAssetId: UUIDString;
  entityId?: UUIDString | null;
  storyId?: UUIDString | null;
  updatedAt?: TimestampString;
  version?: Int64String;
}

export interface MediaSlot_Key {
  ownerUid: string;
  targetKind: string;
  targetKey: string;
  purpose: string;
  __typename?: 'MediaSlot_Key';
}

export interface MediaUploadAttempt_Data {
  id?: UUIDString;
  assetId: UUIDString;
  attemptNumber: number;
  completedAt?: TimestampString | null;
  createdAt?: TimestampString;
  errorCode?: string | null;
  errorMessage?: string | null;
  provider?: string | null;
  sourceKind: string;
  startedAt?: TimestampString;
  status: string;
}

export interface MediaUploadAttempt_Key {
  id: UUIDString;
  __typename?: 'MediaUploadAttempt_Key';
}

export interface MediaUploadReceipt_Data {
  ownerUid: string;
  idempotencyKey: string;
  assetId: UUIDString;
  createdAt?: TimestampString;
  requestHash: string;
  status: string;
  updatedAt?: TimestampString;
}

export interface MediaUploadReceipt_Key {
  ownerUid: string;
  idempotencyKey: string;
  __typename?: 'MediaUploadReceipt_Key';
}

export interface PersistenceAggregateVersion_Data {
  ownerUid: string;
  aggregateKind: string;
  aggregateId: string;
  revision: Int64String;
  syncRevision?: string | null;
  updatedAt?: TimestampString;
}

export interface PersistenceAggregateVersion_Key {
  ownerUid: string;
  aggregateKind: string;
  aggregateId: string;
  __typename?: 'PersistenceAggregateVersion_Key';
}

export interface PersistenceReceipt_Data {
  ownerUid: string;
  idempotencyKey: string;
  chapterId?: UUIDString | null;
  seedId?: UUIDString | null;
  storyId?: UUIDString | null;
  createdAt?: TimestampString;
  operation: string;
  requestHash?: string | null;
  resultingRevision?: Int64String | null;
  resultingSyncRevision?: string | null;
}

export interface PersistenceReceipt_Key {
  ownerUid: string;
  idempotencyKey: string;
  __typename?: 'PersistenceReceipt_Key';
}

export interface PlotThread_Data {
  id?: UUIDString;
  storyId: UUIDString;
  confidence?: number | null;
  createdAt?: TimestampString;
  description: string;
  isUserPinned?: boolean;
  lastMentionedChapter?: number | null;
  originChapterNumber?: number | null;
  provenanceConfidence?: number | null;
  provenanceCreatedBy?: string | null;
  resolvedChapterNumber?: number | null;
  sourceBlockId?: string | null;
  sourceChapterNumber?: number | null;
  stableKey?: string | null;
  status?: PlotThreadStatus;
  supersedesStableKey?: string | null;
  updatedAt?: TimestampString;
  codexThreadLinks_on_thread?: Omit<CodexThreadLink_Data, 'threadId'>[];
}

export interface PlotThread_Key {
  id: UUIDString;
  __typename?: 'PlotThread_Key';
}

export interface ReadingProgress_Data {
  userUid: string;
  storyId: UUIDString;
  anchor?: unknown | null;
  anchorBlockId?: string | null;
  anchorContentSignature?: string | null;
  anchorIntraBlockRatio?: number | null;
  anchorOffset?: number | null;
  anchorParagraphIndex?: number | null;
  anchorSavedAt?: TimestampString | null;
  anchorText?: string | null;
  chapterNumber?: number;
  lastReadAt?: TimestampString;
  legacyScrollPosition?: number | null;
  totalReadingTimeMs?: Int64String;
  updatedAt?: TimestampString;
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

export interface StorageQuotaReservation_Data {
  id?: UUIDString;
  assetId?: UUIDString | null;
  ownerUid: string;
  storyId?: UUIDString | null;
  completedAt?: TimestampString | null;
  createdAt?: TimestampString;
  expiresAt: TimestampString;
  idempotencyKey: string;
  requestedBytes: Int64String;
  status?: StorageQuotaReservationStatus;
  updatedAt?: TimestampString;
}

export interface StorageQuotaReservation_Key {
  id: UUIDString;
  __typename?: 'StorageQuotaReservation_Key';
}

export interface StoryArc_Data {
  id?: UUIDString;
  storyId: UUIDString;
  arcNumber: number;
  createdAt?: TimestampString;
  episodicSummaries?: string[] | null;
  status?: ArcStatus;
  summary?: string | null;
  title: string;
  updatedAt?: TimestampString;
  chapters_on_arc?: Omit<Chapter_Data, 'arcId'>[];
}

export interface StoryArc_Key {
  id: UUIDString;
  __typename?: 'StoryArc_Key';
}

export interface StoryChange_Data {
  id?: UUIDString;
  ownerUid: string;
  storyId: UUIDString;
  changeKind: StoryChangeKind;
  changedAt?: TimestampString;
  idempotencyKey: string;
  storyRevision: Int64String;
  syncRevision: string;
}

export interface StoryChange_Key {
  id: UUIDString;
  __typename?: 'StoryChange_Key';
}

export interface StoryDeletionJob_Data {
  id?: UUIDString;
  ownerUid: string;
  storyId: UUIDString;
  attemptCount?: number;
  completedAt?: TimestampString | null;
  createdAt?: TimestampString;
  currentStage?: StoryDeletionStageKind;
  idempotencyKey: string;
  lastError?: string | null;
  leaseExpiresAt?: TimestampString | null;
  leaseOwner?: string | null;
  status?: StoryDeletionStatus;
  updatedAt?: TimestampString;
  storyDeletionStages_on_job?: Omit<StoryDeletionStage_Data, 'jobId'>[];
}

export interface StoryDeletionJob_Key {
  id: UUIDString;
  __typename?: 'StoryDeletionJob_Key';
}

export interface StoryDeletionStage_Data {
  jobId: UUIDString;
  stage: StoryDeletionStageKind;
  attemptCount?: number;
  completedAt?: TimestampString | null;
  lastError?: string | null;
  startedAt?: TimestampString | null;
  status?: StoryDeletionStageStatus;
  updatedAt?: TimestampString;
}

export interface StoryDeletionStage_Key {
  jobId: UUIDString;
  stage: StoryDeletionStageKind;
  __typename?: 'StoryDeletionStage_Key';
}

export interface StoryMember_Data {
  storyId: UUIDString;
  userUid: string;
  createdAt?: TimestampString;
  role: StoryMemberRole;
}

export interface StoryMember_Key {
  storyId: UUIDString;
  userUid: string;
  __typename?: 'StoryMember_Key';
}

export interface StoryMemoryState_Data {
  storyId: UUIDString;
  currentPowerStage?: string | null;
  powerSystem?: string | null;
  updatedAt?: TimestampString;
}

export interface StoryMemoryState_Key {
  storyId: UUIDString;
  __typename?: 'StoryMemoryState_Key';
}

export interface StoryMemoryWarning_Data {
  id?: UUIDString;
  storyId: UUIDString;
  createdAt?: TimestampString;
  resolvedAt?: TimestampString | null;
  warning: string;
}

export interface StoryMemoryWarning_Key {
  id: UUIDString;
  __typename?: 'StoryMemoryWarning_Key';
}

export interface StoryPreference_Data {
  storyId: UUIDString;
  assignedRevealBackdropPolicy?: string | null;
  contextEngine?: string | null;
  fatePressure?: string | null;
  hardcoreFateMode?: boolean;
  motionCoverActive?: boolean;
  updatedAt?: TimestampString;
}

export interface StoryPreference_Key {
  storyId: UUIDString;
  __typename?: 'StoryPreference_Key';
}

export interface StoryReaderPreference_Data {
  storyId: UUIDString;
  userUid: string;
  colorPaletteId?: string | null;
  contextEngine?: string | null;
  fontFamily?: string | null;
  fontSize?: string | null;
  highlightStyle?: string | null;
  letterSpacing?: number | null;
  lineHeight?: string | null;
  lineHeightScale?: number | null;
  paragraphSpacing?: string | null;
  paragraphSpacingScale?: number | null;
  readingWidth?: number | null;
  textAlignment?: string | null;
  themeOverride?: string | null;
  updatedAt?: TimestampString;
  wordSpacing?: number | null;
}

export interface StoryReaderPreference_Key {
  storyId: UUIDString;
  userUid: string;
  __typename?: 'StoryReaderPreference_Key';
}

export interface StoryRevealBackdrop_Data {
  storyId: UUIDString;
  entityStableKey: string;
  backdropAssetId: string;
  updatedAt?: TimestampString;
}

export interface StoryRevealBackdrop_Key {
  storyId: UUIDString;
  entityStableKey: string;
  __typename?: 'StoryRevealBackdrop_Key';
}

export interface StoryRule_Data {
  id?: UUIDString;
  storyId: UUIDString;
  isPinned?: boolean;
  position?: number;
  ruleKey: string;
  ruleValue: string;
  updatedAt?: TimestampString;
}

export interface StoryRule_Key {
  id: UUIDString;
  __typename?: 'StoryRule_Key';
}

export interface StorySeedEntityAlias_Data {
  seedEntityId: UUIDString;
  normalizedAlias: string;
  alias: string;
  position?: number;
}

export interface StorySeedEntityAlias_Key {
  seedEntityId: UUIDString;
  normalizedAlias: string;
  __typename?: 'StorySeedEntityAlias_Key';
}

export interface StorySeedEntity_Data {
  id?: UUIDString;
  seedId: UUIDString;
  age?: string | null;
  alignment?: string | null;
  clientEntityId: string;
  connectionToMainCharacter?: string | null;
  description?: string | null;
  entityKind: string;
  eyeColor?: string | null;
  name: string;
  position?: number;
  powerLevel?: string | null;
  powerType?: string | null;
  rankLevel?: string | null;
  role?: string | null;
  skinTone?: string | null;
  storySeedEntityAliases_on_seedEntity?: Omit<StorySeedEntityAlias_Data, 'seedEntityId'>[];
}

export interface StorySeedEntity_Key {
  id: UUIDString;
  __typename?: 'StorySeedEntity_Key';
}

export interface StorySeedField_Data {
  seedId: UUIDString;
  section: string;
  fieldKey: string;
  position?: number;
  booleanValue?: boolean | null;
  numberValue?: number | null;
  stringValue?: string | null;
}

export interface StorySeedField_Key {
  seedId: UUIDString;
  section: string;
  fieldKey: string;
  position: number;
  __typename?: 'StorySeedField_Key';
}

export interface StorySeed_Data {
  id?: UUIDString;
  ownerUid: string;
  clientSeedId?: string | null;
  createdAt?: TimestampString;
  deletedAt?: TimestampString | null;
  legacySeedId?: string | null;
  revision?: Int64String;
  schemaVersion?: number;
  syncRevision?: string | null;
  title: string;
  updatedAt?: TimestampString;
  persistenceReceipts_on_seed?: Omit<PersistenceReceipt_Data, 'seedId'>[];
  stories_on_sourceSeed?: Omit<Story_Data, 'sourceSeedId'>[];
  storySeedEntities_on_seed?: Omit<StorySeedEntity_Data, 'seedId'>[];
  storySeedFields_on_seed?: Omit<StorySeedField_Data, 'seedId'>[];
}

export interface StorySeed_Key {
  id: UUIDString;
  __typename?: 'StorySeed_Key';
}

export interface StoryStorageUsage_Key {
  storyId: UUIDString;
  __typename?: 'StoryStorageUsage_Key';
}

export interface Story_Data {
  id?: UUIDString;
  ownerUid: string;
  parentStoryId?: UUIDString | null;
  sourceSeedId?: UUIDString | null;
  availableVisualUpdate?: boolean;
  clientStoryId?: string | null;
  conflictResolvedAt?: TimestampString | null;
  createdAt?: TimestampString;
  currentChapterNumber?: number;
  deletedAt?: TimestampString | null;
  evolutionReady?: boolean;
  evolutionReason?: string | null;
  forkChapterNumber?: number | null;
  genre: string;
  isEdited?: boolean;
  lastImageChapter?: number | null;
  legacyStoryId?: string | null;
  mainCharacterName?: string | null;
  premise?: string | null;
  revision?: Int64String;
  schemaVersion?: number;
  status?: StoryStatus;
  syncRevision?: string | null;
  title: string;
  updatedAt?: TimestampString;
  visibility?: StoryVisibility;
  arcReadingProgresses_on_story?: Omit<ArcReadingProgress_Data, 'storyId'>[];
  bookmarks_on_story?: Omit<Bookmark_Data, 'storyId'>[];
  chapters_on_story?: Omit<Chapter_Data, 'storyId'>[];
  chapterFacts_on_story?: Omit<ChapterFact_Data, 'storyId'>[];
  chapterGenerationBatches_on_story?: Omit<ChapterGenerationBatch_Data, 'storyId'>[];
  chapterSceneFingerprints_on_story?: Omit<ChapterSceneFingerprint_Data, 'storyId'>[];
  codexEntities_on_story?: Omit<CodexEntity_Data, 'storyId'>[];
  codexRelationships_on_story?: Omit<CodexRelationship_Data, 'storyId'>[];
  generationJobs_on_story?: Omit<GenerationJob_Data, 'storyId'>[];
  glossaryTerms_on_story?: Omit<GlossaryTerm_Data, 'storyId'>[];
  karmaNodes_on_story?: Omit<KarmaNode_Data, 'storyId'>[];
  mediaAssets_on_story?: Omit<MediaAsset_Data, 'storyId'>[];
  mediaAttachments_on_story?: Omit<MediaAttachment_Data, 'storyId'>[];
  mediaDeletionIntents_on_story?: Omit<MediaDeletionIntent_Data, 'storyId'>[];
  mediaSlots_on_story?: Omit<MediaSlot_Data, 'storyId'>[];
  persistenceReceipts_on_story?: Omit<PersistenceReceipt_Data, 'storyId'>[];
  plotThreads_on_story?: Omit<PlotThread_Data, 'storyId'>[];
  readingProgresses_on_story?: Omit<ReadingProgress_Data, 'storyId'>[];
  storageQuotaReservations_on_story?: Omit<StorageQuotaReservation_Data, 'storyId'>[];
  stories_on_parentStory?: Omit<Story_Data, 'parentStoryId'>[];
  storyArcs_on_story?: Omit<StoryArc_Data, 'storyId'>[];
  storyChanges_on_story?: Omit<StoryChange_Data, 'storyId'>[];
  storyDeletionJobs_on_story?: Omit<StoryDeletionJob_Data, 'storyId'>[];
  storyMembers_on_story?: Omit<StoryMember_Data, 'storyId'>[];
  storyMemoryWarnings_on_story?: Omit<StoryMemoryWarning_Data, 'storyId'>[];
  storyReaderPreferences_on_story?: Omit<StoryReaderPreference_Data, 'storyId'>[];
  storyRevealBackdrops_on_story?: Omit<StoryRevealBackdrop_Data, 'storyId'>[];
  storyRules_on_story?: Omit<StoryRule_Data, 'storyId'>[];
  timelineEvents_on_story?: Omit<TimelineEvent_Data, 'storyId'>[];
}

export interface Story_Key {
  id: UUIDString;
  __typename?: 'Story_Key';
}

export interface TimelineEvent_Data {
  id?: UUIDString;
  chapterId?: UUIDString | null;
  storyId: UUIDString;
  chapterNumber?: number | null;
  createdAt?: TimestampString;
  description: string;
  eventType?: string | null;
  occurredAtLabel?: string | null;
  title: string;
}

export interface TimelineEvent_Key {
  id: UUIDString;
  __typename?: 'TimelineEvent_Key';
}

export interface UpsertMyAccountData {
  userAccount_upsert: UserAccount_Key;
}

export interface UserAccount_Data {
  uid: string;
  createdAt?: TimestampString;
  displayName?: string | null;
  email?: string | null;
  role?: AccountRole;
  updatedAt?: TimestampString;
  arcReadingProgresses_on_user?: Omit<ArcReadingProgress_Data, 'userUid'>[];
  bookmarks_on_user?: Omit<Bookmark_Data, 'userUid'>[];
  generationJobs_on_owner?: Omit<GenerationJob_Data, 'ownerUid'>[];
  imageQuotaConsumptions_on_owner?: Omit<ImageQuotaConsumption_Data, 'ownerUid'>[];
  mediaAssets_on_owner?: Omit<MediaAsset_Data, 'ownerUid'>[];
  mediaDeletionIntents_on_owner?: Omit<MediaDeletionIntent_Data, 'ownerUid'>[];
  mediaSlots_on_owner?: Omit<MediaSlot_Data, 'ownerUid'>[];
  mediaUploadReceipts_on_owner?: Omit<MediaUploadReceipt_Data, 'ownerUid'>[];
  persistenceAggregateVersions_on_owner?: Omit<PersistenceAggregateVersion_Data, 'ownerUid'>[];
  persistenceReceipts_on_owner?: Omit<PersistenceReceipt_Data, 'ownerUid'>[];
  readingProgresses_on_user?: Omit<ReadingProgress_Data, 'userUid'>[];
  storageQuotaReservations_on_owner?: Omit<StorageQuotaReservation_Data, 'ownerUid'>[];
  stories_on_owner?: Omit<Story_Data, 'ownerUid'>[];
  storyChanges_on_owner?: Omit<StoryChange_Data, 'ownerUid'>[];
  storyDeletionJobs_on_owner?: Omit<StoryDeletionJob_Data, 'ownerUid'>[];
  storyMembers_on_user?: Omit<StoryMember_Data, 'userUid'>[];
  storyReaderPreferences_on_user?: Omit<StoryReaderPreference_Data, 'userUid'>[];
  storySeeds_on_owner?: Omit<StorySeed_Data, 'ownerUid'>[];
  userInventoryItems_on_user?: Omit<UserInventoryItem_Data, 'userUid'>[];
  userPortraits_on_user?: Omit<UserPortrait_Data, 'userUid'>[];
  userProgressEvents_on_user?: Omit<UserProgressEvent_Data, 'userUid'>[];
  userStatusEffects_on_user?: Omit<UserStatusEffect_Data, 'userUid'>[];
}

export interface UserAccount_Key {
  uid: string;
  __typename?: 'UserAccount_Key';
}

export interface UserInventoryItem_Data {
  id?: UUIDString;
  imageAssetId?: UUIDString | null;
  userUid: string;
  acquiredAt?: TimestampString;
  attributeBoost?: string | null;
  catalogItemId?: string | null;
  clientItemId?: string | null;
  description?: string | null;
  gatheredAt?: TimestampString | null;
  itemKind: string;
  milestoneType?: string | null;
  name: string;
  offeringWeekId?: string | null;
  rarity?: string | null;
  rewardValueQi?: Int64String | null;
  rewardValueSectMerit?: Int64String | null;
  sourceMilestone?: string | null;
  sourceStoryId?: UUIDString | null;
  sourceStoryTitle?: string | null;
  status: string;
  statusEffectDefinition?: unknown | null;
  updatedAt?: TimestampString;
  userPortraits_on_equippedInventoryItem?: Omit<UserPortrait_Data, 'equippedInventoryItemId'>[];
  userProfiles_on_equippedInventoryItem?: Omit<UserProfile_Data, 'equippedInventoryItemId'>[];
  userStatusEffects_on_sourceInventoryItem?: Omit<UserStatusEffect_Data, 'sourceInventoryItemId'>[];
}

export interface UserInventoryItem_Key {
  id: UUIDString;
  __typename?: 'UserInventoryItem_Key';
}

export interface UserPortrait_Data {
  assetId: UUIDString;
  equippedInventoryItemId?: UUIDString | null;
  userUid: string;
  active?: boolean;
  bannerId?: string | null;
  createdAt?: TimestampString;
  daoRank?: string | null;
  daoXp?: Int64String | null;
  description?: string | null;
  effectIds?: string[] | null;
  frameId?: string | null;
  glowId?: string | null;
  powerStage?: string | null;
  prompt?: string | null;
  updatedAt?: TimestampString;
  usedReferenceImage?: boolean;
}

export interface UserPortrait_Key {
  assetId: UUIDString;
  __typename?: 'UserPortrait_Key';
}

export interface UserPreference_Data {
  userUid: string;
  audioAtmosphereVolume?: number | null;
  audioMusicVolume?: number | null;
  audioVoiceVolume?: number | null;
  colorPaletteId?: string | null;
  contextEngine?: string | null;
  fontFamily?: string | null;
  fontSize?: string | null;
  highlightStyle?: string | null;
  letterSpacing?: number | null;
  lineHeightScale?: number | null;
  paragraphSpacingScale?: number | null;
  readingWidth?: number | null;
  textAlignment?: string | null;
  theme?: string | null;
  updatedAt?: TimestampString;
  wordSpacing?: number | null;
}

export interface UserPreference_Key {
  userUid: string;
  __typename?: 'UserPreference_Key';
}

export interface UserProfile_Data {
  userUid: string;
  activePortraitAssetId?: UUIDString | null;
  equippedInventoryItemId?: UUIDString | null;
  createdAt?: TimestampString;
  daoPillarCracked?: boolean;
  daoPillarStreak?: number;
  daoRank?: string | null;
  daoXp?: Int64String;
  defaultTranslationLanguage?: string | null;
  demonicQi?: Int64String;
  displayNameColor?: string | null;
  heavenlyQi?: Int64String;
  imageGenerationCount?: number;
  imageQuotaResetAt?: TimestampString | null;
  lastInteractionDate?: string | null;
  lastReadAt?: TimestampString | null;
  lastReadDate?: string | null;
  lastSessionEnd?: TimestampString | null;
  legacyQi?: Int64String | null;
  preferredLanguage?: string | null;
  revision?: Int64String;
  savedStoryCount?: number;
  sectQi?: Int64String;
  subscriptionTier?: SubscriptionTier;
  syncRevision?: string | null;
  updatedAt?: TimestampString;
  username?: string | null;
  writingStreak?: number;
}

export interface UserProfile_Key {
  userUid: string;
  __typename?: 'UserProfile_Key';
}

export interface UserProgressEvent_Data {
  id?: UUIDString;
  userUid: string;
  amount?: Int64String;
  createdAt?: TimestampString;
  eventType: string;
  idempotencyKey?: string | null;
  sourceId?: string | null;
  sourceType?: string | null;
}

export interface UserProgressEvent_Key {
  id: UUIDString;
  __typename?: 'UserProgressEvent_Key';
}

export interface UserStatusEffect_Data {
  id?: UUIDString;
  sourceInventoryItemId?: UUIDString | null;
  userUid: string;
  appliedAt: TimestampString;
  clientEffectId?: string | null;
  completedAt?: TimestampString | null;
  counterplay?: string | null;
  createdAt?: TimestampString;
  description: string;
  durationMs: Int64String;
  effectType: string;
  expiresAt: TimestampString;
  isUnlockedReward?: boolean;
  name: string;
  progress?: number | null;
  qiMultiplier?: number | null;
  rewardHook?: string | null;
  scope: string;
  sectQiMultiplier?: number | null;
  targetProgress?: number | null;
  updatedAt?: TimestampString;
  visual?: string | null;
}

export interface UserStatusEffect_Key {
  id: UUIDString;
  __typename?: 'UserStatusEffect_Key';
}

export interface UserStorageUsage_Key {
  userUid: string;
  __typename?: 'UserStorageUsage_Key';
}

interface UpsertMyAccountRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<UpsertMyAccountData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<UpsertMyAccountData, undefined>;
  operationName: string;
}
export const upsertMyAccountRef: UpsertMyAccountRef;

export function upsertMyAccount(): MutationPromise<UpsertMyAccountData, undefined>;
export function upsertMyAccount(dc: DataConnect): MutationPromise<UpsertMyAccountData, undefined>;

interface CreateFoundationProbeRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateFoundationProbeVariables): MutationRef<CreateFoundationProbeData, CreateFoundationProbeVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateFoundationProbeVariables): MutationRef<CreateFoundationProbeData, CreateFoundationProbeVariables>;
  operationName: string;
}
export const createFoundationProbeRef: CreateFoundationProbeRef;

export function createFoundationProbe(vars: CreateFoundationProbeVariables): MutationPromise<CreateFoundationProbeData, CreateFoundationProbeVariables>;
export function createFoundationProbe(dc: DataConnect, vars: CreateFoundationProbeVariables): MutationPromise<CreateFoundationProbeData, CreateFoundationProbeVariables>;

interface DeleteMyFoundationProbeRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteMyFoundationProbeVariables): MutationRef<DeleteMyFoundationProbeData, DeleteMyFoundationProbeVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeleteMyFoundationProbeVariables): MutationRef<DeleteMyFoundationProbeData, DeleteMyFoundationProbeVariables>;
  operationName: string;
}
export const deleteMyFoundationProbeRef: DeleteMyFoundationProbeRef;

export function deleteMyFoundationProbe(vars: DeleteMyFoundationProbeVariables): MutationPromise<DeleteMyFoundationProbeData, DeleteMyFoundationProbeVariables>;
export function deleteMyFoundationProbe(dc: DataConnect, vars: DeleteMyFoundationProbeVariables): MutationPromise<DeleteMyFoundationProbeData, DeleteMyFoundationProbeVariables>;

interface CreateStoryWithFirstChapterRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateStoryWithFirstChapterVariables): MutationRef<CreateStoryWithFirstChapterData, CreateStoryWithFirstChapterVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateStoryWithFirstChapterVariables): MutationRef<CreateStoryWithFirstChapterData, CreateStoryWithFirstChapterVariables>;
  operationName: string;
}
export const createStoryWithFirstChapterRef: CreateStoryWithFirstChapterRef;

export function createStoryWithFirstChapter(vars: CreateStoryWithFirstChapterVariables): MutationPromise<CreateStoryWithFirstChapterData, CreateStoryWithFirstChapterVariables>;
export function createStoryWithFirstChapter(dc: DataConnect, vars: CreateStoryWithFirstChapterVariables): MutationPromise<CreateStoryWithFirstChapterData, CreateStoryWithFirstChapterVariables>;

interface CreateMyChapterRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateMyChapterVariables): MutationRef<CreateMyChapterData, CreateMyChapterVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateMyChapterVariables): MutationRef<CreateMyChapterData, CreateMyChapterVariables>;
  operationName: string;
}
export const createMyChapterRef: CreateMyChapterRef;

export function createMyChapter(vars: CreateMyChapterVariables): MutationPromise<CreateMyChapterData, CreateMyChapterVariables>;
export function createMyChapter(dc: DataConnect, vars: CreateMyChapterVariables): MutationPromise<CreateMyChapterData, CreateMyChapterVariables>;

interface SoftDeleteMyStoryRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: SoftDeleteMyStoryVariables): MutationRef<SoftDeleteMyStoryData, SoftDeleteMyStoryVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: SoftDeleteMyStoryVariables): MutationRef<SoftDeleteMyStoryData, SoftDeleteMyStoryVariables>;
  operationName: string;
}
export const softDeleteMyStoryRef: SoftDeleteMyStoryRef;

export function softDeleteMyStory(vars: SoftDeleteMyStoryVariables): MutationPromise<SoftDeleteMyStoryData, SoftDeleteMyStoryVariables>;
export function softDeleteMyStory(dc: DataConnect, vars: SoftDeleteMyStoryVariables): MutationPromise<SoftDeleteMyStoryData, SoftDeleteMyStoryVariables>;

interface AdminPurgeFoundationProbeRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminPurgeFoundationProbeVariables): MutationRef<AdminPurgeFoundationProbeData, AdminPurgeFoundationProbeVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminPurgeFoundationProbeVariables): MutationRef<AdminPurgeFoundationProbeData, AdminPurgeFoundationProbeVariables>;
  operationName: string;
}
export const adminPurgeFoundationProbeRef: AdminPurgeFoundationProbeRef;

export function adminPurgeFoundationProbe(vars: AdminPurgeFoundationProbeVariables): MutationPromise<AdminPurgeFoundationProbeData, AdminPurgeFoundationProbeVariables>;
export function adminPurgeFoundationProbe(dc: DataConnect, vars: AdminPurgeFoundationProbeVariables): MutationPromise<AdminPurgeFoundationProbeData, AdminPurgeFoundationProbeVariables>;

interface AdminPurgeFoundationStoryRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminPurgeFoundationStoryVariables): MutationRef<AdminPurgeFoundationStoryData, AdminPurgeFoundationStoryVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminPurgeFoundationStoryVariables): MutationRef<AdminPurgeFoundationStoryData, AdminPurgeFoundationStoryVariables>;
  operationName: string;
}
export const adminPurgeFoundationStoryRef: AdminPurgeFoundationStoryRef;

export function adminPurgeFoundationStory(vars: AdminPurgeFoundationStoryVariables): MutationPromise<AdminPurgeFoundationStoryData, AdminPurgeFoundationStoryVariables>;
export function adminPurgeFoundationStory(dc: DataConnect, vars: AdminPurgeFoundationStoryVariables): MutationPromise<AdminPurgeFoundationStoryData, AdminPurgeFoundationStoryVariables>;

interface AdminReserveMediaAssetRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminReserveMediaAssetVariables): MutationRef<AdminReserveMediaAssetData, AdminReserveMediaAssetVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminReserveMediaAssetVariables): MutationRef<AdminReserveMediaAssetData, AdminReserveMediaAssetVariables>;
  operationName: string;
}
export const adminReserveMediaAssetRef: AdminReserveMediaAssetRef;

export function adminReserveMediaAsset(vars: AdminReserveMediaAssetVariables): MutationPromise<AdminReserveMediaAssetData, AdminReserveMediaAssetVariables>;
export function adminReserveMediaAsset(dc: DataConnect, vars: AdminReserveMediaAssetVariables): MutationPromise<AdminReserveMediaAssetData, AdminReserveMediaAssetVariables>;

interface AdminCommitMediaAssetReadyRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminCommitMediaAssetReadyVariables): MutationRef<AdminCommitMediaAssetReadyData, AdminCommitMediaAssetReadyVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminCommitMediaAssetReadyVariables): MutationRef<AdminCommitMediaAssetReadyData, AdminCommitMediaAssetReadyVariables>;
  operationName: string;
}
export const adminCommitMediaAssetReadyRef: AdminCommitMediaAssetReadyRef;

export function adminCommitMediaAssetReady(vars: AdminCommitMediaAssetReadyVariables): MutationPromise<AdminCommitMediaAssetReadyData, AdminCommitMediaAssetReadyVariables>;
export function adminCommitMediaAssetReady(dc: DataConnect, vars: AdminCommitMediaAssetReadyVariables): MutationPromise<AdminCommitMediaAssetReadyData, AdminCommitMediaAssetReadyVariables>;

interface AdminCommitMediaAssetReplacementRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminCommitMediaAssetReplacementVariables): MutationRef<AdminCommitMediaAssetReplacementData, AdminCommitMediaAssetReplacementVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminCommitMediaAssetReplacementVariables): MutationRef<AdminCommitMediaAssetReplacementData, AdminCommitMediaAssetReplacementVariables>;
  operationName: string;
}
export const adminCommitMediaAssetReplacementRef: AdminCommitMediaAssetReplacementRef;

export function adminCommitMediaAssetReplacement(vars: AdminCommitMediaAssetReplacementVariables): MutationPromise<AdminCommitMediaAssetReplacementData, AdminCommitMediaAssetReplacementVariables>;
export function adminCommitMediaAssetReplacement(dc: DataConnect, vars: AdminCommitMediaAssetReplacementVariables): MutationPromise<AdminCommitMediaAssetReplacementData, AdminCommitMediaAssetReplacementVariables>;

interface AdminMarkMediaAssetFailedRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminMarkMediaAssetFailedVariables): MutationRef<AdminMarkMediaAssetFailedData, AdminMarkMediaAssetFailedVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminMarkMediaAssetFailedVariables): MutationRef<AdminMarkMediaAssetFailedData, AdminMarkMediaAssetFailedVariables>;
  operationName: string;
}
export const adminMarkMediaAssetFailedRef: AdminMarkMediaAssetFailedRef;

export function adminMarkMediaAssetFailed(vars: AdminMarkMediaAssetFailedVariables): MutationPromise<AdminMarkMediaAssetFailedData, AdminMarkMediaAssetFailedVariables>;
export function adminMarkMediaAssetFailed(dc: DataConnect, vars: AdminMarkMediaAssetFailedVariables): MutationPromise<AdminMarkMediaAssetFailedData, AdminMarkMediaAssetFailedVariables>;

interface AdminMarkMediaAssetPendingCleanupRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminMarkMediaAssetPendingCleanupVariables): MutationRef<AdminMarkMediaAssetPendingCleanupData, AdminMarkMediaAssetPendingCleanupVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminMarkMediaAssetPendingCleanupVariables): MutationRef<AdminMarkMediaAssetPendingCleanupData, AdminMarkMediaAssetPendingCleanupVariables>;
  operationName: string;
}
export const adminMarkMediaAssetPendingCleanupRef: AdminMarkMediaAssetPendingCleanupRef;

export function adminMarkMediaAssetPendingCleanup(vars: AdminMarkMediaAssetPendingCleanupVariables): MutationPromise<AdminMarkMediaAssetPendingCleanupData, AdminMarkMediaAssetPendingCleanupVariables>;
export function adminMarkMediaAssetPendingCleanup(dc: DataConnect, vars: AdminMarkMediaAssetPendingCleanupVariables): MutationPromise<AdminMarkMediaAssetPendingCleanupData, AdminMarkMediaAssetPendingCleanupVariables>;

interface AdminRequestMediaAssetDeletionRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminRequestMediaAssetDeletionVariables): MutationRef<AdminRequestMediaAssetDeletionData, AdminRequestMediaAssetDeletionVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminRequestMediaAssetDeletionVariables): MutationRef<AdminRequestMediaAssetDeletionData, AdminRequestMediaAssetDeletionVariables>;
  operationName: string;
}
export const adminRequestMediaAssetDeletionRef: AdminRequestMediaAssetDeletionRef;

export function adminRequestMediaAssetDeletion(vars: AdminRequestMediaAssetDeletionVariables): MutationPromise<AdminRequestMediaAssetDeletionData, AdminRequestMediaAssetDeletionVariables>;
export function adminRequestMediaAssetDeletion(dc: DataConnect, vars: AdminRequestMediaAssetDeletionVariables): MutationPromise<AdminRequestMediaAssetDeletionData, AdminRequestMediaAssetDeletionVariables>;

interface AdminCompleteMediaCleanupRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminCompleteMediaCleanupVariables): MutationRef<AdminCompleteMediaCleanupData, AdminCompleteMediaCleanupVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminCompleteMediaCleanupVariables): MutationRef<AdminCompleteMediaCleanupData, AdminCompleteMediaCleanupVariables>;
  operationName: string;
}
export const adminCompleteMediaCleanupRef: AdminCompleteMediaCleanupRef;

export function adminCompleteMediaCleanup(vars: AdminCompleteMediaCleanupVariables): MutationPromise<AdminCompleteMediaCleanupData, AdminCompleteMediaCleanupVariables>;
export function adminCompleteMediaCleanup(dc: DataConnect, vars: AdminCompleteMediaCleanupVariables): MutationPromise<AdminCompleteMediaCleanupData, AdminCompleteMediaCleanupVariables>;

interface AdminFailMediaCleanupRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminFailMediaCleanupVariables): MutationRef<AdminFailMediaCleanupData, AdminFailMediaCleanupVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminFailMediaCleanupVariables): MutationRef<AdminFailMediaCleanupData, AdminFailMediaCleanupVariables>;
  operationName: string;
}
export const adminFailMediaCleanupRef: AdminFailMediaCleanupRef;

export function adminFailMediaCleanup(vars: AdminFailMediaCleanupVariables): MutationPromise<AdminFailMediaCleanupData, AdminFailMediaCleanupVariables>;
export function adminFailMediaCleanup(dc: DataConnect, vars: AdminFailMediaCleanupVariables): MutationPromise<AdminFailMediaCleanupData, AdminFailMediaCleanupVariables>;

interface AdminDeleteOwnedStoryRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminDeleteOwnedStoryVariables): MutationRef<AdminDeleteOwnedStoryData, AdminDeleteOwnedStoryVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminDeleteOwnedStoryVariables): MutationRef<AdminDeleteOwnedStoryData, AdminDeleteOwnedStoryVariables>;
  operationName: string;
}
export const adminDeleteOwnedStoryRef: AdminDeleteOwnedStoryRef;

export function adminDeleteOwnedStory(vars: AdminDeleteOwnedStoryVariables): MutationPromise<AdminDeleteOwnedStoryData, AdminDeleteOwnedStoryVariables>;
export function adminDeleteOwnedStory(dc: DataConnect, vars: AdminDeleteOwnedStoryVariables): MutationPromise<AdminDeleteOwnedStoryData, AdminDeleteOwnedStoryVariables>;

interface AdminClaimStoryDeletionJobRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminClaimStoryDeletionJobVariables): MutationRef<AdminClaimStoryDeletionJobData, AdminClaimStoryDeletionJobVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminClaimStoryDeletionJobVariables): MutationRef<AdminClaimStoryDeletionJobData, AdminClaimStoryDeletionJobVariables>;
  operationName: string;
}
export const adminClaimStoryDeletionJobRef: AdminClaimStoryDeletionJobRef;

export function adminClaimStoryDeletionJob(vars: AdminClaimStoryDeletionJobVariables): MutationPromise<AdminClaimStoryDeletionJobData, AdminClaimStoryDeletionJobVariables>;
export function adminClaimStoryDeletionJob(dc: DataConnect, vars: AdminClaimStoryDeletionJobVariables): MutationPromise<AdminClaimStoryDeletionJobData, AdminClaimStoryDeletionJobVariables>;

interface AdminFailStoryDeletionJobRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminFailStoryDeletionJobVariables): MutationRef<AdminFailStoryDeletionJobData, AdminFailStoryDeletionJobVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminFailStoryDeletionJobVariables): MutationRef<AdminFailStoryDeletionJobData, AdminFailStoryDeletionJobVariables>;
  operationName: string;
}
export const adminFailStoryDeletionJobRef: AdminFailStoryDeletionJobRef;

export function adminFailStoryDeletionJob(vars: AdminFailStoryDeletionJobVariables): MutationPromise<AdminFailStoryDeletionJobData, AdminFailStoryDeletionJobVariables>;
export function adminFailStoryDeletionJob(dc: DataConnect, vars: AdminFailStoryDeletionJobVariables): MutationPromise<AdminFailStoryDeletionJobData, AdminFailStoryDeletionJobVariables>;

interface AdminAdvanceStoryDeletionJobRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminAdvanceStoryDeletionJobVariables): MutationRef<AdminAdvanceStoryDeletionJobData, AdminAdvanceStoryDeletionJobVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminAdvanceStoryDeletionJobVariables): MutationRef<AdminAdvanceStoryDeletionJobData, AdminAdvanceStoryDeletionJobVariables>;
  operationName: string;
}
export const adminAdvanceStoryDeletionJobRef: AdminAdvanceStoryDeletionJobRef;

export function adminAdvanceStoryDeletionJob(vars: AdminAdvanceStoryDeletionJobVariables): MutationPromise<AdminAdvanceStoryDeletionJobData, AdminAdvanceStoryDeletionJobVariables>;
export function adminAdvanceStoryDeletionJob(dc: DataConnect, vars: AdminAdvanceStoryDeletionJobVariables): MutationPromise<AdminAdvanceStoryDeletionJobData, AdminAdvanceStoryDeletionJobVariables>;

interface AdminCompleteStoryDeletionJobRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminCompleteStoryDeletionJobVariables): MutationRef<AdminCompleteStoryDeletionJobData, AdminCompleteStoryDeletionJobVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminCompleteStoryDeletionJobVariables): MutationRef<AdminCompleteStoryDeletionJobData, AdminCompleteStoryDeletionJobVariables>;
  operationName: string;
}
export const adminCompleteStoryDeletionJobRef: AdminCompleteStoryDeletionJobRef;

export function adminCompleteStoryDeletionJob(vars: AdminCompleteStoryDeletionJobVariables): MutationPromise<AdminCompleteStoryDeletionJobData, AdminCompleteStoryDeletionJobVariables>;
export function adminCompleteStoryDeletionJob(dc: DataConnect, vars: AdminCompleteStoryDeletionJobVariables): MutationPromise<AdminCompleteStoryDeletionJobData, AdminCompleteStoryDeletionJobVariables>;

interface AdminPurgeExpiredStoryTombstoneRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminPurgeExpiredStoryTombstoneVariables): MutationRef<AdminPurgeExpiredStoryTombstoneData, AdminPurgeExpiredStoryTombstoneVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminPurgeExpiredStoryTombstoneVariables): MutationRef<AdminPurgeExpiredStoryTombstoneData, AdminPurgeExpiredStoryTombstoneVariables>;
  operationName: string;
}
export const adminPurgeExpiredStoryTombstoneRef: AdminPurgeExpiredStoryTombstoneRef;

export function adminPurgeExpiredStoryTombstone(vars: AdminPurgeExpiredStoryTombstoneVariables): MutationPromise<AdminPurgeExpiredStoryTombstoneData, AdminPurgeExpiredStoryTombstoneVariables>;
export function adminPurgeExpiredStoryTombstone(dc: DataConnect, vars: AdminPurgeExpiredStoryTombstoneVariables): MutationPromise<AdminPurgeExpiredStoryTombstoneData, AdminPurgeExpiredStoryTombstoneVariables>;

interface AdminReserveStorageQuotaRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminReserveStorageQuotaVariables): MutationRef<AdminReserveStorageQuotaData, AdminReserveStorageQuotaVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminReserveStorageQuotaVariables): MutationRef<AdminReserveStorageQuotaData, AdminReserveStorageQuotaVariables>;
  operationName: string;
}
export const adminReserveStorageQuotaRef: AdminReserveStorageQuotaRef;

export function adminReserveStorageQuota(vars: AdminReserveStorageQuotaVariables): MutationPromise<AdminReserveStorageQuotaData, AdminReserveStorageQuotaVariables>;
export function adminReserveStorageQuota(dc: DataConnect, vars: AdminReserveStorageQuotaVariables): MutationPromise<AdminReserveStorageQuotaData, AdminReserveStorageQuotaVariables>;

interface AdminReleaseStorageQuotaReservationRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminReleaseStorageQuotaReservationVariables): MutationRef<AdminReleaseStorageQuotaReservationData, AdminReleaseStorageQuotaReservationVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminReleaseStorageQuotaReservationVariables): MutationRef<AdminReleaseStorageQuotaReservationData, AdminReleaseStorageQuotaReservationVariables>;
  operationName: string;
}
export const adminReleaseStorageQuotaReservationRef: AdminReleaseStorageQuotaReservationRef;

export function adminReleaseStorageQuotaReservation(vars: AdminReleaseStorageQuotaReservationVariables): MutationPromise<AdminReleaseStorageQuotaReservationData, AdminReleaseStorageQuotaReservationVariables>;
export function adminReleaseStorageQuotaReservation(dc: DataConnect, vars: AdminReleaseStorageQuotaReservationVariables): MutationPromise<AdminReleaseStorageQuotaReservationData, AdminReleaseStorageQuotaReservationVariables>;

interface AdminReserveMediaAssetIdempotentRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminReserveMediaAssetIdempotentVariables): MutationRef<AdminReserveMediaAssetIdempotentData, AdminReserveMediaAssetIdempotentVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminReserveMediaAssetIdempotentVariables): MutationRef<AdminReserveMediaAssetIdempotentData, AdminReserveMediaAssetIdempotentVariables>;
  operationName: string;
}
export const adminReserveMediaAssetIdempotentRef: AdminReserveMediaAssetIdempotentRef;

export function adminReserveMediaAssetIdempotent(vars: AdminReserveMediaAssetIdempotentVariables): MutationPromise<AdminReserveMediaAssetIdempotentData, AdminReserveMediaAssetIdempotentVariables>;
export function adminReserveMediaAssetIdempotent(dc: DataConnect, vars: AdminReserveMediaAssetIdempotentVariables): MutationPromise<AdminReserveMediaAssetIdempotentData, AdminReserveMediaAssetIdempotentVariables>;

interface AdminCommitMediaAssetToSlotRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminCommitMediaAssetToSlotVariables): MutationRef<AdminCommitMediaAssetToSlotData, AdminCommitMediaAssetToSlotVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminCommitMediaAssetToSlotVariables): MutationRef<AdminCommitMediaAssetToSlotData, AdminCommitMediaAssetToSlotVariables>;
  operationName: string;
}
export const adminCommitMediaAssetToSlotRef: AdminCommitMediaAssetToSlotRef;

export function adminCommitMediaAssetToSlot(vars: AdminCommitMediaAssetToSlotVariables): MutationPromise<AdminCommitMediaAssetToSlotData, AdminCommitMediaAssetToSlotVariables>;
export function adminCommitMediaAssetToSlot(dc: DataConnect, vars: AdminCommitMediaAssetToSlotVariables): MutationPromise<AdminCommitMediaAssetToSlotData, AdminCommitMediaAssetToSlotVariables>;

interface AdminSelectOwnedMediaSlotAssetRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminSelectOwnedMediaSlotAssetVariables): MutationRef<AdminSelectOwnedMediaSlotAssetData, AdminSelectOwnedMediaSlotAssetVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminSelectOwnedMediaSlotAssetVariables): MutationRef<AdminSelectOwnedMediaSlotAssetData, AdminSelectOwnedMediaSlotAssetVariables>;
  operationName: string;
}
export const adminSelectOwnedMediaSlotAssetRef: AdminSelectOwnedMediaSlotAssetRef;

export function adminSelectOwnedMediaSlotAsset(vars: AdminSelectOwnedMediaSlotAssetVariables): MutationPromise<AdminSelectOwnedMediaSlotAssetData, AdminSelectOwnedMediaSlotAssetVariables>;
export function adminSelectOwnedMediaSlotAsset(dc: DataConnect, vars: AdminSelectOwnedMediaSlotAssetVariables): MutationPromise<AdminSelectOwnedMediaSlotAssetData, AdminSelectOwnedMediaSlotAssetVariables>;

interface AdminSelectUserPortraitRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminSelectUserPortraitVariables): MutationRef<AdminSelectUserPortraitData, AdminSelectUserPortraitVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminSelectUserPortraitVariables): MutationRef<AdminSelectUserPortraitData, AdminSelectUserPortraitVariables>;
  operationName: string;
}
export const adminSelectUserPortraitRef: AdminSelectUserPortraitRef;

export function adminSelectUserPortrait(vars: AdminSelectUserPortraitVariables): MutationPromise<AdminSelectUserPortraitData, AdminSelectUserPortraitVariables>;
export function adminSelectUserPortrait(dc: DataConnect, vars: AdminSelectUserPortraitVariables): MutationPromise<AdminSelectUserPortraitData, AdminSelectUserPortraitVariables>;

interface AdminEnsureMediaDeletionIntentRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminEnsureMediaDeletionIntentVariables): MutationRef<AdminEnsureMediaDeletionIntentData, AdminEnsureMediaDeletionIntentVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminEnsureMediaDeletionIntentVariables): MutationRef<AdminEnsureMediaDeletionIntentData, AdminEnsureMediaDeletionIntentVariables>;
  operationName: string;
}
export const adminEnsureMediaDeletionIntentRef: AdminEnsureMediaDeletionIntentRef;

export function adminEnsureMediaDeletionIntent(vars: AdminEnsureMediaDeletionIntentVariables): MutationPromise<AdminEnsureMediaDeletionIntentData, AdminEnsureMediaDeletionIntentVariables>;
export function adminEnsureMediaDeletionIntent(dc: DataConnect, vars: AdminEnsureMediaDeletionIntentVariables): MutationPromise<AdminEnsureMediaDeletionIntentData, AdminEnsureMediaDeletionIntentVariables>;

interface AdminClaimMediaCleanupTaskRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminClaimMediaCleanupTaskVariables): MutationRef<AdminClaimMediaCleanupTaskData, AdminClaimMediaCleanupTaskVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminClaimMediaCleanupTaskVariables): MutationRef<AdminClaimMediaCleanupTaskData, AdminClaimMediaCleanupTaskVariables>;
  operationName: string;
}
export const adminClaimMediaCleanupTaskRef: AdminClaimMediaCleanupTaskRef;

export function adminClaimMediaCleanupTask(vars: AdminClaimMediaCleanupTaskVariables): MutationPromise<AdminClaimMediaCleanupTaskData, AdminClaimMediaCleanupTaskVariables>;
export function adminClaimMediaCleanupTask(dc: DataConnect, vars: AdminClaimMediaCleanupTaskVariables): MutationPromise<AdminClaimMediaCleanupTaskData, AdminClaimMediaCleanupTaskVariables>;

interface AdminCompleteMediaDeletionIntentRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminCompleteMediaDeletionIntentVariables): MutationRef<AdminCompleteMediaDeletionIntentData, AdminCompleteMediaDeletionIntentVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminCompleteMediaDeletionIntentVariables): MutationRef<AdminCompleteMediaDeletionIntentData, AdminCompleteMediaDeletionIntentVariables>;
  operationName: string;
}
export const adminCompleteMediaDeletionIntentRef: AdminCompleteMediaDeletionIntentRef;

export function adminCompleteMediaDeletionIntent(vars: AdminCompleteMediaDeletionIntentVariables): MutationPromise<AdminCompleteMediaDeletionIntentData, AdminCompleteMediaDeletionIntentVariables>;
export function adminCompleteMediaDeletionIntent(dc: DataConnect, vars: AdminCompleteMediaDeletionIntentVariables): MutationPromise<AdminCompleteMediaDeletionIntentData, AdminCompleteMediaDeletionIntentVariables>;

interface AdminFailMediaDeletionIntentRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminFailMediaDeletionIntentVariables): MutationRef<AdminFailMediaDeletionIntentData, AdminFailMediaDeletionIntentVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminFailMediaDeletionIntentVariables): MutationRef<AdminFailMediaDeletionIntentData, AdminFailMediaDeletionIntentVariables>;
  operationName: string;
}
export const adminFailMediaDeletionIntentRef: AdminFailMediaDeletionIntentRef;

export function adminFailMediaDeletionIntent(vars: AdminFailMediaDeletionIntentVariables): MutationPromise<AdminFailMediaDeletionIntentData, AdminFailMediaDeletionIntentVariables>;
export function adminFailMediaDeletionIntent(dc: DataConnect, vars: AdminFailMediaDeletionIntentVariables): MutationPromise<AdminFailMediaDeletionIntentData, AdminFailMediaDeletionIntentVariables>;

interface AdminDeleteOwnedStorySeedRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminDeleteOwnedStorySeedVariables): MutationRef<AdminDeleteOwnedStorySeedData, AdminDeleteOwnedStorySeedVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminDeleteOwnedStorySeedVariables): MutationRef<AdminDeleteOwnedStorySeedData, AdminDeleteOwnedStorySeedVariables>;
  operationName: string;
}
export const adminDeleteOwnedStorySeedRef: AdminDeleteOwnedStorySeedRef;

export function adminDeleteOwnedStorySeed(vars: AdminDeleteOwnedStorySeedVariables): MutationPromise<AdminDeleteOwnedStorySeedData, AdminDeleteOwnedStorySeedVariables>;
export function adminDeleteOwnedStorySeed(dc: DataConnect, vars: AdminDeleteOwnedStorySeedVariables): MutationPromise<AdminDeleteOwnedStorySeedData, AdminDeleteOwnedStorySeedVariables>;

interface AdminDeleteOwnedGlossaryTermRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminDeleteOwnedGlossaryTermVariables): MutationRef<AdminDeleteOwnedGlossaryTermData, AdminDeleteOwnedGlossaryTermVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminDeleteOwnedGlossaryTermVariables): MutationRef<AdminDeleteOwnedGlossaryTermData, AdminDeleteOwnedGlossaryTermVariables>;
  operationName: string;
}
export const adminDeleteOwnedGlossaryTermRef: AdminDeleteOwnedGlossaryTermRef;

export function adminDeleteOwnedGlossaryTerm(vars: AdminDeleteOwnedGlossaryTermVariables): MutationPromise<AdminDeleteOwnedGlossaryTermData, AdminDeleteOwnedGlossaryTermVariables>;
export function adminDeleteOwnedGlossaryTerm(dc: DataConnect, vars: AdminDeleteOwnedGlossaryTermVariables): MutationPromise<AdminDeleteOwnedGlossaryTermData, AdminDeleteOwnedGlossaryTermVariables>;

interface AdminConsumeImageGenerationQuotaRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminConsumeImageGenerationQuotaVariables): MutationRef<AdminConsumeImageGenerationQuotaData, AdminConsumeImageGenerationQuotaVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminConsumeImageGenerationQuotaVariables): MutationRef<AdminConsumeImageGenerationQuotaData, AdminConsumeImageGenerationQuotaVariables>;
  operationName: string;
}
export const adminConsumeImageGenerationQuotaRef: AdminConsumeImageGenerationQuotaRef;

export function adminConsumeImageGenerationQuota(vars: AdminConsumeImageGenerationQuotaVariables): MutationPromise<AdminConsumeImageGenerationQuotaData, AdminConsumeImageGenerationQuotaVariables>;
export function adminConsumeImageGenerationQuota(dc: DataConnect, vars: AdminConsumeImageGenerationQuotaVariables): MutationPromise<AdminConsumeImageGenerationQuotaData, AdminConsumeImageGenerationQuotaVariables>;

interface AdminRecoverPendingUserPortraitsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminRecoverPendingUserPortraitsVariables): MutationRef<AdminRecoverPendingUserPortraitsData, AdminRecoverPendingUserPortraitsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminRecoverPendingUserPortraitsVariables): MutationRef<AdminRecoverPendingUserPortraitsData, AdminRecoverPendingUserPortraitsVariables>;
  operationName: string;
}
export const adminRecoverPendingUserPortraitsRef: AdminRecoverPendingUserPortraitsRef;

export function adminRecoverPendingUserPortraits(vars: AdminRecoverPendingUserPortraitsVariables): MutationPromise<AdminRecoverPendingUserPortraitsData, AdminRecoverPendingUserPortraitsVariables>;
export function adminRecoverPendingUserPortraits(dc: DataConnect, vars: AdminRecoverPendingUserPortraitsVariables): MutationPromise<AdminRecoverPendingUserPortraitsData, AdminRecoverPendingUserPortraitsVariables>;

interface AdminUpdateAccountAccessRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminUpdateAccountAccessVariables): MutationRef<AdminUpdateAccountAccessData, AdminUpdateAccountAccessVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminUpdateAccountAccessVariables): MutationRef<AdminUpdateAccountAccessData, AdminUpdateAccountAccessVariables>;
  operationName: string;
}
export const adminUpdateAccountAccessRef: AdminUpdateAccountAccessRef;

export function adminUpdateAccountAccess(vars: AdminUpdateAccountAccessVariables): MutationPromise<AdminUpdateAccountAccessData, AdminUpdateAccountAccessVariables>;
export function adminUpdateAccountAccess(dc: DataConnect, vars: AdminUpdateAccountAccessVariables): MutationPromise<AdminUpdateAccountAccessData, AdminUpdateAccountAccessVariables>;

interface AdminDeleteStoryAsAdminRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminDeleteStoryAsAdminVariables): MutationRef<AdminDeleteStoryAsAdminData, AdminDeleteStoryAsAdminVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminDeleteStoryAsAdminVariables): MutationRef<AdminDeleteStoryAsAdminData, AdminDeleteStoryAsAdminVariables>;
  operationName: string;
}
export const adminDeleteStoryAsAdminRef: AdminDeleteStoryAsAdminRef;

export function adminDeleteStoryAsAdmin(vars: AdminDeleteStoryAsAdminVariables): MutationPromise<AdminDeleteStoryAsAdminData, AdminDeleteStoryAsAdminVariables>;
export function adminDeleteStoryAsAdmin(dc: DataConnect, vars: AdminDeleteStoryAsAdminVariables): MutationPromise<AdminDeleteStoryAsAdminData, AdminDeleteStoryAsAdminVariables>;

interface GetMyAccountRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMyAccountData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetMyAccountData, undefined>;
  operationName: string;
}
export const getMyAccountRef: GetMyAccountRef;

export function getMyAccount(options?: ExecuteQueryOptions): QueryPromise<GetMyAccountData, undefined>;
export function getMyAccount(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetMyAccountData, undefined>;

interface ListMyFoundationProbesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMyFoundationProbesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListMyFoundationProbesData, undefined>;
  operationName: string;
}
export const listMyFoundationProbesRef: ListMyFoundationProbesRef;

export function listMyFoundationProbes(options?: ExecuteQueryOptions): QueryPromise<ListMyFoundationProbesData, undefined>;
export function listMyFoundationProbes(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMyFoundationProbesData, undefined>;

interface GetMyFoundationProbeRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMyFoundationProbeVariables): QueryRef<GetMyFoundationProbeData, GetMyFoundationProbeVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetMyFoundationProbeVariables): QueryRef<GetMyFoundationProbeData, GetMyFoundationProbeVariables>;
  operationName: string;
}
export const getMyFoundationProbeRef: GetMyFoundationProbeRef;

export function getMyFoundationProbe(vars: GetMyFoundationProbeVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyFoundationProbeData, GetMyFoundationProbeVariables>;
export function getMyFoundationProbe(dc: DataConnect, vars: GetMyFoundationProbeVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyFoundationProbeData, GetMyFoundationProbeVariables>;

interface ListMyStoriesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMyStoriesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListMyStoriesData, undefined>;
  operationName: string;
}
export const listMyStoriesRef: ListMyStoriesRef;

export function listMyStories(options?: ExecuteQueryOptions): QueryPromise<ListMyStoriesData, undefined>;
export function listMyStories(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMyStoriesData, undefined>;

interface GetMyStoryRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMyStoryVariables): QueryRef<GetMyStoryData, GetMyStoryVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetMyStoryVariables): QueryRef<GetMyStoryData, GetMyStoryVariables>;
  operationName: string;
}
export const getMyStoryRef: GetMyStoryRef;

export function getMyStory(vars: GetMyStoryVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyStoryData, GetMyStoryVariables>;
export function getMyStory(dc: DataConnect, vars: GetMyStoryVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyStoryData, GetMyStoryVariables>;

interface GetMyChapterRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMyChapterVariables): QueryRef<GetMyChapterData, GetMyChapterVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetMyChapterVariables): QueryRef<GetMyChapterData, GetMyChapterVariables>;
  operationName: string;
}
export const getMyChapterRef: GetMyChapterRef;

export function getMyChapter(vars: GetMyChapterVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyChapterData, GetMyChapterVariables>;
export function getMyChapter(dc: DataConnect, vars: GetMyChapterVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyChapterData, GetMyChapterVariables>;

interface GetMyMediaAssetRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMyMediaAssetVariables): QueryRef<GetMyMediaAssetData, GetMyMediaAssetVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetMyMediaAssetVariables): QueryRef<GetMyMediaAssetData, GetMyMediaAssetVariables>;
  operationName: string;
}
export const getMyMediaAssetRef: GetMyMediaAssetRef;

export function getMyMediaAsset(vars: GetMyMediaAssetVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyMediaAssetData, GetMyMediaAssetVariables>;
export function getMyMediaAsset(dc: DataConnect, vars: GetMyMediaAssetVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyMediaAssetData, GetMyMediaAssetVariables>;

interface ListMyMediaAssetsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars?: ListMyMediaAssetsVariables): QueryRef<ListMyMediaAssetsData, ListMyMediaAssetsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars?: ListMyMediaAssetsVariables): QueryRef<ListMyMediaAssetsData, ListMyMediaAssetsVariables>;
  operationName: string;
}
export const listMyMediaAssetsRef: ListMyMediaAssetsRef;

export function listMyMediaAssets(vars?: ListMyMediaAssetsVariables, options?: ExecuteQueryOptions): QueryPromise<ListMyMediaAssetsData, ListMyMediaAssetsVariables>;
export function listMyMediaAssets(dc: DataConnect, vars?: ListMyMediaAssetsVariables, options?: ExecuteQueryOptions): QueryPromise<ListMyMediaAssetsData, ListMyMediaAssetsVariables>;

interface AdminGetOwnedMediaAssetRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetOwnedMediaAssetVariables): QueryRef<AdminGetOwnedMediaAssetData, AdminGetOwnedMediaAssetVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminGetOwnedMediaAssetVariables): QueryRef<AdminGetOwnedMediaAssetData, AdminGetOwnedMediaAssetVariables>;
  operationName: string;
}
export const adminGetOwnedMediaAssetRef: AdminGetOwnedMediaAssetRef;

export function adminGetOwnedMediaAsset(vars: AdminGetOwnedMediaAssetVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedMediaAssetData, AdminGetOwnedMediaAssetVariables>;
export function adminGetOwnedMediaAsset(dc: DataConnect, vars: AdminGetOwnedMediaAssetVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedMediaAssetData, AdminGetOwnedMediaAssetVariables>;

interface AdminGetOwnedStoryScopeRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetOwnedStoryScopeVariables): QueryRef<AdminGetOwnedStoryScopeData, AdminGetOwnedStoryScopeVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminGetOwnedStoryScopeVariables): QueryRef<AdminGetOwnedStoryScopeData, AdminGetOwnedStoryScopeVariables>;
  operationName: string;
}
export const adminGetOwnedStoryScopeRef: AdminGetOwnedStoryScopeRef;

export function adminGetOwnedStoryScope(vars: AdminGetOwnedStoryScopeVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedStoryScopeData, AdminGetOwnedStoryScopeVariables>;
export function adminGetOwnedStoryScope(dc: DataConnect, vars: AdminGetOwnedStoryScopeVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedStoryScopeData, AdminGetOwnedStoryScopeVariables>;

interface AdminGetOwnedChapterScopeRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetOwnedChapterScopeVariables): QueryRef<AdminGetOwnedChapterScopeData, AdminGetOwnedChapterScopeVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminGetOwnedChapterScopeVariables): QueryRef<AdminGetOwnedChapterScopeData, AdminGetOwnedChapterScopeVariables>;
  operationName: string;
}
export const adminGetOwnedChapterScopeRef: AdminGetOwnedChapterScopeRef;

export function adminGetOwnedChapterScope(vars: AdminGetOwnedChapterScopeVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedChapterScopeData, AdminGetOwnedChapterScopeVariables>;
export function adminGetOwnedChapterScope(dc: DataConnect, vars: AdminGetOwnedChapterScopeVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedChapterScopeData, AdminGetOwnedChapterScopeVariables>;

interface AdminGetOwnedEntityScopeRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetOwnedEntityScopeVariables): QueryRef<AdminGetOwnedEntityScopeData, AdminGetOwnedEntityScopeVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminGetOwnedEntityScopeVariables): QueryRef<AdminGetOwnedEntityScopeData, AdminGetOwnedEntityScopeVariables>;
  operationName: string;
}
export const adminGetOwnedEntityScopeRef: AdminGetOwnedEntityScopeRef;

export function adminGetOwnedEntityScope(vars: AdminGetOwnedEntityScopeVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedEntityScopeData, AdminGetOwnedEntityScopeVariables>;
export function adminGetOwnedEntityScope(dc: DataConnect, vars: AdminGetOwnedEntityScopeVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedEntityScopeData, AdminGetOwnedEntityScopeVariables>;

interface AdminGetOwnedGenerationJobScopeRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetOwnedGenerationJobScopeVariables): QueryRef<AdminGetOwnedGenerationJobScopeData, AdminGetOwnedGenerationJobScopeVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminGetOwnedGenerationJobScopeVariables): QueryRef<AdminGetOwnedGenerationJobScopeData, AdminGetOwnedGenerationJobScopeVariables>;
  operationName: string;
}
export const adminGetOwnedGenerationJobScopeRef: AdminGetOwnedGenerationJobScopeRef;

export function adminGetOwnedGenerationJobScope(vars: AdminGetOwnedGenerationJobScopeVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedGenerationJobScopeData, AdminGetOwnedGenerationJobScopeVariables>;
export function adminGetOwnedGenerationJobScope(dc: DataConnect, vars: AdminGetOwnedGenerationJobScopeVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedGenerationJobScopeData, AdminGetOwnedGenerationJobScopeVariables>;

interface AdminGetOwnedMediaReplacementScopeRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetOwnedMediaReplacementScopeVariables): QueryRef<AdminGetOwnedMediaReplacementScopeData, AdminGetOwnedMediaReplacementScopeVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminGetOwnedMediaReplacementScopeVariables): QueryRef<AdminGetOwnedMediaReplacementScopeData, AdminGetOwnedMediaReplacementScopeVariables>;
  operationName: string;
}
export const adminGetOwnedMediaReplacementScopeRef: AdminGetOwnedMediaReplacementScopeRef;

export function adminGetOwnedMediaReplacementScope(vars: AdminGetOwnedMediaReplacementScopeVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedMediaReplacementScopeData, AdminGetOwnedMediaReplacementScopeVariables>;
export function adminGetOwnedMediaReplacementScope(dc: DataConnect, vars: AdminGetOwnedMediaReplacementScopeVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedMediaReplacementScopeData, AdminGetOwnedMediaReplacementScopeVariables>;

interface AdminListStaleMediaUploadsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminListStaleMediaUploadsVariables): QueryRef<AdminListStaleMediaUploadsData, AdminListStaleMediaUploadsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminListStaleMediaUploadsVariables): QueryRef<AdminListStaleMediaUploadsData, AdminListStaleMediaUploadsVariables>;
  operationName: string;
}
export const adminListStaleMediaUploadsRef: AdminListStaleMediaUploadsRef;

export function adminListStaleMediaUploads(vars: AdminListStaleMediaUploadsVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListStaleMediaUploadsData, AdminListStaleMediaUploadsVariables>;
export function adminListStaleMediaUploads(dc: DataConnect, vars: AdminListStaleMediaUploadsVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListStaleMediaUploadsData, AdminListStaleMediaUploadsVariables>;

interface AdminListMediaCleanupTasksRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars?: AdminListMediaCleanupTasksVariables): QueryRef<AdminListMediaCleanupTasksData, AdminListMediaCleanupTasksVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars?: AdminListMediaCleanupTasksVariables): QueryRef<AdminListMediaCleanupTasksData, AdminListMediaCleanupTasksVariables>;
  operationName: string;
}
export const adminListMediaCleanupTasksRef: AdminListMediaCleanupTasksRef;

export function adminListMediaCleanupTasks(vars?: AdminListMediaCleanupTasksVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListMediaCleanupTasksData, AdminListMediaCleanupTasksVariables>;
export function adminListMediaCleanupTasks(dc: DataConnect, vars?: AdminListMediaCleanupTasksVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListMediaCleanupTasksData, AdminListMediaCleanupTasksVariables>;

interface AdminListMediaAssetsForStorageReportRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars?: AdminListMediaAssetsForStorageReportVariables): QueryRef<AdminListMediaAssetsForStorageReportData, AdminListMediaAssetsForStorageReportVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars?: AdminListMediaAssetsForStorageReportVariables): QueryRef<AdminListMediaAssetsForStorageReportData, AdminListMediaAssetsForStorageReportVariables>;
  operationName: string;
}
export const adminListMediaAssetsForStorageReportRef: AdminListMediaAssetsForStorageReportRef;

export function adminListMediaAssetsForStorageReport(vars?: AdminListMediaAssetsForStorageReportVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListMediaAssetsForStorageReportData, AdminListMediaAssetsForStorageReportVariables>;
export function adminListMediaAssetsForStorageReport(dc: DataConnect, vars?: AdminListMediaAssetsForStorageReportVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListMediaAssetsForStorageReportData, AdminListMediaAssetsForStorageReportVariables>;

interface ListMyStoryChangesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListMyStoryChangesVariables): QueryRef<ListMyStoryChangesData, ListMyStoryChangesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListMyStoryChangesVariables): QueryRef<ListMyStoryChangesData, ListMyStoryChangesVariables>;
  operationName: string;
}
export const listMyStoryChangesRef: ListMyStoryChangesRef;

export function listMyStoryChanges(vars: ListMyStoryChangesVariables, options?: ExecuteQueryOptions): QueryPromise<ListMyStoryChangesData, ListMyStoryChangesVariables>;
export function listMyStoryChanges(dc: DataConnect, vars: ListMyStoryChangesVariables, options?: ExecuteQueryOptions): QueryPromise<ListMyStoryChangesData, ListMyStoryChangesVariables>;

interface GetMyCurrentMediaSlotRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMyCurrentMediaSlotVariables): QueryRef<GetMyCurrentMediaSlotData, GetMyCurrentMediaSlotVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetMyCurrentMediaSlotVariables): QueryRef<GetMyCurrentMediaSlotData, GetMyCurrentMediaSlotVariables>;
  operationName: string;
}
export const getMyCurrentMediaSlotRef: GetMyCurrentMediaSlotRef;

export function getMyCurrentMediaSlot(vars: GetMyCurrentMediaSlotVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyCurrentMediaSlotData, GetMyCurrentMediaSlotVariables>;
export function getMyCurrentMediaSlot(dc: DataConnect, vars: GetMyCurrentMediaSlotVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyCurrentMediaSlotData, GetMyCurrentMediaSlotVariables>;

interface ListMyMediaSlotHistoryRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListMyMediaSlotHistoryVariables): QueryRef<ListMyMediaSlotHistoryData, ListMyMediaSlotHistoryVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListMyMediaSlotHistoryVariables): QueryRef<ListMyMediaSlotHistoryData, ListMyMediaSlotHistoryVariables>;
  operationName: string;
}
export const listMyMediaSlotHistoryRef: ListMyMediaSlotHistoryRef;

export function listMyMediaSlotHistory(vars: ListMyMediaSlotHistoryVariables, options?: ExecuteQueryOptions): QueryPromise<ListMyMediaSlotHistoryData, ListMyMediaSlotHistoryVariables>;
export function listMyMediaSlotHistory(dc: DataConnect, vars: ListMyMediaSlotHistoryVariables, options?: ExecuteQueryOptions): QueryPromise<ListMyMediaSlotHistoryData, ListMyMediaSlotHistoryVariables>;

interface AdminListOwnedStoriesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminListOwnedStoriesVariables): QueryRef<AdminListOwnedStoriesData, AdminListOwnedStoriesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminListOwnedStoriesVariables): QueryRef<AdminListOwnedStoriesData, AdminListOwnedStoriesVariables>;
  operationName: string;
}
export const adminListOwnedStoriesRef: AdminListOwnedStoriesRef;

export function adminListOwnedStories(vars: AdminListOwnedStoriesVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListOwnedStoriesData, AdminListOwnedStoriesVariables>;
export function adminListOwnedStories(dc: DataConnect, vars: AdminListOwnedStoriesVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListOwnedStoriesData, AdminListOwnedStoriesVariables>;

interface AdminListOwnedStoryCoverSlotsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminListOwnedStoryCoverSlotsVariables): QueryRef<AdminListOwnedStoryCoverSlotsData, AdminListOwnedStoryCoverSlotsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminListOwnedStoryCoverSlotsVariables): QueryRef<AdminListOwnedStoryCoverSlotsData, AdminListOwnedStoryCoverSlotsVariables>;
  operationName: string;
}
export const adminListOwnedStoryCoverSlotsRef: AdminListOwnedStoryCoverSlotsRef;

export function adminListOwnedStoryCoverSlots(vars: AdminListOwnedStoryCoverSlotsVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListOwnedStoryCoverSlotsData, AdminListOwnedStoryCoverSlotsVariables>;
export function adminListOwnedStoryCoverSlots(dc: DataConnect, vars: AdminListOwnedStoryCoverSlotsVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListOwnedStoryCoverSlotsData, AdminListOwnedStoryCoverSlotsVariables>;

interface AdminListOwnedStoryChangesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminListOwnedStoryChangesVariables): QueryRef<AdminListOwnedStoryChangesData, AdminListOwnedStoryChangesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminListOwnedStoryChangesVariables): QueryRef<AdminListOwnedStoryChangesData, AdminListOwnedStoryChangesVariables>;
  operationName: string;
}
export const adminListOwnedStoryChangesRef: AdminListOwnedStoryChangesRef;

export function adminListOwnedStoryChanges(vars: AdminListOwnedStoryChangesVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListOwnedStoryChangesData, AdminListOwnedStoryChangesVariables>;
export function adminListOwnedStoryChanges(dc: DataConnect, vars: AdminListOwnedStoryChangesVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListOwnedStoryChangesData, AdminListOwnedStoryChangesVariables>;

interface AdminGetPersistenceReceiptRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetPersistenceReceiptVariables): QueryRef<AdminGetPersistenceReceiptData, AdminGetPersistenceReceiptVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminGetPersistenceReceiptVariables): QueryRef<AdminGetPersistenceReceiptData, AdminGetPersistenceReceiptVariables>;
  operationName: string;
}
export const adminGetPersistenceReceiptRef: AdminGetPersistenceReceiptRef;

export function adminGetPersistenceReceipt(vars: AdminGetPersistenceReceiptVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetPersistenceReceiptData, AdminGetPersistenceReceiptVariables>;
export function adminGetPersistenceReceipt(dc: DataConnect, vars: AdminGetPersistenceReceiptVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetPersistenceReceiptData, AdminGetPersistenceReceiptVariables>;

interface AdminGetOwnedStoryGraphRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetOwnedStoryGraphVariables): QueryRef<AdminGetOwnedStoryGraphData, AdminGetOwnedStoryGraphVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminGetOwnedStoryGraphVariables): QueryRef<AdminGetOwnedStoryGraphData, AdminGetOwnedStoryGraphVariables>;
  operationName: string;
}
export const adminGetOwnedStoryGraphRef: AdminGetOwnedStoryGraphRef;

export function adminGetOwnedStoryGraph(vars: AdminGetOwnedStoryGraphVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedStoryGraphData, AdminGetOwnedStoryGraphVariables>;
export function adminGetOwnedStoryGraph(dc: DataConnect, vars: AdminGetOwnedStoryGraphVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedStoryGraphData, AdminGetOwnedStoryGraphVariables>;

interface AdminGetOwnedChapterContentGraphRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetOwnedChapterContentGraphVariables): QueryRef<AdminGetOwnedChapterContentGraphData, AdminGetOwnedChapterContentGraphVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminGetOwnedChapterContentGraphVariables): QueryRef<AdminGetOwnedChapterContentGraphData, AdminGetOwnedChapterContentGraphVariables>;
  operationName: string;
}
export const adminGetOwnedChapterContentGraphRef: AdminGetOwnedChapterContentGraphRef;

export function adminGetOwnedChapterContentGraph(vars: AdminGetOwnedChapterContentGraphVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedChapterContentGraphData, AdminGetOwnedChapterContentGraphVariables>;
export function adminGetOwnedChapterContentGraph(dc: DataConnect, vars: AdminGetOwnedChapterContentGraphVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedChapterContentGraphData, AdminGetOwnedChapterContentGraphVariables>;

interface AdminListOwnedStorySeedsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminListOwnedStorySeedsVariables): QueryRef<AdminListOwnedStorySeedsData, AdminListOwnedStorySeedsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminListOwnedStorySeedsVariables): QueryRef<AdminListOwnedStorySeedsData, AdminListOwnedStorySeedsVariables>;
  operationName: string;
}
export const adminListOwnedStorySeedsRef: AdminListOwnedStorySeedsRef;

export function adminListOwnedStorySeeds(vars: AdminListOwnedStorySeedsVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListOwnedStorySeedsData, AdminListOwnedStorySeedsVariables>;
export function adminListOwnedStorySeeds(dc: DataConnect, vars: AdminListOwnedStorySeedsVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListOwnedStorySeedsData, AdminListOwnedStorySeedsVariables>;

interface AdminGetOwnedStorySeedGraphRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetOwnedStorySeedGraphVariables): QueryRef<AdminGetOwnedStorySeedGraphData, AdminGetOwnedStorySeedGraphVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminGetOwnedStorySeedGraphVariables): QueryRef<AdminGetOwnedStorySeedGraphData, AdminGetOwnedStorySeedGraphVariables>;
  operationName: string;
}
export const adminGetOwnedStorySeedGraphRef: AdminGetOwnedStorySeedGraphRef;

export function adminGetOwnedStorySeedGraph(vars: AdminGetOwnedStorySeedGraphVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedStorySeedGraphData, AdminGetOwnedStorySeedGraphVariables>;
export function adminGetOwnedStorySeedGraph(dc: DataConnect, vars: AdminGetOwnedStorySeedGraphVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedStorySeedGraphData, AdminGetOwnedStorySeedGraphVariables>;

interface AdminGetUserProfileGraphRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetUserProfileGraphVariables): QueryRef<AdminGetUserProfileGraphData, AdminGetUserProfileGraphVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminGetUserProfileGraphVariables): QueryRef<AdminGetUserProfileGraphData, AdminGetUserProfileGraphVariables>;
  operationName: string;
}
export const adminGetUserProfileGraphRef: AdminGetUserProfileGraphRef;

export function adminGetUserProfileGraph(vars: AdminGetUserProfileGraphVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetUserProfileGraphData, AdminGetUserProfileGraphVariables>;
export function adminGetUserProfileGraph(dc: DataConnect, vars: AdminGetUserProfileGraphVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetUserProfileGraphData, AdminGetUserProfileGraphVariables>;

interface AdminGetOwnedMediaSlotRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetOwnedMediaSlotVariables): QueryRef<AdminGetOwnedMediaSlotData, AdminGetOwnedMediaSlotVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminGetOwnedMediaSlotVariables): QueryRef<AdminGetOwnedMediaSlotData, AdminGetOwnedMediaSlotVariables>;
  operationName: string;
}
export const adminGetOwnedMediaSlotRef: AdminGetOwnedMediaSlotRef;

export function adminGetOwnedMediaSlot(vars: AdminGetOwnedMediaSlotVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedMediaSlotData, AdminGetOwnedMediaSlotVariables>;
export function adminGetOwnedMediaSlot(dc: DataConnect, vars: AdminGetOwnedMediaSlotVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedMediaSlotData, AdminGetOwnedMediaSlotVariables>;

interface AdminListOwnedMediaSlotHistoryRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminListOwnedMediaSlotHistoryVariables): QueryRef<AdminListOwnedMediaSlotHistoryData, AdminListOwnedMediaSlotHistoryVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminListOwnedMediaSlotHistoryVariables): QueryRef<AdminListOwnedMediaSlotHistoryData, AdminListOwnedMediaSlotHistoryVariables>;
  operationName: string;
}
export const adminListOwnedMediaSlotHistoryRef: AdminListOwnedMediaSlotHistoryRef;

export function adminListOwnedMediaSlotHistory(vars: AdminListOwnedMediaSlotHistoryVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListOwnedMediaSlotHistoryData, AdminListOwnedMediaSlotHistoryVariables>;
export function adminListOwnedMediaSlotHistory(dc: DataConnect, vars: AdminListOwnedMediaSlotHistoryVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListOwnedMediaSlotHistoryData, AdminListOwnedMediaSlotHistoryVariables>;

interface AdminGetMediaUploadReceiptRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetMediaUploadReceiptVariables): QueryRef<AdminGetMediaUploadReceiptData, AdminGetMediaUploadReceiptVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminGetMediaUploadReceiptVariables): QueryRef<AdminGetMediaUploadReceiptData, AdminGetMediaUploadReceiptVariables>;
  operationName: string;
}
export const adminGetMediaUploadReceiptRef: AdminGetMediaUploadReceiptRef;

export function adminGetMediaUploadReceipt(vars: AdminGetMediaUploadReceiptVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetMediaUploadReceiptData, AdminGetMediaUploadReceiptVariables>;
export function adminGetMediaUploadReceipt(dc: DataConnect, vars: AdminGetMediaUploadReceiptVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetMediaUploadReceiptData, AdminGetMediaUploadReceiptVariables>;

interface AdminGetOwnedStorageQuotaReservationRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetOwnedStorageQuotaReservationVariables): QueryRef<AdminGetOwnedStorageQuotaReservationData, AdminGetOwnedStorageQuotaReservationVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminGetOwnedStorageQuotaReservationVariables): QueryRef<AdminGetOwnedStorageQuotaReservationData, AdminGetOwnedStorageQuotaReservationVariables>;
  operationName: string;
}
export const adminGetOwnedStorageQuotaReservationRef: AdminGetOwnedStorageQuotaReservationRef;

export function adminGetOwnedStorageQuotaReservation(vars: AdminGetOwnedStorageQuotaReservationVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedStorageQuotaReservationData, AdminGetOwnedStorageQuotaReservationVariables>;
export function adminGetOwnedStorageQuotaReservation(dc: DataConnect, vars: AdminGetOwnedStorageQuotaReservationVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedStorageQuotaReservationData, AdminGetOwnedStorageQuotaReservationVariables>;

interface AdminGetMediaDeletionIntentRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetMediaDeletionIntentVariables): QueryRef<AdminGetMediaDeletionIntentData, AdminGetMediaDeletionIntentVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminGetMediaDeletionIntentVariables): QueryRef<AdminGetMediaDeletionIntentData, AdminGetMediaDeletionIntentVariables>;
  operationName: string;
}
export const adminGetMediaDeletionIntentRef: AdminGetMediaDeletionIntentRef;

export function adminGetMediaDeletionIntent(vars: AdminGetMediaDeletionIntentVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetMediaDeletionIntentData, AdminGetMediaDeletionIntentVariables>;
export function adminGetMediaDeletionIntent(dc: DataConnect, vars: AdminGetMediaDeletionIntentVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetMediaDeletionIntentData, AdminGetMediaDeletionIntentVariables>;

interface AdminListStoryDeletionMediaCandidatesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminListStoryDeletionMediaCandidatesVariables): QueryRef<AdminListStoryDeletionMediaCandidatesData, AdminListStoryDeletionMediaCandidatesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminListStoryDeletionMediaCandidatesVariables): QueryRef<AdminListStoryDeletionMediaCandidatesData, AdminListStoryDeletionMediaCandidatesVariables>;
  operationName: string;
}
export const adminListStoryDeletionMediaCandidatesRef: AdminListStoryDeletionMediaCandidatesRef;

export function adminListStoryDeletionMediaCandidates(vars: AdminListStoryDeletionMediaCandidatesVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListStoryDeletionMediaCandidatesData, AdminListStoryDeletionMediaCandidatesVariables>;
export function adminListStoryDeletionMediaCandidates(dc: DataConnect, vars: AdminListStoryDeletionMediaCandidatesVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListStoryDeletionMediaCandidatesData, AdminListStoryDeletionMediaCandidatesVariables>;

interface AdminListStoryDeletionJobsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars?: AdminListStoryDeletionJobsVariables): QueryRef<AdminListStoryDeletionJobsData, AdminListStoryDeletionJobsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars?: AdminListStoryDeletionJobsVariables): QueryRef<AdminListStoryDeletionJobsData, AdminListStoryDeletionJobsVariables>;
  operationName: string;
}
export const adminListStoryDeletionJobsRef: AdminListStoryDeletionJobsRef;

export function adminListStoryDeletionJobs(vars?: AdminListStoryDeletionJobsVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListStoryDeletionJobsData, AdminListStoryDeletionJobsVariables>;
export function adminListStoryDeletionJobs(dc: DataConnect, vars?: AdminListStoryDeletionJobsVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListStoryDeletionJobsData, AdminListStoryDeletionJobsVariables>;

interface AdminListExpiredStoryTombstonesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminListExpiredStoryTombstonesVariables): QueryRef<AdminListExpiredStoryTombstonesData, AdminListExpiredStoryTombstonesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminListExpiredStoryTombstonesVariables): QueryRef<AdminListExpiredStoryTombstonesData, AdminListExpiredStoryTombstonesVariables>;
  operationName: string;
}
export const adminListExpiredStoryTombstonesRef: AdminListExpiredStoryTombstonesRef;

export function adminListExpiredStoryTombstones(vars: AdminListExpiredStoryTombstonesVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListExpiredStoryTombstonesData, AdminListExpiredStoryTombstonesVariables>;
export function adminListExpiredStoryTombstones(dc: DataConnect, vars: AdminListExpiredStoryTombstonesVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListExpiredStoryTombstonesData, AdminListExpiredStoryTombstonesVariables>;

interface AdminGetStorageUsageReportRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<AdminGetStorageUsageReportData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<AdminGetStorageUsageReportData, undefined>;
  operationName: string;
}
export const adminGetStorageUsageReportRef: AdminGetStorageUsageReportRef;

export function adminGetStorageUsageReport(options?: ExecuteQueryOptions): QueryPromise<AdminGetStorageUsageReportData, undefined>;
export function adminGetStorageUsageReport(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<AdminGetStorageUsageReportData, undefined>;

interface AdminListOwnedGlossaryTermsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminListOwnedGlossaryTermsVariables): QueryRef<AdminListOwnedGlossaryTermsData, AdminListOwnedGlossaryTermsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminListOwnedGlossaryTermsVariables): QueryRef<AdminListOwnedGlossaryTermsData, AdminListOwnedGlossaryTermsVariables>;
  operationName: string;
}
export const adminListOwnedGlossaryTermsRef: AdminListOwnedGlossaryTermsRef;

export function adminListOwnedGlossaryTerms(vars: AdminListOwnedGlossaryTermsVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListOwnedGlossaryTermsData, AdminListOwnedGlossaryTermsVariables>;
export function adminListOwnedGlossaryTerms(dc: DataConnect, vars: AdminListOwnedGlossaryTermsVariables, options?: ExecuteQueryOptions): QueryPromise<AdminListOwnedGlossaryTermsData, AdminListOwnedGlossaryTermsVariables>;

interface AdminGetImageQuotaConsumptionRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetImageQuotaConsumptionVariables): QueryRef<AdminGetImageQuotaConsumptionData, AdminGetImageQuotaConsumptionVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminGetImageQuotaConsumptionVariables): QueryRef<AdminGetImageQuotaConsumptionData, AdminGetImageQuotaConsumptionVariables>;
  operationName: string;
}
export const adminGetImageQuotaConsumptionRef: AdminGetImageQuotaConsumptionRef;

export function adminGetImageQuotaConsumption(vars: AdminGetImageQuotaConsumptionVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetImageQuotaConsumptionData, AdminGetImageQuotaConsumptionVariables>;
export function adminGetImageQuotaConsumption(dc: DataConnect, vars: AdminGetImageQuotaConsumptionVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetImageQuotaConsumptionData, AdminGetImageQuotaConsumptionVariables>;

interface AdminGetOwnedPortraitAssetRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetOwnedPortraitAssetVariables): QueryRef<AdminGetOwnedPortraitAssetData, AdminGetOwnedPortraitAssetVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminGetOwnedPortraitAssetVariables): QueryRef<AdminGetOwnedPortraitAssetData, AdminGetOwnedPortraitAssetVariables>;
  operationName: string;
}
export const adminGetOwnedPortraitAssetRef: AdminGetOwnedPortraitAssetRef;

export function adminGetOwnedPortraitAsset(vars: AdminGetOwnedPortraitAssetVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedPortraitAssetData, AdminGetOwnedPortraitAssetVariables>;
export function adminGetOwnedPortraitAsset(dc: DataConnect, vars: AdminGetOwnedPortraitAssetVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetOwnedPortraitAssetData, AdminGetOwnedPortraitAssetVariables>;

interface AdminGetAdminOverviewRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AdminGetAdminOverviewVariables): QueryRef<AdminGetAdminOverviewData, AdminGetAdminOverviewVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AdminGetAdminOverviewVariables): QueryRef<AdminGetAdminOverviewData, AdminGetAdminOverviewVariables>;
  operationName: string;
}
export const adminGetAdminOverviewRef: AdminGetAdminOverviewRef;

export function adminGetAdminOverview(vars: AdminGetAdminOverviewVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetAdminOverviewData, AdminGetAdminOverviewVariables>;
export function adminGetAdminOverview(dc: DataConnect, vars: AdminGetAdminOverviewVariables, options?: ExecuteQueryOptions): QueryPromise<AdminGetAdminOverviewData, AdminGetAdminOverviewVariables>;

