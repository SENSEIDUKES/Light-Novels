import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LivingCodexArtifacts } from './LivingCodexArtifacts';

describe('LivingCodexArtifacts', () => {
  it('renders without crashing', () => {
    const { container } = render(<LivingCodexArtifacts memory={{ artifacts: [] } as any} onUpdateMemory={vi.fn()} pushNotification={vi.fn()} />);
    expect(container).toBeDefined();
  });
});
