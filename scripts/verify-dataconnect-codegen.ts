import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

interface GeneratedArtifactCheck {
  path: string;
  patterns: ReadonlyArray<{
    label: string;
    pattern: RegExp;
  }>;
}

const checks: readonly GeneratedArtifactCheck[] = [
  {
    path: 'src/generated/dataconnect/index.d.ts',
    patterns: [
      { label: 'connectorConfig', pattern: /export const connectorConfig\b/ },
      { label: 'FoundationProbe_Data', pattern: /export interface FoundationProbe_Data\b/ },
      { label: 'StoryStorageUsage_Data', pattern: /export interface StoryStorageUsage_Data\b/ },
      { label: 'UserStorageUsage_Data', pattern: /export interface UserStorageUsage_Data\b/ },
      { label: 'Chapter.chapterContent relation', pattern: /\bchapterContent_on_chapter\?:/ },
      { label: 'Story.storageUsage relation', pattern: /\bstoryStorageUsage_on_story\?:/ },
      { label: 'UserAccount.profile relation', pattern: /\buserProfile_on_user\?:/ },
    ],
  },
  {
    path: 'src/generated/dataconnect-admin/index.d.ts',
    patterns: [
      { label: 'connectorConfig', pattern: /export const connectorConfig\b/ },
      { label: 'adminGetUserProfileGraph', pattern: /export function adminGetUserProfileGraph\b/ },
      { label: 'adminGetOwnedStoryGraph', pattern: /export function adminGetOwnedStoryGraph\b/ },
      { label: 'adminReserveMediaAssetIdempotent', pattern: /export function adminReserveMediaAssetIdempotent\b/ },
      { label: 'adminCommitMediaAssetToSlot', pattern: /export function adminCommitMediaAssetToSlot\b/ },
    ],
  },
  {
    path: 'src/generated/dataconnect/index.cjs.js',
    patterns: [
      { label: 'client CommonJS runtime', pattern: /require\('firebase\/data-connect'\)/ },
      { label: 'current story query', pattern: /queryRef\(dcInstance, 'GetMyStory'/ },
    ],
  },
  {
    path: 'src/generated/dataconnect/esm/index.esm.js',
    patterns: [
      { label: 'client ESM runtime', pattern: /from 'firebase\/data-connect'/ },
      { label: 'current story query', pattern: /queryRef\(dcInstance, 'GetMyStory'/ },
    ],
  },
  {
    path: 'src/generated/dataconnect-admin/index.cjs.js',
    patterns: [
      { label: 'admin CommonJS runtime', pattern: /require\('firebase-admin\/data-connect'\)/ },
      { label: 'current profile query', pattern: /executeQuery\('AdminGetUserProfileGraph'/ },
    ],
  },
  {
    path: 'src/generated/dataconnect-admin/esm/index.esm.js',
    patterns: [
      { label: 'admin ESM runtime', pattern: /from 'firebase-admin\/data-connect'/ },
      { label: 'current profile query', pattern: /executeQuery\('AdminGetUserProfileGraph'/ },
    ],
  },
];

for (const check of checks) {
  const source = await readFile(new URL(`../${check.path}`, import.meta.url), 'utf8');
  assert.ok(source.length > 1_000, `${check.path} was not generated.`);
  for (const expected of check.patterns) {
    assert.match(
      source,
      expected.pattern,
      `${check.path} does not contain ${expected.label}.`,
    );
  }
}

process.stdout.write(
  'Data Connect schema compiled; current client/admin declarations and CJS/ESM runtimes are present.\n',
);
