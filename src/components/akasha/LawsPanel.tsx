import React, { useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { StoryMemory } from '../../types';

interface LawsPanelProps {
  memory: StoryMemory;
  onUpdateMemory: (updatedMemory: StoryMemory) => void;
  setDeletePrompt: React.Dispatch<React.SetStateAction<{ id: string | number; type: 'character' | 'law' | 'thread'; name?: string; } | null>>;
}

export const LawsPanel: React.FC<LawsPanelProps> = ({ memory, onUpdateMemory, setDeletePrompt }) => {
  const [newLaw, setNewLaw] = useState('');
  const [showAddLaw, setShowAddLaw] = useState(false);

  const handleCreateLaw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLaw.trim()) return;
    onUpdateMemory({
      ...memory,
      worldRules: [...memory.worldRules, newLaw.trim()]
    });
    setNewLaw('');
    setShowAddLaw(false);
  };

  return (
    <div className="space-y-4 animate-fadeIn" id="laws-panel">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-sc">
          Immutable World Precepts ({memory.worldRules.length})
        </span>
        <button
          type="button"
          onClick={() => setShowAddLaw(!showAddLaw)}
          className="text-xs text-portal hover:text-signal transition-colors flex items-center space-x-1"
        >
          <UserPlus size={12} />
          <span>Add Law</span>
        </button>
      </div>

      {showAddLaw && (
        <form onSubmit={handleCreateLaw} className="p-3 bg-neutral-900 rounded border border-neutral-850 space-y-2">
          <input
            type="text"
            placeholder="e.g., Demonic arts rot the mortal soul but grant fast progression."
            value={newLaw}
            onChange={(e) => setNewLaw(e.target.value)}
            className="bg-void border border-neutral-800 text-signal rounded p-2 w-full text-xs"
            required
          />
          <div className="flex justify-end space-x-2 pt-1 text-xs">
            <button
              type="button"
              onClick={() => setShowAddLaw(false)}
              className="text-neutral-500 hover:text-neutral-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-human text-signal px-3 py-1 rounded hover:bg-human/80 transition-all font-semibold"
            >
              Assert Precept
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {memory.worldRules.length === 0 ? (
          <p className="text-xs text-neutral-600 text-center py-4 italic">No physical laws defined.</p>
        ) : (
          memory.worldRules.map((rule, idx) => (
            <div key={idx} className="flex items-start justify-between gap-3 p-3 bg-void/50 border border-neutral-900 rounded text-xs text-neutral-300 leading-normal group">
              <div className="flex items-start">
                <span className="font-mono text-portal text-xs mr-2 mt-0.5">#{idx + 1}</span>
                <p className="font-serif italic">{typeof rule === 'object' ? JSON.stringify(rule) : String(rule)}</p>
              </div>
              <button
                type="button"
                onClick={() => setDeletePrompt({ id: idx, type: 'law' })}
                className="opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-red-500 transition-all"
                title="Erase Precept"
              >
                <X size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
