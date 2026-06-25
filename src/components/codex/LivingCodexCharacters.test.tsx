import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LivingCodexCharacters } from './LivingCodexCharacters';
import { CodexProvider } from './CodexContext';

describe('LivingCodexCharacters', () => {
  it('renders without crashing', () => {
    const mockContext = {
      memory: { characters: [], relationships: [], factions: [], artifacts: [] },
      activeStory: { rules: [] },
      onUpdateMemory: vi.fn(),
    } as any;

    const { container } = render(
      <CodexProvider value={mockContext}>
        <LivingCodexCharacters 
          charsToRender={[]}
          locationsToRender={[]}
          setDeletePrompt={vi.fn()}
          selectedNodeChar={null}
          setSelectedNodeChar={vi.fn()}
        />
      </CodexProvider>
    );
    expect(container).toBeDefined();
  });
});
