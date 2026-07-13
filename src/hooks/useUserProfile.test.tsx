import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUserProfile } from './useUserProfile';

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

    expect(result.current.profile).toBeNull();
    expect(result.current.formData).toEqual({});
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

    expect(result.current.profile).toBeNull();
    expect(result.current.formData).toEqual({});
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

  it('keeps account B empty when its profile read fails', () => {
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

    expect(result.current.profile).toBeNull();
    expect(result.current.formData).toEqual({});
    expect(result.current.error).toBe('Unable to load profile data.');
  });
});
