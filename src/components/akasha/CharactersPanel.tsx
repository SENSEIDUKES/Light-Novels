import React, { useState } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import { StoryMemory, Character } from '../../types';

interface CharactersPanelProps {
  memory: StoryMemory;
  onUpdateMemory: (updatedMemory: StoryMemory) => void;
  setDeletePrompt: React.Dispatch<React.SetStateAction<{ id: string | number; type: 'character' | 'law' | 'thread'; name?: string; } | null>>;
}

export const CharactersPanel: React.FC<CharactersPanelProps> = ({ memory, onUpdateMemory, setDeletePrompt }) => {
  const [showAddChar, setShowAddChar] = useState(false);
  const [newChar, setNewChar] = useState({
    name: '',
    role: '',
    description: '',
    relationshipToMC: '',
    status: 'alive' as Character['status']
  });

  const handleCreateChar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChar.name.trim() || !newChar.role.trim()) return;

    const chars = [...memory.characters];
    chars.push({
      id: `char-${Date.now()}`,
      name: newChar.name.trim(),
      role: newChar.role.trim(),
      description: newChar.description.trim(),
      relationshipToMC: newChar.relationshipToMC.trim() || 'Neutral',
      status: newChar.status
    });

    onUpdateMemory({
      ...memory,
      characters: chars
    });

    setNewChar({ name: '', role: '', description: '', relationshipToMC: '', status: 'alive' });
    setShowAddChar(false);
  };

  const handleToggleCharStatus = (charName: string) => {
    const chars = memory.characters.map(c => {
      if (c.name === charName) {
        const nextStatus: Character['status'] = c.status === 'alive' ? 'deceased' : 'alive';
        return { ...c, status: nextStatus };
      }
      return c;
    });
    onUpdateMemory({ ...memory, characters: chars });
  };

  return (
    <div className="space-y-4 animate-fadeIn" id="characters-panel">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-sc">
          Encountered Living Spirits ({memory.characters.length})
        </span>
        <button
           tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setShowAddChar(!showAddChar)}
          className="text-xs text-portal hover:text-signal transition-colors flex items-center space-x-1"
        >
          <UserPlus size={12} />
          <span>Add Spirit</span>
        </button>
      </div>

      {showAddChar && (
        <form onSubmit={handleCreateChar} className="p-3 bg-neutral-900 rounded border border-neutral-850 space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Daoist Name"
              value={newChar.name}
              onChange={(e) => setNewChar({ ...newChar, name: e.target.value })}
              className="bg-void border border-neutral-800 text-signal rounded px-2 py-1.5 w-full text-xs"
              required
            />
            <input
              type="text"
              placeholder="Role (e.g. Master, Enemy)"
              value={newChar.role}
              onChange={(e) => setNewChar({ ...newChar, role: e.target.value })}
              className="bg-void border border-neutral-800 text-signal rounded px-2 py-1.5 w-full text-xs"
              required
            />
          </div>
          <input
            type="text"
            placeholder="Relationship Attitude (e.g. Hostility, Secret Alliance)"
            value={newChar.relationshipToMC}
            onChange={(e) => setNewChar({ ...newChar, relationshipToMC: e.target.value })}
            className="bg-void border border-neutral-800 text-signal rounded px-2 py-1.5 w-full text-xs"
          />
          <textarea
            placeholder="Brief Description or secret identities..."
            rows={2}
            value={newChar.description}
            onChange={(e) => setNewChar({ ...newChar, description: e.target.value })}
            className="bg-void border border-neutral-800 text-signal rounded p-2 w-full text-xs resize-none"
          />
          <div className="flex justify-between items-center pt-1">
            <button
              type="button"
               tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setShowAddChar(false)}
              className="text-neutral-500 hover:text-neutral-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-human text-signal px-3 py-1 rounded hover:bg-opacity-80 transition-all font-semibold"
            >
              Record Spirit
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {memory.characters.length === 0 ? (
          <p className="text-xs text-neutral-600 text-center py-4 italic">No secondary spirits met yet.</p>
        ) : (
          memory.characters.map((char) => (
            <div
              key={char.id || char.name}
              className={`p-3 rounded border bg-void/40 transition-all ${
                char.status === 'deceased' ? 'border-neutral-950/80 opacity-50' : 'border-neutral-900 hover:border-neutral-850'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`font-sans font-medium text-sm ${char.status === 'deceased' ? 'line-through text-neutral-500' : 'text-signal'}`}>
                      {char.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.25 bg-neutral-900 border border-neutral-800 text-neutral-400 rounded">
                      {char.role}
                    </span>
                  </div>
                  {char.relationshipToMC && (
                    <div className="text-[10px] text-human tracking-tight mt-0.5">
                      Attitude: {char.relationshipToMC}
                    </div>
                  )}
                  <p className="text-xs text-neutral-400 mt-1.5 leading-normal font-light">
                    {char.description}
                  </p>
                </div>
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <button
                    title={char.status === 'alive' ? "Click to set Deceased" : "Click to set Alive"}
                     tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => handleToggleCharStatus(char.name)}
                    className={`text-[9px] px-1 py-0.5 rounded ${
                      char.status === 'alive' ? 'bg-green-950/40 text-green-400 border border-green-900' : 'bg-red-950/40 text-red-500 border border-red-950'
                    }`}
                  >
                    {char.status.toUpperCase()}
                  </button>
                  <button
                    onClick={() => setDeletePrompt({ id: char.id, type: 'character', name: char.name })}
                    className="text-neutral-600 hover:text-red-500 p-0.5 transition-colors"
                    title="Purge Spirit"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
