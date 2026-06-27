export interface SystemColorMeaning {
  type: string;
  name: string;
  colorName: string;
  playerMeaning: string;
  textColor: string;
  borderColor: string;
  bgColor: string;
  cssVar?: string;
}

export const SYSTEM_COLORS_LEGEND: SystemColorMeaning[] = [
  {
    type: 'neutral',
    name: 'Basic System Info | Unknown (Gray)',
    colorName: 'Gray',
    playerMeaning: 'Basic system info, Unknown characters',
    textColor: 'text-gray-300',
    borderColor: 'border-gray-500/40',
    bgColor: 'bg-gray-500/10',
    cssVar: '--color-entity-unknown'
  },
  {
    type: 'codex_update',
    name: 'New Info | Main Character (Blue)',
    colorName: 'Blue',
    playerMeaning: 'New info, ally scan, codex record, Good items',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/40',
    bgColor: 'bg-blue-500/10',
    cssVar: '--color-entity-mc'
  },
  {
    type: 'progression',
    name: 'Stable Growth | Friend (Green)',
    colorName: 'Emerald',
    playerMeaning: 'Training progress, stable growth, Decent items',
    textColor: 'text-green-400',
    borderColor: 'border-green-500/40',
    bgColor: 'bg-green-500/10',
    cssVar: '--color-entity-friend'
  },
  {
    type: 'breakthrough',
    name: 'Awakening | Mentor & Special Location (Gold)',
    colorName: 'Gold',
    playerMeaning: 'Level-up, evolution, awakening, Special locations, Legendary items',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-400/50',
    bgColor: 'bg-amber-400/10',
    cssVar: '--color-entity-mentor'
  },
  {
    type: 'reward',
    name: 'Loot & Achievements | Legendary (Gold)',
    colorName: 'Gold',
    playerMeaning: 'Loot, Qi gain, achievement, Legendary items',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-400/50',
    bgColor: 'bg-amber-400/10',
    cssVar: '--color-item-legendary'
  },
  {
    type: 'warning',
    name: 'Risk & Pressure | Great Item (Orange)',
    colorName: 'Orange',
    playerMeaning: 'Risk, instability, choice pressure, Great items',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-500/40',
    bgColor: 'bg-orange-500/10',
    cssVar: '--color-item-great'
  },
  {
    type: 'critical_danger',
    name: 'Combat Threat | Enemy (Red)',
    colorName: 'Red',
    playerMeaning: 'Enemy, death risk, combat threat',
    textColor: 'text-red-500',
    borderColor: 'border-red-500/40',
    bgColor: 'bg-red-500/10',
    cssVar: '--color-entity-enemy'
  },
  {
    type: 'corruption',
    name: 'Permanent Curse | Tragedy (Dark Rose)',
    colorName: 'Dark Rose',
    playerMeaning: 'Permanent damage, curse, tragedy',
    textColor: 'text-rose-600',
    borderColor: 'border-rose-900/40',
    bgColor: 'bg-rose-950/20',
    cssVar: '--color-entity-enemy'
  },
  {
    type: 'mystery',
    name: 'Fate & Prophecy | Regular Location (Purple)',
    colorName: 'Violet',
    playerMeaning: 'Hidden truth, fate thread, prophecy, Regular locations',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/40',
    bgColor: 'bg-purple-500/10',
    cssVar: '--color-location-regular'
  },
  {
    type: 'romance',
    name: 'Karmic Affinity | Lover (Pink)',
    colorName: 'Pink',
    playerMeaning: 'Bonds, affection, emotional lock-in',
    textColor: 'text-pink-400',
    borderColor: 'border-pink-500/40',
    bgColor: 'bg-pink-500/10',
    cssVar: '--color-entity-lover'
  },
  {
    type: 'choice_consequence',
    name: 'Karmic Consequence | Great Item (Orange)',
    colorName: 'Orange',
    playerMeaning: 'The world remembers your decision, Great items',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-500/40',
    bgColor: 'bg-orange-500/10',
    cssVar: '--color-item-great'
  },
  {
    type: 'system_error',
    name: 'System Instability | System Error (Red Glitch)',
    colorName: 'Red glitch',
    playerMeaning: 'The “system” itself is unstable',
    textColor: 'text-red-400 font-bold',
    borderColor: 'border-red-600/60 border-double',
    bgColor: 'bg-red-950/20',
    cssVar: '--color-entity-enemy'
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
