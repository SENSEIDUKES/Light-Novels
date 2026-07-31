import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useClosedDoorCultivation } from './useClosedDoorCultivation';

const mocks = vi.hoisted(() => {
  const state = {
    currentUser: null as { uid: string } | null,
    userProfile: null as any,
    setUserProfile: vi.fn((profile: any) => {
      state.userProfile = profile;
    }),
  };
  return {
    state,
    claimIdleQiReward: vi.fn(),
    recordLibrarySessionEnd: vi.fn(),
  };
});

vi.mock('../store/useAppStore', () => {
  const useAppStore = (selector: (state: unknown) => unknown) => selector(mocks.state);
  useAppStore.getState = () => mocks.state;
  return { useAppStore };
});

vi.mock('../lib/qi', () => ({
  claimIdleQiReward: mocks.claimIdleQiReward,
  recordLibrarySessionEnd: mocks.recordLibrarySessionEnd,
}));

const sessionEndAgo = (ms: number) => new Date(Date.now() - ms).toISOString();

const setVisibility = (value: DocumentVisibilityState) => {
  Object.defineProperty(document, 'visibilityState', { value, configurable: true });
};

describe('useClosedDoorCultivation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.state.currentUser = null;
    mocks.state.userProfile = null;
    mocks.claimIdleQiReward.mockResolvedValue('claimed');
    setVisibility('visible');
  });

  it('counts the opening day and never double-counts a calendar day', () => {
    const { result, unmount } = renderHook(() => useClosedDoorCultivation(false));
    expect(result.current.daysCultivating).toBe(1);
    unmount();

    // same calendar day, new session: still one cultivating day
    renderHook(() => useClosedDoorCultivation(false));
    expect(localStorage.getItem('seihouse-library-days:anonymous')).toBeDefined();
    expect(JSON.parse(localStorage.getItem('seihouse-library-days:anonymous')!)).toHaveLength(1);
  });

  it('offers a reward after an absence and keeps it across remounts until claimed', async () => {
    localStorage.setItem('seihouse-last-session-end', sessionEndAgo(3 * 60 * 60 * 1000));

    const first = renderHook(() => useClosedDoorCultivation(false));
    expect(first.result.current.idleQiEarned).toBe(18);
    first.unmount();

    // remounting (refresh/reopen) before claiming re-opens the same reward
    const second = renderHook(() => useClosedDoorCultivation(false));
    expect(second.result.current.idleQiEarned).toBe(18);

    await act(async () => {
      await second.result.current.claimIdleQi(18);
    });
    // the reward stays displayed while the modal plays its disappearance
    expect(second.result.current.idleQiEarned).toBe(18);

    act(() => {
      second.result.current.closeIdleQi();
    });
    expect(second.result.current.idleQiEarned).toBeNull();
    second.unmount();

    // after claiming, the consumed baseline cannot be claimed again
    const third = renderHook(() => useClosedDoorCultivation(false));
    expect(third.result.current.idleQiEarned).toBeNull();
  });

  it('keeps the waiting reward across hide/visible tab cycles', () => {
    localStorage.setItem('seihouse-last-session-end', sessionEndAgo(3 * 60 * 60 * 1000));
    const { result } = renderHook(() => useClosedDoorCultivation(false));
    expect(result.current.idleQiEarned).toBe(18);

    setVisibility('hidden');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    setVisibility('visible');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.idleQiEarned).toBe(18);
  });

  it('closes the waiting reward when another tab on this device claims it', () => {
    localStorage.setItem('seihouse-last-session-end', sessionEndAgo(3 * 60 * 60 * 1000));
    const { result } = renderHook(() => useClosedDoorCultivation(false));
    expect(result.current.idleQiEarned).toBe(18);

    // another tab completed the claim and wrote the consumed marker
    localStorage.setItem(
      'seihouse-idle-claim:anonymous',
      localStorage.getItem('seihouse-last-session-end')!,
    );
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.idleQiEarned).toBeNull();
  });

  it('offers nothing for absences under the minimum', () => {
    localStorage.setItem('seihouse-last-session-end', sessionEndAgo(5 * 60 * 1000));
    const { result } = renderHook(() => useClosedDoorCultivation(false));
    expect(result.current.idleQiEarned).toBeNull();
  });

  it('waits for the signed-in profile before offering a reward', () => {
    localStorage.setItem('seihouse-last-session-end', sessionEndAgo(3 * 60 * 60 * 1000));
    mocks.state.currentUser = { uid: 'user-a' };
    mocks.state.userProfile = null;

    const { result, rerender } = renderHook(() => useClosedDoorCultivation(false));
    expect(result.current.idleQiEarned).toBeNull();

    mocks.state.userProfile = { uid: 'user-a', dao_xp: 0 };
    rerender();
    expect(result.current.idleQiEarned).toBe(18);
  });

  it('prefers a newer server-side session end so cross-device activity shrinks the reward', () => {
    localStorage.setItem('seihouse-last-session-end', sessionEndAgo(3 * 60 * 60 * 1000));
    mocks.state.currentUser = { uid: 'user-a' };
    mocks.state.userProfile = {
      uid: 'user-a',
      dao_xp: 0,
      lastSessionEnd: sessionEndAgo(5 * 60 * 1000),
    };

    const { result } = renderHook(() => useClosedDoorCultivation(false));
    expect(result.current.idleQiEarned).toBeNull();
  });

  it('claims through the recorded-transaction path and clears the reward', async () => {
    localStorage.setItem('seihouse-last-session-end', sessionEndAgo(2 * 60 * 60 * 1000));
    mocks.state.currentUser = { uid: 'user-a' };
    mocks.state.userProfile = { uid: 'user-a', dao_xp: 100 };

    const { result } = renderHook(() => useClosedDoorCultivation(false));
    expect(result.current.idleQiEarned).toBe(12);

    await act(async () => {
      await result.current.claimIdleQi(12);
    });

    expect(mocks.claimIdleQiReward).toHaveBeenCalledWith(12, expect.any(String));
    const baseline = mocks.claimIdleQiReward.mock.calls[0][1];
    expect(Number.isFinite(Date.parse(baseline))).toBe(true);
    // the reward stays displayed until the modal finishes the disappearance
    expect(result.current.idleQiEarned).toBe(12);
    act(() => {
      result.current.closeIdleQi();
    });
    expect(result.current.idleQiEarned).toBeNull();
  });

  it('keeps the reward pending when the claim fails', async () => {
    localStorage.setItem('seihouse-last-session-end', sessionEndAgo(2 * 60 * 60 * 1000));
    mocks.state.currentUser = { uid: 'user-a' };
    mocks.state.userProfile = { uid: 'user-a', dao_xp: 100 };
    mocks.claimIdleQiReward.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useClosedDoorCultivation(false));
    await act(async () => {
      await expect(result.current.claimIdleQi(12)).rejects.toThrow('offline');
    });
    expect(result.current.idleQiEarned).toBe(12);
  });

  it('awards anonymous claims to the guest profile exactly once', async () => {
    localStorage.setItem('seihouse-last-session-end', sessionEndAgo(2 * 60 * 60 * 1000));
    mocks.state.userProfile = { uid: 'anonymous', dao_xp: 3, qi: 3, heavenly_qi: 3, sect_qi: 0 };

    const { result } = renderHook(() => useClosedDoorCultivation(false));
    await act(async () => {
      await result.current.claimIdleQi(12);
    });

    expect(mocks.claimIdleQiReward).not.toHaveBeenCalled();
    expect(mocks.state.userProfile).toMatchObject({
      dao_xp: 15,
      qi: 15,
      heavenly_qi: 15,
      sect_qi: 12,
    });
    act(() => {
      result.current.closeIdleQi();
    });
    expect(result.current.idleQiEarned).toBeNull();
    // the anonymous marker blocks any second award of the same baseline
    expect(localStorage.getItem('seihouse-idle-claim:anonymous')).not.toBeNull();
  });

  it('records the session end when the app hides', () => {
    mocks.state.currentUser = { uid: 'user-a' };
    mocks.state.userProfile = { uid: 'user-a', dao_xp: 0 };
    renderHook(() => useClosedDoorCultivation(false));

    setVisibility('hidden');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(readLocalSessionEnd()).not.toBeNull();
    // passive hide rides the debounced sync; no immediate flush
    expect(mocks.recordLibrarySessionEnd).toHaveBeenCalledWith(expect.any(String), false);
  });

  it('flushes the session end immediately during page teardown', () => {
    mocks.state.currentUser = { uid: 'user-a' };
    mocks.state.userProfile = { uid: 'user-a', dao_xp: 0 };
    renderHook(() => useClosedDoorCultivation(false));

    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(mocks.recordLibrarySessionEnd).toHaveBeenCalledWith(expect.any(String), true);

    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });
    expect(mocks.recordLibrarySessionEnd).toHaveBeenCalledWith(expect.any(String), true);
  });

  it('does not offer a reward while initializing', () => {
    localStorage.setItem('seihouse-last-session-end', sessionEndAgo(3 * 60 * 60 * 1000));
    const { result } = renderHook(() => useClosedDoorCultivation(true));
    expect(result.current.idleQiEarned).toBeNull();
  });
});

function readLocalSessionEnd(): string | null {
  return localStorage.getItem('seihouse-last-session-end');
}
