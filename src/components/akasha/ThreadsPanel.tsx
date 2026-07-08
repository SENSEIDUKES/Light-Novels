import React, { useState } from 'react';
import { UserPlus, Compass, CheckCircle2, X } from 'lucide-react';
import { StoryMemory } from '../../types';

interface ThreadsPanelProps {
  memory: StoryMemory;
  onUpdateMemory: (updatedMemory: StoryMemory) => void;
  setDeletePrompt: React.Dispatch<React.SetStateAction<{ id: string | number; type: 'character' | 'law' | 'thread'; name?: string; } | null>>;
}

export const ThreadsPanel: React.FC<ThreadsPanelProps> = ({ memory, onUpdateMemory, setDeletePrompt }) => {
  const [newThread, setNewThread] = useState('');
  const [showAddThread, setShowAddThread] = useState(false);

  const handleCreateThread = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThread.trim()) return;
    onUpdateMemory({
      ...memory,
      unresolvedPlotThreads: [...memory.unresolvedPlotThreads, newThread.trim()]
    });
    setNewThread('');
    setShowAddThread(false);
  };

  const handleResolveThread = (index: number) => {
    const thread = memory.unresolvedPlotThreads[index];
    const unresolved = memory.unresolvedPlotThreads.filter((_, idx) => idx !== index);
    const resolved = [...(memory.resolvedPlotThreads || []), thread];
    onUpdateMemory({
      ...memory,
      unresolvedPlotThreads: unresolved,
      resolvedPlotThreads: resolved
    });
  };

  const handleUnresolveThread = (index: number) => {
    const thread = (memory.resolvedPlotThreads || [])[index];
    const resolved = (memory.resolvedPlotThreads || []).filter((_, idx) => idx !== index);
    const unresolved = [...memory.unresolvedPlotThreads, thread];
    onUpdateMemory({
      ...memory,
      unresolvedPlotThreads: unresolved,
      resolvedPlotThreads: resolved
    });
  };

  return (
    <div className="space-y-4 animate-fadeIn" id="karma-panel">
      {/* Unresolved */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-sc">
            Active Fates / Objectives ({memory.unresolvedPlotThreads.length})
          </span>
          <button
             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setShowAddThread(!showAddThread)}
            className="text-xs text-portal hover:text-signal transition-colors flex items-center space-x-1"
          >
            <UserPlus size={12} />
            <span>Bind Karma</span>
          </button>
        </div>

        {showAddThread && (
          <form onSubmit={handleCreateThread} className="p-3 bg-neutral-900 rounded border border-neutral-850 space-y-2 mb-3">
            <input
              type="text"
              placeholder="e.g. Uncover who ordered the blood attack on the family pavilion."
              value={newThread}
              onChange={(e) => setNewThread(e.target.value)}
              className="bg-void border border-neutral-800 text-signal rounded p-2 w-full text-xs"
              required
            />
            <div className="flex justify-end space-x-2 pt-1 text-xs">
              <button
                type="button"
                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setShowAddThread(false)}
                className="text-neutral-500 hover:text-neutral-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-human text-signal px-3 py-1 rounded hover:bg-opacity-80 transition-all font-semibold"
              >
                Tie Karma
              </button>
            </div>
          </form>
        )}

        <div className="space-y-1.5">
          {memory.unresolvedPlotThreads.length === 0 ? (
            <p className="text-xs text-neutral-600 text-center py-2 italic font-serif">All karma is clean. No open tasks.</p>
          ) : (
            memory.unresolvedPlotThreads.map((thread, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2 p-2.5 bg-void/50 border border-neutral-900 rounded text-xs text-neutral-300">
                <div className="flex items-center min-w-0 pr-1">
                  <Compass className="text-neutral-600 flex-shrink-0 mr-2" size={13} />
                  <span className="truncate" title={typeof thread === 'object' ? JSON.stringify(thread.provenance, null, 2) : ''}>{typeof thread === 'object' && 'description' in thread ? thread.description : String(thread)}</span>
                </div>
                <button
                   tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => handleResolveThread(idx)}
                  className="text-[10px] text-green-400 bg-green-950/20 px-1.5 py-0.5 rounded hover:bg-green-950/60 border border-green-900/40 flex-shrink-0 transition-all uppercase tracking-wider font-semibold"
                  title="Cut Karma / Achieve"
                >
                  Resolve
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Resolved */}
      <div className="pt-2 border-t border-neutral-900">
        <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-sc block mb-2">
          Severed Karma / Accomplished Feats ({(memory.resolvedPlotThreads || []).length})
        </span>
        <div className="space-y-1.5">
          {(memory.resolvedPlotThreads || []).length === 0 ? (
            <p className="text-xs text-neutral-700 text-center py-2 italic font-serif">No achievements logged in this arc.</p>
          ) : (
            (memory.resolvedPlotThreads || []).map((thread, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2 p-2 bg-neutral-950 border border-neutral-950 text-neutral-500 rounded text-xs group">
                <div className="flex items-center min-w-0 pr-1">
                  <CheckCircle2 className="text-green-800 flex-shrink-0 mr-2" size={13} />
                  <span className="line-through truncate italic" title={typeof thread === 'object' ? JSON.stringify(thread.provenance, null, 2) : ''}>{typeof thread === 'object' && 'description' in thread ? thread.description : String(thread)}</span>
                </div>
                <div className="flex items-center space-x-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                     tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => handleUnresolveThread(idx)}
                    className="text-[9px] text-portal hover:underline uppercase tracking-wider"
                    title="Reopen Threat"
                  >
                    Reopen
                  </button>
                  <button
                    onClick={() => setDeletePrompt({ id: idx, type: 'thread' })}
                    className="text-neutral-600 hover:text-red-500 p-0.5"
                  >
                    <X size={10} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
