import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { calculateConstantVelocity, calculatePacedVelocity, useAutoScroll } from './useAutoScroll';

describe('useAutoScroll math limits', () => {
  it('calculateConstantVelocity computes px/sec using standard spacing', () => {
    const vel = calculateConstantVelocity(200);
    // 200 / 2 = 100
    expect(vel).toBe(100);
  });

  it('calculatePacedVelocity correctly distributes distance over time', () => {
    const pxPerSec = calculatePacedVelocity(500, 5000); // 500px in 5 seconds
    expect(pxPerSec).toBe(100);
  });

  it('calculatePacedVelocity handles zero or negative duration', () => {
    expect(calculatePacedVelocity(500, 0)).toBe(0);
    expect(calculatePacedVelocity(500, -100)).toBe(0);
  });
});

describe('useAutoScroll hook narration integration', () => {
  it('resumes scrolling in paced mode on "block" event even after pause', () => {
    const container = document.createElement('div');
    const containerRef = { current: container };
    
    const { result } = renderHook(() => useAutoScroll({
      containerRef,
      mode: 'paced'
    }));

    // Initially not scrolling
    expect(result.current.isScrolling).toBe(false);

    // Start event
    act(() => {
      window.dispatchEvent(new CustomEvent('seihouse-narration', {
        detail: { status: 'start' }
      }));
    });
    expect(result.current.isScrolling).toBe(true);

    // Pause manually
    act(() => {
      result.current.pause();
    });
    expect(result.current.isScrolling).toBe(false);

    // block event should auto-resume scrolling
    act(() => {
      window.dispatchEvent(new CustomEvent('seihouse-narration', {
        detail: { status: 'block', blockIndex: 0, durationMs: 2000 }
      }));
    });
    expect(result.current.isScrolling).toBe(true);
  });
});
