import React, { useState } from 'react';
import { 
  BookOpen, Users, Compass, HelpCircle, 
  UserPlus, CheckCircle2, ChevronRight, X, Edit2, 
  Trash2, ShieldCheck, Award, Zap 
} from 'lucide-react';
import { StoryMemory, Character } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface AkashaRecordProps {
  memory: StoryMemory;
  onUpdateMemory: (updatedMemory: StoryMemory) => void;
}

export default function AkashaRecord({ memory, onUpdateMemory }: AkashaRecordProps) {
  const [activeTab, setActiveTab] = useState<'status' | 'characters' | 'laws' | 'threads'>('status');

  // States for adding / editing character
  const [showAddChar, setShowAddChar] = useState(false);
  const [newChar, setNewChar] = useState({
    name: '',
    role: '',
    description: '',
    relationshipToMC: '',
    status: 'alive' as Character['status']
  });

  // State for adding world laws
  const [newLaw, setNewLaw] = useState('');
  const [showAddLaw, setShowAddLaw] = useState(false);

  // State for adding plot thread
  const [newThread, setNewThread] = useState('');
  const [showAddThread, setShowAddThread] = useState(false);

  const [deletePrompt, setDeletePrompt] = useState<{
    id: string | number;
    type: 'character' | 'law' | 'thread';
    name?: string;
  } | null>(null);
  const [deleteInput, setDeleteInput] = useState('');

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

  const handleDeleteChar = (id: string) => {
    const chars = memory.characters.filter(c => c.id !== id);
    onUpdateMemory({ ...memory, characters: chars });
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

  const handleDeleteLaw = (index: number) => {
    const rules = memory.worldRules.filter((_, idx) => idx !== index);
    onUpdateMemory({ ...memory, worldRules: rules });
  };

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

  const handleDeleteResolvedThread = (index: number) => {
    const resolved = (memory.resolvedPlotThreads || []).filter((_, idx) => idx !== index);
    onUpdateMemory({ ...memory, resolvedPlotThreads: resolved });
  };

  return (
    <div className="bg-neutral-950 border border-neutral-900 rounded-lg p-5 flex flex-col h-full shadow-lg relative overflow-hidden" id="akasha-record-matrix">
      {/* Visual top bar of Portal aura */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-portal via-human to-void"></div>

      {/* Header */}
      <div className="mb-4">
        <h3 className="font-sc font-bold text-lg text-signal tracking-widest flex items-center space-x-2">
          <span>Akasha Narrative Record</span>
        </h3>
        <p className="text-xs text-neutral-500 font-sans tracking-tight mt-0.5">
          Evolving memory engine keeping total story cohesion.
        </p>
      </div>

      {/* Navigation tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-neutral-900/60 rounded mb-4" id="akasha-tab-row">
        <button
          onClick={() => setActiveTab('status')}
          className={`py-1.5 text-center text-xs rounded transition-all font-sc uppercase tracking-wider ${
            activeTab === 'status' ? 'bg-void text-portal font-semibold shadow-sm' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          Realm
        </button>
        <button
          onClick={() => setActiveTab('characters')}
          className={`py-1.5 text-center text-xs rounded transition-all font-sc uppercase tracking-wider ${
            activeTab === 'characters' ? 'bg-void text-portal font-semibold shadow-sm' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          Daoists
        </button>
        <button
          onClick={() => setActiveTab('laws')}
          className={`py-1.5 text-center text-xs rounded transition-all font-sc uppercase tracking-wider ${
            activeTab === 'laws' ? 'bg-void text-portal font-semibold shadow-sm' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          Laws
        </button>
        <button
          onClick={() => setActiveTab('threads')}
          className={`py-1.5 text-center text-xs rounded transition-all font-sc uppercase tracking-wider ${
            activeTab === 'threads' ? 'bg-void text-portal font-semibold shadow-sm' : 'text-neutral-300 hover:text-neutral-300'
          }`}
        >
          Karma
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto max-h-[460px] pr-1 space-y-4 font-sans tab-container">
        {/* TAB 1: Realm / Cultivation Power System */}
        {activeTab === 'status' && (
          <div className="space-y-4 animate-fadeIn" id="realm-panel">
            <div className="p-4 bg-void border border-neutral-900 rounded flex items-center justify-between">
              <div>
                <span className="text-[10px] text-portal uppercase font-bold tracking-wider block font-sc">Current Ascension Rank</span>
                <span className="text-lg font-display text-signal font-bold mt-0.5 block">{memory.currentPowerStage}</span>
              </div>
              <div className="p-3 bg-portal/5 rounded-full border border-portal/15 text-portal">
                <Zap size={22} className="animate-pulse" />
              </div>
            </div>

            <div className="p-4 bg-void/50 border border-neutral-900 rounded">
              <span className="text-[10px] text-neutral-400 uppercase font-sc tracking-widest block mb-2">Universe Power Tiers</span>
              <p className="text-xs text-neutral-300 leading-relaxed font-serif italic">
                {memory.powerSystem || "No power parameters set in this sphere."}
              </p>
            </div>

            <div className="p-4 bg-neutral-950 border border-neutral-900 rounded space-y-2">
              <span className="text-[10px] text-human uppercase font-bold tracking-widest block font-sc">System Alignment Status</span>
              <div className="flex items-center space-x-2 text-xs text-neutral-400">
                <ShieldCheck size={14} className="text-green-500" />
                <span>Memory Consistency: Standard</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-neutral-400">
                <Award size={14} className="text-portal" />
                <span>Story Resonance Node Activated</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Characters */}
        {activeTab === 'characters' && (
          <div className="space-y-4 animate-fadeIn" id="characters-panel">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-sc">
                Encountered Living Spirits ({memory.characters.length})
              </span>
              <button
                onClick={() => setShowAddChar(!showAddChar)}
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
                    onClick={() => setShowAddChar(false)}
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
                          onClick={() => handleToggleCharStatus(char.name)}
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
        )}

        {/* TAB 3: World Laws */}
        {activeTab === 'laws' && (
          <div className="space-y-4 animate-fadeIn" id="laws-panel">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-sc">
                Immutable World Precepts ({memory.worldRules.length})
              </span>
              <button
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
                    className="bg-human text-signal px-3 py-1 rounded hover:bg-opacity-80 transition-all font-semibold"
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
                      onClick={() => setDeletePrompt({ id: idx, type: 'law' })}
                      className="text-neutral-700 hover:text-red-500 flex-shrink-0 transition-colors opacity-0 group-hover:opacity-100"
                      title="Shatter Law"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: Plot Threads (Karma) */}
        {activeTab === 'threads' && (
          <div className="space-y-4 animate-fadeIn" id="karma-panel">
            {/* Unresolved */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-human uppercase tracking-widest font-sc font-semibold">
                  Open Karma Bonds / Plots ({memory.unresolvedPlotThreads.length})
                </span>
                <button
                  onClick={() => setShowAddThread(!showAddThread)}
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
                      onClick={() => setShowAddThread(false)}
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
                        onClick={() => handleResolveThread(idx)}
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
                          onClick={() => handleUnresolveThread(idx)}
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
        )}
      </div>
      
      <AnimatePresence>
        {deletePrompt && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-red-900/50 rounded-lg p-6 max-w-sm w-full mx-4 shadow-2xl relative"
            >
              <h3 className="text-xl font-display font-bold text-signal mb-2">Delete {deletePrompt.type}?</h3>
              <p className="text-sm text-neutral-400 mb-4 font-serif">
                You can no longer see this fate or undo this karma severing.
                {deletePrompt.name && <span className="block mt-2 font-mono text-xs text-red-300 mx-1">{deletePrompt.name}</span>}
              </p>
              
              <div className="mb-6">
                <label className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono block mb-2">
                  Type <span className="text-red-400 font-bold">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  placeholder="DELETE"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  className="w-full bg-void text-xs text-signal border border-neutral-700 focus:border-red-500 p-2 rounded focus:outline-none font-mono placeholder:text-neutral-700"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setDeletePrompt(null);
                    setDeleteInput('');
                  }}
                  className="px-4 py-2 bg-void border border-neutral-700 text-neutral-300 rounded font-sc text-xs hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={deleteInput !== 'DELETE'}
                  onClick={() => {
                    if (deleteInput === 'DELETE') {
                      if (deletePrompt.type === 'character') handleDeleteChar(deletePrompt.id as string);
                      if (deletePrompt.type === 'law') handleDeleteLaw(deletePrompt.id as number);
                      if (deletePrompt.type === 'thread') handleDeleteResolvedThread(deletePrompt.id as number);
                      
                      setDeletePrompt(null);
                      setDeleteInput('');
                    }
                  }}
                  className={`px-4 py-2 bg-red-900 border border-red-700 text-white rounded font-sc font-bold text-xs transition-colors ${deleteInput === 'DELETE' ? 'hover:bg-red-800' : 'opacity-50 cursor-not-allowed'}`}
                >
                  Sever Karma
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
