import { describe, it, expect } from 'vitest';
import { calculateConstantVelocity, calculatePacedVelocity } from './useAutoScroll';

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
