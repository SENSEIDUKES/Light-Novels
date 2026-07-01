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
    <div className={`border rounded-lg overflow-hidden transition-all duration-300 mb-6 ${isActive ? 'bg-neutral-950/40 border-neutral-800 shadow-[0_0_30px_rgba(0,0,0,0.5)]' : 'bg-void border-neutral-900/50 opacity-70 hover:opacity-100 hover:border-neutral-800'}`}>
      <button
        type="button"
         tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setActiveSection(id)}
        aria-expanded={isActive}
        className={`w-full flex items-center justify-between p-5 px-6 text-left transition-colors ${isActive ? 'bg-neutral-900/30 text-signal border-b border-neutral-800' : 'bg-transparent text-neutral-400 hover:text-neutral-200'}`}
      >
        <div className="flex items-center space-x-4">
          <div className={`p-2 rounded-md ${isActive ? 'bg-portal/10 text-portal' : 'bg-neutral-900/50 text-neutral-500'}`}>
            {icon}
          </div>
          <span className={`font-sc font-bold uppercase tracking-widest text-sm ${isActive ? 'text-signal' : 'text-neutral-400'}`}>{title}</span>
        </div>
        <div className={`p-1.5 rounded-full ${isActive ? 'bg-neutral-800/50 text-neutral-300' : 'text-neutral-600'}`}>
          {isActive ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-6 sm:p-8 space-y-8"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
