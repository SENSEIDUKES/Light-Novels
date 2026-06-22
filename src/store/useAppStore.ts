import { create } from 'zustand';
import { Story, StoryMemory, Chapter, StoryArc, StoryWorld, ReaderPreferences, KarmaFateNode, CharacterRelationship, MultiModelRouting, RouteConfig, IntakeData, WorldBlueprint, StoryBlock, StreamingChapter, AppUser, UserProfile } from '../types';
import { SyncStatus } from '../lib/storage';
import { auth } from '../lib/firebase';
import { getRandomDemoStory } from './demoStories';

interface AppState {
  stories: Story[];
  activeStoryId: string | null;
  currentScreen: 'home' | 'detail' | 'reader' | 'codex' | 'creator' | 'profile';
  storyToDelete: string | null;
  
  // Generation triggers
  isGenerating: boolean;
  appError: string | null;
  generationPhase: 'blueprint' | 'initial-arc' | 'chapter' | 'steer' | 'cover' | null;
  generationProgressMessage: string;
  estimatedSecondsRemaining: number | null;
  streamingChapter: StreamingChapter | null;

  activeAgentId: 'versa' | 'scout' | null;

  // Sync / Auth
  syncStatus: SyncStatus;
  currentUser: AppUser | null;
  userProfile: UserProfile | null;
  lastSavedTime: Date | null;
  storageType: string;

  // Selected State
  selectedChapterNum: number;
  nexusTab: 'reader'|'codex'|'memory';

  // Settings
  isSettingsOpen: boolean;
  isCodexSheetOpen: boolean;
  isReaderFullscreen: boolean;
  routingConfig: MultiModelRouting;
  localGeminiKey: string;
  localOpenrouterKey: string;
  localOllamaHost: string;

  // Actions
  setStories: (stories: Story[]) => void;
  setActiveStoryId: (id: string | null) => void;
  setCurrentScreen: (screen: 'home' | 'detail' | 'reader' | 'codex' | 'creator' | 'profile') => void;
  setStoryToDelete: (id: string | null) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setAppError: (error: string | null) => void;
  setGenerationPhase: (phase: 'blueprint' | 'initial-arc' | 'chapter' | 'steer' | 'cover' | null) => void;
  setGenerationProgressMessage: (msg: string) => void;
  setEstimatedSecondsRemaining: (sec: number | null) => void;
  setStreamingChapter: (data: StreamingChapter | null) => void;
  setActiveAgentId: (id: 'versa' | 'scout' | null) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setCurrentUser: (user: AppUser | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  setLastSavedTime: (time: Date | null) => void;
  setStorageType: (type: string) => void;
  setSelectedChapterNum: (num: number) => void;
  setNexusTab: (tab: 'reader'|'codex'|'memory') => void;
  setIsSettingsOpen: (isOpen: boolean) => void;
  setIsCodexSheetOpen: (isOpen: boolean) => void;
  setIsReaderFullscreen: (isFull: boolean) => void;
  setRoutingConfig: (config: MultiModelRouting) => void;

  // Complex Actions
  saveStories: (updated: Story[]) => Promise<void>;
  handleExportLibrary: () => Promise<void>;
  handleImportLibrary: (e: any) => void;
  confirmDeleteStory: () => void;
  cancelDeleteStory: () => void;
  initStorage: () => Promise<void>;
  migrateOrDiscardDemoStories: (user: any) => Promise<void>;
}


import { storyStorage } from '../lib/storage';

const STORAGE_KEY = '@seihouse/fiction-generator-stories-v2';

export const useAppStore = create<AppState>((set, get) => ({
  stories: [],
  activeStoryId: null,
  currentScreen: 'home',
  storyToDelete: null,
  
  isGenerating: false,
  appError: null,
  generationPhase: null,
  generationProgressMessage: '',
  estimatedSecondsRemaining: null,
  streamingChapter: null,
  activeAgentId: null,

  syncStatus: 'offline',
  currentUser: null,
  userProfile: null,
  lastSavedTime: null,
  storageType: 'Initializing...',

  selectedChapterNum: 1,
  nexusTab: 'reader',

  isSettingsOpen: false,
  isCodexSheetOpen: false,
  isReaderFullscreen: false,
  routingConfig: {
    storyMaker: { provider: 'gemini', model: 'gemini-2.5-flash-lite' },
    imageGenerator: { provider: 'gemini', model: 'google/gemini-3.1-flash-image' }
  },
  localGeminiKey: '',
  localOpenrouterKey: '',
  localOllamaHost: '',

  setStories: (stories) => set({ stories }),
  setActiveStoryId: (id) => set({ activeStoryId: id }),
  setCurrentScreen: (screen) => set({ currentScreen: screen }),
  setStoryToDelete: (id) => set({ storyToDelete: id }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setAppError: (appError) => set({ appError }),
  setGenerationPhase: (generationPhase) => set({ generationPhase }),
  setGenerationProgressMessage: (generationProgressMessage) => set({ generationProgressMessage }),
  setEstimatedSecondsRemaining: (estimatedSecondsRemaining) => set({ estimatedSecondsRemaining }),
  setStreamingChapter: (streamingChapter) => set({ streamingChapter }),
  setActiveAgentId: (activeAgentId) => set({ activeAgentId }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setCurrentUser: (currentUser) => set({ currentUser }),
  setUserProfile: (userProfile) => set({ userProfile }),
  setLastSavedTime: (lastSavedTime) => set({ lastSavedTime }),
  setStorageType: (storageType) => set({ storageType }),
  setSelectedChapterNum: (selectedChapterNum) => set({ selectedChapterNum }),
  setNexusTab: (nexusTab) => set({ nexusTab }),
  setIsSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  setIsCodexSheetOpen: (isCodexSheetOpen) => set({ isCodexSheetOpen }),
  setIsReaderFullscreen: (isReaderFullscreen) => set({ isReaderFullscreen }),
  setRoutingConfig: (routingConfig) => set({ routingConfig }),

  saveStories: async (updated: Story[]) => {
    const activeId = get().activeStoryId;
    const markedStories = updated.map(s => {
      if (s.id.startsWith('demo-matrix-') && s.id === activeId) {
        return { ...s, isEdited: true };
      }
      return s;
    });

    set({ stories: markedStories });
    try {
      const storedStories = await storyStorage.getStories();
      for (const st of storedStories) {
        if (!markedStories.some(u => u.id === st.id)) {
          await storyStorage.deleteStory(st.id);
        }
      }
      for (const s of markedStories) {
        await storyStorage.saveStory(s);
      }
      set({ lastSavedTime: new Date() });
    } catch (e) {
      console.error("Celestial local disk write breached, reverting to standard storage cache:", e);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(markedStories));
      set({ lastSavedTime: new Date() });
    }
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
      const { stories, saveStories, setAppError, storageType } = get();
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
      let loaded = await storyStorage.getStories();
      const user = auth.currentUser;
      
      if (loaded && loaded.length > 0) {
        if (user) {
          const unmigratedDemos = loaded.filter(s => s.id.startsWith('demo-matrix-') && !s.id.includes(user.uid));
          if (unmigratedDemos.length > 0) {
            let updatedLoaded: Story[] = [...loaded];
            let changed = false;
            
            for (const demo of unmigratedDemos) {
              const isWorkedOn = demo.isEdited || demo.currentChapterNumber > 1 || demo.arcs.some(arc => 
                arc.chapters.some(ch => ch.number > 1 && (ch.status === 'read' || ch.hasContent || ch.generatedContent))
              );
              
              if (isWorkedOn) {
                const userDemoId = `demo-matrix-${user.uid}`;
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
          const randomDemo = getRandomDemoStory();
          await storyStorage.saveStory(randomDemo);
          set({ stories: [randomDemo] });
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
          const randomDemo = getRandomDemoStory();
          set({ stories: [randomDemo] });
          localStorage.setItem(STORAGE_KEY, JSON.stringify([randomDemo]));
        }
      } catch (innerErr) {
        const randomDemo = getRandomDemoStory();
        set({ stories: [randomDemo] });
      }
    }
  },

  migrateOrDiscardDemoStories: async (user: any) => {
    if (!user) return;
    const { stories, activeStoryId, saveStories, setActiveStoryId, setCurrentScreen } = get();
    
    // Find unmigrated demo stories
    const unmigratedDemos = stories.filter(s => s.id.startsWith('demo-matrix-') && !s.id.includes(user.uid));
    if (unmigratedDemos.length === 0) return;
    
    let updatedStories = [...stories];
    let updatedActiveId = activeStoryId;
    let changed = false;
    
    for (const demo of unmigratedDemos) {
      const isWorkedOn = demo.isEdited || demo.currentChapterNumber > 1 || demo.arcs.some(arc => 
        arc.chapters.some(ch => ch.number > 1 && (ch.status === 'read' || ch.hasContent || ch.generatedContent))
      );
      
      if (isWorkedOn) {
        const userDemoId = `demo-matrix-${user.uid}`;
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
      await saveStories(updatedStories);
    }
  }
}));
