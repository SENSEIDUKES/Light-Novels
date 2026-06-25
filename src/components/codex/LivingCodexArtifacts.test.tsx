import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LivingCodexArtifacts } from './LivingCodexArtifacts';
import { CodexProvider } from './CodexContext';

describe('LivingCodexArtifacts', () => {
  it('renders without crashing', () => {
    const mockContext = {
      memory: { characters: [], relationships: [], factions: [], artifacts: [] },
      activeStory: { rules: [] },
      onUpdateMemory: vi.fn(),
    } as any;

    const { container } = render(
      <CodexProvider value={mockContext}>
        <LivingCodexArtifacts 
          artifactsToRender={[]} 
          setDeletePrompt={vi.fn()} 
        />
      </CodexProvider>
    );
    expect(container).toBeDefined();
  });
});
