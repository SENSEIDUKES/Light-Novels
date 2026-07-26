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
    // 1. worldCard Signal - Only award relics for Legendary/Mythic artifact awakenings
    if (block.worldCard && block.worldCard.entityName) {
      const card = block.worldCard;
      const entityType = card.entityType;
      const entityName = card.entityName;
      const displayTitle = card.displayTitle || '';
      const quote = card.quote || card.audioText || '';

      if (entityType === 'artifact' && (card.sound?.assetFamily === 'relic' || card.rarity === 'Legendary' || card.rarity === 'Mythic')) {
        const descPrefix = displayTitle ? `${displayTitle}. ` : '';
        const drop: Omit<CosmicArtifact, 'id' | 'unlockedAt'> = {
          name: entityName,
          description: `${descPrefix}${quote || 'A legendary relic of historical significance manifested in your story.'}`,
          rarity: card.rarity || 'Legendary',
          attributeBoost: `+20% ${entityName} Resonance`,
          sourceStoryId: story.id,
          sourceStoryTitle: story.title,
          milestoneType: 'codex_linked',
          milestoneName: 'Legendary Artifact Discovery',
          imageUrl: card.imageUrl,
          specialUnlock: {
            type: 'profile_item',
            label: `Cave Relic: ${entityName}`,
            description: `Display ${entityName} in your cultivator cave.`
          }
        };

        const unlocked = await unlockCosmicArtifact(drop, story.id, story.title);
        if (unlocked) unlockedDrops.push(unlocked);
      }
    }

    // 2. system Signal - Only award relics for major cultivation realm breakthroughs or legendary skills
    if (block.system) {
      const sys = block.system;
      const kind = sys.kind;
      const title = sys.title;
      let drop: Omit<CosmicArtifact, 'id' | 'unlockedAt'> | null = null;

      if (kind === 'level_up' && title) {
        drop = {
          name: `Realm Breakthrough Elixir: ${title}`,
          description: `A condensed essence of solid spiritual Qi celebrating your major cultivation breakthrough to ${title}.`,
          rarity: 'Legendary',
          attributeBoost: `+30% Base Qi`,
          sourceStoryId: story.id,
          sourceStoryTitle: story.title,
          milestoneType: 'rank_up',
          milestoneName: 'Realm Breakthrough',
          specialUnlock: {
            type: 'cosmetic',
            label: `Realm Aura: ${title}`,
            description: `Unlocks the ${title} cultivation breakthrough aura.`
          }
        };
      } else if (kind === 'skill_acquired' && title && (sys.rarity === 'Legendary' || sys.rarity === 'Mythic')) {
        drop = {
          name: `Esoteric Jade Scroll: ${title}`,
          description: `An ancient jade scroll detailing the supreme paths of the legendary technique: ${title}.`,
          rarity: (sys.rarity as CosmicArtifact['rarity']) || 'Legendary',
          attributeBoost: `+25% Technique Mastery`,
          sourceStoryId: story.id,
          sourceStoryTitle: story.title,
          milestoneType: 'codex_linked',
          milestoneName: 'Supreme Technique Awakening',
          specialUnlock: {
            type: 'customization',
            label: `Technique Accent: ${title}`,
            description: `Unlocks ${title} technique reader highlights.`
          }
        };
      }

      if (drop) {
        const unlocked = await unlockCosmicArtifact(drop, story.id, story.title);
        if (unlocked) unlockedDrops.push(unlocked);
      }

      // 3. fateResult Signal - Major fate objectives averted or surviving catastrophic doom
      const fate = sys.fateResult || (block as any).fateResult;
      if (fate && fate.outcome) {
        let fateDrop: Omit<CosmicArtifact, 'id' | 'unlockedAt'> | null = null;
        const outcome = fate.outcome;
        const scar = fate.timelineScar || '';

        if (outcome === 'FATE AVERTED') {
          fateDrop = {
            name: 'Fatebreaker Talisman',
            description: `A pristine talisman of pure karma, celebrating your total triumph over predetermined doom.${scar ? ` Timeline Scar: ${scar}.` : ''}`,
            rarity: 'Legendary',
            attributeBoost: '+30% Karma Shield',
            sourceStoryId: story.id,
            sourceStoryTitle: story.title,
            milestoneType: 'challenge_complete',
            milestoneName: 'Fate Shattered',
            specialUnlock: {
              type: 'badge',
              label: 'Badge: Fate Shattered',
              description: 'Badge for defying predetermined destiny.'
            }
          };
        } else if (outcome === 'DOOM MANIFESTED') {
          fateDrop = {
            name: 'Calamity Shard of Manifest Doom',
            description: `A heavy obsidian fragment recording your survival through absolute catastrophe.${scar ? ` Timeline Scar: ${scar}.` : ''}`,
            rarity: 'Mythic',
            attributeBoost: '+35% Demonic Aura',
            sourceStoryId: story.id,
            sourceStoryTitle: story.title,
            milestoneType: 'challenge_complete',
            milestoneName: 'Catastrophe Survived',
            specialUnlock: {
              type: 'theme',
              label: 'Theme: Ashen Calamity',
              description: 'Dark calamity profile theme unlock.'
            }
          };
        }

        if (fateDrop) {
          const unlocked = await unlockCosmicArtifact(fateDrop, story.id, story.title);
          if (unlocked) unlockedDrops.push(unlocked);
        }
      }
    }

    // 4. beast Signal - Only award relics for Boss, Calamity, or Mythic beast defeats
    const beastEvent = block.metadata?.beastEvent || (block as any).beastEvent;
    if (beastEvent && beastEvent.profile) {
      const type = beastEvent.type || 'encounter';
      const profile = beastEvent.profile;
      const threatTier = profile.threatTier || 'common';

      if (['boss', 'calamity', 'mythic'].includes(threatTier.toLowerCase())) {
        const element = profile.element || 'none';
        const bodyType = profile.bodyType || 'beast';
        const capElement = element !== 'none' ? element.charAt(0).toUpperCase() + element.slice(1) : '';
        const capBody = bodyType.charAt(0).toUpperCase() + bodyType.slice(1);
        const capThreat = threatTier.charAt(0).toUpperCase() + threatTier.slice(1);

        const name = capElement ? `${capThreat} ${capElement} ${capBody} Core` : `${capThreat} ${capBody} Core`;
        const description = `The crystallized core of a terrifying ${threatTier} beast, humming with primordial energy.`;

        const drop: Omit<CosmicArtifact, 'id' | 'unlockedAt'> = {
          name,
          description,
          rarity: threatTier === 'mythic' ? 'Mythic' : threatTier === 'calamity' ? 'Legendary' : 'Epic',
          attributeBoost: `+25% ${capElement || 'Primal'} Resonance`,
          sourceStoryId: story.id,
          sourceStoryTitle: story.title,
          milestoneType: 'codex_linked',
          milestoneName: `Beast Conquest: ${type}`,
          specialUnlock: {
            type: 'profile_item',
            label: `Cave Trophy: ${name}`,
            description: `Mount the ${name} trophy in your cultivator cave.`
          }
        };

        const unlocked = await unlockCosmicArtifact(drop, story.id, story.title);
        if (unlocked) unlockedDrops.push(unlocked);
      }
    }
  }

  return unlockedDrops;
}
