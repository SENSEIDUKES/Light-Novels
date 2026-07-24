import { auth } from './firebase';
import { generateUUID } from './id';
import {
  getStorySeed as getPostgresStorySeed,
  listStorySeeds as listPostgresStorySeeds,
  saveStorySeed as savePostgresStorySeed,
  saveStorySeeds as savePostgresStorySeeds,
} from './persistence';
import { normalizeStorySeedPayload } from './storySeedFormat';
import type { Story, StorySeed, StorySeedPayload } from '../types';

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
  const saved = await savePostgresStorySeed(seed, {
    idempotencyKey: generateUUID(),
  });
  assertCurrentAccount(seed.userId);
  return saved;
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
  const seed = await getPostgresStorySeed(seedId);
  assertCurrentAccount(userId);
  return seed?.userId === userId ? seed : null;
};

export const listStorySeeds = async (): Promise<StorySeed[]> => {
  const userId = auth.currentUser?.uid;
  if (!userId) return [];
  const seeds = await listPostgresStorySeeds();
  assertCurrentAccount(userId);
  return seeds
    .filter(seed => seed.userId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};

export const importStorySeeds = async (payloads: StorySeedPayload[]): Promise<StorySeed[]> => {
  if (payloads.length > 500) {
    throw new Error('A seed import can contain at most 500 seeds at a time.');
  }
  if (payloads.length === 0) return [];

  const userId = getAuthenticatedUid();
  const seeds = payloads.map(payload => buildSeed(userId, `seed-${generateUUID()}`, payload));
  const saved = await savePostgresStorySeeds(seeds, generateUUID());
  assertCurrentAccount(userId);
  return saved;
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
