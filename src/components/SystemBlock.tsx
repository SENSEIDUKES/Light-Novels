import React from 'react';
import { motion } from 'motion/react';
import { SystemEvent } from '../types';

interface SystemBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  content: string;
  system?: SystemEvent;
}

export function getSystemPromptColor(promptType?: string, context?: string): string {
  let type = promptType || 'neutral';
  
  // If no strict promptType or we need to infer
  if (!promptType && context) {
    const lowerText = context.toLowerCase();
    if (lowerText.includes('danger') || lowerText.includes('critical') || lowerText.includes('death') || lowerText.includes('corruption')) {
      type = 'critical_danger';
    } else if (lowerText.includes('breakthrough') || lowerText.includes('evolution') || lowerText.includes('level up') || lowerText.includes('ascension') || lowerText.includes('legendary')) {
      type = 'breakthrough';
    } else if (lowerText.includes('romance') || lowerText.includes('bond')) {
      type = 'romance';
    } else if (lowerText.includes('enemy') || lowerText.includes('hostile')) {
      type = 'enemy_scan';
    } else if (lowerText.includes('warning') || lowerText.includes('unstable')) {
      type = 'warning';
    } else if (lowerText.includes('mystery') || lowerText.includes('fate') || lowerText.includes('unknown')) {
      type = 'mystery';
    } else if (lowerText.includes('friendly') || lowerText.includes('update') || lowerText.includes('quest') || lowerText.includes('info')) {
      type = 'codex_update';
    } else {
      type = 'neutral';
    }
  }

  switch (type) {
    case 'critical_danger':
    case 'enemy_scan':
    case 'system_error':
      return 'border-red-500/40 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)] bg-red-500/10';
    case 'corruption':
    case 'death_event':
      return 'border-rose-900/40 text-rose-600 shadow-[0_0_15px_rgba(159,18,57,0.15)] bg-rose-900/10';
    case 'breakthrough':
    case 'reward':
      return 'border-amber-400/50 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.15)] bg-amber-400/10';
    case 'romance':
    case 'karmic_bond':
      return 'border-pink-500/40 text-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.15)] bg-pink-500/10';
    case 'warning':
    case 'choice_consequence':
      return 'border-orange-500/40 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.15)] bg-orange-500/10';
    case 'mystery':
    case 'fate_event':
      return 'border-purple-500/40 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)] bg-purple-500/10';
    case 'progression':
      return 'border-green-500/40 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.15)] bg-green-500/10';
    case 'codex_update':
    case 'friendly_scan':
    case 'quest_update':
      return 'border-blue-500/40 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)] bg-blue-500/10';
    case 'neutral':
    default:
      return 'border-gray-500/40 text-gray-300 shadow-[0_0_15px_rgba(107,114,128,0.15)] bg-gray-500/10';
  }
}

export function SystemBlock({ content, system, className, ...props }: SystemBlockProps) {
  const { onAnimationStart, onDrag, onDragStart, onDragEnd, ...safeProps } = props;

  // If structured system object exists, render holographic panel
  if (system) {
    // Attempt mapping based on promptType primarily, then fallback to context/type
    let colorStyles = getSystemPromptColor(system.promptType, system.title + ' ' + (system.kind || ''));

    // Apply old mapping for backwards compatibility if promptType is missing and it hit neutral
    if (!system.promptType && colorStyles.includes('gray')) {
      const kind = system.kind;
      if (kind === 'level_up') colorStyles = 'border-amber-400/50 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.15)] bg-amber-400/10';
      else if (kind === 'skill_acquired') colorStyles = 'border-[#00ffff]/40 text-[#00ffff] shadow-[0_0_15px_rgba(0,255,255,0.15)] bg-[#00ffff]/10';
      else if (kind === 'quest') colorStyles = 'border-violet-500/40 text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.15)] bg-violet-500/10';
      else if (kind === 'appraisal') colorStyles = 'border-yellow-300/40 text-yellow-300 shadow-[0_0_15px_rgba(253,224,71,0.15)] bg-yellow-300/10';
      else colorStyles = 'border-portal/30 text-portal shadow-[0_0_15px_rgba(4,172,255,0.1)] bg-portal/10'; // default status
    }

    return (
      <motion.div 
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`system-block holographic-panel cursor-pointer my-8 rounded-md border font-mono p-4 max-w-xl mx-auto transition-all duration-300 ${colorStyles} ${className || ''}`}
        {...safeProps}
      >
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b pb-2 border-inherit/30">
            <span className="font-bold uppercase tracking-widest text-xs md:text-sm">{system.title}</span>
            {system.rarity && (
              <span className="rarity-accent text-[10px] uppercase px-2 py-0.5 border rounded-sm bg-black/40 text-inherit">
                {system.rarity}
              </span>
            )}
          </div>
          
          {system.rows && system.rows.length > 0 && (
            <div className="space-y-2">
              {system.rows.map((row, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs md:text-sm">
                  <span className="opacity-70 uppercase tracking-widest">{row.label}</span>
                  <span className="font-semibold tracking-wide text-right">{row.value}</span>
                </div>
              ))}
            </div>
          )}
          
          {/* Include fallback content text if it exists but is not captured deeply, or as flavor text */}
          {content && content.trim() !== '' && (
            <div className="mt-2 text-[11px] md:text-xs opacity-70 border-t border-inherit/30 pt-2 text-center italic">
              {content.replace(/^\[|\]$/g, '').trim()}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Fallback to legacy string-based parsing
  const text = content.replace(/^\[|\]$/g, '').trim();
  const colorStyles = getSystemPromptColor(undefined, text);

  return (
    <div {...props} className={`my-8 p-6 bg-black/50 border font-mono text-xs md:text-sm rounded-lg text-center tracking-widest leading-relaxed transition-all duration-500 hover:brightness-125 hover:shadow-[0_0_25px_rgba(255,255,255,0.1)] ${colorStyles} ${className || ''}`}>
      <span className="opacity-90">{text}</span>
    </div>
  );
}
