import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useSwipeNavigation } from './useSwipeNavigation';
import React from 'react';

describe('useSwipeNavigation', () => {
  it('navigates next on left swipe', () => {
    const navigateNext = vi.fn();
    const navigatePrev = vi.fn();
    const { result } = renderHook(() => useSwipeNavigation({
      selectedChapterNum: 1,
      maxChapterNum: 5,
      navigateNext,
      navigatePrev
    }));

    act(() => {
      result.current.handleTouchStart({ targetTouches: [{ clientX: 200, clientY: 100 }] } as any);
    });
    act(() => {
      result.current.handleTouchMove({ targetTouches: [{ clientX: 100, clientY: 100 }] } as any);
    });
    act(() => {
      result.current.handleTouchEnd();
    });

    expect(navigateNext).toHaveBeenCalled();
    expect(navigatePrev).not.toHaveBeenCalled();
  });

  it('navigates prev on right swipe', () => {
    const navigateNext = vi.fn();
    const navigatePrev = vi.fn();
    const { result } = renderHook(() => useSwipeNavigation({
      selectedChapterNum: 2,
      maxChapterNum: 5,
      navigateNext,
      navigatePrev
    }));

    act(() => {
      result.current.handleTouchStart({ targetTouches: [{ clientX: 100, clientY: 100 }] } as any);
    });
    act(() => {
      result.current.handleTouchMove({ targetTouches: [{ clientX: 200, clientY: 100 }] } as any);
    });
    act(() => {
      result.current.handleTouchEnd();
    });

    expect(navigatePrev).toHaveBeenCalled();
    expect(navigateNext).not.toHaveBeenCalled();
  });

  it('does not navigate on mainly vertical scroll', () => {
    const navigateNext = vi.fn();
    const navigatePrev = vi.fn();
    const { result } = renderHook(() => useSwipeNavigation({
      selectedChapterNum: 2,
      maxChapterNum: 5,
      navigateNext,
      navigatePrev
    }));

    act(() => {
      result.current.handleTouchStart({ targetTouches: [{ clientX: 100, clientY: 100 }] } as any);
    });
    act(() => {
      result.current.handleTouchMove({ targetTouches: [{ clientX: 160, clientY: 300 }] } as any);
    });
    act(() => {
      result.current.handleTouchEnd();
    });

    expect(navigatePrev).not.toHaveBeenCalled();
    expect(navigateNext).not.toHaveBeenCalled();
  });
});
