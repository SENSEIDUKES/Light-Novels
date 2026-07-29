import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

  it('does not regenerate a persisted portrait just because its URL is unavailable', () => {
    const handleAwakenCardImage = vi.fn();
    const character = {
      id: 'character-1',
      name: 'Ye Mo',
      role: 'Rival',
      description: 'A recurring rival.',
      status: 'alive',
      imageAssetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      imageUrl: '',
      firstAppeared: 1,
    } as any;
    const mockContext = {
      memory: {
        characters: [character],
        relationships: [],
        factions: [],
        artifacts: [],
        locations: [],
      },
      activeStory: { id: 'story-1', currentChapterNumber: 2, rules: [] },
      onUpdateMemory: vi.fn(),
      generatingId: null,
      previews: {},
      handleAwakenCardImage,
      getPowerRankScore: vi.fn(() => ({ score: 0, title: 'Mortal' })),
      openEntryContextEditor: vi.fn(),
    } as any;

    render(
      <CodexProvider value={mockContext}>
        <LivingCodexCharacters
          charsToRender={[character]}
          locationsToRender={[]}
          setDeletePrompt={vi.fn()}
          selectedNodeChar={null}
          setSelectedNodeChar={vi.fn()}
        />
      </CodexProvider>,
    );

    const progressionButton = screen.getByRole('button', {
      name: 'Progression required for Ye Mo visual',
    }) as HTMLButtonElement;
    expect(progressionButton.disabled).toBe(true);
    fireEvent.click(progressionButton);
    expect(handleAwakenCardImage).not.toHaveBeenCalled();
  });
});
