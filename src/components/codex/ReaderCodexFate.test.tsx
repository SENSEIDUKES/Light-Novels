import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ReaderCodexFate } from './ReaderCodexFate';
import { CodexProvider } from './CodexContext';

describe('ReaderCodexFate', () => {
  it('renders without crashing', () => {
    const mockContext = {
      memory: { characters: [], relationships: [], factions: [], artifacts: [] },
      activeStory: { rules: [] },
      onUpdateMemory: vi.fn(),
    } as any;
    
    const { container } = render(
      <CodexProvider value={mockContext}>
        <ReaderCodexFate />
      </CodexProvider>
    );
    expect(container).toBeDefined();
  });
});
