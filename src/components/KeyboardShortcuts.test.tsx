import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { KeyboardShortcuts } from './KeyboardShortcuts';

describe('KeyboardShortcuts', () => {
  it('renders without crashing', () => {
    const { container } = render(<KeyboardShortcuts />);
    expect(container).toBeDefined();
  });
});
