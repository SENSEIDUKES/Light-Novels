const { validateAdminArgs } = require('firebase-admin/data-connect');

const AccountRole = {
  USER: "USER",
  ADMIN: "ADMIN",
  OWNER: "OWNER",
}
exports.AccountRole = AccountRole;

const ArcStatus = {
  PLANNED: "PLANNED",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  ARCHIVED: "ARCHIVED",
}
exports.ArcStatus = ArcStatus;

const ChapterStatus = {
  LOCKED: "LOCKED",
  UNLOCKED: "UNLOCKED",
  GENERATING: "GENERATING",
  UNREAD: "UNREAD",
  READ: "READ",
  SEALED: "SEALED",
  FAILED: "FAILED",
  DELETED: "DELETED",
}
exports.ChapterStatus = ChapterStatus;

const CodexEntityKind = {
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
exports.CodexEntityKind = CodexEntityKind;

const CodexRelevanceState = {
  ACTIVE: "ACTIVE",
  WARM: "WARM",
  DORMANT: "DORMANT",
  ARCHIVED: "ARCHIVED",
  REACTIVATED: "REACTIVATED",
}
exports.CodexRelevanceState = CodexRelevanceState;

const GenerationJobKind = {
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
exports.GenerationJobKind = GenerationJobKind;

const GenerationJobStatus = {
  QUEUED: "QUEUED",
  RUNNING: "RUNNING",
  PAUSED: "PAUSED",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
}
exports.GenerationJobStatus = GenerationJobStatus;

const MediaAssetStatus = {
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
exports.MediaAssetStatus = MediaAssetStatus;

const MediaAssetType = {
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
exports.MediaAssetType = MediaAssetType;

const MediaCleanupStatus = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
}
exports.MediaCleanupStatus = MediaCleanupStatus;

const MediaDeletionIntentStatus = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
}
exports.MediaDeletionIntentStatus = MediaDeletionIntentStatus;

const MediaVisibility = {
  PRIVATE: "PRIVATE",
  PUBLIC: "PUBLIC",
}
exports.MediaVisibility = MediaVisibility;

const PlotThreadStatus = {
  ACTIVE: "ACTIVE",
  RESOLVED: "RESOLVED",
  ARCHIVED: "ARCHIVED",
}
exports.PlotThreadStatus = PlotThreadStatus;

const StorageQuotaReservationStatus = {
  RESERVED: "RESERVED",
  COMMITTED: "COMMITTED",
  RELEASED: "RELEASED",
  EXPIRED: "EXPIRED",
}
exports.StorageQuotaReservationStatus = StorageQuotaReservationStatus;

const StoryChangeKind = {
  UPSERTED: "UPSERTED",
  CHAPTER_UPDATED: "CHAPTER_UPDATED",
  PROFILE_UPDATED: "PROFILE_UPDATED",
  DELETED: "DELETED",
}
exports.StoryChangeKind = StoryChangeKind;

const StoryDeletionStageKind = {
  TOMBSTONE: "TOMBSTONE",
  STRUCTURED_DATA: "STRUCTURED_DATA",
  MEDIA: "MEDIA",
  LOCAL_CACHE: "LOCAL_CACHE",
  FINALIZE: "FINALIZE",
}
exports.StoryDeletionStageKind = StoryDeletionStageKind;

const StoryDeletionStatus = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
}
exports.StoryDeletionStatus = StoryDeletionStatus;

const StoryMemberRole = {
  OWNER: "OWNER",
  EDITOR: "EDITOR",
  READER: "READER",
}
exports.StoryMemberRole = StoryMemberRole;

const StoryStatus = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  ARCHIVED: "ARCHIVED",
  DELETED: "DELETED",
}
exports.StoryStatus = StoryStatus;

const StoryVisibility = {
  PRIVATE: "PRIVATE",
  SHARED: "SHARED",
  PUBLIC: "PUBLIC",
}
exports.StoryVisibility = StoryVisibility;

const SubscriptionTier = {
  MORTAL: "MORTAL",
  OUTER_SECT: "OUTER_SECT",
  INNER_SECT: "INNER_SECT",
  SECT_MASTER: "SECT_MASTER",
  IMMORTAL: "IMMORTAL",
}
exports.SubscriptionTier = SubscriptionTier;

const connectorConfig = {
  connector: 'celestial-library',
  serviceId: 'celestial-library',
  location: 'us-west2'
};
exports.connectorConfig = connectorConfig;

function upsertMyAccount(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrOptions, options, undefined);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('UpsertMyAccount', undefined, inputOpts);
}
exports.upsertMyAccount = upsertMyAccount;

function createFoundationProbe(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateFoundationProbe', inputVars, inputOpts);
}
exports.createFoundationProbe = createFoundationProbe;

function deleteMyFoundationProbe(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('DeleteMyFoundationProbe', inputVars, inputOpts);
}
exports.deleteMyFoundationProbe = deleteMyFoundationProbe;

function createStoryWithFirstChapter(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateStoryWithFirstChapter', inputVars, inputOpts);
}
exports.createStoryWithFirstChapter = createStoryWithFirstChapter;

function createMyChapter(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateMyChapter', inputVars, inputOpts);
}
exports.createMyChapter = createMyChapter;

function softDeleteMyStory(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('SoftDeleteMyStory', inputVars, inputOpts);
}
exports.softDeleteMyStory = softDeleteMyStory;

function adminPurgeFoundationProbe(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminPurgeFoundationProbe', inputVars, inputOpts);
}
exports.adminPurgeFoundationProbe = adminPurgeFoundationProbe;

function adminPurgeFoundationStory(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminPurgeFoundationStory', inputVars, inputOpts);
}
exports.adminPurgeFoundationStory = adminPurgeFoundationStory;

function adminReserveMediaAsset(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminReserveMediaAsset', inputVars, inputOpts);
}
exports.adminReserveMediaAsset = adminReserveMediaAsset;

function adminCommitMediaAssetReady(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminCommitMediaAssetReady', inputVars, inputOpts);
}
exports.adminCommitMediaAssetReady = adminCommitMediaAssetReady;

function adminCommitMediaAssetReplacement(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminCommitMediaAssetReplacement', inputVars, inputOpts);
}
exports.adminCommitMediaAssetReplacement = adminCommitMediaAssetReplacement;

function adminMarkMediaAssetFailed(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminMarkMediaAssetFailed', inputVars, inputOpts);
}
exports.adminMarkMediaAssetFailed = adminMarkMediaAssetFailed;

function adminMarkMediaAssetPendingCleanup(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminMarkMediaAssetPendingCleanup', inputVars, inputOpts);
}
exports.adminMarkMediaAssetPendingCleanup = adminMarkMediaAssetPendingCleanup;

function adminRequestMediaAssetDeletion(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminRequestMediaAssetDeletion', inputVars, inputOpts);
}
exports.adminRequestMediaAssetDeletion = adminRequestMediaAssetDeletion;

function adminCompleteMediaCleanup(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminCompleteMediaCleanup', inputVars, inputOpts);
}
exports.adminCompleteMediaCleanup = adminCompleteMediaCleanup;

function adminFailMediaCleanup(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminFailMediaCleanup', inputVars, inputOpts);
}
exports.adminFailMediaCleanup = adminFailMediaCleanup;

function adminDeleteOwnedStory(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminDeleteOwnedStory', inputVars, inputOpts);
}
exports.adminDeleteOwnedStory = adminDeleteOwnedStory;

function adminClaimStoryDeletionJob(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminClaimStoryDeletionJob', inputVars, inputOpts);
}
exports.adminClaimStoryDeletionJob = adminClaimStoryDeletionJob;

function adminFailStoryDeletionJob(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminFailStoryDeletionJob', inputVars, inputOpts);
}
exports.adminFailStoryDeletionJob = adminFailStoryDeletionJob;

function adminAdvanceStoryDeletionJob(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminAdvanceStoryDeletionJob', inputVars, inputOpts);
}
exports.adminAdvanceStoryDeletionJob = adminAdvanceStoryDeletionJob;

function adminCompleteStoryDeletionJob(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminCompleteStoryDeletionJob', inputVars, inputOpts);
}
exports.adminCompleteStoryDeletionJob = adminCompleteStoryDeletionJob;

function adminPurgeExpiredStoryTombstone(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminPurgeExpiredStoryTombstone', inputVars, inputOpts);
}
exports.adminPurgeExpiredStoryTombstone = adminPurgeExpiredStoryTombstone;

function adminReserveStorageQuota(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminReserveStorageQuota', inputVars, inputOpts);
}
exports.adminReserveStorageQuota = adminReserveStorageQuota;

function adminReleaseStorageQuotaReservation(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminReleaseStorageQuotaReservation', inputVars, inputOpts);
}
exports.adminReleaseStorageQuotaReservation = adminReleaseStorageQuotaReservation;

function adminReserveMediaAssetIdempotent(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminReserveMediaAssetIdempotent', inputVars, inputOpts);
}
exports.adminReserveMediaAssetIdempotent = adminReserveMediaAssetIdempotent;

function adminCommitMediaAssetToSlot(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminCommitMediaAssetToSlot', inputVars, inputOpts);
}
exports.adminCommitMediaAssetToSlot = adminCommitMediaAssetToSlot;

function adminSelectOwnedMediaSlotAsset(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminSelectOwnedMediaSlotAsset', inputVars, inputOpts);
}
exports.adminSelectOwnedMediaSlotAsset = adminSelectOwnedMediaSlotAsset;

function adminSelectUserPortrait(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminSelectUserPortrait', inputVars, inputOpts);
}
exports.adminSelectUserPortrait = adminSelectUserPortrait;

function adminEnsureMediaDeletionIntent(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminEnsureMediaDeletionIntent', inputVars, inputOpts);
}
exports.adminEnsureMediaDeletionIntent = adminEnsureMediaDeletionIntent;

function adminClaimMediaCleanupTask(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminClaimMediaCleanupTask', inputVars, inputOpts);
}
exports.adminClaimMediaCleanupTask = adminClaimMediaCleanupTask;

function adminCompleteMediaDeletionIntent(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminCompleteMediaDeletionIntent', inputVars, inputOpts);
}
exports.adminCompleteMediaDeletionIntent = adminCompleteMediaDeletionIntent;

function adminFailMediaDeletionIntent(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminFailMediaDeletionIntent', inputVars, inputOpts);
}
exports.adminFailMediaDeletionIntent = adminFailMediaDeletionIntent;

function adminDeleteOwnedStorySeed(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminDeleteOwnedStorySeed', inputVars, inputOpts);
}
exports.adminDeleteOwnedStorySeed = adminDeleteOwnedStorySeed;

function adminDeleteOwnedGlossaryTerm(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminDeleteOwnedGlossaryTerm', inputVars, inputOpts);
}
exports.adminDeleteOwnedGlossaryTerm = adminDeleteOwnedGlossaryTerm;

function adminConsumeImageGenerationQuota(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminConsumeImageGenerationQuota', inputVars, inputOpts);
}
exports.adminConsumeImageGenerationQuota = adminConsumeImageGenerationQuota;

function adminRecoverPendingUserPortraits(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminRecoverPendingUserPortraits', inputVars, inputOpts);
}
exports.adminRecoverPendingUserPortraits = adminRecoverPendingUserPortraits;

function adminUpdateAccountAccess(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminUpdateAccountAccess', inputVars, inputOpts);
}
exports.adminUpdateAccountAccess = adminUpdateAccountAccess;

function adminDeleteStoryAsAdmin(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AdminDeleteStoryAsAdmin', inputVars, inputOpts);
}
exports.adminDeleteStoryAsAdmin = adminDeleteStoryAsAdmin;

function getMyAccount(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrOptions, options, undefined);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetMyAccount', undefined, inputOpts);
}
exports.getMyAccount = getMyAccount;

function listMyFoundationProbes(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrOptions, options, undefined);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListMyFoundationProbes', undefined, inputOpts);
}
exports.listMyFoundationProbes = listMyFoundationProbes;

function getMyFoundationProbe(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetMyFoundationProbe', inputVars, inputOpts);
}
exports.getMyFoundationProbe = getMyFoundationProbe;

function listMyStories(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrOptions, options, undefined);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListMyStories', undefined, inputOpts);
}
exports.listMyStories = listMyStories;

function getMyStory(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetMyStory', inputVars, inputOpts);
}
exports.getMyStory = getMyStory;

function getMyChapter(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetMyChapter', inputVars, inputOpts);
}
exports.getMyChapter = getMyChapter;

function getMyMediaAsset(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetMyMediaAsset', inputVars, inputOpts);
}
exports.getMyMediaAsset = getMyMediaAsset;

function listMyMediaAssets(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, false);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListMyMediaAssets', inputVars, inputOpts);
}
exports.listMyMediaAssets = listMyMediaAssets;

function adminGetOwnedMediaAsset(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetOwnedMediaAsset', inputVars, inputOpts);
}
exports.adminGetOwnedMediaAsset = adminGetOwnedMediaAsset;

function adminGetOwnedStoryScope(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetOwnedStoryScope', inputVars, inputOpts);
}
exports.adminGetOwnedStoryScope = adminGetOwnedStoryScope;

function adminGetOwnedChapterScope(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetOwnedChapterScope', inputVars, inputOpts);
}
exports.adminGetOwnedChapterScope = adminGetOwnedChapterScope;

function adminGetOwnedEntityScope(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetOwnedEntityScope', inputVars, inputOpts);
}
exports.adminGetOwnedEntityScope = adminGetOwnedEntityScope;

function adminGetOwnedGenerationJobScope(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetOwnedGenerationJobScope', inputVars, inputOpts);
}
exports.adminGetOwnedGenerationJobScope = adminGetOwnedGenerationJobScope;

function adminGetOwnedMediaReplacementScope(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetOwnedMediaReplacementScope', inputVars, inputOpts);
}
exports.adminGetOwnedMediaReplacementScope = adminGetOwnedMediaReplacementScope;

function adminListStaleMediaUploads(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminListStaleMediaUploads', inputVars, inputOpts);
}
exports.adminListStaleMediaUploads = adminListStaleMediaUploads;

function adminListMediaCleanupTasks(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, false);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminListMediaCleanupTasks', inputVars, inputOpts);
}
exports.adminListMediaCleanupTasks = adminListMediaCleanupTasks;

function adminListMediaAssetsForStorageReport(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, false);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminListMediaAssetsForStorageReport', inputVars, inputOpts);
}
exports.adminListMediaAssetsForStorageReport = adminListMediaAssetsForStorageReport;

function listMyStoryChanges(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListMyStoryChanges', inputVars, inputOpts);
}
exports.listMyStoryChanges = listMyStoryChanges;

function getMyCurrentMediaSlot(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetMyCurrentMediaSlot', inputVars, inputOpts);
}
exports.getMyCurrentMediaSlot = getMyCurrentMediaSlot;

function listMyMediaSlotHistory(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListMyMediaSlotHistory', inputVars, inputOpts);
}
exports.listMyMediaSlotHistory = listMyMediaSlotHistory;

function adminListOwnedStories(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminListOwnedStories', inputVars, inputOpts);
}
exports.adminListOwnedStories = adminListOwnedStories;

function adminListOwnedStoryCoverSlots(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminListOwnedStoryCoverSlots', inputVars, inputOpts);
}
exports.adminListOwnedStoryCoverSlots = adminListOwnedStoryCoverSlots;

function adminListOwnedStoryChanges(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminListOwnedStoryChanges', inputVars, inputOpts);
}
exports.adminListOwnedStoryChanges = adminListOwnedStoryChanges;

function adminGetPersistenceReceipt(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetPersistenceReceipt', inputVars, inputOpts);
}
exports.adminGetPersistenceReceipt = adminGetPersistenceReceipt;

function adminGetOwnedStoryGraph(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetOwnedStoryGraph', inputVars, inputOpts);
}
exports.adminGetOwnedStoryGraph = adminGetOwnedStoryGraph;

function adminGetOwnedChapterContentGraph(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetOwnedChapterContentGraph', inputVars, inputOpts);
}
exports.adminGetOwnedChapterContentGraph = adminGetOwnedChapterContentGraph;

function adminListOwnedStorySeeds(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminListOwnedStorySeeds', inputVars, inputOpts);
}
exports.adminListOwnedStorySeeds = adminListOwnedStorySeeds;

function adminGetOwnedStorySeedGraph(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetOwnedStorySeedGraph', inputVars, inputOpts);
}
exports.adminGetOwnedStorySeedGraph = adminGetOwnedStorySeedGraph;

function adminGetUserProfileGraph(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetUserProfileGraph', inputVars, inputOpts);
}
exports.adminGetUserProfileGraph = adminGetUserProfileGraph;

function adminGetOwnedMediaSlot(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetOwnedMediaSlot', inputVars, inputOpts);
}
exports.adminGetOwnedMediaSlot = adminGetOwnedMediaSlot;

function adminListOwnedMediaSlotHistory(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminListOwnedMediaSlotHistory', inputVars, inputOpts);
}
exports.adminListOwnedMediaSlotHistory = adminListOwnedMediaSlotHistory;

function adminGetMediaUploadReceipt(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetMediaUploadReceipt', inputVars, inputOpts);
}
exports.adminGetMediaUploadReceipt = adminGetMediaUploadReceipt;

function adminGetOwnedStorageQuotaReservation(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetOwnedStorageQuotaReservation', inputVars, inputOpts);
}
exports.adminGetOwnedStorageQuotaReservation = adminGetOwnedStorageQuotaReservation;

function adminGetMediaDeletionIntent(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetMediaDeletionIntent', inputVars, inputOpts);
}
exports.adminGetMediaDeletionIntent = adminGetMediaDeletionIntent;

function adminListStoryDeletionMediaCandidates(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminListStoryDeletionMediaCandidates', inputVars, inputOpts);
}
exports.adminListStoryDeletionMediaCandidates = adminListStoryDeletionMediaCandidates;

function adminListStoryDeletionJobs(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, false);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminListStoryDeletionJobs', inputVars, inputOpts);
}
exports.adminListStoryDeletionJobs = adminListStoryDeletionJobs;

function adminListExpiredStoryTombstones(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminListExpiredStoryTombstones', inputVars, inputOpts);
}
exports.adminListExpiredStoryTombstones = adminListExpiredStoryTombstones;

function adminGetStorageUsageReport(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrOptions, options, undefined);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetStorageUsageReport', undefined, inputOpts);
}
exports.adminGetStorageUsageReport = adminGetStorageUsageReport;

function adminListOwnedGlossaryTerms(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminListOwnedGlossaryTerms', inputVars, inputOpts);
}
exports.adminListOwnedGlossaryTerms = adminListOwnedGlossaryTerms;

function adminGetImageQuotaConsumption(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetImageQuotaConsumption', inputVars, inputOpts);
}
exports.adminGetImageQuotaConsumption = adminGetImageQuotaConsumption;

function adminGetOwnedPortraitAsset(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetOwnedPortraitAsset', inputVars, inputOpts);
}
exports.adminGetOwnedPortraitAsset = adminGetOwnedPortraitAsset;

function adminGetAdminOverview(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('AdminGetAdminOverview', inputVars, inputOpts);
}
exports.adminGetAdminOverview = adminGetAdminOverview;

