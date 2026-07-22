import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

interface GeneratedArtifactCheck {
  path: string;
  exports: readonly string[];
}

const checks: readonly GeneratedArtifactCheck[] = [
  {
    path: 'src/generated/dataconnect/index.d.ts',
    exports: [
      'connectorConfig',
      'upsertMyAccount',
      'createStoryWithFirstChapter',
      'createMyChapter',
      'getMyStory',
      'getMyChapter',
      'getMyMediaAsset',
    ],
  },
  {
    path: 'src/generated/dataconnect-admin/index.d.ts',
    exports: [
      'connectorConfig',
      'adminReserveMediaAsset',
      'adminCommitMediaAssetReady',
      'adminCommitMediaAssetReplacement',
      'adminMarkMediaAssetPendingCleanup',
      'adminListMediaCleanupTasks',
    ],
  },
];

for (const check of checks) {
  const source = await readFile(new URL(`../${check.path}`, import.meta.url), 'utf8');
  assert.ok(source.length > 1_000, `${check.path} was not generated.`);
  for (const exportName of check.exports) {
    assert.match(
      source,
      new RegExp(`export (?:const|function) ${exportName}\\b`),
      `${check.path} does not export ${exportName}.`,
    );
  }
}

process.stdout.write('Data Connect schema compiled and both generated SDK surfaces are present.\n');
