import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ParticleEffect } from './ParticleEffect';

const TARGET_FRAME_TIME = 1000 / 60;

const createCanvasContext = () => {
  const gradient = { addColorStop: vi.fn() };
  return {
    arc: vi.fn(),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    closePath: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    createRadialGradient: vi.fn(() => gradient),
    drawImage: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    restore: vi.fn(),
    rotate: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
};

const installCanvasHarness = (reducedMotion: boolean) => {
  const context = createCanvasContext();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
    bottom: 844,
    height: 844,
    left: 0,
    right: 390,
    top: 0,
    width: 390,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);

  const mediaListeners = new Set<(event: MediaQueryListEvent) => void>();
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: reducedMotion,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      mediaListeners.add(listener);
    },
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      mediaListeners.delete(listener);
    },
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));

  let nextFrameId = 0;
  const frameCallbacks: FrameRequestCallback[] = [];
  const requestFrame = vi
    .spyOn(window, 'requestAnimationFrame')
    .mockImplementation((callback) => {
      frameCallbacks.push(callback);
      nextFrameId += 1;
      return nextFrameId;
    });
  const cancelFrame = vi
    .spyOn(window, 'cancelAnimationFrame')
    .mockImplementation(() => {});

  return { cancelFrame, context, frameCallbacks, mediaListeners, requestFrame };
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ParticleEffect', () => {
  it('renders one static frame when reduced motion is preferred', () => {
    const { context, frameCallbacks, mediaListeners, requestFrame } =
      installCanvasHarness(true);

    const { container, unmount } = render(<ParticleEffect accent="#f59e0b" />);
    expect(requestFrame).toHaveBeenCalledTimes(1);
    expect(container.querySelector('canvas')?.width).toBe(390);
    expect(container.querySelector('canvas')?.height).toBe(844);

    act(() => {
      frameCallbacks.shift()?.(TARGET_FRAME_TIME);
    });

    expect(context.clearRect).toHaveBeenCalledTimes(1);
    expect(requestFrame).toHaveBeenCalledTimes(1);

    unmount();
    expect(mediaListeners.size).toBe(0);
  });

  it('continues normal animation and cancels the active frame on unmount', () => {
    const { cancelFrame, frameCallbacks, requestFrame } = installCanvasHarness(false);

    const { unmount } = render(<ParticleEffect />);
    expect(requestFrame).toHaveBeenCalledTimes(1);

    act(() => {
      frameCallbacks.shift()?.(TARGET_FRAME_TIME);
    });

    expect(requestFrame).toHaveBeenCalledTimes(2);
    unmount();
    expect(cancelFrame).toHaveBeenLastCalledWith(2);
  });
});
