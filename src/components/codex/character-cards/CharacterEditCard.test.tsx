import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CharacterEditCard } from './CharacterEditCard';
import type {
  EditableCodexAbility,
  EditingCharData,
} from '../../../hooks/useCodexCharacterEditing';

function CharacterEditorHarness() {
  const [editingData, setEditingData] = useState<EditingCharData>({
    description: 'Pavilion keeper',
    status: 'alive',
    aliases: [],
    abilitiesList: [{
      id: 'ability-1',
      name: 'Moon Step',
      description: 'A silent movement art.',
      aliases: [],
    }],
  });

  const updateAbility = (id: string, updates: Partial<EditableCodexAbility>) => {
    setEditingData(current => ({
      ...current,
      abilitiesList: (current.abilitiesList || []).map(ability => (
        ability.id === id ? { ...ability, ...updates } : ability
      )),
    }));
  };

  return (
    <>
      <CharacterEditCard
        char={{ id: 'char-1', name: 'Mei', description: '', role: 'ally', relationshipToMC: 'ally', status: 'alive' }}
        editingCharData={editingData}
        setEditingCharData={setEditingData}
        setEditingCharId={vi.fn()}
        handleSaveCharEdit={vi.fn()}
        addAbility={vi.fn()}
        removeAbility={vi.fn()}
        updateAbility={updateAbility}
      />
      <output data-testid="editing-data">{JSON.stringify(editingData)}</output>
    </>
  );
}

const readEditingData = () => JSON.parse(screen.getByTestId('editing-data').textContent || '{}');

describe('CharacterEditCard context fields', () => {
  it('controls character and nested ability context independently', () => {
    render(<CharacterEditorHarness />);

    fireEvent.change(screen.getByLabelText('New alias or known title for Mei'), {
      target: { value: 'Pavilion Mistress' },
    });
    fireEvent.click(screen.getByLabelText('Add alias or known title for Mei'));

    fireEvent.change(screen.getByLabelText('New alias or known title for Moon Step'), {
      target: { value: 'Silent Moon Walk' },
    });
    fireEvent.click(screen.getByLabelText('Add alias or known title for Moon Step'));
    fireEvent.click(screen.getByLabelText('Pin Moon Step to context'));

    expect(readEditingData()).toMatchObject({
      aliases: ['Pavilion Mistress'],
      abilitiesList: [{
        id: 'ability-1',
        aliases: ['Silent Moon Walk'],
        provenance: { isUserPinned: true },
      }],
    });
  });

  it('shows alias collisions and disables save', () => {
    render(
      <CharacterEditCard
        char={{ id: 'char-1', name: 'Mei', description: '', role: 'ally', relationshipToMC: 'ally', status: 'alive' }}
        editingCharData={{ status: 'alive', abilitiesList: [] }}
        setEditingCharData={vi.fn()}
        setEditingCharId={vi.fn()}
        handleSaveCharEdit={vi.fn()}
        addAbility={vi.fn()}
        removeAbility={vi.fn()}
        updateAbility={vi.fn()}
        aliasCollisions={[{
          alias: 'Master',
          ownerName: 'Mei',
          conflictingEntryName: 'Lan Wei',
        }]}
      />,
    );

    expect(screen.getByRole('alert').textContent).toContain('already identifies Lan Wei');
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
