import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LivingCodexFate } from './LivingCodexFate';

describe('LivingCodexFate', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <LivingCodexFate 
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
        showAddFactionForm={false}
        setShowAddFactionForm={vi.fn()}
        newFaction={{}}
        setNewFaction={vi.fn()}
        handleAddFaction={vi.fn()}
        newWorldRule=""
        setNewWorldRule={vi.fn()}
        handleAddWorldRule={vi.fn()}
      />
    );
    expect(container).toBeDefined();
  });
});
