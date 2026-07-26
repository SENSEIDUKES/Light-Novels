import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authMock = vi.hoisted(() => ({
  currentUser: {
    uid: 'account-a',
    getIdToken: vi.fn().mockResolvedValue('token-a'),
  } as any,
}));

vi.mock('../firebase', () => ({
  auth: authMock,
}));

import { saveUserProfile } from './persistenceClient';

describe('persistenceClient profile writes', () => {
  beforeEach(() => {
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
});
