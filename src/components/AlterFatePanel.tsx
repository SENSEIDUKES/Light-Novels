import React, { useState } from 'react';
import FocusLock from 'react-focus-lock';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, GitBranch, ShieldAlert, ArrowRight, X } from 'lucide-react';

interface AlterFatePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmFork: (direction: string, customPrompt: string) => void;
  chapterNumber: number;
}

const FORK_TEMPLATES = [
  {
    id: 'alter-scene',
    title: 'Alter the next scene',
    description: 'Change the immediate upcoming event.',
    examples: ['"Make him humiliate the elder publicly."', '"Spare the rival."']
  },
  {
    id: 'path-direction',
    title: 'Choose a path direction',
    description: 'Pivot the long-term genre or storyline focus.',
    examples: ['"Revenge path"', '"Tournament arc path"', '"Clan politics path"']
  },
  {
    id: 'interrupt-trope',
    title: 'Interrupt a trope',
    description: 'Break expected conventions.',
    examples: ['"Don\'t let the arrogant young master escape."', '"Turn the jade beauty into a rival."']
  }
];

export const AlterFatePanel: React.FC<AlterFatePanelProps> = ({ isOpen, onClose, onConfirmFork, chapterNumber }) => {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');

  return (
    <AnimatePresence>
      {isOpen && (
        <FocusLock>
        <motion.div
          key="alter-fate-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-void border border-portal/30 rounded-xl shadow-[0_0_40px_rgba(4,172,255,0.15)] overflow-hidden max-w-2xl w-full flex flex-col"
          >
          <div className="p-6 border-b border-neutral-900 bg-neutral-950 flex justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-portal/10 blur-3xl rounded-full"></div>
            <div>
              <h2 className="text-xl font-display font-medium text-signal tracking-wide flex items-center gap-2">
                <GitBranch className="text-portal" size={20} />
                Alter Fate (Timeline Fork)
              </h2>
              <p className="text-xs text-neutral-400 mt-1 font-sans">
                Branch reality from <strong className="text-portal">Chapter {chapterNumber}</strong>. The Karma, Codex, and all future chapters will respect this divergence.
              </p>
            </div>
            <button  tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={onClose} className="p-2 text-neutral-400 hover:text-signal rounded border border-neutral-800 hover:bg-neutral-900 transition-colors z-10">
              <X size={16} />
            </button>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh] bg-[#0a0a0a]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {FORK_TEMPLATES.map(t => {
                const isSelected = selectedTemplate === t.id;
                return (
                  <button
                    key={t.id}
                     tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                      setSelectedTemplate(t.id);
                      setCustomPrompt(t.examples[0].replace(/"/g, ''));
                    }}
                    className={`text-left p-4 rounded border transition-all ${
                      isSelected 
                        ? 'bg-portal/10 border-portal shadow-[0_0_15px_rgba(4,172,255,0.2)] text-signal' 
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-portal/50'
                    }`}
                  >
                    <h3 className={`font-sc text-[11px] uppercase tracking-wider font-bold mb-2 ${isSelected ? 'text-portal' : 'text-neutral-500'}`}>
                      {t.title}
                    </h3>
                    <p className="text-[10px] font-sans text-neutral-400 mb-2">{t.description}</p>
                    <div className="space-y-1">
                      {t.examples.map((ex, i) => (
                        <div key={i} className="text-[9px] font-mono opacity-60 truncate">{ex}</div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-sc tracking-widest text-neutral-400 font-bold" htmlFor="a11y-control-${labelCounter}">
                Divine Command (Prompt)
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Declare the new destiny parameter. E.g. 'Turn the jade beauty into a rival instead of a love interest.'"
                className="w-full h-24 bg-neutral-950 border border-neutral-800 focus:border-portal focus:ring-1 focus:ring-portal text-signal text-xs p-3 rounded resize-none" id="a11y-control-${labelCounter}"
              />
            </div>
          </div>

          <div className="p-5 border-t border-neutral-900 bg-neutral-950 flex justify-between items-center">
            <div className="text-[10px] text-neutral-500 flex items-center gap-1.5 max-w-[200px]">
              <ShieldAlert size={12} className="text-portal shrink-0" />
              <span>This creates a new linked copy in your library, preserving the original timeline.</span>
            </div>
            <button
               tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => onConfirmFork(selectedTemplate || 'alter-scene', customPrompt)}
              disabled={!customPrompt.trim()}
              className="px-6 py-2 bg-void border border-portal text-portal font-sc font-bold uppercase tracking-wider text-xs rounded hover:bg-portal hover:text-void transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_15px_rgba(4,172,255,0.2)]"
            >
              <span>Sundert The Timeline</span>
              <Sparkles size={14} />
            </button>
          </div>
        </motion.div>
        </motion.div>
        </FocusLock>
      )}
    </AnimatePresence>
  );
};
