import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CodexHovercard } from './CodexHovercard';

vi.mock('../hooks/useImageManifest', () => ({
  useImageManifest: () => ({
    manifestImage: vi.fn(),
    generatingIds: new Set()
  })
}));

describe('CodexHovercard', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <CodexHovercard term="Test" type="character" entry={{ id: '1', name: 'Test' } as any}>
        <span>Hover me</span>
      </CodexHovercard>
    );
    expect(container).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Hover me' }));
    expect(screen.getByRole('button', { name: 'Manifest portrait for Test' }).getAttribute('aria-label'))
      .toBe('Manifest portrait for Test');
  });
});
