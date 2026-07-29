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
  resolveMediaAssetForDisplay: vi.fn(),
  selectUserPortrait: vi.fn(),
  recoverPendingUserPortraits: vi.fn(),
}));

vi.mock('../lib/firebase', () => ({ auth: mocks.auth }));
vi.mock('../lib/id', () => ({ generateUUID: mocks.generateUUID }));
vi.mock('../lib/media/mediaAssetClient', () => ({
  MEDIA_PURPOSE: { CELESTIAL_PORTRAIT: 'CELESTIAL_PORTRAIT' },
  MEDIA_TARGET_KIND: { PORTRAIT: 'PORTRAIT' },
  saveMediaAsset: mocks.saveMediaAsset,
}));
vi.mock('../lib/media/privateMediaResolver', () => ({
  resolveMediaAssetForDisplay: mocks.resolveMediaAssetForDisplay,
}));
vi.mock('../lib/persistence/persistenceClient', () => {
  class PersistenceClientError extends Error {
    code: string;
    status: number;
    recoverable: boolean;

    constructor(
      message: string,
      options: { code?: string; status?: number; recoverable?: boolean } = {},
    ) {
      super(message);
      this.code = options.code ?? 'persistence_request_failed';
      this.status = options.status ?? 0;
      this.recoverable = options.recoverable ?? (this.status === 0 || this.status >= 500);
    }
  }
  return {
    PersistenceClientError,
    selectUserPortrait: mocks.selectUserPortrait,
    recoverPendingUserPortraits: mocks.recoverPendingUserPortraits,
  };
});

import {
  CultivatorPortraitCommitDeferredError,
  persistCultivatorPortrait,
  retryPendingCultivatorPortraits,
} from './cultivatorPortraitPersistence';
import { PersistenceClientError } from '../lib/persistence/persistenceClient';

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
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.currentUser = {
      uid: 'user-123',
      getIdToken: vi.fn(async () => 'firebase-token'),
    };
    mocks.saveMediaAsset.mockResolvedValue(descriptor);
    mocks.resolveMediaAssetForDisplay.mockResolvedValue({
      assetId: descriptor.id,
      descriptor,
      url: 'blob:canonical-portrait',
      source: 'network',
    });
    mocks.selectUserPortrait.mockResolvedValue({ activePortraitId: descriptor.id });
    mocks.recoverPendingUserPortraits.mockResolvedValue(0);
  });

  afterEach(() => vi.restoreAllMocks());

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
      expectedOwnerUid: 'user-123',
    }));
    expect(portrait).toMatchObject({
      id: ASSET_ID,
      userId: 'user-123',
      imageUrl: 'blob:canonical-portrait',
      avatarMediaDescriptor: {
        id: ASSET_ID,
        deliveryUrl: '',
      },
      assetVersion: 1,
      checksumSha256: 'abc123',
      deliveryUrlExpiresAt: descriptor.deliveryUrlExpiresAt,
      mimeType: 'image/png',
      source: 'generated',
      createdAt: descriptor.readyAt,
    });
    expect(mocks.selectUserPortrait).toHaveBeenCalledWith(expect.objectContaining({
      assetId: ASSET_ID,
      usedReferenceImage: true,
    }), 'user-123', 'request-key');
    expect(mocks.resolveMediaAssetForDisplay).toHaveBeenCalledWith(
      descriptor,
      'user-123',
    );
  });

  it('bounds generation metadata before committing profile state', async () => {
    const portrait = await persistCultivatorPortrait(makeInput({
      prompt: 'p'.repeat(12001),
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
    const mediaRequest = mocks.saveMediaAsset.mock.calls[0][0];
    expect(mediaRequest.association.promptUsed).toHaveLength(12000);
    expect(mediaRequest.association.label).toHaveLength(500);
    expect(mocks.selectUserPortrait).toHaveBeenCalledWith(
      expect.objectContaining({ daoXp: 0 }),
      'user-123',
      'request-key',
    );
  });

  it('treats missing runtime text metadata as empty instead of throwing', async () => {
    const portrait = await persistCultivatorPortrait(makeInput({
      prompt: null as unknown as string,
      description: undefined as unknown as string,
    }));

    expect(portrait.generation).toMatchObject({ prompt: '', description: '' });
    expect(mocks.saveMediaAsset).toHaveBeenCalledWith(expect.objectContaining({
      association: expect.objectContaining({ promptUsed: '', label: '' }),
    }));
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
    mocks.selectUserPortrait.mockRejectedValue(new PersistenceClientError(
      'PostgreSQL unavailable',
      { status: 503, recoverable: true },
    ));

    let caught: unknown;
    try {
      await persistCultivatorPortrait(makeInput());
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(CultivatorPortraitCommitDeferredError);
    expect((caught as CultivatorPortraitCommitDeferredError).portrait).toMatchObject({
      id: ASSET_ID,
      imageUrl: 'data:image/png;base64,AAEC',
      avatarMediaDescriptor: { id: ASSET_ID, deliveryUrl: '' },
    });
    expect((caught as Error & { cause?: Error }).cause?.message).toBe('PostgreSQL unavailable');
    expect(mocks.resolveMediaAssetForDisplay).not.toHaveBeenCalled();
  });

  it('surfaces permanent selection rejection instead of claiming recovery is pending', async () => {
    mocks.selectUserPortrait.mockRejectedValue(new PersistenceClientError(
      'Portrait asset purpose mismatch',
      { code: 'invalid_argument', status: 400, recoverable: false },
    ));

    await expect(persistCultivatorPortrait(makeInput())).rejects.toMatchObject({
      code: 'invalid_argument',
      message: 'Portrait asset purpose mismatch',
    });
    expect(mocks.resolveMediaAssetForDisplay).not.toHaveBeenCalled();
  });

  it('commits selection before resolving delivery and retains the preview if delivery fails', async () => {
    const order: string[] = [];
    mocks.selectUserPortrait.mockImplementation(async () => {
      order.push('select');
      return { activePortraitId: ASSET_ID };
    });
    mocks.resolveMediaAssetForDisplay.mockImplementation(async () => {
      order.push('resolve');
      throw new Error('R2 signing unavailable');
    });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const portrait = await persistCultivatorPortrait(makeInput());

    expect(order).toEqual(['select', 'resolve']);
    expect(portrait).toMatchObject({
      id: ASSET_ID,
      imageUrl: 'data:image/png;base64,AAEC',
      avatarMediaDescriptor: { id: ASSET_ID, deliveryUrl: '' },
    });
  });

  it('stops after upload when the active account changes before selection', async () => {
    mocks.saveMediaAsset.mockImplementation(async () => {
      mocks.auth.currentUser = {
        uid: 'account-b',
        getIdToken: vi.fn(async () => 'account-b-token'),
      };
      return descriptor;
    });

    await expect(persistCultivatorPortrait(makeInput())).rejects.toMatchObject({
      code: 'auth/account-changed',
    });
    expect(mocks.selectUserPortrait).not.toHaveBeenCalled();
    expect(mocks.resolveMediaAssetForDisplay).not.toHaveBeenCalled();
  });

  it('asks the server to recover incomplete portrait selections without local media state', async () => {
    await retryPendingCultivatorPortraits('user-123');

    expect(mocks.recoverPendingUserPortraits)
      .toHaveBeenCalledWith('user-123', 'request-key');

    mocks.recoverPendingUserPortraits.mockClear();
    await retryPendingCultivatorPortraits('another-user');
    expect(mocks.recoverPendingUserPortraits).not.toHaveBeenCalled();
  });

  it('returns the recovered count and surfaces a missing recovery route', async () => {
    mocks.recoverPendingUserPortraits.mockResolvedValueOnce(1);
    await expect(retryPendingCultivatorPortraits('user-123')).resolves.toBe(1);

    mocks.recoverPendingUserPortraits.mockRejectedValueOnce(new PersistenceClientError(
      'Recovery route not found',
      { status: 404, recoverable: false },
    ));
    await expect(retryPendingCultivatorPortraits('user-123'))
      .rejects.toThrow('Recovery route not found');
  });
});
