import { routeTextGeneration, routeTextGenerationStream, cleanAndParseJSON } from "../aiRouter";
import { PROMPTS } from "./prompts";
import { extractMetadataSchema } from "./schemas";
import { cleanChapterResponse, rankRelevantEntities } from "./helpers";
import { StoryWorld, Chapter, StoryMemory } from "../types";

export function runMemoryLinter(oldMemory: any, newMemory: any, chapterText: string): string[] {
  const warnings: string[] = [];
  if (oldMemory.currentPowerStage && newMemory.currentPowerStage && oldMemory.currentPowerStage !== newMemory.currentPowerStage) {
    if (!chapterText.toLowerCase().includes('breakthrough') && !chapterText.toLowerCase().includes('ascend')) {
      warnings.push(`Warning: Power stage changed from ${oldMemory.currentPowerStage} to ${newMemory.currentPowerStage} without explicit breakthrough text.`);
    }
  }
  return warnings;
}

export async function orchestrateChapterGeneration(
  reqBody: any,
  getCustomKeys: (req: any) => any,
  req: any,
  res: any
) {
  const {
    activeStory,
    chapterNumber,
    apiHeaders,
    routingConfig,
    pastSummaries
  } = reqBody;

  const targetArcIndex = activeStory.arcs.findIndex((arc: any) => arc.chapters.some((c: any) => c.number === chapterNumber));
  const currentArc = activeStory.arcs[targetArcIndex];
  const targetChapter = currentArc.chapters.find((c: any) => c.number === chapterNumber);

  // 1. Tension Meter Logic
  const recentChapters = activeStory.arcs
    .flatMap((a: any) => a.chapters)
    .filter((c: any) => c.number < targetChapter.number && c.hasContent)
    .sort((a: any, b: any) => b.number - a.number)
    .slice(0, 5);
    
  let pacingDirective = '';
  if (recentChapters.length > 0) {
    let accumulatedTension = 0;
    recentChapters.forEach((c: any, index: number) => {
      const tension = c.cuePayload?.tension ?? 5;
      const danger = c.cuePayload?.danger ?? 5;
      const combined = (tension + danger) / 2;
      const weight = Math.pow(0.8, index);
      accumulatedTension += combined * weight;
    });
    const maxPossibleTension = 10 * ((1 - Math.pow(0.8, recentChapters.length)) / (1 - 0.8));
    const normalizedFatigue = (accumulatedTension / maxPossibleTension) * 10;
    if (normalizedFatigue >= 8.5) {
      pacingDirective = "CRITICAL PACING MANDATE: Tension fatigue is extremely high. You MUST pivot into a 'breathing room' chapter.";
    } else if (normalizedFatigue >= 7.0) {
      pacingDirective = "PACING SUGGESTION: Tension has been high recently. Consider naturally transitioning into a lower-stakes scenario soon.";
    } else if (normalizedFatigue <= 3.5) {
      pacingDirective = "PACING SUGGESTION: The story has been peaceful for a while. Introduce a new inciting incident.";
    }
  }

  // 2. Prepare Prompt
  const activeFatePressure = activeStory.fatePressure || (activeStory.hardcoreFateMode ? 'Hardcore' : 'Balanced');
  const pastSummariesStr = pastSummaries && pastSummaries.length > 0 
    ? pastSummaries.join("\n") 
    : "This is the very first chapter of the story arc! Set the scene dramatically.";

  const lastSummary = pastSummaries && pastSummaries.length > 0 ? pastSummaries[pastSummaries.length - 1] : undefined;
  
  let rThreadsStream = activeStory.memory.unresolvedPlotThreads || [];
  if (rThreadsStream.length > 30) rThreadsStream = [...rThreadsStream.slice(0, 10), ...rThreadsStream.slice(-20)];
  
  const formattedThreads = rThreadsStream.map((t: any) => {
    if (typeof t === 'string') return t;
    if (t && t.description) {
      if (typeof t.originChapter === 'number' && chapterNumber > t.originChapter) {
        const age = chapterNumber - t.originChapter;
        if (age >= 1) return `${t.description} (Thread open for ${age} chapters)`;
      }
      return t.description;
    }
    return String(t);
  });

  const safeStr = (s: string|undefined, max: number = 3000) => (s && s.length > max) ? s.substring(0, max) + "..." : s;

  const memoryJsonStr = JSON.stringify({
    powerSystem: safeStr(activeStory.memory.powerSystem, 4000),
    currentPowerStage: safeStr(activeStory.memory.currentPowerStage, 1000),
    worldRules: Array.isArray(activeStory.memory.worldRules) ? activeStory.memory.worldRules.slice(0, 20).map((r: any) => safeStr(r, 1000)) : safeStr(activeStory.memory.worldRules, 4000),
    unresolvedPlotThreads: formattedThreads,
    characters: rankRelevantEntities(activeStory.memory.characters, activeStory.mcName, lastSummary, targetChapter.premise, []),
    factions: rankRelevantEntities(activeStory.memory.factions, activeStory.mcName, lastSummary, targetChapter.premise, []),
    locations: rankRelevantEntities(activeStory.memory.locations, activeStory.mcName, lastSummary, targetChapter.premise, []),
    artifacts: rankRelevantEntities(activeStory.memory.artifacts, activeStory.mcName, lastSummary, targetChapter.premise, [])
  }, null, 2);

  const systemInstruction = PROMPTS.chapter.system;
  const userPrompt = PROMPTS.chapter.userPrompt(
    targetChapter.number,
    targetChapter.title,
    targetChapter.premise,
    activeStory.mcName,
    activeStory.genre,
    activeStory.customPremise,
    memoryJsonStr,
    pastSummariesStr,
    true,
    activeStory.blueprint?.styleBible,
    activeStory.blueprint?.tropeRules,
    activeStory.intake?.storyTags
  );

  let finalUserPrompt = userPrompt;
  if (pacingDirective) {
    finalUserPrompt += `\n\n=========================================\nAI DIRECTOR PACING INSTRUCTION\n=========================================\n${pacingDirective}\n=========================================`;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let accumulatedRaw = "";
  
  try {
    const stream = await routeTextGenerationStream(
      "storyMaker",
      systemInstruction,
      finalUserPrompt,
      "generate-chapter-stream",
      routingConfig,
      getCustomKeys(req)
    );

    for await (const chunk of stream) {
      if (chunk) {
        accumulatedRaw += chunk;
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }
    }
  } catch (error: any) {
    console.error("Stream generation error:", error);
    res.write(`data: ${JSON.stringify({ error: error.message || "Internal server error" })}\n\n`);
    res.end();
    return;
  }

  // 3. Extract Metadata
  let data: any = { chapterText: "", blocks: [], summary: "An ethereal mist obscures the historical records.", statsChangeMessage: "None", memoryUpdates: {} };
  const textHeader = "---CHAPTER_BLOCKS---";
  let rawBlocksStr = accumulatedRaw;
  if (accumulatedRaw.includes(textHeader)) {
    const startIndex = accumulatedRaw.indexOf(textHeader) + textHeader.length;
    rawBlocksStr = accumulatedRaw.substring(startIndex).trim();
  }

  try {
    const extractSystemInstruction = PROMPTS.extractMetadata.system;
    const extractUserPrompt = PROMPTS.extractMetadata.userPrompt(chapterNumber, targetChapter.title || "Unknown", rawBlocksStr);
    const metadataResponse = await routeTextGeneration(
      "storyMaker",
      extractSystemInstruction,
      extractUserPrompt,
      "extract-chapter-metadata",
      routingConfig,
      getCustomKeys(req),
      extractMetadataSchema
    );
    const extractedData = cleanChapterResponse(metadataResponse);
    data = { ...data, ...extractedData };
  } catch (err: any) {
    console.warn("Failed to extract metadata:", err);
  }

  // Parse blocks
  try {
    const extractJsonBlocks = (str: string) => {
      const regex = /```json\s*([\s\S]*?)\s*```/g;
      let blocks = [];
      let match;
      while ((match = regex.exec(str)) !== null) {
        try { blocks.push(JSON.parse(match[1])); } catch (e) {}
      }
      return blocks;
    };
    const parsedBlocks = extractJsonBlocks(rawBlocksStr);
    data.blocks = parsedBlocks;
    if (parsedBlocks.length > 0) {
      data.chapterText = parsedBlocks.map((b: any) => b.text).join('\n\n');
    } else {
      data.chapterText = rawBlocksStr.replace(/```json/gi, '').replace(/```/g, '').trim();
    }
  } catch (e) {
    data.chapterText = accumulatedRaw;
  }

  // 4. Update Memory
  const cloned = JSON.parse(JSON.stringify(activeStory)) as StoryWorld;
  cloned.arcs = cloned.arcs.map((arc: any, aIdx: number) => {
    if (aIdx !== targetArcIndex) return arc;
    return {
      ...arc,
      summary: data.arcSummary || arc.summary,
      chapters: arc.chapters.map((ch: any) => {
        if (ch.number !== chapterNumber) return ch;
        return {
          ...ch,
          _isNewContent: true,
          generatedContent: data.chapterText,
          blocks: data.blocks,
          summary: data.summary,
          statsChangeMessage: data.statsChangeMessage !== 'None' ? data.statsChangeMessage : undefined,
          cuePayload: data.cuePayload,
          status: 'read'
        };
      })
    };
  });

  const isArcFinished = cloned.arcs[targetArcIndex].chapters.every((ch: any) => ch.hasContent || !!ch.generatedContent);
  if (isArcFinished) cloned.arcs[targetArcIndex].isCompleted = true;

  const memoryUpdates = data.memoryUpdates;
  if (memoryUpdates) {
    const nextMemory = { ...cloned.memory };
    
    if (memoryUpdates.currentPowerStage) nextMemory.currentPowerStage = memoryUpdates.currentPowerStage;

    if (memoryUpdates.newCharacters?.length > 0) {
      const added = memoryUpdates.newCharacters.map((c: any) => ({
        id: `char-${Math.random().toString(36).substr(2, 9)}`,
        name: c.name, role: c.role || 'Neutral figure', description: c.description || '', relationshipToMC: c.relationshipToMC || 'Neutral', status: c.status || 'alive', powerLevel: c.powerLevel || undefined, abilities: c.abilities || undefined, faction: c.faction || undefined, relevanceState: c.relevanceState || 'active', currentRelevance: c.currentRelevance || undefined, toneMemory: c.toneMemory || undefined, firstAppeared: c.firstAppeared || chapterNumber, lastMajorInvolvement: c.lastMajorInvolvement || chapterNumber
      }));
      nextMemory.characters = [...(nextMemory.characters || []), ...added];
    }

    if (memoryUpdates.characterStatusUpdates?.length > 0) {
      nextMemory.characters = (nextMemory.characters || []).map((char: any) => {
        const rule = memoryUpdates.characterStatusUpdates.find((u: any) => u.name?.toLowerCase() === char.name?.toLowerCase());
        if (rule) {
          const mergedAbilities = rule.newAbilities ? Array.from(new Set([...(char.abilities || []), ...rule.newAbilities])) : char.abilities;
          let newDesc = char.description;
          if (rule.descriptionAppend) newDesc = newDesc ? `${newDesc} ${rule.descriptionAppend}` : rule.descriptionAppend;
          const powerLevelChanged = rule.newPowerLevel && rule.newPowerLevel !== char.powerLevel;
          const statusChanged = rule.newStatus && rule.newStatus !== char.status;
          return {
            ...char, description: newDesc, status: rule.newStatus || char.status, relationshipToMC: rule.newRelationship || char.relationshipToMC, powerLevel: rule.newPowerLevel || char.powerLevel, abilities: mergedAbilities?.length > 0 ? mergedAbilities : undefined, evolutionReady: powerLevelChanged || statusChanged || char.evolutionReady, evolutionReason: powerLevelChanged ? "Breakthrough in Power Level" : (statusChanged ? "Major Status Change" : char.evolutionReason), availableVisualUpdate: powerLevelChanged || statusChanged || char.evolutionReady
          };
        }
        return char;
      });
    }

    if (memoryUpdates.factionUpdates?.length > 0) {
      nextMemory.factions = (nextMemory.factions || []).map((f: any) => {
        const rule = memoryUpdates.factionUpdates.find((u: any) => u.name?.toLowerCase() === f.name?.toLowerCase());
        if (rule) {
          let newDesc = f.description;
          if (rule.descriptionAppend) newDesc = newDesc ? `${newDesc} ${rule.descriptionAppend}` : rule.descriptionAppend;
          return { ...f, description: newDesc, status: rule.statusOverride || f.status };
        }
        return f;
      });
    }

    if (memoryUpdates.locationUpdates?.length > 0) {
      nextMemory.locations = (nextMemory.locations || []).map((l: any) => {
        const rule = memoryUpdates.locationUpdates.find((u: any) => u.name?.toLowerCase() === l.name?.toLowerCase());
        if (rule) {
          let newDesc = l.description;
          if (rule.descriptionAppend) newDesc = newDesc ? `${newDesc} ${rule.descriptionAppend}` : rule.descriptionAppend;
          const safetyChanged = rule.safetyLevelOverride && rule.safetyLevelOverride !== l.safetyLevel;
          return { ...l, description: newDesc, safetyLevel: rule.safetyLevelOverride || l.safetyLevel, evolutionReady: safetyChanged || l.evolutionReady, evolutionReason: safetyChanged ? "Atmosphere/Safety Shift" : l.evolutionReason, availableVisualUpdate: safetyChanged || l.evolutionReady };
        }
        return l;
      });
    }

    if (memoryUpdates.artifactUpdates?.length > 0) {
      nextMemory.artifacts = (nextMemory.artifacts || []).map((a: any) => {
        const rule = memoryUpdates.artifactUpdates.find((u: any) => u.name?.toLowerCase() === a.name?.toLowerCase());
        if (rule) {
          let newDesc = a.description;
          if (rule.descriptionAppend) newDesc = newDesc ? `${newDesc} ${rule.descriptionAppend}` : rule.descriptionAppend;
          const ownerChanged = rule.newOwner && rule.newOwner !== a.currentOwner;
          return { ...a, description: newDesc, currentOwner: rule.newOwner || a.currentOwner, evolutionReady: ownerChanged || a.evolutionReady, evolutionReason: ownerChanged ? "New Artifact Master" : a.evolutionReason, availableVisualUpdate: ownerChanged || a.evolutionReady };
        }
        return a;
      });
    }

    if (memoryUpdates.newUnresolvedPlotThreads?.length > 0) {
      const currentThreads = nextMemory.unresolvedPlotThreads || [];
      const newThreadObjs = memoryUpdates.newUnresolvedPlotThreads
        .filter((t: string) => !currentThreads.some((ct: any) => (typeof ct === 'string' ? ct : ct.description) === t))
        .map((t: string) => ({ id: `thread-${Math.random().toString(36).substr(2, 9)}`, description: t, status: 'active', originChapter: chapterNumber }));
      nextMemory.unresolvedPlotThreads = [...currentThreads, ...newThreadObjs];
    }

    if (memoryUpdates.resolvedPlotThreads?.length > 0) {
      let updatedUnresolved = [...(nextMemory.unresolvedPlotThreads || [])];
      let updatedResolved = [...(nextMemory.resolvedPlotThreads || [])];
      memoryUpdates.resolvedPlotThreads.forEach((title: string) => {
         const matchedThread = updatedUnresolved.find((t: any) => {
           const desc = typeof t === 'string' ? t : t.description;
           return desc.toLowerCase() === title.toLowerCase();
         });
         if (matchedThread) {
           updatedUnresolved = updatedUnresolved.filter((t: any) => t !== matchedThread);
           if (!updatedResolved.some((r: any) => { const desc = typeof r === 'string' ? r : r.description; return desc.toLowerCase() === title.toLowerCase(); })) {
             updatedResolved = [...updatedResolved, typeof matchedThread === 'string' ? { description: matchedThread, status: 'resolved' } : { ...matchedThread, status: 'resolved' }];
           }
         }
      });
      nextMemory.unresolvedPlotThreads = updatedUnresolved;
      nextMemory.resolvedPlotThreads = updatedResolved;
    }

    if (memoryUpdates.newFactions?.length > 0) {
      const currentFactions = nextMemory.factions || [];
      const added = memoryUpdates.newFactions.map((f: any) => ({
        id: `fct-${Math.random().toString(36).substr(2, 9)}`, name: f.name, description: f.description || '', alignment: f.alignment || 'Neutral', headquarters: f.headquarters || '', status: f.status || 'Active', relevanceState: f.relevanceState || 'active', firstAppeared: chapterNumber
      }));
      nextMemory.factions = [...currentFactions, ...added.filter((af: any) => !currentFactions.some((cf: any) => cf.name?.toLowerCase() === af.name?.toLowerCase()))];
    }

    if (memoryUpdates.newLocations?.length > 0) {
      const currentLocations = nextMemory.locations || [];
      const added = memoryUpdates.newLocations.map((l: any) => ({
        id: `loc-${Math.random().toString(36).substr(2, 9)}`, name: l.name, description: l.description || '', realm: l.realm || '', safetyLevel: l.safetyLevel || 'Safe', relevanceState: l.relevanceState || 'active', firstAppeared: chapterNumber
      }));
      nextMemory.locations = [...currentLocations, ...added.filter((al: any) => !currentLocations.some((cl: any) => cl.name?.toLowerCase() === al.name?.toLowerCase()))];
    }

    if (memoryUpdates.newArtifacts?.length > 0) {
      const currentArtifacts = nextMemory.artifacts || [];
      const added = memoryUpdates.newArtifacts.map((a: any) => ({
        id: `art-${Math.random().toString(36).substr(2, 9)}`, name: a.name, description: a.description || '', tier: a.tier || 'Mortal', currentOwner: a.currentOwner || 'Unknown', relevanceState: a.relevanceState || 'active', firstAppeared: chapterNumber
      }));
      nextMemory.artifacts = [...currentArtifacts, ...added.filter((aa: any) => !currentArtifacts.some((ca: any) => ca.name?.toLowerCase() === aa.name?.toLowerCase()))];
    }

    if (memoryUpdates.newMCAbilities?.length > 0) {
      const currentAbilities = nextMemory.abilities || [];
      nextMemory.abilities = [...currentAbilities, ...memoryUpdates.newMCAbilities.filter((ab: string) => !currentAbilities.includes(ab))];
    }

    if (memoryUpdates.relationshipUpdates?.length > 0) {
      const currentRelationships = cloned.relationships || [];
      const updatedRelationships = [...currentRelationships];
      memoryUpdates.relationshipUpdates.forEach((relUpdate: any) => {
        if (!relUpdate.sourceName || !relUpdate.targetName) return;
        const existingIndex = updatedRelationships.findIndex(r => r.sourceCharName.toLowerCase() === relUpdate.sourceName.toLowerCase() && r.targetCharName.toLowerCase() === relUpdate.targetName.toLowerCase());
        const affinityDelta = Number(relUpdate.affinityDelta) || 0;
        const threatDelta = Number(relUpdate.threatDelta) || 0;
        if (existingIndex >= 0) {
          const existing = updatedRelationships[existingIndex];
          updatedRelationships[existingIndex] = { ...existing, affinity: Math.max(-100, Math.min(100, existing.affinity + affinityDelta)), threat: Math.max(-100, Math.min(100, (existing.threat || 0) + threatDelta)), description: relUpdate.reason || existing.description, updatedAt: new Date().toISOString() };
        } else {
          updatedRelationships.push({ id: `rel-${Math.random().toString(36).substr(2, 9)}`, sourceCharId: 'unknown', sourceCharName: relUpdate.sourceName, targetCharId: 'unknown', targetCharName: relUpdate.targetName, affinity: Math.max(-100, Math.min(100, affinityDelta)), threat: Math.max(-100, Math.min(100, threatDelta)), description: relUpdate.reason || '', updatedAt: new Date().toISOString() });
        }
      });
      cloned.relationships = updatedRelationships;
    }

    const linterWarnings = runMemoryLinter(cloned.memory, nextMemory, data.chapterText);
    const allWarnings = [...(memoryUpdates.powerSystemViolationFlags || []), ...linterWarnings];
    if (allWarnings.length > 0) nextMemory.memoryWarnings = [...(nextMemory.memoryWarnings || []), ...allWarnings];
    cloned.memory = nextMemory;
  }
  cloned.updatedAt = new Date().toISOString();

  res.write(`data: ${JSON.stringify({ type: 'complete', story: cloned, chapterData: data })}\n\n`);
  res.end();
}
