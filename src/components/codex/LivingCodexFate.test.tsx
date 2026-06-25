import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LivingCodexFate } from './LivingCodexFate';
import { CodexProvider } from './CodexContext';

describe('LivingCodexFate', () => {
  it('renders without crashing', () => {
    const mockContext = {
      memory: { characters: [], relationships: [], factions: [], artifacts: [] },
      activeStory: { rules: [] },
      onUpdateMemory: vi.fn(),
    } as any;
    
    const { container } = render(
      <CodexProvider value={mockContext}>
        <LivingCodexFate />
      </CodexProvider>
    );
    expect(container).toBeDefined();
  });
});
