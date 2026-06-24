import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { AudioWidget } from './AudioWidget';

describe('AudioWidget', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders without crashing', () => {
    const { container } = render(<AudioWidget />);
    expect(container).toBeDefined();
  });

  it('can toggle mute', () => {
    const { container } = render(<AudioWidget />);
    const btn = container.querySelector('button');
    expect(btn).toBeDefined();
    if (btn) fireEvent.click(btn);
    expect(localStorage.getItem('seihouse-audio-muted')).toBe('true');
  });

  it('can change volume', () => {
    const { container } = render(<AudioWidget />);
    const input = container.querySelector('input');
    expect(input).toBeDefined();
    if (input) fireEvent.change(input, { target: { value: '0.8' } });
    expect(localStorage.getItem('seihouse-audio-volume')).toBe('0.8');
  });
});
