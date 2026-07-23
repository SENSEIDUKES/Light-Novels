// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cert: vi.fn((account: unknown) => ({ credential: account })),
  getApps: vi.fn(() => [] as unknown[]),
  initializeApp: vi.fn((options: unknown) => ({ options })),
}));

vi.mock('firebase-admin/app', () => ({
  cert: mocks.cert,
  getApps: mocks.getApps,
  initializeApp: mocks.initializeApp,
}));

async function loadModule() {
  vi.resetModules();
  return import('./firebaseAdmin');
}

describe('Firebase Admin initialization', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('accepts the hosted service account alias used by deployment secrets', async () => {
    const { getFirebaseAdminApp } = await loadModule();

    getFirebaseAdminApp({
      FIREBASE_SERVICE_ACCOUNT: JSON.stringify({
        project_id: 'demo-project',
        client_email: 'firebase-adminsdk@example.test',
        private_key: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n',
      }),
    } as NodeJS.ProcessEnv);

    expect(mocks.cert).toHaveBeenCalledWith(expect.objectContaining({
      client_email: 'firebase-adminsdk@example.test',
      private_key: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
    }));
    expect(mocks.initializeApp).toHaveBeenCalledWith({ credential: expect.any(Object) });
  });

  it('can initialize from base64 JSON without falling back to missing ADC credentials', async () => {
    const { getFirebaseAdminApp } = await loadModule();
    const encoded = Buffer.from(JSON.stringify({
      project_id: 'demo-project',
      client_email: 'firebase-adminsdk@example.test',
      private_key: 'private-key',
    })).toString('base64');

    getFirebaseAdminApp({ FIREBASE_SERVICE_ACCOUNT_BASE64: encoded } as NodeJS.ProcessEnv);

    expect(mocks.cert).toHaveBeenCalledWith(expect.objectContaining({
      client_email: 'firebase-adminsdk@example.test',
    }));
    expect(mocks.initializeApp).toHaveBeenCalledWith({ credential: expect.any(Object) });
  });

  it('can initialize from split Firebase Admin credential variables', async () => {
    const { getFirebaseAdminApp } = await loadModule();

    getFirebaseAdminApp({
      FIREBASE_PROJECT_ID: 'demo-project',
      FIREBASE_CLIENT_EMAIL: 'firebase-adminsdk@example.test',
      FIREBASE_PRIVATE_KEY: 'line-one\\nline-two',
    } as NodeJS.ProcessEnv);

    expect(mocks.cert).toHaveBeenCalledWith({
      projectId: 'demo-project',
      clientEmail: 'firebase-adminsdk@example.test',
      privateKey: 'line-one\nline-two',
    });
    expect(mocks.initializeApp).toHaveBeenCalledWith({
      projectId: 'demo-project',
      credential: expect.any(Object),
    });
  });
});
