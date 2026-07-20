import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { AudioWidget } from './AudioWidget';
import { getAudioMixSettings, resetAudioMixCacheForTests } from '../lib/audio/audioMixSettings';

describe('AudioWidget', () => {
  beforeEach(() => {
    localStorage.clear();
    resetAudioMixCacheForTests();
  });

  it('renders without crashing', () => {
    const { container } = render(<AudioWidget />);
    expect(container).toBeDefined();
  });

  it('toggles the Master Audio switch without touching channel levels', () => {
    const before = getAudioMixSettings();
    const { container } = render(<AudioWidget />);
    const btn = container.querySelector('button');
    expect(btn).toBeDefined();
    if (btn) fireEvent.click(btn);

    const after = getAudioMixSettings();
    expect(after.master.enabled).toBe(false);
    expect(after.music).toEqual(before.music);
    expect(after.atmosphere).toEqual(before.atmosphere);
    expect(after.cues).toEqual(before.cues);
  });

  it('changes the master volume', () => {
    const { container } = render(<AudioWidget />);
    const input = container.querySelector('input');
    expect(input).toBeDefined();
    if (input) fireEvent.change(input, { target: { value: '0.8' } });
    expect(getAudioMixSettings().master.volume).toBeCloseTo(0.8);
  });
});
