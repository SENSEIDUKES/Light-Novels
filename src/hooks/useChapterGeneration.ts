import { useAppStore } from '../store/useAppStore';
import { retrieveRelevantContext, generateEmbedding } from '../lib/rag';
import { Story, StoryMemory, Chapter } from '../types';
import { storyStorage } from '../lib/storage';
import { awardQi } from '../lib/qi';
import { getApiHeaders, extractJsonBlocks, runMemoryLinter } from './storyEngineHelpers';

export const useChapterGeneration = () => {
  const store = useAppStore();

  const handleGenerateChapter = async (chapterNumber: number) => {
    const activeStory = store.stories.find(s => s.id === store.activeStoryId);
    if (!activeStory) return;
    store.setGenerationPhase('chapter');
    store.setIsGenerating(true);
    store.setAppError(null);

    const selectedArcIndex = activeStory.arcs.findIndex(arc => arc.chapters.some(c => c.number === chapterNumber));
    if (selectedArcIndex === -1) return;

    const currentArc = activeStory.arcs[selectedArcIndex];
    const targetChapter = currentArc.chapters.find(c => c.number === chapterNumber);
    if (!targetChapter) return;

    try {
      store.setActiveAgentId('scout');
      const apiHeaders = await getApiHeaders();

      const pastSummaries = await retrieveRelevantContext(
        targetChapter.premise || activeStory.customPremise,
        chapterNumber,
        activeStory,
        apiHeaders,
        5
      );

      store.setActiveAgentId('versa');
      const response = await fetch('/api/generate-chapter-stream', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          mcName: activeStory.mcName,
          genre: activeStory.genre,
          customPremise: activeStory.customPremise,
          memory: activeStory.memory,
          pastSummaries,
          currentChapter: {
            number: targetChapter.number,
            title: targetChapter.title,
            premise: targetChapter.premise
          },
          routingConfig: store.routingConfig.storyMaker
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Meridian clash in chapter generation. Status: ${response.status}`);
      }

      if (!response.body) throw new Error("No streaming body available.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let accumulatedRaw = "";
      let buffer = "";

      const textHeader = "---CHAPTER_BLOCKS---";

      while(true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        
        let lines = buffer.split('\n');
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const parsed = JSON.parse(line.substring(6));
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.chunk) {
                accumulatedRaw += parsed.chunk;
                
                let currentChapterText = "";
                let blocksData: any[] = [];
                let rawBlocksStr = accumulatedRaw;

                if (accumulatedRaw.includes(textHeader)) {
                  const startIndex = accumulatedRaw.indexOf(textHeader) + textHeader.length;
                  rawBlocksStr = accumulatedRaw.substring(startIndex).trim();
                }

                blocksData = extractJsonBlocks(rawBlocksStr);
                
                if (blocksData.length > 0) {
                   currentChapterText = blocksData.map(b => b.text).join('\n\n');
                } else {
                   currentChapterText = rawBlocksStr.replace(/```json/gi, '').replace(/```/g, '').trim();
                }

                if (!currentChapterText) {
                   currentChapterText = accumulatedRaw;
                }

                store.setStreamingChapter({
                  number: chapterNumber,
                  content: currentChapterText || "Condensing celestial aura...",
                  blocks: blocksData.length > 0 ? blocksData : undefined
                });
              }
            } catch (e: any) {
              if (e.message && e.message !== "Unexpected end of JSON input") {
                console.error("Stream parse error:", e);
              }
            }
          }
        }
      }

      let data: any = { chapterText: "", blocks: [], summary: "An ethereal mist obscures the historical records.", statsChangeMessage: "None", memoryUpdates: {} };
      
      let rawBlocksStr = accumulatedRaw;

      if (accumulatedRaw.includes(textHeader)) {
        const startIndex = accumulatedRaw.indexOf(textHeader) + textHeader.length;
        rawBlocksStr = accumulatedRaw.substring(startIndex).trim();
      }

      const parsedBlocks = extractJsonBlocks(rawBlocksStr);
      data.blocks = parsedBlocks;
      
      if (parsedBlocks.length > 0) {
        data.chapterText = parsedBlocks.map((b: any) => b.text).join('\n\n');
      } else {
        data.chapterText = rawBlocksStr.replace(/```json/gi, '').replace(/```/g, '').trim();
      }
      
      if (!data.chapterText) {
        data.chapterText = accumulatedRaw;
      }

      store.setStreamingChapter({
         number: chapterNumber,
         content: data.chapterText,
         blocks: data.blocks
      });

      const extractResponse = await fetch('/api/extract-chapter-metadata', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          chapterNumber: targetChapter.number,
          title: targetChapter.title,
          chapterText: rawBlocksStr,
          routingConfig: store.routingConfig.storyMaker
        })
      });

      if (!extractResponse.ok) {
         console.warn("Failed to extract chapter metadata explicitly. Setting defaults.");
      } else {
         const extractedData = await extractResponse.json();
         data = { ...data, ...extractedData };
      }

      let newChapterEmbedding;
      if (data.summary) {
        newChapterEmbedding = await generateEmbedding(data.summary, apiHeaders);
      }

      const freshStories = await storyStorage.getStories();
      const updatedStories = freshStories.map((s: Story) => {
        if (s.id !== activeStory.id) return s;

        const cloned = { ...s };
        
        cloned.arcs = cloned.arcs.map((arc, aIdx) => {
          if (aIdx !== selectedArcIndex) return arc;
          return {
            ...arc,
            summary: data.arcSummary || arc.summary,
            chapters: arc.chapters.map((ch: Chapter) => {
              if (ch.number !== chapterNumber) return ch;
              return {
                ...ch,
                _isNewContent: true,
                generatedContent: data.chapterText,
                blocks: data.blocks,
                summary: data.summary,
                embedding: newChapterEmbedding,
                statsChangeMessage: data.statsChangeMessage !== 'None' ? data.statsChangeMessage : undefined,
                cuePayload: data.cuePayload,
                status: 'read' as const
              };
            })
          };
        });

        const isArcFinished = cloned.arcs[selectedArcIndex].chapters.every((ch: Chapter) => ch.hasContent || !!ch.generatedContent);
        if (isArcFinished) {
          cloned.arcs[selectedArcIndex].isCompleted = true;
        }

        const memoryUpdates = data.memoryUpdates;
        if (memoryUpdates) {
          const nextMemory: StoryMemory = { ...cloned.memory };
          
          if (memoryUpdates.currentPowerStage) {
            nextMemory.currentPowerStage = memoryUpdates.currentPowerStage;
          }

          if (memoryUpdates.newCharacters && memoryUpdates.newCharacters.length > 0) {
            const added = memoryUpdates.newCharacters.map((c: any) => ({
              id: `char-${Math.random().toString(36).substr(2, 9)}`,
              name: c.name,
              role: c.role || 'Neutral figure',
              description: c.description || '',
              relationshipToMC: c.relationshipToMC || 'Neutral',
              status: c.status || 'alive',
              powerLevel: c.powerLevel || undefined,
              abilities: c.abilities || undefined,
              faction: c.faction || undefined,
              relevanceState: c.relevanceState || 'active',
              currentRelevance: c.currentRelevance || undefined,
              toneMemory: c.toneMemory || undefined,
              firstAppeared: c.firstAppeared || chapterNumber,
              lastMajorInvolvement: c.lastMajorInvolvement || chapterNumber
            }));
            nextMemory.characters = [...(nextMemory.characters || []), ...added];
          }

          if (memoryUpdates.characterStatusUpdates && memoryUpdates.characterStatusUpdates.length > 0) {
            nextMemory.characters = (nextMemory.characters || []).map(char => {
              const rule = memoryUpdates.characterStatusUpdates.find((u: any) => u.name?.toLowerCase() === char.name?.toLowerCase());
              if (rule) {
                const nextAbilities = char.abilities || [];
                const mergedAbilities = rule.newAbilities 
                  ? Array.from(new Set([...nextAbilities, ...rule.newAbilities]))
                  : nextAbilities;
                
                let newDesc = char.description;
                if (rule.descriptionAppend) {
                  newDesc = newDesc ? `${newDesc} ${rule.descriptionAppend}` : rule.descriptionAppend;
                }

                const powerLevelChanged = rule.newPowerLevel && rule.newPowerLevel !== char.powerLevel;
                const statusChanged = rule.newStatus && rule.newStatus !== char.status;
                const evolutionReady = powerLevelChanged || statusChanged || char.evolutionReady || false;
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
                  evolutionReady: evolutionReady,
                  evolutionReason: evolutionReason,
                  availableVisualUpdate: evolutionReady
                };
              }
              return char;
            });
          }

          if (memoryUpdates.factionUpdates && memoryUpdates.factionUpdates.length > 0) {
            nextMemory.factions = (nextMemory.factions || []).map(f => {
              const rule = memoryUpdates.factionUpdates.find((u: any) => u.name?.toLowerCase() === f.name?.toLowerCase());
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
            nextMemory.locations = (nextMemory.locations || []).map(l => {
              const rule = memoryUpdates.locationUpdates.find((u: any) => u.name?.toLowerCase() === l.name?.toLowerCase());
              if (rule) {
                let newDesc = l.description;
                if (rule.descriptionAppend) {
                  newDesc = newDesc ? `${newDesc} ${rule.descriptionAppend}` : rule.descriptionAppend;
                }
                const safetyChanged = rule.safetyLevelOverride && rule.safetyLevelOverride !== l.safetyLevel;
                const evolutionReady = safetyChanged || l.evolutionReady || false;
                const evolutionReason = safetyChanged ? "Atmosphere/Safety Shift" : l.evolutionReason;
                return {
                  ...l,
                  description: newDesc,
                  safetyLevel: rule.safetyLevelOverride || l.safetyLevel,
                  relevanceState: rule.relevanceState || l.relevanceState,
                  currentRelevance: rule.currentRelevance || l.currentRelevance,
                  evolutionReady,
                  evolutionReason,
                  availableVisualUpdate: evolutionReady
                };
              }
              return l;
            });
          }

          if (memoryUpdates.artifactUpdates && memoryUpdates.artifactUpdates.length > 0) {
            nextMemory.artifacts = (nextMemory.artifacts || []).map(a => {
              const rule = memoryUpdates.artifactUpdates.find((u: any) => u.name?.toLowerCase() === a.name?.toLowerCase());
              if (rule) {
                let newDesc = a.description;
                if (rule.descriptionAppend) {
                  newDesc = newDesc ? `${newDesc} ${rule.descriptionAppend}` : rule.descriptionAppend;
                }
                const ownerChanged = rule.newOwner && rule.newOwner !== a.currentOwner;
                const evolutionReady = ownerChanged || a.evolutionReady || false;
                const evolutionReason = ownerChanged ? "New Artifact Master" : a.evolutionReason;
                return {
                  ...a,
                  description: newDesc,
                  currentOwner: rule.newOwner || a.currentOwner,
                  relevanceState: rule.relevanceState || a.relevanceState,
                  currentRelevance: rule.currentRelevance || a.currentRelevance,
                  evolutionReady,
                  evolutionReason,
                  availableVisualUpdate: evolutionReady
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
                id: `thread-${Math.random().toString(36).substr(2, 9)}`,
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
              id: `fct-${Math.random().toString(36).substr(2, 9)}`,
              name: f.name,
              description: f.description || '',
              alignment: f.alignment || 'Neutral',
              headquarters: f.headquarters || '',
              status: f.status || 'Active',
              relevanceState: f.relevanceState || 'active',
              currentRelevance: f.currentRelevance || undefined,
              firstAppeared: chapterNumber
            }));
            const filteredAdded = added.filter((af: any) => !currentFactions.some((cf: any) => cf.name?.toLowerCase() === af.name?.toLowerCase()));
            nextMemory.factions = [...currentFactions, ...filteredAdded];
          }

          if (memoryUpdates.newLocations && memoryUpdates.newLocations.length > 0) {
            const currentLocations = nextMemory.locations || [];
            const added = memoryUpdates.newLocations.map((l: any) => ({
              id: `loc-${Math.random().toString(36).substr(2, 9)}`,
              name: l.name,
              description: l.description || '',
              realm: l.realm || '',
              safetyLevel: l.safetyLevel || 'Safe',
              relevanceState: l.relevanceState || 'active',
              currentRelevance: l.currentRelevance || undefined,
              firstAppeared: chapterNumber
            }));
            const filteredAdded = added.filter((al: any) => !currentLocations.some((cl: any) => cl.name?.toLowerCase() === al.name?.toLowerCase()));
            nextMemory.locations = [...currentLocations, ...filteredAdded];
          }

          if (memoryUpdates.newArtifacts && memoryUpdates.newArtifacts.length > 0) {
            const currentArtifacts = nextMemory.artifacts || [];
            const added = memoryUpdates.newArtifacts.map((a: any) => ({
              id: `art-${Math.random().toString(36).substr(2, 9)}`,
              name: a.name,
              description: a.description || '',
              tier: a.tier || 'Mortal',
              currentOwner: a.currentOwner || 'Unknown',
              relevanceState: a.relevanceState || 'active',
              currentRelevance: a.currentRelevance || undefined,
              firstAppeared: chapterNumber
            }));
            const filteredAdded = added.filter((aa: any) => !currentArtifacts.some((ca: any) => ca.name?.toLowerCase() === aa.name?.toLowerCase()));
            nextMemory.artifacts = [...currentArtifacts, ...filteredAdded];
          }

          if (memoryUpdates.newMCAbilities && memoryUpdates.newMCAbilities.length > 0) {
            const currentAbilities = nextMemory.abilities || [];
            const filteredAbilities = memoryUpdates.newMCAbilities.filter((ab: string) => !currentAbilities.includes(ab));
            nextMemory.abilities = [...currentAbilities, ...filteredAbilities];
          }

          if (memoryUpdates.relationshipUpdates && memoryUpdates.relationshipUpdates.length > 0) {
            const currentRelationships = cloned.relationships || [];
            let updatedRelationships = [...currentRelationships];
            
            memoryUpdates.relationshipUpdates.forEach((relUpdate: any) => {
              if (!relUpdate.sourceName || !relUpdate.targetName) return;

              const existingIndex = updatedRelationships.findIndex(r => 
                r.sourceCharName.toLowerCase() === relUpdate.sourceName.toLowerCase() && 
                r.targetCharName.toLowerCase() === relUpdate.targetName.toLowerCase()
              );
              
              const affinityDelta = Number(relUpdate.affinityDelta) || 0;
              const threatDelta = Number(relUpdate.threatDelta) || 0;

              if (existingIndex >= 0) {
                const existing = updatedRelationships[existingIndex];
                updatedRelationships[existingIndex] = {
                  ...existing,
                  affinity: Math.max(-100, Math.min(100, existing.affinity + affinityDelta)),
                  threat: Math.max(-100, Math.min(100, (existing.threat || 0) + threatDelta)),
                  description: relUpdate.reason || existing.description,
                  updatedAt: new Date().toISOString()
                };
              } else {
                updatedRelationships.push({
                   id: `rel-${Math.random().toString(36).substr(2, 9)}`,
                   sourceCharId: 'unknown',
                   sourceCharName: relUpdate.sourceName,
                   targetCharId: 'unknown',
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
          const allWarnings = [...violationWarnings, ...linterWarnings];
          
          if (allWarnings.length > 0) {
            nextMemory.memoryWarnings = [...(nextMemory.memoryWarnings || []), ...allWarnings];
          }

          cloned.memory = nextMemory;
        }

        cloned.updatedAt = new Date().toISOString();
        return cloned;
      });

      await store.saveStories(updatedStories);
      awardQi('chapter_generated');

    } catch (err: any) {
      console.error(err);
      store.setAppError(err.message || "Celestial feedback received. Chapter generation failed.");
    } finally {
      store.setIsGenerating(false);
      store.setGenerationPhase(null);
      store.setStreamingChapter(null);
      store.setActiveAgentId(null);
    }
  };

  return { handleGenerateChapter };
};
