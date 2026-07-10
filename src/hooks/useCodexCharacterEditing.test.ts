import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCodexCharacterEditing } from './useCodexCharacterEditing';

describe('useCodexCharacterEditing', () => {
  it('normalizes legacy abilities and saves trimmed character edits', () => {
    const character = {
      id: 'char-1',
      name: 'Mei',
      role: 'protagonist',
      status: 'alive',
      powerLevel: 'Core Formation',
      abilities: ['Moon Step', { id: 'ability-2', name: 'Flame', description: 'Hot' }],
    } as any;
    const memory = { characters: [character], factions: [{ id: 'faction-1' }] } as any;
    const onUpdateMemory = vi.fn();
    const { result } = renderHook(() =>
      useCodexCharacterEditing({ memory, onUpdateMemory }),
    );

    act(() => result.current.beginCharEdit(character));

    expect(result.current.editingCharData.abilitiesList).toEqual([
      expect.objectContaining({ name: 'Moon Step', description: '' }),
      { id: 'ability-2', name: 'Flame', description: 'Hot' },
    ]);

    act(() => {
      result.current.setEditingCharData((current) => ({
        ...current,
        powerLevel: '  Nascent Soul  ',
        faction: '  Jade Court  ',
        signatureQuote: '  Never yield.  ',
        abilitiesList: [
          { id: 'valid', name: '  Starfall  ', description: 'A technique' },
          { id: 'blank', name: '   ', description: 'discard me' },
        ],
      }));
    });
    act(() => result.current.handleSaveCharEdit());

    expect(onUpdateMemory).toHaveBeenCalledWith({
      ...memory,
      characters: [
        expect.objectContaining({
          id: 'char-1',
          name: 'Mei',
          powerLevel: 'Nascent Soul',
          faction: 'Jade Court',
          signatureQuote: 'Never yield.',
          abilities: [{ id: 'valid', name: 'Starfall', description: 'A technique' }],
        }),
      ],
    });
    expect(result.current.editingCharId).toBeNull();
  });

  it('adds, updates, and removes abilities without mutating the source character', () => {
    const character = { id: 'char-1', name: 'Mei', abilities: [] } as any;
    const { result } = renderHook(() =>
      useCodexCharacterEditing({
        memory: { characters: [character] } as any,
        onUpdateMemory: vi.fn(),
      }),
    );

    act(() => result.current.beginCharEdit(character));
    act(() => result.current.addAbility());
    const addedId = result.current.editingCharData.abilitiesList?.[0].id as string;
    act(() => result.current.updateAbility(addedId, { name: 'Sword Intent' }));

    expect(result.current.editingCharData.abilitiesList?.[0].name).toBe('Sword Intent');
    expect(character.abilities).toEqual([]);

    act(() => result.current.removeAbility(addedId));
    expect(result.current.editingCharData.abilitiesList).toEqual([]);
  });

  it('does not write memory when no character is being edited', () => {
    const onUpdateMemory = vi.fn();
    const { result } = renderHook(() =>
      useCodexCharacterEditing({ memory: { characters: [] } as any, onUpdateMemory }),
    );

    act(() => result.current.handleSaveCharEdit());

    expect(onUpdateMemory).not.toHaveBeenCalled();
  });
});
