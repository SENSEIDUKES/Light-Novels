import { useAppStore } from '../store/useAppStore';
import { Story, IntakeData, WorldBlueprint, Chapter, StoryArc, StoryMemory, StoryWorld, GeneratedImage } from '../types';
import { storyStorage } from '../lib/storage';
import { awardQi } from '../lib/qi';
import { unlockCosmicArtifact } from '../lib/artifacts';
import { auth, db } from '../lib/firebase';
import { getApiHeaders, extractJsonBlocks, extractJsonMeta } from './storyEngineHelpers';
import { useChapterGeneration } from './useChapterGeneration';
import { useArcSteering } from './useArcSteering';

export { extractJsonBlocks, extractJsonMeta };

export const useStoryEngine = () => {
  const store = useAppStore();
  const { handleGenerateChapter } = useChapterGeneration();
  const { handleSteerArc, handleAlterFate } = useArcSteering();

  const handleGenerateBlueprint = async (intake: IntakeData): Promise<WorldBlueprint> => {
    const currentStoreState = useAppStore.getState();
    if (currentStoreState.isGenerating) {
      console.warn("Generation already in progress. Ignoring duplicate click.");
      return {} as any;
    }
    currentStoreState.setIsGenerating(true);
    currentStoreState.setGenerationPhase('blueprint');
    currentStoreState.setActiveAgentId('versa');
    currentStoreState.setAppError(null);
    try {
      const apiHeaders = await getApiHeaders();
      const response = await fetch('/api/generate-blueprint', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({ intake, routingConfig: currentStoreState.routingConfig.storyMaker })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Blueprint generation failed: ${response.status}`);
      }
      return await response.json();
    } catch (err: any) {
      console.error(err);
      currentStoreState.setAppError(err.message || "Failed to generate world blueprint.");
      throw err;
    } finally {
      currentStoreState.setIsGenerating(false);
      currentStoreState.setGenerationPhase(null);
      currentStoreState.setActiveAgentId(null);
    }
  };

  const handleStartStory = async (intake: IntakeData, blueprint: WorldBlueprint, chapterCount: number) => {
    const currentStoreState = useAppStore.getState();
    if (currentStoreState.isGenerating) {
      console.warn("Generation already in progress. Ignoring duplicate click.");
      return;
    }
    currentStoreState.setIsGenerating(true);
    currentStoreState.setGenerationPhase('initial-arc');
    currentStoreState.setActiveAgentId('versa');
    currentStoreState.setAppError(null);

    try {
      const apiHeaders = await getApiHeaders();
      const response = await fetch('/api/generate-initial-arc', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({ intake, blueprint, chapterCount, routingConfig: store.routingConfig.storyMaker })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server bounds ruptured with status: ${response.status}`);
      }

      const responseData = await response.json();

      const formattedChapters: Chapter[] = responseData.chapters.map((ch: any) => ({
        number: ch.number,
        title: ch.title,
        premise: ch.premise,
        status: 'unread'
      }));

      const newStory: Story = {
        id: `story-${Date.now()}`,
        userId: auth.currentUser?.uid || undefined,
        title: responseData.title || blueprint.title || 'The Ascension Chronicles',
        genre: intake.genrePath || 'Xianxia',
        mcName: intake.mcName || 'Unknown',
        customPremise: intake.corePremise || blueprint.logline || '',
        intake: intake,
        blueprint: blueprint,
        hardcoreFateMode: !!intake.hardcoreFateMode,
        fatePressure: intake.fatePressure || 'Balanced',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currentChapterNumber: 1,
        memory: {
          powerSystem: responseData.powerSystem || blueprint.powerSystemOutline,
          currentPowerStage: responseData.currentPowerStage || 'Novice stage',
          worldRules: responseData.worldRules || ['Survival of the fittest'],
          characters: responseData.characters?.map((c: any) => ({
            id: `char-${Math.random().toString(36).substr(2, 9)}`,
            ...c
          })) || [],
          unresolvedPlotThreads: (responseData.unresolvedPlotThreads || []).map((t: any) => ({
            id: `thread-${Math.random().toString(36).substr(2, 9)}`,
            description: typeof t === 'string' ? t : t.description,
            status: 'active',
            originChapter: 1
          })),
          resolvedPlotThreads: []
        },
        arcs: [
          {
            title: responseData.title || 'Volume I Genesis',
            chapters: formattedChapters,
            isCompleted: false
          }
        ]
      };

      const updated = [newStory, ...store.stories];
      await store.saveStories(updated);
      store.setActiveStoryId(newStory.id);
      store.setSelectedChapterNum(1);
      store.setCurrentScreen('detail');
      awardQi('world_created');
    } catch (err: any) {
      console.error(err);
      store.setAppError(err.message || "Failed to align celestial gates.");
    } finally {
      store.setIsGenerating(false);
      store.setGenerationPhase(null);
      store.setActiveAgentId(null);
    }
  };



  const handleUpdateMemoryManual = async (updatedMemory: StoryMemory) => {
    const activeStory = store.stories.find(s => s.id === store.activeStoryId);
    if (!activeStory) return;
    const updated = store.stories.map(s => {
      if (s.id === activeStory.id) {
        return {
          ...s,
          memory: updatedMemory,
          updatedAt: new Date().toISOString()
        };
      }
      return s;
    });
    await store.saveStories(updated);
  };

  const handleUpdateStoryDirect = async (updatedStory: StoryWorld) => {
    updatedStory.updatedAt = new Date().toISOString();
    const updated = store.stories.map(s => s.id === updatedStory.id ? updatedStory : s);
    await store.saveStories(updated);
  };

  const handleToggleRead = async (charNum: number) => {
    const activeStory = store.stories.find(s => s.id === store.activeStoryId);
    if (!activeStory) return;
    const updated = store.stories.map(s => {
      if (s.id === activeStory.id) {
        return {
          ...s,
          arcs: s.arcs.map(arc => ({
            ...arc,
            chapters: arc.chapters.map(ch => {
              if (ch.number === charNum) {
                const newStatus = ch.status === 'read' ? 'unread' : 'read';
                if (newStatus === 'read') {
                  awardQi('chapter_finished');
                  
                  // Handle Dao Pillar (Daily Reading Streak)
                  const currentUserProfile = useAppStore.getState().userProfile;
                  if (currentUserProfile) {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const lastReadStr = currentUserProfile.lastReadDate;
                    
                    let newStreak = currentUserProfile.daoPillarStreak || 0;
                    let isCracked = currentUserProfile.daoPillarCracked || false;
                    
                    if (lastReadStr !== todayStr) {
                      if (lastReadStr) {
                        const lastReadDate = new Date(lastReadStr);
                        const todayDate = new Date(todayStr);
                        const diffTime = Math.abs(todayDate.getTime() - lastReadDate.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                        
                        if (diffDays === 1) {
                          newStreak += 1;
                        } else {
                          // Broke streak
                          if (newStreak >= 7) {
                            isCracked = true;
                          }
                          newStreak = 1;
                        }
                      } else {
                        newStreak = 1;
                      }
                      
                      const updatedProfile = {
                        ...currentUserProfile,
                        lastReadDate: todayStr,
                        daoPillarStreak: newStreak,
                        daoPillarCracked: isCracked
                      };
                      useAppStore.getState().setUserProfile(updatedProfile);
                      // Fire and forget Firestore update
                      if (auth.currentUser) {
                        import('firebase/firestore').then(({ doc, setDoc }) => {
                          setDoc(doc(db, 'users', auth.currentUser!.uid), {
                            lastReadDate: todayStr,
                            daoPillarStreak: newStreak,
                            daoPillarCracked: isCracked
                          }, { merge: true });
                        });
                      } else {
                        localStorage.setItem('seihouse-local-user-profile', JSON.stringify(updatedProfile));
                      }
                    }
                  }
                }
                
                return {
                  ...ch,
                  status: newStatus as 'unread' | 'read'
                };
              }
              return ch;
            })
          })),
          updatedAt: new Date().toISOString()
        };
      }
      return s;
    });
    await store.saveStories(updated);
  };

  const handleGenerateCover = async (): Promise<{ imageUrls: string[], promptUsed: string } | undefined> => {
    const currentStoreState = useAppStore.getState();
    if (currentStoreState.isGenerating) {
      console.warn("Generation already in progress. Ignoring duplicate click.");
      return undefined;
    }
    currentStoreState.setIsGenerating(true);

    const activeStory = currentStoreState.stories.find(s => s.id === currentStoreState.activeStoryId);
    if (!activeStory) {
      currentStoreState.setIsGenerating(false);
      return undefined;
    }
    currentStoreState.setGenerationPhase('cover');
    currentStoreState.setAppError(null);
    try {
      const apiHeaders = await getApiHeaders();
      const styleConfig = activeStory.blueprint?.styleBible || "Chinese light novel world aesthetic, xianxia / wuxia fantasy illustration, cinematic, mystical, premium webnovel art.";
      const mcProfile = activeStory.blueprint?.mcProfile || activeStory.mcName;
      const worldOverview = activeStory.blueprint?.worldOverview || activeStory.genre;
      const firstArcPromise = activeStory.blueprint?.firstArcPromise || activeStory.customPremise;

      const prompt = `Cover image for a story titled "${activeStory.title}". Genre: ${activeStory.genre}. Core Premise: ${activeStory.customPremise}. Main character visual description: ${mcProfile}. Main visual conflict: ${firstArcPromise}. World aesthetic: ${worldOverview}. Shared visual style: ${styleConfig}. Epic fantasy webnovel book cover, digital painting, textless.`;

      const response = await fetch('/api/generate-card-image', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({ prompt, type: "cover", routingConfig: store.routingConfig.imageGenerator })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate cover art.");

      let newImageUrls = data.imageUrls;
      if (!newImageUrls && data.imageUrl) newImageUrls = [data.imageUrl];
      if (!newImageUrls && data.fallbackUrl) newImageUrls = [data.fallbackUrl];

      if (newImageUrls && newImageUrls.length > 0) {
        return { imageUrls: newImageUrls, promptUsed: prompt };
      }
    } catch(err: any) {
      store.setAppError(err.message || "Failed to forge new cover.");
    } finally {
      store.setIsGenerating(false);
      store.setGenerationPhase(null);
    }
    return undefined;
  };

  const handleApplyCover = async (imageUrl: string, promptUsed: string) => {
    const activeStory = store.stories.find(s => s.id === store.activeStoryId);
    if (!activeStory) return;

    const imageRecord: GeneratedImage = {
      id: Math.random().toString(36).substring(2, 10),
      entityId: activeStory.id,
      entityType: 'cover',
      imageUrl,
      promptUsed,
      createdAt: new Date().toISOString(),
      isCurrent: true,
      chapterNumber: activeStory.currentChapterNumber
    };
    
    const currentHistory = activeStory.imageHistory || [];
    const updatedHistory: GeneratedImage[] = currentHistory.map(img => 
      img.entityType === 'cover' ? { ...img, isCurrent: false } : img
    ).concat(imageRecord);

    handleUpdateStoryDirect({ 
      ...activeStory, 
      imageUrl,
      imageHistory: updatedHistory,
      evolutionReady: false,
      availableVisualUpdate: false,
      lastImageChapter: activeStory.currentChapterNumber
    });
  };

  const handleCheckConsistency = async (chapterNumber: number): Promise<string[]> => {
    const activeStory = store.stories.find(s => s.id === store.activeStoryId);
    if (!activeStory) return [];
    
    const selectedArcIndex = activeStory.arcs.findIndex(arc => arc.chapters.some(c => c.number === chapterNumber));
    if (selectedArcIndex === -1) return [];

    const targetChapter = activeStory.arcs[selectedArcIndex].chapters.find(c => c.number === chapterNumber);
    if (!targetChapter || (!targetChapter.generatedContent && (!targetChapter.blocks || targetChapter.blocks.length === 0))) return [];

    let text = targetChapter.generatedContent || "";
    if (!text && targetChapter.blocks) {
      text = targetChapter.blocks.map(b => b.text).join('\n\n');
    }

    try {
      const apiHeaders = await getApiHeaders();
      const response = await fetch('/api/check-consistency', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          chapterText: text,
          memory: activeStory.memory,
          routingConfig: store.routingConfig.storyMaker
        })
      });

      if (!response.ok) return [];
      const data = await response.json();
      return data.warnings || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const handleSealChapter = async (chapterNumber: number) => {
    const activeStory = store.stories.find((s) => s.id === store.activeStoryId);
    if (!activeStory) return;

    const generateContentHash = async (content: string): Promise<string> => {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(content || '');
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      } catch (err) {
        return Math.random().toString(36).substring(2, 15);
      }
    };

    const newArcs = await Promise.all(activeStory.arcs.map(async (arc) => {
      const newChapters = await Promise.all(arc.chapters.map(async (ch) => {
        if (ch.number === chapterNumber) {
          const contentHash = await generateContentHash(ch.generatedContent || '');
          const versionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
          const branchAnchor = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
          
          return { 
            ...ch, 
            isSealed: true,
            contentHash,
            sealedAt: Date.now(),
            versionId,
            assetManifest: {},
            translationCache: {},
            audioCueCache: {},
            branchAnchor
          };
        }
        return ch;
      }));
      return { ...arc, chapters: newChapters };
    }));

    await handleUpdateStoryDirect({ ...activeStory, arcs: newArcs });
    awardQi('chapter_sealed');
    
    // Scan sealed chapter content for artifacts
    const sealedCh = newArcs.flatMap(a => a.chapters).find(c => c.number === chapterNumber);
    if (sealedCh) {
      const fullText = (sealedCh.generatedContent || "") + " " + (sealedCh.blocks || []).map((b: any) => b.text).join(" ");
      import('../lib/artifacts').then(({ scanChapterForArtifacts }) => {
        scanChapterForArtifacts(activeStory.id, activeStory.title, chapterNumber, fullText, sealedCh).catch((err) => {
          console.error("Failed to scan sealed chapter for artifacts:", err);
        });
      });
    }
    
    // Unlock Mirror of Karmic Reflections artifact on first chapter seal
    unlockCosmicArtifact('chapter_seal', activeStory.id, activeStory.title).catch((err) => {
      console.error('Failed to unlock Chapter Seal artifact:', err);
    });
  };

  return {
    handleGenerateBlueprint,
    handleStartStory,
    handleGenerateChapter,
    handleSteerArc,
    handleAlterFate,
    handleCheckConsistency,
    handleSealChapter,
    handleUpdateMemoryManual,
    handleUpdateStoryDirect,
    handleToggleRead,
    handleGenerateCover,
    handleApplyCover
  };
};
