import { StateCreator } from 'zustand';
import { MultiModelRouting, StreamingChapter } from '../types';
import { AppState } from './useAppStore';

export interface UISlice {
  currentScreen: 'home' | 'detail' | 'reader' | 'codex' | 'creator' | 'profile' | 'pricing' | 'challenge' | 'sects';
  selectedChapterNum: number;
  nexusTab: 'reader'|'codex'|'memory';
  isSettingsOpen: boolean;
  isCodexSheetOpen: boolean;
  isReaderFullscreen: boolean;
  isShortcutsOpen: boolean;
  isVeilMinimized: boolean;
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
  streamingChapter: StreamingChapter | null;
  /**
   * Listening-mode intent. When true, a newly-manifested / newly-selected
   * chapter auto-starts narration so the user doesn't re-press play each time.
   * Deliberately NOT persisted — it resets on reload so a cold page load never
   * tries to autoplay audio without a fresh user gesture.
   */
  autoPlayNarration: boolean;

  setCurrentScreen: (screen: 'home' | 'detail' | 'reader' | 'codex' | 'creator' | 'profile' | 'pricing' | 'challenge' | 'sects') => void;
  setSelectedChapterNum: (num: number) => void;
  setNexusTab: (tab: 'reader'|'codex'|'memory') => void;
  setIsSettingsOpen: (isOpen: boolean) => void;
  setIsCodexSheetOpen: (isOpen: boolean) => void;
  setIsReaderFullscreen: (isFull: boolean) => void;
  setIsShortcutsOpen: (isOpen: boolean) => void;
  setIsVeilMinimized: (minimized: boolean) => void;
  setRoutingConfig: (config: MultiModelRouting) => void;
  setReaderMode: (mode: 'teleprompter' | 'sen' | 'basic-tts') => void;
  setImmersion: (immersion: Partial<{ master: boolean; audioCues: boolean; imagePopups: boolean; sceneMusic: boolean; autoScroll: boolean }>) => void;
  setStreamingChapter: (data: StreamingChapter | null) => void;
  setAutoPlayNarration: (autoPlay: boolean) => void;
}

export const createUISlice: StateCreator<AppState, [], [], UISlice> = (set) => ({
  currentScreen: 'home',
  selectedChapterNum: 1,
  nexusTab: 'reader',
  isSettingsOpen: false,
  isCodexSheetOpen: false,
  isReaderFullscreen: false,
  isShortcutsOpen: false,
  isVeilMinimized: false,
  routingConfig: {
    storyMaker: { provider: 'gemini', model: 'google/gemini-2.5-flash-lite' },
    imageGenerator: { provider: 'gemini', model: 'gemini-3.1-flash-lite-image' }
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
  streamingChapter: null,
  autoPlayNarration: false,

  setCurrentScreen: (screen) => set({ currentScreen: screen }),
  setSelectedChapterNum: (num) => set({ selectedChapterNum: num }),
  setNexusTab: (tab) => set({ nexusTab: tab }),
  setIsSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),
  setIsCodexSheetOpen: (isOpen) => set({ isCodexSheetOpen: isOpen }),
  setIsReaderFullscreen: (isFull) => set({ isReaderFullscreen: isFull }),
  setIsShortcutsOpen: (isOpen) => set({ isShortcutsOpen: isOpen }),
  setIsVeilMinimized: (minimized) => set({ isVeilMinimized: minimized }),
  setRoutingConfig: (config) => set({ routingConfig: config }),
  setReaderMode: (mode) => set({ readerMode: mode }),
  setImmersion: (immersion) => set((state) => ({
    immersion: { ...state.immersion, ...immersion }
  })),
  setStreamingChapter: (data) => set({ streamingChapter: data }),
  setAutoPlayNarration: (autoPlayNarration) => set({ autoPlayNarration }),
});
