import { db, auth } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAppStore } from '../store/useAppStore';
import { CosmicArtifact } from '../types';

export const COSMIC_ARTIFACT_TEMPLATES = {
  wandering_disciple: {
    name: "Azure Medallion of the Wandering Disciple",
    description: "A cool jade medallion given to those who have begun their true ascent. Its gentle hum helps focus spiritual thoughts.",
    rarity: "Common" as const,
    attributeBoost: "+5% Qi Flow Speed"
  },
  outer_sect_scribe: {
    name: "Seal of the Sect Scribe",
    description: "A bronze seal engraved with runes of truth. It allows its owner to write and seal records with absolute authority.",
    rarity: "Common" as const,
    attributeBoost: "+10% Memory Stability"
  },
  inner_sect_scholar: {
    name: "Gourd of Nine Heavenly Nectars",
    description: "A miniature gourd carved from ancient spiritual wood. It slowly condenses droplets of divine morning dew that nourish the reader's spirit.",
    rarity: "Rare" as const,
    attributeBoost: "+10% Vitality Recovery"
  },
  dao_adept: {
    name: "Spindle of the Nine-Fold Fate",
    description: "A miniature wooden spindle holding thread spun from starlight. It allows subtle adjustments to the red threads of connection.",
    rarity: "Epic" as const,
    attributeBoost: "+15% Relationship Affinity"
  },
  spirit_author: {
    name: "Cosmic Pen of the Spirit Author",
    description: "A writing brush tipped with a phoenix feather. Its strokes are infused with natural Dao, allowing thoughts to manifest into physical reality.",
    rarity: "Legendary" as const,
    attributeBoost: "+20% Generation Quality"
  },
  heavenly_chronicler: {
    name: "Cauldron of Primordial Chaos",
    description: "A heavy tripod cauldron that burns with an eternal colorless flame. Supposedly forged in the void before the cosmos split.",
    rarity: "Legendary" as const,
    attributeBoost: "+25% Power Progression Speed"
  },
  sage_branching: {
    name: "Crown of the Branching Sage",
    description: "A delicate circlet made of silver pine roots stretching across parallel realities. It holds memory of parallel timelines.",
    rarity: "Mythic" as const,
    attributeBoost: "+30% Paradox Tolerance"
  },
  dao_master: {
    name: "Heart of the Transcendental Matrix",
    description: "A shifting crystal lattice that glows with neon spectrums. Confers supreme comprehension of all nested story realities.",
    rarity: "Transcendent" as const,
    attributeBoost: "+50% Transcendental Insight"
  },
  chapter_5: {
    name: "Compass of Pathless Destinies",
    description: "A brass compass whose needle remains still, while the outer dial rotates to point toward unseen choices and hidden routes.",
    rarity: "Epic" as const,
    attributeBoost: "+15% Fate Resistance"
  },
  chapter_seal: {
    name: "Mirror of Karmic Reflections",
    description: "A polished bronze mirror that reveals the color of one's karmic alignment rather than their physical face.",
    rarity: "Rare" as const,
    attributeBoost: "+5% Karma Resolution"
  },
  challenge_complete: {
    name: "Key of the Spatial Anomaly",
    description: "A shimmering silver key that hums with spatial vibrations. Can open tiny cracks in reality to bypass barriers.",
    rarity: "Epic" as const,
    attributeBoost: "+15% Hazard Evasion"
  },
  legendary_sword: {
    name: "Crystalline Sword of Celestial Dawn",
    description: "A legendary sword forged in the core of an active star, radiating cosmic heat. It hums with celestial energy that guides the hand of its wielder.",
    rarity: "Legendary" as const,
    attributeBoost: "+20% Combat Will"
  },
  boss_fight: {
    name: "Shattered Crest of the Void Beast",
    description: "The boss fight begins, and the beast's echoes ring. A pulsing chunk of absolute darkness recovered from the heart of a primordial nemesis. Its heavy presence dampens spatial stress.",
    rarity: "Epic" as const,
    attributeBoost: "+15% Tribulation Armor"
  },
  bond_token: {
    name: "Jade Token of Blood Allegiance",
    description: "An unbreakable blood bond is sworn. A flawless warm-jade disk engraved with the secret character of absolute loyalty. Glows when companions are near.",
    rarity: "Epic" as const,
    attributeBoost: "+20% Companion Affinity"
  },
  faction_banner: {
    name: "War Banner of the Sovereign Sect",
    description: "The sect war ends in ultimate victory. A heavy gold-thread silk banner bearing the star-gilding of your sect. Waves constantly as if swept by a spiritual wind.",
    rarity: "Rare" as const,
    attributeBoost: "+15% Sect Influence"
  },
  dragon_card: {
    name: "Summoner's Scroll of the Ascendant Dragon",
    description: "An ancient dragon manifests before you. A pristine scroll made of dragon-scale vellum. When unrolled, a spectral projection of a crimson dragon spirals around the reader.",
    rarity: "Mythic" as const,
    attributeBoost: "+25% Dragon Meridian Flow"
  },
  fatebreaker_title: {
    name: "Cosmic Seal of the Fatebreaker",
    description: "You have survived death, shattering your predetermined fate. A transcendent seal that represents your status as one who defies the heavens and breaks predetermined boundaries.",
    rarity: "Transcendent" as const,
    attributeBoost: "+30% Fate Resistance"
  },
  secret_codex: {
    name: "Cursed Tome",
    description: "A dark tome radiating ominous energy. Reading its text curses the soul but offers a path to forbidden knowledge.",
    rarity: "Epic" as const,
    attributeBoost: "+20% Truth Comprehension",
    statusEffectDef: {
      name: 'Curse of the Cursed Tome',
      type: 'Curse',
      description: '-15% Qi gathering efficiency for the duration.',
      durationMs: 24 * 60 * 60 * 1000,
      scope: 'Account-wide',
      visual: 'Dark smoke around display name',
      counterplay: 'Gather 500 Qi while cursed',
      rewardHook: 'Permanently unlock the Cursed Scholar title',
      qiMultiplier: 0.85,
      targetProgress: 500
    }
  },
  broken_jade_seal: {
    name: "Broken Jade Seal",
    description: "A fractured token of a lost empire.",
    rarity: "Rare" as const,
    attributeBoost: "+5% Sect Influence",
    statusEffectDef: {
      name: 'Broken Jade Seal',
      type: 'Affliction',
      description: 'Store prices increased by 10%.',
      durationMs: 12 * 60 * 60 * 1000,
      scope: 'Story-specific',
      rewardHook: 'Completing an arc during this time drops Jade Fragments'
    }
  },
  demonic_heart_pearl: {
    name: "Demonic Heart Pearl",
    description: "A pulsing pearl of absolute demonic intent.",
    rarity: "Legendary" as const,
    attributeBoost: "+15% Demonic Affinity",
    statusEffectDef: {
      name: 'Demonic Corruption',
      type: 'Mutation',
      description: 'Pure Qi gain -20%, Demonic (Sect) Qi gain +50%',
      durationMs: 48 * 60 * 60 * 1000,
      scope: 'Account-wide',
      rewardHook: 'Unlocks demonic cosmetics',
      qiMultiplier: 0.8,
      sectQiMultiplier: 1.5
    }
  },
  ashen_fate_thread: {
    name: "Ashen Fate Thread",
    description: "A burnt thread of destiny that smells of scorched karma.",
    rarity: "Epic" as const,
    attributeBoost: "+10% Fate Manipulation",
    statusEffectDef: {
      name: 'Ashen Destiny',
      type: 'Affliction',
      description: 'Next Fate Challenge has higher difficulty',
      durationMs: 72 * 60 * 60 * 1000,
      scope: 'Story-specific',
      rewardHook: 'Reward rarity increases by one tier'
    }
  },
  nameless_bone_flute: {
    name: "Nameless Bone Flute",
    description: "A flute carved from an unknown beast's bone. Playing it silences the world.",
    rarity: "Rare" as const,
    attributeBoost: "+5% Tribulation Evasion",
    statusEffectDef: {
      name: 'Ghostly Silence',
      type: 'Curse',
      description: 'Hides your profile aura for the duration.',
      durationMs: 24 * 60 * 60 * 1000,
      scope: 'Account-wide',
      rewardHook: 'Unlocks ghostly music/profile effect after expiry'
    }
  },
  trophy_card: {
    name: "Sovereign Trophy of Ultimate Victory",
    description: "The villain is defeated at last. A grand, shining trophy crafted from divine metals. It emits a pleasant, victorious chime when touched, celebrating your dominance.",
    rarity: "Legendary" as const,
    attributeBoost: "+25% Dao Luck"
  }
};

export async function unlockCosmicArtifact(
  keyOrArtifact: string | Omit<CosmicArtifact, 'id' | 'unlockedAt'>,
  sourceId?: string,
  sourceTitle?: string
): Promise<CosmicArtifact | null> {
  const user = auth.currentUser;
  const now = new Date().toISOString();
  
  let baseArtifact: Omit<CosmicArtifact, 'id' | 'unlockedAt'>;
  let milestoneType: CosmicArtifact['milestoneType'];
  let milestoneName: string;
  let artifactKey = '';
  
  if (typeof keyOrArtifact === 'string') {
    artifactKey = keyOrArtifact;
    const template = COSMIC_ARTIFACT_TEMPLATES[keyOrArtifact as keyof typeof COSMIC_ARTIFACT_TEMPLATES];
    if (!template) return null;
    
    milestoneType = keyOrArtifact === 'chapter_seal' ? 'chapter_seal' :
                    keyOrArtifact === 'challenge_complete' ? 'challenge_complete' :
                    keyOrArtifact === 'chapter_5' ? 'first_breakthrough' :
                    [
                      'legendary_sword',
                      'boss_fight',
                      'bond_token',
                      'faction_banner',
                      'dragon_card',
                      'fatebreaker_title',
                      'secret_codex',
                      'trophy_card'
                    ].includes(keyOrArtifact) ? 'chapter_seal' : 'rank_up';
                    
    milestoneName = keyOrArtifact === 'chapter_seal' ? 'Sealed a Story Chapter' :
                    keyOrArtifact === 'challenge_complete' ? 'Fate Survival Complete' :
                    keyOrArtifact === 'chapter_5' ? 'Ascended to Chapter 5' :
                    keyOrArtifact === 'legendary_sword' ? 'Acquired Legendary Sword' :
                    keyOrArtifact === 'boss_fight' ? 'Confronted Primordial Nemesis' :
                    keyOrArtifact === 'bond_token' ? 'Earned Sworn Allegiance' :
                    keyOrArtifact === 'faction_banner' ? 'Triumph in Sect War' :
                    keyOrArtifact === 'dragon_card' ? 'Manifested Cosmic Dragon' :
                    keyOrArtifact === 'fatebreaker_title' ? 'Shattered predetermined Fate' :
                    keyOrArtifact === 'secret_codex' ? 'Discovered Secret Codex' :
                    keyOrArtifact === 'trophy_card' ? 'Slain the Tyrant Lord' :
                    'Attained Dao Rank';
                    
    baseArtifact = {
      name: template.name,
      description: template.description,
      milestoneType,
      milestoneName,
      rarity: template.rarity,
      attributeBoost: template.attributeBoost,
      sourceStoryId: sourceId,
      sourceStoryTitle: sourceTitle
    };
  } else {
    baseArtifact = keyOrArtifact;
  }
  
  const id = `art-${artifactKey || 'custom'}-${Date.now()}`;
  const newArtifact: CosmicArtifact = {
    ...baseArtifact,
    id,
    unlockedAt: now
  };
  
  // Check duplicates to avoid multi-award
  const checkDuplicate = (list: CosmicArtifact[]) => {
    if (artifactKey) {
      return list.some(a => a.name === newArtifact.name);
    }
    return list.some(a => a.name === newArtifact.name && a.sourceStoryId === newArtifact.sourceStoryId);
  };
  
  if (user) {
    try {
      const userRef = doc(db, 'users', user.uid);
      const uDoc = await getDoc(userRef);
      if (uDoc.exists()) {
        const data = uDoc.data();
        const currentInventory: CosmicArtifact[] = data.inventory || data.cosmicInventory || [];
        
        if (checkDuplicate(currentInventory)) {
          return null; // Already unlocked
        }
        
        const updatedInventory = [...currentInventory, newArtifact];
        await setDoc(userRef, { cosmicInventory: updatedInventory, inventory: updatedInventory }, { merge: true });
        
        // Dispatch window event for live-unlock celebration UI
        window.dispatchEvent(new CustomEvent('seihouse-artifact-unlocked', { detail: { artifact: newArtifact } }));
        return newArtifact;
      }
    } catch (e) {
      console.error('Failed to save artifact to Cloud:', e);
    }
  }
  
  // Local fallback (Offline or Guest Mode)
  try {
    const localInvStr = localStorage.getItem('seihouse-local-cosmic-inventory');
    const currentInventory: CosmicArtifact[] = localInvStr ? JSON.parse(localInvStr) : [];
    
    if (checkDuplicate(currentInventory)) {
      return null; // Already unlocked
    }
    
    const updatedInventory = [...currentInventory, newArtifact];
    try {
      localStorage.setItem('seihouse-local-cosmic-inventory', JSON.stringify(updatedInventory));
    } catch (e) {
      console.warn('LocalStorage Quota exceeded for artifacts:', e);
    }
    
    // Also update local store userProfile if we are offline/guest
    const localProfile = useAppStore.getState().userProfile;
    if (localProfile) {
      useAppStore.setState({
        userProfile: {
          ...localProfile,
          cosmicInventory: updatedInventory
        }
      });
    } else {
      // Initialize offline dummy profile
      useAppStore.setState({
        userProfile: {
          uid: 'anonymous',
          username: 'Mortal Reader',
          displayName: 'Mortal Reader',
          avatarUrl: '',
          preferredLanguage: 'English',
          defaultTranslationLanguage: 'English',
          savedStoryCount: 0,
          activeStories: [],
          inactiveStories: [],
          joinedDate: now,
          updatedAt: now,
          cosmicInventory: updatedInventory
        }
      });
    }
    
    window.dispatchEvent(new CustomEvent('seihouse-artifact-unlocked', { detail: { artifact: newArtifact } }));
    return newArtifact;
  } catch (e) {
    console.error('Failed to save artifact locally:', e);
  }
  
  return null;
}

export async function getUnlockedArtifacts(): Promise<CosmicArtifact[]> {
  const user = auth.currentUser;
  if (user) {
    try {
      const uDoc = await getDoc(doc(db, 'users', user.uid));
      if (uDoc.exists()) {
        const data = uDoc.data();
        return data.inventory || data.cosmicInventory || [];
      }
    } catch (e) {
      console.error('Failed to fetch artifacts from Cloud:', e);
    }
  }
  const localInvStr = localStorage.getItem('seihouse-local-cosmic-inventory');
  return localInvStr ? JSON.parse(localInvStr) : [];
}

/**
 * Checks and awards milestone artifacts based on current state.
 */
export function checkAndAwardRankArtifacts(rank: string): void {
  const rankKeyMap: Record<string, string> = {
    'Wandering Disciple': 'wandering_disciple',
    'Outer Sect Scribe': 'outer_sect_scribe',
    'Inner Sect Scholar': 'inner_sect_scholar',
    'Dao Adept': 'dao_adept',
    'Spirit Author': 'spirit_author',
    'Heavenly Chronicler': 'heavenly_chronicler',
    'Sage of Branching Paths': 'sage_branching',
    'Dao Master': 'dao_master'
  };
  
  const key = rankKeyMap[rank];
  if (key) {
    unlockCosmicArtifact(key).catch(err => {
      console.error(`Failed to automatically award rank artifact for ${rank}:`, err);
    });
  }
}

export async function scanChapterForArtifacts(
  storyId: string,
  storyTitle: string,
  chapterNumber: number,
  text: string,
  metadata?: any
): Promise<void> {
  const normalized = text.toLowerCase();
  
  const cuePayload = metadata?.cuePayload;
  const blocks = metadata?.blocks || [];

  // 1. Arc Entry Reward (Minor Relic / Badge / Codex Stamp) - 1 every arc (early arc)
  // Assuming an arc is roughly 6 chapters. We trigger this on chapter 1, 7, 13, etc.
  if (chapterNumber % 6 === 1) {
    let zoneName = "New Territory";
    // Try to find a location entity
    const locationEntity = blocks.flatMap((b: any) => b.metadata?.entities || []).find((e: any) => e.type === 'location' || e.type === 'faction');
    if (locationEntity && locationEntity.name) {
      zoneName = locationEntity.name;
    }
    await unlockCosmicArtifact({
      name: `Codex Stamp: Entered ${zoneName}`,
      description: `A minor relic confirming your entry into ${zoneName}. It resonates with the local Qi.`,
      rarity: 'Common',
      attributeBoost: '+5% Environmental Affinity',
      sourceStoryId: storyId,
      sourceStoryTitle: storyTitle,
      milestoneType: 'chapter_seal',
      milestoneName: 'Arc Entry'
    }, storyId, storyTitle);
  }

  // 2. Arc Climax Reward (Arc Relic) - 1 per arc
  // We trigger this around chapter 5, 11, 17, etc.
  if (chapterNumber % 6 === 5) {
    let relicName = "Fragment of the Unknown Core";
    // Try to find an artifact or beast entity
    const climaxEntity = blocks.flatMap((b: any) => b.metadata?.entities || []).find((e: any) => e.type === 'artifact' || e.type === 'beast');
    if (climaxEntity && climaxEntity.name) {
      relicName = climaxEntity.name;
    }
    await unlockCosmicArtifact({
      name: `Relic Acquired: ${relicName}`,
      description: `The main reward of this arc. The heavy emotional payoff from surviving the climax.`,
      rarity: 'Epic',
      attributeBoost: '+15% Arc Resonance',
      sourceStoryId: storyId,
      sourceStoryTitle: storyTitle,
      milestoneType: 'challenge_complete',
      milestoneName: 'Arc Climax'
    }, storyId, storyTitle);
  }

  // 3. Boss Scene / Major Audio (Manifestation Card)
  const isBossScene = 
    normalized.includes('boss fight') ||
    normalized.includes('villain') ||
    normalized.includes('dragon roar') ||
    (cuePayload?.danger && cuePayload.danger > 75) ||
    blocks.some((b: any) => b.metadata?.sceneType === 'boss-fight' || b.metadata?.danger > 8);

  if (isBossScene) {
    await unlockCosmicArtifact({
      name: "Manifestation Card: Adversary's Roar",
      description: "A major manifestation card captured from a powerful adversary or boss scene.",
      rarity: 'Legendary',
      attributeBoost: '+20% Combat Will',
      sourceStoryId: storyId,
      sourceStoryTitle: storyTitle,
      milestoneType: 'chapter_seal',
      milestoneName: 'Boss Confrontation'
    }, storyId, storyTitle);
  }

  // 4. Optional Hidden Reward (Secret Title / Condition)
  // Triggered by secrets, specific prompt types, or fate survival
  const hasHiddenSecret = 
    normalized.includes('secret') || 
    normalized.includes('hidden') || 
    normalized.includes('perfect survival') ||
    blocks.some((b: any) => b.system?.promptType === 'mystery' || b.system?.promptType === 'fate_event');

  if (hasHiddenSecret) {
    let secretName = "One Who Walked the Hidden Path";
    const mysteryEntity = blocks.flatMap((b: any) => b.metadata?.entities || []).find((e: any) => e.type === 'mystery' || e.type === 'artifact');
    if (mysteryEntity && mysteryEntity.name) {
      secretName = `Secret Title: Witness of ${mysteryEntity.name}`;
    }
    await unlockCosmicArtifact({
      name: secretName,
      description: "An optional hidden reward for uncovering a secret, making a special choice, or surviving a tough fate route.",
      rarity: 'Epic',
      attributeBoost: '+15% Truth Comprehension',
      sourceStoryId: storyId,
      sourceStoryTitle: storyTitle,
      milestoneType: 'challenge_complete',
      milestoneName: 'Hidden Secret'
    }, storyId, storyTitle);
  }

  // 5. Mythic / Profile-defining Relic (1 every 3-5 arcs -> ~every 24 chapters)
  if (chapterNumber % 24 === 0 && chapterNumber > 0) {
    await unlockCosmicArtifact({
      name: "Heaven-Defying Fatebreaker Seal",
      description: "A mythic relic defining your profile, awarded for surviving multiple arduous arcs and defying fate itself.",
      rarity: 'Mythic',
      attributeBoost: '+30% Fate Resistance',
      sourceStoryId: storyId,
      sourceStoryTitle: storyTitle,
      milestoneType: 'rank_up',
      milestoneName: 'Saga Milestone'
    }, storyId, storyTitle);
  }

  // 6. Legendary Completion Title (1 per major saga -> ~every 60 chapters)
  if (chapterNumber % 60 === 0 && chapterNumber > 0) {
    await unlockCosmicArtifact({
      name: "Legendary Title: Witness of the Grand Saga",
      description: "A legendary completion title. You have witnessed the rise and fall of sects, empires, and gods across a major saga.",
      rarity: 'Transcendent',
      attributeBoost: '+50% Dao Comprehension',
      sourceStoryId: storyId,
      sourceStoryTitle: storyTitle,
      milestoneType: 'rank_up',
      milestoneName: 'Saga Completion'
    }, storyId, storyTitle);
  }

  // Scan for newly-forged unique artifacts in the blocks
  for (const block of blocks) {
    if (block.worldCard?.entityType === 'artifact' && block.worldCard.entityName) {
      await unlockCosmicArtifact({
        name: block.worldCard.entityName,
        description: block.worldCard.quote || `A rare and powerful relic of historical significance, manifested from the fate lines of your story.`,
        rarity: 'Epic',
        attributeBoost: `+15% ${block.worldCard.entityName} Resonance`,
        sourceStoryId: storyId,
        sourceStoryTitle: storyTitle,
        milestoneType: 'codex_linked',
        milestoneName: 'Codex Artifact Discovery'
      }, storyId, storyTitle);
    }
  }

  // Call the new Drop Engine to process all other block-based drops (worldCard, system, fateResult, beast)
  try {
    const { processChapterDrops } = await import('./dropEngine');
    await processChapterDrops(metadata || { blocks }, { id: storyId, title: storyTitle });
  } catch (err) {
    console.error("Failed to run Drop Engine during scanChapterForArtifacts:", err);
  }
}
