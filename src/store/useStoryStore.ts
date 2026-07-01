import { StateCreator } from 'zustand';
import { Story, Chapter, DraftRecoverySession, AppUser } from '../types';
import { storyStorage } from '../lib/storage';
import { AppState } from './useAppStore';
import { auth } from '../lib/firebase';
import { getRandomDemoStory } from './demoStories';
import { secureStorage } from '../lib/encryption';
import { mergeStories } from '../lib/merge';

const STORAGE_KEY = '@seihouse/fiction-generator-stories-v2';

export interface StorySlice {
  stories: Story[];
  activeStoryId: string | null;
  storyToDelete: string | null;
  draftRecoverySession: DraftRecoverySession | null;
  isGenerating: boolean;
  appError: string | null;
  generationPhase: 'blueprint' | 'initial-arc' | 'chapter' | 'steer' | 'cover' | null;
  generationProgressMessage: string;
  estimatedSecondsRemaining: number | null;
  generatingChapterNum: number | null;
  activeAgentId: 'versa' | 'scout' | null;
  storageType: string;
  lastSavedTime: Date | null;

  setStories: (stories: Story[]) => void;
  setActiveStoryId: (id: string | null) => void;
  setStoryToDelete: (id: string | null) => void;
  setDraftRecoverySession: (session: DraftRecoverySession | null) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setAppError: (error: string | null) => void;
  setGenerationPhase: (phase: 'blueprint' | 'initial-arc' | 'chapter' | 'steer' | 'cover' | null) => void;
  setGenerationProgressMessage: (msg: string) => void;
  setEstimatedSecondsRemaining: (sec: number | null) => void;
  setGeneratingChapterNum: (num: number | null) => void;
  setActiveAgentId: (id: 'versa' | 'scout' | null) => void;
  setStorageType: (type: string) => void;
  setLastSavedTime: (time: Date | null) => void;

  saveStories: (updated: Story[]) => Promise<void>;
  updateStory: (storyId: string, updates: Partial<Story>) => Promise<void>;
  updateChapter: (storyId: string, chapterNumber: number, updates: Partial<Chapter>) => Promise<void>;
  confirmDeleteStory: () => void;
  cancelDeleteStory: () => void;
  handleExportLibrary: () => Promise<void>;
  handleImportLibrary: (e: any) => void;
  initStorage: () => Promise<void>;
  migrateOrDiscardDemoStories: (user: AppUser | null) => Promise<void>;
  activeConflict: { storyId: string; localStory: Story; cloudStory: Story } | null;
  setActiveConflict: (conflict: { storyId: string; localStory: Story; cloudStory: Story } | null) => void;
  resolveConflict: (resolution: 'local' | 'cloud' | 'merge') => Promise<void>;
}

export const createStorySlice: StateCreator<AppState, [], [], StorySlice> = (set, get) => ({
  stories: [],
  activeStoryId: null,
  storyToDelete: null,
  draftRecoverySession: null,
  isGenerating: false,
  appError: null,
  generationPhase: null,
  generationProgressMessage: '',
  estimatedSecondsRemaining: null,
  generatingChapterNum: null,
  activeAgentId: null,
  storageType: 'Initializing...',
  lastSavedTime: null,

  setStories: (stories) => set({ stories }),
  setActiveStoryId: (id) => set({ activeStoryId: id }),
  setStoryToDelete: (id) => set({ storyToDelete: id }),
  setDraftRecoverySession: (session) => set({ draftRecoverySession: session }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setAppError: (appError) => set({ appError }),
  setGenerationPhase: (generationPhase) => set({ generationPhase }),
  setGenerationProgressMessage: (generationProgressMessage) => set({ generationProgressMessage }),
  setEstimatedSecondsRemaining: (estimatedSecondsRemaining) => set({ estimatedSecondsRemaining }),
  setGeneratingChapterNum: (generatingChapterNum) => set({ generatingChapterNum }),
  setActiveAgentId: (activeAgentId) => set({ activeAgentId }),
  setStorageType: (storageType) => set({ storageType }),
  setLastSavedTime: (lastSavedTime) => set({ lastSavedTime }),
  activeConflict: null,
  setActiveConflict: (activeConflict) => set({ activeConflict }),
  resolveConflict: async (resolution: 'local' | 'cloud' | 'merge') => {
    const conflict = get().activeConflict;
    if (!conflict) return;

    const { storyId, localStory, cloudStory } = conflict;
    const { setStories } = get();

    try {
      let resolvedStory: Story;

      if (resolution === 'local') {
        resolvedStory = { ...localStory, updatedAt: new Date().toISOString(), conflictResolvedAt: new Date().toISOString() };
      } else if (resolution === 'cloud') {
        resolvedStory = { ...cloudStory, updatedAt: new Date().toISOString(), conflictResolvedAt: new Date().toISOString() };
      } else {
        // Use smart merge helper
        resolvedStory = mergeStories(localStory, cloudStory);
        resolvedStory.conflictResolvedAt = new Date().toISOString();
      }

      // Clear the active conflict first to avoid re-triggering the check
      set({ activeConflict: null });

      // Save to storage (triggers sync internally)
      await storyStorage.saveStory(resolvedStory);
      await storyStorage.performSync();

      // Update state
      const freshStories = await storyStorage.getStories();
      setStories(freshStories);
    } catch (err: any) {
      console.error("Failed to resolve sync conflict:", err);
      set({ appError: "Failed to resolve sync conflict: " + err.message });
    }
  },

  saveStories: async (updated: Story[]) => {
    const currentStories = get().stories;
    const activeId = get().activeStoryId;
    const markedStories = updated.map(s => {
      if (s.id.startsWith('demo-matrix-') && s.id === activeId) {
        return { ...s, isEdited: true };
      }
      return s;
    });

    // Find which stories actually changed to avoid massive redundant writes
    const changedStories = markedStories.filter(newStory => {
       const oldStory = currentStories.find(s => s.id === newStory.id);
       if (!oldStory) return true;
       return JSON.stringify(oldStory) !== JSON.stringify(newStory);
    });

    if (changedStories.length === 0) {
      set({ stories: markedStories }); // update state just in case reference changed
      return;
    }

    const toSave = changedStories;

    set({ stories: markedStories });
    try {
      storyStorage.startTransaction();
      for (const s of toSave) {
        await storyStorage.saveStory(s);
      }
      await storyStorage.commitTransaction();
      set({ lastSavedTime: new Date() });
    } catch (e) {
      storyStorage.rollbackTransaction();
      console.error("Celestial local disk write breached, reverting to standard storage cache:", e);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(markedStories));
      } catch (storageError) {
        console.warn("Standard storage cache quota exceeded:", storageError);
        // Attempt a stripped version to save minimal data
        try {
          const stripped = markedStories.map(s => {
            const copy = JSON.parse(JSON.stringify(s));
            delete copy.imageUrl;
            delete copy.imageHistory;
            if (copy.memory) {
              if (copy.memory.characters) copy.memory.characters.forEach((c: any) => { delete c.imageUrl; delete c.imageHistory; });
              if (copy.memory.locations) copy.memory.locations.forEach((l: any) => { delete l.imageUrl; delete l.imageHistory; });
              if (copy.memory.artifacts) copy.memory.artifacts.forEach((a: any) => { delete a.imageUrl; delete a.imageHistory; });
            }
            if (copy.arcs) {
              copy.arcs.forEach((arc: any) => {
                if (arc.chapters) {
                  arc.chapters.forEach((ch: any) => {
                    if (ch.assetManifest) delete ch.assetManifest.heroImage;
                  });
                }
              });
            }
            return copy;
          });
          localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped));
        } catch (stripError) {
           console.error("Even stripped stories exceeded quota.", stripError);
        }
      }
      set({ lastSavedTime: new Date() });
    }
  },

  updateStory: async (storyId: string, updates: Partial<Story>) => {
    const { stories, saveStories } = get();
    const updated = stories.map(s => {
      if (s.id === storyId) {
        return { ...s, ...updates, isEdited: true };
      }
      return s;
    });
    await saveStories(updated);
  },

  updateChapter: async (storyId: string, chapterNumber: number, updates: Partial<Chapter>) => {
    const { stories, saveStories } = get();
    const updated = stories.map(s => {
      if (s.id === storyId) {
        return {
          ...s,
          arcs: s.arcs.map(a => {
            const hasChapter = a.chapters.some(c => c.number === chapterNumber);
            if (!hasChapter) return a;
            return {
              ...a,
              chapters: a.chapters.map(c => {
                if (c.number === chapterNumber) {
                  return { ...c, ...updates };
                }
                return c;
              })
            };
          })
        };
      }
      return s;
    });
    await saveStories(updated);
  },

  handleExportLibrary: async () => {
    const { stories, setAppError } = get();
    try {
      const exportLibrary = [];
      for (const story of stories) {
        const exportData = JSON.parse(JSON.stringify(story));
        if (exportData.arcs) {
          for (const arc of exportData.arcs) {
            for (const chapter of arc.chapters) {
              if (chapter.hasContent && (!chapter.generatedContent && (!chapter.blocks || chapter.blocks.length === 0))) {
                 const content = await storyStorage.getChapterContent(story.id, chapter.number);
                 if (content) {
                   chapter.generatedContent = content.generatedContent;
                   chapter.blocks = content.blocks;
                   chapter.summary = content.summary;
                   chapter.statsChangeMessage = content.statsChangeMessage;
                   chapter.cuePayload = content.cuePayload;
                 }
              }
            }
          }
        }
        exportLibrary.push(exportData);
      }

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportLibrary, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `seihouse_story_library_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err: any) {
      setAppError("Failed to package the library matrix: " + err.message);
    }
  },

  handleImportLibrary: (e: any) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const fileReader = new FileReader();
    fileReader.onload = async (event) => {
      const { stories, saveStories, setAppError } = get();
      try {
        const fileContent = event.target?.result as string;
        const parsedData = JSON.parse(fileContent);

        let mergedList = [...stories];
        let importSuccessCount = 0;

        const mergeSingleStory = (storyObj: any) => {
          if (!storyObj || !storyObj.id || !storyObj.title || !storyObj.memory) {
            throw new Error(`The provided package does not comply with the StoryWorld structural framework.`);
          }
          if (storyObj.arcs) {
             storyObj.arcs.forEach((arc: any) => {
               arc.chapters.forEach((ch: any) => {
                 if (ch.generatedContent || (ch.blocks && ch.blocks.length > 0)) {
                    ch._isNewContent = true;
                 }
               });
             });
          }
          
          const existingIdx = mergedList.findIndex(s => s.id === storyObj.id);
          if (existingIdx > -1) {
            mergedList[existingIdx] = storyObj;
          } else {
            mergedList = [storyObj, ...mergedList];
          }
          importSuccessCount++;
        };

        if (Array.isArray(parsedData)) {
          parsedData.forEach(story => mergeSingleStory(story));
        } else {
          mergeSingleStory(parsedData);
        }

        await saveStories(mergedList);
        console.log(`Successfully synchronized ${importSuccessCount} Story World memories into your local database!`);
        e.target.value = '';
      } catch (err: any) {
        setAppError("The import portal cracked. Validation failed: " + err.message);
      }
    };
    fileReader.readAsText(fileList[0]);
  },

  confirmDeleteStory: () => {
    const { storyToDelete, stories, saveStories, activeStoryId, setActiveStoryId, setCurrentScreen, setStoryToDelete } = get();
    if (storyToDelete) {
      storyStorage.deleteStory(storyToDelete).catch(console.error);
      const updated = stories.filter(s => s.id !== storyToDelete);
      saveStories(updated);
      if (activeStoryId === storyToDelete) {
        setActiveStoryId(null);
        setCurrentScreen('home');
      }
      setStoryToDelete(null);
    }
  },

  cancelDeleteStory: () => set({ storyToDelete: null }),

  initStorage: async () => {
    try {
      await storyStorage.init();
      set({ storageType: storyStorage.getActiveAdapterName() });
      
      const gemini = await secureStorage.getItem('@seihouse/api-key-gemini');
      const openrouter = await secureStorage.getItem('@seihouse/api-key-openrouter');
      const ollama = await secureStorage.getItem('@seihouse/api-key-ollama-host');
      const deepinfra = await secureStorage.getItem('@seihouse/api-key-deepinfra');
      set({
        localGeminiKey: gemini || '',
        localOpenrouterKey: openrouter || '',
        localOllamaHost: ollama || '',
        localDeepinfraKey: deepinfra || ''
      });

      let loaded = await storyStorage.getStories();
      const user = auth.currentUser;
      
      if (loaded && loaded.length > 0) {
        if (user) {
          const unmigratedDemos = loaded.filter(s => 
            (s.id.startsWith('demo-matrix-') || s.id.startsWith('challenge-')) && !s.id.includes(user.uid)
          );
          if (unmigratedDemos.length > 0) {
            let updatedLoaded: Story[] = [...loaded];
            let changed = false;
            
            storyStorage.startTransaction();
            try {
              for (const demo of unmigratedDemos) {
                const isWorkedOn = demo.isEdited || demo.currentChapterNumber > 1 || demo.arcs.some(arc => 
                  arc.chapters.some(ch => ch.number > 1 && (ch.status === 'read' || ch.hasContent || ch.generatedContent))
                );
                
                if (isWorkedOn) {
                  const userDemoId = demo.id.startsWith('demo-matrix-') 
                    ? `demo-matrix-${user.uid}` 
                    : `${demo.id}-${user.uid}`;
                  updatedLoaded = updatedLoaded.map(s => {
                    if (s.id === demo.id) {
                      return { ...s, id: userDemoId, userId: user.uid };
                    }
                    return s;
                  });
                  await storyStorage.deleteStory(demo.id);
                  changed = true;
                } else {
                  updatedLoaded = updatedLoaded.filter(s => s.id !== demo.id);
                  await storyStorage.deleteStory(demo.id);
                  changed = true;
                }
              }
              
              if (changed) {
                loaded = updatedLoaded;
                for (const s of loaded) {
                  await storyStorage.saveStory(s);
                }
                await storyStorage.commitTransaction();
              } else {
                storyStorage.rollbackTransaction();
              }
            } catch (err) {
              storyStorage.rollbackTransaction();
              console.error("Failed to migrate demo stories during init", err);
            }
          }
        }
        set({ stories: loaded });
      } else {
        if (user) {
          const randomDemo = getRandomDemoStory();
          randomDemo.id = `demo-matrix-${user.uid}`;
          randomDemo.userId = user.uid;
          await storyStorage.saveStory(randomDemo);
          set({ stories: [randomDemo] });
        } else {
          set({ stories: [] });
        }
      }
    } catch (e) {
      console.error("Persistent story memory failed to initialize, reverting to local fallback:", e);
      set({ storageType: 'LocalStorage (Fallback)' });
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          set({ stories: JSON.parse(saved) });
        } else {
          set({ stories: [] });
        }
      } catch {
        set({ stories: [] });
      }
    }
  },

  migrateOrDiscardDemoStories: async (user: AppUser | null) => {
    if (!user) return;
    const { stories, activeStoryId, saveStories, setActiveStoryId, setCurrentScreen } = get();
    
    const unmigratedDemos = stories.filter(s => 
      (s.id.startsWith('demo-matrix-') || s.id.startsWith('challenge-')) && !s.id.includes(user.uid)
    );
    if (unmigratedDemos.length === 0) return;
    
    let updatedStories = [...stories];
    let updatedActiveId = activeStoryId;
    let changed = false;
    
    storyStorage.startTransaction();
    try {
      for (const demo of unmigratedDemos) {
        const isWorkedOn = demo.isEdited || demo.currentChapterNumber > 1 || demo.arcs.some(arc => 
          arc.chapters.some(ch => ch.number > 1 && (ch.status === 'read' || ch.hasContent || ch.generatedContent))
        );
        
        if (isWorkedOn) {
          const userDemoId = demo.id.startsWith('demo-matrix-') 
            ? `demo-matrix-${user.uid}` 
            : `${demo.id}-${user.uid}`;
          updatedStories = updatedStories.map(s => {
            if (s.id === demo.id) {
              return { ...s, id: userDemoId, userId: user.uid };
            }
            return s;
          });
          if (updatedActiveId === demo.id) {
            updatedActiveId = userDemoId;
          }
          await storyStorage.deleteStory(demo.id);
          changed = true;
        } else {
          updatedStories = updatedStories.filter(s => s.id !== demo.id);
          if (updatedActiveId === demo.id) {
            updatedActiveId = null;
            setCurrentScreen('home');
          }
          await storyStorage.deleteStory(demo.id);
          changed = true;
        }
      }
      
      if (changed) {
        if (activeStoryId !== updatedActiveId) {
          setActiveStoryId(updatedActiveId);
        }
        await storyStorage.commitTransaction();
        await saveStories(updatedStories);
      } else {
        storyStorage.rollbackTransaction();
      }
    } catch (e) {
      storyStorage.rollbackTransaction();
      console.error("Migration transaction failed:", e);
    }
  }
});
