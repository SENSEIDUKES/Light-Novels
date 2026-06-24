import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LivingCodexGlossary } from './LivingCodexGlossary';

describe('LivingCodexGlossary', () => {
  it('renders without crashing', () => {
    const { container } = render(<LivingCodexGlossary memory={{ glossary: [] } as any} onUpdateMemory={vi.fn()} pushNotification={vi.fn()} />);
    expect(container).toBeDefined();
  });
});
