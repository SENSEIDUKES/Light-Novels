import 'dotenv/config';
import { createRequire } from 'node:module';
import { MediaAssetService } from '../src/server/media/mediaAssetService';
import { R2ObjectStore } from '../src/server/media/r2ObjectStore';

// The generated Admin SDK publishes explicit CommonJS and ESM entrypoints.
// Loading the repository through CommonJS avoids tsx treating its relative
// generated-package import as a source directory during standalone scripts.
const require = createRequire(import.meta.url);
const repositoryModule = require('../src/server/media/dataConnectMediaAssetRepository.ts') as typeof import('../src/server/media/dataConnectMediaAssetRepository');
const { DataConnectMediaAssetRepository } = repositoryModule;

const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 1_000;
const MAX_ERROR_MESSAGE_LENGTH = 500;

interface StageSuccess<T> {
  ok: true;
  result: T;
}

interface StageFailure {
  ok: false;
  error: string;
}

type StageResult<T> = StageSuccess<T> | StageFailure;

function parseBatchSize(value: string | undefined): number {
  if (value === undefined) return DEFAULT_BATCH_SIZE;
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error('MEDIA_CLEANUP_BATCH_SIZE must be a positive integer.');
  }
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error('MEDIA_CLEANUP_BATCH_SIZE must be a positive safe integer.');
  }
  return Math.min(parsed, MAX_BATCH_SIZE);
}

function sanitizedErrorMessage(error: unknown): string {
  const message = error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : 'Unknown maintenance failure.';

  return message
    .replace(
      /\bauthorization\b\s*[:=]\s*(?:"[^"]*"|'[^']*'|(?:Bearer|Basic)\s+\S+|\S+)/gi,
      'authorization=[REDACTED]',
    )
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
    .replace(
      /\b(access[_-]?key|secret(?:[_-]?access)?[_-]?key|api[_-]?key|token|password|private[_-]?key|credential)\b\s*[:=]\s*(?:"[^"]*"|'[^']*'|\S+)/gi,
      '$1=[REDACTED]',
    )
    .replace(/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, '[REDACTED_AWS_ACCESS_KEY]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_ERROR_MESSAGE_LENGTH) || 'Maintenance stage failed.';
}

async function runStage<T>(operation: () => Promise<T>): Promise<StageResult<T>> {
  try {
    return { ok: true, result: await operation() };
  } catch (error) {
    return { ok: false, error: sanitizedErrorMessage(error) };
  }
}

async function main(): Promise<void> {
  const limit = parseBatchSize(process.env.MEDIA_CLEANUP_BATCH_SIZE);
  const service = new MediaAssetService(
    new DataConnectMediaAssetRepository(),
    new R2ObjectStore(),
  );

  // These stages are deliberately isolated. Emergency marker reconciliation
  // still runs after another stage fails and safely retains markers whenever
  // Data Connect is unavailable.
  const staleUploadRecovery = await runStage(() => service.runStaleUploadRecovery(limit));
  const emergencyR2Cleanup = await runStage(() => service.runEmergencyCleanup(limit));
  const databaseCleanup = await runStage(() => service.runCleanup(limit));
  const storyDeletionCleanup = await runStage(() => service.runStoryDeletionCleanup(limit));
  const storage = await runStage(() => service.inspectStorage());
  const ok = staleUploadRecovery.ok
    && emergencyR2Cleanup.ok
    && databaseCleanup.ok
    && storyDeletionCleanup.ok
    && storage.ok;

  process.stdout.write(`${JSON.stringify({
    ok,
    limit,
    staleUploadRecovery,
    emergencyR2Cleanup,
    databaseCleanup,
    storyDeletionCleanup,
    storage,
  }, null, 2)}\n`);

  if (!ok) process.exitCode = 1;
}

main().catch((error: unknown) => {
  process.stderr.write(`${JSON.stringify({
    ok: false,
    error: sanitizedErrorMessage(error),
  })}\n`);
  process.exitCode = 1;
});
