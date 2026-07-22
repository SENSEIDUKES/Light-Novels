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

export enum MediaVisibility {
  PRIVATE = "PRIVATE",
  PUBLIC = "PUBLIC",
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



export interface AbilityProgressionEvent_Key {
  id: UUIDString;
  __typename?: 'AbilityProgressionEvent_Key';
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

export interface AdminCompleteMediaCleanupData {
  mediaCleanupTask_update?: MediaCleanupTask_Key | null;
  mediaAsset_update?: MediaAsset_Key | null;
}

export interface AdminCompleteMediaCleanupVariables {
  taskId: UUIDString;
  assetId: UUIDString;
}

export interface AdminFailMediaCleanupData {
  mediaCleanupTask_update?: MediaCleanupTask_Key | null;
}

export interface AdminFailMediaCleanupVariables {
  taskId: UUIDString;
  lastError: string;
  nextAttemptAt: TimestampString;
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
    assetId?: UUIDString | null;
    ownerUid: string;
    bucket: string;
    objectKey: string;
    reason: string;
    status: MediaCleanupStatus;
    attemptCount: number;
    lastError?: string | null;
    nextAttemptAt: TimestampString;
    createdAt: TimestampString;
  } & MediaCleanupTask_Key)[];
}

export interface AdminListMediaCleanupTasksVariables {
  limit?: number | null;
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

export interface Bookmark_Key {
  id: UUIDString;
  __typename?: 'Bookmark_Key';
}

export interface ChapterBlockAttribute_Key {
  blockId: UUIDString;
  attributeKey: string;
  __typename?: 'ChapterBlockAttribute_Key';
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

export interface ChapterSceneFingerprint_Key {
  id: UUIDString;
  __typename?: 'ChapterSceneFingerprint_Key';
}

export interface ChapterTranslation_Key {
  chapterId: UUIDString;
  languageCode: string;
  __typename?: 'ChapterTranslation_Key';
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

export interface MediaDerivative_Key {
  id: UUIDString;
  __typename?: 'MediaDerivative_Key';
}

export interface MediaUploadAttempt_Key {
  id: UUIDString;
  __typename?: 'MediaUploadAttempt_Key';
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

export interface StoryArc_Key {
  id: UUIDString;
  __typename?: 'StoryArc_Key';
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

export interface StoryRule_Key {
  id: UUIDString;
  __typename?: 'StoryRule_Key';
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

