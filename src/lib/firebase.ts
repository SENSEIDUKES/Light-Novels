import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

export const LOCAL_ONLY_MODE = localStorage.getItem('seihouse_local_only_mode') === 'true';

export const setLocalOnlyMode = (enabled: boolean) => {
  localStorage.setItem('seihouse_local_only_mode', enabled ? 'true' : 'false');
  window.location.reload();
};

const app = LOCAL_ONLY_MODE ? null as any : initializeApp(firebaseConfig);
export const db = LOCAL_ONLY_MODE ? ({} as any) : initializeFirestore(app, {
  ignoreUndefinedProperties: true
}, firebaseConfig.firestoreDatabaseId);
export const auth = LOCAL_ONLY_MODE ? ({ currentUser: null, onAuthStateChanged: () => () => {} } as any) : getAuth(app);
export const firebaseStorage = LOCAL_ONLY_MODE ? ({} as ReturnType<typeof getStorage>) : getStorage(app);

// Helper for error handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  const wrappedError = new Error(JSON.stringify(errInfo), { cause: error });
  if (error && typeof error === 'object' && 'code' in error) {
    (wrappedError as Error & { code?: unknown }).code = (error as { code?: unknown }).code;
  }
  throw wrappedError;
}
