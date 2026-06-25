import { create } from 'zustand';
import { Story, StoryMemory, Chapter, StoryArc, StoryWorld, ReaderPreferences, KarmaFateNode, CharacterRelationship, MultiModelRouting, RouteConfig, IntakeData, WorldBlueprint, StoryBlock, StreamingChapter, AppUser, UserProfile, FateSurvivalChallenge, FateSurvivalRun } from '../types';
import { SyncStatus } from '../lib/storage';
import { secureStorage } from '../lib/encryption';
import { auth } from '../lib/firebase';
import { getRandomDemoStory } from './demoStories';
import { awardDirectQi } from '../lib/qi';

interface AppState {
  stories: Story[];
  activeStoryId: string | null;
  currentScreen: 'home' | 'detail' | 'reader' | 'codex' | 'creator' | 'profile' | 'pricing' | 'challenge' | 'sects';
  storyToDelete: string | null;
  
  // Fate Survival Challenge Mode
  activeChallenge: FateSurvivalChallenge | null;
  activeChallengeRun: FateSurvivalRun | null;
  startChallenge: (challenge: FateSurvivalChallenge) => void;
  progressChallenge: (choiceId: string) => void;
  resetChallenge: () => void;
  
  // Generation triggers
  isGenerating: boolean;
  appError: string | null;
  generationPhase: 'blueprint' | 'initial-arc' | 'chapter' | 'steer' | 'cover' | null;
  generationProgressMessage: string;
  estimatedSecondsRemaining: number | null;
  streamingChapter: StreamingChapter | null;
  isVeilMinimized: boolean;
  generatingChapterNum: number | null;

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
  isShortcutsOpen: boolean;
  routingConfig: MultiModelRouting;
  localGeminiKey: string;
  localOpenrouterKey: string;
  localOllamaHost: string;
  localDeepinfraKey: string;

  readerMode: 'teleprompter' | 'sen' | 'basic-tts';
  immersion: {
    master: boolean;
    audioCues: boolean;
    imagePopups: boolean;
    sceneMusic: boolean;
    autoScroll: boolean;
  };

  // Draft Recovery
  draftRecoverySession: any | null;
  setDraftRecoverySession: (session: any | null) => void;

  // Actions
  setStories: (stories: Story[]) => void;
  setActiveStoryId: (id: string | null) => void;
  setCurrentScreen: (screen: 'home' | 'detail' | 'reader' | 'codex' | 'creator' | 'profile' | 'pricing' | 'challenge' | 'sects') => void;
  setStoryToDelete: (id: string | null) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setIsVeilMinimized: (minimized: boolean) => void;
  setGeneratingChapterNum: (num: number | null) => void;
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
  setIsShortcutsOpen: (isOpen: boolean) => void;
  setRoutingConfig: (config: MultiModelRouting) => void;
  setReaderMode: (mode: 'teleprompter' | 'sen' | 'basic-tts') => void;
  setImmersion: (immersion: Partial<{ master: boolean; audioCues: boolean; imagePopups: boolean; sceneMusic: boolean; autoScroll: boolean }>) => void;

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

/**
 * Global application store managed by Zustand.
 * Handles story state, challenge modes, UI view routing, generation phases, and user sync.
 */
export const useAppStore = create<AppState>((set, get) => ({
  stories: [],
  activeStoryId: null,
  currentScreen: 'home',
  storyToDelete: null,
  
  // Fate Survival Challenge Mode
  activeChallenge: null,
  activeChallengeRun: null,
  
  // Draft Recovery
  draftRecoverySession: null,
  setDraftRecoverySession: (session) => set({ draftRecoverySession: session }),

  isGenerating: false,
  appError: null,
  generationPhase: null,
  generationProgressMessage: '',
  estimatedSecondsRemaining: null,
  streamingChapter: null,
  isVeilMinimized: false,
  generatingChapterNum: null,
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
  isShortcutsOpen: false,
  routingConfig: {
    storyMaker: { provider: 'gemini', model: 'google/gemini-2.5-flash-lite' },
    imageGenerator: { provider: 'gemini', model: 'google/gemini-3.1-flash-image' }
  },
  localGeminiKey: '',
  localOpenrouterKey: '',
  localOllamaHost: '',
  localDeepinfraKey: '',

  readerMode: 'teleprompter',
  immersion: {
    master: true,
    audioCues: true,
    imagePopups: true,
    sceneMusic: true,
    autoScroll: true,
  },

  setStories: (stories) => set({ stories }),
  setActiveStoryId: (id) => set({ activeStoryId: id }),
  setCurrentScreen: (screen) => set({ currentScreen: screen }),
  
  /**
   * Starts a new Fate Survival Challenge, creating an active run instance.
   * @param {FateSurvivalChallenge} challenge - The target challenge object to start.
   */
  startChallenge: async (challenge) => {
    const run: FateSurvivalRun = {
      id: 'run-' + Date.now(),
      challengeId: challenge.id,
      userId: auth.currentUser?.uid || 'anonymous',
      currentStep: 1,
      status: 'active',
      selectedChoices: [],
      state: {
        survival: 5,
        relationship: 5,
        danger: 0,
        fateResistance: 0,
        trust: 5,
      },
      createdAt: new Date().toISOString(),
    };
    set({
      activeChallenge: challenge,
      activeChallengeRun: run,
      currentScreen: 'challenge',
    });
    
    // Award starting Qi (attemptQi)
    if (auth.currentUser) {
      await awardDirectQi(challenge.rewards.attemptQi, `attempt-${challenge.id}-${Date.now()}`);
    }
    
    // Always award to local profile state so the UI updates instantly
    const localProfile = get().userProfile;
    if (localProfile) {
      const updatedProfile = {
        ...localProfile,
        dao_xp: (localProfile.dao_xp || 0) + challenge.rewards.attemptQi,
        qi: (localProfile.qi || 0) + challenge.rewards.attemptQi,
      };
      set({ userProfile: updatedProfile });
    }
  },

  /**
   * Advances the current Fate Survival Challenge by making a decision.
   * Resolves consequences and advances the step counter or completes the challenge.
   * @param {string} choiceId - The ID of the selected choice.
   */
  progressChallenge: async (choiceId) => {
    // 1. Capture the immediate state and validate synchronously
    const { activeChallenge, activeChallengeRun } = get();
    if (!activeChallenge || !activeChallengeRun) return;
    if (activeChallengeRun.status !== 'active') return;

    // Find the choice
    const currentChoicePoint = activeChallenge.choicePoints.find(
      cp => cp.stepNumber === activeChallengeRun.currentStep
    );
    const choice = currentChoicePoint?.choices.find(c => c.id === choiceId);
    if (!choice) return;

    // Apply effects
    const nextState = { ...activeChallengeRun.state };
    if (choice.effects) {
      nextState.survival = Math.max(0, (nextState.survival || 5) + (choice.effects.survival || 0));
      nextState.relationship = Math.max(0, (nextState.relationship || 5) + (choice.effects.relationship || 0));
      nextState.danger = Math.max(0, (nextState.danger || 0) + (choice.effects.danger || 0));
      nextState.fateResistance = Math.max(0, (nextState.fateResistance || 0) + (choice.effects.fateResistance || 0));
      nextState.trust = Math.max(0, (nextState.trust || 5) + (choice.effects.trust || 0));
    }

    const nextStep = activeChallengeRun.currentStep + 1;
    const isCompleted = nextStep > activeChallenge.totalSteps - 1; 
    
    let updatedRun: FateSurvivalRun = {
      ...activeChallengeRun,
      currentStep: nextStep,
      selectedChoices: [...activeChallengeRun.selectedChoices, choiceId],
      state: nextState,
    };

    let qiEarned = 0;
    let outcome: 'success' | 'partial_success' | 'failure' = 'failure';

    if (isCompleted) {
      // Determine success / partial / failure
      if (nextState.fateResistance >= 6 && nextState.danger <= 4) {
        outcome = 'success';
      } else if (nextState.fateResistance >= 3 && nextState.danger <= 7) {
        outcome = 'partial_success';
      }

      if (outcome === 'success') {
        qiEarned = activeChallenge.rewards.successQi;
      } else if (outcome === 'partial_success') {
        qiEarned = activeChallenge.rewards.partialSuccessQi;
      } else {
        qiEarned = activeChallenge.rewards.failureQi;
      }

      updatedRun = {
        ...updatedRun,
        status: outcome === 'failure' ? 'failed' : 'completed',
        result: outcome,
        qiAwarded: qiEarned,
        completedAt: new Date().toISOString(),
      };
    }

    // 2. Set the updated run immediately to block double-clicks
    set({ activeChallengeRun: updatedRun });

    // 3. Process asynchronous rewards if completed
    if (isCompleted) {
      // Award completion Qi remotely
      if (auth.currentUser) {
        await awardDirectQi(qiEarned, `complete-${activeChallenge.id}-${outcome}-${Date.now()}`);
      }
      
      // Award Cosmic Artifact on pure Success
      if (outcome === 'success') {
        import('../lib/artifacts').then(({ unlockCosmicArtifact }) => {
          unlockCosmicArtifact('challenge_complete', activeChallenge.id, activeChallenge.title).catch(err => {
            console.error('Failed to unlock Fate Challenge artifact:', err);
          });
        });
      }
      
      // Award locally
      const localProfile = get().userProfile;
      if (localProfile) {
        const updatedProfile = {
          ...localProfile,
          dao_xp: (localProfile.dao_xp || 0) + qiEarned,
          qi: (localProfile.qi || 0) + qiEarned,
        };
        set({ userProfile: updatedProfile });
      }
    }
  },

  resetChallenge: () => {
    set({
      activeChallenge: null,
      activeChallengeRun: null,
      currentScreen: 'home',
    });
  },

  setStoryToDelete: (id) => set({ storyToDelete: id }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setIsVeilMinimized: (isVeilMinimized) => set({ isVeilMinimized }),
  setGeneratingChapterNum: (generatingChapterNum) => set({ generatingChapterNum }),
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
  setIsShortcutsOpen: (isShortcutsOpen) => set({ isShortcutsOpen }),
  setRoutingConfig: (routingConfig) => set({ routingConfig }),
  setReaderMode: (readerMode) => set({ readerMode }),
  setImmersion: (immersion) => set((state) => ({
    immersion: { ...state.immersion, ...immersion }
  })),

  /**
   * Flushes current stories to local persistence securely.
   * Wraps standard updates in a transaction mechanism where possible.
   * @param {Story[]} updated - The new array of story objects.
   */
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
      storyStorage.startTransaction();
      for (const s of markedStories) {
        await storyStorage.saveStory(s);
      }
      await storyStorage.commitTransaction();
      set({ lastSavedTime: new Date() });
    } catch (e) {
      storyStorage.rollbackTransaction();
      console.error("Celestial local disk write breached, reverting to standard storage cache:", e);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(markedStories));
      set({ lastSavedTime: new Date() });
    }
  },

  /**
   * Exports the entire local library matrix to a JSON file.
   */
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

  /**
   * Initializes standard local storage, migrating demo stories to the user's namespace
   * and fetching API keys if saved securely.
   */
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
          const unmigratedDemos = loaded.filter(s => s.id.startsWith('demo-matrix-') && !s.id.includes(user.uid));
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
      } catch (innerErr) {
        set({ stories: [] });
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
    
    storyStorage.startTransaction();
    try {
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
        await storyStorage.commitTransaction(); // Only clears tx deletions
        await saveStories(updatedStories); // This will do its own transaction for saves, which is fine as the previous commit resolved the deletions
      } else {
        storyStorage.rollbackTransaction();
      }
    } catch (e) {
      storyStorage.rollbackTransaction();
      console.error("Migration transaction failed:", e);
    }
  }
}));
