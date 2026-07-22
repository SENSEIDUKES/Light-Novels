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
export enum MediaVisibility {
  PRIVATE = "PRIVATE",
  PUBLIC = "PUBLIC",
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

