import { useState } from 'react';
import { Character, StoryMemory } from '../types';

interface UseCodexCharacterEditingOptions {
  memory: StoryMemory;
  onUpdateMemory: (memory: StoryMemory) => void;
}

type EditingCharData = Partial<Character> & { abilitiesInput?: string };

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
            abilities: editingCharData.abilitiesInput?.trim()
              ? editingCharData.abilitiesInput.split(',').map((a: string) => a.trim()).filter(Boolean)
              : undefined,
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
    setEditingCharData({
      powerLevel: char.powerLevel || '',
      faction: char.faction || '',
      signatureQuote: char.signatureQuote || '',
      abilitiesInput: char.abilities ? char.abilities.map(a => typeof a === 'string' ? a : a.description || a.name).join(', ') : '',
      status: char.status || 'unknown',
    });
  };

  return {
    editingCharId,
    setEditingCharId,
    editingCharData,
    setEditingCharData,
    handleSaveCharEdit,
    beginCharEdit,
  };
}
