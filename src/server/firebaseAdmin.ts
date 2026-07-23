import { cert, getApps, initializeApp, type App, type AppOptions } from 'firebase-admin/app';

let initializedApp: App | undefined;

type ServiceAccountCandidate = {
  raw: string;
  envName: string;
  encoded?: 'base64';
};

function parseServiceAccount({ raw, envName, encoded }: ServiceAccountCandidate): AppOptions['credential'] {
  let json = raw;
  if (encoded === 'base64') {
    try {
      json = Buffer.from(raw, 'base64').toString('utf8');
    } catch (error) {
      throw new Error(`${envName} is not valid base64-encoded service account JSON.`, { cause: error });
    }
  }

  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch (error) {
    throw new Error(`${envName} is not valid JSON.`, { cause: error });
  }
  if (!value || typeof value !== 'object') throw new Error(`${envName} must contain a service account object.`);
  const account = value as Record<string, unknown>;
  if (typeof account.private_key === 'string') account.private_key = account.private_key.replace(/\\n/g, '\n');
  return cert(account as Parameters<typeof cert>[0]);
}

function serviceAccountFromParts(env: NodeJS.ProcessEnv): AppOptions['credential'] | undefined {
  const projectId = env.FIREBASE_PROJECT_ID?.trim() || env.GCLOUD_PROJECT?.trim();
  const clientEmail = env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = env.FIREBASE_PRIVATE_KEY?.trim().replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) return undefined;
  return cert({ projectId, clientEmail, privateKey });
}

function getServiceAccountCredential(env: NodeJS.ProcessEnv): AppOptions['credential'] | undefined {
  const candidates: ServiceAccountCandidate[] = [
    { raw: env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ?? '', envName: 'FIREBASE_SERVICE_ACCOUNT_JSON' },
    { raw: env.FIREBASE_SERVICE_ACCOUNT?.trim() ?? '', envName: 'FIREBASE_SERVICE_ACCOUNT' },
    { raw: env.FIREBASE_SERVICE_ACCOUNT_BASE64?.trim() ?? '', envName: 'FIREBASE_SERVICE_ACCOUNT_BASE64', encoded: 'base64' },
  ];
  const configured = candidates.find((candidate) => candidate.raw);
  if (configured) return parseServiceAccount(configured);
  return serviceAccountFromParts(env);
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
  const credential = getServiceAccountCredential(env);
  if (credential) options.credential = credential;
  initializedApp = initializeApp(options);
  return initializedApp;
}
