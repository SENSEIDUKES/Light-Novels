import { collection, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { generateUUID } from './id';
import { normalizeStorySeedPayload } from './storySeedFormat';
import type { Story, StorySeed, StorySeedPayload } from '../types';

const seedCollectionPath = (userId: string): string => `users/${userId}/seeds`;

const getAuthenticatedUid = (): string => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in to save story seeds to your account.');
  return uid;
};

const assertCurrentAccount = (expectedUid: string): void => {
  if (auth.currentUser?.uid === expectedUid) return;
  const error: Error & { code?: string } = new Error('Active account changed during story seed storage.');
  error.code = 'auth/account-changed';
  throw error;
};

const buildSeed = (
  userId: string,
  id: string,
  payload: StorySeedPayload,
  createdAt = new Date().toISOString(),
): StorySeed => {
  const normalized = normalizeStorySeedPayload(payload);
  return {
    schemaVersion: 1,
    id,
    userId,
    title: normalized.blueprint.title || normalized.intake.novelTitle || 'Untitled Seed',
    intake: normalized.intake,
    blueprint: normalized.blueprint,
    createdAt,
    updatedAt: new Date().toISOString(),
  };
};

const writeSeed = async (seed: StorySeed): Promise<StorySeed> => {
  try {
    await setDoc(doc(db, seedCollectionPath(seed.userId), seed.id), seed);
    assertCurrentAccount(seed.userId);
    return seed;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${seedCollectionPath(seed.userId)}/${seed.id}`);
    throw error;
  }
};

export const createStorySeed = async (
  payload: StorySeedPayload,
  options: { id?: string; createdAt?: string } = {},
): Promise<StorySeed> => {
  const userId = getAuthenticatedUid();
  const seed = buildSeed(
    userId,
    options.id || `seed-${generateUUID()}`,
    payload,
    options.createdAt,
  );
  return writeSeed(seed);
};

export const updateStorySeed = async (
  existingSeed: StorySeed,
  payload: StorySeedPayload,
): Promise<StorySeed> => {
  const userId = getAuthenticatedUid();
  if (existingSeed.userId !== userId) {
    throw new Error('Cannot update a story seed owned by another account.');
  }
  return writeSeed(buildSeed(userId, existingSeed.id, payload, existingSeed.createdAt));
};

export const getStorySeed = async (seedId: string): Promise<StorySeed | null> => {
  const userId = getAuthenticatedUid();
  try {
    const snapshot = await getDoc(doc(db, seedCollectionPath(userId), seedId));
    assertCurrentAccount(userId);
    if (!snapshot.exists()) return null;
    const seed = snapshot.data() as StorySeed;
    return seed.userId === userId ? seed : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${seedCollectionPath(userId)}/${seedId}`);
    throw error;
  }
};

export const listStorySeeds = async (): Promise<StorySeed[]> => {
  const userId = auth.currentUser?.uid;
  if (!userId) return [];
  try {
    // Keep the existing standard Web SDK path: this is one small, account-scoped
    // collection and must remain compatible with the app's current offline stack.
    const snapshot = await getDocs(collection(db, seedCollectionPath(userId)));
    assertCurrentAccount(userId);
    return snapshot.docs
      .map(seedDoc => seedDoc.data() as StorySeed)
      .filter(seed => seed.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, seedCollectionPath(userId));
    throw error;
  }
};

export const importStorySeeds = async (payloads: StorySeedPayload[]): Promise<StorySeed[]> => {
  if (payloads.length > 500) {
    throw new Error('A seed import can contain at most 500 seeds at a time.');
  }
  if (payloads.length === 0) return [];

  const userId = getAuthenticatedUid();
  const batch = writeBatch(db);
  const seeds = payloads.map(payload => buildSeed(userId, `seed-${generateUUID()}`, payload));
  for (const seed of seeds) {
    batch.set(doc(db, seedCollectionPath(userId), seed.id), seed);
  }

  try {
    await batch.commit();
    assertCurrentAccount(userId);
    return seeds;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, seedCollectionPath(userId));
    throw error;
  }
};

/**
 * Moves a legacy story's embedded seed inputs into durable account storage.
 * The deterministic ID makes retries idempotent if the story-reference write is interrupted.
 */
export const ensureAccountSeedForStory = async (story: Story): Promise<StorySeed> => {
  const userId = getAuthenticatedUid();
  if (story.userId !== userId) throw new Error('Cannot migrate a story owned by another account.');
  if (!story.intake || !story.blueprint) throw new Error('Story does not contain reusable seed inputs.');

  const seedId = story.sourceSeedId || `seed-${story.id}`;
  const existing = await getStorySeed(seedId);
  if (existing) return existing;
  return createStorySeed(
    { intake: story.intake, blueprint: story.blueprint },
    { id: seedId, createdAt: story.createdAt },
  );
};
