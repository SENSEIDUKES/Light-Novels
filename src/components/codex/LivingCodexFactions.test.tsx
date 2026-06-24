import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LivingCodexFactions } from './LivingCodexFactions';

describe('LivingCodexFactions', () => {
  it('renders without crashing', () => {
    const { container } = render(<LivingCodexFactions memory={{ factions: [] } as any} onUpdateMemory={vi.fn()} pushNotification={vi.fn()} />);
    expect(container).toBeDefined();
  });
});
