import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LivingCodexRelations } from './LivingCodexRelations';
import { CodexProvider } from './CodexContext';

describe('LivingCodexRelations', () => {
  it('renders without crashing', () => {
    const mockContext = {
      memory: { characters: [], relationships: [], factions: [], artifacts: [] },
      activeStory: { rules: [] },
      mcName: 'Han Feng',
      pushNotification: vi.fn(),
      onUpdateStory: vi.fn(),
      onUpdateMemory: vi.fn(),
    } as any;

    const { container } = render(
      <CodexProvider value={mockContext}>
        <LivingCodexRelations 
          charsToRender={[]}
          setDeletePrompt={vi.fn()}
          selectedNodeChar={null}
          setSelectedNodeChar={vi.fn()}
        />
      </CodexProvider>
    );
    expect(container).toBeDefined();
  });
});
