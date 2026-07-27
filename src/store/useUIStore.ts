import { StateCreator } from 'zustand';
import { CosmicArtifact, MultiModelRouting, StreamingChapter } from '../types';
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
    imagePopups: boolean;
    autoScroll: boolean;
  };
  streamingChapter: StreamingChapter | null;
  autoPlayNarration: boolean;
  
  // Relic Reveal Timing & Queue State
  pendingRelicQueue: CosmicArtifact[];
  canShowRelicInReader: boolean;
  enqueueRelicReveal: (artifact: CosmicArtifact) => void;
  popPendingRelic: () => CosmicArtifact | null;
  setCanShowRelicInReader: (allowed: boolean) => void;

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
  setImmersion: (immersion: Partial<{ master: boolean; imagePopups: boolean; autoScroll: boolean }>) => void;
  setStreamingChapter: (data: StreamingChapter | null) => void;
  setAutoPlayNarration: (autoPlay: boolean) => void;
}

export const createUISlice: StateCreator<AppState, [], [], UISlice> = (set, get) => ({
  currentScreen: 'home',
  selectedChapterNum: 1,
  nexusTab: 'reader',
  isSettingsOpen: false,
  isCodexSheetOpen: false,
  isReaderFullscreen: false,
  isShortcutsOpen: false,
  isVeilMinimized: false,
  routingConfig: {
    storyMaker: { provider: 'gemini', model: 'google/gemini-3.1-flash-lite' },
    imageGenerator: { provider: 'gemini', model: 'gemini-3.1-flash-lite-image' }
  },
  localGeminiKey: '',
  localOpenrouterKey: '',
  localOllamaHost: '',
  localDeepinfraKey: '',
  readerMode: 'teleprompter',
  immersion: {
    master: true,
    imagePopups: true,
    autoScroll: true,
  },
  streamingChapter: null,
  autoPlayNarration: false,

  pendingRelicQueue: [],
  canShowRelicInReader: true,
  enqueueRelicReveal: (artifact) => set((state) => ({
    pendingRelicQueue: [...state.pendingRelicQueue, artifact]
  })),
  popPendingRelic: () => {
    const [first, ...rest] = get().pendingRelicQueue;
    if (first === undefined) return null;
    set({ pendingRelicQueue: rest });
    return first;
  },
  setCanShowRelicInReader: (allowed) => set({ canShowRelicInReader: allowed }),

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
