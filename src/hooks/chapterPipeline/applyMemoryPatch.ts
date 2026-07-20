import { generateId } from '../../lib/id';
import { Ability, Story, StoryMemory } from '../../types';
import { runMemoryLinter } from '../storyEngineHelpers';
import { resolveEntity } from '../../lib/entityResolver';
import { stripAuthorControlledCodexFields } from '../../lib/codexContext';
import { isManifestationEligible, type ManifestationCandidate } from '../../lib/manifestationEligibility';

const stripGeneratedAbilityContext = (ability: any) => {
  if (!ability || typeof ability !== 'object') return ability;
  return stripAuthorControlledCodexFields(ability);
};

const sanitizeGeneratedAbilities = (value: unknown): any[] | undefined =>
  Array.isArray(value) ? value.map(stripGeneratedAbilityContext) : undefined;

const eligibleCodexAdditions = <T extends ManifestationCandidate>(
  entries: T[],
): T[] => entries.filter(isManifestationEligible);

// Known mastery ladder for downgrade protection. Comparison is only attempted
// when BOTH levels are on the ladder; unknown labels are never ranked.
const MASTERY_ORDER = [
  'novice', 'beginner', 'initial', 'basic', 'intermediate', 'adept',
  'advanced', 'proficient', 'expert', 'perfected', 'master', 'grandmaster',
  'transcendent',
];

const masteryRank = (level: string | undefined): number => {
  if (!level) return -1;
  return MASTERY_ORDER.indexOf(level.trim().toLowerCase());
};

/** True when applying `next` over `current` would be a comparable downgrade. */
const isMasteryDowngrade = (current?: string, next?: string): boolean => {
  const currentRank = masteryRank(current);
  const nextRank = masteryRank(next);
  return currentRank >= 0 && nextRank >= 0 && nextRank < currentRank;
};

/**
 * Legacy ledgers may hold plain-string abilities. Any progression update or
 * duplicate-acquisition merge normalizes the target into a full Ability object
 * first so mastery history has somewhere to live.
 */
const normalizeAbilityEntry = (
  entry: string | Ability,
  chapterNumber: number,
): Ability =>
  typeof entry === 'string'
    ? {
        id: `abil-${generateId(9)}`,
        name: entry,
        description: '',
        acquiredChapter: chapterNumber,
        relevanceState: 'active',
      }
    : entry;

export const applyMemoryPatch = (
  cloned: Story,
  data: any,
  chapterNumber: number,
  isArcFinished: boolean,
  selectedArcIndex: number
) => {
  const memoryUpdates = data.memoryUpdates;
  if (!memoryUpdates) return cloned.memory;

  const nextMemory: StoryMemory = { ...cloned.memory };
  
  if (memoryUpdates.currentPowerStage) {
    nextMemory.currentPowerStage = memoryUpdates.currentPowerStage;
  }

  if (memoryUpdates.newCharacters && memoryUpdates.newCharacters.length > 0) {
    const added = memoryUpdates.newCharacters.map((c: any) => ({
      id: `char-${generateId(9)}`,
      name: c.name,
      role: c.role || 'Neutral figure',
      description: c.description || '',
      relationshipToMC: c.relationshipToMC || 'Neutral',
      status: c.status || 'alive',
      powerLevel: c.powerLevel || undefined,
      abilities: sanitizeGeneratedAbilities(c.abilities),
      faction: c.faction || undefined,
      relevanceState: c.relevanceState || 'active',
      currentRelevance: c.currentRelevance || undefined,
      manifestationImportance: c.manifestationImportance,
      toneMemory: c.toneMemory || undefined,
      firstAppeared: c.firstAppeared || chapterNumber,
      lastMajorInvolvement: c.lastMajorInvolvement || chapterNumber
    }));
    nextMemory.characters = [
      ...(nextMemory.characters || []),
      ...eligibleCodexAdditions(added),
    ];
  }

  if (memoryUpdates.characterStatusUpdates && memoryUpdates.characterStatusUpdates.length > 0) {
    const resolvedRules = memoryUpdates.characterStatusUpdates.map((u: any) => ({
      ...u,
      resolved: resolveEntity(u.name || "", nextMemory.characters || [], "characterStatusUpdate")
    }));

    nextMemory.characters = (nextMemory.characters || []).map(char => {
      const rule = resolvedRules.find((u: any) => u.resolved.resolvedEntityId === char.id);
      if (rule) {
        const nextAbilities = char.abilities || [];
        const generatedAbilities = sanitizeGeneratedAbilities(rule.newAbilities);
        const mergedAbilities = generatedAbilities
          ? Array.from(new Set([...nextAbilities, ...generatedAbilities]))
          : nextAbilities;
        
        let newDesc = char.description;
        if (rule.descriptionAppend) {
          newDesc = newDesc ? `${newDesc} ${rule.descriptionAppend}` : rule.descriptionAppend;
        }

        const powerLevelChanged = rule.newPowerLevel && rule.newPowerLevel !== char.powerLevel;
        const statusChanged = rule.newStatus && rule.newStatus !== char.status;
        const pendingEvolution = powerLevelChanged || statusChanged || char.pendingEvolution || false;
        const evolutionReason = powerLevelChanged ? "Breakthrough in Power Level" : (statusChanged ? "Major Status Change" : char.evolutionReason);

        return {
          ...char,
          description: newDesc,
          status: rule.newStatus || char.status,
          relationshipToMC: rule.newRelationship || char.relationshipToMC,
          powerLevel: rule.newPowerLevel || char.powerLevel,
          abilities: mergedAbilities.length > 0 ? mergedAbilities : undefined,
          relevanceState: rule.relevanceState || char.relevanceState,
          currentRelevance: rule.currentRelevance || char.currentRelevance,
          toneMemory: rule.toneMemory || char.toneMemory,
          lastMajorInvolvement: rule.lastMajorInvolvement || char.lastMajorInvolvement,
          pendingEvolution,
          evolutionReason: pendingEvolution ? evolutionReason : char.evolutionReason,
        };
      }
      return char;
    });
  }

  if (memoryUpdates.factionUpdates && memoryUpdates.factionUpdates.length > 0) {
    const resolvedRules = memoryUpdates.factionUpdates.map((u: any) => ({
      ...u,
      resolved: resolveEntity(u.name || "", nextMemory.factions || [], "factionUpdate")
    }));

    nextMemory.factions = (nextMemory.factions || []).map(f => {
      const rule = resolvedRules.find((u: any) => u.resolved.resolvedEntityId === f.id);
      if (rule) {
        let newDesc = f.description;
        if (rule.descriptionAppend) {
          newDesc = newDesc ? `${newDesc} ${rule.descriptionAppend}` : rule.descriptionAppend;
        }
        return {
          ...f,
          description: newDesc,
          status: rule.statusOverride || f.status,
          relevanceState: rule.relevanceState || f.relevanceState,
          currentRelevance: rule.currentRelevance || f.currentRelevance
        };
      }
      return f;
    });
  }

  if (memoryUpdates.locationUpdates && memoryUpdates.locationUpdates.length > 0) {
    const resolvedRules = memoryUpdates.locationUpdates.map((u: any) => ({
      ...u,
      resolved: resolveEntity(u.name || "", nextMemory.locations || [], "locationUpdate")
    }));

    nextMemory.locations = (nextMemory.locations || []).map(l => {
      const rule = resolvedRules.find((u: any) => u.resolved.resolvedEntityId === l.id);
      if (rule) {
        let newDesc = l.description;
        if (rule.descriptionAppend) {
          newDesc = newDesc ? `${newDesc} ${rule.descriptionAppend}` : rule.descriptionAppend;
        }
        const safetyChanged = rule.safetyLevelOverride && rule.safetyLevelOverride !== l.safetyLevel;
        const pendingEvolution = safetyChanged || l.pendingEvolution || false;
        const evolutionReason = safetyChanged ? "Atmosphere/Safety Shift" : l.evolutionReason;
        return {
          ...l,
          description: newDesc,
          safetyLevel: rule.safetyLevelOverride || l.safetyLevel,
          relevanceState: rule.relevanceState || l.relevanceState,
          currentRelevance: rule.currentRelevance || l.currentRelevance,
          pendingEvolution,
          evolutionReason: pendingEvolution ? evolutionReason : l.evolutionReason,
        };
      }
      return l;
    });
  }

  if (memoryUpdates.artifactUpdates && memoryUpdates.artifactUpdates.length > 0) {
    const resolvedRules = memoryUpdates.artifactUpdates.map((u: any) => ({
      ...u,
      resolved: resolveEntity(u.name || "", nextMemory.artifacts || [], "artifactUpdate")
    }));

    nextMemory.artifacts = (nextMemory.artifacts || []).map(a => {
      const rule = resolvedRules.find((u: any) => u.resolved.resolvedEntityId === a.id);
      if (rule) {
        let newDesc = a.description;
        if (rule.descriptionAppend) {
          newDesc = newDesc ? `${newDesc} ${rule.descriptionAppend}` : rule.descriptionAppend;
        }
        const ownerChanged = rule.newOwner && rule.newOwner !== a.currentOwner;
        const conditionChanged = rule.newCondition && rule.newCondition !== a.condition;
        const locationChanged = rule.newLocation && rule.newLocation !== a.holderLocation;
        const pendingEvolution = ownerChanged || conditionChanged || a.pendingEvolution || false;
        const evolutionReason = ownerChanged
          ? "New Artifact Master"
          : conditionChanged
            ? "Artifact State Change"
            : a.evolutionReason;
        return {
          ...a,
          description: newDesc,
          currentOwner: rule.newOwner || a.currentOwner,
          condition: rule.newCondition || a.condition,
          holderLocation: rule.newLocation || a.holderLocation,
          lastStateChapter: (ownerChanged || conditionChanged || locationChanged)
            ? chapterNumber
            : a.lastStateChapter,
          relevanceState: rule.relevanceState || a.relevanceState,
          currentRelevance: rule.currentRelevance || a.currentRelevance,
          pendingEvolution,
          evolutionReason: pendingEvolution ? evolutionReason : a.evolutionReason,
        };
      }
      return a;
    });
  }

  if (memoryUpdates.newUnresolvedPlotThreads && memoryUpdates.newUnresolvedPlotThreads.length > 0) {
    const currentThreads = nextMemory.unresolvedPlotThreads || [];
    const newThreadObjs = memoryUpdates.newUnresolvedPlotThreads
      .filter((t: string) => !currentThreads.some(ct => (typeof ct === 'string' ? ct : ct.description) === t))
      .map((t: string) => ({
        id: `thread-${generateId(9)}`,
        description: t,
        status: 'active',
        originChapter: chapterNumber
      }));
    nextMemory.unresolvedPlotThreads = [...currentThreads, ...newThreadObjs];
  }

  if (memoryUpdates.resolvedPlotThreads && memoryUpdates.resolvedPlotThreads.length > 0) {
    const currentUnresolved = nextMemory.unresolvedPlotThreads || [];
    const currentResolved = nextMemory.resolvedPlotThreads || [];
    let updatedUnresolved = [...currentUnresolved];
    let updatedResolved = [...currentResolved];

    memoryUpdates.resolvedPlotThreads.forEach((title: string) => {
       const matchedThread = updatedUnresolved.find((t: any) => {
         const desc = typeof t === 'string' ? t : t.description;
         return desc.toLowerCase() === title.toLowerCase();
       });
       
       if (matchedThread) {
         updatedUnresolved = updatedUnresolved.filter(t => t !== matchedThread);
         if (!updatedResolved.some((r: any) => {
           const desc = typeof r === 'string' ? r : r.description;
           return desc.toLowerCase() === title.toLowerCase();
         })) {
           updatedResolved = [...updatedResolved, typeof matchedThread === 'string' ? { description: matchedThread, status: 'resolved' } : {
             ...matchedThread,
             status: 'resolved'
           }];
         }
       }
    });

    nextMemory.unresolvedPlotThreads = updatedUnresolved;
    nextMemory.resolvedPlotThreads = updatedResolved;
  }

  if (memoryUpdates.newFactions && memoryUpdates.newFactions.length > 0) {
    const currentFactions = nextMemory.factions || [];
    const added = memoryUpdates.newFactions.map((f: any) => ({
      id: `fct-${generateId(9)}`,
      name: f.name,
      description: f.description || '',
      alignment: f.alignment || 'Neutral',
      headquarters: f.headquarters || '',
      status: f.status || 'Active',
      relevanceState: f.relevanceState || 'active',
      currentRelevance: f.currentRelevance || undefined,
      manifestationImportance: f.manifestationImportance,
      firstAppeared: chapterNumber
    }));
    const filteredAdded = added.filter((af: any) => {
      if (!isManifestationEligible(af)) return false;
      const res = resolveEntity(af.name, currentFactions, "newFactionCheck");
      return res.resolvedEntityId === null;
    });
    nextMemory.factions = [...currentFactions, ...filteredAdded];
  }

  if (memoryUpdates.newLocations && memoryUpdates.newLocations.length > 0) {
    const currentLocations = nextMemory.locations || [];
    const added = memoryUpdates.newLocations.map((l: any) => ({
      id: `loc-${generateId(9)}`,
      name: l.name,
      description: l.description || '',
      realm: l.realm || '',
      safetyLevel: l.safetyLevel || 'Safe',
      relevanceState: l.relevanceState || 'active',
      currentRelevance: l.currentRelevance || undefined,
      manifestationImportance: l.manifestationImportance,
      firstAppeared: chapterNumber
    }));
    const filteredAdded = added.filter((al: any) => {
      if (!isManifestationEligible(al)) return false;
      const res = resolveEntity(al.name, currentLocations, "newLocationCheck");
      return res.resolvedEntityId === null;
    });
    nextMemory.locations = [...currentLocations, ...filteredAdded];
  }

  if (memoryUpdates.newArtifacts && memoryUpdates.newArtifacts.length > 0) {
    const currentArtifacts = nextMemory.artifacts || [];
    const added = memoryUpdates.newArtifacts.map((a: any) => ({
      id: `art-${generateId(9)}`,
      name: a.name,
      description: a.description || '',
      tier: a.tier || 'Mortal',
      currentOwner: a.currentOwner || 'Unknown',
      relevanceState: a.relevanceState || 'active',
      currentRelevance: a.currentRelevance || undefined,
      manifestationImportance: a.manifestationImportance,
      firstAppeared: chapterNumber
    }));
    const filteredAdded = added.filter((aa: any) => {
      if (!isManifestationEligible(aa)) return false;
      const res = resolveEntity(aa.name, currentArtifacts, "newArtifactCheck");
      return res.resolvedEntityId === null;
    });
    nextMemory.artifacts = [...currentArtifacts, ...filteredAdded];
  }

  const abilityLedgerWarnings: string[] = [];

  if (memoryUpdates.newMCAbilities && memoryUpdates.newMCAbilities.length > 0) {
    let currentAbilities = nextMemory.abilities || [];
    const added = memoryUpdates.newMCAbilities.map((ab: any) => {
      if (typeof ab === 'string') {
        return {
          id: `abil-${generateId(9)}`,
          name: ab,
          description: '',
          acquiredChapter: chapterNumber,
          relevanceState: 'active',
          firstAppeared: chapterNumber
        };
      }
      return {
        id: `abil-${generateId(9)}`,
        name: ab.name || 'Unknown Ability',
        description: ab.description || '',
        source: ab.source || '',
        acquiredChapter: ab.acquiredChapter || chapterNumber,
        acquisitionMethod: ab.acquisitionMethod || '',
        cost: ab.cost || '',
        limits: ab.limits || '',
        masteryLevel: ab.masteryLevel || 'Novice',
        lastUsedChapter: chapterNumber,
        relevanceState: 'active',
        firstAppeared: chapterNumber
      };
    });
    const currentAbilitiesObjects = currentAbilities.map(a => typeof a === 'string' ? { id: a, name: a } : { id: a.id || a.name, name: a.name, aliases: a.aliases });

    // Duplicate acquisitions are MERGED into the existing ledger entry as a
    // progression event instead of being silently dropped (Context Engine 2.5).
    // A duplicate never downgrades a comparable higher mastery level.
    const genuinelyNew: any[] = [];
    for (const newAb of added) {
      const res = resolveEntity(newAb.name, currentAbilitiesObjects, "newAbilityCheck");
      if (res.resolvedEntityId === null) {
        genuinelyNew.push(newAb);
        continue;
      }
      currentAbilities = currentAbilities.map(entry => {
        const entryId = typeof entry === 'string' ? entry : (entry.id || entry.name);
        if (entryId !== res.resolvedEntityId) return entry;
        const ability = normalizeAbilityEntry(entry, chapterNumber);
        const incomingMastery = typeof newAb.masteryLevel === 'string' ? newAb.masteryLevel : undefined;
        const applyMastery = incomingMastery
          && !isMasteryDowngrade(ability.masteryLevel, incomingMastery)
          && incomingMastery !== ability.masteryLevel;
        return {
          ...ability,
          masteryLevel: applyMastery ? incomingMastery : ability.masteryLevel,
          lastUsedChapter: chapterNumber,
          progression: [
            ...(ability.progression || []),
            {
              chapter: chapterNumber,
              fromMastery: ability.masteryLevel,
              toMastery: applyMastery ? incomingMastery : ability.masteryLevel,
              note: 'duplicate acquisition merged',
            },
          ],
        };
      });
      abilityLedgerWarnings.push(
        `Ability "${newAb.name}" was re-acquired in chapter ${chapterNumber}; merged into the existing ledger entry as a progression event.`
      );
    }
    nextMemory.abilities = [...currentAbilities, ...genuinelyNew];
  }

  if (memoryUpdates.mcAbilityUpdates && memoryUpdates.mcAbilityUpdates.length > 0) {
    const currentAbilities = nextMemory.abilities || [];
    const currentAbilitiesObjects = currentAbilities.map(a => typeof a === 'string' ? { id: a, name: a } : { id: a.id || a.name, name: a.name, aliases: a.aliases });

    let updatedAbilities = [...currentAbilities];
    memoryUpdates.mcAbilityUpdates.forEach((update: any) => {
       const res = resolveEntity(update.name || "", currentAbilitiesObjects, "abilityUpdate");
       if (!res.resolvedEntityId) return;

       updatedAbilities = updatedAbilities.map(entry => {
         const entryId = typeof entry === 'string' ? entry : (entry.id || entry.name);
         if (entryId !== res.resolvedEntityId) return entry;

         // Legacy string-form abilities are normalized to full objects before
         // any progression is recorded.
         const ability = normalizeAbilityEntry(entry, chapterNumber);
         const masteryChanged = update.newMasteryLevel
           && update.newMasteryLevel !== ability.masteryLevel;
         if (masteryChanged && isMasteryDowngrade(ability.masteryLevel, update.newMasteryLevel)) {
           abilityLedgerWarnings.push(
             `Ability "${ability.name}" mastery downgrade from "${ability.masteryLevel}" to "${update.newMasteryLevel}" in chapter ${chapterNumber} was ignored.`
           );
           return {
             ...ability,
             lastUsedChapter: update.lastUsedChapter || ability.lastUsedChapter,
           };
         }
         return {
           ...ability,
           masteryLevel: masteryChanged ? update.newMasteryLevel : ability.masteryLevel,
           lastUsedChapter: update.lastUsedChapter || ability.lastUsedChapter,
           progression: masteryChanged
             ? [
                 ...(ability.progression || []),
                 {
                   chapter: chapterNumber,
                   fromMastery: ability.masteryLevel,
                   toMastery: update.newMasteryLevel,
                 },
               ]
             : ability.progression,
         };
       });
    });
    nextMemory.abilities = updatedAbilities;
  }

  if (memoryUpdates.relationshipUpdates && memoryUpdates.relationshipUpdates.length > 0) {
    const currentRelationships = cloned.relationships || [];
    const updatedRelationships = [...currentRelationships];
    
    memoryUpdates.relationshipUpdates.forEach((relUpdate: any) => {
      if (!relUpdate.sourceName || !relUpdate.targetName) return;

      const sourceResolution = resolveEntity(relUpdate.sourceName, nextMemory.characters || [], "relationship_change");
      const targetResolution = resolveEntity(relUpdate.targetName, nextMemory.characters || [], "relationship_change");

      const existingIndex = updatedRelationships.findIndex(r => {
        if (sourceResolution.resolvedEntityId && targetResolution.resolvedEntityId) {
           return r.sourceCharId === sourceResolution.resolvedEntityId && r.targetCharId === targetResolution.resolvedEntityId;
        }
        return r.sourceCharName.toLowerCase() === relUpdate.sourceName.toLowerCase() && 
               r.targetCharName.toLowerCase() === relUpdate.targetName.toLowerCase();
      });
      
      const affinityDelta = Number(relUpdate.affinityDelta) || 0;
      const threatDelta = Number(relUpdate.threatDelta) || 0;

      if (existingIndex >= 0) {
        const existing = updatedRelationships[existingIndex];
        updatedRelationships[existingIndex] = {
          ...existing,
          sourceCharId: sourceResolution.resolvedEntityId || existing.sourceCharId,
          targetCharId: targetResolution.resolvedEntityId || existing.targetCharId,
          affinity: Math.max(-100, Math.min(100, existing.affinity + affinityDelta)),
          threat: Math.max(-100, Math.min(100, (existing.threat || 0) + threatDelta)),
          description: relUpdate.reason || existing.description,
          updatedAt: new Date().toISOString()
        };
      } else {
        updatedRelationships.push({
           id: `rel-${generateId(9)}`,
           sourceCharId: sourceResolution.resolvedEntityId || 'unknown',
           sourceCharName: relUpdate.sourceName,
           targetCharId: targetResolution.resolvedEntityId || 'unknown',
           targetCharName: relUpdate.targetName,
           affinity: Math.max(-100, Math.min(100, affinityDelta)),
           threat: Math.max(-100, Math.min(100, threatDelta)),
           description: relUpdate.reason || '',
           updatedAt: new Date().toISOString()
        });
      }
    });
    cloned.relationships = updatedRelationships;
  }

  let violationWarnings: string[] = [];
  if (memoryUpdates.powerSystemViolationFlags && memoryUpdates.powerSystemViolationFlags.length > 0) {
    violationWarnings = memoryUpdates.powerSystemViolationFlags;
  }

  const linterWarnings = runMemoryLinter(cloned.memory, nextMemory, data.chapterText);
  const allWarnings = [...violationWarnings, ...abilityLedgerWarnings, ...linterWarnings];
  
  if (allWarnings.length > 0) {
    nextMemory.memoryWarnings = [...(nextMemory.memoryWarnings || []), ...allWarnings];
  }

  if (isArcFinished) {
    const arcSummary = cloned.arcs[selectedArcIndex].summary || "A new phase of destiny has concluded.";
    if (nextMemory.characters) {
      nextMemory.characters = nextMemory.characters.map(c => c.pendingEvolution ? { ...c, evolutionReady: true, availableVisualUpdate: true, pendingEvolution: false, arcAccumulation: arcSummary } : c);
    }
    if (nextMemory.locations) {
      nextMemory.locations = nextMemory.locations.map(l => l.pendingEvolution ? { ...l, evolutionReady: true, availableVisualUpdate: true, pendingEvolution: false, arcAccumulation: arcSummary } : l);
    }
    if (nextMemory.artifacts) {
      nextMemory.artifacts = nextMemory.artifacts.map(a => a.pendingEvolution ? { ...a, evolutionReady: true, availableVisualUpdate: true, pendingEvolution: false, arcAccumulation: arcSummary } : a);
    }
  }

  return nextMemory;
};
