import { getApps, initializeApp, type App, type AppOptions } from 'firebase-admin/app';
import { createVercelGcpCredential } from './vercelGcpCredential';

let initializedApp: App | undefined;

function usesFirebaseEmulators(env: NodeJS.ProcessEnv): boolean {
  return Boolean(
    env.FIREBASE_AUTH_EMULATOR_HOST
    || env.DATA_CONNECT_EMULATOR_HOST
    || env.FIREBASE_DATA_CONNECT_EMULATOR_HOST
    || env.FIREBASE_DATACONNECT_EMULATOR_HOST,
  );
}

/** Lazy initialization keeps unauthenticated routes and builds independent of Google credentials. */
export function getFirebaseAdminApp(env: NodeJS.ProcessEnv = process.env): App {
  if (initializedApp) return initializedApp;
  const existing = getApps()[0];
  if (existing) {
    initializedApp = existing;
    return existing;
  }

  const projectId = env.FIREBASE_PROJECT_ID?.trim() || env.GCLOUD_PROJECT?.trim();
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID is required for Firebase Data Connect.');
  const options: AppOptions = { projectId };
  if (!usesFirebaseEmulators(env)) {
    options.credential = createVercelGcpCredential({ env });
  }
  initializedApp = initializeApp(options);
  return initializedApp;
}
