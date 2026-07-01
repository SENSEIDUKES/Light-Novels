import { doc, setDoc, collection, addDoc, query, where, getDocs, getDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { checkAndAwardRankArtifacts } from './artifacts';
import type { ActiveStatusEffect } from '../types';
import { useAppStore } from '../store/useAppStore';

let pendingProfileUpdates: any = null;
let profileSyncTimeout: any = null;

function queueProfileSync(updates: any, uid: string) {
  if (!pendingProfileUpdates) {
    pendingProfileUpdates = { ...updates };
  } else {
    pendingProfileUpdates = { ...pendingProfileUpdates, ...updates };
  }
  
  if (profileSyncTimeout) clearTimeout(profileSyncTimeout);
  profileSyncTimeout = setTimeout(async () => {
    const toSync = pendingProfileUpdates;
    pendingProfileUpdates = null;
    try {
      await setDoc(doc(db, 'users', uid), toSync, { merge: true });
    } catch (err) {
      console.error('Failed to sync XP to cloud', err);
    }
  }, 10000); // 10 second debounce for batching writes
}

export const DAO_RANKS = [
  { threshold: 0, name: 'Mortal Reader' },
  { threshold: 100, name: 'Wandering Disciple' },
  { threshold: 300, name: 'Outer Sect Scribe' },
  { threshold: 750, name: 'Inner Sect Scholar' },
  { threshold: 1500, name: 'Dao Adept' },
  { threshold: 3000, name: 'Spirit Author' },
  { threshold: 6000, name: 'Heavenly Chronicler' },
  { threshold: 12000, name: 'Sage of Branching Paths' },
  { threshold: 25000, name: 'Dao Master' }
];

export function getDaoRankData(qi: number = 0) {
  let currentTitle = DAO_RANKS[0].name;
  let nextThreshold = DAO_RANKS[1].threshold;
  let nextTitle = DAO_RANKS[1].name;
  let previousThreshold = DAO_RANKS[0].threshold;

  for (let i = 0; i < DAO_RANKS.length; i++) {
    if (qi >= DAO_RANKS[i].threshold) {
      currentTitle = DAO_RANKS[i].name;
      previousThreshold = DAO_RANKS[i].threshold;
      if (i + 1 < DAO_RANKS.length) {
        nextThreshold = DAO_RANKS[i+1].threshold;
        nextTitle = DAO_RANKS[i+1].name;
      } else {
        nextThreshold = null as any;
        nextTitle = null as any;
      }
    }
  }

  const progress = nextThreshold ? ((qi - previousThreshold) / (nextThreshold - previousThreshold)) * 100 : 100;
  
  return {
     rank: currentTitle,
     nextRank: nextTitle,
     progress: Math.min(Math.max(progress, 0), 100),
     maxQi: nextThreshold,
     currentQi: qi
  };
}

export type QiEvent = 
  | 'chapter_read'
  | 'chapter_finished'
  | 'chapter_generated'
  | 'world_created'
  | 'chapter_sealed'
  | 'branch_created'
  | 'branch_published'
  | 'story_liked'
  | 'streak_reward_3'
  | 'streak_reward_10';

const QI_VALUES: Record<QiEvent, number> = {
  chapter_read: 2,
  chapter_finished: 5,
  chapter_generated: 10,
  world_created: 25,
  chapter_sealed: 15,
  branch_created: 30,
  branch_published: 50,
  story_liked: 5,
  streak_reward_3: 20,
  streak_reward_10: 100
};

const SECT_QI_VALUES: Record<QiEvent, number> = {
  chapter_read: 2,
  chapter_finished: 5,
  chapter_generated: 10,
  world_created: 25,
  chapter_sealed: 15,
  branch_created: 30,
  branch_published: 50,
  story_liked: 5,
  streak_reward_3: 20,
  streak_reward_10: 100
};

const DAILY_CAPS: Partial<Record<QiEvent, number>> = {
  chapter_read: 20, // max 20 times a day
  chapter_finished: 10,
  story_liked: 5,
  chapter_generated: 20,
};

export async function awardQi(event: QiEvent, sourceId?: string, sourceType?: string) {
  const user = auth.currentUser;
  if (!user) return; 
  
  const amount = QI_VALUES[event];
  if (!amount) return;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfDayStr = today.toISOString();

    const limit = DAILY_CAPS[event];
    if (limit) {
       const key = `dao_events_${event}_${startOfDayStr}`;
       const currentCount = parseInt(localStorage.getItem(key) || '0', 10);
       if (currentCount >= limit) {
         console.log(`[AntiSpam] Daily cap reached for ${event}. Qi not awarded.`);
         return; // limit reached
       }
       localStorage.setItem(key, (currentCount + 1).toString());
    }

    // Instead of directly querying the cloud, rely on the locally loaded profile
    const data = useAppStore.getState().userProfile;
    if (!data) return; // If profile isn't loaded yet, we can't reliably update it in-memory
    
    // Support migrating from `qi` to `dao_xp`
    let currentXp = data?.dao_xp;
    if (currentXp === undefined && data?.qi !== undefined) {
      currentXp = data.qi;
    } else if (currentXp === undefined) {
      currentXp = 0;
    }

    let currentHeavenlyQi = data?.heavenly_qi;
    if (currentHeavenlyQi === undefined) {
      currentHeavenlyQi = currentXp;
    }
    const currentSectQi = data?.sect_qi || 0;
    const currentDemonicQi = data?.demonic_qi || 0;

    let qiMultiplier = 1;
    let sectQiMultiplier = 1;
    if (data?.activeStatusEffects) {
      const now = new Date().toISOString();
      data.activeStatusEffects.forEach((effect: ActiveStatusEffect) => {
        if (effect.expiresAt > now) {
          if (effect.effectDef.qiMultiplier !== undefined) {
            qiMultiplier *= effect.effectDef.qiMultiplier;
          }
          if (effect.effectDef.sectQiMultiplier !== undefined) {
            sectQiMultiplier *= effect.effectDef.sectQiMultiplier;
          }
        }
      });
    }

    // Support streak tracking
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const lastInteractionDate = data?.lastInteractionDate || '';
    const currentStreak = data?.writingStreak || 0;
    
    let newStreak = currentStreak;
    let streakChanged = false;
    let bonusQi = 0;
    let streakEventName: 'streak_reward_3' | 'streak_reward_10' | null = null;
    
    if (lastInteractionDate !== todayStr) {
      if (lastInteractionDate) {
        const lastDate = new Date(lastInteractionDate + 'T00:00:00');
        const todayDate = new Date(todayStr + 'T00:00:00');
        const diffTime = todayDate.getTime() - lastDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          newStreak = currentStreak + 1;
        } else {
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }
      streakChanged = true;
    } else if (currentStreak === 0) {
      newStreak = 1;
      streakChanged = true;
    }

    if (streakChanged) {
      if (newStreak % 10 === 0) {
        bonusQi = 100;
        streakEventName = 'streak_reward_10';
      } else if (newStreak % 3 === 0) {
        bonusQi = 20;
        streakEventName = 'streak_reward_3';
      }
    }

    const calculatedAmount = Math.round(amount * qiMultiplier);
    const calculatedBonus = Math.round(bonusQi * qiMultiplier);

    const newXp = currentXp + calculatedAmount + calculatedBonus;
    const newHeavenlyQi = currentHeavenlyQi + calculatedAmount + calculatedBonus;
    const sectAmount = SECT_QI_VALUES[event] || amount;
    const sectBonus = streakEventName ? (SECT_QI_VALUES[streakEventName] || bonusQi) : 0;
    
    const calculatedSectAmount = Math.round(sectAmount * sectQiMultiplier);
    const calculatedSectBonus = Math.round(sectBonus * sectQiMultiplier);
    const newSectQi = currentSectQi + calculatedSectAmount + calculatedSectBonus;

    const newRank = getDaoRankData(newXp).rank;
    
    // Automatically check and award persistent Cosmic Artifacts for this rank
    checkAndAwardRankArtifacts(newRank);

    // Award Demonic Qi if Demonic Corruption or any mutation/demonic status effect is active!
    let demonicQiGain = 0;
    if (data?.activeStatusEffects) {
      const now = new Date().toISOString();
      const hasDemonic = data.activeStatusEffects.some(
        (effect: any) => 
          (effect.effectDef.name === 'Demonic Corruption' || effect.effectDef.type === 'Mutation') && 
          effect.expiresAt > now
      );
      if (hasDemonic) {
        // Demonic Qi gain is proportional to the calculated amount
        demonicQiGain = Math.round(calculatedAmount * 0.5); 
      }
    }
    const newDemonicQi = currentDemonicQi + demonicQiGain;

    let updatedEffects = data?.activeStatusEffects ? [...data.activeStatusEffects] : [];
    if (updatedEffects.length > 0) {
      const now = new Date().toISOString();
      updatedEffects = updatedEffects.map((effect: ActiveStatusEffect) => {
        if (effect.expiresAt > now && !effect.completedAt) {
          if (effect.progress !== undefined && effect.targetProgress !== undefined) {
            const nextProgress = (effect.progress || 0) + calculatedAmount;
            const completedAt = nextProgress >= effect.targetProgress ? now : undefined;
            return {
              ...effect,
              progress: Math.min(effect.targetProgress, nextProgress),
              completedAt
            };
          }
        }
        return effect;
      });
    }

    const userUpdates: any = {
      dao_xp: newXp,
      qi: newXp, // keep backwards compatibility for now just in case
      heavenly_qi: newHeavenlyQi,
      sect_qi: newSectQi,
      demonic_qi: newDemonicQi,
      dao_rank: newRank,
      writingStreak: newStreak,
      lastInteractionDate: todayStr,
      activeStatusEffects: updatedEffects,
      updatedAt: new Date().toISOString()
    };
    
    // Update local immediately for instantaneous UI updates
    useAppStore.getState().setUserProfile({ ...data, ...userUpdates });
    
    // Queue background sync to firestore
    queueProfileSync(userUpdates, user.uid);

  } catch (error) {
    console.error('Failed to award Qi:', error);
  }
}

export interface AuraTier {
  rank: string;
  name: string;
  colorHex: string;
  rewardFeeling: string;
  unlockedAt: number;
  textColor: string;
  shadowColor: string;
  bgGlow: string;
  effectType?: 'normal' | 'particles' | 'gradient' | 'animated';
}

export const AURA_TIERS: AuraTier[] = [
  {
    rank: 'Mortal Reader',
    name: 'Sect Entrance Aura',
    colorHex: '#E5E7EB',
    rewardFeeling: 'You entered the sect',
    unlockedAt: 0,
    textColor: 'text-gray-300',
    shadowColor: 'rgba(229,231,235,0.2)',
    bgGlow: 'bg-neutral-800/10'
  },
  {
    rank: 'Wandering Disciple',
    name: 'Active Disciple Azure',
    colorHex: '#3B82F6',
    rewardFeeling: 'You are active',
    unlockedAt: 100,
    textColor: 'text-blue-400',
    shadowColor: 'rgba(59,130,246,0.35)',
    bgGlow: 'bg-blue-950/20'
  },
  {
    rank: 'Outer Sect Scribe',
    name: 'Scribe Cyan Resonance',
    colorHex: '#06B6D4',
    rewardFeeling: 'You are recording worlds',
    unlockedAt: 300,
    textColor: 'text-cyan-400',
    shadowColor: 'rgba(6,182,212,0.4)',
    bgGlow: 'bg-cyan-950/20'
  },
  {
    rank: 'Inner Sect Scholar',
    name: 'Scholar Emerald Sight',
    colorHex: '#10B981',
    rewardFeeling: 'You understand systems',
    unlockedAt: 750,
    textColor: 'text-emerald-400',
    shadowColor: 'rgba(16,185,129,0.45)',
    bgGlow: 'bg-emerald-950/20'
  },
  {
    rank: 'Dao Adept',
    name: 'Fate-Shaper Violet Aura',
    colorHex: '#8B5CF6',
    rewardFeeling: 'You can shape fate',
    unlockedAt: 1500,
    textColor: 'text-purple-400',
    shadowColor: 'rgba(139,92,246,0.5)',
    bgGlow: 'bg-purple-950/20'
  },
  {
    rank: 'Spirit Author',
    name: 'Canon Creator Gold',
    colorHex: '#F59E0B',
    rewardFeeling: 'You are creating canon',
    unlockedAt: 3000,
    textColor: 'text-amber-400',
    shadowColor: 'rgba(245,158,11,0.55)',
    bgGlow: 'bg-amber-950/20'
  },
  {
    rank: 'Heavenly Chronicler',
    name: 'Cosmic Gold Particle',
    colorHex: '#FFD700',
    rewardFeeling: 'You preserve worlds',
    unlockedAt: 6000,
    textColor: 'text-yellow-400',
    shadowColor: 'rgba(255,215,0,0.65)',
    bgGlow: 'bg-yellow-950/20',
    effectType: 'particles'
  },
  {
    rank: 'Sage of Branching Paths',
    name: 'Prism Branching Gradient',
    colorHex: 'gradient-violet-gold',
    rewardFeeling: 'You master branches',
    unlockedAt: 12000,
    textColor: 'bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400',
    shadowColor: 'rgba(168,85,247,0.7)',
    bgGlow: 'bg-gradient-to-r from-purple-950/20 to-yellow-950/20',
    effectType: 'gradient'
  },
  {
    rank: 'Dao Master',
    name: 'Transcendental Master Matrix',
    colorHex: 'animated-custom',
    rewardFeeling: 'You transcend normal UI',
    unlockedAt: 25000,
    textColor: 'bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-rose-400 to-yellow-400',
    shadowColor: 'rgba(6,182,212,0.85)',
    bgGlow: 'bg-gradient-to-r from-cyan-950/20 via-rose-950/20 to-yellow-950/20',
    effectType: 'animated'
  }
];

export function getAuraTextStyle(
  colorHexOrAura?: string,
  activeStatusEffects?: ActiveStatusEffect[]
): { style?: React.CSSProperties; className?: string } {
  if (!colorHexOrAura) return {};
  
  const now = new Date().toISOString();
  const hasGhostlySilence = activeStatusEffects?.some(
    e => e.effectDef.name === "Ghostly Silence" && e.expiresAt > now
  );
  
  if (hasGhostlySilence) {
    return {
      className: 'text-neutral-500 font-normal opacity-60 line-through-none shadow-none filter grayscale'
    };
  }

  const hasCursedTome = activeStatusEffects?.some(
    e => e.effectDef.name === "Curse of the Cursed Tome" && e.expiresAt > now
  );

  let extraClass = '';
  if (hasCursedTome) {
    extraClass = ' animate-pulse text-red-400/90 shadow-[0_0_12px_rgba(139,0,0,0.8)]';
  }
  
  if (colorHexOrAura === 'gradient-violet-gold') {
    return {
      className: `aura-gradient-violet-gold font-bold drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]${extraClass}`
    };
  }
  if (colorHexOrAura === 'animated-custom') {
    return {
      className: `aura-animated-custom font-black drop-shadow-[0_0_12px_rgba(6,182,212,0.65)]${extraClass}`
    };
  }
  
  // Normal hex colors
  return {
    style: { color: hasCursedTome ? '#ff3333' : colorHexOrAura },
    className: `drop-shadow-[0_0_5px_rgba(255,255,255,0.15)] font-semibold${extraClass}`
  };
}

export function getAuraGlowStyle(
  colorHexOrAura?: string,
  activeStatusEffects?: ActiveStatusEffect[]
): string {
  if (!colorHexOrAura) return '';

  const now = new Date().toISOString();
  const hasGhostlySilence = activeStatusEffects?.some(
    e => e.effectDef.name === "Ghostly Silence" && e.expiresAt > now
  );
  
  if (hasGhostlySilence) {
    return 'border-neutral-900 shadow-none';
  }

  const hasCursedTome = activeStatusEffects?.some(
    e => e.effectDef.name === "Curse of the Cursed Tome" && e.expiresAt > now
  );

  if (hasCursedTome) {
    return 'shadow-[0_0_25px_rgba(139,0,0,0.7)] border-human/40 animate-pulse';
  }
  
  const match = AURA_TIERS.find(t => t.colorHex === colorHexOrAura);
  if (match) {
    if (colorHexOrAura === 'gradient-violet-gold') {
      return 'shadow-[0_0_30px_rgba(139,92,246,0.25)] border-purple-500/30';
    }
    if (colorHexOrAura === 'animated-custom') {
      return 'shadow-[0_0_40px_rgba(6,182,212,0.45)] border-cyan-500/40 animate-pulse';
    }
    return `shadow-[0_0_20px_${match.shadowColor}] border-neutral-800`;
  }
  return '';
}

export async function awardDirectQi(amount: number, reason: string) {
  const user = auth.currentUser;
  if (!user) return; 
  if (!amount || amount <= 0) return;

  try {
    const data = useAppStore.getState().userProfile;
    if (!data) return;
    
    let currentXp = data?.dao_xp;
    if (currentXp === undefined && data?.qi !== undefined) {
      currentXp = data.qi;
    } else if (currentXp === undefined) {
      currentXp = 0;
    }

    let currentHeavenlyQi = data?.heavenly_qi;
    if (currentHeavenlyQi === undefined) {
      currentHeavenlyQi = currentXp;
    }
    const currentSectQi = data?.sect_qi || 0;
    const currentDemonicQi = data?.demonic_qi || 0;

    let qiMultiplier = 1;
    let sectQiMultiplier = 1;
    if (data?.activeStatusEffects) {
      const now = new Date().toISOString();
      data.activeStatusEffects.forEach((effect: ActiveStatusEffect) => {
        if (effect.expiresAt > now) {
          if (effect.effectDef.qiMultiplier !== undefined) {
            qiMultiplier *= effect.effectDef.qiMultiplier;
          }
          if (effect.effectDef.sectQiMultiplier !== undefined) {
            sectQiMultiplier *= effect.effectDef.sectQiMultiplier;
          }
        }
      });
    }

    const calculatedAmount = Math.round(amount * qiMultiplier);
    const calculatedSectAmount = Math.round(amount * sectQiMultiplier);

    const newXp = currentXp + calculatedAmount;
    const newHeavenlyQi = currentHeavenlyQi + calculatedAmount;
    const newSectQi = currentSectQi + calculatedSectAmount;

    // Award Demonic Qi if Demonic Corruption or any mutation/demonic status effect is active!
    let demonicQiGain = 0;
    if (data?.activeStatusEffects) {
      const now = new Date().toISOString();
      const hasDemonic = data.activeStatusEffects.some(
        (effect: any) => 
          (effect.effectDef.name === 'Demonic Corruption' || effect.effectDef.type === 'Mutation') && 
          effect.expiresAt > now
      );
      if (hasDemonic) {
        demonicQiGain = Math.round(calculatedAmount * 0.5); 
      }
    }
    const newDemonicQi = currentDemonicQi + demonicQiGain;

    const newRank = getDaoRankData(newXp).rank;
    
    // Automatically check and award persistent Cosmic Artifacts for this rank
    checkAndAwardRankArtifacts(newRank);

    let updatedEffects = data?.activeStatusEffects ? [...data.activeStatusEffects] : [];
    if (updatedEffects.length > 0) {
      const now = new Date().toISOString();
      updatedEffects = updatedEffects.map((effect: ActiveStatusEffect) => {
        if (effect.expiresAt > now && !effect.completedAt) {
          if (effect.progress !== undefined && effect.targetProgress !== undefined) {
            const nextProgress = (effect.progress || 0) + calculatedAmount;
            const completedAt = nextProgress >= effect.targetProgress ? now : undefined;
            return {
              ...effect,
              progress: Math.min(effect.targetProgress, nextProgress),
              completedAt
            };
          }
        }
        return effect;
      });
    }

    const userUpdates = {
      dao_xp: newXp,
      qi: newXp,
      heavenly_qi: newHeavenlyQi,
      sect_qi: newSectQi,
      demonic_qi: newDemonicQi,
      dao_rank: newRank,
      activeStatusEffects: updatedEffects,
      updatedAt: new Date().toISOString()
    };
    
    useAppStore.getState().setUserProfile({ ...data, ...userUpdates });
    queueProfileSync(userUpdates, user.uid);

  } catch (error) {
    console.error('Failed to award direct Qi:', error);
  }
}


