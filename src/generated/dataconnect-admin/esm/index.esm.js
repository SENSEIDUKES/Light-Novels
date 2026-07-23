import { validateAdminArgs } from 'firebase-admin/data-connect';

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
  serviceId: 'celestial-library',
  location: 'us-west2'
};

export function upsertMyAccount(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrOptions, options, undefined);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpsertMyAccount', undefined, inputOpts);
}

export function createFoundationProbe(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateFoundationProbe', inputVars, inputOpts);
}

export function deleteMyFoundationProbe(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('DeleteMyFoundationProbe', inputVars, inputOpts);
}

export function createStoryWithFirstChapter(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateStoryWithFirstChapter', inputVars, inputOpts);
}

export function createMyChapter(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateMyChapter', inputVars, inputOpts);
}

export function softDeleteMyStory(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('SoftDeleteMyStory', inputVars, inputOpts);
}

export function adminPurgeFoundationProbe(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminPurgeFoundationProbe', inputVars, inputOpts);
}

export function adminPurgeFoundationStory(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminPurgeFoundationStory', inputVars, inputOpts);
}

export function adminReserveMediaAsset(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminReserveMediaAsset', inputVars, inputOpts);
}

export function adminCommitMediaAssetReady(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminCommitMediaAssetReady', inputVars, inputOpts);
}

export function adminCommitMediaAssetReplacement(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminCommitMediaAssetReplacement', inputVars, inputOpts);
}

export function adminMarkMediaAssetFailed(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminMarkMediaAssetFailed', inputVars, inputOpts);
}

export function adminMarkMediaAssetPendingCleanup(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminMarkMediaAssetPendingCleanup', inputVars, inputOpts);
}

export function adminRequestMediaAssetDeletion(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminRequestMediaAssetDeletion', inputVars, inputOpts);
}

export function adminCompleteMediaCleanup(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminCompleteMediaCleanup', inputVars, inputOpts);
}

export function adminFailMediaCleanup(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminFailMediaCleanup', inputVars, inputOpts);
}

export function adminDeleteOwnedStory(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminDeleteOwnedStory', inputVars, inputOpts);
}

export function adminClaimStoryDeletionJob(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminClaimStoryDeletionJob', inputVars, inputOpts);
}

export function adminFailStoryDeletionJob(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminFailStoryDeletionJob', inputVars, inputOpts);
}

export function adminAdvanceStoryDeletionJob(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminAdvanceStoryDeletionJob', inputVars, inputOpts);
}

export function adminCompleteStoryDeletionJob(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminCompleteStoryDeletionJob', inputVars, inputOpts);
}

export function adminPurgeExpiredStoryTombstone(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminPurgeExpiredStoryTombstone', inputVars, inputOpts);
}

export function adminReserveStorageQuota(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminReserveStorageQuota', inputVars, inputOpts);
}

export function adminReleaseStorageQuotaReservation(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminReleaseStorageQuotaReservation', inputVars, inputOpts);
}

export function adminReserveMediaAssetIdempotent(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminReserveMediaAssetIdempotent', inputVars, inputOpts);
}

export function adminCommitMediaAssetToSlot(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminCommitMediaAssetToSlot', inputVars, inputOpts);
}

export function adminSelectOwnedMediaSlotAsset(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminSelectOwnedMediaSlotAsset', inputVars, inputOpts);
}

export function adminSelectUserPortrait(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminSelectUserPortrait', inputVars, inputOpts);
}

export function adminEnsureMediaDeletionIntent(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminEnsureMediaDeletionIntent', inputVars, inputOpts);
}

export function adminClaimMediaCleanupTask(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminClaimMediaCleanupTask', inputVars, inputOpts);
}

export function adminCompleteMediaDeletionIntent(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminCompleteMediaDeletionIntent', inputVars, inputOpts);
}

export function adminFailMediaDeletionIntent(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminFailMediaDeletionIntent', inputVars, inputOpts);
}

export function adminDeleteOwnedStorySeed(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminDeleteOwnedStorySeed', inputVars, inputOpts);
}

export function adminDeleteOwnedGlossaryTerm(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminDeleteOwnedGlossaryTerm', inputVars, inputOpts);
}

export function adminConsumeImageGenerationQuota(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminConsumeImageGenerationQuota', inputVars, inputOpts);
}

export function adminRecoverPendingUserPortraits(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminRecoverPendingUserPortraits', inputVars, inputOpts);
}

export function adminUpdateAccountAccess(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminUpdateAccountAccess', inputVars, inputOpts);
}

export function adminDeleteStoryAsAdmin(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminDeleteStoryAsAdmin', inputVars, inputOpts);
}

export function getMyAccount(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrOptions, options, undefined);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetMyAccount', undefined, inputOpts);
}

export function listMyFoundationProbes(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrOptions, options, undefined);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListMyFoundationProbes', undefined, inputOpts);
}

export function getMyFoundationProbe(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetMyFoundationProbe', inputVars, inputOpts);
}

export function listMyStories(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrOptions, options, undefined);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListMyStories', undefined, inputOpts);
}

export function getMyStory(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetMyStory', inputVars, inputOpts);
}

export function getMyChapter(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetMyChapter', inputVars, inputOpts);
}

export function getMyMediaAsset(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetMyMediaAsset', inputVars, inputOpts);
}

export function listMyMediaAssets(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, false);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListMyMediaAssets', inputVars, inputOpts);
}

export function adminGetOwnedMediaAsset(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetOwnedMediaAsset', inputVars, inputOpts);
}

export function adminGetOwnedStoryScope(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetOwnedStoryScope', inputVars, inputOpts);
}

export function adminGetOwnedChapterScope(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetOwnedChapterScope', inputVars, inputOpts);
}

export function adminGetOwnedEntityScope(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetOwnedEntityScope', inputVars, inputOpts);
}

export function adminGetOwnedGenerationJobScope(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetOwnedGenerationJobScope', inputVars, inputOpts);
}

export function adminGetOwnedMediaReplacementScope(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetOwnedMediaReplacementScope', inputVars, inputOpts);
}

export function adminListStaleMediaUploads(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminListStaleMediaUploads', inputVars, inputOpts);
}

export function adminListMediaCleanupTasks(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, false);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminListMediaCleanupTasks', inputVars, inputOpts);
}

export function adminListMediaAssetsForStorageReport(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, false);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminListMediaAssetsForStorageReport', inputVars, inputOpts);
}

export function listMyStoryChanges(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListMyStoryChanges', inputVars, inputOpts);
}

export function getMyCurrentMediaSlot(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetMyCurrentMediaSlot', inputVars, inputOpts);
}

export function listMyMediaSlotHistory(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListMyMediaSlotHistory', inputVars, inputOpts);
}

export function adminListOwnedStories(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminListOwnedStories', inputVars, inputOpts);
}

export function adminListOwnedStoryCoverSlots(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminListOwnedStoryCoverSlots', inputVars, inputOpts);
}

export function adminListOwnedStoryChanges(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminListOwnedStoryChanges', inputVars, inputOpts);
}

export function adminGetPersistenceReceipt(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetPersistenceReceipt', inputVars, inputOpts);
}

export function adminGetOwnedStoryGraph(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetOwnedStoryGraph', inputVars, inputOpts);
}

export function adminGetOwnedChapterContentGraph(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetOwnedChapterContentGraph', inputVars, inputOpts);
}

export function adminListOwnedStorySeeds(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminListOwnedStorySeeds', inputVars, inputOpts);
}

export function adminGetOwnedStorySeedGraph(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetOwnedStorySeedGraph', inputVars, inputOpts);
}

export function adminGetUserProfileGraph(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetUserProfileGraph', inputVars, inputOpts);
}

export function adminGetOwnedMediaSlot(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetOwnedMediaSlot', inputVars, inputOpts);
}

export function adminListOwnedMediaSlotHistory(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminListOwnedMediaSlotHistory', inputVars, inputOpts);
}

export function adminGetMediaUploadReceipt(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetMediaUploadReceipt', inputVars, inputOpts);
}

export function adminGetOwnedStorageQuotaReservation(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetOwnedStorageQuotaReservation', inputVars, inputOpts);
}

export function adminGetMediaDeletionIntent(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetMediaDeletionIntent', inputVars, inputOpts);
}

export function adminListStoryDeletionMediaCandidates(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminListStoryDeletionMediaCandidates', inputVars, inputOpts);
}

export function adminListStoryDeletionJobs(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, false);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminListStoryDeletionJobs', inputVars, inputOpts);
}

export function adminListExpiredStoryTombstones(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminListExpiredStoryTombstones', inputVars, inputOpts);
}

export function adminGetStorageUsageReport(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrOptions, options, undefined);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetStorageUsageReport', undefined, inputOpts);
}

export function adminListOwnedGlossaryTerms(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminListOwnedGlossaryTerms', inputVars, inputOpts);
}

export function adminGetImageQuotaConsumption(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetImageQuotaConsumption', inputVars, inputOpts);
}

export function adminGetOwnedPortraitAsset(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetOwnedPortraitAsset', inputVars, inputOpts);
}

export function adminGetAdminOverview(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetAdminOverview', inputVars, inputOpts);
}

