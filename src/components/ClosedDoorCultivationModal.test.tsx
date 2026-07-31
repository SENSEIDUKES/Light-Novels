import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClosedDoorCultivationModal } from './ClosedDoorCultivationModal';

vi.mock('motion/react', () => {
  const strip = ({ children, initial: _i, animate: _a, exit: _e, transition: _t, ...props }: any) => (
    <div {...props}>{children}</div>
  );
  const Button = React.forwardRef(
    ({ children, initial: _i, animate: _a, exit: _e, transition: _t, ...props }: any, ref: any) => (
      <button {...props} ref={ref}>{children}</button>
    ),
  );
  return {
    motion: {
      div: strip,
      button: Button,
      span: ({ children, initial: _i, animate: _a, exit: _e, transition: _t, ...props }: any) => (
        <span {...props}>{children}</span>
      ),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
    useReducedMotion: () => false,
  };
});

const renderModal = (
  props: Partial<React.ComponentProps<typeof ClosedDoorCultivationModal>> = {},
) => {
  const onClose = props.onClose ?? vi.fn();
  const onClaim = props.onClaim ?? vi.fn().mockResolvedValue(undefined);
  const utils = render(
    <ClosedDoorCultivationModal
      qiEarned={12}
      onClose={onClose}
      onClaim={onClaim}
      daysCultivating={7}
      {...props}
    />,
  );
  return { onClose, onClaim, ...utils };
};

describe('ClosedDoorCultivationModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Deterministic quote rolls: always the progression line, never timeless.
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not render when there is no idle qi to claim', () => {
    renderModal({ qiEarned: null });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the cultivation composition with dynamic day count and progression quote', () => {
    renderModal({ daysCultivating: 7 });
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Days Cultivating')).toBeDefined();
    expect(screen.getByText('7 DAYS')).toBeDefined();
    expect(screen.getByText('Just getting your feet wet.')).toBeDefined();
    expect(screen.getByText('+12 QI')).toBeDefined();
    expect(screen.getByText('Closed-Door Cultivation')).toBeDefined();
  });

  it.each([
    [1, 'The first step has been taken.'],
    [3, 'Still finding your footing.'],
    [7, 'Just getting your feet wet.'],
    [10, 'The Library is becoming familiar.'],
    [30, 'One month of steady cultivation.'],
    [179, 'Your dedication speaks for itself.'],
    [180, 'Half a year upon the path.'],
    [400, 'Half a year upon the path.'],
  ])('shows the milestone quote for %i cultivating days', (days, quote) => {
    renderModal({ daysCultivating: days });
    expect(screen.getByText(quote)).toBeDefined();
  });

  it('floors the displayed day count at 1 day', () => {
    renderModal({ daysCultivating: 0 });
    expect(screen.getByText('1 DAY')).toBeDefined();
    expect(screen.getByText('The first step has been taken.')).toBeDefined();
  });

  it('occasionally replaces the milestone quote with a timeless one', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01);
    renderModal({ daysCultivating: 7 });
    expect(screen.queryByText('Just getting your feet wet.')).toBeNull();
    expect(
      screen.getByText((_content, element) =>
        element?.tagName === 'SPAN' &&
        [
          'Even the longest paths begin in silence.',
          'The heavens favor those who return.',
          'A quiet mind gathers boundless Qi.',
          "Today's effort shapes tomorrow's realm.",
          'Some breakthroughs happen when no one is watching.',
        ].includes(element.textContent ?? ''),
      ),
    ).toBeDefined();
  });

  it('keeps the chosen quote stable across re-renders', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const { rerender } = render(
      <ClosedDoorCultivationModal qiEarned={12} onClose={vi.fn()} onClaim={vi.fn()} daysCultivating={7} />,
    );
    const firstQuote = screen.getByText('Just getting your feet wet.');
    const rollsAtOpen = randomSpy.mock.calls.length;
    rerender(
      <ClosedDoorCultivationModal qiEarned={12} onClose={vi.fn()} onClaim={vi.fn()} daysCultivating={7} />,
    );
    expect(randomSpy.mock.calls.length).toBe(rollsAtOpen);
    expect(screen.getByText('Just getting your feet wet.')).toBe(firstQuote);
  });

  it('starts the absorption immediately, then closes 2.5s after the claim started', async () => {
    let resolveClaim!: () => void;
    const onClaim = vi.fn().mockImplementation(
      () => new Promise<void>(resolve => { resolveClaim = resolve; }),
    );
    const onClose = vi.fn();
    renderModal({ onClaim, onClose });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Claim & Awaken' }));
      await Promise.resolve();
    });

    // the three-phase sequence (dantian absorption + emblem flight) starts at once
    expect(onClaim).toHaveBeenCalledWith(12);
    expect(screen.getByRole('button', { name: 'Absorbing Qi...' })).toBeDefined();
    expect(document.querySelectorAll('.z-\\[110\\]').length).toBe(2);
    expect(onClose).not.toHaveBeenCalled();

    // the claim sequence is latency-independent: even a slow transaction does
    // not extend the 2.5s window measured from the tap
    await act(async () => {
      vi.advanceTimersByTime(1200);
      resolveClaim();
      await Promise.resolve();
    });
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1299);
    });
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the veil open and allows retrying when the claim fails', async () => {
    const onClaim = vi.fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(undefined);
    const onClose = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderModal({ onClaim, onClose });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Claim & Awaken' }));
      await Promise.resolve();
    });

    expect(consoleError).toHaveBeenCalledWith('Failed to claim idle qi:', expect.any(Error));
    expect(onClose).not.toHaveBeenCalled();
    // the reward is still waiting: overlays cleared, dialog restored for a retry
    expect(document.querySelectorAll('.z-\\[110\\]').length).toBe(0);
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Claim & Awaken' })).toBeDefined();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Claim & Awaken' }));
      await Promise.resolve();
    });
    expect(onClaim).toHaveBeenCalledTimes(2);

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('collapses into a tiny waiting icon when left unclaimed, and re-expands on tap', () => {
    renderModal();

    expect(screen.getByRole('dialog')).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(7000);
    });

    expect(screen.queryByRole('dialog')).toBeNull();
    const waitingIcon = screen.getByRole('button', { name: 'Open closed-door cultivation reward' });
    expect(waitingIcon).toBeDefined();

    fireEvent.click(waitingIcon);
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Claim & Awaken' })).toBeDefined();
  });

  it('resets the claim state when a new reward cycle begins', async () => {
    const onClaim = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const { rerender } = render(
      <ClosedDoorCultivationModal qiEarned={12} onClose={onClose} onClaim={onClaim} daysCultivating={7} />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Claim & Awaken' }));
      await Promise.resolve();
    });
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <ClosedDoorCultivationModal qiEarned={null} onClose={onClose} onClaim={onClaim} daysCultivating={7} />,
    );
    expect(screen.queryByRole('dialog')).toBeNull();

    rerender(
      <ClosedDoorCultivationModal qiEarned={5} onClose={onClose} onClaim={onClaim} daysCultivating={8} />,
    );
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('+5 QI')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Claim & Awaken' })).toBeDefined();
  });
});
