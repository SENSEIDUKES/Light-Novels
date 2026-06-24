import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export type FormSectionId = 'core' | 'world' | 'mc' | 'characters' | 'factions' | 'power' | 'plot' | 'makeitwork';

export interface FormSectionProps {
  id: FormSectionId;
  title: string;
  icon: React.ReactNode;
  activeSection: FormSectionId;
  setActiveSection: (id: FormSectionId) => void;
  children: React.ReactNode;
}

export const FormSection = ({ id, title, icon, activeSection, setActiveSection, children }: FormSectionProps) => {
  const isActive = activeSection === id;
  return (
    <div className="border border-neutral-900 rounded-lg overflow-hidden bg-void transition-colors mb-4">
      <button
        type="button"
        onClick={() => setActiveSection(id)}
        aria-expanded={isActive}
        className={`w-full flex items-center justify-between p-4 px-6 text-left transition-colors ${isActive ? 'bg-neutral-900/50 text-signal border-b border-neutral-900' : 'bg-void text-neutral-400 hover:bg-neutral-950 hover:text-neutral-200'}`}
      >
        <div className="flex items-center space-x-3">
          <span className={isActive ? 'text-portal' : 'text-neutral-500'}>{icon}</span>
          <span className="font-sc font-bold uppercase tracking-widest text-sm">{title}</span>
        </div>
        {isActive ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-6 space-y-6"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
