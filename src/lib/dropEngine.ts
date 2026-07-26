import { Chapter, CosmicArtifact } from '../types';
import { unlockCosmicArtifact } from './artifacts';

/**
 * Scans a chapter's blocks and converts found signals (worldCard, system, fateResult, beast)
 * into actual CosmicArtifact drops, unlocking them for the user profile.
 * 
 * @param chapter The Chapter containing blocks to scan.
 * @param story The Story context (for mapping source titles and IDs).
 * @returns A promise that resolves to an array of successfully unlocked CosmicArtifact drops.
 */
export async function processChapterDrops(
  chapter: Chapter,
  story: { id: string; title: string }
): Promise<CosmicArtifact[]> {
  const blocks = chapter.blocks || [];
  const unlockedDrops: CosmicArtifact[] = [];

  for (const block of blocks) {
    // 1. worldCard Signal
    if (block.worldCard && block.worldCard.entityName) {
      const card = block.worldCard;
      const entityType = card.entityType;
      const entityName = card.entityName;
      const displayTitle = card.displayTitle || '';
      const quote = card.quote || card.audioText || '';
      const titleSuffix = displayTitle ? ` (${displayTitle})` : '';

      let drop: Omit<CosmicArtifact, 'id' | 'unlockedAt'> | null = null;

      if (entityType === 'character') {
        drop = {
          name: `Karmic Token: ${entityName}`,
          description: `A soul-linked token of destiny representing your bond with ${entityName}${titleSuffix}. ${quote ? `"${quote}"` : 'Fate brought you together.'}`,
          rarity: 'Rare',
          attributeBoost: `+10% ${entityName} Affinity`,
          sourceStoryId: story.id,
          sourceStoryTitle: story.title,
          milestoneType: 'codex_linked',
          milestoneName: 'Character Fate Encounter',
          imageUrl: card.imageUrl
        };
      } else if (entityType === 'creature') {
        drop = {
          name: `Beast Core: ${entityName}`,
          description: `The crystallised essence or tamed soul of the mythical creature ${entityName}${titleSuffix}. ${quote ? `"${quote}"` : 'Its roar echoes in your soul.'}`,
          rarity: 'Rare',
          attributeBoost: `+12% Beast Resonance`,
          sourceStoryId: story.id,
          sourceStoryTitle: story.title,
          milestoneType: 'codex_linked',
          milestoneName: 'Beast Encounter',
          imageUrl: card.imageUrl
        };
      } else if (entityType === 'artifact') {
        const descPrefix = displayTitle ? `${displayTitle}. ` : '';
        drop = {
          name: entityName,
          description: `${descPrefix}${quote || 'A rare and powerful relic of historical significance, manifested from the fate lines of your story.'}`,
          rarity: 'Epic',
          attributeBoost: `+15% ${entityName} Resonance`,
          sourceStoryId: story.id,
          sourceStoryTitle: story.title,
          milestoneType: 'codex_linked',
          milestoneName: 'Codex Artifact Discovery',
          imageUrl: card.imageUrl
        };
      } else if (entityType === 'location') {
        drop = {
          name: `Spatial Anchor: ${entityName}`,
          description: `A pocket anchor containing the physical essence of the location ${entityName}${titleSuffix}. ${quote ? `"${quote}"` : 'You have attuned with this place.'}`,
          rarity: 'Common',
          attributeBoost: `+8% Realm Stability`,
          sourceStoryId: story.id,
          sourceStoryTitle: story.title,
          milestoneType: 'codex_linked',
          milestoneName: 'Domain Attunement',
          imageUrl: card.imageUrl
        };
      } else if (entityType === 'faction') {
        drop = {
          name: `Sect Banner: ${entityName}`,
          description: `The official insignia of ${entityName}${titleSuffix}, marking your alignment or conflict. ${quote ? `"${quote}"` : 'Honour and destiny align.'}`,
          rarity: 'Rare',
          attributeBoost: `+10% ${entityName} Rep`,
          sourceStoryId: story.id,
          sourceStoryTitle: story.title,
          milestoneType: 'codex_linked',
          milestoneName: 'Faction Encounter',
          imageUrl: card.imageUrl
        };
      } else if (entityType === 'system' || entityType === 'fate_event') {
        drop = {
          name: `Fate Sigil: ${entityName}`,
          description: `An ephemeral cosmic seal forged during the fate event: ${entityName}${titleSuffix}. ${quote ? `"${quote}"` : 'The tapestry of fate trembles.'}`,
          rarity: 'Epic',
          attributeBoost: `+15% Fate Manipulation`,
          sourceStoryId: story.id,
          sourceStoryTitle: story.title,
          milestoneType: 'chapter_seal',
          milestoneName: 'Fate Alignment',
          imageUrl: card.imageUrl
        };
      }

      if (drop) {
        const unlocked = await unlockCosmicArtifact(drop, story.id, story.title);
        if (unlocked) unlockedDrops.push(unlocked);
      }
    }

    // 2. system Signal
    if (block.system) {
      const sys = block.system;
      const kind = sys.kind;
      const title = sys.title;
      let drop: Omit<CosmicArtifact, 'id' | 'unlockedAt'> | null = null;

      if (kind === 'skill_acquired' && title) {
        const systemRarity = (sys.rarity as CosmicArtifact['rarity']) || 'Epic';
        drop = {
          name: `Jade Scroll: ${title}`,
          description: `An esoteric scroll detailing the profound paths of the technique: ${title}.`,
          rarity: systemRarity,
          attributeBoost: `+15% Technique Mastery`,
          sourceStoryId: story.id,
          sourceStoryTitle: story.title,
          milestoneType: 'codex_linked',
          milestoneName: 'Martial Breakthrough'
        };
      } else if (kind === 'level_up' && title) {
        drop = {
          name: `Celestial Breakthrough Pill: ${title}`,
          description: `A condensed pill of solid spiritual energy celebrating your breakthrough to ${title}.`,
          rarity: 'Rare',
          attributeBoost: `+20% Base Qi`,
          sourceStoryId: story.id,
          sourceStoryTitle: story.title,
          milestoneType: 'rank_up',
          milestoneName: 'Realm Ascension'
        };
      } else if (kind === 'quest' && title) {
        drop = {
          name: `Karmic Quest Contract: ${title}`,
          description: `A celestial contract detailing your task and the weight of your quest: ${title}.`,
          rarity: 'Common',
          attributeBoost: `+5% Quest Luck`,
          sourceStoryId: story.id,
          sourceStoryTitle: story.title,
          milestoneType: 'codex_linked',
          milestoneName: 'Karmic Mission Accepted'
        };
      } else if (kind === 'appraisal' && title) {
        drop = {
          name: `Appraisal Codex: ${title}`,
          description: `A detailed inspection log and analysis document for: ${title}.`,
          rarity: 'Common',
          attributeBoost: `+5% Perception Vision`,
          sourceStoryId: story.id,
          sourceStoryTitle: story.title,
          milestoneType: 'codex_linked',
          milestoneName: 'Divine Appraisal'
        };
      }

      if (drop) {
        const unlocked = await unlockCosmicArtifact(drop, story.id, story.title);
        if (unlocked) unlockedDrops.push(unlocked);
      }

      // 3. fateResult Signal (nested inside system block)
      const fate = sys.fateResult || (block as any).fateResult;
      if (fate && fate.outcome) {
        let fateDrop: Omit<CosmicArtifact, 'id' | 'unlockedAt'> | null = null;
        const outcome = fate.outcome;
        const scar = fate.timelineScar || '';
        const costs = fate.permanentCosts ? fate.permanentCosts.join(', ') : '';

        if (outcome === 'FATE AVERTED') {
          fateDrop = {
            name: 'Fatebreaker Talisman',
            description: `A pristine talisman of pure luck, representing your triumph over predetermined doom.${scar ? ` Timeline Scar: ${scar}.` : ''}`,
            rarity: 'Legendary',
            attributeBoost: '+30% Karma Shield',
            sourceStoryId: story.id,
            sourceStoryTitle: story.title,
            milestoneType: 'chapter_seal',
            milestoneName: 'Fate Shattered'
          };
        } else if (outcome === 'FATE SCARRED') {
          fateDrop = {
            name: 'Scarred Karma Thread',
            description: `A damaged thread of fate carrying the weight of permanent costs${costs ? `: ${costs}` : ''}.${scar ? ` Timeline Scar: ${scar}.` : ''}`,
            rarity: 'Epic',
            attributeBoost: '+15% Pain Tolerance',
            sourceStoryId: story.id,
            sourceStoryTitle: story.title,
            milestoneType: 'chapter_seal',
            milestoneName: 'Fate Scarred'
          };
        } else if (outcome === 'DOOM MANIFESTED') {
          fateDrop = {
            name: 'Calamity Shard of Manifest Doom',
            description: `A heavy, dark obsidian fragment singing of absolute doom.${scar ? ` Timeline Scar: ${scar}.` : ''}`,
            rarity: 'Mythic',
            attributeBoost: '+25% Demonic Aura',
            sourceStoryId: story.id,
            sourceStoryTitle: story.title,
            milestoneType: 'chapter_seal',
            milestoneName: 'Doom Manifestation'
          };
        }

        if (fateDrop) {
          const unlocked = await unlockCosmicArtifact(fateDrop, story.id, story.title);
          if (unlocked) unlockedDrops.push(unlocked);
        }
      }
    }

    // 4. beast Signal inside metadata
    const beastEvent = block.metadata?.beastEvent || (block as any).beastEvent;
    if (beastEvent && beastEvent.profile) {
      const type = beastEvent.type || 'encounter';
      const profile = beastEvent.profile;
      const element = profile.element || 'none';
      const bodyType = profile.bodyType || 'beast';
      const size = profile.size || 'human-sized';
      const signatureSound = profile.signatureSound || 'growl';
      const threatTier = profile.threatTier || 'common';

      let rarity: CosmicArtifact['rarity'] = 'Rare';
      if (threatTier === 'common') rarity = 'Common';
      else if (threatTier === 'elite') rarity = 'Rare';
      else if (threatTier === 'boss') rarity = 'Epic';
      else if (threatTier === 'calamity') rarity = 'Legendary';
      else if (threatTier === 'mythic') rarity = 'Mythic';

      const capElement = element !== 'none' ? element.charAt(0).toUpperCase() + element.slice(1) : '';
      const capBody = bodyType.charAt(0).toUpperCase() + bodyType.slice(1);
      const capThreat = threatTier.charAt(0).toUpperCase() + threatTier.slice(1);

      const name = capElement ? `${capElement} ${capBody} Essence` : `${capThreat} ${capBody} Essence`;
      const description = `A powerful beast item humming with ${signatureSound} frequencies and ${element} power. Derived from a ${size} ${threatTier} beast.`;

      const drop: Omit<CosmicArtifact, 'id' | 'unlockedAt'> = {
        name,
        description,
        rarity,
        attributeBoost: `+15% ${capElement || 'Primal'} Resonance`,
        sourceStoryId: story.id,
        sourceStoryTitle: story.title,
        milestoneType: 'codex_linked',
        milestoneName: `Beast Event: ${type}`
      };

      const unlocked = await unlockCosmicArtifact(drop, story.id, story.title);
      if (unlocked) unlockedDrops.push(unlocked);
    }
  }

  return unlockedDrops;
}
