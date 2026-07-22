import { cert, getApps, initializeApp, type App, type AppOptions } from 'firebase-admin/app';

let initializedApp: App | undefined;

function parseServiceAccount(raw: string): AppOptions['credential'] {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.', { cause: error });
  }
  if (!value || typeof value !== 'object') throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON must contain a service account object.');
  const account = value as Record<string, unknown>;
  if (typeof account.private_key === 'string') account.private_key = account.private_key.replace(/\\n/g, '\n');
  return cert(account as Parameters<typeof cert>[0]);
}

/** Lazy initialization keeps the current unauthenticated routes/build unchanged. */
export function getFirebaseAdminApp(env: NodeJS.ProcessEnv = process.env): App {
  if (initializedApp) return initializedApp;
  const existing = getApps()[0];
  if (existing) {
    initializedApp = existing;
    return existing;
  }

  const options: AppOptions = {};
  const projectId = env.FIREBASE_PROJECT_ID?.trim() || env.GCLOUD_PROJECT?.trim();
  if (projectId) options.projectId = projectId;
  const serviceAccount = env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (serviceAccount) options.credential = parseServiceAccount(serviceAccount);
  initializedApp = initializeApp(options);
  return initializedApp;
}
