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
  generateCultivatorPortrait: vi.fn(),
  persistCultivatorPortrait: vi.fn(),
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
vi.mock('../services/cultivatorPortrait', () => ({
  generateCultivatorPortrait: portraitMocks.generateCultivatorPortrait,
}));
vi.mock('../lib/persistence', () => persistenceMocks);
vi.mock('../services/cultivatorPortraitPersistence', () => {
  class CultivatorPortraitCommitDeferredError extends Error {
    portrait: any;

    constructor(portrait: any) {
      super('Portrait profile selection is waiting to sync.');
      this.portrait = portrait;
    }
  }
  return {
    CultivatorPortraitCommitDeferredError,
    persistCultivatorPortrait: portraitMocks.persistCultivatorPortrait,
  };
});

import { generateCultivatorPortrait } from '../services/cultivatorPortrait';
import {
  CultivatorPortraitCommitDeferredError,
  persistCultivatorPortrait,
} from '../services/cultivatorPortraitPersistence';
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
  savedStoryCount: 0,
  activeStories: [],
  inactiveStories: [],
  joinedDate: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-22T00:00:00.000Z',
  role: 'user',
  premiumTier: 'mortal',
  ...overrides,
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
    portraitMocks.generateCultivatorPortrait.mockResolvedValue({
      imageUrl: 'data:image/png;base64,AAEC',
      promptUsed: 'moonlit cultivator',
    });
    portraitMocks.persistCultivatorPortrait.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      imageUrl: 'https://media.example.test/signed-portrait',
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

  it('creates a default PostgreSQL profile when the account has no row', async () => {
    persistenceMocks.getUserProfile.mockResolvedValue(null);
    const owner = makeUser('owner-account', 'amaurylindy@gmail.com');
    const { result } = renderProfile(owner);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.profile).toMatchObject({
      uid: 'owner-account',
      role: 'owner',
      premiumTier: 'immortal',
    });
    expect(persistenceMocks.saveUserProfile).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'owner-account', role: 'owner' }),
    );
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
      avatarUrl: 'private-b.png',
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

  it('publishes a portrait only after R2 upload and PostgreSQL selection succeed', async () => {
    const { result } = renderProfile();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => result.current.handleGeneratePortrait());
    await act(async () => result.current.handleApplyPortrait());

    expect(generateCultivatorPortrait).toHaveBeenCalled();
    expect(persistCultivatorPortrait).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'account-a',
      imageSource: 'data:image/png;base64,AAEC',
      prompt: 'moonlit cultivator',
    }));
    expect(result.current.profile).toMatchObject({
      activePortraitId: '11111111-1111-4111-8111-111111111111',
      avatarUrl: 'https://media.example.test/signed-portrait',
    });
  });

  it('keeps an R2-safe portrait visible while its PostgreSQL selection is recoverable', async () => {
    const uploaded = {
      id: '22222222-2222-4222-8222-222222222222',
      imageUrl: 'https://media.example.test/recoverable-portrait',
    };
    portraitMocks.persistCultivatorPortrait.mockRejectedValue(
      new CultivatorPortraitCommitDeferredError(uploaded as any),
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

  it('does not publish an account A portrait after the UI switches to account B', async () => {
    const portraitWrite = deferred<any>();
    portraitMocks.persistCultivatorPortrait.mockReturnValueOnce(portraitWrite.promise);
    const { result, rerender } = renderProfile();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => result.current.handleGeneratePortrait());

    let apply!: Promise<void>;
    act(() => {
      apply = result.current.handleApplyPortrait();
    });
    await waitFor(() => expect(portraitMocks.persistCultivatorPortrait).toHaveBeenCalled());
    persistenceMocks.getUserProfile.mockResolvedValueOnce(makeProfile('account-b'));
    rerender({ currentUser: makeUser('account-b') });
    portraitWrite.resolve({
      id: '33333333-3333-4333-8333-333333333333',
      imageUrl: 'https://media.example.test/account-a-portrait',
    });
    await act(async () => apply);
    await waitFor(() => expect(result.current.profile?.uid).toBe('account-b'));

    expect(result.current.profile?.activePortraitId).toBeUndefined();
  });
});
