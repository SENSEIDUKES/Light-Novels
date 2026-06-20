import { create } from 'zustand';
import { Story, StoryMemory, Chapter, StoryArc, StoryWorld, ReaderPreferences, KarmaFateNode, CharacterRelationship, MultiModelRouting, RouteConfig, IntakeData, WorldBlueprint, StoryBlock, StreamingChapter } from '../types';
import { SyncStatus } from '../lib/storage';

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

  // Sync / Auth
  syncStatus: SyncStatus;
  currentUser: any;
  lastSavedTime: Date | null;
  storageType: string;

  // Selected State
  selectedChapterNum: number;
  nexusTab: 'reader'|'codex'|'memory';

  // Settings
  isSettingsOpen: boolean;
  isCodexSheetOpen: boolean;
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
  setSyncStatus: (status: SyncStatus) => void;
  setCurrentUser: (user: any) => void;
  setLastSavedTime: (time: Date | null) => void;
  setStorageType: (type: string) => void;
  setSelectedChapterNum: (num: number) => void;
  setNexusTab: (tab: 'reader'|'codex'|'memory') => void;
  setIsSettingsOpen: (isOpen: boolean) => void;
  setIsCodexSheetOpen: (isOpen: boolean) => void;
  setRoutingConfig: (config: MultiModelRouting) => void;

  // Complex Actions
  saveStories: (updated: Story[]) => Promise<void>;
  handleExportLibrary: () => Promise<void>;
  handleImportLibrary: (e: any) => void;
  confirmDeleteStory: () => void;
  cancelDeleteStory: () => void;
  initStorage: () => Promise<void>;
}

const INITIAL_DEMO_STORIES: Story[] = [
  {
    id: 'demo-matrix-1',
    title: 'Immortal Calamity: Echoes of the Cauldron',

    genre: 'Xianxia',
    mcName: 'Ye Fan',
    customPremise: 'Awakening a mysterious black tripod cauldron inside the family trash heap that grinds low-grade herbs into peerless elixirs.',
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    currentChapterNumber: 1,
    imageUrl: 'https://images.unsplash.com/photo-1542157077-789d38ac0bc2?auto=format&fit=crop&q=80',
    memory: {
      powerSystem: 'Qi Condensation (Tiers 1-10) -> Foundation Establishment (Low, Mid, Peak) -> Core Formation -> Nascent Soul.',
      currentPowerStage: 'Qi Condensation Tier 1 (Crippled Roots)',
      worldRules: [
        'Sovereigns of the nine sects execute absolute law; normal citizens are but wood and grass.',
        'Spiritual herb concentration determines sect royalty.',
        'Those who double-cultivate without high-grade talismans face spiritual deviance.',
        'Heavenly thunder tribulation burns away those who cheat destiny.'
      ],
      characters: [
        {
          id: 'char-1',
          name: 'Master Gu',
          role: 'Sacred Cauldron Mentor',
          description: 'A sarcastic soul form living inside the cauldron ring. Loves to tease Ye Fan but knows divine recipes.',
          relationshipToMC: 'Playful Bond / Absolute Ally',
          status: 'alive'
        },
        {
          id: 'char-2',
          name: 'Elder Zhao',
          role: 'Vengeful Elder',
          description: 'The greedy outer elder of the Azure Clouds Sect who covets Ye Fan\'s mysterious luck.',
          relationshipToMC: 'Extreme Hostility / Hidden Enemy',
          status: 'alive'
        }
      ],
      unresolvedPlotThreads: [
        'Resolve the mystery of Ye Fan\'s birthmark.',
        'Gather three Heavenly Jade Elixirs to cure Ye Fan\'s broken meridians.',
        'Avenge the clan expulsion by defeating Elder Zhao\'s disciple in the outer sect arena.'
      ],
      resolvedPlotThreads: [
        'Survive the wilderness wolf attack during clan expulsion.'
      ]
    },
    arcs: [
      {
        title: 'Volume 1: Awakening the Sky-Shattering Cauldron',
        isCompleted: false,
        chapters: [
          {
            number: 1,
            title: 'Expulsion from the Main Hall, Mysterious Cauldron of the Trash Heap',
            premise: 'Ye Fan gets humiliated and expelled by Elder Zhao. In despair, he drops blood on a rusted black metal container, awakening Master Gu.',
            status: 'read',
            generatedContent: `The chill of the Sky Cloud Sect's main hall seeped through the thin soles of Ye Fan's shoes, but it was nothing compared to the frost hardening in his chest. Above him, Elder Zhao sat like an ancient mountain, his voice booming with critical indifference.\n\n"Ye Fan. Your spiritual root is severed, your meridians are completely clogged. After three years, you remain at Qi Condensation Tier 1. You are a absolute waste of spiritual resources, eating Azure Elixirs meant for true geniuses! By decree of the Elder Council, you are hereby expelled to the Outer Wilderness!"\n\nA ripple of laughter rolled through the crowd of inner disciples. At the front, Zhao Chen—the Elder's favored nephew—smirked, looking down at Ye Fan like an ox looks at a blade of grass.\n\nYe Fan said nothing. He simply clenched his fists so tightly his knuckles turned white as bone. He turned on his heel, leaving behind the mountain peak he had called home.\n\nExpelled to the trash heap of the outer village, Ye Fan scavenged amongst broken arrays and discarded iron. There, his hand brushed against a peculiar, soot-covered tripod cauldron. A jagged piece of discarded metal cut his palm, and a drop of rich, blood-red vital essence splattered on the cauldron's rim.\n\nHum.\n\nLines of radiant blue light rippled through the rusty cauldron, a cosmic portal unlocking. An old, sarcastic voice resounded directly in Ye Fan's soul:\n\n"Who dares disturb the peace of Master Gu? Ah, a trash child with ruined roots? Excellent! Truly, my luck is spectacular..."\n\nYe Fan stared in disbelief. His hands was healed. Master Gu explained that his meridians were not ruined—they were simply compressed, awaiting the supreme refining energy of the cauldron! This was the beginning of his true, heaven-defying ascension.`,
            summary: 'Ye Fan gets expelled to the Outer Wilderness by Elder Zhao. He bleeds on a discarded tripod cauldron, awakening Master Gu, who reveals Ye Fan actually possesses rare Compressed Meridians.',
            statsChangeMessage: '[System Awakening: Cauldron link activated. Meridians starting to unlock!]'
          },
          {
            number: 2,
            title: 'Master Gu\'s Pill Recipe, Breakthrough in Secret Council',
            premise: 'Master Gu instructs Ye Fan to locate spatial snake vines to brew Earth Essence elixirs, defying the crippled meridian rumors.',
            status: 'unread'
          },
          {
            number: 3,
            title: 'Sect Envoys Arrive, the Audacity of the Waste Disciple',
            premise: 'Zhao Chen sends thugs to break Ye Fan\'s legs in the outer wilderness, but Ye Fan showcases his newly unlocked Qi Condensation Tier 2 stats.',
            status: 'unread'
          }
        ]
      }
    ]
  }
];

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

  syncStatus: 'offline',
  currentUser: null,
  lastSavedTime: null,
  storageType: 'Initializing...',

  selectedChapterNum: 1,
  nexusTab: 'reader',

  isSettingsOpen: false,
  isCodexSheetOpen: false,
  routingConfig: {
    storyMaker: { provider: 'gemini', model: 'gemini-3.5-flash' },
    imageGenerator: { provider: 'gemini', model: 'gemini-2.5-flash-image' }
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
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setCurrentUser: (currentUser) => set({ currentUser }),
  setLastSavedTime: (lastSavedTime) => set({ lastSavedTime }),
  setStorageType: (storageType) => set({ storageType }),
  setSelectedChapterNum: (selectedChapterNum) => set({ selectedChapterNum }),
  setNexusTab: (nexusTab) => set({ nexusTab }),
  setIsSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  setIsCodexSheetOpen: (isCodexSheetOpen) => set({ isCodexSheetOpen }),
  setRoutingConfig: (routingConfig) => set({ routingConfig }),

  saveStories: async (updated: Story[]) => {
    set({ stories: updated });
    try {
      const storedStories = await storyStorage.getStories();
      for (const st of storedStories) {
        if (!updated.some(u => u.id === st.id)) {
          await storyStorage.deleteStory(st.id);
        }
      }
      for (const s of updated) {
        await storyStorage.saveStory(s);
      }
      set({ lastSavedTime: new Date() });
    } catch (e) {
      console.error("Celestial local disk write breached, reverting to standard storage cache:", e);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
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
      const loaded = await storyStorage.getStories();
      if (loaded && loaded.length > 0) {
        set({ stories: loaded });
      } else {
        for (const s of INITIAL_DEMO_STORIES) {
          await storyStorage.saveStory(s);
        }
        set({ stories: INITIAL_DEMO_STORIES });
      }
    } catch (e) {
      console.error("Persistent story memory failed to initialize, reverting to local fallback:", e);
      set({ storageType: 'LocalStorage (Fallback)' });
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          set({ stories: JSON.parse(saved) });
        } else {
          set({ stories: INITIAL_DEMO_STORIES });
          localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEMO_STORIES));
        }
      } catch (innerErr) {
        set({ stories: INITIAL_DEMO_STORIES });
      }
    }
  }
}));
