import React from 'react';
import { motion } from 'motion/react';
import { Skull, AlertTriangle } from 'lucide-react';
import { SystemEvent } from '../types';
import { FateResultCard } from './FateResultCard';

export interface SystemColorMeaning {
  type: string;
  name: string;
  colorName: string;
  playerMeaning: string;
  textColor: string;
  borderColor: string;
  bgColor: string;
}

export const SYSTEM_COLORS_LEGEND: SystemColorMeaning[] = [
  {
    type: 'neutral',
    name: 'Basic System Info',
    colorName: 'Gray',
    playerMeaning: 'Basic system info',
    textColor: 'text-gray-300',
    borderColor: 'border-gray-500/40',
    bgColor: 'bg-gray-500/10'
  },
  {
    type: 'codex_update',
    name: 'New Info & Scans',
    colorName: 'Blue',
    playerMeaning: 'New info, ally scan, codex record',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/40',
    bgColor: 'bg-blue-500/10'
  },
  {
    type: 'progression',
    name: 'Stable Growth',
    colorName: 'Emerald',
    playerMeaning: 'Training progress, stable growth',
    textColor: 'text-green-400',
    borderColor: 'border-green-500/40',
    bgColor: 'bg-green-500/10'
  },
  {
    type: 'breakthrough',
    name: 'Awakening & Level-Up',
    colorName: 'Gold',
    playerMeaning: 'Level-up, evolution, awakening',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-400/50',
    bgColor: 'bg-amber-400/10'
  },
  {
    type: 'reward',
    name: 'Loot & Achievements',
    colorName: 'Gold',
    playerMeaning: 'Loot, Qi gain, achievement',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-400/50',
    bgColor: 'bg-amber-400/10'
  },
  {
    type: 'warning',
    name: 'Risk & Pressure',
    colorName: 'Orange',
    playerMeaning: 'Risk, instability, choice pressure',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-500/40',
    bgColor: 'bg-orange-500/10'
  },
  {
    type: 'critical_danger',
    name: 'Combat Threat',
    colorName: 'Red',
    playerMeaning: 'Enemy, death risk, combat threat',
    textColor: 'text-red-500',
    borderColor: 'border-red-500/40',
    bgColor: 'bg-red-500/10'
  },
  {
    type: 'corruption',
    name: 'Permanent Curse',
    colorName: 'Dark Rose',
    playerMeaning: 'Permanent damage, curse, tragedy',
    textColor: 'text-rose-600',
    borderColor: 'border-rose-900/40',
    bgColor: 'bg-rose-950/20'
  },
  {
    type: 'mystery',
    name: 'Fate & Prophecy',
    colorName: 'Violet',
    playerMeaning: 'Hidden truth, fate thread, prophecy',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/40',
    bgColor: 'bg-purple-500/10'
  },
  {
    type: 'romance',
    name: 'Karmic Affinity',
    colorName: 'Pink',
    playerMeaning: 'Bonds, affection, emotional lock-in',
    textColor: 'text-pink-400',
    borderColor: 'border-pink-500/40',
    bgColor: 'bg-pink-500/10'
  },
  {
    type: 'choice_consequence',
    name: 'Karmic Consequence',
    colorName: 'Orange',
    playerMeaning: 'The world remembers your decision',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-500/40',
    bgColor: 'bg-orange-500/10'
  },
  {
    type: 'system_error',
    name: 'System Instability',
    colorName: 'Red glitch',
    playerMeaning: 'The “system” itself is unstable',
    textColor: 'text-red-400 font-bold',
    borderColor: 'border-red-600/60 border-double',
    bgColor: 'bg-red-950/20'
  }
];

export function getSystemInferredType(context?: string): string {
  if (!context) return 'neutral';
  const lowerText = context.toLowerCase();
  
  if (lowerText.includes('system error') || lowerText.includes('unstable') || lowerText.includes('glitch') || lowerText.includes('malfunction') || lowerText.includes('iron fate warning')) {
    return 'system_error';
  }
  if (lowerText.includes('karma backlash') || lowerText.includes('choice_consequence') || lowerText.includes('remembers') || lowerText.includes('consequence') || lowerText.includes('decision')) {
    return 'choice_consequence';
  }
  if (lowerText.includes('danger') || lowerText.includes('critical') || lowerText.includes('death threat') || lowerText.includes('hostile') || lowerText.includes('enemy')) {
    return 'critical_danger';
  }
  if (lowerText.includes('death flag') || lowerText.includes('death') || lowerText.includes('corruption') || lowerText.includes('permanent') || lowerText.includes('curse') || lowerText.includes('tragedy')) {
    return 'corruption';
  }
  if (lowerText.includes('breakthrough') || lowerText.includes('evolution') || lowerText.includes('level up') || lowerText.includes('level-up') || lowerText.includes('ascension') || lowerText.includes('legendary') || lowerText.includes('awakening')) {
    return 'breakthrough';
  }
  if (lowerText.includes('loot') || lowerText.includes('qi gain') || lowerText.includes('achievement') || lowerText.includes('reward') || lowerText.includes('gain')) {
    return 'reward';
  }
  if (lowerText.includes('romance') || lowerText.includes('bond') || lowerText.includes('affection') || lowerText.includes('karmic affinity') || lowerText.includes('relationship')) {
    return 'romance';
  }
  if (lowerText.includes('warning') || lowerText.includes('risk') || lowerText.includes('instability') || lowerText.includes('pressure')) {
    return 'warning';
  }
  if (lowerText.includes('fate lock') || lowerText.includes('fate event') || lowerText.includes('mystery') || lowerText.includes('fate') || lowerText.includes('unknown') || lowerText.includes('prophecy') || lowerText.includes('truth')) {
    return 'mystery';
  }
  if (lowerText.includes('friendly') || lowerText.includes('update') || lowerText.includes('quest') || lowerText.includes('info') || lowerText.includes('codex') || lowerText.includes('scan') || lowerText.includes('record')) {
    return 'codex_update';
  }
  if (lowerText.includes('progress') || lowerText.includes('stable') || lowerText.includes('growth') || lowerText.includes('training')) {
    return 'progression';
  }
  
  return 'neutral';
}

export function getSystemColorMeaning(promptType?: string, context?: string): SystemColorMeaning {
  let type = promptType || getSystemInferredType(context);
  
  // Backwards and alternative type aliases mapping
  if (type === 'friendly_scan' || type === 'quest_update') {
    type = 'codex_update';
  } else if (type === 'enemy_scan') {
    type = 'critical_danger';
  } else if (type === 'death_event') {
    type = 'corruption';
  } else if (type === 'fate_event') {
    type = 'mystery';
  } else if (type === 'karmic_bond') {
    type = 'romance';
  }

  const match = SYSTEM_COLORS_LEGEND.find(m => m.type === type);
  return match || SYSTEM_COLORS_LEGEND[0]; // default to neutral (gray)
}

export function getSystemPromptColor(promptType?: string, context?: string): string {
  const meaning = getSystemColorMeaning(promptType, context);
  
  if (meaning.type === 'system_error') {
    return `${meaning.borderColor} ${meaning.textColor} ${meaning.bgColor} shadow-[0_0_15px_rgba(239,68,68,0.25)] animate-pulse`;
  }
  if (meaning.type === 'corruption') {
    return `${meaning.borderColor} ${meaning.textColor} ${meaning.bgColor} shadow-[0_0_15px_rgba(159,18,57,0.25)]`;
  }

  const colorShadow = meaning.borderColor.includes('blue') ? 'rgba(59,130,246,0.15)' :
                      meaning.borderColor.includes('green') ? 'rgba(34,197,94,0.15)' :
                      meaning.borderColor.includes('amber') ? 'rgba(251,191,36,0.15)' :
                      meaning.borderColor.includes('orange') ? 'rgba(249,115,22,0.15)' :
                      meaning.borderColor.includes('red') ? 'rgba(239,68,68,0.15)' :
                      meaning.borderColor.includes('rose') ? 'rgba(159,18,57,0.15)' :
                      meaning.borderColor.includes('purple') ? 'rgba(168,85,247,0.15)' :
                      meaning.borderColor.includes('pink') ? 'rgba(236,72,153,0.15)' :
                      'rgba(107,114,128,0.15)';
  return `${meaning.borderColor} ${meaning.textColor} ${meaning.bgColor} shadow-[0_0_15px_${colorShadow}]`;
}

interface SystemBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  content: string;
  system?: SystemEvent;
}

export function SystemBlock({ content, system, className, ...props }: SystemBlockProps) {
  const { onAnimationStart, onDrag, onDragStart, onDragEnd, ...safeProps } = props;

  const isIronFate = (system?.title || '').toLowerCase().includes('iron fate') || 
                     (system?.kind || '').toLowerCase().includes('iron fate') || 
                     content.toLowerCase().includes('iron fate');

  const isDeathFlag = (system?.title || '').toLowerCase().includes('death flag') || 
                      (system?.kind || '').toLowerCase().includes('death flag') || 
                      content.toLowerCase().includes('death flag');

  // If structured system object exists, render holographic panel
  if (system) {
    if (system.fateResult) {
      return (
        <div {...safeProps}>
          <FateResultCard data={system.fateResult} />
        </div>
      );
    }

    let colorStyles = getSystemPromptColor(system.promptType, system.title + ' ' + (system.kind || ''));
    const meaning = getSystemColorMeaning(system.promptType, system.title + ' ' + (system.kind || ''));

    // Apply old mapping for backwards compatibility if promptType is missing and it hit neutral
    if (!system.promptType && colorStyles.includes('gray')) {
      const kind = system.kind;
      if (kind === 'level_up') colorStyles = 'border-amber-400/50 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.15)] bg-amber-400/10';
      else if (kind === 'skill_acquired') colorStyles = 'border-[#00ffff]/40 text-[#00ffff] shadow-[0_0_15px_rgba(0,255,255,0.15)] bg-[#00ffff]/10';
      else if (kind === 'quest') colorStyles = 'border-violet-500/40 text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.15)] bg-violet-500/10';
      else if (kind === 'appraisal') colorStyles = 'border-yellow-300/40 text-yellow-300 shadow-[0_0_15px_rgba(253,224,71,0.15)] bg-yellow-300/10';
      else colorStyles = 'border-portal/30 text-portal shadow-[0_0_15px_rgba(4,172,255,0.1)] bg-portal/10'; // default status
    }

    if (isDeathFlag) {
      colorStyles += ' animate-menacing-red';
    } else if (isIronFate) {
      colorStyles += ' animate-menacing-amber';
    }

    return (
      <motion.div 
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`system-block holographic-panel cursor-pointer my-6 md:my-8 rounded-md border font-mono p-3 md:p-4 max-w-xl mx-auto transition-all duration-300 ${colorStyles} ${className || ''}`}
        {...safeProps}
      >
        <div className="flex flex-col space-y-3">
          <div className="flex items-center justify-between border-b pb-2 border-inherit/30">
            <div className="flex items-center space-x-2">
              {isDeathFlag && <Skull className="w-5 h-5 text-red-500 animate-pulse shrink-0" />}
              {isIronFate && <AlertTriangle className="w-5 h-5 text-amber-500 animate-bounce shrink-0" />}
              <div className="flex flex-col">
                <span className="font-bold uppercase tracking-widest text-xs md:text-sm leading-tight">{system.title}</span>
                <span className="text-[9px] uppercase tracking-wider opacity-60 font-mono mt-0.5">
                  ✦ {meaning.name} ✦
                </span>
              </div>
            </div>
            {system.rarity && (
              <span className="rarity-accent text-[10px] uppercase px-2 py-0.5 border rounded-sm bg-black/40 text-inherit">
                {system.rarity}
              </span>
            )}
          </div>
          
          {system.rows && system.rows.length > 0 && (
            <div className="space-y-1.5">
              {system.rows.map((row, idx) => (
                <div key={idx} className="flex justify-between items-center text-[11px] md:text-xs">
                  <span className="opacity-70 uppercase tracking-widest">{row.label}</span>
                  <span className="font-semibold tracking-wide text-right">{row.value}</span>
                </div>
              ))}
            </div>
          )}
          
          {content && content.trim() !== '' && (
            <div className="mt-1.5 text-[11px] md:text-xs opacity-70 border-t border-inherit/30 pt-2 text-center italic leading-relaxed">
              {content.replace(/^\[|\]$/g, '').trim()}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Fallback to legacy string-based parsing
  const text = content.replace(/^\[|\]$/g, '').trim();
  let fallbackColorStyles = getSystemPromptColor(undefined, text);
  const meaning = getSystemColorMeaning(undefined, text);

  if (isDeathFlag) {
    fallbackColorStyles += ' animate-menacing-red';
  } else if (isIronFate) {
    fallbackColorStyles += ' animate-menacing-amber';
  }

  return (
    <div {...props} className={`my-6 md:my-8 p-4 md:p-5 bg-black/50 border font-mono text-[11px] md:text-sm rounded-lg text-center tracking-widest leading-relaxed transition-all duration-500 hover:brightness-125 hover:shadow-[0_0_25px_rgba(255,255,255,0.1)] ${fallbackColorStyles} ${className || ''}`}>
      <div className="flex flex-col items-center justify-center mb-1.5 md:mb-2">
        {isDeathFlag && <Skull className="w-5 h-5 md:w-6 md:h-6 text-red-500 animate-pulse mb-1.5" />}
        {isIronFate && <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-amber-500 animate-bounce mb-1.5" />}
        <div className="text-[9px] uppercase tracking-wider opacity-60 font-semibold">
          ✦ {meaning.name} ✦
        </div>
      </div>
      <span className="opacity-90">{text}</span>
    </div>
  );
}
