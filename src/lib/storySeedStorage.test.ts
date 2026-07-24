import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Story, StorySeed, StorySeedPayload } from '../types';

const mocks = vi.hoisted(() => ({
  auth: { currentUser: { uid: 'reader-1' } as { uid: string } | null },
  generateUUID: vi.fn(),
  getStorySeed: vi.fn(),
  listStorySeeds: vi.fn(),
  saveStorySeed: vi.fn(),
  saveStorySeeds: vi.fn(),
}));

vi.mock('./firebase', () => ({ auth: mocks.auth }));
vi.mock('./id', () => ({ generateUUID: mocks.generateUUID }));
vi.mock('./persistence', () => ({
  getStorySeed: mocks.getStorySeed,
  listStorySeeds: mocks.listStorySeeds,
  saveStorySeed: mocks.saveStorySeed,
  saveStorySeeds: mocks.saveStorySeeds,
}));

import {
  createStorySeed,
  ensureAccountSeedForStory,
  getStorySeed,
  importStorySeeds,
  listStorySeeds,
  updateStorySeed,
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
    mocks.generateUUID.mockReturnValue('new-id');
    mocks.getStorySeed.mockResolvedValue(null);
    mocks.listStorySeeds.mockResolvedValue([]);
    mocks.saveStorySeed.mockImplementation(async (seed: StorySeed) => seed);
    mocks.saveStorySeeds.mockImplementation(async (seeds: StorySeed[]) => seeds);
  });

  it('creates an owner-scoped seed through the PostgreSQL persistence client', async () => {
    const seed = await createStorySeed(payload);

    expect(seed).toMatchObject({
      schemaVersion: 1,
      id: 'seed-new-id',
      userId: 'reader-1',
      title: 'The Jade Gate',
    });
    expect(mocks.saveStorySeed).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'seed-new-id', userId: 'reader-1' }),
      { idempotencyKey: 'new-id' },
    );
  });

  it('gives imported seeds stable IDs and commits the collection atomically', async () => {
    mocks.generateUUID
      .mockReturnValueOnce('import-1')
      .mockReturnValueOnce('import-2')
      .mockReturnValueOnce('batch-request');

    const imported = await importStorySeeds([
      payload,
      { ...payload, blueprint: { ...payload.blueprint, title: 'Second Seed' } },
    ]);

    expect(imported.map(seed => seed.id)).toEqual(['seed-import-1', 'seed-import-2']);
    expect(mocks.saveStorySeeds).toHaveBeenCalledWith(
      [
        expect.objectContaining({ id: 'seed-import-1' }),
        expect.objectContaining({ id: 'seed-import-2' }),
      ],
      'batch-request',
    );
    expect(mocks.saveStorySeed).not.toHaveBeenCalled();
  });

  it('backfills an embedded seed with a deterministic ID independent of story deletion', async () => {
    const story = {
      id: 'story-legacy',
      userId: 'reader-1',
      createdAt: '2026-07-20T00:00:00.000Z',
      intake: payload.intake,
      blueprint: payload.blueprint,
    } as Story;

    const seed = await ensureAccountSeedForStory(story);

    expect(mocks.getStorySeed).toHaveBeenCalledWith('seed-story-legacy');
    expect(seed.id).toBe('seed-story-legacy');
    expect(mocks.saveStorySeed).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'seed-story-legacy', userId: 'reader-1' }),
      expect.any(Object),
    );
  });

  it('returns the existing deterministic seed without rewriting it', async () => {
    const existing = {
      id: 'seed-story-legacy',
      userId: 'reader-1',
    } as StorySeed;
    mocks.getStorySeed.mockResolvedValue(existing);

    await expect(ensureAccountSeedForStory({
      id: 'story-legacy',
      userId: 'reader-1',
      intake: payload.intake,
      blueprint: payload.blueprint,
    } as Story)).resolves.toBe(existing);
    expect(mocks.saveStorySeed).not.toHaveBeenCalled();
  });

  it('filters server results to the active owner and sorts newest first', async () => {
    mocks.listStorySeeds.mockResolvedValue([
      { id: 'older', userId: 'reader-1', updatedAt: '2026-07-20' },
      { id: 'foreign', userId: 'reader-2', updatedAt: '2026-07-22' },
      { id: 'newer', userId: 'reader-1', updatedAt: '2026-07-21' },
    ] as StorySeed[]);

    await expect(listStorySeeds()).resolves.toMatchObject([{ id: 'newer' }, { id: 'older' }]);
  });

  it('rejects cross-account reads, updates, and account changes during requests', async () => {
    mocks.getStorySeed.mockResolvedValue({ id: 'seed-1', userId: 'reader-2' });
    await expect(getStorySeed('seed-1')).resolves.toBeNull();

    await expect(updateStorySeed({ userId: 'reader-2' } as StorySeed, payload))
      .rejects.toThrow('another account');

    mocks.getStorySeed.mockImplementation(async () => {
      mocks.auth.currentUser = { uid: 'reader-2' };
      return null;
    });
    await expect(getStorySeed('seed-1')).rejects.toMatchObject({
      code: 'auth/account-changed',
    });
  });

  it('rejects oversized imports before issuing a write', async () => {
    await expect(importStorySeeds(Array.from({ length: 501 }, () => payload)))
      .rejects.toThrow('at most 500');
    expect(mocks.saveStorySeed).not.toHaveBeenCalled();
  });

  it('propagates persistence failures', async () => {
    const writeError = new Error('database unavailable');
    mocks.saveStorySeed.mockRejectedValue(writeError);
    await expect(createStorySeed(payload)).rejects.toBe(writeError);

    const readError = new Error('read unavailable');
    mocks.getStorySeed.mockRejectedValue(readError);
    await expect(getStorySeed('seed-1')).rejects.toBe(readError);
  });
});
