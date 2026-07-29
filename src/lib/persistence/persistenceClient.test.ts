import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authMock = vi.hoisted(() => ({
  currentUser: {
    uid: 'account-a',
    getIdToken: vi.fn().mockResolvedValue('token-a'),
  } as any,
}));
const resolverMock = vi.hoisted(() => ({
  resolveMediaAssetForDisplay: vi.fn(),
}));

vi.mock('../firebase', () => ({
  auth: authMock,
}));
vi.mock('../media/privateMediaResolver', () => resolverMock);

import {
  getUserProfile,
  saveUserProfile,
  selectUserPortrait,
} from './persistenceClient';

describe('persistenceClient profile writes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.currentUser = {
      uid: 'account-a',
      getIdToken: vi.fn().mockResolvedValue('token-a'),
    };
    resolverMock.resolveMediaAssetForDisplay.mockResolvedValue({
      assetId: '11111111-1111-4111-8111-111111111111',
      descriptor: {},
      url: 'blob:portrait',
      source: 'network',
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        profile: {
          uid: 'account-a',
          username: 'cultivator',
        },
      }),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('forwards keepalive to the authenticated profile request', async () => {
    await saveUserProfile(
      { uid: 'account-a', dao_xp: 750 },
      { keepalive: true },
    );

    expect(fetch).toHaveBeenCalledWith(
      '/api/persistence/profile',
      expect.objectContaining({
        method: 'PUT',
        keepalive: true,
        headers: expect.any(Headers),
      }),
    );
  });

  it('rejects active portrait changes through the generic profile client', async () => {
    await expect(saveUserProfile({
      uid: 'account-a',
      activePortraitId: '11111111-1111-4111-8111-111111111111',
    })).rejects.toMatchObject({
      code: 'invalid_argument',
      status: 400,
      recoverable: false,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('routes portrait selection through its dedicated authenticated endpoint', async () => {
    await selectUserPortrait({
      assetId: '11111111-1111-4111-8111-111111111111',
      usedReferenceImage: false,
    }, 'account-a', 'portrait-selection-key');

    expect(fetch).toHaveBeenCalledWith(
      '/api/persistence/profile/portrait',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.any(Headers),
        body: JSON.stringify({
          assetId: '11111111-1111-4111-8111-111111111111',
          usedReferenceImage: false,
          idempotencyKey: 'portrait-selection-key',
        }),
      }),
    );
  });

  it('retains the structured profile when only portrait download fails', async () => {
    const descriptor = {
      id: '11111111-1111-4111-8111-111111111111',
      ownerUid: 'account-a',
      assetType: 'IMAGE',
      purpose: 'CELESTIAL_PORTRAIT',
      visibility: 'PRIVATE',
      status: 'READY',
      mimeType: 'image/png',
      byteSize: '3',
      checksumSha256: 'a'.repeat(64),
      version: 1,
      deliveryUrl: 'https://media.example.test/signed',
      createdAt: '2026-07-22T00:00:00.000Z',
    };
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        profile: {
          uid: 'account-a',
          username: 'cultivator',
          activePortraitId: descriptor.id,
          avatarUrl: descriptor.deliveryUrl,
          avatarMediaDescriptor: descriptor,
        },
      }),
    } as Response);
    resolverMock.resolveMediaAssetForDisplay.mockRejectedValueOnce(
      new Error('Private media download failed with HTTP 503.'),
    );

    await expect(getUserProfile('account-a')).resolves.toMatchObject({
      uid: 'account-a',
      username: 'cultivator',
      activePortraitId: descriptor.id,
      avatarUrl: '',
      avatarMediaDescriptor: {
        id: descriptor.id,
        deliveryUrl: '',
      },
      avatarDeliveryError: {
        code: 'portrait_download_unavailable',
        recoverable: true,
      },
    });
  });

  it('abandons a response whose JSON finishes after the active account changes', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        authMock.currentUser = {
          uid: 'account-b',
          getIdToken: vi.fn().mockResolvedValue('token-b'),
        };
        return {
          profile: {
            uid: 'account-a',
            username: 'stale-cultivator',
          },
        };
      },
    } as Response);

    await expect(getUserProfile('account-a')).rejects.toMatchObject({
      code: 'auth/account-changed',
      recoverable: true,
    });
  });
});
