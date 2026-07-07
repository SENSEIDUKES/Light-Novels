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
    type: 'other',
    name: 'Other System Context | Miscellaneous (Gray)',
    colorName: 'Gray',
    playerMeaning: 'Miscellaneous system information',
    textColor: 'text-gray-400',
    borderColor: 'border-gray-500/30',
    bgColor: 'bg-gray-500/5',
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
    type: 'combat_artifact',
    name: 'Combat Artifact | Special Encounter (Red-Gold)',
    colorName: 'Red-Gold',
    playerMeaning: 'Powerful artifact found or used during combat',
    textColor: 'text-red-400 font-semibold',
    borderColor: 'border-amber-500/60',
    bgColor: 'bg-red-950/30',
    cssVar: '--color-item-legendary'
  },
  {
    type: 'combat_breakthrough',
    name: 'Combat Breakthrough | Mid-fight Evolution (Gold-Red)',
    colorName: 'Gold-Red',
    playerMeaning: 'Breakthrough achieved under combat pressure',
    textColor: 'text-amber-400 font-bold',
    borderColor: 'border-red-500/60',
    bgColor: 'bg-amber-950/30',
    cssVar: '--color-entity-mentor'
  },
  {
    type: 'heavenly_tribulation',
    name: 'Heavenly Tribulation | Divine Trial (Purple-Gold)',
    colorName: 'Purple-Gold',
    playerMeaning: 'A moment of supreme destiny or danger',
    textColor: 'text-purple-400 font-bold italic',
    borderColor: 'border-amber-400/70',
    bgColor: 'bg-purple-950/40',
    cssVar: '--color-location-regular'
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
  if (!context) return "other";

  const lowerContext = context.toLowerCase();
  
  // Check combinations/multi-matches first
  if (lowerContext.includes("combat") && lowerContext.includes("artifact")) return "combat_artifact";
  if (lowerContext.includes("combat") && lowerContext.includes("breakthrough")) return "combat_breakthrough";
  if (lowerContext.includes("tribulation") || lowerContext.includes("divine trial")) return "heavenly_tribulation";

  if (lowerContext.includes("system error") || lowerContext.includes("unstable") || lowerContext.includes("glitch") || lowerContext.includes("malfunction") || lowerContext.includes("iron fate warning")) {
    return "system_error";
  }
  if (lowerContext.includes("karma backlash") || lowerContext.includes("choice_consequence") || lowerContext.includes("remembers") || lowerContext.includes("consequence") || lowerContext.includes("decision")) {
    return "choice_consequence";
  }
  if (lowerContext.includes("danger") || lowerContext.includes("critical") || lowerContext.includes("death threat") || lowerContext.includes("hostile") || lowerContext.includes("enemy")) {
    return "critical_danger";
  }
  if (lowerContext.includes("death flag") || lowerContext.includes("death") || lowerContext.includes("corruption") || lowerContext.includes("permanent") || lowerContext.includes("curse") || lowerContext.includes("tragedy")) {
    return "corruption";
  }
  if (lowerContext.includes("breakthrough") || lowerContext.includes("evolution") || lowerContext.includes("level up") || lowerContext.includes("level-up") || lowerContext.includes("ascension") || lowerContext.includes("legendary") || lowerContext.includes("awakening")) {
    return "breakthrough";
  }
  if (lowerContext.includes("loot") || lowerContext.includes("qi gain") || lowerContext.includes("achievement") || lowerContext.includes("reward") || lowerContext.includes("gain")) {
    return "reward";
  }
  if (lowerContext.includes("romance") || lowerContext.includes("bond") || lowerContext.includes("affection") || lowerContext.includes("karmic affinity") || lowerContext.includes("relationship")) {
    return "romance";
  }
  if (lowerContext.includes("warning") || lowerContext.includes("risk") || lowerContext.includes("instability") || lowerContext.includes("pressure")) {
    return "warning";
  }
  if (lowerContext.includes("fate lock") || lowerContext.includes("fate event") || lowerContext.includes("mystery") || lowerContext.includes("fate") || lowerContext.includes("unknown") || lowerContext.includes("prophecy") || lowerContext.includes("truth")) {
    return "mystery";
  }
  if (lowerContext.includes("friendly") || lowerContext.includes("update") || lowerContext.includes("quest") || lowerContext.includes("info") || lowerContext.includes("codex") || lowerContext.includes("scan") || lowerContext.includes("record")) {
    return "codex_update";
  }
  if (lowerContext.includes("progress") || lowerContext.includes("stable") || lowerContext.includes("growth") || lowerContext.includes("training")) {
    return "progression";
  }
  
  return "other";
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
