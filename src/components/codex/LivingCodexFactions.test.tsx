import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LivingCodexFactions } from './LivingCodexFactions';

describe('LivingCodexFactions', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <LivingCodexFactions 
        factionsToRender={[]}
        memoryCharacters={[]}
        showAddFactionForm={false}
        setShowAddFactionForm={vi.fn()}
        newFaction={{}}
        setNewFaction={vi.fn()}
        handleAddFaction={vi.fn()}
        setDeletePrompt={vi.fn()}
      />
    );
    expect(container).toBeDefined();
  });
});
