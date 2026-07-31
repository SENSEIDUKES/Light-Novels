import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ReaderCodexRelations } from './ReaderCodexRelations';
import { CodexProvider } from './CodexContext';

describe('ReaderCodexRelations', () => {
  it('renders without crashing', () => {
    const mockContext = {
      memory: { characters: [], relationships: [], factions: [], artifacts: [] },
      activeStory: { rules: [] },
      mcName: 'Han Feng',
      pushNotification: vi.fn(),
      updateStoryFields: vi.fn(),
      onUpdateMemory: vi.fn(),
    } as any;

    const { container } = render(
      <CodexProvider value={mockContext}>
        <ReaderCodexRelations 
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
