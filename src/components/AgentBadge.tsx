import React from 'react';
import { motion } from 'motion/react';
import { AgentProfile } from '../lib/agents';

interface AgentBadgeProps {
  agent: AgentProfile;
  task?: string;
  isWorking?: boolean;
}

export const AgentBadge: React.FC<AgentBadgeProps> = ({ agent, task, isWorking = true }) => {
  return (
    <div className="flex items-center space-x-3 bg-neutral-950/80 border border-neutral-800 rounded-lg p-3 shadow-lg max-w-sm w-full mx-auto">
      <div className="relative shrink-0 w-12 h-12 flex items-center justify-center">
        {isWorking && (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
              className={`absolute inset-0 rounded-full border border-dashed opacity-50 ${
                agent.id === 'versa' ? 'border-human/60 border-t-human scale-110' : 'border-portal/60 border-t-portal scale-110'
              }`}
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
              className={`absolute inset-1 rounded-full border border-dotted opacity-50 ${
                agent.id === 'versa' ? 'border-human/40 border-b-human' : 'border-portal/40 border-b-portal'
              }`}
            />
          </>
        )}
        <img 
          src={agent.logoUrl} 
          alt={agent.name} 
          className="w-8 h-8 object-contain rounded-full relative z-10" 
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-end space-x-2 mb-0.5">
          <span className={`font-display font-bold text-sm tracking-wide ${agent.colorClass}`}>
            {agent.name}
          </span>
          <span className="font-sc text-[9px] uppercase tracking-widest text-neutral-500 mb-0.5">
            {agent.title}
          </span>
        </div>
        
        {task && (
          <p className="font-sans text-xs text-neutral-300 leading-snug truncate">
            {task}
          </p>
        )}
        {!task && (
          <p className="font-sans text-[10px] text-neutral-500 leading-snug truncate">
            {agent.role}
          </p>
        )}
      </div>
    </div>
  );
};
