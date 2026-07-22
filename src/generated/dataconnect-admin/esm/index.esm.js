import { validateAdminArgs } from 'firebase-admin/data-connect';

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

