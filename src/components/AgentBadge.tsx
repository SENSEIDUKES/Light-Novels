import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AgentProfile } from '../lib/agents';

interface AgentBadgeProps {
  agent: AgentProfile;
  task?: string;
  isWorking?: boolean;
}

export const AgentBadge: React.FC<AgentBadgeProps> = ({ agent, task, isWorking = true }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 max-w-sm w-full mx-auto">
      {/* Agent Character with animations */}
      <div className="relative flex items-center justify-center w-40 h-40 mt-4 mb-2">
        <AnimatePresence>
          {isWorking && (
            <>
              {/* Aura pulse */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [0, 0.4, 0], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className={`absolute inset-[-20%] rounded-full blur-2xl ${
                  agent.id === 'versa' ? 'bg-human/20' : 'bg-portal/20'
                }`}
              />
              {/* Orbiting rings */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                className={`absolute inset-0 rounded-full border border-dashed opacity-30 ${
                  agent.id === 'versa' ? 'border-human/50' : 'border-portal/50'
                }`}
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                className={`absolute inset-4 rounded-full border border-dotted opacity-20 ${
                  agent.id === 'versa' ? 'border-human/40' : 'border-portal/40'
                }`}
              />
            </>
          )}
        </AnimatePresence>
        
        {/* Character Art */}
        <motion.div 
          className="relative z-10 w-full h-full flex items-center justify-center"
          animate={isWorking ? { y: [0, -6, 0] } : {}}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <img 
            src={agent.logoUrl} 
            alt={agent.name} 
            className="w-full h-full object-contain"
            style={agent.id === 'versa' ? { filter: 'drop-shadow(0 0 15px rgba(139, 0, 0, 0.4))' } : { filter: 'drop-shadow(0 0 15px rgba(4, 172, 255, 0.4))' }}
          />
        </motion.div>
      </div>

      <div className="text-center flex flex-col items-center bg-neutral-950/80 border border-neutral-800 rounded-lg p-3 shadow-lg w-full">
        <div className="flex items-center space-x-2 mb-1">
          <span className={`font-display font-bold text-sm tracking-wide ${agent.colorClass}`}>
            {agent.name}
          </span>
          <span className="font-sc text-[9px] uppercase tracking-widest text-neutral-500">
            {agent.title}
          </span>
        </div>
        
        <div className="min-h-[20px]">
          <AnimatePresence mode="wait">
            {task ? (
              <motion.p
                key={task}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="font-sans text-xs text-neutral-300 leading-snug"
              >
                {task}
              </motion.p>
            ) : (
              <motion.p
                key="role"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="font-sans text-[10px] text-neutral-500 leading-snug"
              >
                {agent.role}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
