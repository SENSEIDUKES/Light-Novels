const { queryRef, executeQuery, validateArgsWithOptions, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const AccountRole = {
  USER: "USER",
  ADMIN: "ADMIN",
  OWNER: "OWNER",
}
exports.AccountRole = AccountRole;

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

const MediaVisibility = {
  PRIVATE: "PRIVATE",
  PUBLIC: "PUBLIC",
}
exports.MediaVisibility = MediaVisibility;

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
