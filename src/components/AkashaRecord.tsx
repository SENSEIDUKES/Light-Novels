import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StoryMemory } from '../types';
import {
  RealmPanel,
  CharactersPanel,
  LawsPanel,
  ThreadsPanel
} from './akasha';

interface AkashaRecordProps {
  memory: StoryMemory;
  onUpdateMemory: (updatedMemory: StoryMemory) => void;
}

export default function AkashaRecord({ memory, onUpdateMemory }: AkashaRecordProps) {
  const [activeTab, setActiveTab] = useState<'status' | 'characters' | 'laws' | 'threads'>('status');

  const [deletePrompt, setDeletePrompt] = useState<{
    id: string | number;
    type: 'character' | 'law' | 'thread';
    name?: string;
  } | null>(null);
  const [deleteInput, setDeleteInput] = useState('');

  const handleDeleteChar = (id: string) => {
    const chars = memory.characters.filter(c => c.id !== id);
    onUpdateMemory({ ...memory, characters: chars });
  };

  const handleDeleteLaw = (index: number) => {
    const rules = memory.worldRules.filter((_, idx) => idx !== index);
    onUpdateMemory({ ...memory, worldRules: rules });
  };

  const handleDeleteResolvedThread = (index: number) => {
    const resolved = (memory.resolvedPlotThreads || []).filter((_, idx) => idx !== index);
    onUpdateMemory({ ...memory, resolvedPlotThreads: resolved });
  };

  const isTabHidden = (tab: typeof activeTab) => activeTab !== tab;

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
          type="button"
          onClick={() => setActiveTab('status')}
          className={`py-1.5 text-center text-xs rounded transition-all font-sc uppercase tracking-wider ${
            activeTab === 'status' ? 'bg-void text-portal font-semibold shadow-sm' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          Realm
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('characters')}
          className={`py-1.5 text-center text-xs rounded transition-all font-sc uppercase tracking-wider ${
            activeTab === 'characters' ? 'bg-void text-portal font-semibold shadow-sm' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          Daoists
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('laws')}
          className={`py-1.5 text-center text-xs rounded transition-all font-sc uppercase tracking-wider ${
            activeTab === 'laws' ? 'bg-void text-portal font-semibold shadow-sm' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          Laws
        </button>
        <button
          type="button"
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
        <div hidden={isTabHidden('status')}>
          <RealmPanel memory={memory} />
        </div>
        <div hidden={isTabHidden('characters')}>
          <CharactersPanel memory={memory} onUpdateMemory={onUpdateMemory} setDeletePrompt={setDeletePrompt} />
        </div>
        <div hidden={isTabHidden('laws')}>
          <LawsPanel memory={memory} onUpdateMemory={onUpdateMemory} setDeletePrompt={setDeletePrompt} />
        </div>
        <div hidden={isTabHidden('threads')}>
          <ThreadsPanel memory={memory} onUpdateMemory={onUpdateMemory} setDeletePrompt={setDeletePrompt} />
        </div>
      </div>
      
      <AnimatePresence>
        {deletePrompt && (
          <motion.div
            key="akasha-delete-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
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
                <label className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono block mb-2" htmlFor="a11y-control-yjtvc74">
                  Type <span className="text-red-400 font-bold">DELETE</span> to confirm{' '}
                  <button
                    type="button"
                    onClick={() => setDeleteInput('DELETE')}
                    className="ml-2 inline-flex items-center px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-sc font-bold border border-portal/30 bg-portal/10 text-portal hover:bg-portal hover:text-black rounded transition-all duration-300 cursor-pointer"
                    title="Auto-fill delete text"
                  >
                    Auto-Fill
                  </button>
                </label>
                <input
                  type="text"
                  placeholder="DELETE"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  className="w-full bg-void text-xs text-signal border border-neutral-700 focus:border-red-500 p-2 rounded focus:outline-none font-mono placeholder:text-neutral-700" id="a11y-control-yjtvc74"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setDeletePrompt(null);
                    setDeleteInput('');
                  }}
                  className="px-4 py-2 bg-void border border-neutral-700 text-neutral-300 rounded font-sc text-xs hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
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
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
