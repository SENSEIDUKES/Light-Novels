import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IdleCultivationModal } from './IdleCultivationModal';

const mocks = vi.hoisted(() => ({
  awardDirectQi: vi.fn(),
  setUserProfile: vi.fn(),
  userProfile: null as any,
}));

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('../store/useAppStore', () => ({
  useAppStore: (selector: (state: unknown) => unknown) => selector({
    userProfile: mocks.userProfile,
    setUserProfile: mocks.setUserProfile,
  }),
}));

vi.mock('../lib/qi', () => ({
  awardDirectQi: mocks.awardDirectQi,
}));

vi.mock('../lib/firebase', () => ({
  auth: { currentUser: { uid: 'test-user' } },
}));

describe('IdleCultivationModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mocks.userProfile = {
      dao_xp: 7,
      qi: 3,
      heavenly_qi: 5,
      sect_qi: 0,
    };
    mocks.awardDirectQi.mockResolvedValue(undefined);
  });

  it('does not render when there is no idle qi to claim', () => {
    render(<IdleCultivationModal qiEarned={null} onClose={vi.fn()} />);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('awards qi, updates the profile, and closes after claiming', async () => {
    const onClose = vi.fn();

    render(<IdleCultivationModal qiEarned={12} onClose={onClose} />);

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('+12')).toBeDefined();

    const claimButton = screen.getByRole('button', { name: 'Claim & Awaken' });
    await act(async () => {
      fireEvent.click(claimButton);
      await Promise.resolve();
    });

    expect(claimButton).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Absorbing Qi...' })).toBeDefined();
    expect(mocks.awardDirectQi).toHaveBeenCalledWith(12, expect.stringMatching(/^idle-cultivation-/));
    expect(mocks.setUserProfile).toHaveBeenCalledWith({
      dao_xp: 19,
      qi: 15,
      heavenly_qi: 17,
      sect_qi: 12,
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
