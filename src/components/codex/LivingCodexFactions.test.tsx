import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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

  it('classifies grandmasters as elders instead of leaders', () => {
    const mockContext = {
      memory: { characters: [], relationships: [], factions: [], artifacts: [] },
      activeStory: { rules: [] },
      onUpdateMemory: vi.fn(),
    } as any;

    render(
      <CodexProvider value={mockContext}>
        <LivingCodexFactions
          factionsToRender={[{
            id: 'faction-1',
            name: 'Azure Sect',
            alignment: 'Righteous',
            status: 'Active',
          } as any]}
          memoryCharacters={[{
            id: 'character-1',
            name: 'Mei Lan',
            role: 'Grandmaster',
            faction: 'Azure Sect',
          } as any]}
          setDeletePrompt={vi.fn()}
        />
      </CodexProvider>
    );

    const eldersSection = screen.getByText('Elders Council:').parentElement;
    expect(eldersSection).not.toBeNull();
    expect(within(eldersSection!).getByText('Mei Lan')).toBeDefined();
    expect(screen.queryByText('Sect Leader / Pillar:')).toBeNull();
  });
});
