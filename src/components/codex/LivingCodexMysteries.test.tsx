import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LivingCodexMysteries } from './LivingCodexMysteries';

describe('LivingCodexMysteries', () => {
  it('renders without crashing', () => {
    const { container } = render(<LivingCodexMysteries memory={{ mysteries: [] } as any} onUpdateMemory={vi.fn()} pushNotification={vi.fn()} />);
    expect(container).toBeDefined();
  });
});
