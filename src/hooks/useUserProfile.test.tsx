import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUserProfile } from './useUserProfile';
import { generateCultivatorPortrait } from '../services/cultivatorPortrait';
import {
  CultivatorPortraitCommitDeferredError,
  persistCultivatorPortrait,
} from '../services/cultivatorPortraitPersistence';

const firestoreMocks = vi.hoisted(() => ({
  subscriptions: [] as Array<{
    ref: { id: string };
    next: (snapshot: any) => void;
    error: (error: Error) => void;
    unsubscribe: ReturnType<typeof vi.fn>;
  }>,
  onSnapshot: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  getDocs: vi.fn().mockResolvedValue({
    docs: [],
    forEach: vi.fn(),
  }),
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
    updateStory: vi.fn().mockResolvedValue(undefined),
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

vi.mock('../lib/firebase', () => ({
  auth: {},
  db: {},
  LOCAL_ONLY_MODE: false,
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((...parts: string[]) => ({ id: parts.at(-1) ?? '' })),
  collection: vi.fn((...parts: string[]) => ({ id: parts.at(-1) ?? '' })),
  onSnapshot: firestoreMocks.onSnapshot,
  setDoc: firestoreMocks.setDoc,
  getDocs: firestoreMocks.getDocs,
  getDoc: vi.fn(),
  deleteDoc: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
}));

vi.mock('../store/useAppStore', () => ({
  useAppStore: storeMocks.hook,
}));

vi.mock('../lib/storage', () => ({
  storyStorage: {
    performSync: vi.fn(),
  },
}));

vi.mock('./storyEngineHelpers', () => ({
  getApiHeaders: vi.fn().mockResolvedValue({}),
}));

vi.mock('../services/cultivatorPortrait', () => ({
  generateCultivatorPortrait: vi.fn(),
}));

vi.mock('../services/cultivatorPortraitPersistence', () => {
  class CultivatorPortraitCommitDeferredError extends Error {
    portrait: unknown;

    constructor(portrait: unknown) {
      super('Portrait account record is waiting to sync.');
      this.portrait = portrait;
    }
  }

  return {
    CultivatorPortraitCommitDeferredError,
    persistCultivatorPortrait: vi.fn(),
  };
});

const makeUser = (uid: string, email = `${uid}@example.com`) => ({
  uid,
  email,
  displayName: uid,
  photoURL: `${uid}.png`,
}) as any;

const profileSnapshot = (data: Record<string, unknown>) => ({
  exists: () => true,
  data: () => data,
});

const missingProfileSnapshot = {
  exists: () => false,
  data: () => ({}),
};

describe('useUserProfile account switching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMocks.subscriptions.length = 0;
    storeMocks.state.userProfile = null;
    localStorage.clear();
    firestoreMocks.onSnapshot.mockImplementation((ref, next, error) => {
      const unsubscribe = vi.fn();
      firestoreMocks.subscriptions.push({ ref, next, error, unsubscribe });
      return unsubscribe;
    });
    firestoreMocks.setDoc.mockResolvedValue(undefined);
    firestoreMocks.getDocs.mockResolvedValue({ docs: [], forEach: vi.fn() });
  });

  it('clears account-scoped profile, form, Qi, and admin state on a direct UID switch', async () => {
    const accountA = makeUser('account-a', 'amaurylindy@gmail.com');
    const accountB = makeUser('account-b');
    const { result, rerender } = renderHook(
      ({ user }) => useUserProfile({
        currentUser: user,
        stories: [],
        onLogout: vi.fn(),
        onNavigateHome: vi.fn(),
      }),
      { initialProps: { user: accountA } },
    );

    expect(firestoreMocks.subscriptions).toHaveLength(1);
    act(() => {
      firestoreMocks.subscriptions[0].next(profileSnapshot({
        uid: 'account-a',
        username: 'Account A',
        displayName: 'Account A',
        avatarUrl: 'private-a.png',
        preferredLanguage: 'English',
        defaultTranslationLanguage: 'English',
        savedStoryCount: 4,
        activeStories: [],
        inactiveStories: [],
        joinedDate: '2026-01-01',
        updatedAt: '2026-01-01',
        role: 'owner',
        heavenly_qi: 999,
      }));
    });

    await waitFor(() => expect(result.current.formData.avatarUrl).toBe('private-a.png'));
    act(() => {
      result.current.setIsAdminPanelOpen(true);
      result.current.setAdminSearchQuery('account-a-only');
      result.current.setIsQiMenuOpen(true);
      result.current.setActiveQiTooltip('heavenly');
      result.current.setShowAdvanced(true);
      result.current.setIsEditing(true);
      result.current.setError('account-a-error');
    });

    rerender({ user: accountB });

    expect(result.current.profile).toMatchObject({ uid: 'account-b', avatarUrl: 'account-b.png' });
    expect(result.current.formData).toMatchObject({ uid: 'account-b', avatarUrl: 'account-b.png' });
    expect(result.current.isAdminPanelOpen).toBe(false);
    expect(result.current.adminSearchQuery).toBe('');
    expect(result.current.isQiMenuOpen).toBe(false);
    expect(result.current.activeQiTooltip).toBeNull();
    expect(result.current.showAdvanced).toBe(false);
    expect(result.current.isEditing).toBe(false);
    expect(result.current.error).toBe('');
    expect(firestoreMocks.subscriptions[0].unsubscribe).toHaveBeenCalledOnce();
  });

  it('ignores cancelled snapshots and does not start their default-profile writes', () => {
    const accountA = makeUser('account-a');
    const accountB = makeUser('account-b');
    const { result, rerender } = renderHook(
      ({ user }) => useUserProfile({
        currentUser: user,
        stories: [],
        onLogout: vi.fn(),
        onNavigateHome: vi.fn(),
      }),
      { initialProps: { user: accountA } },
    );

    const staleAccountASubscription = firestoreMocks.subscriptions[0];
    rerender({ user: accountB });
    expect(firestoreMocks.subscriptions).toHaveLength(2);

    act(() => {
      staleAccountASubscription.next(profileSnapshot({
        uid: 'account-a',
        role: 'owner',
        avatarUrl: 'private-a.png',
        heavenly_qi: 999,
      }));
      staleAccountASubscription.next(missingProfileSnapshot);
      staleAccountASubscription.error(new Error('stale account A read failure'));
    });

    expect(result.current.profile).toMatchObject({ uid: 'account-b', avatarUrl: 'account-b.png' });
    expect(result.current.formData).toMatchObject({ uid: 'account-b', avatarUrl: 'account-b.png' });
    expect(result.current.error).toBe('');
    expect(firestoreMocks.setDoc).not.toHaveBeenCalled();

    act(() => {
      firestoreMocks.subscriptions[1].next(missingProfileSnapshot);
    });

    expect(result.current.profile?.uid).toBe('account-b');
    expect(result.current.profile?.role).toBe('user');
    expect(firestoreMocks.setDoc).toHaveBeenCalledOnce();
    expect(firestoreMocks.setDoc.mock.calls[0][0]).toEqual({ id: 'account-b' });
  });

  it('shows account B provider identity when its profile read fails', () => {
    const accountA = makeUser('account-a');
    const accountB = makeUser('account-b');
    const { result, rerender } = renderHook(
      ({ user }) => useUserProfile({
        currentUser: user,
        stories: [],
        onLogout: vi.fn(),
        onNavigateHome: vi.fn(),
      }),
      { initialProps: { user: accountA } },
    );

    act(() => {
      firestoreMocks.subscriptions[0].next(profileSnapshot({
        uid: 'account-a',
        username: 'Account A',
        displayName: 'Account A',
        avatarUrl: 'private-a.png',
        preferredLanguage: 'English',
        defaultTranslationLanguage: 'English',
        savedStoryCount: 4,
        activeStories: [],
        inactiveStories: [],
        joinedDate: '2026-01-01',
        updatedAt: '2026-01-01',
        role: 'owner',
        heavenly_qi: 999,
      }));
    });
    rerender({ user: accountB });

    act(() => {
      firestoreMocks.subscriptions[1].error(new Error('permission denied'));
    });

    expect(result.current.profile).toMatchObject({
      uid: 'account-b',
      displayName: 'account-b',
      avatarUrl: 'account-b.png',
    });
    expect(result.current.formData).toMatchObject({
      uid: 'account-b',
      avatarUrl: 'account-b.png',
    });
    expect(result.current.error).toBe('');
  });
});

describe('useUserProfile portrait persistence', () => {
  const profileData = {
    uid: 'account-a',
    username: 'account-a',
    displayName: 'Account A',
    avatarUrl: 'provider-photo.png',
    preferredLanguage: 'English',
    defaultTranslationLanguage: 'English',
    savedStoryCount: 0,
    activeStories: [],
    inactiveStories: [],
    joinedDate: '2026-01-01',
    updatedAt: '2026-01-01',
    dao_rank: 'Dao Adept',
    dao_xp: 400,
  };

  const savedPortrait = {
    schemaVersion: 1 as const,
    id: 'portrait-1',
    userId: 'account-a',
    imageUrl: 'https://firebasestorage.example/portrait-1.webp',
    storagePath: 'users/account-a/portraits/portrait-1.webp',
    mimeType: 'image/webp' as const,
    source: 'generated' as const,
    createdAt: '2026-07-14T12:00:00.000Z',
    updatedAt: '2026-07-14T12:00:00.000Z',
    generation: {
      prompt: 'refined prompt',
      description: 'silver hair',
      daoRank: 'Dao Adept',
      daoXp: 400,
      powerStage: '',
      equippedArtifactId: null,
      usedReferenceImage: false,
    },
    customization: {
      frameId: null,
      glowId: null,
      bannerId: null,
      effectIds: [],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    firestoreMocks.subscriptions.length = 0;
    storeMocks.state.userProfile = null;
    firestoreMocks.onSnapshot.mockImplementation((ref, next, error) => {
      const unsubscribe = vi.fn();
      firestoreMocks.subscriptions.push({ ref, next, error, unsubscribe });
      return unsubscribe;
    });
    vi.mocked(generateCultivatorPortrait).mockResolvedValue({
      imageUrl: 'data:image/webp;base64,generated-portrait',
      promptUsed: 'refined prompt',
    });
    vi.mocked(persistCultivatorPortrait).mockResolvedValue(savedPortrait);
  });

  const renderLoadedProfile = async () => {
    const user = makeUser('account-a');
    const hook = renderHook(() => useUserProfile({
      currentUser: user,
      stories: [],
      onLogout: vi.fn(),
      onNavigateHome: vi.fn(),
    }));
    act(() => {
      firestoreMocks.subscriptions[0].next(profileSnapshot(profileData));
    });
    await waitFor(() => expect(hook.result.current.profile?.uid).toBe('account-a'));
    return hook;
  };

  const generatePreview = async (result: Awaited<ReturnType<typeof renderLoadedProfile>>['result']) => {
    act(() => {
      result.current.setShowPortraitModal(true);
      result.current.setPortraitDesc('silver hair');
    });
    await act(async () => {
      await result.current.handleGeneratePortrait();
    });
    expect(result.current.generatedPortraitUrl).toContain('data:image/webp');
  };

  it('applies an account-owned portrait only after durable persistence succeeds', async () => {
    const { result } = await renderLoadedProfile();
    await generatePreview(result);

    await act(async () => {
      await result.current.handleApplyPortrait();
    });

    expect(persistCultivatorPortrait).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'account-a',
      imageSource: 'data:image/webp;base64,generated-portrait',
      prompt: 'refined prompt',
      description: 'silver hair',
      daoRank: 'Dao Adept',
      daoXp: 400,
    }));
    expect(result.current.profile).toMatchObject({
      avatarUrl: savedPortrait.imageUrl,
      activePortraitId: 'portrait-1',
    });
    expect(result.current.formData).toMatchObject({
      avatarUrl: savedPortrait.imageUrl,
      activePortraitId: 'portrait-1',
    });
    expect(storeMocks.state.setUserProfile).toHaveBeenCalledWith(expect.objectContaining({
      avatarUrl: savedPortrait.imageUrl,
      activePortraitId: 'portrait-1',
    }));
    expect(result.current.showPortraitModal).toBe(false);
    expect(result.current.generatedPortraitUrl).toBe('');
  });

  it('restores the selected account portrait from the profile snapshot on reload', async () => {
    const user = makeUser('account-a');
    const { result } = renderHook(() => useUserProfile({
      currentUser: user,
      stories: [],
      onLogout: vi.fn(),
      onNavigateHome: vi.fn(),
    }));

    act(() => {
      firestoreMocks.subscriptions[0].next(profileSnapshot({
        ...profileData,
        avatarUrl: savedPortrait.imageUrl,
        activePortraitId: savedPortrait.id,
      }));
    });

    await waitFor(() => expect(result.current.formData).toMatchObject({
      avatarUrl: savedPortrait.imageUrl,
      activePortraitId: savedPortrait.id,
    }));
  });

  it('recovers from malformed guest profile JSON when applying a portrait', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem('seihouse-local-user-profile', '{malformed-json');
    const { result } = renderHook(() => useUserProfile({
      currentUser: null,
      stories: [],
      onLogout: vi.fn(),
      onNavigateHome: vi.fn(),
    }));

    await waitFor(() => expect(result.current.profile?.uid).toBe('anonymous'));
    await generatePreview(result);

    await act(async () => {
      await result.current.handleApplyPortrait();
    });

    const savedProfile = JSON.parse(localStorage.getItem('seihouse-local-user-profile')!);
    expect(savedProfile.avatarUrl).toBe('data:image/webp;base64,generated-portrait');
    expect(result.current.showPortraitModal).toBe(false);
    expect(result.current.portraitError).toBe('');
    expect(warnSpy).toHaveBeenCalledWith('Failed to parse local profile:', expect.any(SyntaxError));
    warnSpy.mockRestore();
  });

  it('keeps the generated preview available when account persistence fails', async () => {
    vi.mocked(persistCultivatorPortrait).mockRejectedValueOnce(new Error('storage denied'));
    const { result } = await renderLoadedProfile();
    await generatePreview(result);

    await act(async () => {
      await result.current.handleApplyPortrait();
    });

    expect(result.current.showPortraitModal).toBe(true);
    expect(result.current.generatedPortraitUrl).toBe('data:image/webp;base64,generated-portrait');
    expect(result.current.portraitError).toContain('preview has been kept');
    expect(result.current.isSavingPortrait).toBe(false);
    expect(result.current.profile?.avatarUrl).toBe('provider-photo.png');
  });

  it('displays and caches an uploaded portrait while its Firestore record is queued', async () => {
    vi.mocked(persistCultivatorPortrait).mockRejectedValueOnce(
      new CultivatorPortraitCommitDeferredError(savedPortrait),
    );
    const { result } = await renderLoadedProfile();
    await generatePreview(result);

    await act(async () => {
      await result.current.handleApplyPortrait();
    });

    expect(result.current.profile).toMatchObject({
      avatarUrl: savedPortrait.imageUrl,
      activePortraitId: savedPortrait.id,
    });
    expect(result.current.formData.avatarUrl).toBe(savedPortrait.imageUrl);
    expect(result.current.showPortraitModal).toBe(false);
    expect(result.current.generatedPortraitUrl).toBe('');
    expect(result.current.portraitError).toBe('');
    expect(storeMocks.state.setUserProfile).toHaveBeenCalledWith(expect.objectContaining({
      avatarUrl: savedPortrait.imageUrl,
    }));
  });

  it('does not publish an account A save completion into account B state', async () => {
    let resolvePersistence!: (portrait: typeof savedPortrait) => void;
    vi.mocked(persistCultivatorPortrait).mockReturnValueOnce(new Promise(resolve => {
      resolvePersistence = resolve;
    }));

    const accountA = makeUser('account-a');
    const accountB = makeUser('account-b');
    const { result, rerender } = renderHook(
      ({ user }) => useUserProfile({
        currentUser: user,
        stories: [],
        onLogout: vi.fn(),
        onNavigateHome: vi.fn(),
      }),
      { initialProps: { user: accountA } },
    );
    act(() => {
      firestoreMocks.subscriptions[0].next(profileSnapshot(profileData));
    });
    await waitFor(() => expect(result.current.profile?.uid).toBe('account-a'));
    await generatePreview(result);

    let applyPromise!: Promise<void>;
    act(() => {
      applyPromise = result.current.handleApplyPortrait();
    });
    rerender({ user: accountB });
    await act(async () => {
      resolvePersistence(savedPortrait);
      await applyPromise;
    });

    expect(result.current.profile).toMatchObject({ uid: 'account-b', avatarUrl: 'account-b.png' });
    expect(result.current.formData).toMatchObject({ uid: 'account-b', avatarUrl: 'account-b.png' });
    expect(storeMocks.state.setUserProfile).not.toHaveBeenCalled();
  });
});
