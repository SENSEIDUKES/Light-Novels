import { useState } from 'react';
import { Character, StoryMemory, Ability } from '../types';
import { generateId } from '../lib/id';

interface UseCodexCharacterEditingOptions {
  memory: StoryMemory;
  onUpdateMemory: (memory: StoryMemory) => void;
}

type EditingCharData = Partial<Character> & { abilitiesList?: Ability[] };

export function useCodexCharacterEditing({ memory, onUpdateMemory }: UseCodexCharacterEditingOptions) {
  const [editingCharId, setEditingCharId] = useState<string | null>(null);
  const [editingCharData, setEditingCharData] = useState<EditingCharData>({});

  const handleSaveCharEdit = () => {
    if (editingCharId) {
      const updated = (memory.characters || []).map(char => {
        if (char.id === editingCharId) {
          return {
            ...char,
            powerLevel: editingCharData.powerLevel?.trim() || undefined,
            faction: editingCharData.faction?.trim() || undefined,
            signatureQuote: editingCharData.signatureQuote?.trim() || undefined,
            status: editingCharData.status || char.status || 'unknown',
            abilities: (() => {
              const validAbilities = editingCharData.abilitiesList
                ?.map(a => ({ ...a, name: a.name.trim() }))
                .filter(a => a.name);
              return validAbilities && validAbilities.length > 0 ? validAbilities : undefined;
            })(),
          };
        }
        return char;
      });
      onUpdateMemory({ ...memory, characters: updated });
      setEditingCharId(null);
    }
  };

  const beginCharEdit = (char: Character) => {
    setEditingCharId(char.id);
    
    const normalizedAbilities: Ability[] = (char.abilities || []).map((a, index) => {
      if (typeof a === 'string') {
        return {
          id: "ability-" + generateId(7) + "-" + index,
          name: a,
          description: '',
        };
      }
      return a;
    });

    setEditingCharData({
      powerLevel: char.powerLevel || '',
      faction: char.faction || '',
      signatureQuote: char.signatureQuote || '',
      abilitiesList: normalizedAbilities,
      status: char.status || 'unknown',
    });
  };

  const addAbility = () => {
    setEditingCharData((prev) => ({
      ...prev,
      abilitiesList: [
        ...(prev.abilitiesList || []),
        { id: "ability-" + generateId(7), name: '', description: '' }
      ]
    }));
  };

  const updateAbility = (id: string, updates: Partial<Ability>) => {
    setEditingCharData((prev) => ({
      ...prev,
      abilitiesList: (prev.abilitiesList || []).map(a => 
        a.id === id ? { ...a, ...updates } : a
      )
    }));
  };

  const removeAbility = (id: string) => {
    setEditingCharData((prev) => ({
      ...prev,
      abilitiesList: (prev.abilitiesList || []).filter(a => a.id !== id)
    }));
  };

  return {
    editingCharId,
    setEditingCharId,
    editingCharData,
    setEditingCharData,
    handleSaveCharEdit,
    beginCharEdit,
    addAbility,
    updateAbility,
    removeAbility,
  };
}
