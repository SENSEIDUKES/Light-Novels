import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '../types';

const persistenceMocks = vi.hoisted(() => ({
  getUserProfile: vi.fn(),
  saveUserProfile: vi.fn(),
  getPersistenceAdminOverview: vi.fn(),
  updatePersistenceAdminAccount: vi.fn(),
  deletePersistenceAdminStory: vi.fn(),
}));

const portraitMocks = vi.hoisted(() => ({
  generateProfilePicture: vi.fn(),
  persistProfilePicture: vi.fn(),
}));

const storeMocks = vi.hoisted(() => {
  const state: Record<string, any> = {
    syncStatus: 'synced',
    lastSavedTime: null,
    storageType: 'indexeddb',
    activeStoryId: null,
    routingConfig: {},
    userProfile: null,
    setIsShortcutsOpen: vi.fn(),
    setIsSettingsOpen: vi.fn(),
    handleExportLibrary: vi.fn(),
    handleImportLibrary: vi.fn(),
    setUserProfile: vi.fn((profile) => {
      state.userProfile = profile;
    }),
  };
  const hook = Object.assign(
    vi.fn((selector: (value: typeof state) => unknown) => selector(state)),
    {
      getState: vi.fn(() => state),
      setState: vi.fn((update: any) => {
        const next = typeof update === 'function' ? update(state) : update;
        Object.assign(state, next);
      }),
    },
  );
  return { state, hook };
});

vi.mock('../lib/firebase', () => ({ auth: {}, LOCAL_ONLY_MODE: false }));
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
}));
vi.mock('../store/useAppStore', () => ({ useAppStore: storeMocks.hook }));
vi.mock('./storyEngineHelpers', () => ({
  getApiHeaders: vi.fn().mockResolvedValue({ Authorization: 'Bearer test' }),
}));
vi.mock('../services/profilePicture', () => ({
  generateProfilePicture: portraitMocks.generateProfilePicture,
}));
vi.mock('../lib/persistence', () => persistenceMocks);
vi.mock('../services/profilePicturePersistence', () => {
  class ProfilePictureCommitDeferredError extends Error {
    portrait: any;

    constructor(portrait: any) {
      super('Portrait profile selection is waiting to sync.');
      this.portrait = portrait;
    }
  }
  return {
    ProfilePictureCommitDeferredError,
    persistProfilePicture: portraitMocks.persistProfilePicture,
  };
});

import { generateProfilePicture } from '../services/profilePicture';
import {
  ProfilePictureCommitDeferredError,
  persistProfilePicture,
} from '../services/profilePicturePersistence';
import { useUserProfile } from './useUserProfile';

const makeUser = (uid: string, email = `${uid}@example.com`) => ({
  uid,
  email,
  displayName: `Display ${uid}`,
  photoURL: `https://avatars.example.test/${uid}.png`,
}) as any;

const makeProfile = (uid: string, overrides: Partial<UserProfile> = {}): UserProfile => ({
  uid,
  username: uid,
  displayName: `Profile ${uid}`,
  avatarUrl: '',
  preferredLanguage: 'English',
  defaultTranslationLanguage: 'English',
  defaultChapterWritingStyle: 'Standard',
  savedStoryCount: 0,
  activeStories: [],
  inactiveStories: [],
  joinedDate: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-22T00:00:00.000Z',
  role: 'user',
  premiumTier: 'mortal',
  ...overrides,
});

const portraitDescriptor = (id: string) => ({
  id,
  ownerUid: 'account-a',
  assetType: 'IMAGE' as const,
  purpose: 'CELESTIAL_PORTRAIT',
  visibility: 'PRIVATE' as const,
  status: 'READY' as const,
  mimeType: 'image/png',
  byteSize: '3',
  checksumSha256: 'a'.repeat(64),
  version: 1,
  deliveryUrl: '',
  createdAt: '2026-07-22T00:00:00.000Z',
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderProfile(user = makeUser('account-a')) {
  return renderHook(
    ({ currentUser }) => useUserProfile({
      currentUser,
      stories: [],
      onLogout: vi.fn(),
      onNavigateHome: vi.fn(),
    }),
    { initialProps: { currentUser: user } },
  );
}

describe('useUserProfile PostgreSQL persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    storeMocks.state.userProfile = null;
    persistenceMocks.getUserProfile.mockResolvedValue(makeProfile('account-a'));
    persistenceMocks.saveUserProfile.mockImplementation(async (profile) => profile);
    persistenceMocks.getPersistenceAdminOverview.mockResolvedValue({ users: [], stories: [] });
    portraitMocks.generateProfilePicture.mockResolvedValue({
      imageUrl: 'data:image/png;base64,AAEC',
      promptUsed: 'moonlit cultivator',
    });
    portraitMocks.persistProfilePicture.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      imageUrl: 'https://media.example.test/signed-portrait',
      avatarMediaDescriptor: portraitDescriptor(
        '11111111-1111-4111-8111-111111111111',
      ),
    });
  });

  it('loads the active account profile from PostgreSQL and caches only that identity', async () => {
    const { result } = renderProfile();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(persistenceMocks.getUserProfile).toHaveBeenCalledOnce();
    expect(result.current.profile).toMatchObject({
      uid: 'account-a',
      displayName: 'Profile account-a',
    });
    expect(localStorage.getItem('seihouse-account-profile-cache-v1:account-a'))
      .toContain('Profile account-a');
  });

  it('saves the default chapter writing style on the profile', async () => {
    const { result } = renderProfile();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.handleDefaultChapterWritingStyleChange('Clear Reading');
    });

    expect(persistenceMocks.saveUserProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'account-a',
        defaultChapterWritingStyle: 'Clear Reading',
      }),
    );
    expect(result.current.profile?.defaultChapterWritingStyle).toBe('Clear Reading');
    expect(storeMocks.state.userProfile?.defaultChapterWritingStyle).toBe('Clear Reading');
    expect(result.current.isSavingChapterWritingStyle).toBe(false);
  });

  it('rolls back the default chapter writing style when persistence fails', async () => {
    persistenceMocks.saveUserProfile.mockRejectedValueOnce(new Error('Style save failed.'));
    const { result } = renderProfile();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.handleDefaultChapterWritingStyleChange('Easy Read');
    });

    expect(result.current.profile?.defaultChapterWritingStyle).toBe('Standard');
    expect(storeMocks.state.userProfile?.defaultChapterWritingStyle).toBe('Standard');
    expect(result.current.error).toBe('Style save failed.');
    expect(result.current.isSavingChapterWritingStyle).toBe(false);
  });

  it('resets style saving state and ignores a stale save after switching accounts', async () => {
    const pendingSave = deferred<UserProfile>();
    persistenceMocks.saveUserProfile.mockReturnValueOnce(pendingSave.promise);
    persistenceMocks.getUserProfile
      .mockResolvedValueOnce(makeProfile('account-a'))
      .mockResolvedValueOnce(makeProfile('account-b'));
    const { result, rerender } = renderProfile();
    await waitFor(() => expect(result.current.profile?.uid).toBe('account-a'));

    let savePromise!: Promise<void>;
    act(() => {
      savePromise = result.current.handleDefaultChapterWritingStyleChange('Literal Reading');
    });
    await waitFor(() => expect(result.current.isSavingChapterWritingStyle).toBe(true));

    rerender({ currentUser: makeUser('account-b') });
    await waitFor(() => expect(result.current.profile?.uid).toBe('account-b'));
    expect(result.current.isSavingChapterWritingStyle).toBe(false);
    const storeUpdatesBeforeStaleSaveSettles =
      storeMocks.state.setUserProfile.mock.calls.length;

    await act(async () => {
      pendingSave.resolve(makeProfile('account-a', {
        defaultChapterWritingStyle: 'Literal Reading',
      }));
      await savePromise;
    });

    expect(result.current.profile).toMatchObject({
      uid: 'account-b',
      defaultChapterWritingStyle: 'Standard',
    });
    expect(storeMocks.state.setUserProfile).toHaveBeenCalledTimes(
      storeUpdatesBeforeStaleSaveSettles,
    );
    expect(result.current.isSavingChapterWritingStyle).toBe(false);
  });

  it('ignores a late profile save after switching accounts', async () => {
    const pendingSave = deferred<UserProfile>();
    persistenceMocks.saveUserProfile.mockReturnValueOnce(pendingSave.promise);
    persistenceMocks.getUserProfile
      .mockResolvedValueOnce(makeProfile('account-a'))
      .mockResolvedValueOnce(makeProfile('account-b'));
    const { result, rerender } = renderProfile();
    await waitFor(() => expect(result.current.profile?.uid).toBe('account-a'));

    act(() => {
      result.current.setFormData({
        ...result.current.profile,
        username: 'renamed-account-a',
      });
    });
    let savePromise!: Promise<void>;
    act(() => {
      savePromise = result.current.handleSave();
    });
    await waitFor(() => expect(persistenceMocks.saveUserProfile).toHaveBeenCalled());

    rerender({ currentUser: makeUser('account-b') });
    await waitFor(() => expect(result.current.profile?.uid).toBe('account-b'));
    const storeUpdatesBeforeStaleSaveSettles =
      storeMocks.state.setUserProfile.mock.calls.length;

    await act(async () => {
      pendingSave.resolve(makeProfile('account-a', {
        username: 'renamed-account-a',
      }));
      await savePromise;
    });

    expect(result.current.profile).toMatchObject({
      uid: 'account-b',
      username: 'account-b',
    });
    expect(storeMocks.state.setUserProfile).toHaveBeenCalledTimes(
      storeUpdatesBeforeStaleSaveSettles,
    );
    expect(result.current.isLoading).toBe(false);
  });

  it('shows a local fallback profile without writing when the account has no row', async () => {
    // The canonical account + profile row is provisioned server-side the first
    // time the profile is read, so the client no longer performs its own
    // default-profile write. Doing so was a competing initialization path that
    // could race with — and overwrite — an explicit username save. When the
    // read returns null the hook shows a local fallback but persists nothing.
    persistenceMocks.getUserProfile.mockResolvedValue(null);
    const owner = makeUser('owner-account', 'amaurylindy@gmail.com');
    const { result } = renderProfile(owner);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // The placeholder claims no elevated role even for a system-owner email.
    // The client used to promote itself here, which unlocked admin surfaces
    // whose every request PostgreSQL then rejected against userAccount.role.
    // The role is assigned server-side from the verified ID-token email.
    expect(result.current.profile).toMatchObject({
      uid: 'owner-account',
      role: 'user',
      premiumTier: 'mortal',
    });
    expect(persistenceMocks.saveUserProfile).not.toHaveBeenCalled();
  });

  it('trusts the stored role instead of promoting a system-owner email', async () => {
    persistenceMocks.getUserProfile.mockResolvedValue({
      uid: 'owner-account',
      username: 'owner',
      displayName: 'Owner',
      role: 'owner',
      premiumTier: 'immortal',
    } as never);
    const owner = makeUser('owner-account', 'amaurylindy@gmail.com');
    const { result } = renderProfile(owner);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.profile).toMatchObject({ role: 'owner', premiumTier: 'immortal' });
  });

  it('does not invent an owner role when the server reports a plain user', async () => {
    persistenceMocks.getUserProfile.mockResolvedValue({
      uid: 'owner-account',
      username: 'owner',
      displayName: 'Owner',
      role: 'user',
      premiumTier: 'mortal',
    } as never);
    const owner = makeUser('owner-account', 'amaurylindy@gmail.com');
    const { result } = renderProfile(owner);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.profile).toMatchObject({ role: 'user', premiumTier: 'mortal' });
  });

  it('ignores a late account A read after switching directly to account B', async () => {
    const accountARead = deferred<UserProfile | null>();
    persistenceMocks.getUserProfile
      .mockReturnValueOnce(accountARead.promise)
      .mockResolvedValueOnce(makeProfile('account-b', { avatarUrl: 'private-b.png' }));
    const { result, rerender } = renderProfile(makeUser('account-a'));

    rerender({ currentUser: makeUser('account-b') });
    await waitFor(() => expect(result.current.profile?.uid).toBe('account-b'));
    accountARead.resolve(makeProfile('account-a', { avatarUrl: 'private-a.png' }));
    await act(async () => accountARead.promise);

    expect(result.current.profile).toMatchObject({
      uid: 'account-b',
      avatarUrl: 'https://avatars.example.test/account-b.png',
    });
  });

  it('uses provider identity when a PostgreSQL read is temporarily unavailable', async () => {
    persistenceMocks.getUserProfile.mockRejectedValue(new Error('offline'));
    const { result } = renderProfile(makeUser('account-a'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.profile).toMatchObject({
      uid: 'account-a',
      displayName: 'Display account-a',
      avatarUrl: 'https://avatars.example.test/account-a.png',
    });
  });

  it('keeps PostgreSQL profile fields visible when only portrait delivery is degraded', async () => {
    persistenceMocks.getUserProfile.mockResolvedValue(makeProfile('account-a', {
      username: 'DurableCultivator',
      activePortraitId: '11111111-1111-4111-8111-111111111111',
      avatarMediaDescriptor: portraitDescriptor(
        '11111111-1111-4111-8111-111111111111',
      ),
      avatarDeliveryError: {
        code: 'portrait_download_unavailable',
        message: 'Your profile loaded, but the selected portrait could not be downloaded.',
        recoverable: true,
      },
    }));
    const { result } = renderProfile();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.profile).toMatchObject({
      uid: 'account-a',
      username: 'DurableCultivator',
      activePortraitId: '11111111-1111-4111-8111-111111111111',
    });
    expect(result.current.error).toContain('profile loaded');
  });

  it('publishes a portrait only after R2 upload and PostgreSQL selection succeed', async () => {
    const { result } = renderProfile();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => result.current.handleGeneratePortrait());
    await act(async () => result.current.handleApplyPortrait());

    expect(generateProfilePicture).toHaveBeenCalled();
    expect(persistProfilePicture).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'account-a',
      imageSource: 'data:image/png;base64,AAEC',
      prompt: 'moonlit cultivator',
    }));
    expect(result.current.profile).toMatchObject({
      activePortraitId: '11111111-1111-4111-8111-111111111111',
      avatarUrl: 'https://media.example.test/signed-portrait',
      avatarMediaDescriptor: {
        id: '11111111-1111-4111-8111-111111111111',
        deliveryUrl: '',
      },
    });
    const cached = localStorage.getItem('seihouse-account-profile-cache-v1:account-a') ?? '';
    expect(cached).toContain('11111111-1111-4111-8111-111111111111');
    expect(cached).not.toContain('signed-portrait');
  });

  it('keeps an R2-safe portrait visible while its PostgreSQL selection is recoverable', async () => {
    const uploaded = {
      id: '22222222-2222-4222-8222-222222222222',
      imageUrl: 'https://media.example.test/recoverable-portrait',
      avatarMediaDescriptor: portraitDescriptor(
        '22222222-2222-4222-8222-222222222222',
      ),
    };
    portraitMocks.persistProfilePicture.mockRejectedValue(
      new ProfilePictureCommitDeferredError(uploaded as any),
    );
    const { result } = renderProfile();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => result.current.handleGeneratePortrait());
    await act(async () => result.current.handleApplyPortrait());

    expect(result.current.profile).toMatchObject({
      activePortraitId: uploaded.id,
      avatarUrl: uploaded.imageUrl,
    });
    const cached = localStorage.getItem('seihouse-account-profile-cache-v1:account-a') ?? '';
    expect(cached).toContain(uploaded.id);
    expect(cached).not.toContain(uploaded.imageUrl);
  });

  it('keeps the generated preview retryable when selection is permanently rejected', async () => {
    portraitMocks.persistProfilePicture.mockRejectedValue(Object.assign(
      new Error('Portrait asset purpose mismatch'),
      { recoverable: false, status: 400, code: 'invalid_argument' },
    ));
    const { result } = renderProfile();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => result.current.handleGeneratePortrait());
    await act(async () => result.current.handleApplyPortrait());

    expect(result.current.portraitError).toBe('Portrait asset purpose mismatch');
    expect(result.current.generatedPortraitUrl).toBe('data:image/png;base64,AAEC');
    expect(result.current.profile?.activePortraitId).toBeUndefined();
  });

  it('keeps the Firebase identity avatar after saving ordinary profile fields', async () => {
    persistenceMocks.saveUserProfile.mockResolvedValue(makeProfile('account-a', {
      username: 'RenamedCultivator',
      avatarUrl: '',
    }));
    const { result } = renderProfile();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setFormData({
        ...result.current.profile,
        username: 'RenamedCultivator',
      });
    });
    await act(async () => result.current.handleSave());

    expect(persistenceMocks.saveUserProfile).toHaveBeenCalledWith(
      expect.not.objectContaining({ avatarUrl: expect.anything() }),
    );
    expect(result.current.profile).toMatchObject({
      username: 'RenamedCultivator',
      avatarUrl: 'https://avatars.example.test/account-a.png',
    });
  });

  it('does not publish an account A portrait after the UI switches to account B', async () => {
    const portraitWrite = deferred<any>();
    portraitMocks.persistProfilePicture.mockReturnValueOnce(portraitWrite.promise);
    const { result, rerender } = renderProfile();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => result.current.handleGeneratePortrait());

    let apply!: Promise<void>;
    act(() => {
      apply = result.current.handleApplyPortrait();
    });
    await waitFor(() => expect(portraitMocks.persistProfilePicture).toHaveBeenCalled());
    persistenceMocks.getUserProfile.mockResolvedValueOnce(makeProfile('account-b'));
    rerender({ currentUser: makeUser('account-b') });
    portraitWrite.resolve({
      id: '33333333-3333-4333-8333-333333333333',
      imageUrl: 'https://media.example.test/account-a-portrait',
      avatarMediaDescriptor: portraitDescriptor(
        '33333333-3333-4333-8333-333333333333',
      ),
    });
    await act(async () => apply);
    await waitFor(() => expect(result.current.profile?.uid).toBe('account-b'));

    expect(result.current.profile?.activePortraitId).toBeUndefined();
  });
});
