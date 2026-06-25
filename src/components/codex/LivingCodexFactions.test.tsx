import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LivingCodexFactions } from './LivingCodexFactions';
import { CodexProvider } from './CodexContext';

describe('LivingCodexFactions', () => {
  it('renders without crashing', () => {
    const mockContext = {
      memory: { characters: [], relationships: [], factions: [], artifacts: [] },
      activeStory: { rules: [] },
      onUpdateMemory: vi.fn(),
    } as any;

    const { container } = render(
      <CodexProvider value={mockContext}>
        <LivingCodexFactions 
          factionsToRender={[]}
          memoryCharacters={[]}
          setDeletePrompt={vi.fn()}
        />
      </CodexProvider>
    );
    expect(container).toBeDefined();
  });
});
