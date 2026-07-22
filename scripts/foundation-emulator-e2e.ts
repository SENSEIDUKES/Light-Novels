import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  updateProfile,
  type Auth,
} from 'firebase/auth';
import {
  connectDataConnectEmulator,
  getDataConnect,
  QueryFetchPolicy,
  terminate,
  type DataConnect,
} from 'firebase/data-connect';
import { deleteApp as deleteAdminApp, initializeApp as initializeAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getDataConnect as getAdminDataConnect } from 'firebase-admin/data-connect';

// Node ESM does not support directory imports. The generated packages expose a
// CommonJS entrypoint, so scripts load that entrypoint with require while still
// using the generated declaration files for complete type checking.
const require = createRequire(import.meta.url);
const adminSdk = require('../src/generated/dataconnect-admin') as typeof import('../src/generated/dataconnect-admin');
const clientSdk = require('../src/generated/dataconnect') as typeof import('../src/generated/dataconnect');
const {
  adminPurgeFoundationProbe,
  adminPurgeFoundationStory,
  connectorConfig: adminConnectorConfig,
} = adminSdk;
const {
  adminPurgeFoundationStory: clientAdminPurgeFoundationStory,
  connectorConfig,
  createFoundationProbe,
  createMyChapter,
  createStoryWithFirstChapter,
  deleteMyFoundationProbe,
  getMyChapter,
  getMyFoundationProbe,
  getMyStory,
  listMyFoundationProbes,
  listMyStories,
  softDeleteMyStory,
  upsertMyAccount,
} = clientSdk;

const EMULATOR_PROJECT_ID = 'demo-seihouse-foundation';

interface TestClient {
  app: FirebaseApp;
  auth: Auth;
  dataConnect: DataConnect;
  uid?: string;
}

function parseHostPort(value: string, variableName: string): { host: string; port: number } {
  const normalized = value.includes('://') ? value : `http://${value}`;
  const url = new URL(normalized);
  const port = Number(url.port);
  if (!url.hostname || !Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${variableName} must contain a host and port.`);
  }
  return { host: url.hostname, port };
}

function requireEmulators(): { authUrl: string; dataConnectHost: string; dataConnectPort: number } {
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST?.trim();
  const dataConnectHost = (
    process.env.DATA_CONNECT_EMULATOR_HOST
    ?? process.env.FIREBASE_DATA_CONNECT_EMULATOR_HOST
    ?? process.env.FIREBASE_DATACONNECT_EMULATOR_HOST
  )?.trim();
  if (!authHost || !dataConnectHost) {
    throw new Error(
      'Refusing to run without both Firebase Auth and Data Connect emulator environment variables. '
      + 'Use firebase emulators:exec --only auth,dataconnect.',
    );
  }
  const auth = parseHostPort(authHost, 'FIREBASE_AUTH_EMULATOR_HOST');
  const dataConnect = parseHostPort(dataConnectHost, 'DATA_CONNECT_EMULATOR_HOST');
  return {
    authUrl: `http://${auth.host}:${auth.port}`,
    dataConnectHost: dataConnect.host,
    dataConnectPort: dataConnect.port,
  };
}

function createTestClient(
  name: string,
  emulator: ReturnType<typeof requireEmulators>,
): TestClient {
  const app = initializeApp(
    {
      projectId: EMULATOR_PROJECT_ID,
      apiKey: 'demo-api-key',
      appId: `1:000000000000:web:${name}`,
      authDomain: `${EMULATOR_PROJECT_ID}.firebaseapp.com`,
    },
    name,
  );
  const auth = getAuth(app);
  connectAuthEmulator(auth, emulator.authUrl, { disableWarnings: true });
  const dataConnect = getDataConnect(app, connectorConfig);
  connectDataConnectEmulator(
    dataConnect,
    emulator.dataConnectHost,
    emulator.dataConnectPort,
    false,
  );
  return { app, auth, dataConnect };
}

async function closeTestClient(client: TestClient): Promise<void> {
  await terminate(client.dataConnect).catch(() => undefined);
  await deleteApp(client.app).catch(() => undefined);
}

async function assertRejects(operation: () => Promise<unknown>, message: string): Promise<void> {
  let rejected = false;
  try {
    await operation();
  } catch {
    rejected = true;
  }
  assert.equal(rejected, true, message);
}

async function step<T>(label: string, operation: () => Promise<T>, timeoutMs = 30_000): Promise<T> {
  process.stdout.write(`[foundation-emulator-e2e] ${label}\n`);
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      operation(),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(`Timed out during: ${label}`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function main(): Promise<void> {
  const emulator = requireEmulators();
  const runId = randomUUID();
  const clientA = createTestClient(`foundation-a-${runId}`, emulator);
  const clientB = createTestClient(`foundation-b-${runId}`, emulator);
  const adminApp = initializeAdminApp({ projectId: EMULATOR_PROJECT_ID }, `foundation-admin-${runId}`);
  const adminDataConnect = getAdminDataConnect(adminConnectorConfig, adminApp);
  let probeId: string | undefined;
  let storyId: string | undefined;

  try {
    const [credentialA, credentialB] = await step('create two Auth emulator users', () => Promise.all([
      createUserWithEmailAndPassword(
        clientA.auth,
        `foundation-a-${runId}@example.test`,
        `A-${runId}-valid-password`,
      ),
      createUserWithEmailAndPassword(
        clientB.auth,
        `foundation-b-${runId}@example.test`,
        `B-${runId}-valid-password`,
      ),
    ]));
    clientA.uid = credentialA.user.uid;
    clientB.uid = credentialB.user.uid;
    await step('assign representative Auth display names', () => Promise.all([
      updateProfile(credentialA.user, { displayName: 'Foundation User A' }),
      updateProfile(credentialB.user, { displayName: 'Foundation User B' }),
    ]));
    await step('refresh both Firebase ID tokens', () => Promise.all([
      credentialA.user.getIdToken(true),
      credentialB.user.getIdToken(true),
    ]));

    await step('upsert both SQL accounts', () => Promise.all([
      upsertMyAccount(clientA.dataConnect),
      upsertMyAccount(clientB.dataConnect),
    ]));

    const probe = await step('create User A ownership probe', () => createFoundationProbe(clientA.dataConnect, {
      label: `ownership-probe-${runId}`,
    }));
    probeId = probe.data.foundationProbe_insert.id;
    await assertRejects(
      () => createFoundationProbe(clientA.dataConnect, {
        label: `duplicate-ownership-probe-${runId}`,
      }),
      'Each authenticated owner must be limited to one foundation probe.',
    );
    const ownProbe = await getMyFoundationProbe(
      clientA.dataConnect,
      { id: probeId },
      { fetchPolicy: QueryFetchPolicy.SERVER_ONLY },
    );
    assert.equal(ownProbe.data.foundationProbe?.id, probeId);

    const foreignProbe = await getMyFoundationProbe(
      clientB.dataConnect,
      { id: probeId },
      { fetchPolicy: QueryFetchPolicy.SERVER_ONLY },
    );
    assert.equal(foreignProbe.data.foundationProbe ?? null, null, 'User B must not read User A probe.');
    const foreignDelete = await deleteMyFoundationProbe(clientB.dataConnect, { id: probeId });
    assert.equal(foreignDelete.data.foundationProbe_delete ?? null, null, 'User B must not delete User A probe.');
    const probeStillExists = await getMyFoundationProbe(
      clientA.dataConnect,
      { id: probeId },
      { fetchPolicy: QueryFetchPolicy.SERVER_ONLY },
    );
    assert.equal(probeStillExists.data.foundationProbe?.id, probeId);

    const createdStory = await step('create User A story and first chapter', () => createStoryWithFirstChapter(clientA.dataConnect, {
      title: `Foundation Story ${runId}`,
      genre: 'Integration test',
      mainCharacterName: 'Aster',
      premise: 'An isolated persistence test.',
      chapterTitle: 'First Commit',
      chapterPremise: 'Create the first owned chapter.',
    }));
    storyId = createdStory.data.story_insert.id;

    const ownStory = await getMyStory(
      clientA.dataConnect,
      { id: storyId },
      { fetchPolicy: QueryFetchPolicy.SERVER_ONLY },
    );
    assert.equal(ownStory.data.story?.id, storyId);
    assert.equal(ownStory.data.story?.chapters.length, 1);
    assert.equal(ownStory.data.story?.chapters[0]?.chapterNumber, 1);

    const foreignStory = await getMyStory(
      clientB.dataConnect,
      { id: storyId },
      { fetchPolicy: QueryFetchPolicy.SERVER_ONLY },
    );
    assert.equal(foreignStory.data.story ?? null, null, 'User B must not read User A story.');

    await assertRejects(
      () => createMyChapter(clientB.dataConnect, {
        storyId: storyId!,
        chapterNumber: 2,
        title: 'Unauthorized Chapter',
        premise: 'This mutation must be rejected.',
      }),
      'User B must not create a chapter in User A story.',
    );
    const chapterAfterDeniedWrite = await getMyChapter(
      clientA.dataConnect,
      { storyId, chapterNumber: 2 },
      { fetchPolicy: QueryFetchPolicy.SERVER_ONLY },
    );
    assert.equal(chapterAfterDeniedWrite.data.chapter ?? null, null);

    await assertRejects(
      () => clientAdminPurgeFoundationStory(clientB.dataConnect, { id: storyId! }),
      'NO_ACCESS operations must reject browser SDK callers.',
    );

    const createdChapter = await step('create and read User A second chapter', () => createMyChapter(clientA.dataConnect, {
      storyId: storyId!,
      chapterNumber: 2,
      title: 'Second Commit',
      premise: 'Verify owned chapter creation and retrieval.',
    }));
    const ownChapter = await getMyChapter(
      clientA.dataConnect,
      { storyId, chapterNumber: 2 },
      { fetchPolicy: QueryFetchPolicy.SERVER_ONLY },
    );
    assert.equal(ownChapter.data.chapter?.id, createdChapter.data.chapter_insert.id);
    assert.equal(ownChapter.data.chapter?.title, 'Second Commit');

    const foreignChapter = await getMyChapter(
      clientB.dataConnect,
      { storyId, chapterNumber: 2 },
      { fetchPolicy: QueryFetchPolicy.SERVER_ONLY },
    );
    assert.equal(foreignChapter.data.chapter ?? null, null, 'User B must not read User A chapter.');

    const [storiesA, storiesB, probesA, probesB] = await Promise.all([
      listMyStories(clientA.dataConnect, { fetchPolicy: QueryFetchPolicy.SERVER_ONLY }),
      listMyStories(clientB.dataConnect, { fetchPolicy: QueryFetchPolicy.SERVER_ONLY }),
      listMyFoundationProbes(clientA.dataConnect, { fetchPolicy: QueryFetchPolicy.SERVER_ONLY }),
      listMyFoundationProbes(clientB.dataConnect, { fetchPolicy: QueryFetchPolicy.SERVER_ONLY }),
    ]);
    assert.equal(storiesA.data.stories.some((story) => story.id === storyId), true);
    assert.equal(storiesB.data.stories.some((story) => story.id === storyId), false);
    assert.equal(probesA.data.foundationProbes.some((probeRow) => probeRow.id === probeId), true);
    assert.equal(probesB.data.foundationProbes.some((probeRow) => probeRow.id === probeId), false);

    const deletedStory = await step('soft-delete User A story', () => softDeleteMyStory(clientA.dataConnect, {
      id: storyId!,
    }));
    assert.equal(deletedStory.data.story_update?.id, storyId);

    const storyAfterDelete = await getMyStory(
      clientA.dataConnect,
      { id: storyId },
      { fetchPolicy: QueryFetchPolicy.SERVER_ONLY },
    );
    assert.equal(storyAfterDelete.data.story ?? null, null, 'User A must not read a soft-deleted story.');

    const chapterAfterStoryDelete = await getMyChapter(
      clientA.dataConnect,
      { storyId, chapterNumber: 2 },
      { fetchPolicy: QueryFetchPolicy.SERVER_ONLY },
    );
    assert.equal(chapterAfterStoryDelete.data.chapter ?? null, null, 'User A must not read a chapter from a soft-deleted story.');

    await assertRejects(
      () => createMyChapter(clientA.dataConnect, {
        storyId: storyId!,
        chapterNumber: 3,
        title: 'Deleted Story Chapter',
        premise: 'This mutation must be rejected after the story is deleted.',
      }),
      'User A must not create a chapter in a soft-deleted story.',
    );

    process.stdout.write(`${JSON.stringify({
      ok: true,
      checks: [
        'two authenticated emulator users',
        'one foundation probe per owner',
        'probe ownership read/delete denial',
        'story ownership read denial',
        'chapter ownership create/read denial',
        'NO_ACCESS browser denial',
        'owned story and two chapter round trip',
        'soft-deleted story chapter read/write denial',
      ],
    }, null, 2)}\n`);
  } finally {
    if (storyId) {
      await adminDataConnect.executeGraphql<{
        chapter_deleteMany: number;
        storyMember_deleteMany: number;
      }, { storyId: string }>(
        `mutation CleanupFoundationStoryChildren($storyId: UUID!) {
          chapter_deleteMany(where: { storyId: { eq: $storyId } })
          storyMember_deleteMany(where: { storyId: { eq: $storyId } })
        }`,
        { variables: { storyId } },
      ).catch(() => undefined);
      await adminPurgeFoundationStory(adminDataConnect, { id: storyId }).catch(() => undefined);
    }
    if (probeId) {
      await adminPurgeFoundationProbe(adminDataConnect, { id: probeId }).catch(() => undefined);
    }
    if (clientA.uid && clientB.uid) {
      await adminDataConnect.executeGraphql<{
        userAccount_deleteMany: number;
      }, { uids: string[] }>(
        `mutation CleanupFoundationUsers($uids: [String!]!) {
          userAccount_deleteMany(where: { uid: { in: $uids } })
        }`,
        { variables: { uids: [clientA.uid, clientB.uid] } },
      ).catch(() => undefined);
      await getAdminAuth(adminApp).deleteUsers([clientA.uid, clientB.uid]).catch(() => undefined);
    }
    await Promise.all([
      closeTestClient(clientA),
      closeTestClient(clientB),
    ]);
    await deleteAdminApp(adminApp).catch(() => undefined);
  }
}

main().then(
  () => {
    // Firebase browser SDKs can retain background handles after app teardown
    // under Node. This is a one-shot emulator executable, so exit explicitly
    // once every assertion and cleanup await has completed.
    process.exit(0);
  },
  (error: unknown) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`Foundation emulator E2E failed:\n${message}\n`);
    process.exit(1);
  },
);
