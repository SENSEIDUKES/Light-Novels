const { validateAdminArgs } = require('firebase-admin/data-connect');

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

