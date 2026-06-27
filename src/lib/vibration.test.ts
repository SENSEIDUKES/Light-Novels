import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { vibrate, VIBRATION_PATTERNS } from './vibration';

describe('vibration', () => {
  let originalNavigator: any;

  beforeEach(() => {
    originalNavigator = global.navigator;
    global.navigator = {
      vibrate: vi.fn(),
    } as any;
  });

  afterEach(() => {
    global.navigator = originalNavigator;
    vi.clearAllMocks();
  });

  it('calls navigator.vibrate with predefined pattern', () => {
    vibrate('success');
    expect(navigator.vibrate).toHaveBeenCalledWith(VIBRATION_PATTERNS.success);
  });

  it('calls navigator.vibrate with custom number array', () => {
    vibrate([10, 20, 30]);
    expect(navigator.vibrate).toHaveBeenCalledWith([10, 20, 30]);
  });

  it('calls navigator.vibrate with custom number', () => {
    vibrate(50);
    expect(navigator.vibrate).toHaveBeenCalledWith(50);
  });

  it('does nothing if navigator.vibrate does not exist', () => {
    delete (global as any).navigator.vibrate;
    expect(() => vibrate('success')).not.toThrow();
  });
});
