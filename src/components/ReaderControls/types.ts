import { Chapter } from '../../types';

export interface ChapterNavigationState {
  selectedChapterNum: number;
  maxChapterNum: number;
  navigatePrev: () => void;
  navigateNext: () => void;
  onSwitchTab?: (tab: "reader" | "codex" | "memory") => void;
}

export interface PlaybackState {
  isPlayingText: boolean;
  isPausedText: boolean;
  handleTogglePlayback: () => void;
  readerMode: string;
}

export interface AudioSettings {
  speechRate: number;
  setSpeechRate: React.Dispatch<React.SetStateAction<number>>;
  availableVoices: any[];
  selectedVoiceURI: string;
  setSelectedVoiceURI: (uri: string) => void;
  selectedDialogueVoiceURI: string;
  setSelectedDialogueVoiceURI: (uri: string) => void;
  selectedSideVoiceURI: string;
  setSelectedSideVoiceURI: (uri: string) => void;
}

export interface ImmersionPreferences {
  immersion: any;
  setImmersion: (settings: any) => void;
}

export interface FateActions {
  handleAlterFate?: (chapterNum: number, direction: string, customPrompt?: string) => Promise<void>;
  setIsAlterFateOpen: (isOpen: boolean) => void;
  handleExportText: () => void;
}

export interface ReaderControlsProps {
  selectedChapter: Chapter;
  navigation: ChapterNavigationState;
  playback: PlaybackState;
  audio: AudioSettings;
  immersion: ImmersionPreferences;
  actions: FateActions;
}
