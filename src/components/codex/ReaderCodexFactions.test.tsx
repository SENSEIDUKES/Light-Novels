import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReaderCodexFactions } from './ReaderCodexFactions';
import { CodexProvider } from './CodexContext';

describe('ReaderCodexFactions', () => {
  it('renders without crashing', () => {
    const mockContext = {
      memory: { characters: [], relationships: [], factions: [], artifacts: [] },
      activeStory: { rules: [] },
      onUpdateMemory: vi.fn(),
    } as any;

    const { container } = render(
      <CodexProvider value={mockContext}>
        <ReaderCodexFactions 
          factionsToRender={[]}
          memoryCharacters={[]}
          setDeletePrompt={vi.fn()}
        />
      </CodexProvider>
    );
    expect(container).toBeDefined();
  });

  it('renders a faction manifestation and reverts its owner-scoped history', () => {
    const handleRevertImage = vi.fn();
    const faction = {
      id: 'faction-1',
      name: 'Azure Sect',
      description: 'Keepers of the northern seal.',
      alignment: 'Righteous',
      status: 'Active',
      imageAssetId: 'asset-current',
      imageUrl: 'blob:asset-current',
      imageHistory: [{
        id: 'history-older',
        assetId: 'asset-older',
        entityId: 'faction-1',
        entityType: 'faction',
        imageUrl: 'blob:asset-older',
        createdAt: '2026-07-01T00:00:00.000Z',
        isCurrent: false,
        chapterNumber: 1,
      }, {
        id: 'history-current',
        assetId: 'asset-current',
        entityId: 'faction-1',
        entityType: 'faction',
        imageUrl: 'blob:asset-current',
        createdAt: '2026-07-02T00:00:00.000Z',
        isCurrent: true,
        chapterNumber: 2,
      }],
    } as any;
    const mockContext = {
      memory: { characters: [], relationships: [], factions: [faction], artifacts: [] },
      activeStory: { userId: 'owner-a', rules: [] },
      onUpdateMemory: vi.fn(),
      handleRevertImage,
    } as any;

    render(
      <CodexProvider value={mockContext}>
        <ReaderCodexFactions
          factionsToRender={[faction]}
          memoryCharacters={[]}
          setDeletePrompt={vi.fn()}
        />
      </CodexProvider>,
    );

    expect(screen.getByRole('img', { name: 'Azure Sect' }).getAttribute('src'))
      .toBe('blob:asset-current');
    fireEvent.click(screen.getByRole('button', {
      name: 'Revert to image generated at Chapter 1. Prompt unavailable',
    }));
    expect(handleRevertImage).toHaveBeenCalledWith(
      'faction-1',
      'faction',
      'history-older',
    );
  });
});
