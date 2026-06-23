import React, { useRef, useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  ChevronRight,
  Check,
  Eye,
  EyeOff,
  Download,
  ArrowLeft,
  ArrowRight,
  Zap,
  ListMusic,
  Award,
  ShieldAlert,
  CheckCircle,
  RefreshCcw,
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Sliders,
  Settings,
  Bookmark as BookmarkIcon,
  Trash2,
  Plus,
  Globe,
  Loader2,
  Lock,
} from "lucide-react";
import {
  Chapter,
  StoryMemory,
  StoryWorld,
  ReaderPreferences,
  Bookmark,
  VoiceClip,
} from "../types";
import { motion, AnimatePresence } from "motion/react";
import { VirtualizedList } from "./VirtualizedList";
import { ParticleSystem } from "./ParticleSystem";
import { AudioWidget } from "./AudioWidget";
import {
  dispatchNarrativeCue,
  NarrativeCueEventType,
  dispatchNarration
} from "../lib/narrativeCues";
import { useChapterTranslation } from "../hooks/useChapterTranslation";
import { useAppStore } from "../store/useAppStore";
import { useAutoScroll } from "../hooks/useAutoScroll";
import { secureStorage } from "../lib/encryption";
import { SystemBlock } from "./SystemBlock";

import { AlterFatePanel } from "./AlterFatePanel";
import { VoiceEditionPanel } from "./VoiceEditionPanel";

import { ReaderPreferencesPanel } from "./ReaderPreferencesPanel";
import { CosmicBookmarksPanel } from "./CosmicBookmarksPanel";
import { CodexHovercard } from "./CodexHovercard";
import { useImageManifest } from "../hooks/useImageManifest";

const extractSFXCues = (text: string) => {
  const sfxList: string[] = [];

  // 1. Remove JSON-style signatures/metadata blocks (curly brace nested blocks containing metadata keys)
  let cleanText = text.replace(
    /\{[^{}]*?"(?:sceneType|intensity|tension|danger|mysticism|emotion|audioSignature|beastEvent|summary|statsChangeMessage|memoryUpdates)"[^{}]*?\}/gi,
    "",
  );

  // Clean raw JSON structures enclosed in brackets (e.g. `[{"intensity": 0.8}]`, `[{"sceneType": ...}]` or nested JSON config arrays)
  cleanText = cleanText.replace(/\[\s*\{[\s\S]*?\}\s*\]/g, "");
  cleanText = cleanText.replace(/\[\s*\{[^{}]*?\}\s*\]/g, "");

  // 2. Extract genuine audio/SFX cue identifiers, and completely strip all hidden system metadata tags from reader output.
  // We match common hidden tags: SFX, Audio, Sound, Beat, Timing, Time, Duration, Mood, Emotion, Trigger, Narrative, JSON, SAP, Audio-Metadata, Metadata, Intensity, Tension, Danger.
  const hiddenSystemTagsRegex =
    /\[(?:SFX|Audio|Sound|Beat|Timing|Time|Duration|Trigger|SAP|Audio-Metadata|Metadata|Intensity|Tension|Danger|Mood|Emotion|Narrative):\s*([^\]]+)\]/gi;

  cleanText = cleanText.replace(hiddenSystemTagsRegex, (match, val) => {
    // If it is a real audio/sound effect signifier, record it to trigger underlying page-turn/particle effects.
    if (match.match(/\[(?:SFX|Audio|Sound):\s*/i)) {
      sfxList.push(val.trim().toLowerCase());
    }
    return ""; // completely erase from the rendered reader-facing paragraph
  });

  // 3. Strip any empty brackets or orphaned tag constructs that may have been parsed or typed (e.g. `[]`, `[ ]`)
  cleanText = cleanText.replace(/\[\s*\]/g, "");

  return { cleanText: cleanText.trim(), sfxList };
};

interface ReaderChamberProps {
  chapters: Chapter[];
  currentPowerStage: string;
  onGenerateChapter: (chapterNumber: number) => Promise<void>;
  isGenerating: boolean;
  selectedChapterNum: number;
  setSelectedChapterNum: (num: number) => void;
  onToggleRead: (chapterNumber: number) => void;
  arcTitle: string;
  onSwitchTab?: (tab: "reader" | "codex" | "memory") => void;
  activeStory: StoryWorld;
  onUpdateStory: (updatedStory: StoryWorld) => void;
  handleAlterFate?: (
    chapterNumber: number,
    direction: string,
    customPrompt: string,
  ) => Promise<void>;
  handleSealChapter?: (chapterNumber: number) => Promise<void>;
  handleCheckConsistency?: (chapterNumber: number) => Promise<string[]>;
}

export default function ReaderChamber({
  chapters,
  currentPowerStage,
  onGenerateChapter,
  isGenerating,
  selectedChapterNum,
  setSelectedChapterNum,
  onToggleRead,
  arcTitle,
  onSwitchTab,
  activeStory,
  onUpdateStory,
  handleAlterFate,
  handleSealChapter,
  handleCheckConsistency,
}: ReaderChamberProps) {
  const selectedChapter =
    chapters.find((c) => c.number === selectedChapterNum) || chapters[0];

  const [filter, setFilter] = useState<"all" | "unlocked" | "locked">("all");
  const [generatingRevealId, setGeneratingRevealId] = useState<string | null>(null);
  const stories = useAppStore(state => state.stories);
  const activeStoryId = useAppStore(state => state.activeStoryId);
  const saveStories = useAppStore(state => state.saveStories);
  const routingConfig = useAppStore(state => state.routingConfig);

  const { manifestImage, manifestChapterHero, generatingIds } = useImageManifest();

  const handleManifestReveal = async (entry: any, type: string) => {
    if (generatingRevealId) return;
    setGeneratingRevealId(entry.id);
    try {
      await manifestImage(entry, type);
    } catch (err) {
      console.error("Failed to manifest reveal card auras:", err);
    } finally {
      setGeneratingRevealId(null);
    }
  };
  const [isAlterFateOpen, setIsAlterFateOpen] = useState(false);
  const [isCheckingConsistency, setIsCheckingConsistency] = useState(false);
  const [consistencyWarnings, setConsistencyWarnings] = useState<string[] | null>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const readerMode = useAppStore((state) => state.readerMode);
  const immersion = useAppStore((state) => state.immersion);
  const setReaderMode = useAppStore((state) => state.setReaderMode);
  const setImmersion = useAppStore((state) => state.setImmersion);


  // --- Translation States ---
  const maxChapterNum = chapters.length > 0 ? Math.max(...chapters.map(c => c.number)) : 0;
  const { translateChapter, isTranslating, translationError } =
    useChapterTranslation();
  const userProfile = useAppStore((state) => state.userProfile);

  const getLocaleFromLanguageName = (lang: string | undefined): string => {
    if (!lang) return "en";
    const normalized = lang.toLowerCase();
    if (normalized.includes("spanish")) return "es";
    if (normalized.includes("chinese")) return "zh-CN";
    if (normalized.includes("japanese")) return "ja";
    if (normalized.includes("french")) return "fr";
    if (normalized.includes("portuguese")) return "pt-BR";
    if (normalized.includes("german")) return "de";
    if (normalized.includes("italian")) return "it";
    if (normalized.includes("korean")) return "ko";
    if (normalized.includes("russian")) return "ru";
    if (normalized.includes("vietnamese")) return "vi";
    if (normalized.includes("indonesian")) return "id";
    if (normalized.includes("thai")) return "th";
    if (normalized.includes("arabic")) return "ar";
    if (normalized.includes("hindi")) return "hi";
    return "en";
  };

  const [preferredLang, setPreferredLang] = useState(() => {
    return getLocaleFromLanguageName(userProfile?.defaultTranslationLanguage || userProfile?.preferredLanguage);
  });

  useEffect(() => {
    const langCode = getLocaleFromLanguageName(userProfile?.defaultTranslationLanguage || userProfile?.preferredLanguage);
    setPreferredLang(langCode);
  }, [userProfile?.defaultTranslationLanguage, userProfile?.preferredLanguage]);

  const [activeTranslationContent, setActiveTranslationContent] = useState<
    string | null
  >(null);

  useEffect(() => {
    // Only check if to generate hero image if chapter has content and it hasn't been generated yet, and we are not currently generating it.
    if ((selectedChapter.generatedContent || selectedChapter.blocks) && !selectedChapter.assetManifest?.heroImage && !generatingIds.has(`chapter-hero-${selectedChapter.number}`)) {
      if (!activeStory) return;
      
      const currentArc = activeStory.arcs.find(a => a.chapters.some(c => c.number === selectedChapter.number));
      if (!currentArc) return;

      const existingHeroImagesCount = currentArc.chapters.filter(c => c.assetManifest && c.assetManifest.heroImage).length;
      
      // System limit: 1-2 most important moments per arc for cost and impact
      if (existingHeroImagesCount >= 2) return;

      const cue = selectedChapter.cuePayload;
      
      const momentousEvents = [
        'breakthrough', 'turning-point', 'evolution', 'betrayal', 'ascension', 
        'conquest', 'destruction', 'calamity', 'rival_battle', 'romance', 'first_kiss'
      ];

      let isMomentous = 
          (cue?.beastEvent?.type && momentousEvents.includes(cue.beastEvent.type)) ||
          selectedChapter.blocks?.some((b: any) => 
               b.system?.promptType && momentousEvents.includes(b.system.promptType)
          ) ||
          (cue?.danger && cue.danger > 8) || 
          (cue?.powerShift && cue.powerShift > 8);

      // Special Rule: Arcs with 7+ chapters get a guaranteed hero pic within the first 3 chapters to incentivize going further
      const isLongArc = currentArc.chapters.length >= 7;
      const arcChapterIndex = currentArc.chapters.findIndex(c => c.number === selectedChapter.number);
      
      if (isLongArc && arcChapterIndex <= 2 && existingHeroImagesCount === 0) {
        // Force the generation on the 3rd chapter if it hasn't happened yet, 
        // or if there is moderate tension/power shift in chapter 1 or 2.
        if (arcChapterIndex === 2 || (cue?.danger && cue.danger > 5) || (cue?.powerShift && cue.powerShift > 5)) {
          isMomentous = true;
        }
      }
      
      if (isMomentous) {
        const promptText = `A cinematic visual memory of the defining moment that just happened: ${selectedChapter.summary || 'A critical climactic climax in the story.'} Render as a vivid frozen memory capturing the emotional core and exact action of the moment.`;
        manifestChapterHero(selectedChapter.number, promptText).catch(e => console.error("Hero generation failed:", e));
      }
    }
  }, [selectedChapter.number, selectedChapter.generatedContent, selectedChapter.blocks, selectedChapter.assetManifest?.heroImage, selectedChapter.cuePayload, selectedChapter.summary, manifestChapterHero, generatingIds, activeStory]);

  // --- Scroll position tracking ---
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedScrollRef = useRef<number>(0);
  
  const handleViewportScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollTop = target.scrollTop;
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      if (Math.abs(scrollTop - lastSavedScrollRef.current) > 100) {
        lastSavedScrollRef.current = scrollTop;
        onUpdateStory({
          ...activeStory,
          lastReadChapter: selectedChapterNum,
          lastReadScrollPosition: scrollTop,
          lastReadAt: new Date().toISOString()
        });
      }
    }, 2000); // 2000ms debounce
  };

  // Restore scroll position on mount/chapter change
  useEffect(() => {
    if (readerRef.current && activeStory.lastReadChapter === selectedChapterNum) {
      // Only restore if we have valid content to scroll on
      if (selectedChapter.generatedContent || selectedChapter.blocks) {
        // Small delay to ensure content is fully rendered before scrolling
        setTimeout(() => {
           if (readerRef.current && activeStory.lastReadScrollPosition) {
             readerRef.current.scrollTop = activeStory.lastReadScrollPosition;
           }
        }, 100);
      }
    }
  }, [selectedChapterNum, activeStory.lastReadChapter, selectedChapter.generatedContent, selectedChapter.blocks]);

  // --- atmospheric audio (just reference, no actual addition needed here)
  const isReaderFullscreen = useAppStore((state) => state.isReaderFullscreen);
  const setIsReaderFullscreen = useAppStore(
    (state) => state.setIsReaderFullscreen,
  );
  const activeAgentId = useAppStore((state) => state.activeAgentId);

  useEffect(() => {
    if (preferredLang === "en") {
      setActiveTranslationContent(null);
      return;
    }

    const doTranslation = async () => {
      let textToTranslate = selectedChapter.generatedContent || "";
      if (!textToTranslate && selectedChapter.blocks) {
        textToTranslate = selectedChapter.blocks.map(b => b.text).join('\n\n');
      }
      if (!textToTranslate) return;
      
      if (selectedChapter.translations?.[preferredLang]) {
        setActiveTranslationContent(
          selectedChapter.translations[preferredLang].content,
        );
        return;
      }
      const result = await translateChapter(
        activeStory.id,
        selectedChapter.number,
        textToTranslate,
        preferredLang,
      );
      if (result) {
        setActiveTranslationContent(result);
      }
    };
    doTranslation();
  }, [
    preferredLang,
    selectedChapter.number,
    selectedChapter.generatedContent,
    selectedChapter.blocks,
    selectedChapter.translations,
  ]);

  // --- Theme & Reader Typography Customizer States ---
  const [showReaderPreferences, setShowReaderPreferences] = useState(false);

  const defaultPrefs: ReaderPreferences = {
    fontSize: "lg",
    fontFamily: "serif",
    lineHeight: "relaxed",
    paragraphSpacing: "normal",
    themeOverride: "void",
  };

  const currentPrefs = activeStory.readerPreferences || defaultPrefs;

  const handleUpdatePreference = <K extends keyof ReaderPreferences>(
    key: K,
    value: ReaderPreferences[K],
  ) => {
    const updatedPrefs = {
      ...currentPrefs,
      [key]: value,
    };
    onUpdateStory({
      ...activeStory,
      readerPreferences: updatedPrefs,
    });
  };

  const getThemeClasses = () => {
    const t = currentPrefs.themeOverride || "void";
    if (t === "crimson")
      return "bg-[#0f0404] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1d0a0a] to-[#0a0202] text-[#e0cfcf] border-t border-[#8B0000]/30 shadow-[inset_0_0_120px_rgba(139,0,0,0.08)] ring-1 ring-[#8B0000]/10 selection:bg-[#8B0000]/40 selection:text-white";
    if (t === "abyss")
      return "bg-[#05080f] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0a1222] to-[#020408] text-[#ccd4e0] border-t border-[#04ACFF]/20 shadow-[inset_0_0_120px_rgba(4,172,255,0.06)] ring-1 ring-[#04ACFF]/10 selection:bg-[#04ACFF]/40 selection:text-white";
    if (t === "sepia")
      return "bg-[#1a1614] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#2a2420] to-[#14100e] text-[#d6c5b3] border-t border-[#8b5a2b]/30 shadow-[inset_0_0_120px_rgba(139,90,43,0.08)] ring-1 ring-[#8b5a2b]/10 selection:bg-[#8b5a2b]/40 selection:text-white";
    if (t === "emerald")
      return "bg-[#050f0a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0a1c12] to-[#020805] text-[#b9d6c1] border-t border-[#0f5132]/40 shadow-[inset_0_0_120px_rgba(15,81,50,0.1)] ring-1 ring-[#0f5132]/20 selection:bg-[#0f5132]/40 selection:text-white";
    return "bg-[#0a0a0a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#141414] to-[#050505] text-[#e8e8e8] border-t border-neutral-800/60 shadow-[inset_0_0_120px_rgba(255,255,255,0.02)] ring-1 ring-white/5 selection:bg-neutral-700 selection:text-white"; // default void style
  };

  // --- Text-to-Speech (TTS) Engine States ---
  const [isPlayingText, setIsPlayingText] = useState(false);
  const [isPausedText, setIsPausedText] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [speechPitch, setSpeechPitch] = useState<number>(1.0);
  const [speechVolume, setSpeechVolume] = useState<number>(0.9);
  const [availableVoices, setAvailableVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");
  const [selectedDialogueVoiceURI, setSelectedDialogueVoiceURI] =
    useState<string>("");
  const [showImmersionPopover, setShowImmersionPopover] = useState<boolean>(false);
  const [showVoiceDetail, setShowVoiceDetail] = useState<boolean>(false);

  const [isAutoScrollPausedByUser, setIsAutoScrollPausedByUser] = useState(false);

  useEffect(() => {
    setIsAutoScrollPausedByUser(false);
  }, [readerMode, selectedChapterNum]);

  const { play: playAutoScroll, pause: pauseAutoScroll, isScrolling: isAutoScrolling } = useAutoScroll({
    containerRef: readerRef,
    mode: readerMode === "sen" && immersion.autoScroll 
      ? "paced" 
      : (readerMode === "teleprompter" && immersion.autoScroll && !isAutoScrollPausedByUser ? "constant" : "off"),
    wpm: Math.round(speechRate * 150),
    onManualPause: () => {
      if (readerMode === "teleprompter") {
        setIsAutoScrollPausedByUser(true);
      }
    }
  });

  // --- Atmospheric Audio Sync States ---
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem("seihouse-audio-muted") === "true";
  });
  const [atmosphere, setAtmosphere] = useState(() => {
    return localStorage.getItem("seihouse-audio-atmosphere") || "none";
  });
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("seihouse-audio-volume");
    return saved ? parseFloat(saved) : 0.5;
  });

  // Track state changes from the actual background audio engine
  useEffect(() => {
    const handleEvents = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        if (typeof customEvent.detail.isMuted === "boolean") {
          setIsMuted(customEvent.detail.isMuted);
        }
        if (customEvent.detail.atmosphere) {
          setAtmosphere(customEvent.detail.atmosphere);
        }
        if (typeof customEvent.detail.volume === "number") {
          setVolume(customEvent.detail.volume);
        }
      }
    };
    window.addEventListener("seihouse-audio-state", handleEvents);
    return () =>
      window.removeEventListener("seihouse-audio-state", handleEvents);
  }, []);

  const handleMuteToggle = (mutedVal: boolean) => {
    setIsMuted(mutedVal);
    localStorage.setItem("seihouse-audio-muted", String(mutedVal));
    window.dispatchEvent(
      new CustomEvent("seihouse-audio-control", {
        detail: { isMuted: mutedVal },
      }),
    );
  };

  const handleAtmosphereChange = (atmosVal: string) => {
    setAtmosphere(atmosVal);
    localStorage.setItem("seihouse-audio-atmosphere", atmosVal);
    window.dispatchEvent(
      new CustomEvent("seihouse-audio-control", {
        detail: { atmosphere: atmosVal },
      }),
    );
  };

  const handleVolumeChange = (volVal: number) => {
    setVolume(volVal);
    localStorage.setItem("seihouse-audio-volume", String(volVal));
    window.dispatchEvent(
      new CustomEvent("seihouse-audio-control", {
        detail: { volume: volVal },
      }),
    );
  };

  // Load SpeechSynthesis voices
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);

        // Auto-select a nice voice
        if (voices.length > 0) {
          const defaultVoice =
            voices.find(
              (v) =>
                v.lang.includes("en-US") &&
                v.name.toLowerCase().includes("google"),
            ) ||
            voices.find((v) => v.lang.includes("en-US")) ||
            voices.find((v) => v.lang.includes("en")) ||
            voices.find((v) => v.lang.includes("zh")) ||
            voices[0];
          setSelectedVoiceURI(defaultVoice?.voiceURI || "");

          const dialogueVoice =
            voices.find(
              (v) =>
                v.voiceURI !== defaultVoice?.voiceURI &&
                v.lang.includes("en"),
            ) || defaultVoice;
          setSelectedDialogueVoiceURI(dialogueVoice?.voiceURI || "");
        }
      };

      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  // Track utterance chunks and current playing chunk
  const chunksRef = useRef<{ text: string; isDialogue: boolean; paragraphIndex?: number }[]>([]);
  const [activeChunks, setActiveChunks] = useState<{ text: string; isDialogue: boolean; paragraphIndex?: number }[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [currentNarratedBlockIndex, setCurrentNarratedBlockIndex] = useState(-1);

  const speechRateRef = useRef(speechRate);
  const speechPitchRef = useRef(speechPitch);
  const selectedVoiceURIRef = useRef(selectedVoiceURI);
  const selectedDialogueVoiceURIRef = useRef(selectedDialogueVoiceURI);
  const speechVolumeRef = useRef(speechVolume);
  const availableVoicesRef = useRef(availableVoices);
  const currentChunkIndexRef = useRef(currentChunkIndex);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lastFiredParagraphIndexRef = useRef<number>(-1);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeClipsRef = useRef<any[]>([]);
  const activeClipIndexRef = useRef<number>(0);

  useEffect(() => {
    speechRateRef.current = speechRate;
  }, [speechRate]);
  useEffect(() => {
    speechPitchRef.current = speechPitch;
  }, [speechPitch]);
  useEffect(() => {
    selectedVoiceURIRef.current = selectedVoiceURI;
  }, [selectedVoiceURI]);
  useEffect(() => {
    selectedDialogueVoiceURIRef.current = selectedDialogueVoiceURI;
  }, [selectedDialogueVoiceURI]);
  useEffect(() => {
    speechVolumeRef.current = speechVolume;
  }, [speechVolume]);
  useEffect(() => {
    availableVoicesRef.current = availableVoices;
  }, [availableVoices]);
  useEffect(() => {
    currentChunkIndexRef.current = currentChunkIndex;
  }, [currentChunkIndex]);

  const stopAllPlayback = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      if (currentUtteranceRef.current) {
        currentUtteranceRef.current.onend = null;
        currentUtteranceRef.current.onerror = null;
      }
      window.speechSynthesis.cancel();
    }
    if (activeAudioRef.current) {
      activeAudioRef.current.onended = null;
      activeAudioRef.current.onerror = null;
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    setIsPlayingText(false);
    setIsPausedText(false);
    setCurrentChunkIndex(0);
    setCurrentNarratedBlockIndex(-1);
    lastFiredParagraphIndexRef.current = -1;
    chunksRef.current = [];
    setActiveChunks([]);
    dispatchNarration({ status: 'end' });
  };

  const fireBlockSideEffects = (blockIndex: number, durationMs: number) => {
    setCurrentNarratedBlockIndex(blockIndex);
    
    dispatchNarration({ 
      status: 'block', 
      blockIndex, 
      durationMs 
    });

    if (
      useAppStore.getState().readerMode === "sen" &&
      blockIndex !== -1 &&
      blockIndex > lastFiredParagraphIndexRef.current
    ) {
      lastFiredParagraphIndexRef.current = blockIndex;
      const block = selectedChapter.blocks?.[blockIndex];
      const { immersion } = useAppStore.getState();
      
      if (block && immersion.master) {
        if (immersion.audioCues) {
          const { sfxList } = extractSFXCues(block.text);
          sfxList.forEach((sfx, i) => {
            dispatchNarrativeCue({
              id: `sfx-block-${selectedChapter.number}-${blockIndex}-${i}`,
              type: "narrative.fx.play",
              once: true,
              value: sfx,
            });
          });
        }
        if (immersion.imagePopups && block.metadata) {
          dispatchNarrativeCue({
             id: block.id || `para-${selectedChapter.number}-${blockIndex}`,
             type: "narrative.metadata.signature",
             once: true,
             metadata: block.metadata,
          });
        }
      }
    }
  };

  const startClipSequence = (clips: VoiceClip[], startIndex = 0) => {
    if (startIndex >= clips.length) {
      stopAllPlayback();
      setReaderMode('teleprompter');
      return;
    }

    setIsPlayingText(true);
    setIsPausedText(false);
    activeClipIndexRef.current = startIndex;

    const clip = clips[startIndex];
    const audio = new Audio(clip.audioUrl);
    activeAudioRef.current = audio;

    let blockIndex = selectedChapter.blocks?.findIndex(b => b.id === clip.blockId) ?? -1;
    if (blockIndex === -1 && clip.blockId?.startsWith('para-')) {
      blockIndex = parseInt(clip.blockId.replace('para-', ''), 10);
    }

    if (startIndex === 0) {
      dispatchNarration({ status: 'start' });
    }

    audio.playbackRate = speechRate;
    audio.volume = speechVolume;

    audio.onloadedmetadata = () => {
      if (blockIndex !== -1) {
        let durationMs = (audio.duration * 1000) / audio.playbackRate;
        if (!isFinite(durationMs)) {
          const blockText = selectedChapter.blocks?.[blockIndex]?.text || "";
          const wordCount = blockText.split(/\s+/).length || 10;
          durationMs = (wordCount / (speechRateRef.current * 2.7)) * 1000 || 4000;
        }

        fireBlockSideEffects(blockIndex, durationMs);
      }
    };

    audio.onended = () => {
      startClipSequence(clips, startIndex + 1);
    };

    audio.onerror = (e) => {
      console.warn("SEN clip audio failed, skipping:", e);
      startClipSequence(clips, startIndex + 1);
    };

    audio.play().catch(err => {
      console.warn("Audio play blocked/failed, skipping:", err);
      startClipSequence(clips, startIndex + 1);
    });
  };

  const handleTogglePlayback = () => {
    if (isPlayingText) {
      stopAllPlayback();
      setReaderMode('teleprompter');
      return;
    }

    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
    const isBrowserSupported = typeof window !== "undefined" && "speechSynthesis" in window;
    const hasGeneratedAudio = !!(selectedChapter?.audioManifest?.clips && selectedChapter.audioManifest.clips.length > 0);
    const generationAvailable = typeof navigator !== "undefined" && navigator.onLine;

    const canRunSEN = !isOffline && isBrowserSupported && (hasGeneratedAudio || generationAvailable);

    if (canRunSEN) {
      setReaderMode('sen');
      
      if (hasGeneratedAudio && selectedChapter.audioManifest?.clips) {
        activeClipsRef.current = selectedChapter.audioManifest.clips;
        startClipSequence(selectedChapter.audioManifest.clips, 0);
      } else {
        handleSpeak();
      }
    } else {
      setReaderMode('basic-tts');
      handleSpeak();
    }
  };

  // Stop speech if chapter changes or on unmount
  useEffect(() => {
    stopAllPlayback();
  }, [selectedChapterNum]);

  const speakChunk = (index: number) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;

    if (index >= chunksRef.current.length) {
      dispatchNarration({ status: 'end' });
      setIsPlayingText(false);
      setIsPausedText(false);
      setCurrentChunkIndex(0);
      setCurrentNarratedBlockIndex(-1);
      return;
    }

    if (currentUtteranceRef.current) {
      currentUtteranceRef.current.onend = null;
      currentUtteranceRef.current.onerror = null;
    }

    synth.cancel();

    const chunkData = chunksRef.current[index];
    
    // Some browsers (like Chrome) can silently freeze and never fire 'onend' 
    // if the utterance contains no pronounceable word characters (e.g. "...", "-", "!").
    const hasWordChars = /[a-zA-Z0-9\u00C0-\u017F\u4E00-\u9FA5\u3040-\u309F\u30A0-\u30FF]/.test(chunkData?.text || "");

    if (!chunkData || !chunkData.text.trim() || !hasWordChars) {
      setCurrentChunkIndex(index + 1);
      setTimeout(() => {
        speakChunk(index + 1);
      }, 50);
      return;
    }

    const wordCount = chunkData.text.split(/\s+/).length || 0;
    const estimatedDurationMs = (wordCount / (speechRateRef.current * 2.7)) * 1000;
    
    const currentPara = chunkData.paragraphIndex ?? -1;
    fireBlockSideEffects(currentPara, estimatedDurationMs);

    const utterance = new SpeechSynthesisUtterance(chunkData.text);
    currentUtteranceRef.current = utterance;

    const voiceURI = chunkData.isDialogue
      ? selectedDialogueVoiceURIRef.current
      : selectedVoiceURIRef.current;

    const voice = voiceURI
      ? availableVoicesRef.current.find(
          (v) => v.voiceURI === voiceURI,
        )
      : null;
    if (voice) utterance.voice = voice;
    utterance.rate = speechRateRef.current;
    utterance.pitch = speechPitchRef.current;
    utterance.volume = speechVolumeRef.current;

    utterance.onend = () => {
      const nextIndex = index + 1;
      setCurrentChunkIndex(nextIndex);
      setTimeout(() => {
        speakChunk(nextIndex);
      }, 50);
    };

    utterance.onerror = (e) => {
      console.warn("Aetherial speech synthesis chunk interrupted/errored:", e);
      if (e.error !== "interrupted" && e.error !== "canceled") {
        setIsPlayingText(false);
        setIsPausedText(false);
      }
    };

    synth.speak(utterance);
  };

  const handleSpeak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const synth = window.speechSynthesis;

    if (isPlayingText) {
      if (isPausedText) {
        setIsPausedText(false);
        dispatchNarration({ status: 'resume' });
        speakChunk(currentChunkIndex);
      } else {
        if (currentUtteranceRef.current) {
          currentUtteranceRef.current.onend = null;
          currentUtteranceRef.current.onerror = null;
        }
        synth.cancel();
        setIsPausedText(true);
        dispatchNarration({ status: 'pause' });
      }
      return;
    }

    if (currentUtteranceRef.current) {
      currentUtteranceRef.current.onend = null;
      currentUtteranceRef.current.onerror = null;
    }
    synth.cancel();

    if (!selectedChapter) return;

    let paragraphs: string[] = [];
    if (activeTranslationContent) {
      paragraphs = activeTranslationContent.split("\n\n");
    } else if (selectedChapter.blocks && selectedChapter.blocks.length > 0) {
      paragraphs = selectedChapter.blocks.map((b: any) => b.text);
    } else if (selectedChapter.generatedContent) {
      paragraphs = selectedChapter.generatedContent.split("\n\n");
    }

    if (paragraphs.length === 0) return;

    const newChunks: {
      text: string;
      isDialogue: boolean;
      paragraphIndex?: number;
    }[] = [];

    newChunks.push({
      text: `Chapter ${selectedChapter.number}. ${selectedChapter.title}.`,
      isDialogue: false,
      paragraphIndex: -1,
    });

    paragraphs.forEach((paragraph, index) => {
      if (!paragraph.trim()) return;
      const proseCleaned = extractSFXCues(paragraph).cleanText;
      const cleanText = proseCleaned
        .replace(/\[System Alert:[^\]]+\]/gi, "")
        .replace(/\[System Breakthrough:[^\]]+\]/gi, "")
        .replace(/\[System Notification:[^\]]+\]/gi, "")
        .replace(/\[Aura[^\]]+\]/gi, "");

      if (!cleanText.trim()) return;

      const rawParts = cleanText.split(/(["“「][^"”」]+["”」])/g);
      rawParts.forEach((part) => {
        if (!part.trim()) return;
        const isDialogue = /^["“「]/.test(part);
        const subChunks = part.match(/[^.!?\n]+[.!?\n]*/g) || [part];
        subChunks.forEach((sub) => {
          if (sub.trim()) {
            newChunks.push({
              text: sub.trim(),
              isDialogue,
              paragraphIndex: index,
            });
          }
        });
      });
    });

    if (newChunks.length > 0) {
      chunksRef.current = newChunks;
      setActiveChunks(newChunks);
      setCurrentChunkIndex(0);
      lastFiredParagraphIndexRef.current = -1;
      setIsPlayingText(true);
      setIsPausedText(false);
      dispatchNarration({ status: 'start' });
      speakChunk(0);
    }
  };

  const handleStopSpeaking = () => {
    stopAllPlayback();
  };

  // Dynamic Settings sync (Debounced)
  useEffect(() => {
    if (!isPlayingText || isPausedText) return;

    const timer = setTimeout(() => {
      speakChunk(currentChunkIndexRef.current);
    }, 450);

    return () => clearTimeout(timer);
  }, [speechRate, speechPitch, selectedVoiceURI, selectedDialogueVoiceURI, speechVolume]);

  // --- Cosmic Bookmarking System States & Handlers ---
  const [showBookmarksPanel, setShowBookmarksPanel] = useState(false);
  const [editingBookmarkParagraphIndex, setEditingBookmarkParagraphIndex] =
    useState<number | null>(null);
  const [bookmarkNoteText, setBookmarkNoteText] = useState("");
  const [pendingScrollToParagraph, setPendingScrollToParagraph] = useState<
    number | null
  >(null);

  const codexTerms = useMemo(() => {
    const terms: Array<{ term: string; type: 'character'|'faction'|'artifact'|'location'; entry: any }> = [];
    if (!activeStory.memory) return terms;
    activeStory.memory.characters?.forEach(c => {
      if (c.name && c.name.length > 2) terms.push({ term: c.name, type: 'character', entry: c });
    });
    activeStory.memory.factions?.forEach(f => {
      if (f.name && f.name.length > 2) terms.push({ term: f.name, type: 'faction', entry: f });
    });
    activeStory.memory.artifacts?.forEach(a => {
      if (a.name && a.name.length > 2) terms.push({ term: a.name, type: 'artifact', entry: a });
    });
    activeStory.memory.locations?.forEach(l => {
      if (l.name && l.name.length > 2) terms.push({ term: l.name, type: 'location', entry: l });
    });
    return terms.sort((a, b) => b.term.length - a.term.length);
  }, [activeStory.memory]);

  const renderHighlightedText = (text: string, paragraphIndex: number) => {
    const isPlaying = isPlayingText || isPausedText;
    let ttsHighlight = "";
    
    if (isPlaying) {
      const currentChunk = activeChunks[currentChunkIndex];
      if (currentChunk && currentChunk.paragraphIndex === paragraphIndex) {
        ttsHighlight = currentChunk.text;
      }
    }

    if (codexTerms.length === 0) {
      if (!ttsHighlight || !text.includes(ttsHighlight)) return <>{text}</>;
      const parts = text.split(ttsHighlight);
      return (
        <>
          {parts.map((part, i) => (
            <React.Fragment key={i}>
              {part}
              {i < parts.length - 1 && (
                <span className="bg-portal/20 text-portal font-medium rounded-sm px-1 py-0.5 transition-all duration-300 shadow-[0_0_8px_rgba(4,172,255,0.15)]">
                  {ttsHighlight}
                </span>
              )}
            </React.Fragment>
          ))}
        </>
      );
    }

    if (ttsHighlight && text.includes(ttsHighlight)) {
       const parts = text.split(ttsHighlight);
       return (
         <>
           {parts.map((part, i) => (
             <React.Fragment key={i}>
               {part}
               {i < parts.length - 1 && (
                 <span className="bg-portal/20 text-portal font-medium rounded-sm px-1 py-0.5 transition-all duration-300 shadow-[0_0_8px_rgba(4,172,255,0.15)]">
                   {ttsHighlight}
                 </span>
               )}
             </React.Fragment>
           ))}
         </>
       );
    }

    const escapedTerms = codexTerms.map(t => t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const pattern = new RegExp(`\\b(${escapedTerms.join('|')})\\b`, 'g');
    const parts = text.split(pattern);
    
    if (parts.length === 1) return <>{text}</>;
    
    return (
      <>
        {parts.map((part, i) => {
          if (i % 2 !== 0) {
            const matchedEntry = codexTerms.find(t => t.term === part);
            if (matchedEntry) {
              return <CodexHovercard key={i} term={part} type={matchedEntry.type} entry={matchedEntry.entry}>{part}</CodexHovercard>;
            }
          }
          return <React.Fragment key={i}>{part}</React.Fragment>;
        })}
      </>
    );
  };

  // --- Swipe Navigation States ---
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchEndY, setTouchEndY] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchEndY(null);
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
    setTouchEndY(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchStartY) return;
    const currentEndX = touchEndX !== null ? touchEndX : touchStartX;
    const currentEndY = touchEndY !== null ? touchEndY : touchStartY;

    const distanceX = touchStartX - currentEndX;
    const distanceY = touchStartY - currentEndY;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;

    // Trigger horizontal swipe only if distanceX is significantly larger than distanceY
    // This prevents accidental chapter navigation while scrolling down
    if (
      Math.abs(distanceX) > Math.abs(distanceY) * 2 &&
      Math.abs(distanceX) > minSwipeDistance
    ) {
      if (isLeftSwipe) {
        if (selectedChapterNum < maxChapterNum) navigateNext();
      } else if (isRightSwipe) {
        if (selectedChapterNum > 1) navigatePrev();
      }
    }
  };

  const handleTextClick = (e: React.MouseEvent | React.TouchEvent) => {
    if ((e.target as HTMLElement).closest("button, select, input, a")) return;
    if (window.getSelection()?.toString().length) return; // Prevent toggle when user is just selecting text
    setIsReaderFullscreen(!isReaderFullscreen);
  };

  // IntersectionObserver for narrative cues
  useEffect(() => {
    if (readerMode === "sen") return;
    const targets = document.querySelectorAll(".narrative-trigger");
    const observer = new window.IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const type = entry.target.getAttribute(
              "data-cue-type",
            ) as NarrativeCueEventType;
            const cueId = entry.target.getAttribute("data-cue-id");
            if (type && cueId) {
              let parsedValue: unknown =
                entry.target.getAttribute("data-cue-value") || undefined;
              let parsedMeta: unknown = undefined;

              const metaRaw = entry.target.getAttribute("data-cue-metadata");
              if (metaRaw) {
                try {
                  parsedMeta = JSON.parse(metaRaw);
                  parsedValue = parsedValue || parsedMeta;
                } catch (e) {}
              }

              if (typeof parsedValue === "string") {
                try {
                  parsedValue = JSON.parse(parsedValue);
                } catch (e) {
                  // Not JSON, leave as is
                }
              }

              if (readerMode === "teleprompter") {
                // In teleprompter mode: No audio, but image reveals still fire.
                if (type.startsWith("narrative.fx")) {
                  return; // No audio cues/SFX
                }
                if (type.startsWith("narrative.metadata") && !immersion.imagePopups) {
                  return; // Gate image reveals on immersion.imagePopups
                }
              } else {
                // Other non-SEN modes
                if (type.startsWith("narrative.fx") && !immersion.audioCues) {
                  return;
                }
                if (type.startsWith("narrative.metadata") && !immersion.imagePopups) {
                  return;
                }
              }

              dispatchNarrativeCue({
                id: cueId,
                type,
                once: !!entry.target.getAttribute("data-cue-once"),
                value: parsedValue,
                metadata: parsedMeta,
              });
            }
          }
        });
      },
      { threshold: 0.5 },
    );

    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [
    selectedChapterNum,
    activeStory.currentChapterNumber,
    selectedChapter.generatedContent,
    selectedChapter.blocks,
    readerMode,
    immersion.imagePopups,
    immersion.audioCues,
  ]);

  // Scroll to paragraph effect
  useEffect(() => {
    if (
      pendingScrollToParagraph !== null &&
      (selectedChapter.generatedContent || selectedChapter.blocks)
    ) {
      const timer = setTimeout(() => {
        const element = document.getElementById(
          `para-${pendingScrollToParagraph}`,
        );
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.classList.add(
            "bg-portal/10",
            "border-l-2",
            "border-portal",
            "p-2",
            "rounded",
          );
          setTimeout(() => {
            element.classList.remove(
              "bg-portal/10",
              "border-l-2",
              "border-portal",
              "p-2",
              "rounded",
            );
          }, 3000);
        }
        setPendingScrollToParagraph(null);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [
    pendingScrollToParagraph,
    selectedChapterNum,
    selectedChapter.generatedContent,
  ]);

  const handleSealClick = async () => {
    if (!handleSealChapter) return;
    if (!handleCheckConsistency) {
      handleSealChapter(selectedChapter.number);
      return;
    }
    setIsCheckingConsistency(true);
    setConsistencyWarnings(null);
    try {
      const warnings = await handleCheckConsistency(selectedChapter.number);
      if (warnings.length > 0) {
        setConsistencyWarnings(warnings);
      } else {
        await handleSealChapter(selectedChapter.number);
      }
    } catch (e) {
      await handleSealChapter(selectedChapter.number);
    } finally {
      setIsCheckingConsistency(false);
    }
  };

  const activeBookmarks = activeStory.bookmarks || [];

  const handleSaveBookmark = (
    paraIdx: number,
    excerpt: string,
    noteText: string,
  ) => {
    const existing = activeBookmarks.find(
      (b) =>
        b.chapterNumber === selectedChapter.number &&
        b.paragraphIndex === paraIdx,
    );
    let updated: Bookmark[];
    if (existing) {
      updated = activeBookmarks.map((b) => {
        if (
          b.chapterNumber === selectedChapter.number &&
          b.paragraphIndex === paraIdx
        ) {
          return { ...b, note: noteText };
        }
        return b;
      });
    } else {
      updated = [
        ...activeBookmarks,
        {
          id: Math.random().toString(36).substring(2, 9),
          chapterNumber: selectedChapter.number,
          paragraphIndex: paraIdx,
          paragraphExcerpt: excerpt.substring(0, 150),
          note: noteText,
          createdAt: new Date().toISOString(),
        },
      ];
    }
    onUpdateStory({
      ...activeStory,
      bookmarks: updated,
    });
    setEditingBookmarkParagraphIndex(null);
    setBookmarkNoteText("");
  };

  const handleRemoveBookmark = (chapterNum: number, paraIdx: number) => {
    const updated = activeBookmarks.filter(
      (b) => !(b.chapterNumber === chapterNum && b.paragraphIndex === paraIdx),
    );
    onUpdateStory({
      ...activeStory,
      bookmarks: updated,
    });
  };

  const handleJumpToBookmark = (b: Bookmark) => {
    setSelectedChapterNum(b.chapterNumber);
    setPendingScrollToParagraph(b.paragraphIndex);
    setShowBookmarksPanel(false);
  };

  const handleGenerate = () => {
    if (isGenerating) return;
    const { currentUser } = useAppStore.getState();
    if (!currentUser) {
      alert("You must sync your spirit (sign in) to forge new chapters.");
      return;
    }
    onGenerateChapter(selectedChapter.number);
  };

  const handleExportText = () => {
    let textToExport = selectedChapter.generatedContent || "";
    if (!textToExport && selectedChapter.blocks) {
      textToExport = selectedChapter.blocks.map(b => b.text).join('\n\n');
    }
    if (!textToExport) return;

    // Clean each paragraph separately to remove metadata and keep prose pure
    const paragraphs = textToExport.split("\n\n");
    const cleanedParagraphs = paragraphs
      .map((p) => extractSFXCues(p).cleanText)
      .filter((p) => !!p); // Filter out lines that were purely metadata

    const cleanedContent = cleanedParagraphs.join("\n\n");

    const blob = new Blob(
      [
        `Chapter ${selectedChapter.number}: ${selectedChapter.title}\n`,
        `========================\n`,
        `Summary: ${selectedChapter.summary || "None"}\n`,
        `System Alerts: ${selectedChapter.statsChangeMessage || "None"}\n\n`,
        cleanedContent,
      ],
      { type: "text/plain;charset=utf-8" },
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Chapter_${selectedChapter.number}_${selectedChapter.title.replace(/\s+/g, "_")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const navigatePrev = () => {
    if (selectedChapterNum > 1) {
      setSelectedChapterNum(selectedChapterNum - 1);
      readerRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const navigateNext = () => {
    const nextChapter = chapters.find(
      (c) => c.number === selectedChapterNum + 1,
    );
    if (nextChapter) {
      setSelectedChapterNum(selectedChapterNum + 1);
      readerRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const filteredChapters = chapters.filter((c) => {
    const isUnlocked =
      !!c.generatedContent ||
      !!c.hasContent ||
      (c.blocks && c.blocks.length > 0);
    if (filter === "unlocked") return isUnlocked;
    if (filter === "locked") return !isUnlocked;
    return true;
  });

  const getParticleColor = () => {
    const t = currentPrefs.themeOverride || "void";
    if (t === "crimson") return "bg-[#ff4444]";
    if (t === "abyss") return "bg-[#04ACFF]";
    if (t === "sepia") return "bg-[#d2a679]";
    if (t === "emerald") return "bg-[#10b981]";
    return "bg-[#d4af37]"; // default gold for void
  };

  const getHeaderThemeClasses = () => {
    const t = currentPrefs.themeOverride || "void";
    if (t === "crimson") return "bg-[#1a0808]/80 border-[#8B0000]/30";
    if (t === "abyss") return "bg-[#0a1222]/80 border-[#04ACFF]/20";
    if (t === "sepia") return "bg-[#2a2420]/80 border-[#8b5a2b]/30";
    if (t === "emerald") return "bg-[#0a1c12]/80 border-[#0f5132]/30";
    return "bg-[#111111]/80 border-neutral-800/60";
  };

  const isUserPlaying = isPlayingText || isPausedText;
  const getFocusClass = (paraIdx: number) => {
    if (!isUserPlaying || readerMode !== "sen") return "";
    return currentNarratedBlockIndex === paraIdx
      ? "reading-focus-active"
      : "reading-focus-dimmed";
  };

  return (
    <div
      className={`flex flex-col min-h-[85dvh] rounded-t-xl transition-colors duration-500 relative overflow-hidden ${getThemeClasses()}`}
      id="reader-chamber-root"
    >
      <ParticleSystem
        count={40}
        className="opacity-20 pointer-events-none mix-blend-screen z-0 transition-colors duration-500"
        color={getParticleColor()}
      />

      {/* HEADER: Readability & Chapter Title */}
      {!isReaderFullscreen && (
        <div
          data-cue-type="narrative.chapter.enter"
          data-cue-id={`chapter-enter-${selectedChapter.number}`}
          data-cue-once="true"
          data-cue-value={
            selectedChapter.cuePayload
              ? JSON.stringify(selectedChapter.cuePayload)
              : undefined
          }
          className={`narrative-trigger sticky top-[0px] z-20 backdrop-blur-md px-4 py-2 sm:py-3 flex items-center justify-between border-b transition-colors duration-500 ${getHeaderThemeClasses()}`}
        >
          <div className="min-w-0">
            <span className="font-sc font-semibold text-[10px] text-jade-accent tracking-[0.2em] uppercase flex items-center gap-1.5 line-clamp-1">
              <span>
                {arcTitle} • Chapter {selectedChapter.number}
              </span>
              {selectedChapter.isSealed && (
                <span title="Published & Sealed" className="flex items-center">
                  <Lock size={10} className="text-portal shrink-0" />
                </span>
              )}
            </span>
            <h2 className="font-display font-medium text-signal text-base sm:text-xl line-clamp-1 mt-0.5">
              {selectedChapter.title}
            </h2>
          </div>
          <div className="flex space-x-2 items-center shrink-0">
            <AudioWidget />
            <button
              onClick={() => onToggleRead(selectedChapter.number)}
              className={`p-2 rounded-full border flex items-center justify-center transition-all ${
                selectedChapter.status === "read"
                  ? "border-gold-accent bg-gold-accent/10 text-gold-accent"
                  : "border-neutral-800 text-neutral-400 hover:text-signal hover:bg-neutral-900"
              }`}
              title={selectedChapter.status === "read" ? "Mark Chapter as Unread" : "Mark Chapter as Finished & Read"}
              aria-label={selectedChapter.status === "read" ? "Mark Chapter as Unread" : "Mark Chapter as Finished & Read"}
            >
              <Check size={14} />
            </button>

            <button
              onClick={() => setShowReaderPreferences(!showReaderPreferences)}
              aria-expanded={showReaderPreferences}
              className={`p-2 rounded-full border flex items-center justify-center transition-all ${
                showReaderPreferences
                  ? "border-portal bg-portal/10 text-portal"
                  : "border-neutral-800 text-neutral-400 hover:text-signal hover:bg-neutral-900"
              }`}
              title="Aetherial Styles"
              aria-label="Aetherial Styles"
            >
              <Sliders size={14} />
            </button>

            <button
              onClick={() => setShowBookmarksPanel(!showBookmarksPanel)}
              aria-expanded={showBookmarksPanel}
              className={`p-2 rounded-full border flex items-center justify-center transition-all relative ${
                showBookmarksPanel
                  ? "border-gold-accent bg-gold-accent/15 text-gold-accent"
                  : activeBookmarks.length > 0
                    ? "border-portal/40 bg-portal/5 text-portal"
                    : "border-neutral-800 text-neutral-400 hover:text-signal hover:bg-neutral-900"
              }`}
              title="The Chronicle Anchors"
              aria-label="The Chronicle Anchors"
            >
              <BookmarkIcon size={14} />
              {activeBookmarks.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-human text-signal text-[8px] h-3.5 w-3.5 flex items-center justify-center rounded-full font-mono font-bold">
                  {activeBookmarks.length}
                </span>
              )}
            </button>

            <div className="flex sm:flex relative top-0 z-50 items-center space-x-2">
              <select
                value={selectedChapterNum}
                onChange={(e) =>
                  setSelectedChapterNum(parseInt(e.target.value))
                }
                className="hidden sm:block bg-void border border-neutral-800 py-1 px-3 rounded text-xs text-neutral-400 font-sans cursor-pointer focus:outline-none"
              >
                {chapters.map((ch) => (
                  <option key={ch.number} value={ch.number}>
                    Ch. {ch.number}: {ch.title.substring(0, 20)}...
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Collapsible Reader Preferences Panel */}
      <AnimatePresence>
        {showReaderPreferences && (
          <ReaderPreferencesPanel 
            currentPrefs={currentPrefs}
            handleUpdatePreference={handleUpdatePreference}
            isMuted={isMuted}
            handleMuteToggle={handleMuteToggle}
            atmosphere={atmosphere}
            handleAtmosphereChange={handleAtmosphereChange}
            volume={volume}
            handleVolumeChange={handleVolumeChange}
          />
        )}
      </AnimatePresence>

      {/* READING VIEWPORT */}
      <div
        ref={readerRef}
        className={`flex-1 overflow-y-auto px-4 sm:px-12 md:px-24 py-8 relative ${isReaderFullscreen ? "mb-4 no-scrollbar" : "mb-24 custom-scrollbar"}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleTextClick}
        onScroll={handleViewportScroll}
      >
        {isTranslating ? (
          <div className="flex flex-col items-center justify-center h-full py-32 space-y-4">
            <Loader2 className="animate-spin text-portal w-10 h-10" />
            <p className="text-signal font-serif italic text-lg opacity-80 mt-4">
              Translating the Heavenly Dao...
            </p>
          </div>
        ) : selectedChapter.generatedContent || (selectedChapter.blocks && selectedChapter.blocks.length > 0) ? (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${selectedChapter.number}-${preferredLang}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="max-w-2xl mx-auto"
              >
                {selectedChapter.assetManifest?.heroImage && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="mb-12 w-full rounded-sm overflow-hidden shadow-[0_0_40px_rgba(4,172,255,0.1)] relative border border-neutral-800/80 group"
                  >
                    <div className="absolute top-4 left-4 z-20 px-3 py-1.5 bg-void/80 backdrop-blur-md text-[10px] sm:text-xs font-mono uppercase tracking-widest text-[#04ACFF] border border-[#04ACFF]/20 rounded-sm flex items-center gap-2 shadow-lg">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#04ACFF] animate-pulse" />
                      Visual Memory Captured
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-void/30 opacity-90 z-10 pointer-events-none" />
                    <img 
                      src={selectedChapter.assetManifest.heroImage} 
                      alt="Chapter Crux Manifestation" 
                      className="w-full h-auto object-cover max-h-[65vh] mix-blend-screen opacity-90 transition-transform duration-1000 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-6 z-20 bg-gradient-to-t from-void flex flex-col justify-end">
                      <p className="text-signal/80 text-sm sm:text-base italic font-serif leading-relaxed line-clamp-3">
                        "{selectedChapter.summary}"
                      </p>
                    </div>
                  </motion.div>
                )}
                <div
                  className={`${
                    currentPrefs.fontSize === "xs"
                      ? "text-xs"
                      : currentPrefs.fontSize === "sm"
                        ? "text-sm"
                        : currentPrefs.fontSize === "base"
                          ? "text-base"
                          : currentPrefs.fontSize === "lg"
                            ? "text-[17px] sm:text-lg"
                            : "text-lg sm:text-xl"
                  } ${
                    currentPrefs.fontFamily === "serif"
                      ? "font-serif"
                      : currentPrefs.fontFamily === "sans"
                        ? "font-sans"
                        : "font-mono"
                  } ${
                    currentPrefs.lineHeight === "snug"
                      ? "leading-snug"
                      : currentPrefs.lineHeight === "normal"
                        ? "leading-normal"
                        : currentPrefs.lineHeight === "relaxed"
                          ? "leading-relaxed"
                          : "leading-loose"
                  } max-w-2xl mx-auto select-text`}
                  dir="auto"
                >
                  {activeTranslationContent
                    ? activeTranslationContent
                        .split("\n\n")
                        .map((paragraph, index) => {
                          if (!paragraph.trim()) return null;
                          const { cleanText, sfxList } =
                            extractSFXCues(paragraph);
                          if (!cleanText) return null;
                          const isSystemLine =
                            cleanText.startsWith("[") &&
                            cleanText.endsWith("]");
                          if (isSystemLine) {
                            return (
                              <SystemBlock key={index} content={cleanText} />
                            );
                          }

                          return (
                            <div
                              key={index}
                              className="group relative transition-all duration-300 border border-transparent rounded-lg p-2.5 -mx-2.5 mb-2"
                            >
                              <div className="flex items-start">
                                <div className="flex-1 min-w-0">
                                  {sfxList.map((sfx, i) => (
                                    <span
                                      key={`sfx-${index}-${i}`}
                                      className="narrative-trigger hidden"
                                      aria-hidden="true"
                                      data-cue-type="narrative.fx.play"
                                      data-cue-id={`sfx-trans-${selectedChapter.number}-${index}-${i}`}
                                      data-cue-value={sfx}
                                      data-cue-once="true"
                                    />
                                  ))}
                                  <p
                                    className={`text-justify indent-8 ${currentPrefs.paragraphSpacing === "normal" ? "mb-0" : currentPrefs.paragraphSpacing === "wide" ? "mb-2" : "mb-4"} ${getFocusClass(index)}`}
                                  >
                                    {renderHighlightedText(cleanText, index)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                    : selectedChapter.blocks
                      ? selectedChapter.blocks.map((block, index) => {
                          if (!block.text.trim()) return null;
                          const { cleanText, sfxList } = extractSFXCues(
                            block.text,
                          );
                          if (!cleanText) return null;

                          const revealEntity = block.metadata?.entities?.find(ent => {
                            if (ent.mention !== 'reveal') return false;
                            const matched = codexTerms.find(
                              t => t.term.toLowerCase() === ent.name.toLowerCase()
                            );
                            return matched && matched.entry;
                          });

                          const revealTerm = revealEntity
                            ? codexTerms.find(t => t.term.toLowerCase() === revealEntity.name.toLowerCase())
                            : undefined;

                          const revealImageUrl = revealTerm && 'imageUrl' in revealTerm.entry ? (revealTerm.entry as any).imageUrl : undefined;

                          const isSenMode = readerMode === "sen";
                          const currentParaIdx = currentNarratedBlockIndex;
                          const isPlaying = isPlayingText || isPausedText;
                          const isRevealed = !isSenMode || !immersion.imagePopups || (!isPlaying) || index <= currentParaIdx;

                          const revealCard = (revealTerm && (!isSenMode || immersion.imagePopups)) ? (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              whileInView={!isSenMode ? { opacity: 1, scale: 1 } : undefined}
                              animate={isSenMode ? (isRevealed ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }) : undefined}
                              viewport={{ once: true, margin: "-50px" }}
                              transition={{ duration: 0.5, ease: "easeOut" }}
                              className="w-full max-w-sm mx-auto my-6 p-4 min-h-[300px] rounded-xl border border-portal/30 bg-void/80 backdrop-blur-md shadow-[0_0_25px_rgba(4,172,255,0.15)] flex flex-col items-center justify-center text-center group/reveal"
                            >
                              {revealImageUrl ? (
                                <div className="relative w-[180px] h-[180px] shrink-0 rounded-lg overflow-hidden border border-neutral-900 bg-neutral-950 mb-3 shadow-inner">
                                  <img
                                    src={revealImageUrl}
                                    alt={revealTerm.entry.name}
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover/reveal:scale-105"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                                </div>
                              ) : (
                                revealTerm.type !== 'faction' && (
                                  <button
                                    onClick={() => handleManifestReveal(revealTerm.entry, revealTerm.type)}
                                    disabled={generatingRevealId === revealTerm.entry.id}
                                    className="relative w-[180px] h-[180px] shrink-0 mb-3 overflow-hidden rounded-lg bg-[#010b14] border border-portal/40 hover:border-portal flex flex-col items-center justify-center cursor-pointer transition-all duration-500 group/revealmanifest shadow-[0_0_15px_rgba(4,172,255,0.15)] hover:shadow-[0_0_25px_rgba(4,172,255,0.35)]"
                                  >
                                    <div className="absolute inset-x-0 bottom-0 top-0 h-full w-full bg-[radial-gradient(circle_at_center,rgba(4,172,255,0.18)_0%,transparent_70%)] animate-pulse pointer-events-none" />
                                    <div className="absolute w-20 h-20 rounded-full border border-dashed border-portal/25 animate-[spin_12s_linear_infinite] group-hover/revealmanifest:border-portal/50" />
                                    <div className="absolute w-[88px] h-[88px] rounded-full border border-dotted border-portal/15 animate-[spin_20s_linear_infinite_reverse]" />
                                    
                                    {generatingRevealId === revealTerm.entry.id ? (
                                      <div className="flex flex-col items-center gap-1.5 z-10">
                                        <Loader2 size={18} className="text-portal animate-spin" />
                                        <span className="font-mono text-[9px] text-portal/90 uppercase tracking-widest animate-pulse font-medium">
                                          Summoning...
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center gap-1.5 z-10 transition-transform duration-300 group-hover/revealmanifest:scale-105">
                                        <span className="text-portal text-sm group-hover/revealmanifest:animate-bounce">✦</span>
                                        <span className="font-sc text-[10px] text-signal tracking-widest font-bold uppercase">
                                          Manifest
                                        </span>
                                        <span className="font-mono text-[8px] text-neutral-500 tracking-wider">
                                          Awaken Portrait
                                        </span>
                                      </div>
                                    )}
                                  </button>
                                )
                              )}
                              <span className="font-mono text-[9px] text-portal uppercase tracking-widest mb-1 font-bold">
                                Reveal · {revealTerm.type}
                              </span>
                              <h4 className="font-display font-medium text-lg text-signal tracking-wide">
                                {revealTerm.entry.name}
                              </h4>
                              {revealTerm.entry.description && (
                                <p className="font-serif italic text-xs text-neutral-400 mt-1 max-w-[280px] line-clamp-2">
                                  {revealTerm.entry.description}
                                </p>
                              )}
                            </motion.div>
                          ) : null;

                          const isSystemLine =
                            cleanText.startsWith("[") &&
                            cleanText.endsWith("]");

                          if (isSystemLine || block.system) {
                            return (
                              <React.Fragment key={block.id || `para-${index}`}>
                                {revealCard}
                                <SystemBlock
                                  content={cleanText}
                                  system={block.system}
                                  data-cue-type="narrative.metadata.signature"
                                  data-cue-id={
                                    block.id ||
                                    `system-line-${selectedChapter.number}-${index}`
                                  }
                                  data-cue-metadata={
                                    block.metadata
                                      ? JSON.stringify(block.metadata)
                                      : undefined
                                  }
                                  data-cue-once="true"
                                  data-block-index={index}
                                  className={`narrative-trigger ${block.metadata ? "metadata-block" : ""}`}
                                />
                              </React.Fragment>
                            );
                          }

                          const existingBookmark = activeBookmarks.find(
                            (b) =>
                              b.chapterNumber === selectedChapter.number &&
                              b.paragraphIndex === index,
                          );
                          const isEditingThisBookmark =
                            editingBookmarkParagraphIndex === index;

                          return (
                            <React.Fragment key={block.id || `para-${index}`}>
                              {revealCard}
                              <div
                                id={`para-${index}`}
                                data-block-index={index}
                              data-cue-type={
                                block.metadata
                                  ? "narrative.metadata.signature"
                                  : undefined
                              }
                              data-cue-id={
                                block.id ||
                                `para-${selectedChapter.number}-${index}`
                              }
                              data-cue-metadata={
                                block.metadata
                                  ? JSON.stringify(block.metadata)
                                  : undefined
                              }
                              data-cue-once="true"
                              className={`relative group paragraph-block transition-colors duration-200 mb-6 ${existingBookmark ? "custom-bookmark-bg" : ""} ${block.metadata ? "narrative-trigger metadata-block" : ""}`}
                            >
                              {sfxList.map((sfx, i) => (
                                <span
                                  key={`sfx-${index}-${i}`}
                                  className="narrative-trigger hidden"
                                  aria-hidden="true"
                                  data-cue-type="narrative.fx.play"
                                  data-cue-id={`sfx-block-${selectedChapter.number}-${index}-${i}`}
                                  data-cue-value={sfx}
                                  data-cue-once="true"
                                />
                              ))}
                              <p className={`text-justify indent-8 relative ${getFocusClass(index)}`}>
                                {renderHighlightedText(cleanText, index)}
                                <button
                                  onClick={() => {
                                    if (existingBookmark) {
                                      handleRemoveBookmark(
                                        selectedChapter.number,
                                        index,
                                      );
                                    } else {
                                      setEditingBookmarkParagraphIndex(index);
                                      setBookmarkNoteText(
                                        existingBookmark
                                          ? existingBookmark.note || ""
                                          : "",
                                      );
                                    }
                                  }}
                                  className={`inline-block ml-3 align-baseline transition-opacity ${existingBookmark ? "text-gold-accent opacity-100" : "text-neutral-500 opacity-20 md:opacity-0 hover:opacity-100 group-hover:opacity-100"}`}
                                  title={
                                    existingBookmark
                                      ? "Remove bookmark"
                                      : "Bookmark this position"
                                  }
                                >
                                  <BookmarkIcon
                                    size={14}
                                    className={
                                      existingBookmark ? "fill-current" : ""
                                    }
                                  />
                                </button>
                              </p>

                              {/* Inline Bookmark Editor */}
                              {isEditingThisBookmark && (
                                <div className="mt-4 p-4 bg-void border border-neutral-800 rounded-lg shadow-xl relative z-20">
                                  <textarea
                                    value={bookmarkNoteText}
                                    onChange={(e) =>
                                      setBookmarkNoteText(e.target.value)
                                    }
                                    placeholder="Add a contemplation or heavenly mechanic note here..."
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded p-3 text-sm text-signal placeholder-neutral-600 focus:outline-none focus:border-portal mb-3 min-h-[80px]"
                                    autoFocus
                                  />
                                  <div className="flex justify-end space-x-2">
                                    <button
                                      onClick={() =>
                                        setEditingBookmarkParagraphIndex(null)
                                      }
                                      className="px-4 py-1.5 text-xs text-neutral-400 hover:text-signal transition-colors font-mono"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleSaveBookmark(
                                          index,
                                          block.text.substring(0, 100) + "...",
                                          bookmarkNoteText,
                                        )
                                      }
                                      className="px-4 py-1.5 text-xs bg-human text-signal rounded hover:bg-void transition-colors font-sans"
                                    >
                                      Save Bookmark
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Display Saved Bookmark Note (if active) */}
                              {existingBookmark &&
                                existingBookmark.note &&
                                !isEditingThisBookmark && (
                                  <div className="mt-2 text-xs font-mono text-gold-accent flex items-start space-x-2 bg-neutral-900/50 p-2 border-l border-gold-accent/50 ml-8">
                                    <span className="opacity-70">Note:</span>
                                    <span className="break-words font-sans italic opacity-90">
                                      {existingBookmark.note}
                                    </span>
                                  </div>
                                )}
                            </div>
                          </React.Fragment>
                          );
                        })
                      : (selectedChapter.generatedContent || "")
                          .split("\n\n")
                          .map((paragraph, index) => {
                            if (!paragraph.trim()) return null;
                            const { cleanText, sfxList } =
                              extractSFXCues(paragraph);
                            if (!cleanText) return null;
                            const isSystemLine =
                              cleanText.startsWith("[") &&
                              cleanText.endsWith("]");
                            if (isSystemLine) {
                              return (
                                <SystemBlock
                                  key={index}
                                  content={cleanText}
                                  data-cue-type="narrative.metadata.signature"
                                  data-cue-id={`system-line-${selectedChapter.number}-${index}`}
                                  className="narrative-trigger"
                                />
                              );
                            }

                            const existingBookmark = activeBookmarks.find(
                              (b) =>
                                b.chapterNumber === selectedChapter.number &&
                                b.paragraphIndex === index,
                            );
                            const isEditingThis =
                              editingBookmarkParagraphIndex === index;

                            return (
                              <div
                                key={index}
                                id={`para-${index}`}
                                data-cue-type="narrative.paragraph.enter"
                                data-cue-id={`para-${selectedChapter.number}-${index}`}
                                data-cue-once="true"
                                className="narrative-trigger group relative transition-all duration-300 border border-transparent hover:bg-neutral-900/5 hover:border-neutral-900/10 rounded-lg p-2.5 -mx-2.5 mb-2"
                              >
                                <div className="flex items-start">
                                  {/* Interactive Left Margin Anchor Rail */}
                                  <div className="flex-shrink-0 w-6 flex flex-col items-center justify-start pt-1 mr-2 bg-transparent select-none">
                                    {existingBookmark ? (
                                      <button
                                        onClick={() => {
                                          setEditingBookmarkParagraphIndex(
                                            index,
                                          );
                                          setBookmarkNoteText(
                                            existingBookmark.note || "",
                                          );
                                        }}
                                        className="text-portal hover:text-gold-accent transition-colors p-1"
                                        title="Engraved Anchor - Edit Note"
                                      >
                                        <BookmarkIcon
                                          size={12}
                                          fill="currentColor"
                                        />
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setEditingBookmarkParagraphIndex(
                                            index,
                                          );
                                          setBookmarkNoteText("");
                                        }}
                                        className="opacity-20 md:opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-portal transition-all p-1"
                                        title="Affix Anchor"
                                      >
                                        <Plus size={12} />
                                      </button>
                                    )}
                                  </div>

                                  {/* Paragraph text */}
                                  <div className="flex-1 min-w-0">
                                    {sfxList.map((sfx, i) => (
                                      <span
                                        key={`sfx-${index}-${i}`}
                                        className="narrative-trigger hidden"
                                        aria-hidden="true"
                                        data-cue-type="narrative.fx.play"
                                        data-cue-id={`sfx-text-${selectedChapter.number}-${index}-${i}`}
                                        data-cue-value={sfx}
                                        data-cue-once="true"
                                      />
                                    ))}
                                    <p
                                      className={`text-justify indent-8 ${
                                        currentPrefs.paragraphSpacing ===
                                        "normal"
                                          ? "mb-0"
                                          : currentPrefs.paragraphSpacing ===
                                              "wide"
                                            ? "mb-2"
                                            : "mb-4"
                                      }`}
                                    >
                                      {renderHighlightedText(cleanText, index)}
                                    </p>
                                  </div>
                                </div>

                                {/* Display saved Note under anchored paragraph */}
                                {existingBookmark &&
                                  !isEditingThis &&
                                  existingBookmark.note && (
                                    <div className="mt-2 ml-8 pl-3 border-l-2 border-portal bg-portal/5 p-2 rounded text-xs text-neutral-350 font-sans italic flex items-start justify-between">
                                      <span>
                                        <span className="font-sc font-semibold text-portal uppercase tracking-wider text-[9px] block not-italic">
                                          Resonance Note:
                                        </span>
                                        {existingBookmark.note}
                                      </span>
                                      <button
                                        onClick={() =>
                                          handleRemoveBookmark(
                                            selectedChapter.number,
                                            index,
                                          )
                                        }
                                        className="text-neutral-550 hover:text-red-500 p-1 opacity-40 md:opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Release Anchor"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    </div>
                                  )}

                                {/* Editing Panel (Inline) */}
                                {isEditingThis && (
                                  <div className="mt-3 ml-8 p-3 bg-neutral-950 border border-neutral-900 rounded space-y-2">
                                    <span className="text-[10px] font-sc text-portal uppercase tracking-wider block font-bold">
                                      {existingBookmark
                                        ? "Edit Aetherial Resonance"
                                        : "Engrave Aetherial Resonance"}
                                    </span>
                                    <input
                                      type="text"
                                      value={bookmarkNoteText}
                                      onChange={(e) =>
                                        setBookmarkNoteText(e.target.value)
                                      }
                                      placeholder="Type an insightful note, prediction, or timeline event..."
                                      className="w-full bg-void text-xs text-signal border border-neutral-850 focus:border-portal p-2 rounded focus:outline-none"
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          handleSaveBookmark(
                                            index,
                                            paragraph,
                                            bookmarkNoteText,
                                          );
                                        }
                                      }}
                                    />
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] text-neutral-500 font-mono">
                                        Press Enter to engrave
                                      </span>
                                      <div className="flex space-x-2">
                                        {existingBookmark && (
                                          <button
                                            onClick={() => {
                                              handleRemoveBookmark(
                                                selectedChapter.number,
                                                index,
                                              );
                                              setEditingBookmarkParagraphIndex(
                                                null,
                                              );
                                            }}
                                            className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-widest text-red-500 hover:bg-neutral-900"
                                          >
                                            Release
                                          </button>
                                        )}
                                        <button
                                          onClick={() =>
                                            setEditingBookmarkParagraphIndex(
                                              null,
                                            )
                                          }
                                          className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-widest text-neutral-550 hover:bg-neutral-900"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleSaveBookmark(
                                              index,
                                              paragraph,
                                              bookmarkNoteText,
                                            )
                                          }
                                          className="px-3 py-1 text-[10px] uppercase font-bold tracking-widest bg-portal text-void font-sc rounded hover:brightness-110"
                                        >
                                          Save
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Voice Edition Feature */}
            {(selectedChapter.generatedContent || selectedChapter.blocks) && (
               <VoiceEditionPanel
                  selectedChapter={selectedChapter}
                  activeStory={activeStory}
                  onUpdateStory={onUpdateStory}
               />
            )}

            {/* Navigation links at bottom of chapter */}
            <div className="flex items-center justify-between border-t border-neutral-900 pt-8 mt-16 pb-8">
              <button
                onClick={navigatePrev}
                disabled={selectedChapterNum === 1}
                className="px-6 py-2 rounded-full border border-neutral-800 hover:border-gold-accent text-neutral-400 hover:text-gold-accent disabled:opacity-20 transition-all font-sc uppercase text-[10px] tracking-wider flex items-center space-x-2"
              >
                <ArrowLeft size={14} />
                <span>Previous</span>
              </button>

              {handleSealChapter &&
                !selectedChapter.isSealed &&
                (!!selectedChapter.generatedContent || !!(selectedChapter.blocks && selectedChapter.blocks.length > 0)) && (
                  <button
                    onClick={handleSealClick}
                    disabled={isCheckingConsistency}
                    className="px-6 py-2 rounded-full border border-portal bg-portal/10 hover:bg-portal hover:text-void text-portal transition-all font-sc uppercase text-[10px] tracking-wider flex items-center space-x-2 shadow-[0_0_10px_rgba(4,172,255,0.15)] mx-auto disabled:opacity-50"
                  >
                    {isCheckingConsistency ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                    <span className="hidden sm:inline">
                      {isCheckingConsistency ? "Guarding Continuity..." : "Seal Chapter (Publish)"}
                    </span>
                    <span className="sm:hidden">{isCheckingConsistency ? "..." : "Publish"}</span>
                  </button>
                )}

              <button
                onClick={navigateNext}
                disabled={selectedChapterNum === maxChapterNum}
                className="px-6 py-2 rounded-full border border-neutral-800 hover:border-gold-accent text-neutral-400 hover:text-gold-accent disabled:opacity-20 transition-all font-sc uppercase text-[10px] tracking-wider flex items-center space-x-2"
              >
                <span>Next</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </>
        ) : isGenerating ? (
          <div className="max-w-2xl mx-auto py-12 animate-pulse space-y-6">
            <div className="space-y-4">
              <div className="h-3 bg-neutral-800/50 rounded w-[85%]"></div>
              <div className="h-3 bg-neutral-800/50 rounded w-full"></div>
              <div className="h-3 bg-neutral-800/50 rounded w-full"></div>
              <div className="h-3 bg-neutral-800/50 rounded w-[60%]"></div>
            </div>

            <div className="pt-8 space-y-4">
              <div className="h-3 bg-neutral-800/50 rounded w-full"></div>
              <div className="h-3 bg-neutral-800/50 rounded w-[90%]"></div>
              <div className="h-3 bg-neutral-800/50 rounded w-full"></div>
              <div className="h-3 bg-neutral-800/50 rounded w-[75%]"></div>
            </div>

            <div className="pt-8 space-y-4">
              <div className="h-3 bg-neutral-800/50 rounded w-[80%]"></div>
              <div className="h-3 bg-neutral-800/50 rounded w-full"></div>
              <div className="h-3 bg-neutral-800/50 rounded w-[70%]"></div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-24">
            <div className="p-4 bg-void rounded-full border border-gold-accent/30 text-gold-accent mb-4 animate-pulse">
              <Sparkles size={32} />
            </div>
            <h3 className="font-sc font-bold text-signal text-lg uppercase tracking-widest mb-2">
              Unmanifested Segment
            </h3>
            <p className="font-serif italic text-neutral-500 mb-8 max-w-sm ml-auto mr-auto text-center px-4">
              "{selectedChapter.premise}"
            </p>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`group relative w-full px-6 py-3.5 bg-void border border-human text-human text-xs sm:text-sm font-sc font-bold uppercase tracking-widest rounded shadow-[0_0_20px_rgba(139,0,0,0.4),inset_0_0_15px_rgba(139,0,0,0.2)] hover:shadow-[0_0_30px_rgba(139,0,0,0.6),inset_0_0_25px_rgba(139,0,0,0.4)] hover:bg-human/10 hover:text-signal transition-all duration-500 overflow-hidden flex items-center justify-center space-x-2 ${
                isGenerating ? "opacity-65 cursor-not-allowed" : ""
              }`}
            >
              {!isGenerating && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-human/10 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />
              )}
              {isGenerating ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.5,
                      ease: "linear",
                    }}
                    className="w-4 h-4 border-2 border-human border-t-transparent rounded-full shrink-0"
                  />
                  <span>
                    {activeAgentId === "versa"
                      ? "VERSA is shaping..."
                      : activeAgentId === "scout"
                        ? "SCOUT is scanning..."
                        : "Condensing Narrative..."}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles
                    size={14}
                    className="relative z-10 group-hover:animate-pulse"
                  />
                  <span className="relative z-10 drop-shadow-[0_0_8px_rgba(139,0,0,0.6)]">
                    Sow Karma
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* BOTTOM AUDIO / PLAYER NAVIGATION BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-950/95 backdrop-blur-xl border-t border-neutral-900 z-40 px-4 py-2 sm:py-3 pb-6 sm:pb-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="max-w-4xl mx-auto">
          {/* Mobile View: Ultra-sleek compact player navigation row */}
          <div className="flex sm:hidden items-center justify-between w-full">
            {/* Flanking Chapter Navigation on Left */}
            <div className="flex items-center space-x-2 bg-void/60 border border-neutral-900 rounded p-1">
              <button
                onClick={navigatePrev}
                disabled={selectedChapterNum === 1}
                className="text-neutral-400 hover:text-signal disabled:opacity-20 p-2.5"
                title="Previous Chapter"
              >
                <ArrowLeft size={16} />
              </button>
              <span className="text-[10px] font-mono text-neutral-400 font-bold select-none px-1">
                {selectedChapterNum}/{maxChapterNum}
              </span>
              <button
                onClick={navigateNext}
                disabled={selectedChapterNum === maxChapterNum}
                className="text-neutral-400 hover:text-signal disabled:opacity-20 p-2.5"
                title="Next Chapter"
              >
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Central Play/Pause RECITER bubble */}
            <div className="flex items-center space-x-2 relative">
              {/* Mobile Cosmic Vinyl/Reciter Disk */}
              <div className="relative group/disc flex items-center justify-center h-14 w-14 select-none shrink-0 animate-duration-[4000ms]">
                <div
                  className={`absolute inset-0 rounded-full border border border-[#FAFAFA]/10 bg-[conic-gradient(from_0deg,#0a0a0a_0%,#262626_25%,#0a0a0a_50%,#262626_75%,#0a0a0a_100%)] shadow-[0_0_20px_rgba(4,172,255,0.12)] transition-transform duration-[4000ms] ease-linear overflow-hidden ${
                    isPlayingText && !isPausedText
                      ? "animate-spin"
                      : "group-hover/disc:rotate-12"
                  }`}
                >
                  {/* High-fidelity vinyl ridges */}
                  <div className="absolute inset-[3px] rounded-full border border-dashed border-neutral-850/80" />
                  <div className="absolute inset-[6px] rounded-full border border-double border-neutral-900/60" />
                  <div className="absolute inset-[10px] rounded-full border border-neutral-900/40" />
                  <div className="absolute inset-[15px] rounded-full border border-dashed border-neutral-900/20" />

                  {/* Floating consciousness pulse tracks / laser sheen effect */}
                  {isPlayingText && !isPausedText ? (
                    <>
                      <div className="absolute top-0 bottom-0 left-[27px] w-[2px] bg-gradient-to-b from-transparent via-[#04ACFF]/50 to-transparent rotate-45 transform origin-center" />
                      <div className="absolute top-0 bottom-0 left-[27px] w-[2px] bg-gradient-to-b from-transparent via-[#8B0000]/50 to-transparent -rotate-45 transform origin-center" />
                      <div className="absolute inset-[12px] rounded-full border-2 border-portal/20 animate-pulse" />
                    </>
                  ) : (
                    <div className="absolute top-0 bottom-0 left-[27px] w-[2px] bg-gradient-to-b from-transparent via-neutral-700/40 to-transparent rotate-30 transform origin-center" />
                  )}
                </div>

                {/* Central audio touch Core key */}
                <button
                  onClick={handleTogglePlayback}
                  disabled={!(selectedChapter.generatedContent || (selectedChapter.blocks && selectedChapter.blocks.length > 0))}
                  className={`absolute h-8 w-8 rounded-full flex items-center justify-center transition-all z-10 ${
                    !(selectedChapter.generatedContent || (selectedChapter.blocks && selectedChapter.blocks.length > 0))
                      ? "bg-neutral-900 text-neutral-600 border border-neutral-800"
                      : isPlayingText && !isPausedText
                        ? "bg-[#8B0000] text-[#FAFAFA] border border-[#FAFAFA]/20 shadow-[0_0_12px_rgba(139,0,0,0.8)] hover:scale-105"
                        : "bg-[#04ACFF] text-[#000000] border border-[#FAFAFA]/10 shadow-[0_0_12px_rgba(4,172,255,0.8)] hover:scale-105"
                  }`}
                  title={
                    isPlayingText && !isPausedText
                      ? "Stop Audio Playback"
                      : "Begin Rhythmic Recitation"
                  }
                >
                  {isPlayingText && !isPausedText ? (
                    <Pause
                      size={12}
                      fill="currentColor"
                      className="text-[#FAFAFA]"
                    />
                  ) : (
                    <Play
                      size={12}
                      fill="currentColor"
                      className="ml-0.5 text-[#000000]"
                    />
                  )}
                </button>
              </div>
              <button
                onClick={() =>
                  setSpeechRate((prev) => (prev >= 2 ? 0.5 : prev + 0.5))
                }
                className="text-[9px] font-mono hover:text-signal bg-void border border-neutral-850 px-2.5 py-2 min-w-[44px] rounded text-neutral-400"
              >
                {speechRate.toFixed(1)}x
              </button>
              <button
                onClick={() => setShowImmersionPopover(!showImmersionPopover)}
                className={`p-1.5 border rounded transition-colors ${showImmersionPopover ? "bg-neutral-800 border-neutral-700 text-signal" : "bg-void border-neutral-800 hover:text-signal hover:bg-neutral-900 text-neutral-400"}`}
              >
                <Settings size={14} />
              </button>

              {/* Floating Basic Narration Fallback Indicator */}
              {readerMode === 'basic-tts' && isPlayingText && (
                <div className="absolute bottom-full mb-14 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-bounce">
                  <span className="text-[8px] uppercase font-mono tracking-widest text-[#FAFAFA] bg-neutral-950/95 border border-neutral-800 px-3 py-1 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.7)]">
                    Basic Narration
                  </span>
                </div>
              )}

              {/* Mobile Immersion Tooltip */}
              {showImmersionPopover && (
                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-[280px] bg-black/95 backdrop-blur-md border border-neutral-850 rounded-xl shadow-[0_4px_30px_rgba(0,0,0,0.8)] p-4 z-50 text-sans text-left">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-neutral-900 pb-2 mb-3">
                    <h4 className="text-[10px] uppercase font-sc text-portal tracking-wider font-bold">
                      Immersion Control Matrix
                    </h4>
                    <span className="text-[8px] font-mono text-neutral-500">
                      v2.0
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    {/* Master Switch on Top */}
                    <div className="flex items-center justify-between bg-neutral-950/85 p-2 rounded-lg border border-neutral-900">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-medium text-[#FAFAFA] font-sans">
                          Immersion Engine
                        </span>
                        <span className="text-[9px] text-neutral-500 font-sans">
                          Master consciousness coupling
                        </span>
                      </div>
                      <button
                        onClick={() => setImmersion({ master: !immersion.master })}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          immersion.master ? "bg-portal/80 shadow-[0_0_8px_rgba(4,172,255,0.4)]" : "bg-neutral-850"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-void shadow transition duration-200 ease-in-out ${
                            immersion.master ? "translate-x-4 bg-signal" : "translate-x-0 bg-neutral-500"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Sub-toggles */}
                    <div className={`space-y-3 pl-1 transition-opacity duration-200 ${immersion.master ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                      
                      {/* Auto-scroll */}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-medium text-neutral-300">
                            Autonomous Reading
                          </span>
                          <span className="text-[8px] text-neutral-500">
                            Pages follow reading playhead
                          </span>
                        </div>
                        <button
                          onClick={() => immersion.master && setImmersion({ autoScroll: !immersion.autoScroll })}
                          disabled={!immersion.master}
                          className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-150 ease-in-out focus:outline-none ${
                            immersion.autoScroll ? "bg-portal/60" : "bg-neutral-850"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-void shadow transition duration-150 ease-in-out ${
                              immersion.autoScroll ? "translate-x-4 bg-signal" : "translate-x-0 bg-neutral-500"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Audio cues */}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-medium text-neutral-300">
                            Aetheric Sound Effects
                          </span>
                          <span className="text-[8px] text-neutral-500">
                            Adaptive localized SFX cues
                          </span>
                        </div>
                        <button
                          onClick={() => immersion.master && setImmersion({ audioCues: !immersion.audioCues })}
                          disabled={!immersion.master}
                          className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-150 ease-in-out focus:outline-none ${
                            immersion.audioCues ? "bg-portal/60" : "bg-neutral-850"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-void shadow transition duration-150 ease-in-out ${
                              immersion.audioCues ? "translate-x-4 bg-signal" : "translate-x-0 bg-neutral-500"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Image popups */}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-medium text-neutral-300">
                            Holographic Visions
                          </span>
                          <span className="text-[8px] text-neutral-500">
                            Automatic scenic image pop-ups
                          </span>
                        </div>
                        <button
                          onClick={() => immersion.master && setImmersion({ imagePopups: !immersion.imagePopups })}
                          disabled={!immersion.master}
                          className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-150 ease-in-out focus:outline-none ${
                            immersion.imagePopups ? "bg-portal/60" : "bg-neutral-850"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-void shadow transition duration-150 ease-in-out ${
                              immersion.imagePopups ? "translate-x-4 bg-signal" : "translate-x-0 bg-neutral-500"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Scene music */}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-medium text-neutral-300">
                            Scene Harmonics
                          </span>
                          <span className="text-[8px] text-neutral-500">
                            Atmospheric musical tapestries
                          </span>
                        </div>
                        <button
                          onClick={() => immersion.master && setImmersion({ sceneMusic: !immersion.sceneMusic })}
                          disabled={!immersion.master}
                          className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-150 ease-in-out focus:outline-none ${
                            immersion.sceneMusic ? "bg-portal/60" : "bg-neutral-850"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-void shadow transition duration-150 ease-in-out ${
                              immersion.sceneMusic ? "translate-x-4 bg-signal" : "translate-x-0 bg-neutral-500"
                            }`}
                          />
                        </button>
                      </div>
                      
                    </div>

                    {/* Collapsible Voice Settings */}
                    <div className="border-t border-neutral-900 pt-2 mt-1">
                      <button
                        onClick={() => setShowVoiceDetail(!showVoiceDetail)}
                        className="flex items-center justify-between w-full text-[9px] uppercase font-sc text-neutral-400 hover:text-signal transition-colors py-1 focus:outline-none"
                      >
                        <span>Voice Matrix Signature</span>
                        <span className="text-[8px] font-mono">{showVoiceDetail ? "▲" : "▼"}</span>
                      </button>
                      
                      {showVoiceDetail && (
                        <div className="space-y-2 mt-2 animate-fade-in text-neutral-400">
                          <div>
                            <label className="block text-[8px] text-neutral-500 mb-1">
                              Narrator Voice
                            </label>
                            <select
                              value={selectedVoiceURI}
                              onChange={(e) => setSelectedVoiceURI(e.target.value)}
                              className="w-full bg-void border border-neutral-850 rounded text-[10px] p-1 focus:border-portal focus:outline-none"
                            >
                              {availableVoices.map((v) => (
                                <option key={v.voiceURI} value={v.voiceURI}>
                                  {v.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-[8px] text-neutral-500 mb-1">
                              Dialogue Voice
                            </label>
                            <select
                              value={selectedDialogueVoiceURI}
                              onChange={(e) => setSelectedDialogueVoiceURI(e.target.value)}
                              className="w-full bg-void border border-neutral-850 rounded text-[10px] p-1 focus:border-portal focus:outline-none"
                            >
                              {availableVoices.map((v) => (
                                <option key={v.voiceURI} value={v.voiceURI}>
                                  {v.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Access Icons on Right */}
            <div className="flex items-center space-x-1.5 bg-void/60 border border-neutral-900 rounded-full px-1.5 py-1">
              <button
                onClick={navigatePrev}
                disabled={selectedChapterNum <= 1}
                className="p-2 text-neutral-400 hover:text-portal transition-colors disabled:opacity-20 disabled:pointer-events-none"
                title="Previous Chapter"
              >
                <ArrowLeft size={16} />
              </button>
              <button
                onClick={() => onSwitchTab && onSwitchTab("codex")}
                className="p-2 text-neutral-400 hover:text-portal transition-colors"
                title="Codex"
              >
                <ListMusic size={16} />
              </button>
              <button
                onClick={navigateNext}
                disabled={
                  selectedChapterNum === maxChapterNum ||
                  !chapters.find((c) => c.number === selectedChapterNum + 1)
                }
                className="p-2 text-neutral-400 hover:text-human transition-colors disabled:opacity-20 disabled:pointer-events-none"
                title="Next Chapter"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Desktop View (Hidden on Mobile) */}
          <div className="hidden sm:flex flex-row items-center justify-between gap-4">
            {/* TTS Audio Controls */}
            <div className="flex items-center space-x-4">
              {/* Desktop Cosmic Vinyl/Reciter Disk */}
              <div className="relative group/disc flex items-center justify-center h-16 w-16 select-none shrink-0 animate-duration-[4000ms]">
                <div
                  className={`absolute inset-0 rounded-full border border-neutral-850 bg-[#000000] shadow-[0_0_20px_rgba(4,172,255,0.1)] transition-transform duration-[4000ms] ease-linear overflow-hidden ${
                    isPlayingText && !isPausedText
                      ? "animate-spin"
                      : "group-hover/disc:rotate-12"
                  }`}
                >
                  {/* Concentric sound record grooves */}
                  <div className="absolute inset-1.5 rounded-full border border-dashed border-neutral-900/60" />
                  <div className="absolute inset-3 rounded-full border border-double border-neutral-900/40" />
                  <div className="absolute inset-4.5 rounded-full border border-neutral-900/20" />

                  {/* Floating consciousness pulse tracks */}
                  {isPlayingText && !isPausedText && (
                    <>
                      <div className="absolute top-[4px] left-[26px] right-[26px] h-[1.5px] bg-[#04ACFF]/30 animate-pulse" />
                      <div className="absolute bottom-[4px] left-[26px] right-[26px] h-[1.5px] bg-[#8B0000]/30 animate-pulse [animation-delay:200ms]" />
                      <div className="absolute left-[4px] top-[26px] bottom-[26px] w-[1.5px] bg-[#04ACFF]/30 animate-pulse [animation-delay:400ms]" />
                      <div className="absolute right-[4px] top-[26px] bottom-[26px] w-[1.5px] bg-[#8B0000]/30 animate-pulse [animation-delay:600ms]" />
                    </>
                  )}
                </div>

                {/* Central audio touch Core key */}
                <button
                  onClick={handleTogglePlayback}
                  disabled={!(selectedChapter.generatedContent || (selectedChapter.blocks && selectedChapter.blocks.length > 0))}
                  className={`absolute h-10 w-10 rounded-full flex items-center justify-center transition-all z-10 ${
                    !(selectedChapter.generatedContent || (selectedChapter.blocks && selectedChapter.blocks.length > 0))
                      ? "bg-neutral-900 text-neutral-600 border border-neutral-800 shadow-none"
                      : isPlayingText && !isPausedText
                        ? "bg-[#8B0000] text-[#FAFAFA] border border-[#fafafa]/25 shadow-[0_0_15px_rgba(139,0,0,0.6)] hover:scale-105"
                        : "bg-[#04ACFF] text-[#000000] border border-[#fafafa]/15 shadow-[0_0_15px_rgba(4,172,255,0.6)] hover:scale-105"
                  }`}
                  title={
                    isPlayingText && !isPausedText
                      ? "Stop Audio Playback"
                      : "Begin Rhythmic Recitation"
                  }
                >
                  {isPlayingText && !isPausedText ? (
                    <Pause
                      size={15}
                      fill="currentColor"
                      className="text-[#FAFAFA]"
                    />
                  ) : (
                    <Play
                      size={15}
                      fill="currentColor"
                      className="ml-0.5 text-[#000000]"
                    />
                  )}
                </button>
              </div>
              <div>
                <p className="font-sc font-bold text-signal text-[10px] tracking-widest uppercase flex items-center gap-1.5">
                  <span>
                    {isPlayingText && !isPausedText
                      ? "Rhythmic Recitation Active"
                      : "Listen to Chapter"}
                  </span>
                  {readerMode === 'basic-tts' && isPlayingText && (
                    <span className="text-[7.5px] uppercase font-mono tracking-wider text-[#000000] bg-portal px-1 rounded font-bold">
                      Basic Narration
                    </span>
                  )}
                </p>
                <p className="font-sans text-[10px] text-neutral-500">
                  Chapter {selectedChapterNum}
                </p>
              </div>
              {/* Voice / Speed toggles (Simple) */}
              <div className="flex items-center space-x-2 text-neutral-400 relative">
                <button
                  onClick={() =>
                    setSpeechRate((prev) => (prev >= 2 ? 0.5 : prev + 0.5))
                  }
                  className="text-[10px] font-mono hover:text-signal bg-void border border-neutral-800 px-2 py-1 rounded"
                >
                  {speechRate.toFixed(1)}x
                </button>
                <button
                  onClick={() => setShowImmersionPopover(!showImmersionPopover)}
                  className={`p-1 border rounded transition-colors ${showImmersionPopover ? "bg-neutral-800 border-neutral-700 text-signal" : "bg-void border-neutral-800 hover:text-signal hover:bg-neutral-900"}`}
                >
                  <Settings size={14} />
                </button>

                {showImmersionPopover && (
                  <div className="absolute bottom-full mb-3 left-0 w-72 bg-black/95 backdrop-blur-md border border-neutral-855 rounded-xl shadow-[0_4px_30px_rgba(0,0,0,0.8)] p-4 z-50 animate-fade-in font-sans text-left">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-neutral-900 pb-2.5 mb-3">
                      <h4 className="text-[11px] uppercase font-sc text-portal tracking-wider font-bold">
                        Immersion Control Matrix
                      </h4>
                      <span className="text-[9px] font-mono text-neutral-500">
                        v2.0
                      </span>
                    </div>

                    <div className="space-y-4">
                      {/* Master Switch on Top */}
                      <div className="flex items-center justify-between bg-neutral-950/85 p-2 rounded-lg border border-neutral-900">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-[#FAFAFA] font-sans">
                            Immersion Engine
                          </span>
                          <span className="text-[10px] text-neutral-500 font-sans">
                            Master consciousness coupling
                          </span>
                        </div>
                        <button
                          onClick={() => setImmersion({ master: !immersion.master })}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            immersion.master ? "bg-portal/80 shadow-[0_0_8px_rgba(4,172,255,0.4)]" : "bg-neutral-850"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-void shadow transition duration-200 ease-in-out ${
                              immersion.master ? "translate-x-4 bg-signal" : "translate-x-0 bg-neutral-500"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Sub-toggles */}
                      <div className={`space-y-3 pl-1 transition-opacity duration-200 ${immersion.master ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                        
                        {/* Auto-scroll */}
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-medium text-neutral-300">
                              Autonomous Reading
                            </span>
                            <span className="text-[9px] text-neutral-500">
                              Pages follow reading playhead
                            </span>
                          </div>
                          <button
                            onClick={() => immersion.master && setImmersion({ autoScroll: !immersion.autoScroll })}
                            disabled={!immersion.master}
                            className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-150 ease-in-out focus:outline-none ${
                              immersion.autoScroll ? "bg-portal/60" : "bg-neutral-850"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-void shadow transition duration-150 ease-in-out ${
                                immersion.autoScroll ? "translate-x-4 bg-signal" : "translate-x-0 bg-neutral-500"
                              }`}
                            />
                          </button>
                        </div>

                        {/* Audio cues */}
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-medium text-neutral-300">
                              Aetheric Sound Effects
                            </span>
                            <span className="text-[9px] text-neutral-500">
                              Adaptive localized SFX cues
                            </span>
                          </div>
                          <button
                            onClick={() => immersion.master && setImmersion({ audioCues: !immersion.audioCues })}
                            disabled={!immersion.master}
                            className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-150 ease-in-out focus:outline-none ${
                              immersion.audioCues ? "bg-portal/60" : "bg-neutral-850"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-void shadow transition duration-150 ease-in-out ${
                                immersion.audioCues ? "translate-x-4 bg-signal" : "translate-x-0 bg-neutral-500"
                              }`}
                            />
                          </button>
                        </div>

                        {/* Image popups */}
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-medium text-neutral-300">
                              Holographic Visions
                            </span>
                            <span className="text-[9px] text-neutral-500">
                              Automatic scenic image pop-ups
                            </span>
                          </div>
                          <button
                            onClick={() => immersion.master && setImmersion({ imagePopups: !immersion.imagePopups })}
                            disabled={!immersion.master}
                            className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-150 ease-in-out focus:outline-none ${
                              immersion.imagePopups ? "bg-portal/60" : "bg-neutral-850"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-void shadow transition duration-150 ease-in-out ${
                                immersion.imagePopups ? "translate-x-4 bg-signal" : "translate-x-0 bg-neutral-500"
                              }`}
                            />
                          </button>
                        </div>

                        {/* Scene music */}
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-medium text-neutral-300">
                              Scene Harmonics
                            </span>
                            <span className="text-[9px] text-neutral-500">
                              Atmospheric musical tapestries
                            </span>
                          </div>
                          <button
                            onClick={() => immersion.master && setImmersion({ sceneMusic: !immersion.sceneMusic })}
                            disabled={!immersion.master}
                            className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-150 ease-in-out focus:outline-none ${
                              immersion.sceneMusic ? "bg-portal/60" : "bg-neutral-850"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-void shadow transition duration-150 ease-in-out ${
                                immersion.sceneMusic ? "translate-x-4 bg-signal" : "translate-x-0 bg-neutral-500"
                              }`}
                            />
                          </button>
                        </div>
                        
                      </div>

                      {/* Collapsible Voice Settings */}
                      <div className="border-t border-neutral-900 pt-2 mt-2">
                        <button
                          onClick={() => setShowVoiceDetail(!showVoiceDetail)}
                          className="flex items-center justify-between w-full text-[10px] uppercase font-sc text-neutral-400 hover:text-signal transition-colors py-1 focus:outline-none"
                        >
                          <span>Voice Matrix Signature</span>
                          <span className="text-[8px] font-mono">{showVoiceDetail ? "▲" : "▼"}</span>
                        </button>
                        
                        {showVoiceDetail && (
                          <div className="space-y-2.5 mt-2 animate-fade-in text-neutral-400">
                            <div>
                              <label className="block text-[9px] text-neutral-500 mb-1">
                                Narrator Voice
                              </label>
                              <select
                                value={selectedVoiceURI}
                                onChange={(e) => setSelectedVoiceURI(e.target.value)}
                                className="w-full bg-void border border-neutral-850 rounded text-[10px] p-1 focus:border-portal focus:outline-none"
                              >
                                {availableVoices.map((v) => (
                                  <option key={v.voiceURI} value={v.voiceURI}>
                                    {v.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-[9px] text-neutral-500 mb-1">
                                Dialogue Voice
                              </label>
                              <select
                                value={selectedDialogueVoiceURI}
                                onChange={(e) => setSelectedDialogueVoiceURI(e.target.value)}
                                className="w-full bg-void border border-neutral-850 rounded text-[10px] p-1 focus:border-portal focus:outline-none"
                              >
                                {availableVoices.map((v) => (
                                  <option key={v.voiceURI} value={v.voiceURI}>
                                    {v.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleExportText}
                  className="text-[10px] font-sc uppercase hover:text-signal bg-void border border-neutral-800 px-2 py-1 rounded ml-2"
                >
                  Download
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
              {/* Quick Access Lore Action Links */}
              <div className="flex items-center space-x-4 bg-void border border-neutral-900 rounded-full px-2 py-1">
                <button
                  onClick={navigatePrev}
                  disabled={selectedChapterNum <= 1}
                  className="px-3 py-1.5 flex items-center space-x-1.5 text-neutral-400 hover:text-portal disabled:opacity-25 disabled:pointer-events-none transition-colors text-[10px] font-sc uppercase tracking-wider font-semibold"
                >
                  <ArrowLeft size={14} />
                  <span>Previous Chapter</span>
                </button>
                <div className="w-[1px] h-4 bg-neutral-800"></div>
                <button
                  onClick={() => onSwitchTab && onSwitchTab("codex")}
                  className="px-3 py-1.5 flex items-center space-x-1.5 text-neutral-400 hover:text-portal transition-colors text-[10px] font-sc uppercase tracking-wider"
                >
                  <ListMusic size={14} />
                  <span>Codex</span>
                </button>
                <div className="w-[1px] h-4 bg-neutral-800"></div>
                <button
                  onClick={navigateNext}
                  disabled={
                    selectedChapterNum === maxChapterNum ||
                    !chapters.find((c) => c.number === selectedChapterNum + 1)
                  }
                  className="px-3 py-1.5 flex items-center space-x-1.5 text-neutral-400 hover:text-human disabled:opacity-25 disabled:pointer-events-none transition-colors text-[10px] font-sc uppercase tracking-wider font-semibold"
                >
                  <ArrowRight size={14} />
                  <span>Next Chapter</span>
                </button>
              </div>

              {handleAlterFate && (
                <button
                  onClick={() => setIsAlterFateOpen(true)}
                  className="px-4 py-2 border border-portal text-portal font-sc font-bold uppercase tracking-wider text-[10px] rounded-full hover:bg-portal hover:text-void transition-colors flex items-center gap-2 shadow-[0_0_10px_rgba(4,172,255,0.15)]"
                >
                  <Zap size={14} />
                  <span>Alter Fate (Branch)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* THE CHRONICLE ANCHORS (BOOKMARKS DRAW PANEL) */}
      <CosmicBookmarksPanel
        showBookmarksPanel={showBookmarksPanel}
        setShowBookmarksPanel={setShowBookmarksPanel}
        activeBookmarks={activeBookmarks}
        chapters={chapters}
        handleRemoveBookmark={handleRemoveBookmark}
        handleJumpToBookmark={handleJumpToBookmark}
      />

      {handleAlterFate && (
        <AlterFatePanel
          isOpen={isAlterFateOpen}
          onClose={() => setIsAlterFateOpen(false)}
          chapterNumber={selectedChapterNum}
          onConfirmFork={(direction, prompt) => {
            setIsAlterFateOpen(false);
            handleAlterFate(selectedChapterNum, direction, prompt);
          }}
        />
      )}

      {/* Small Resume Affordance for Teleprompter Mode */}
      <AnimatePresence>
        {readerMode === "teleprompter" && isAutoScrollPausedByUser && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 z-40 bg-black/95 border border-portal/40 hover:border-portal shadow-[0_0_20px_rgba(4,172,255,0.25)] rounded-full px-6 py-3 flex items-center gap-3 backdrop-blur-md"
          >
            <span className="text-signal text-xs font-sans tracking-wide">
              Auto-scroll paused
            </span>
            <button
              onClick={() => {
                setIsAutoScrollPausedByUser(false);
                playAutoScroll();
              }}
              className="bg-portal hover:bg-[#00c0ff] text-void text-xs font-sans font-medium px-4 py-1.5 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(4,172,255,0.4)]"
            >
              <Play size={12} className="fill-current" />
              Resume Reading
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {consistencyWarnings && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-void border border-portal/50 rounded-lg p-6 max-w-lg w-full shadow-[0_0_50px_rgba(4,172,255,0.15)] relative">
            <h3 className="text-xl font-display text-portal flex items-center gap-2 mb-4">
              <ShieldAlert size={20} /> Continuity Guard Warning
            </h3>
            <p className="text-signal text-sm mb-6">
              The Heavenly Dao sensors have detected potential logic fractures in this chapter. It is recommended to alter fate or manually edit before sealing.
            </p>
            <ul className="space-y-3 mb-8">
              {consistencyWarnings.map((warning, idx) => (
                <li key={idx} className="bg-portal/10 border-l-[3px] border-portal text-portal p-3 text-sm rounded-r flex items-start gap-2">
                  <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setConsistencyWarnings(null)}
                className="px-4 py-2 border border-neutral-700 text-neutral-400 hover:text-signal rounded font-sc text-xs tracking-wider transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                   setConsistencyWarnings(null);
                   if (handleSealChapter) await handleSealChapter(selectedChapter.number);
                }}
                className="px-4 py-2 bg-portal/20 hover:bg-portal hover:text-void border border-portal text-portal rounded font-sc text-xs tracking-wider transition-colors flex items-center gap-2"
              >
                Seal Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
