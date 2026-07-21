import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Story, StorySeedPayload } from '../types';

const mocks = vi.hoisted(() => ({
  auth: { currentUser: { uid: 'reader-1' } as { uid: string } | null },
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  writeBatch: vi.fn(),
  batchSet: vi.fn(),
  batchCommit: vi.fn(),
  handleFirestoreError: vi.fn(),
  generateUUID: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, path: string) => ({ path })),
  doc: vi.fn((_db: unknown, path: string, id: string) => ({ path: `${path}/${id}` })),
  getDoc: mocks.getDoc,
  getDocs: mocks.getDocs,
  setDoc: mocks.setDoc,
  writeBatch: mocks.writeBatch,
}));

vi.mock('./firebase', () => ({
  auth: mocks.auth,
  db: {},
  OperationType: { WRITE: 'write', GET: 'get', LIST: 'list' },
  handleFirestoreError: mocks.handleFirestoreError,
}));

vi.mock('./id', () => ({
  generateUUID: mocks.generateUUID,
  generateId: vi.fn(() => 'local-id'),
}));

import {
  createStorySeed,
  ensureAccountSeedForStory,
  getStorySeed,
  importStorySeeds,
  listStorySeeds,
} from './storySeedStorage';

const payload: StorySeedPayload = {
  intake: { novelTitle: 'The Jade Gate', mcName: 'Lin' },
  blueprint: {
    title: 'The Jade Gate',
    logline: 'A sealed gate awakens.',
    worldOverview: '',
    startingLocation: '',
    societyStructure: '',
    powerSystemOutline: '',
    mcProfile: '',
    majorFactions: [],
    initialCharacters: [],
    majorMysteries: [],
    firstArcPromise: '',
    tropeRules: '',
    styleBible: '',
    estimatedArcs: 5,
    unresolvedPlotThreads: [],
  },
};

describe('storySeedStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.currentUser = { uid: 'reader-1' };
    mocks.setDoc.mockResolvedValue(undefined);
    mocks.generateUUID.mockReturnValue('new-id');
    mocks.batchSet.mockReset();
    mocks.batchCommit.mockReset().mockResolvedValue(undefined);
    mocks.writeBatch.mockReturnValue({ set: mocks.batchSet, commit: mocks.batchCommit });
    mocks.handleFirestoreError.mockReset();
  });

  it('creates a private account seed under the signed-in user', async () => {
    const seed = await createStorySeed(payload);

    expect(seed).toMatchObject({
      schemaVersion: 1,
      id: 'seed-new-id',
      userId: 'reader-1',
      title: 'The Jade Gate',
    });
    expect(mocks.setDoc).toHaveBeenCalledWith(
      { path: 'users/reader-1/seeds/seed-new-id' },
      seed,
    );
  });

  it('gives every imported seed a new internal ID', async () => {
    mocks.generateUUID.mockReturnValueOnce('import-1').mockReturnValueOnce('import-2');

    const imported = await importStorySeeds([
      payload,
      { ...payload, blueprint: { ...payload.blueprint, title: 'Second Seed' } },
    ]);

    expect(imported.map(seed => seed.id)).toEqual(['seed-import-1', 'seed-import-2']);
    expect(mocks.writeBatch).toHaveBeenCalledOnce();
    expect(mocks.batchSet).toHaveBeenCalledTimes(2);
    expect(mocks.batchCommit).toHaveBeenCalledOnce();
    expect(mocks.setDoc).not.toHaveBeenCalled();
  });

  it('backfills a legacy embedded seed with an idempotent ID independent of story deletion', async () => {
    mocks.getDoc.mockResolvedValue({ exists: () => false });
    const story = {
      id: 'story-legacy',
      userId: 'reader-1',
      createdAt: '2026-07-20T00:00:00.000Z',
      intake: payload.intake,
      blueprint: payload.blueprint,
    } as Story;

    const seed = await ensureAccountSeedForStory(story);

    expect(seed.id).toBe('seed-story-legacy');
    expect(mocks.setDoc).toHaveBeenCalledWith(
      { path: 'users/reader-1/seeds/seed-story-legacy' },
      expect.objectContaining({ id: 'seed-story-legacy', userId: 'reader-1' }),
    );
  });

  it('lists only the active account seeds in newest-first order', async () => {
    mocks.getDocs.mockResolvedValue({
      docs: [
        { data: () => ({ ...payload, id: 'older', userId: 'reader-1', updatedAt: '2026-07-20' }) },
        { data: () => ({ ...payload, id: 'foreign', userId: 'reader-2', updatedAt: '2026-07-22' }) },
        { data: () => ({ ...payload, id: 'newer', userId: 'reader-1', updatedAt: '2026-07-21' }) },
      ],
    });

    await expect(listStorySeeds()).resolves.toMatchObject([{ id: 'newer' }, { id: 'older' }]);
  });

  it('does not write part of an import when the atomic batch fails', async () => {
    const error = new Error('batch unavailable');
    mocks.batchCommit.mockRejectedValue(error);

    await expect(importStorySeeds([payload])).rejects.toBe(error);

    expect(mocks.batchSet).toHaveBeenCalledOnce();
    expect(mocks.batchCommit).toHaveBeenCalledOnce();
    expect(mocks.setDoc).not.toHaveBeenCalled();
  });

  it('rejects oversized imports before creating a batch', async () => {
    await expect(importStorySeeds(Array.from({ length: 501 }, () => payload))).rejects.toThrow('at most 500');

    expect(mocks.writeBatch).not.toHaveBeenCalled();
  });

  it('propagates write, read, and list failures even if the error reporter returns', async () => {
    const writeError = new Error('write denied');
    mocks.setDoc.mockRejectedValue(writeError);
    await expect(createStorySeed(payload)).rejects.toBe(writeError);

    const readError = new Error('read denied');
    mocks.getDoc.mockRejectedValue(readError);
    await expect(getStorySeed('seed-1')).rejects.toBe(readError);

    const listError = new Error('list denied');
    mocks.getDocs.mockRejectedValue(listError);
    await expect(listStorySeeds()).rejects.toBe(listError);

    expect(mocks.handleFirestoreError).toHaveBeenCalledTimes(3);
  });
});
