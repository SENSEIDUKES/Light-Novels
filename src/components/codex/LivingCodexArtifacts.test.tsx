import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

  it('does not regenerate a persisted relic just because its URL is unavailable', () => {
    const handleAwakenCardImage = vi.fn();
    const artifact = {
      id: 'artifact-1',
      name: 'Moon Seal',
      description: 'An ancient seal.',
      tier: 'Earth',
      currentOwner: 'Ye Mo',
      firstAppeared: 1,
      imageAssetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      imageUrl: '',
    } as any;
    const mockContext = {
      memory: {
        characters: [],
        relationships: [],
        factions: [],
        artifacts: [artifact],
      },
      activeStory: { id: 'story-1', currentChapterNumber: 2, rules: [] },
      onUpdateMemory: vi.fn(),
      generatingId: null,
      previews: {},
      handleAwakenCardImage,
      openEntryContextEditor: vi.fn(),
    } as any;

    render(
      <CodexProvider value={mockContext}>
        <LivingCodexArtifacts
          artifactsToRender={[artifact]}
          setDeletePrompt={vi.fn()}
        />
      </CodexProvider>,
    );

    const progressionButton = screen.getByRole('button', {
      name: 'Requires Progression',
    }) as HTMLButtonElement;
    expect(progressionButton.disabled).toBe(true);
    fireEvent.click(progressionButton);
    expect(handleAwakenCardImage).not.toHaveBeenCalled();
  });
});
