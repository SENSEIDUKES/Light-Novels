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
      description: '  An old description.  ',
      powerLevel: 'Core Formation',
      aliases: ['Sister Mei'],
      contextPriority: 3,
      authorContextNote: 'Speaks formally.',
      pinned: true,
      priority: 12,
      contextNote: 'Abandoned note',
      provenance: { sourceChapterNumber: 1, createdBy: 'chapter-analysis', isUserPinned: true },
      abilities: [
        'Moon Step',
        {
          id: 'ability-2',
          name: 'Flame',
          description: 'Hot',
          aliases: ['Red Fire'],
          pinned: true,
          provenance: { sourceChapterNumber: 2, isUserPinned: true },
        },
      ],
    } as any;
    const memory = { characters: [character], factions: [{ id: 'faction-1' }] } as any;
    const onUpdateMemory = vi.fn();
    const { result } = renderHook(() =>
      useCodexCharacterEditing({ memory, onUpdateMemory }),
    );

    act(() => result.current.beginCharEdit(character));

    expect(result.current.editingCharData.abilitiesList).toEqual([
      expect.objectContaining({ name: 'Moon Step', description: '' }),
      expect.objectContaining({
        id: 'ability-2',
        name: 'Flame',
        description: 'Hot',
        aliases: ['Red Fire'],
        provenance: { sourceChapterNumber: 2, isUserPinned: true },
      }),
    ]);
    expect(result.current.editingCharData).toMatchObject({
      aliases: ['Sister Mei'],
      contextPriority: 3,
      authorContextNote: 'Speaks formally.',
      description: '  An old description.  ',
      provenance: { sourceChapterNumber: 1, createdBy: 'chapter-analysis', isUserPinned: true },
    });

    act(() => {
      result.current.setEditingCharData((current) => ({
        ...current,
        powerLevel: '  Nascent Soul  ',
        faction: '  Jade Court  ',
        signatureQuote: '  Never yield.  ',
        description: '  A revised description.  ',
        aliases: [' Sister Mei ', 'sister mei', ' The Pavilion Mistress ', ''],
        contextPriority: 8,
        authorContextNote: '  Never uses contractions.  ',
        provenance: { ...current.provenance, isUserPinned: false },
        abilitiesList: [
          {
            id: 'valid',
            name: '  Starfall  ',
            description: 'A technique',
            aliases: [' Falling Star ', 'falling star'],
            contextPriority: 0,
            authorContextNote: '  Cannot be used underground.  ',
            provenance: { sourceChapterNumber: 4, createdBy: 'chapter-analysis', isUserPinned: true },
          },
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
          description: 'A revised description.',
          powerLevel: 'Nascent Soul',
          faction: 'Jade Court',
          signatureQuote: 'Never yield.',
          aliases: ['Sister Mei', 'The Pavilion Mistress'],
          contextPriority: 8,
          authorContextNote: 'Never uses contractions.',
          provenance: {
            sourceChapterNumber: 1,
            createdBy: 'chapter-analysis',
          },
          abilities: [expect.objectContaining({
            id: 'valid',
            name: 'Starfall',
            description: 'A technique',
            aliases: ['Falling Star'],
            contextPriority: 0,
            authorContextNote: 'Cannot be used underground.',
            provenance: {
              sourceChapterNumber: 4,
              createdBy: 'chapter-analysis',
              isUserPinned: true,
            },
          })],
        }),
      ],
    });
    const savedCharacter = onUpdateMemory.mock.calls[0][0].characters[0];
    expect(savedCharacter).not.toHaveProperty('pinned');
    expect(savedCharacter).not.toHaveProperty('priority');
    expect(savedCharacter).not.toHaveProperty('contextNote');
    expect(savedCharacter.abilities[0]).not.toHaveProperty('pinned');
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

  it('blocks character and ability alias collisions before persistence', () => {
    const character = {
      id: 'char-1',
      name: 'Mei Lian',
      aliases: [],
      abilities: [
        { id: 'ability-1', name: 'Moon Step', description: '', aliases: ['Silent Step'] },
        { id: 'ability-2', name: 'Cloud Step', description: '', aliases: [] },
      ],
    } as any;
    const memory = {
      characters: [
        character,
        { id: 'char-2', name: 'Lan Wei', aliases: ['Pavilion Mistress'] },
      ],
    } as any;
    const onUpdateMemory = vi.fn();
    const { result } = renderHook(() =>
      useCodexCharacterEditing({ memory, onUpdateMemory }),
    );

    act(() => result.current.beginCharEdit(character));
    act(() => {
      result.current.setEditingCharData(current => ({
        ...current,
        aliases: ['Pavilion Mistress'],
        abilitiesList: current.abilitiesList?.map(ability => (
          ability.id === 'ability-2'
            ? { ...ability, aliases: ['Silent Step'] }
            : ability
        )),
      }));
    });

    expect(result.current.aliasCollisions).toEqual(expect.arrayContaining([
      expect.objectContaining({ alias: 'Pavilion Mistress', ownerName: 'Mei Lian' }),
      expect.objectContaining({ alias: 'Silent Step', ownerName: 'Cloud Step' }),
    ]));

    act(() => result.current.handleSaveCharEdit());
    expect(onUpdateMemory).not.toHaveBeenCalled();
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
