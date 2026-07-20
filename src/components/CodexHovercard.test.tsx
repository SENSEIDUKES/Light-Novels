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
  it('renders the manifest button with an accessible name', () => {
    render(
      <CodexHovercard term="Test" type="character" entry={{ id: '1', name: 'Test' } as any}>
        <span>Hover me</span>
      </CodexHovercard>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Hover me' }));

    const manifestButton = screen.getByRole('button', { name: 'Manifest portrait for Test' });
    expect(manifestButton.getAttribute('aria-label')).toBe('Manifest portrait for Test');
  });
});
