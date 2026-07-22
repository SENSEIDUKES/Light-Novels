import { queryRef, executeQuery, validateArgsWithOptions, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const AccountRole = {
  USER: "USER",
  ADMIN: "ADMIN",
  OWNER: "OWNER",
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

export const MediaVisibility = {
  PRIVATE: "PRIVATE",
  PUBLIC: "PUBLIC",
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

