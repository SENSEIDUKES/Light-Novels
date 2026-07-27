/**
 * Controllable stand-in for Firebase Authentication.
 *
 * Firebase Auth is the one dependency a journey test cannot run in-process, so
 * it is replaced by an object with the exact shape the application consumes:
 * `auth.currentUser` with `uid`/`getIdToken`, plus `onAuthStateChanged`
 * notification on sign-in and sign-out. The ID token it mints is verified by
 * the real persistence router through an injected verifier, so the server still
 * derives the owner uid from the presented token and nothing else.
 */

export interface TestUser {
  uid: string;
  email?: string;
  getIdToken(forceRefresh?: boolean): Promise<string>;
}

type Listener = (user: TestUser | null) => void;

const listeners = new Set<Listener>();

const DEFAULT_POPUP_UID = 'popup-test-uid';
const DEFAULT_POPUP_EMAIL = 'popup@example.test';

/** Deterministic uid for an email-based sign-in, so repeat sign-ins converge. */
function uidForEmail(email: string): string {
  return `email-${email.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

export const testAuth: { currentUser: TestUser | null } = { currentUser: null };

export function mintTestIdToken(uid: string, email?: string): string {
  return `test-id-token.${Buffer.from(JSON.stringify({ uid, email })).toString('base64url')}`;
}

/** Server-side verifier counterpart. Rejects anything this module did not mint. */
export function verifyTestIdToken(token: string): { uid: string; email?: string } {
  const [prefix, payload] = token.split('.');
  if (prefix !== 'test-id-token' || !payload) throw new Error('Invalid test ID token.');
  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (typeof decoded.uid !== 'string' || !decoded.uid) throw new Error('Invalid test ID token.');
  return decoded;
}

export function signInTestUser(uid: string, email?: string): TestUser {
  const user: TestUser = {
    uid,
    email,
    getIdToken: async () => mintTestIdToken(uid, email),
  };
  testAuth.currentUser = user;
  for (const listener of listeners) listener(user);
  return user;
}

export function signOutTestUser(): void {
  testAuth.currentUser = null;
  for (const listener of listeners) listener(null);
}

export function resetTestAuth(): void {
  testAuth.currentUser = null;
  listeners.clear();
}

/** Replacement for `src/lib/firebase`. */
export function firebaseModuleMock() {
  return {
    auth: testAuth,
    firebaseApp: null,
    LOCAL_ONLY_MODE: false,
    setLocalOnlyMode: () => {},
  };
}

/** Replacement for the `firebase/auth` surface the app imports. */
export function firebaseAuthModuleMock() {
  return {
    getAuth: () => testAuth,
    onAuthStateChanged: (_auth: unknown, callback: Listener) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    signOut: async () => signOutTestUser(),
    GoogleAuthProvider: class {},
    // Each sign-in entry point must actually establish the session, otherwise a
    // test that signs in through one of them silently keeps the previous user.
    signInWithPopup: async () => ({
      user: signInTestUser(DEFAULT_POPUP_UID, DEFAULT_POPUP_EMAIL),
    }),
    signInWithEmailAndPassword: async (_auth: unknown, email: string) => ({
      user: signInTestUser(uidForEmail(email), email),
    }),
    createUserWithEmailAndPassword: async (_auth: unknown, email: string) => ({
      user: signInTestUser(uidForEmail(email), email),
    }),
    updateProfile: async () => {},
    sendPasswordResetEmail: async () => {},
  };
}
