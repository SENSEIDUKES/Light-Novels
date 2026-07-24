const { queryRef, executeQuery, validateArgsWithOptions, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

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

const StoryDeletionStageStatus = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
}
exports.StoryDeletionStageStatus = StoryDeletionStageStatus;

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
  service: 'celestial-library',
  location: 'us-west2'
};
exports.connectorConfig = connectorConfig;

const upsertMyAccountRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpsertMyAccount');
}
upsertMyAccountRef.operationName = 'UpsertMyAccount';
exports.upsertMyAccountRef = upsertMyAccountRef;

exports.upsertMyAccount = function upsertMyAccount(dc) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dc, undefined);
  return executeMutation(upsertMyAccountRef(dcInstance, inputVars));
}
;

const createFoundationProbeRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateFoundationProbe', inputVars);
}
createFoundationProbeRef.operationName = 'CreateFoundationProbe';
exports.createFoundationProbeRef = createFoundationProbeRef;

exports.createFoundationProbe = function createFoundationProbe(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createFoundationProbeRef(dcInstance, inputVars));
}
;

const deleteMyFoundationProbeRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteMyFoundationProbe', inputVars);
}
deleteMyFoundationProbeRef.operationName = 'DeleteMyFoundationProbe';
exports.deleteMyFoundationProbeRef = deleteMyFoundationProbeRef;

exports.deleteMyFoundationProbe = function deleteMyFoundationProbe(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(deleteMyFoundationProbeRef(dcInstance, inputVars));
}
;

const createStoryWithFirstChapterRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateStoryWithFirstChapter', inputVars);
}
createStoryWithFirstChapterRef.operationName = 'CreateStoryWithFirstChapter';
exports.createStoryWithFirstChapterRef = createStoryWithFirstChapterRef;

exports.createStoryWithFirstChapter = function createStoryWithFirstChapter(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createStoryWithFirstChapterRef(dcInstance, inputVars));
}
;

const createMyChapterRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateMyChapter', inputVars);
}
createMyChapterRef.operationName = 'CreateMyChapter';
exports.createMyChapterRef = createMyChapterRef;

exports.createMyChapter = function createMyChapter(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createMyChapterRef(dcInstance, inputVars));
}
;

const softDeleteMyStoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'SoftDeleteMyStory', inputVars);
}
softDeleteMyStoryRef.operationName = 'SoftDeleteMyStory';
exports.softDeleteMyStoryRef = softDeleteMyStoryRef;

exports.softDeleteMyStory = function softDeleteMyStory(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(softDeleteMyStoryRef(dcInstance, inputVars));
}
;

const adminPurgeFoundationProbeRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminPurgeFoundationProbe', inputVars);
}
adminPurgeFoundationProbeRef.operationName = 'AdminPurgeFoundationProbe';
exports.adminPurgeFoundationProbeRef = adminPurgeFoundationProbeRef;

exports.adminPurgeFoundationProbe = function adminPurgeFoundationProbe(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminPurgeFoundationProbeRef(dcInstance, inputVars));
}
;

const adminPurgeFoundationStoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminPurgeFoundationStory', inputVars);
}
adminPurgeFoundationStoryRef.operationName = 'AdminPurgeFoundationStory';
exports.adminPurgeFoundationStoryRef = adminPurgeFoundationStoryRef;

exports.adminPurgeFoundationStory = function adminPurgeFoundationStory(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminPurgeFoundationStoryRef(dcInstance, inputVars));
}
;

const adminReserveMediaAssetRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminReserveMediaAsset', inputVars);
}
adminReserveMediaAssetRef.operationName = 'AdminReserveMediaAsset';
exports.adminReserveMediaAssetRef = adminReserveMediaAssetRef;

exports.adminReserveMediaAsset = function adminReserveMediaAsset(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminReserveMediaAssetRef(dcInstance, inputVars));
}
;

const adminCommitMediaAssetReadyRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminCommitMediaAssetReady', inputVars);
}
adminCommitMediaAssetReadyRef.operationName = 'AdminCommitMediaAssetReady';
exports.adminCommitMediaAssetReadyRef = adminCommitMediaAssetReadyRef;

exports.adminCommitMediaAssetReady = function adminCommitMediaAssetReady(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminCommitMediaAssetReadyRef(dcInstance, inputVars));
}
;

const adminCommitMediaAssetReplacementRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminCommitMediaAssetReplacement', inputVars);
}
adminCommitMediaAssetReplacementRef.operationName = 'AdminCommitMediaAssetReplacement';
exports.adminCommitMediaAssetReplacementRef = adminCommitMediaAssetReplacementRef;

exports.adminCommitMediaAssetReplacement = function adminCommitMediaAssetReplacement(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminCommitMediaAssetReplacementRef(dcInstance, inputVars));
}
;

const adminMarkMediaAssetFailedRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminMarkMediaAssetFailed', inputVars);
}
adminMarkMediaAssetFailedRef.operationName = 'AdminMarkMediaAssetFailed';
exports.adminMarkMediaAssetFailedRef = adminMarkMediaAssetFailedRef;

exports.adminMarkMediaAssetFailed = function adminMarkMediaAssetFailed(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminMarkMediaAssetFailedRef(dcInstance, inputVars));
}
;

const adminMarkMediaAssetPendingCleanupRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminMarkMediaAssetPendingCleanup', inputVars);
}
adminMarkMediaAssetPendingCleanupRef.operationName = 'AdminMarkMediaAssetPendingCleanup';
exports.adminMarkMediaAssetPendingCleanupRef = adminMarkMediaAssetPendingCleanupRef;

exports.adminMarkMediaAssetPendingCleanup = function adminMarkMediaAssetPendingCleanup(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminMarkMediaAssetPendingCleanupRef(dcInstance, inputVars));
}
;

const adminRequestMediaAssetDeletionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminRequestMediaAssetDeletion', inputVars);
}
adminRequestMediaAssetDeletionRef.operationName = 'AdminRequestMediaAssetDeletion';
exports.adminRequestMediaAssetDeletionRef = adminRequestMediaAssetDeletionRef;

exports.adminRequestMediaAssetDeletion = function adminRequestMediaAssetDeletion(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminRequestMediaAssetDeletionRef(dcInstance, inputVars));
}
;

const adminCompleteMediaCleanupRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminCompleteMediaCleanup', inputVars);
}
adminCompleteMediaCleanupRef.operationName = 'AdminCompleteMediaCleanup';
exports.adminCompleteMediaCleanupRef = adminCompleteMediaCleanupRef;

exports.adminCompleteMediaCleanup = function adminCompleteMediaCleanup(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminCompleteMediaCleanupRef(dcInstance, inputVars));
}
;

const adminFailMediaCleanupRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminFailMediaCleanup', inputVars);
}
adminFailMediaCleanupRef.operationName = 'AdminFailMediaCleanup';
exports.adminFailMediaCleanupRef = adminFailMediaCleanupRef;

exports.adminFailMediaCleanup = function adminFailMediaCleanup(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminFailMediaCleanupRef(dcInstance, inputVars));
}
;

const adminDeleteOwnedStoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminDeleteOwnedStory', inputVars);
}
adminDeleteOwnedStoryRef.operationName = 'AdminDeleteOwnedStory';
exports.adminDeleteOwnedStoryRef = adminDeleteOwnedStoryRef;

exports.adminDeleteOwnedStory = function adminDeleteOwnedStory(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminDeleteOwnedStoryRef(dcInstance, inputVars));
}
;

const adminClaimStoryDeletionJobRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminClaimStoryDeletionJob', inputVars);
}
adminClaimStoryDeletionJobRef.operationName = 'AdminClaimStoryDeletionJob';
exports.adminClaimStoryDeletionJobRef = adminClaimStoryDeletionJobRef;

exports.adminClaimStoryDeletionJob = function adminClaimStoryDeletionJob(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminClaimStoryDeletionJobRef(dcInstance, inputVars));
}
;

const adminFailStoryDeletionJobRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminFailStoryDeletionJob', inputVars);
}
adminFailStoryDeletionJobRef.operationName = 'AdminFailStoryDeletionJob';
exports.adminFailStoryDeletionJobRef = adminFailStoryDeletionJobRef;

exports.adminFailStoryDeletionJob = function adminFailStoryDeletionJob(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminFailStoryDeletionJobRef(dcInstance, inputVars));
}
;

const adminAdvanceStoryDeletionJobRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminAdvanceStoryDeletionJob', inputVars);
}
adminAdvanceStoryDeletionJobRef.operationName = 'AdminAdvanceStoryDeletionJob';
exports.adminAdvanceStoryDeletionJobRef = adminAdvanceStoryDeletionJobRef;

exports.adminAdvanceStoryDeletionJob = function adminAdvanceStoryDeletionJob(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminAdvanceStoryDeletionJobRef(dcInstance, inputVars));
}
;

const adminCompleteStoryDeletionJobRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminCompleteStoryDeletionJob', inputVars);
}
adminCompleteStoryDeletionJobRef.operationName = 'AdminCompleteStoryDeletionJob';
exports.adminCompleteStoryDeletionJobRef = adminCompleteStoryDeletionJobRef;

exports.adminCompleteStoryDeletionJob = function adminCompleteStoryDeletionJob(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminCompleteStoryDeletionJobRef(dcInstance, inputVars));
}
;

const adminPurgeExpiredStoryTombstoneRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminPurgeExpiredStoryTombstone', inputVars);
}
adminPurgeExpiredStoryTombstoneRef.operationName = 'AdminPurgeExpiredStoryTombstone';
exports.adminPurgeExpiredStoryTombstoneRef = adminPurgeExpiredStoryTombstoneRef;

exports.adminPurgeExpiredStoryTombstone = function adminPurgeExpiredStoryTombstone(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminPurgeExpiredStoryTombstoneRef(dcInstance, inputVars));
}
;

const adminReserveStorageQuotaRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminReserveStorageQuota', inputVars);
}
adminReserveStorageQuotaRef.operationName = 'AdminReserveStorageQuota';
exports.adminReserveStorageQuotaRef = adminReserveStorageQuotaRef;

exports.adminReserveStorageQuota = function adminReserveStorageQuota(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminReserveStorageQuotaRef(dcInstance, inputVars));
}
;

const adminReleaseStorageQuotaReservationRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminReleaseStorageQuotaReservation', inputVars);
}
adminReleaseStorageQuotaReservationRef.operationName = 'AdminReleaseStorageQuotaReservation';
exports.adminReleaseStorageQuotaReservationRef = adminReleaseStorageQuotaReservationRef;

exports.adminReleaseStorageQuotaReservation = function adminReleaseStorageQuotaReservation(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminReleaseStorageQuotaReservationRef(dcInstance, inputVars));
}
;

const adminReserveMediaAssetIdempotentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminReserveMediaAssetIdempotent', inputVars);
}
adminReserveMediaAssetIdempotentRef.operationName = 'AdminReserveMediaAssetIdempotent';
exports.adminReserveMediaAssetIdempotentRef = adminReserveMediaAssetIdempotentRef;

exports.adminReserveMediaAssetIdempotent = function adminReserveMediaAssetIdempotent(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminReserveMediaAssetIdempotentRef(dcInstance, inputVars));
}
;

const adminCommitMediaAssetToSlotRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminCommitMediaAssetToSlot', inputVars);
}
adminCommitMediaAssetToSlotRef.operationName = 'AdminCommitMediaAssetToSlot';
exports.adminCommitMediaAssetToSlotRef = adminCommitMediaAssetToSlotRef;

exports.adminCommitMediaAssetToSlot = function adminCommitMediaAssetToSlot(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminCommitMediaAssetToSlotRef(dcInstance, inputVars));
}
;

const adminSelectOwnedMediaSlotAssetRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminSelectOwnedMediaSlotAsset', inputVars);
}
adminSelectOwnedMediaSlotAssetRef.operationName = 'AdminSelectOwnedMediaSlotAsset';
exports.adminSelectOwnedMediaSlotAssetRef = adminSelectOwnedMediaSlotAssetRef;

exports.adminSelectOwnedMediaSlotAsset = function adminSelectOwnedMediaSlotAsset(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminSelectOwnedMediaSlotAssetRef(dcInstance, inputVars));
}
;

const adminSelectUserPortraitRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminSelectUserPortrait', inputVars);
}
adminSelectUserPortraitRef.operationName = 'AdminSelectUserPortrait';
exports.adminSelectUserPortraitRef = adminSelectUserPortraitRef;

exports.adminSelectUserPortrait = function adminSelectUserPortrait(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminSelectUserPortraitRef(dcInstance, inputVars));
}
;

const adminEnsureMediaDeletionIntentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminEnsureMediaDeletionIntent', inputVars);
}
adminEnsureMediaDeletionIntentRef.operationName = 'AdminEnsureMediaDeletionIntent';
exports.adminEnsureMediaDeletionIntentRef = adminEnsureMediaDeletionIntentRef;

exports.adminEnsureMediaDeletionIntent = function adminEnsureMediaDeletionIntent(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminEnsureMediaDeletionIntentRef(dcInstance, inputVars));
}
;

const adminClaimMediaCleanupTaskRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminClaimMediaCleanupTask', inputVars);
}
adminClaimMediaCleanupTaskRef.operationName = 'AdminClaimMediaCleanupTask';
exports.adminClaimMediaCleanupTaskRef = adminClaimMediaCleanupTaskRef;

exports.adminClaimMediaCleanupTask = function adminClaimMediaCleanupTask(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminClaimMediaCleanupTaskRef(dcInstance, inputVars));
}
;

const adminCompleteMediaDeletionIntentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminCompleteMediaDeletionIntent', inputVars);
}
adminCompleteMediaDeletionIntentRef.operationName = 'AdminCompleteMediaDeletionIntent';
exports.adminCompleteMediaDeletionIntentRef = adminCompleteMediaDeletionIntentRef;

exports.adminCompleteMediaDeletionIntent = function adminCompleteMediaDeletionIntent(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminCompleteMediaDeletionIntentRef(dcInstance, inputVars));
}
;

const adminFailMediaDeletionIntentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminFailMediaDeletionIntent', inputVars);
}
adminFailMediaDeletionIntentRef.operationName = 'AdminFailMediaDeletionIntent';
exports.adminFailMediaDeletionIntentRef = adminFailMediaDeletionIntentRef;

exports.adminFailMediaDeletionIntent = function adminFailMediaDeletionIntent(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminFailMediaDeletionIntentRef(dcInstance, inputVars));
}
;

const adminDeleteOwnedStorySeedRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminDeleteOwnedStorySeed', inputVars);
}
adminDeleteOwnedStorySeedRef.operationName = 'AdminDeleteOwnedStorySeed';
exports.adminDeleteOwnedStorySeedRef = adminDeleteOwnedStorySeedRef;

exports.adminDeleteOwnedStorySeed = function adminDeleteOwnedStorySeed(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminDeleteOwnedStorySeedRef(dcInstance, inputVars));
}
;

const adminDeleteOwnedGlossaryTermRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminDeleteOwnedGlossaryTerm', inputVars);
}
adminDeleteOwnedGlossaryTermRef.operationName = 'AdminDeleteOwnedGlossaryTerm';
exports.adminDeleteOwnedGlossaryTermRef = adminDeleteOwnedGlossaryTermRef;

exports.adminDeleteOwnedGlossaryTerm = function adminDeleteOwnedGlossaryTerm(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminDeleteOwnedGlossaryTermRef(dcInstance, inputVars));
}
;

const adminConsumeImageGenerationQuotaRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminConsumeImageGenerationQuota', inputVars);
}
adminConsumeImageGenerationQuotaRef.operationName = 'AdminConsumeImageGenerationQuota';
exports.adminConsumeImageGenerationQuotaRef = adminConsumeImageGenerationQuotaRef;

exports.adminConsumeImageGenerationQuota = function adminConsumeImageGenerationQuota(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminConsumeImageGenerationQuotaRef(dcInstance, inputVars));
}
;

const adminRecoverPendingUserPortraitsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminRecoverPendingUserPortraits', inputVars);
}
adminRecoverPendingUserPortraitsRef.operationName = 'AdminRecoverPendingUserPortraits';
exports.adminRecoverPendingUserPortraitsRef = adminRecoverPendingUserPortraitsRef;

exports.adminRecoverPendingUserPortraits = function adminRecoverPendingUserPortraits(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminRecoverPendingUserPortraitsRef(dcInstance, inputVars));
}
;

const adminUpdateAccountAccessRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminUpdateAccountAccess', inputVars);
}
adminUpdateAccountAccessRef.operationName = 'AdminUpdateAccountAccess';
exports.adminUpdateAccountAccessRef = adminUpdateAccountAccessRef;

exports.adminUpdateAccountAccess = function adminUpdateAccountAccess(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminUpdateAccountAccessRef(dcInstance, inputVars));
}
;

const adminDeleteStoryAsAdminRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AdminDeleteStoryAsAdmin', inputVars);
}
adminDeleteStoryAsAdminRef.operationName = 'AdminDeleteStoryAsAdmin';
exports.adminDeleteStoryAsAdminRef = adminDeleteStoryAsAdminRef;

exports.adminDeleteStoryAsAdmin = function adminDeleteStoryAsAdmin(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(adminDeleteStoryAsAdminRef(dcInstance, inputVars));
}
;

const getMyAccountRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMyAccount');
}
getMyAccountRef.operationName = 'GetMyAccount';
exports.getMyAccountRef = getMyAccountRef;

exports.getMyAccount = function getMyAccount(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(getMyAccountRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listMyFoundationProbesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMyFoundationProbes');
}
listMyFoundationProbesRef.operationName = 'ListMyFoundationProbes';
exports.listMyFoundationProbesRef = listMyFoundationProbesRef;

exports.listMyFoundationProbes = function listMyFoundationProbes(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listMyFoundationProbesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getMyFoundationProbeRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMyFoundationProbe', inputVars);
}
getMyFoundationProbeRef.operationName = 'GetMyFoundationProbe';
exports.getMyFoundationProbeRef = getMyFoundationProbeRef;

exports.getMyFoundationProbe = function getMyFoundationProbe(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getMyFoundationProbeRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listMyStoriesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMyStories');
}
listMyStoriesRef.operationName = 'ListMyStories';
exports.listMyStoriesRef = listMyStoriesRef;

exports.listMyStories = function listMyStories(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listMyStoriesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getMyStoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMyStory', inputVars);
}
getMyStoryRef.operationName = 'GetMyStory';
exports.getMyStoryRef = getMyStoryRef;

exports.getMyStory = function getMyStory(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getMyStoryRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getMyChapterRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMyChapter', inputVars);
}
getMyChapterRef.operationName = 'GetMyChapter';
exports.getMyChapterRef = getMyChapterRef;

exports.getMyChapter = function getMyChapter(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getMyChapterRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getMyMediaAssetRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMyMediaAsset', inputVars);
}
getMyMediaAssetRef.operationName = 'GetMyMediaAsset';
exports.getMyMediaAssetRef = getMyMediaAssetRef;

exports.getMyMediaAsset = function getMyMediaAsset(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getMyMediaAssetRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listMyMediaAssetsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMyMediaAssets', inputVars);
}
listMyMediaAssetsRef.operationName = 'ListMyMediaAssets';
exports.listMyMediaAssetsRef = listMyMediaAssetsRef;

exports.listMyMediaAssets = function listMyMediaAssets(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, false);
  return executeQuery(listMyMediaAssetsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const adminGetOwnedMediaAssetRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetOwnedMediaAsset', inputVars);
}
adminGetOwnedMediaAssetRef.operationName = 'AdminGetOwnedMediaAsset';
exports.adminGetOwnedMediaAssetRef = adminGetOwnedMediaAssetRef;

exports.adminGetOwnedMediaAsset = function adminGetOwnedMediaAsset(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetOwnedMediaAssetRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const adminGetOwnedStoryScopeRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetOwnedStoryScope', inputVars);
}
adminGetOwnedStoryScopeRef.operationName = 'AdminGetOwnedStoryScope';
exports.adminGetOwnedStoryScopeRef = adminGetOwnedStoryScopeRef;

exports.adminGetOwnedStoryScope = function adminGetOwnedStoryScope(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetOwnedStoryScopeRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const adminGetOwnedChapterScopeRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetOwnedChapterScope', inputVars);
}
adminGetOwnedChapterScopeRef.operationName = 'AdminGetOwnedChapterScope';
exports.adminGetOwnedChapterScopeRef = adminGetOwnedChapterScopeRef;

exports.adminGetOwnedChapterScope = function adminGetOwnedChapterScope(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetOwnedChapterScopeRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const adminGetOwnedEntityScopeRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetOwnedEntityScope', inputVars);
}
adminGetOwnedEntityScopeRef.operationName = 'AdminGetOwnedEntityScope';
exports.adminGetOwnedEntityScopeRef = adminGetOwnedEntityScopeRef;

exports.adminGetOwnedEntityScope = function adminGetOwnedEntityScope(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetOwnedEntityScopeRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const adminGetOwnedGenerationJobScopeRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetOwnedGenerationJobScope', inputVars);
}
adminGetOwnedGenerationJobScopeRef.operationName = 'AdminGetOwnedGenerationJobScope';
exports.adminGetOwnedGenerationJobScopeRef = adminGetOwnedGenerationJobScopeRef;

exports.adminGetOwnedGenerationJobScope = function adminGetOwnedGenerationJobScope(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetOwnedGenerationJobScopeRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const adminGetOwnedMediaReplacementScopeRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetOwnedMediaReplacementScope', inputVars);
}
adminGetOwnedMediaReplacementScopeRef.operationName = 'AdminGetOwnedMediaReplacementScope';
exports.adminGetOwnedMediaReplacementScopeRef = adminGetOwnedMediaReplacementScopeRef;

exports.adminGetOwnedMediaReplacementScope = function adminGetOwnedMediaReplacementScope(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetOwnedMediaReplacementScopeRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const adminListStaleMediaUploadsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminListStaleMediaUploads', inputVars);
}
adminListStaleMediaUploadsRef.operationName = 'AdminListStaleMediaUploads';
exports.adminListStaleMediaUploadsRef = adminListStaleMediaUploadsRef;

exports.adminListStaleMediaUploads = function adminListStaleMediaUploads(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminListStaleMediaUploadsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const adminListMediaCleanupTasksRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminListMediaCleanupTasks', inputVars);
}
adminListMediaCleanupTasksRef.operationName = 'AdminListMediaCleanupTasks';
exports.adminListMediaCleanupTasksRef = adminListMediaCleanupTasksRef;

exports.adminListMediaCleanupTasks = function adminListMediaCleanupTasks(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, false);
  return executeQuery(adminListMediaCleanupTasksRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const adminListMediaAssetsForStorageReportRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminListMediaAssetsForStorageReport', inputVars);
}
adminListMediaAssetsForStorageReportRef.operationName = 'AdminListMediaAssetsForStorageReport';
exports.adminListMediaAssetsForStorageReportRef = adminListMediaAssetsForStorageReportRef;

exports.adminListMediaAssetsForStorageReport = function adminListMediaAssetsForStorageReport(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, false);
  return executeQuery(adminListMediaAssetsForStorageReportRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listMyStoryChangesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMyStoryChanges', inputVars);
}
listMyStoryChangesRef.operationName = 'ListMyStoryChanges';
exports.listMyStoryChangesRef = listMyStoryChangesRef;

exports.listMyStoryChanges = function listMyStoryChanges(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listMyStoryChangesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const getMyCurrentMediaSlotRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMyCurrentMediaSlot', inputVars);
}
getMyCurrentMediaSlotRef.operationName = 'GetMyCurrentMediaSlot';
exports.getMyCurrentMediaSlotRef = getMyCurrentMediaSlotRef;

exports.getMyCurrentMediaSlot = function getMyCurrentMediaSlot(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getMyCurrentMediaSlotRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const listMyMediaSlotHistoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListMyMediaSlotHistory', inputVars);
}
listMyMediaSlotHistoryRef.operationName = 'ListMyMediaSlotHistory';
exports.listMyMediaSlotHistoryRef = listMyMediaSlotHistoryRef;

exports.listMyMediaSlotHistory = function listMyMediaSlotHistory(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listMyMediaSlotHistoryRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const adminListOwnedStoriesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminListOwnedStories', inputVars);
}
adminListOwnedStoriesRef.operationName = 'AdminListOwnedStories';
exports.adminListOwnedStoriesRef = adminListOwnedStoriesRef;

exports.adminListOwnedStories = function adminListOwnedStories(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminListOwnedStoriesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const adminListOwnedStoryCoverSlotsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminListOwnedStoryCoverSlots', inputVars);
}
adminListOwnedStoryCoverSlotsRef.operationName = 'AdminListOwnedStoryCoverSlots';
exports.adminListOwnedStoryCoverSlotsRef = adminListOwnedStoryCoverSlotsRef;

exports.adminListOwnedStoryCoverSlots = function adminListOwnedStoryCoverSlots(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminListOwnedStoryCoverSlotsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const adminListOwnedStoryChangesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminListOwnedStoryChanges', inputVars);
}
adminListOwnedStoryChangesRef.operationName = 'AdminListOwnedStoryChanges';
exports.adminListOwnedStoryChangesRef = adminListOwnedStoryChangesRef;

exports.adminListOwnedStoryChanges = function adminListOwnedStoryChanges(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminListOwnedStoryChangesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const adminGetPersistenceReceiptRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetPersistenceReceipt', inputVars);
}
adminGetPersistenceReceiptRef.operationName = 'AdminGetPersistenceReceipt';
exports.adminGetPersistenceReceiptRef = adminGetPersistenceReceiptRef;

exports.adminGetPersistenceReceipt = function adminGetPersistenceReceipt(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetPersistenceReceiptRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const adminGetOwnedStoryGraphRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetOwnedStoryGraph', inputVars);
}
adminGetOwnedStoryGraphRef.operationName = 'AdminGetOwnedStoryGraph';
exports.adminGetOwnedStoryGraphRef = adminGetOwnedStoryGraphRef;

exports.adminGetOwnedStoryGraph = function adminGetOwnedStoryGraph(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetOwnedStoryGraphRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const adminGetOwnedChapterContentGraphRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetOwnedChapterContentGraph', inputVars);
}
adminGetOwnedChapterContentGraphRef.operationName = 'AdminGetOwnedChapterContentGraph';
exports.adminGetOwnedChapterContentGraphRef = adminGetOwnedChapterContentGraphRef;

exports.adminGetOwnedChapterContentGraph = function adminGetOwnedChapterContentGraph(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetOwnedChapterContentGraphRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const adminListOwnedStorySeedsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminListOwnedStorySeeds', inputVars);
}
adminListOwnedStorySeedsRef.operationName = 'AdminListOwnedStorySeeds';
exports.adminListOwnedStorySeedsRef = adminListOwnedStorySeedsRef;

exports.adminListOwnedStorySeeds = function adminListOwnedStorySeeds(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminListOwnedStorySeedsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const adminGetOwnedStorySeedGraphRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetOwnedStorySeedGraph', inputVars);
}
adminGetOwnedStorySeedGraphRef.operationName = 'AdminGetOwnedStorySeedGraph';
exports.adminGetOwnedStorySeedGraphRef = adminGetOwnedStorySeedGraphRef;

exports.adminGetOwnedStorySeedGraph = function adminGetOwnedStorySeedGraph(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetOwnedStorySeedGraphRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const adminGetUserProfileGraphRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetUserProfileGraph', inputVars);
}
adminGetUserProfileGraphRef.operationName = 'AdminGetUserProfileGraph';
exports.adminGetUserProfileGraphRef = adminGetUserProfileGraphRef;

exports.adminGetUserProfileGraph = function adminGetUserProfileGraph(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetUserProfileGraphRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const adminGetOwnedMediaSlotRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetOwnedMediaSlot', inputVars);
}
adminGetOwnedMediaSlotRef.operationName = 'AdminGetOwnedMediaSlot';
exports.adminGetOwnedMediaSlotRef = adminGetOwnedMediaSlotRef;

exports.adminGetOwnedMediaSlot = function adminGetOwnedMediaSlot(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetOwnedMediaSlotRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const adminListOwnedMediaSlotHistoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminListOwnedMediaSlotHistory', inputVars);
}
adminListOwnedMediaSlotHistoryRef.operationName = 'AdminListOwnedMediaSlotHistory';
exports.adminListOwnedMediaSlotHistoryRef = adminListOwnedMediaSlotHistoryRef;

exports.adminListOwnedMediaSlotHistory = function adminListOwnedMediaSlotHistory(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminListOwnedMediaSlotHistoryRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const adminGetMediaUploadReceiptRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetMediaUploadReceipt', inputVars);
}
adminGetMediaUploadReceiptRef.operationName = 'AdminGetMediaUploadReceipt';
exports.adminGetMediaUploadReceiptRef = adminGetMediaUploadReceiptRef;

exports.adminGetMediaUploadReceipt = function adminGetMediaUploadReceipt(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetMediaUploadReceiptRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const adminGetOwnedStorageQuotaReservationRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetOwnedStorageQuotaReservation', inputVars);
}
adminGetOwnedStorageQuotaReservationRef.operationName = 'AdminGetOwnedStorageQuotaReservation';
exports.adminGetOwnedStorageQuotaReservationRef = adminGetOwnedStorageQuotaReservationRef;

exports.adminGetOwnedStorageQuotaReservation = function adminGetOwnedStorageQuotaReservation(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetOwnedStorageQuotaReservationRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const adminGetMediaDeletionIntentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetMediaDeletionIntent', inputVars);
}
adminGetMediaDeletionIntentRef.operationName = 'AdminGetMediaDeletionIntent';
exports.adminGetMediaDeletionIntentRef = adminGetMediaDeletionIntentRef;

exports.adminGetMediaDeletionIntent = function adminGetMediaDeletionIntent(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetMediaDeletionIntentRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const adminListStoryDeletionMediaCandidatesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminListStoryDeletionMediaCandidates', inputVars);
}
adminListStoryDeletionMediaCandidatesRef.operationName = 'AdminListStoryDeletionMediaCandidates';
exports.adminListStoryDeletionMediaCandidatesRef = adminListStoryDeletionMediaCandidatesRef;

exports.adminListStoryDeletionMediaCandidates = function adminListStoryDeletionMediaCandidates(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminListStoryDeletionMediaCandidatesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const adminListStoryDeletionJobsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminListStoryDeletionJobs', inputVars);
}
adminListStoryDeletionJobsRef.operationName = 'AdminListStoryDeletionJobs';
exports.adminListStoryDeletionJobsRef = adminListStoryDeletionJobsRef;

exports.adminListStoryDeletionJobs = function adminListStoryDeletionJobs(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, false);
  return executeQuery(adminListStoryDeletionJobsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const adminListExpiredStoryTombstonesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminListExpiredStoryTombstones', inputVars);
}
adminListExpiredStoryTombstonesRef.operationName = 'AdminListExpiredStoryTombstones';
exports.adminListExpiredStoryTombstonesRef = adminListExpiredStoryTombstonesRef;

exports.adminListExpiredStoryTombstones = function adminListExpiredStoryTombstones(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminListExpiredStoryTombstonesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const adminGetStorageUsageReportRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetStorageUsageReport');
}
adminGetStorageUsageReportRef.operationName = 'AdminGetStorageUsageReport';
exports.adminGetStorageUsageReportRef = adminGetStorageUsageReportRef;

exports.adminGetStorageUsageReport = function adminGetStorageUsageReport(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(adminGetStorageUsageReportRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const adminListOwnedGlossaryTermsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminListOwnedGlossaryTerms', inputVars);
}
adminListOwnedGlossaryTermsRef.operationName = 'AdminListOwnedGlossaryTerms';
exports.adminListOwnedGlossaryTermsRef = adminListOwnedGlossaryTermsRef;

exports.adminListOwnedGlossaryTerms = function adminListOwnedGlossaryTerms(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminListOwnedGlossaryTermsRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const adminGetImageQuotaConsumptionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetImageQuotaConsumption', inputVars);
}
adminGetImageQuotaConsumptionRef.operationName = 'AdminGetImageQuotaConsumption';
exports.adminGetImageQuotaConsumptionRef = adminGetImageQuotaConsumptionRef;

exports.adminGetImageQuotaConsumption = function adminGetImageQuotaConsumption(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetImageQuotaConsumptionRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const adminGetOwnedPortraitAssetRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetOwnedPortraitAsset', inputVars);
}
adminGetOwnedPortraitAssetRef.operationName = 'AdminGetOwnedPortraitAsset';
exports.adminGetOwnedPortraitAssetRef = adminGetOwnedPortraitAssetRef;

exports.adminGetOwnedPortraitAsset = function adminGetOwnedPortraitAsset(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetOwnedPortraitAssetRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const adminGetAdminOverviewRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'AdminGetAdminOverview', inputVars);
}
adminGetAdminOverviewRef.operationName = 'AdminGetAdminOverview';
exports.adminGetAdminOverviewRef = adminGetAdminOverviewRef;

exports.adminGetAdminOverview = function adminGetAdminOverview(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(adminGetAdminOverviewRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;
