import { queryRef, executeQuery, validateArgsWithOptions, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const AccountRole = {
  USER: "USER",
  ADMIN: "ADMIN",
  OWNER: "OWNER",
}

export const ArcStatus = {
  PLANNED: "PLANNED",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  ARCHIVED: "ARCHIVED",
}

export const ChapterStatus = {
  LOCKED: "LOCKED",
  UNLOCKED: "UNLOCKED",
  GENERATING: "GENERATING",
  UNREAD: "UNREAD",
  READ: "READ",
  SEALED: "SEALED",
  FAILED: "FAILED",
  DELETED: "DELETED",
}

export const CodexEntityKind = {
  CHARACTER: "CHARACTER",
  BEAST: "BEAST",
  LOCATION: "LOCATION",
  ARTIFACT: "ARTIFACT",
  FACTION: "FACTION",
  ABILITY: "ABILITY",
  MYSTERY: "MYSTERY",
  POWER: "POWER",
  EVENT: "EVENT",
  GLOSSARY: "GLOSSARY",
  OTHER: "OTHER",
}

export const CodexRelevanceState = {
  ACTIVE: "ACTIVE",
  WARM: "WARM",
  DORMANT: "DORMANT",
  ARCHIVED: "ARCHIVED",
  REACTIVATED: "REACTIVATED",
}

export const GenerationJobKind = {
  STORY_BLUEPRINT: "STORY_BLUEPRINT",
  STORY_ARC: "STORY_ARC",
  CHAPTER: "CHAPTER",
  CONTINUITY: "CONTINUITY",
  TRANSLATION: "TRANSLATION",
  IMAGE: "IMAGE",
  AUDIO: "AUDIO",
  VIDEO: "VIDEO",
  EXPORT: "EXPORT",
  OTHER: "OTHER",
}

export const GenerationJobStatus = {
  QUEUED: "QUEUED",
  RUNNING: "RUNNING",
  PAUSED: "PAUSED",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
}

export const MediaAssetStatus = {
  GENERATING: "GENERATING",
  PROCESSING: "PROCESSING",
  UPLOADING: "UPLOADING",
  READY: "READY",
  FAILED: "FAILED",
  ARCHIVED: "ARCHIVED",
  DELETED: "DELETED",
  ORPHANED: "ORPHANED",
  PENDING_CLEANUP: "PENDING_CLEANUP",
}

export const MediaAssetType = {
  IMAGE: "IMAGE",
  AUDIO: "AUDIO",
  VIDEO: "VIDEO",
  MOTION_COVER: "MOTION_COVER",
  PDF: "PDF",
  EPUB: "EPUB",
  MANGA_PAGE: "MANGA_PAGE",
  EXPORT: "EXPORT",
  OTHER: "OTHER",
}

export const MediaCleanupStatus = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
}

export const MediaDeletionIntentStatus = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
}

export const MediaVisibility = {
  PRIVATE: "PRIVATE",
  PUBLIC: "PUBLIC",
}

export const PlotThreadStatus = {
  ACTIVE: "ACTIVE",
  RESOLVED: "RESOLVED",
  ARCHIVED: "ARCHIVED",
}

export const StorageQuotaReservationStatus = {
  RESERVED: "RESERVED",
  COMMITTED: "COMMITTED",
  RELEASED: "RELEASED",
  EXPIRED: "EXPIRED",
}

export const StoryChangeKind = {
  UPSERTED: "UPSERTED",
  CHAPTER_UPDATED: "CHAPTER_UPDATED",
  PROFILE_UPDATED: "PROFILE_UPDATED",
  DELETED: "DELETED",
}

export const StoryDeletionStageKind = {
  TOMBSTONE: "TOMBSTONE",
  STRUCTURED_DATA: "STRUCTURED_DATA",
  MEDIA: "MEDIA",
  LOCAL_CACHE: "LOCAL_CACHE",
  FINALIZE: "FINALIZE",
}

export const StoryDeletionStageStatus = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
}

export const StoryDeletionStatus = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
}

export const StoryMemberRole = {
  OWNER: "OWNER",
  EDITOR: "EDITOR",
  READER: "READER",
}

export const StoryStatus = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  ARCHIVED: "ARCHIVED",
  DELETED: "DELETED",
}

export const StoryVisibility = {
  PRIVATE: "PRIVATE",
  SHARED: "SHARED",
  PUBLIC: "PUBLIC",
}

export const SubscriptionTier = {
  MORTAL: "MORTAL",
  OUTER_SECT: "OUTER_SECT",
  INNER_SECT: "INNER_SECT",
  SECT_MASTER: "SECT_MASTER",
  IMMORTAL: "IMMORTAL",
}

export const connectorConfig = {
  connector: 'celestial-library',
  service: 'celestial-library',
  location: 'us-west2'
};
export const upsertMyAccountRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertMyAccount');
}
upsertMyAccountRef.operationName = 'UpsertMyAccount';

export function upsertMyAccount(dc) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dc, undefined);
  return executeMutation(upsertMyAccountRef(dcInstance, inputVars));
}

export const createFoundationProbeRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateFoundationProbe', inputVars);
}
createFoundationProbeRef.operationName = 'CreateFoundationProbe';

export function createFoundationProbe(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createFoundationProbeRef(dcInstance, inputVars));
}

export const deleteMyFoundationProbeRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteMyFoundationProbe', inputVars);
}
deleteMyFoundationProbeRef.operationName = 'DeleteMyFoundationProbe';

export function deleteMyFoundationProbe(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(deleteMyFoundationProbeRef(dcInstance, inputVars));
}

export const createStoryWithFirstChapterRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateStoryWithFirstChapter', inputVars);
}
createStoryWithFirstChapterRef.operationName = 'CreateStoryWithFirstChapter';

export function createStoryWithFirstChapter(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createStoryWithFirstChapterRef(dcInstance, inputVars));
}

export const createMyChapterRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateMyChapter', inputVars);
}
createMyChapterRef.operationName = 'CreateMyChapter';

export function createMyChapter(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createMyChapterRef(dcInstance, inputVars));
}

export const softDeleteMyStoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'SoftDeleteMyStory', inputVars);
}
softDeleteMyStoryRef.operationName = 'SoftDeleteMyStory';

export function softDeleteMyStory(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(softDeleteMyStoryRef(dcInstance, inputVars));
}

export const adminPurgeFoundationProbeRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminPurgeFoundationProbe', inputVars);
}
adminPurgeFoundationProbeRef.operationName = 'AdminPurgeFoundationProbe';

export function adminPurgeFoundationProbe(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminPurgeFoundationProbeRef(dcInstance, inputVars));
}

export const adminPurgeFoundationStoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminPurgeFoundationStory', inputVars);
}
adminPurgeFoundationStoryRef.operationName = 'AdminPurgeFoundationStory';

export function adminPurgeFoundationStory(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminPurgeFoundationStoryRef(dcInstance, inputVars));
}

export const adminReserveMediaAssetRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminReserveMediaAsset', inputVars);
}
adminReserveMediaAssetRef.operationName = 'AdminReserveMediaAsset';

export function adminReserveMediaAsset(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminReserveMediaAssetRef(dcInstance, inputVars));
}

export const adminCommitMediaAssetReadyRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminCommitMediaAssetReady', inputVars);
}
adminCommitMediaAssetReadyRef.operationName = 'AdminCommitMediaAssetReady';

export function adminCommitMediaAssetReady(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminCommitMediaAssetReadyRef(dcInstance, inputVars));
}

export const adminCommitMediaAssetReplacementRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminCommitMediaAssetReplacement', inputVars);
}
adminCommitMediaAssetReplacementRef.operationName = 'AdminCommitMediaAssetReplacement';

export function adminCommitMediaAssetReplacement(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminCommitMediaAssetReplacementRef(dcInstance, inputVars));
}

export const adminMarkMediaAssetFailedRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminMarkMediaAssetFailed', inputVars);
}
adminMarkMediaAssetFailedRef.operationName = 'AdminMarkMediaAssetFailed';

export function adminMarkMediaAssetFailed(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminMarkMediaAssetFailedRef(dcInstance, inputVars));
}

export const adminMarkMediaAssetPendingCleanupRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminMarkMediaAssetPendingCleanup', inputVars);
}
adminMarkMediaAssetPendingCleanupRef.operationName = 'AdminMarkMediaAssetPendingCleanup';

export function adminMarkMediaAssetPendingCleanup(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminMarkMediaAssetPendingCleanupRef(dcInstance, inputVars));
}

export const adminRequestMediaAssetDeletionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminRequestMediaAssetDeletion', inputVars);
}
adminRequestMediaAssetDeletionRef.operationName = 'AdminRequestMediaAssetDeletion';

export function adminRequestMediaAssetDeletion(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminRequestMediaAssetDeletionRef(dcInstance, inputVars));
}

export const adminCompleteMediaCleanupRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminCompleteMediaCleanup', inputVars);
}
adminCompleteMediaCleanupRef.operationName = 'AdminCompleteMediaCleanup';

export function adminCompleteMediaCleanup(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminCompleteMediaCleanupRef(dcInstance, inputVars));
}

export const adminFailMediaCleanupRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminFailMediaCleanup', inputVars);
}
adminFailMediaCleanupRef.operationName = 'AdminFailMediaCleanup';

export function adminFailMediaCleanup(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminFailMediaCleanupRef(dcInstance, inputVars));
}

export const adminDeleteOwnedStoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminDeleteOwnedStory', inputVars);
}
adminDeleteOwnedStoryRef.operationName = 'AdminDeleteOwnedStory';

export function adminDeleteOwnedStory(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminDeleteOwnedStoryRef(dcInstance, inputVars));
}

export const adminClaimStoryDeletionJobRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminClaimStoryDeletionJob', inputVars);
}
adminClaimStoryDeletionJobRef.operationName = 'AdminClaimStoryDeletionJob';

export function adminClaimStoryDeletionJob(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminClaimStoryDeletionJobRef(dcInstance, inputVars));
}

export const adminFailStoryDeletionJobRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminFailStoryDeletionJob', inputVars);
}
adminFailStoryDeletionJobRef.operationName = 'AdminFailStoryDeletionJob';

export function adminFailStoryDeletionJob(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminFailStoryDeletionJobRef(dcInstance, inputVars));
}

export const adminAdvanceStoryDeletionJobRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminAdvanceStoryDeletionJob', inputVars);
}
adminAdvanceStoryDeletionJobRef.operationName = 'AdminAdvanceStoryDeletionJob';

export function adminAdvanceStoryDeletionJob(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminAdvanceStoryDeletionJobRef(dcInstance, inputVars));
}

export const adminCompleteStoryDeletionJobRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminCompleteStoryDeletionJob', inputVars);
}
adminCompleteStoryDeletionJobRef.operationName = 'AdminCompleteStoryDeletionJob';

export function adminCompleteStoryDeletionJob(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminCompleteStoryDeletionJobRef(dcInstance, inputVars));
}

export const adminReserveStorageQuotaRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminReserveStorageQuota', inputVars);
}
adminReserveStorageQuotaRef.operationName = 'AdminReserveStorageQuota';

export function adminReserveStorageQuota(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminReserveStorageQuotaRef(dcInstance, inputVars));
}

export const adminReleaseStorageQuotaReservationRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminReleaseStorageQuotaReservation', inputVars);
}
adminReleaseStorageQuotaReservationRef.operationName = 'AdminReleaseStorageQuotaReservation';

export function adminReleaseStorageQuotaReservation(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminReleaseStorageQuotaReservationRef(dcInstance, inputVars));
}

export const adminReserveMediaAssetIdempotentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminReserveMediaAssetIdempotent', inputVars);
}
adminReserveMediaAssetIdempotentRef.operationName = 'AdminReserveMediaAssetIdempotent';

export function adminReserveMediaAssetIdempotent(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminReserveMediaAssetIdempotentRef(dcInstance, inputVars));
}

export const adminCommitMediaAssetToSlotRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminCommitMediaAssetToSlot', inputVars);
}
adminCommitMediaAssetToSlotRef.operationName = 'AdminCommitMediaAssetToSlot';

export function adminCommitMediaAssetToSlot(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminCommitMediaAssetToSlotRef(dcInstance, inputVars));
}

export const adminSelectOwnedMediaSlotAssetRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminSelectOwnedMediaSlotAsset', inputVars);
}
adminSelectOwnedMediaSlotAssetRef.operationName = 'AdminSelectOwnedMediaSlotAsset';

export function adminSelectOwnedMediaSlotAsset(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminSelectOwnedMediaSlotAssetRef(dcInstance, inputVars));
}

export const adminSelectUserPortraitRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminSelectUserPortrait', inputVars);
}
adminSelectUserPortraitRef.operationName = 'AdminSelectUserPortrait';

export function adminSelectUserPortrait(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminSelectUserPortraitRef(dcInstance, inputVars));
}

export const adminEnsureMediaDeletionIntentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminEnsureMediaDeletionIntent', inputVars);
}
adminEnsureMediaDeletionIntentRef.operationName = 'AdminEnsureMediaDeletionIntent';

export function adminEnsureMediaDeletionIntent(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminEnsureMediaDeletionIntentRef(dcInstance, inputVars));
}

export const adminClaimMediaCleanupTaskRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminClaimMediaCleanupTask', inputVars);
}
adminClaimMediaCleanupTaskRef.operationName = 'AdminClaimMediaCleanupTask';

export function adminClaimMediaCleanupTask(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminClaimMediaCleanupTaskRef(dcInstance, inputVars));
}

export const adminCompleteMediaDeletionIntentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminCompleteMediaDeletionIntent', inputVars);
}
adminCompleteMediaDeletionIntentRef.operationName = 'AdminCompleteMediaDeletionIntent';

export function adminCompleteMediaDeletionIntent(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminCompleteMediaDeletionIntentRef(dcInstance, inputVars));
}

export const adminFailMediaDeletionIntentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminFailMediaDeletionIntent', inputVars);
}
adminFailMediaDeletionIntentRef.operationName = 'AdminFailMediaDeletionIntent';

export function adminFailMediaDeletionIntent(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminFailMediaDeletionIntentRef(dcInstance, inputVars));
}

export const adminDeleteOwnedStorySeedRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminDeleteOwnedStorySeed', inputVars);
}
adminDeleteOwnedStorySeedRef.operationName = 'AdminDeleteOwnedStorySeed';

export function adminDeleteOwnedStorySeed(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminDeleteOwnedStorySeedRef(dcInstance, inputVars));
}

export const adminDeleteOwnedGlossaryTermRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminDeleteOwnedGlossaryTerm', inputVars);
}
adminDeleteOwnedGlossaryTermRef.operationName = 'AdminDeleteOwnedGlossaryTerm';

export function adminDeleteOwnedGlossaryTerm(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminDeleteOwnedGlossaryTermRef(dcInstance, inputVars));
}

export const adminConsumeImageGenerationQuotaRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminConsumeImageGenerationQuota', inputVars);
}
adminConsumeImageGenerationQuotaRef.operationName = 'AdminConsumeImageGenerationQuota';

export function adminConsumeImageGenerationQuota(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminConsumeImageGenerationQuotaRef(dcInstance, inputVars));
}

export const adminRecoverPendingUserPortraitsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminRecoverPendingUserPortraits', inputVars);
}
adminRecoverPendingUserPortraitsRef.operationName = 'AdminRecoverPendingUserPortraits';

export function adminRecoverPendingUserPortraits(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminRecoverPendingUserPortraitsRef(dcInstance, inputVars));
}

export const adminUpdateAccountAccessRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminUpdateAccountAccess', inputVars);
}
adminUpdateAccountAccessRef.operationName = 'AdminUpdateAccountAccess';

export function adminUpdateAccountAccess(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminUpdateAccountAccessRef(dcInstance, inputVars));
}

export const adminDeleteStoryAsAdminRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminDeleteStoryAsAdmin', inputVars);
}
adminDeleteStoryAsAdminRef.operationName = 'AdminDeleteStoryAsAdmin';

export function adminDeleteStoryAsAdmin(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminDeleteStoryAsAdminRef(dcInstance, inputVars));
}

export const getMyAccountRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMyAccount');
}
getMyAccountRef.operationName = 'GetMyAccount';

export function getMyAccount(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(getMyAccountRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const listMyFoundationProbesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMyFoundationProbes');
}
listMyFoundationProbesRef.operationName = 'ListMyFoundationProbes';

export function listMyFoundationProbes(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listMyFoundationProbesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const getMyFoundationProbeRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMyFoundationProbe', inputVars);
}
getMyFoundationProbeRef.operationName = 'GetMyFoundationProbe';

export function getMyFoundationProbe(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getMyFoundationProbeRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const listMyStoriesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMyStories');
}
listMyStoriesRef.operationName = 'ListMyStories';

export function listMyStories(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listMyStoriesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const getMyStoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMyStory', inputVars);
}
getMyStoryRef.operationName = 'GetMyStory';

export function getMyStory(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getMyStoryRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const getMyChapterRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMyChapter', inputVars);
}
getMyChapterRef.operationName = 'GetMyChapter';

export function getMyChapter(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getMyChapterRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const getMyMediaAssetRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMyMediaAsset', inputVars);
}
getMyMediaAssetRef.operationName = 'GetMyMediaAsset';

export function getMyMediaAsset(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getMyMediaAssetRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const listMyMediaAssetsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMyMediaAssets', inputVars);
}
listMyMediaAssetsRef.operationName = 'ListMyMediaAssets';

export function listMyMediaAssets(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, false);
  return executeQuery(listMyMediaAssetsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const adminGetOwnedMediaAssetRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetOwnedMediaAsset', inputVars);
}
adminGetOwnedMediaAssetRef.operationName = 'AdminGetOwnedMediaAsset';

export function adminGetOwnedMediaAsset(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetOwnedMediaAssetRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const adminGetOwnedStoryScopeRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetOwnedStoryScope', inputVars);
}
adminGetOwnedStoryScopeRef.operationName = 'AdminGetOwnedStoryScope';

export function adminGetOwnedStoryScope(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetOwnedStoryScopeRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const adminGetOwnedChapterScopeRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetOwnedChapterScope', inputVars);
}
adminGetOwnedChapterScopeRef.operationName = 'AdminGetOwnedChapterScope';

export function adminGetOwnedChapterScope(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetOwnedChapterScopeRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const adminGetOwnedEntityScopeRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetOwnedEntityScope', inputVars);
}
adminGetOwnedEntityScopeRef.operationName = 'AdminGetOwnedEntityScope';

export function adminGetOwnedEntityScope(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetOwnedEntityScopeRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const adminGetOwnedGenerationJobScopeRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetOwnedGenerationJobScope', inputVars);
}
adminGetOwnedGenerationJobScopeRef.operationName = 'AdminGetOwnedGenerationJobScope';

export function adminGetOwnedGenerationJobScope(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetOwnedGenerationJobScopeRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const adminGetOwnedMediaReplacementScopeRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetOwnedMediaReplacementScope', inputVars);
}
adminGetOwnedMediaReplacementScopeRef.operationName = 'AdminGetOwnedMediaReplacementScope';

export function adminGetOwnedMediaReplacementScope(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetOwnedMediaReplacementScopeRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const adminListStaleMediaUploadsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminListStaleMediaUploads', inputVars);
}
adminListStaleMediaUploadsRef.operationName = 'AdminListStaleMediaUploads';

export function adminListStaleMediaUploads(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminListStaleMediaUploadsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const adminListMediaCleanupTasksRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminListMediaCleanupTasks', inputVars);
}
adminListMediaCleanupTasksRef.operationName = 'AdminListMediaCleanupTasks';

export function adminListMediaCleanupTasks(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, false);
  return executeQuery(adminListMediaCleanupTasksRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const adminListMediaAssetsForStorageReportRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminListMediaAssetsForStorageReport', inputVars);
}
adminListMediaAssetsForStorageReportRef.operationName = 'AdminListMediaAssetsForStorageReport';

export function adminListMediaAssetsForStorageReport(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, false);
  return executeQuery(adminListMediaAssetsForStorageReportRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const listMyStoryChangesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMyStoryChanges', inputVars);
}
listMyStoryChangesRef.operationName = 'ListMyStoryChanges';

export function listMyStoryChanges(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listMyStoryChangesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const getMyCurrentMediaSlotRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMyCurrentMediaSlot', inputVars);
}
getMyCurrentMediaSlotRef.operationName = 'GetMyCurrentMediaSlot';

export function getMyCurrentMediaSlot(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getMyCurrentMediaSlotRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const listMyMediaSlotHistoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMyMediaSlotHistory', inputVars);
}
listMyMediaSlotHistoryRef.operationName = 'ListMyMediaSlotHistory';

export function listMyMediaSlotHistory(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listMyMediaSlotHistoryRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const adminListOwnedStoriesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminListOwnedStories', inputVars);
}
adminListOwnedStoriesRef.operationName = 'AdminListOwnedStories';

export function adminListOwnedStories(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminListOwnedStoriesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const adminListOwnedStoryChangesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminListOwnedStoryChanges', inputVars);
}
adminListOwnedStoryChangesRef.operationName = 'AdminListOwnedStoryChanges';

export function adminListOwnedStoryChanges(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminListOwnedStoryChangesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const adminGetPersistenceReceiptRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetPersistenceReceipt', inputVars);
}
adminGetPersistenceReceiptRef.operationName = 'AdminGetPersistenceReceipt';

export function adminGetPersistenceReceipt(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetPersistenceReceiptRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const adminGetOwnedStoryGraphRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetOwnedStoryGraph', inputVars);
}
adminGetOwnedStoryGraphRef.operationName = 'AdminGetOwnedStoryGraph';

export function adminGetOwnedStoryGraph(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetOwnedStoryGraphRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const adminGetOwnedChapterContentGraphRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetOwnedChapterContentGraph', inputVars);
}
adminGetOwnedChapterContentGraphRef.operationName = 'AdminGetOwnedChapterContentGraph';

export function adminGetOwnedChapterContentGraph(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetOwnedChapterContentGraphRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const adminListOwnedStorySeedsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminListOwnedStorySeeds', inputVars);
}
adminListOwnedStorySeedsRef.operationName = 'AdminListOwnedStorySeeds';

export function adminListOwnedStorySeeds(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminListOwnedStorySeedsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const adminGetOwnedStorySeedGraphRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetOwnedStorySeedGraph', inputVars);
}
adminGetOwnedStorySeedGraphRef.operationName = 'AdminGetOwnedStorySeedGraph';

export function adminGetOwnedStorySeedGraph(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetOwnedStorySeedGraphRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const adminGetUserProfileGraphRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetUserProfileGraph', inputVars);
}
adminGetUserProfileGraphRef.operationName = 'AdminGetUserProfileGraph';

export function adminGetUserProfileGraph(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetUserProfileGraphRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const adminGetOwnedMediaSlotRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetOwnedMediaSlot', inputVars);
}
adminGetOwnedMediaSlotRef.operationName = 'AdminGetOwnedMediaSlot';

export function adminGetOwnedMediaSlot(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetOwnedMediaSlotRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const adminListOwnedMediaSlotHistoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminListOwnedMediaSlotHistory', inputVars);
}
adminListOwnedMediaSlotHistoryRef.operationName = 'AdminListOwnedMediaSlotHistory';

export function adminListOwnedMediaSlotHistory(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminListOwnedMediaSlotHistoryRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const adminGetMediaUploadReceiptRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetMediaUploadReceipt', inputVars);
}
adminGetMediaUploadReceiptRef.operationName = 'AdminGetMediaUploadReceipt';

export function adminGetMediaUploadReceipt(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetMediaUploadReceiptRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const adminGetOwnedStorageQuotaReservationRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetOwnedStorageQuotaReservation', inputVars);
}
adminGetOwnedStorageQuotaReservationRef.operationName = 'AdminGetOwnedStorageQuotaReservation';

export function adminGetOwnedStorageQuotaReservation(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetOwnedStorageQuotaReservationRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const adminGetMediaDeletionIntentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetMediaDeletionIntent', inputVars);
}
adminGetMediaDeletionIntentRef.operationName = 'AdminGetMediaDeletionIntent';

export function adminGetMediaDeletionIntent(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetMediaDeletionIntentRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const adminListStoryDeletionMediaCandidatesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminListStoryDeletionMediaCandidates', inputVars);
}
adminListStoryDeletionMediaCandidatesRef.operationName = 'AdminListStoryDeletionMediaCandidates';

export function adminListStoryDeletionMediaCandidates(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminListStoryDeletionMediaCandidatesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const adminListStoryDeletionJobsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminListStoryDeletionJobs', inputVars);
}
adminListStoryDeletionJobsRef.operationName = 'AdminListStoryDeletionJobs';

export function adminListStoryDeletionJobs(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, false);
  return executeQuery(adminListStoryDeletionJobsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const adminGetStorageUsageReportRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetStorageUsageReport');
}
adminGetStorageUsageReportRef.operationName = 'AdminGetStorageUsageReport';

export function adminGetStorageUsageReport(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(adminGetStorageUsageReportRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const adminListOwnedGlossaryTermsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminListOwnedGlossaryTerms', inputVars);
}
adminListOwnedGlossaryTermsRef.operationName = 'AdminListOwnedGlossaryTerms';

export function adminListOwnedGlossaryTerms(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminListOwnedGlossaryTermsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const adminGetImageQuotaConsumptionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetImageQuotaConsumption', inputVars);
}
adminGetImageQuotaConsumptionRef.operationName = 'AdminGetImageQuotaConsumption';

export function adminGetImageQuotaConsumption(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetImageQuotaConsumptionRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const adminGetOwnedPortraitAssetRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetOwnedPortraitAsset', inputVars);
}
adminGetOwnedPortraitAssetRef.operationName = 'AdminGetOwnedPortraitAsset';

export function adminGetOwnedPortraitAsset(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetOwnedPortraitAssetRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const adminGetAdminOverviewRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetAdminOverview', inputVars);
}
adminGetAdminOverviewRef.operationName = 'AdminGetAdminOverview';

export function adminGetAdminOverview(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetAdminOverviewRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

