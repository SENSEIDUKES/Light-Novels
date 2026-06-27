import { StateCreator } from 'zustand';
import { DraftRecoverySession, AppUser } from '../types';
import { storyStorage } from '../lib/storage';
import { AppState } from './useAppStore';
import { auth } from '../lib/firebase';
import { getRandomDemoStory } from './demoStories';
import { secureStorage } from '../lib/encryption';

const STORAGE_KEY = '@seihouse/fiction-generator-stories-v2';

export interface StorySlice {
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

  handleExportLibrary: () => Promise<void>;
  handleImportLibrary: (e: any) => void;
  initStorage: () => Promise<void>;
  migrateOrDiscardDemoStories: (user: AppUser | null) => Promise<void>;
}

export const createStorySlice: StateCreator<AppState, [], [], StorySlice> = (set, get) => ({
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

  handleExportLibrary: async () => {
    const { setAppError } = get();
    try {
      const stories = await storyStorage.getStories();
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
      const { setAppError } = get();
      try {
        const fileContent = event.target?.result as string;
        const parsedData = JSON.parse(fileContent);

        let importSuccessCount = 0;

        const mergeSingleStory = async (storyObj: any) => {
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
          
          await storyStorage.saveStory(storyObj);
          importSuccessCount++;
        };

        if (Array.isArray(parsedData)) {
          for (const story of parsedData) {
            await mergeSingleStory(story);
          }
        } else {
          await mergeSingleStory(parsedData);
        }

        console.log(`Successfully synchronized ${importSuccessCount} Story World memories into your local database!`);
        e.target.value = '';
        window.dispatchEvent(new CustomEvent('story_library_updated'));
      } catch (err: any) {
        setAppError("The import portal cracked. Validation failed: " + err.message);
      }
    };
    fileReader.readAsText(fileList[0]);
  },

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
      
      if (loaded && loaded.length === 0 && user) {
        const randomDemo = getRandomDemoStory();
        randomDemo.id = `demo-matrix-${user.uid}`;
        randomDemo.userId = user.uid;
        await storyStorage.saveStory(randomDemo);
      }
    } catch (e) {
      console.error("Persistent story memory failed to initialize, reverting to local fallback:", e);
      set({ storageType: 'LocalStorage (Fallback)' });
    }
  },

  migrateOrDiscardDemoStories: async (user: AppUser | null) => {
    if (!user) return;
    const { activeStoryId, setActiveStoryId, setCurrentScreen } = get();
    const stories = await storyStorage.getStories();
    
    const unmigratedDemos = stories.filter(s => 
      (s.id.startsWith('demo-matrix-') || s.id.startsWith('challenge-')) && !s.id.includes(user.uid)
    );
    if (unmigratedDemos.length === 0) return;
    
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
          demo.id = userDemoId;
          demo.userId = user.uid;
          if (updatedActiveId === demo.id) {
            updatedActiveId = userDemoId;
          }
          await storyStorage.deleteStory(demo.id.replace(`-${user.uid}`, ''));
          await storyStorage.saveStory(demo);
          changed = true;
        } else {
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
      } else {
        storyStorage.rollbackTransaction();
      }
    } catch (e) {
      storyStorage.rollbackTransaction();
      console.error("Migration transaction failed:", e);
    }
  }
});
