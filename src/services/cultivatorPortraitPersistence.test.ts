import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MediaAssetDescriptor } from '../contracts/mediaAssets';
import type { PersistCultivatorPortraitInput } from './cultivatorPortraitPersistence';

const ASSET_ID = '11111111-1111-4111-8111-111111111111';
const mocks = vi.hoisted(() => ({
  auth: {
    currentUser: {
      uid: 'user-123',
      getIdToken: vi.fn(async () => 'firebase-token'),
    } as { uid: string; getIdToken(): Promise<string> } | null,
  },
  generateUUID: vi.fn(() => 'request-key'),
  saveMediaAsset: vi.fn(),
}));

vi.mock('../lib/firebase', () => ({ auth: mocks.auth }));
vi.mock('../lib/id', () => ({ generateUUID: mocks.generateUUID }));
vi.mock('../lib/media/mediaAssetClient', () => ({
  MEDIA_PURPOSE: { CELESTIAL_PORTRAIT: 'CELESTIAL_PORTRAIT' },
  MEDIA_TARGET_KIND: { PORTRAIT: 'PORTRAIT' },
  saveMediaAsset: mocks.saveMediaAsset,
}));

import {
  CultivatorPortraitCommitDeferredError,
  persistCultivatorPortrait,
  retryPendingCultivatorPortraits,
} from './cultivatorPortraitPersistence';

const descriptor = {
  id: ASSET_ID,
  ownerUid: 'user-123',
  assetType: 'IMAGE',
  purpose: 'CELESTIAL_PORTRAIT',
  visibility: 'PRIVATE',
  status: 'READY',
  version: 1,
  checksumSha256: 'abc123',
  mimeType: 'image/png',
  byteSize: '3',
  deliveryUrl: 'https://media.example.test/signed-portrait',
  deliveryUrlExpiresAt: '2026-07-22T01:00:00.000Z',
  createdAt: '2026-07-22T00:00:00.000Z',
  readyAt: '2026-07-22T00:00:01.000Z',
} as MediaAssetDescriptor;

function makeInput(
  overrides: Partial<PersistCultivatorPortraitInput> = {},
): PersistCultivatorPortraitInput {
  return {
    userId: 'user-123',
    imageSource: 'data:image/png;base64,AAEC',
    prompt: 'A moonlit cultivator portrait',
    description: 'Silver hair and azure robes',
    daoRank: 'Dao Adept',
    daoXp: 720,
    powerStage: 'Core Formation',
    equippedArtifactId: 'artifact-9',
    usedReferenceImage: true,
    ...overrides,
  };
}

describe('cultivator portrait persistence', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.currentUser = {
      uid: 'user-123',
      getIdToken: vi.fn(async () => 'firebase-token'),
    };
    mocks.saveMediaAsset.mockResolvedValue(descriptor);
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('stores the generated source in R2 before selecting the PostgreSQL portrait', async () => {
    const portrait = await persistCultivatorPortrait(makeInput());

    expect(mocks.saveMediaAsset).toHaveBeenCalledWith(expect.objectContaining({
      source: 'data:image/png;base64,AAEC',
      assetType: 'IMAGE',
      purpose: 'CELESTIAL_PORTRAIT',
      association: expect.objectContaining({
        targetKind: 'PORTRAIT',
        targetKey: 'user-123',
        entityType: 'portrait',
      }),
      idempotencyKey: 'request-key',
    }));
    expect(portrait).toMatchObject({
      id: ASSET_ID,
      userId: 'user-123',
      imageUrl: descriptor.deliveryUrl,
      assetVersion: 1,
      checksumSha256: 'abc123',
      deliveryUrlExpiresAt: descriptor.deliveryUrlExpiresAt,
      mimeType: 'image/png',
      source: 'generated',
      createdAt: descriptor.readyAt,
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/persistence/profile/portrait', {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer firebase-token',
        'Content-Type': 'application/json',
      },
      body: expect.any(String),
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      assetId: ASSET_ID,
      usedReferenceImage: true,
      idempotencyKey: 'request-key',
    });
  });

  it('bounds generation metadata before committing profile state', async () => {
    const portrait = await persistCultivatorPortrait(makeInput({
      prompt: 'p'.repeat(5001),
      description: 'd'.repeat(2001),
      daoRank: 'r'.repeat(101),
      daoXp: -10,
      powerStage: 's'.repeat(201),
      equippedArtifactId: 'a'.repeat(129),
    }));

    expect(portrait.generation).toMatchObject({ daoXp: 0 });
    expect(portrait.generation.prompt).toHaveLength(5000);
    expect(portrait.generation.description).toHaveLength(2000);
    expect(portrait.generation.daoRank).toHaveLength(100);
    expect(portrait.generation.powerStage).toHaveLength(200);
    expect(portrait.generation.equippedArtifactId).toHaveLength(128);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ daoXp: 0 });
  });

  it('rejects an unauthenticated or cross-account request before uploading', async () => {
    mocks.auth.currentUser = null;
    await expect(persistCultivatorPortrait(makeInput())).rejects.toThrow('does not own');

    mocks.auth.currentUser = {
      uid: 'another-user',
      getIdToken: vi.fn(async () => 'other-token'),
    };
    await expect(persistCultivatorPortrait(makeInput())).rejects.toThrow('does not own');
    expect(mocks.saveMediaAsset).not.toHaveBeenCalled();
  });

  it('returns the durable R2 asset in a deferred error when profile selection fails', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: { message: 'PostgreSQL unavailable' } }),
    });

    let caught: unknown;
    try {
      await persistCultivatorPortrait(makeInput());
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(CultivatorPortraitCommitDeferredError);
    expect((caught as CultivatorPortraitCommitDeferredError).portrait).toMatchObject({
      id: ASSET_ID,
      imageUrl: descriptor.deliveryUrl,
    });
    expect((caught as Error & { cause?: Error }).cause?.message).toBe('PostgreSQL unavailable');
  });

  it('asks the server to recover incomplete portrait selections without local media state', async () => {
    await retryPendingCultivatorPortraits('user-123');

    expect(fetchMock).toHaveBeenCalledWith('/api/persistence/profile/portraits/recover', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer firebase-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idempotencyKey: 'request-key' }),
    });

    fetchMock.mockClear();
    await retryPendingCultivatorPortraits('another-user');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('treats an empty recovery queue as success and surfaces server failures', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });
    await expect(retryPendingCultivatorPortraits('user-123')).resolves.toBeUndefined();

    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });
    await expect(retryPendingCultivatorPortraits('user-123'))
      .rejects.toThrow('could not be scheduled');
  });
});
