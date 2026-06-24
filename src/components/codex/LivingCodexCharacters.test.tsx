import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LivingCodexCharacters } from './LivingCodexCharacters';

describe('LivingCodexCharacters', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <LivingCodexCharacters 
        memory={{ characters: [], relationships: [] } as any} 
        activeStory={{} as any}
        charsToRender={[]}
        locationsToRender={[]}
        showAddCharForm={false}
        setShowAddCharForm={vi.fn()}
        newChar={{}}
        setNewChar={vi.fn()}
        handleAddCharacter={vi.fn()}
        showAddLocationForm={false}
        setShowAddLocationForm={vi.fn()}
        newLocation={{}}
        setNewLocation={vi.fn()}
        handleAddLocation={vi.fn()}
        setDeletePrompt={vi.fn()}
        selectedNodeChar={null}
        setSelectedNodeChar={vi.fn()}
        handleAwakenCardImage={vi.fn()}
        generatingId={null}
        previews={{}}
        renderImageHistoryGallery={vi.fn()}
      />
    );
    expect(container).toBeDefined();
  });
});
