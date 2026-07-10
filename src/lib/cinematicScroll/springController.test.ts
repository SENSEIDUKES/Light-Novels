import { describe, it, expect } from 'vitest';
import {
  SpringState,
  DEFAULT_SPRING_CONFIG,
  stepSpring,
  isSettled,
  lerp,
} from './springController';

/** Run the spring toward a fixed target at a given frame interval. */
function simulate(
  start: SpringState,
  target: number,
  frameMs: number,
  totalMs: number,
): { state: SpringState; trace: number[] } {
  let state = start;
  const trace: number[] = [state.position];
  for (let t = 0; t < totalMs; t += frameMs) {
    state = stepSpring(state, target, frameMs / 1000);
    trace.push(state.position);
  }
  return { state, trace };
}

describe('springController', () => {
  it('settles on a static target without overshoot', () => {
    const { state, trace } = simulate({ position: 0, velocity: 0 }, 500, 16, 5000);
    expect(isSettled(state, 500)).toBe(true);
    // Critically damped: never exceeds the target.
    for (const p of trace) {
      expect(p).toBeLessThanOrEqual(500 + 0.01);
    }
    expect(state.position).toBeCloseTo(500, 0);
  });

  it('does not oscillate: motion toward a static target is monotonic', () => {
    const { trace } = simulate({ position: 0, velocity: 0 }, 300, 16, 5000);
    for (let i = 1; i < trace.length; i++) {
      expect(trace[i]).toBeGreaterThanOrEqual(trace[i - 1] - 1e-6);
    }
  });

  it('is frame-rate independent: 60Hz, 90Hz, and 120Hz land within a pixel', () => {
    const at = (frameMs: number) =>
      simulate({ position: 0, velocity: 0 }, 400, frameMs, 3000).state.position;
    const p60 = at(1000 / 60);
    const p90 = at(1000 / 90);
    const p120 = at(1000 / 120);
    expect(Math.abs(p60 - p90)).toBeLessThan(1);
    expect(Math.abs(p60 - p120)).toBeLessThan(1);
  });

  it('clamps huge frame deltas (background tab) so a single step cannot jump', () => {
    const state = stepSpring({ position: 0, velocity: 0 }, 10_000, 5 /* seconds */);
    // With maxDeltaSeconds = 0.05 and maxVelocity = 900, one step moves ≤ 45px.
    expect(state.position).toBeLessThanOrEqual(
      DEFAULT_SPRING_CONFIG.maxVelocity * DEFAULT_SPRING_CONFIG.maxDeltaSeconds + 1e-9,
    );
  });

  it('caps velocity and acceleration', () => {
    let state: SpringState = { position: 0, velocity: 0 };
    for (let i = 0; i < 200; i++) {
      state = stepSpring(state, 1_000_000, 0.016);
      expect(Math.abs(state.velocity)).toBeLessThanOrEqual(DEFAULT_SPRING_CONFIG.maxVelocity);
    }
  });

  it('never produces NaN or Infinity, even from poisoned inputs', () => {
    const poisoned: Array<[SpringState, number, number]> = [
      [{ position: NaN, velocity: 0 }, 100, 0.016],
      [{ position: 0, velocity: NaN }, 100, 0.016],
      [{ position: 0, velocity: 0 }, NaN, 0.016],
      [{ position: 0, velocity: 0 }, Infinity, 0.016],
      [{ position: Infinity, velocity: -Infinity }, 100, NaN],
    ];
    for (const [state, target, dt] of poisoned) {
      const next = stepSpring(state, target, dt);
      expect(Number.isFinite(next.position)).toBe(true);
      expect(Number.isFinite(next.velocity)).toBe(true);
    }
  });

  it('a zero or negative delta leaves the state unchanged', () => {
    const state: SpringState = { position: 42, velocity: 7 };
    expect(stepSpring(state, 100, 0)).toEqual(state);
    expect(stepSpring(state, 100, -1)).toEqual(state);
  });

  it('does not mutate the input state', () => {
    const state: SpringState = { position: 0, velocity: 0 };
    stepSpring(state, 100, 0.016);
    expect(state).toEqual({ position: 0, velocity: 0 });
  });

  it('isSettled requires both small error and small velocity', () => {
    expect(isSettled({ position: 100, velocity: 0 }, 100)).toBe(true);
    expect(isSettled({ position: 100, velocity: 50 }, 100)).toBe(false);
    expect(isSettled({ position: 50, velocity: 0 }, 100)).toBe(false);
  });

  it('lerp clamps its parameter and handles non-finite t', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, -1)).toBe(0);
    expect(lerp(0, 10, 2)).toBe(10);
    expect(lerp(0, 10, NaN)).toBe(0);
  });
});
