import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import type { AddressInfo } from 'node:net';
import { config as loadEnvironment } from 'dotenv';
import { getAuth, type UserRecord } from 'firebase-admin/auth';
import { chromium } from '@playwright/test';
import { getFirebaseAdminApp } from '../src/server/firebaseAdmin';
import { MediaAssetService, MediaAssetServiceError } from '../src/server/media/mediaAssetService';
import { loadR2Config, R2ObjectStore } from '../src/server/media/r2ObjectStore';

// Loading the repository through CommonJS lets the generated Data Connect
// package use its declared CommonJS entrypoint under the tsx script runner.
const require = createRequire(import.meta.url);
const repositoryModule = require('../src/server/media/dataConnectMediaAssetRepository.ts') as typeof import('../src/server/media/dataConnectMediaAssetRepository');
const { DataConnectMediaAssetRepository } = repositoryModule;

loadEnvironment({ quiet: true });

const LIVE_OPT_IN = 'I_UNDERSTAND_THIS_WRITES_AND_DELETES_PRODUCTION_MEDIA';
const ONE_PIXEL_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const ONE_PIXEL_PNG = Buffer.from(ONE_PIXEL_PNG_BASE64, 'base64');
const ONE_PIXEL_DATA_URL = `data:image/png;base64,${ONE_PIXEL_PNG_BASE64}`;

function requireLiveOptIn(): void {
  if (process.env.FOUNDATION_RUN_LIVE_R2_TEST !== LIVE_OPT_IN) {
    throw new Error(
      `Live R2 smoke test is disabled. Set FOUNDATION_RUN_LIVE_R2_TEST=${LIVE_OPT_IN} to opt in.`,
    );
  }
  if (
    process.env.DATA_CONNECT_EMULATOR_HOST
    || process.env.FIREBASE_DATA_CONNECT_EMULATOR_HOST
    || process.env.FIREBASE_DATACONNECT_EMULATOR_HOST
    || process.env.FIREBASE_AUTH_EMULATOR_HOST
  ) {
    throw new Error('Live R2 smoke test refuses to run while any Firebase emulator variable is set.');
  }
  if (!process.env.FIREBASE_PROJECT_ID?.trim() && !process.env.GCLOUD_PROJECT?.trim()) {
    throw new Error('FIREBASE_PROJECT_ID must identify the deployed Firebase project.');
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() && !process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()) {
    throw new Error(
      'Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON for Firebase Admin access.',
    );
  }
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function encodeObjectKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

async function fetchInCleanBrowser(url: string): Promise<{ status: number; contentType: string; bytes: number[] }> {
  const originServer = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-store' });
    response.end('<!doctype html><title>R2 clean-session acceptance</title>');
  });
  await new Promise<void>((resolve, reject) => {
    originServer.once('error', reject);
    originServer.listen(0, '127.0.0.1', resolve);
  });
  const { port } = originServer.address() as AddressInfo;
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'domcontentloaded' });
    return await page.evaluate(async (deliveryUrl) => {
      const response = await fetch(deliveryUrl, { cache: 'no-store', redirect: 'error' });
      return {
        status: response.status,
        contentType: response.headers.get('content-type') ?? '',
        bytes: Array.from(new Uint8Array(await response.arrayBuffer())),
      };
    }, url);
  } finally {
    await browser.close();
    await new Promise<void>((resolve, reject) => originServer.close((error) => error ? reject(error) : resolve()));
  }
}

async function main(): Promise<void> {
  requireLiveOptIn();
  const app = getFirebaseAdminApp();
  const auth = getAuth(app);
  const repository = new DataConnectMediaAssetRepository();
  const objectStore = new R2ObjectStore();
  const r2Config = loadR2Config();
  const service = new MediaAssetService(repository, objectStore);
  const runId = randomUUID();
  const purpose = `foundation-live-smoke-${Date.now()}`;
  let authUser: UserRecord | undefined;
  let assetId: string | undefined;
  let objectKey: string | undefined;
  let objectBucket: string | undefined;
  let lifecycleDeleteCompleted = false;

  try {
    authUser = await auth.createUser({
      email: `foundation-live-${runId}@example.test`,
      displayName: 'Foundation Live R2 Smoke',
      emailVerified: true,
      disabled: false,
    });
    const owner = {
      uid: authUser.uid,
      email: authUser.email ?? null,
      displayName: authUser.displayName ?? null,
    };

    const descriptor = await service.save(owner, {
      source: {
        kind: 'data-url',
        dataUrl: ONE_PIXEL_DATA_URL,
        filename: 'foundation-live-smoke.png',
      },
      assetType: 'IMAGE',
      purpose,
      visibility: 'PRIVATE',
      association: {
        targetKind: 'PROFILE',
        targetKey: owner.uid,
        purpose,
      },
    });
    assetId = descriptor.id;
    assert.equal(descriptor.status, 'READY');
    assert.equal(descriptor.mimeType, 'image/png');
    assert.equal(descriptor.byteSize, ONE_PIXEL_PNG.byteLength.toString());
    assert.equal(
      descriptor.checksumSha256,
      createHash('sha256').update(ONE_PIXEL_PNG).digest('hex'),
    );
    assert.equal('objectKey' in descriptor, false, 'Delivery descriptors must not expose R2 keys.');
    assert.equal('bucket' in descriptor, false, 'Delivery descriptors must not expose R2 buckets.');
    assert.equal('dataUrl' in descriptor, false, 'Permanent descriptors must not retain data URLs.');

    const readyRecord = await repository.getOwned(owner.uid, descriptor.id);
    assert.equal(readyRecord?.status, 'READY', 'PostgreSQL must commit READY before success.');
    assert.equal(readyRecord?.checksumSha256, descriptor.checksumSha256);
    assert.equal(readyRecord?.bucket, r2Config.privateBucket, 'Private assets must use the isolated private R2 bucket.');
    assert.ok(readyRecord?.objectKey.startsWith('user-media/private/'));
    objectKey = readyRecord.objectKey;
    objectBucket = readyRecord.bucket;
    const head = await objectStore.head(objectBucket, objectKey);
    assert.equal(head?.byteSize, ONE_PIXEL_PNG.byteLength);
    assert.equal(head?.checksumSha256, descriptor.checksumSha256);

    // A new browser and context have no Firebase token, cookies, local storage,
    // or inherited application state. Access is granted only by the short-lived
    // private signature, and therefore also exercises the private bucket CORS rule.
    const cleanResponse = await fetchInCleanBrowser(descriptor.deliveryUrl);
    assert.equal(cleanResponse.status, 200);
    assert.match(cleanResponse.contentType, /^image\/png(?:;|$)/i);
    const fetchedBytes = Buffer.from(cleanResponse.bytes);
    assert.equal(fetchedBytes.equals(ONE_PIXEL_PNG), true, 'Clean-session R2 bytes must match exactly.');

    const unsignedEndpointUrl = `${r2Config.endpoint}/${encodeURIComponent(objectBucket)}/${encodeObjectKey(objectKey)}`;
    const unsignedEndpointResponse = await fetch(unsignedEndpointUrl, { redirect: 'manual', cache: 'no-store' });
    assert.equal(unsignedEndpointResponse.ok, false, 'Private R2 objects must reject unsigned endpoint access.');
    if (r2Config.publicBaseUrl) {
      const publicOriginResponse = await fetch(`${r2Config.publicBaseUrl}/${encodeObjectKey(objectKey)}`, {
        redirect: 'manual',
        cache: 'no-store',
      });
      assert.equal(publicOriginResponse.ok, false, 'Private objects must not exist through the configured public R2 origin.');
    }

    await service.delete(owner.uid, descriptor.id);
    lifecycleDeleteCompleted = true;
    const deletedRecord = await repository.getOwned(owner.uid, descriptor.id);
    assert.equal(deletedRecord?.status, 'DELETED', 'PostgreSQL must retain the DELETED lifecycle tombstone.');
    assert.equal(await objectStore.head(objectBucket, objectKey), null, 'R2 HEAD must be empty after deletion.');
    const staleSignedResponse = await fetch(descriptor.deliveryUrl, {
      cache: 'no-store',
      redirect: 'manual',
    });
    assert.equal(staleSignedResponse.ok, false, 'The signed URL must stop serving after deletion.');

  } catch (error) {
    if (!assetId && error instanceof MediaAssetServiceError) assetId = error.assetId;
    throw error;
  } finally {
    if (authUser && assetId && !lifecycleDeleteCompleted) {
      try {
        await service.delete(authUser.uid, assetId);
      } catch (deleteError) {
        try {
          await service.runCleanup(100);
        } catch (cleanupError) {
          process.stderr.write(
            `Media cleanup is still pending for ${assetId}: ${errorText(deleteError)}; ${errorText(cleanupError)}\n`,
          );
        }
        if (objectBucket && objectKey) await objectStore.delete(objectBucket, objectKey).catch(() => undefined);
      }
    }
    if (authUser) {
      await auth.deleteUser(authUser.uid);
    }
  }

  process.stdout.write(`${JSON.stringify({
    ok: true,
    checks: [
      'temporary production Firebase Auth user created',
      'data URL normalized and R2 PUT/HEAD confirmed',
      'PostgreSQL READY lifecycle confirmed',
      'fresh browser context returned exact signed image bytes through CORS',
      'unsigned private endpoint and configured public origin denied the object',
      'R2 object deleted and PostgreSQL DELETED lifecycle confirmed',
      'temporary Firebase Auth user deleted during teardown',
    ],
    note: 'The SQL UserAccount and DELETED media tombstone remain intentionally for lifecycle auditability.',
  }, null, 2)}\n`);
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    const responseData = typeof error === 'object' && error !== null && 'httpResponse' in error
      ? (error as { httpResponse?: { data?: unknown } }).httpResponse?.data
      : undefined;
    const details = responseData === undefined ? '' : `\nResponse:\n${JSON.stringify(responseData, null, 2)}`;
    process.stderr.write(`Foundation live R2 smoke test failed:\n${message}${details}\n`);
    process.exit(1);
  },
);
