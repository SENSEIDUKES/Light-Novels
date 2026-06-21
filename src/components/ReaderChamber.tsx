import React, { useRef, useState, useEffect } from "react";
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
} from "../types";
import { motion, AnimatePresence } from "motion/react";
import { VirtualizedList } from "./VirtualizedList";
import { ParticleSystem } from "./ParticleSystem";
import { AudioWidget } from "./AudioWidget";
import {
  dispatchNarrativeCue,
  NarrativeCueEventType,
} from "../lib/narrativeCues";
import { useChapterTranslation } from "../hooks/useChapterTranslation";
import { useAppStore } from "../store/useAppStore";
import { SystemBlock } from "./SystemBlock";

import { AlterFatePanel } from "./AlterFatePanel";

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
}: ReaderChamberProps) {
  const [filter, setFilter] = useState<"all" | "unlocked" | "locked">("all");
  const [isAlterFateOpen, setIsAlterFateOpen] = useState(false);
  const readerRef = useRef<HTMLDivElement>(null);

  // --- Translation States ---
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

  // --- atmospheric audio (just reference, no actual addition needed here)
  const isReaderFullscreen = useAppStore((state) => state.isReaderFullscreen);
  const setIsReaderFullscreen = useAppStore(
    (state) => state.setIsReaderFullscreen,
  );
  const activeAgentId = useAppStore((state) => state.activeAgentId);

  const selectedChapter =
    chapters.find((c) => c.number === selectedChapterNum) || chapters[0];

  useEffect(() => {
    if (preferredLang === "en") {
      setActiveTranslationContent(null);
      return;
    }

    const doTranslation = async () => {
      if (!selectedChapter.generatedContent) return;
      if (selectedChapter.translations?.[preferredLang]) {
        setActiveTranslationContent(
          selectedChapter.translations[preferredLang].content,
        );
        return;
      }
      const result = await translateChapter(
        activeStory.id,
        selectedChapter.number,
        selectedChapter.generatedContent,
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
  const [showTtsControls, setShowTtsControls] = useState<boolean>(false);

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

  const speechRateRef = useRef(speechRate);
  const speechPitchRef = useRef(speechPitch);
  const selectedVoiceURIRef = useRef(selectedVoiceURI);
  const selectedDialogueVoiceURIRef = useRef(selectedDialogueVoiceURI);
  const speechVolumeRef = useRef(speechVolume);
  const availableVoicesRef = useRef(availableVoices);
  const currentChunkIndexRef = useRef(currentChunkIndex);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

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

  // Stop speech if chapter changes or on unmount
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      if (currentUtteranceRef.current) {
        currentUtteranceRef.current.onend = null;
        currentUtteranceRef.current.onerror = null;
      }
      window.speechSynthesis.cancel();
      chunksRef.current = [];
      setActiveChunks([]);
      setIsPlayingText(false);
      setIsPausedText(false);
      setCurrentChunkIndex(0);
    }
  }, [selectedChapterNum]);

  const speakChunk = (index: number) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;

    if (index >= chunksRef.current.length) {
      setIsPlayingText(false);
      setIsPausedText(false);
      setCurrentChunkIndex(0);
      return;
    }

    if (currentUtteranceRef.current) {
      currentUtteranceRef.current.onend = null;
      currentUtteranceRef.current.onerror = null;
    }

    synth.cancel();

    const chunkData = chunksRef.current[index];
    if (!chunkData || !chunkData.text.trim()) {
      setCurrentChunkIndex(index + 1);
      speakChunk(index + 1);
      return;
    }

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
        speakChunk(currentChunkIndex);
      } else {
        if (currentUtteranceRef.current) {
          currentUtteranceRef.current.onend = null;
          currentUtteranceRef.current.onerror = null;
        }
        synth.cancel();
        setIsPausedText(true);
      }
      return;
    }

    if (currentUtteranceRef.current) {
      currentUtteranceRef.current.onend = null;
      currentUtteranceRef.current.onerror = null;
    }
    synth.cancel();

    if (!selectedChapter || !selectedChapter.generatedContent) return;

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

    const paragraphs = (selectedChapter.generatedContent || "").split("\n\n");
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
      setIsPlayingText(true);
      setIsPausedText(false);
      speakChunk(0);
    }
  };

  const handleStopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      if (currentUtteranceRef.current) {
        currentUtteranceRef.current.onend = null;
        currentUtteranceRef.current.onerror = null;
      }
      window.speechSynthesis.cancel();
      chunksRef.current = [];
      setActiveChunks([]);
      setIsPlayingText(false);
      setIsPausedText(false);
      setCurrentChunkIndex(0);
    }
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

  const renderHighlightedText = (text: string, paragraphIndex: number) => {
    const isPlaying = isPlayingText || isPausedText;
    if (!isPlaying) return <>{text}</>;

    const currentChunk = activeChunks[currentChunkIndex];
    if (!currentChunk || currentChunk.paragraphIndex !== paragraphIndex)
      return <>{text}</>;

    const highlight = currentChunk.text;
    if (!highlight || !text.includes(highlight)) return <>{text}</>;

    const parts = text.split(highlight);
    return (
      <>
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {part}
            {i < parts.length - 1 && (
              <span className="bg-portal/20 text-portal font-medium rounded-sm px-1 py-0.5 transition-all duration-300 shadow-[0_0_8px_rgba(4,172,255,0.15)]">
                {highlight}
              </span>
            )}
          </React.Fragment>
        ))}
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
        if (selectedChapterNum < chapters.length) navigateNext();
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
    onGenerateChapter(selectedChapter.number);
  };

  const handleExportText = () => {
    if (!selectedChapter.generatedContent) return;

    // Clean each paragraph separately to remove metadata and keep prose pure
    const paragraphs = selectedChapter.generatedContent.split("\n\n");
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
            >
              <Check size={14} />
            </button>

            <button
              onClick={() => setShowReaderPreferences(!showReaderPreferences)}
              className={`p-2 rounded-full border flex items-center justify-center transition-all ${
                showReaderPreferences
                  ? "border-portal bg-portal/10 text-portal"
                  : "border-neutral-800 text-neutral-400 hover:text-signal hover:bg-neutral-900"
              }`}
              title="Aetherial Styles"
            >
              <Sliders size={14} />
            </button>

            <button
              onClick={() => setShowBookmarksPanel(!showBookmarksPanel)}
              className={`p-2 rounded-full border flex items-center justify-center transition-all relative ${
                showBookmarksPanel
                  ? "border-gold-accent bg-gold-accent/15 text-gold-accent"
                  : activeBookmarks.length > 0
                    ? "border-portal/40 bg-portal/5 text-portal"
                    : "border-neutral-800 text-neutral-400 hover:text-signal hover:bg-neutral-900"
              }`}
              title="The Chronicle Anchors"
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
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-neutral-950 border-b border-neutral-900 overflow-hidden px-4 py-4 space-y-4"
          >
            <div className="max-w-2xl mx-auto grid grid-cols-2 sm:grid-cols-5 gap-4">
              {/* Font Family control */}
              <div className="space-y-1">
                <span className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block">
                  Aura Font
                </span>
                <div className="flex flex-col gap-1">
                  {(["serif", "sans", "mono"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => handleUpdatePreference("fontFamily", f)}
                      className={`px-2 py-1 text-[10px] rounded border text-left flex items-center justify-between transition-all capitalize ${
                        currentPrefs.fontFamily === f
                          ? "bg-portal/10 border-portal text-portal font-bold"
                          : "bg-void border-neutral-800 text-neutral-400 hover:border-neutral-700"
                      }`}
                    >
                      <span>
                        {f === "serif"
                          ? "Literata (Serif)"
                          : f === "sans"
                            ? "Rubik (Sans)"
                            : "System Mono"}
                      </span>
                      {currentPrefs.fontFamily === f && <Check size={8} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size control */}
              <div className="space-y-1">
                <span className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block">
                  Sizing Index
                </span>
                <div className="flex flex-col gap-1">
                  {(["xs", "sm", "base", "lg", "xl"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleUpdatePreference("fontSize", s)}
                      className={`px-2 py-1 text-[10px] rounded border text-left flex items-center justify-between transition-all uppercase ${
                        currentPrefs.fontSize === s
                          ? "bg-portal/10 border-portal text-portal font-bold"
                          : "bg-void border-neutral-800 text-neutral-400 hover:border-neutral-700"
                      }`}
                    >
                      <span>{s}</span>
                      {currentPrefs.fontSize === s && <Check size={8} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Line Height control */}
              <div className="space-y-1">
                <span className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block">
                  Line Spacing
                </span>
                <div className="flex flex-col gap-1">
                  {(["snug", "normal", "relaxed", "loose"] as const).map(
                    (l) => (
                      <button
                        key={l}
                        onClick={() => handleUpdatePreference("lineHeight", l)}
                        className={`px-2 py-1 text-[10px] rounded border text-left flex items-center justify-between transition-all capitalize ${
                          currentPrefs.lineHeight === l
                            ? "bg-portal/10 border-portal text-portal font-bold"
                            : "bg-void border-neutral-800 text-neutral-400 hover:border-neutral-700"
                        }`}
                      >
                        <span>{l}</span>
                        {currentPrefs.lineHeight === l && <Check size={8} />}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Paragraph Spacing control */}
              <div className="space-y-1">
                <span className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block">
                  Break Spacing
                </span>
                <div className="flex flex-col gap-1">
                  {(["normal", "wide", "double"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() =>
                        handleUpdatePreference("paragraphSpacing", p)
                      }
                      className={`px-2 py-1 text-[10px] rounded border text-left flex items-center justify-between transition-all capitalize ${
                        currentPrefs.paragraphSpacing === p
                          ? "bg-portal/10 border-portal text-portal font-bold"
                          : "bg-void border-neutral-800 text-neutral-400 hover:border-neutral-700"
                      }`}
                    >
                      <span>{p}</span>
                      {currentPrefs.paragraphSpacing === p && (
                        <Check size={8} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme override control */}
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <span className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block">
                  Ethereal Hue
                </span>
                <div className="flex flex-col gap-1">
                  {(
                    ["void", "crimson", "abyss", "sepia", "emerald"] as const
                  ).map((t) => (
                    <button
                      key={t}
                      onClick={() => handleUpdatePreference("themeOverride", t)}
                      className={`px-2 py-1 text-[10px] rounded border text-left flex items-center justify-between transition-all capitalize ${
                        currentPrefs.themeOverride === t
                          ? "bg-portal/10 border-portal text-portal font-bold"
                          : "bg-void border-neutral-800 text-neutral-400 hover:border-neutral-700"
                      }`}
                    >
                      <span>{t}</span>
                      {currentPrefs.themeOverride === t && <Check size={8} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Atmospheric Synthesizer Controls */}
            <div className="border-t border-neutral-900/60 mt-5 pt-4 max-w-2xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <span className="text-[10px] font-sc text-portal uppercase tracking-wider font-bold flex items-center justify-center md:justify-start gap-1.5">
                  <Sliders size={11} className="text-portal" />
                  Atmospheric Synthesis
                </span>
                <p className="text-[9px] text-neutral-500 mt-0.5">
                  Generates generative background elements. Soundscapes evolve
                  dynamically to reflect dramatic narrative spikes.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                {/* Mute button */}
                <button
                  onClick={() => handleMuteToggle(!isMuted)}
                  className={`px-3 py-1.5 text-[10px] rounded border flex items-center gap-1.5 transition-all uppercase font-sc font-bold tracking-wider ${
                    isMuted
                      ? "bg-red-950/20 border-red-900/40 text-red-500 hover:bg-neutral-900"
                      : "bg-portal/10 border-portal text-portal hover:brightness-110"
                  }`}
                  title={
                    isMuted ? "Unmute sound synthesis" : "Mute sound synthesis"
                  }
                >
                  {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                  <span>{isMuted ? "Muted" : "Sound Active"}</span>
                </button>

                {/* Atmosphere selection */}
                <div className="flex items-center gap-1.5 bg-void border border-neutral-850 px-2 py-1 rounded">
                  <span className="text-[9px] font-mono text-neutral-500 uppercase">
                    Ambience:
                  </span>
                  <select
                    value={atmosphere}
                    disabled={isMuted}
                    onChange={(e) => handleAtmosphereChange(e.target.value)}
                    className="bg-transparent text-[10px] text-neutral-300 font-mono focus:outline-none focus:text-signal cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option value="none" className="bg-void">
                      Silence
                    </option>
                    <option value="wind" className="bg-void">
                      Howling Wind
                    </option>
                    <option value="rain" className="bg-void">
                      Heavy Rain
                    </option>
                    <option value="temple" className="bg-void">
                      Temple Bells
                    </option>
                  </select>
                </div>

                {/* Volume slider */}
                <div className="flex items-center gap-2 bg-void border border-neutral-850 px-2 py-1 rounded">
                  <span className="text-[9px] font-mono text-neutral-500 uppercase">
                    Vol:
                  </span>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={volume}
                    disabled={isMuted}
                    onChange={(e) =>
                      handleVolumeChange(parseFloat(e.target.value))
                    }
                    className="w-16 hover:cursor-grab disabled:opacity-40 disabled:cursor-not-allowed accent-portal text-portal"
                  />
                  <span className="text-[9px] font-mono text-neutral-400 w-7 text-right">
                    {isMuted ? "0%" : `${Math.round(volume * 100)}%`}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
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
      >
        {isTranslating ? (
          <div className="flex flex-col items-center justify-center h-full py-32 space-y-4">
            <Loader2 className="animate-spin text-portal w-10 h-10" />
            <p className="text-signal font-serif italic text-lg opacity-80 mt-4">
              Translating the Heavenly Dao...
            </p>
          </div>
        ) : selectedChapter.generatedContent ? (
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
                                    className={`text-justify indent-8 ${currentPrefs.paragraphSpacing === "normal" ? "mb-0" : currentPrefs.paragraphSpacing === "wide" ? "mb-2" : "mb-4"}`}
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
                          const isSystemLine =
                            cleanText.startsWith("[") &&
                            cleanText.endsWith("]");

                          if (isSystemLine) {
                            return (
                              <SystemBlock
                                key={block.id || `para-${index}`}
                                content={cleanText}
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
                                className={`narrative-trigger ${block.metadata ? "metadata-block" : ""}`}
                              />
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
                            <div
                              key={block.id || `para-${index}`}
                              id={`para-${index}`}
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
                              <p className="text-justify indent-8 relative">
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
                !!selectedChapter.generatedContent && (
                  <button
                    onClick={() => handleSealChapter(selectedChapter.number)}
                    className="px-6 py-2 rounded-full border border-portal bg-portal/10 hover:bg-portal hover:text-void text-portal transition-all font-sc uppercase text-[10px] tracking-wider flex items-center space-x-2 shadow-[0_0_10px_rgba(4,172,255,0.15)] mx-auto"
                  >
                    <Lock size={14} />
                    <span className="hidden sm:inline">
                      Seal Chapter (Publish)
                    </span>
                    <span className="sm:hidden">Publish</span>
                  </button>
                )}

              <button
                onClick={navigateNext}
                disabled={selectedChapterNum === chapters.length}
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
                        : "Condensing Scroll..."}
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
                {selectedChapterNum}/{chapters.length}
              </span>
              <button
                onClick={navigateNext}
                disabled={selectedChapterNum === chapters.length}
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
                  onClick={handleSpeak}
                  disabled={!selectedChapter.generatedContent}
                  className={`absolute h-8 w-8 rounded-full flex items-center justify-center transition-all z-10 ${
                    !selectedChapter.generatedContent
                      ? "bg-neutral-900 text-neutral-600 border border-neutral-800"
                      : isPlayingText && !isPausedText
                        ? "bg-[#8B0000] text-[#FAFAFA] border border-[#FAFAFA]/20 shadow-[0_0_12px_rgba(139,0,0,0.8)] hover:scale-105"
                        : "bg-[#04ACFF] text-[#000000] border border-[#FAFAFA]/10 shadow-[0_0_12px_rgba(4,172,255,0.8)] hover:scale-105"
                  }`}
                  title={
                    isPlayingText && !isPausedText
                      ? "Pause Recitation"
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
                onClick={() => setShowTtsControls(!showTtsControls)}
                className={`p-1.5 border rounded transition-colors ${showTtsControls ? "bg-neutral-800 border-neutral-700 text-signal" : "bg-void border-neutral-800 hover:text-signal hover:bg-neutral-900 text-neutral-400"}`}
              >
                <Settings size={14} />
              </button>

              {/* Mobile Settings Tooltip */}
              {showTtsControls && (
                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-[280px] bg-black border border-neutral-800 rounded-lg shadow-xl p-3 z-50">
                  <h4 className="text-[10px] uppercase font-sc text-neutral-500 mb-2 tracking-wider text-center">
                    Voice Synthesis Engine
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] text-neutral-400 mb-1">
                        Narrator Voice Signature
                      </label>
                      <select
                        value={selectedVoiceURI}
                        onChange={(e) => setSelectedVoiceURI(e.target.value)}
                        className="w-full bg-void border border-neutral-800 rounded text-[11px] p-1.5 focus:border-portal focus:outline-none mb-2"
                      >
                        {availableVoices.map((v) => (
                          <option key={v.voiceURI} value={v.voiceURI}>
                            {v.name} ({v.lang})
                          </option>
                        ))}
                      </select>
                      
                      <label className="block text-[10px] text-neutral-400 mb-1">
                        Dialogue Voice Signature
                      </label>
                      <select
                        value={selectedDialogueVoiceURI}
                        onChange={(e) => setSelectedDialogueVoiceURI(e.target.value)}
                        className="w-full bg-void border border-neutral-800 rounded text-[11px] p-1.5 focus:border-portal focus:outline-none"
                      >
                        {availableVoices.map((v) => (
                          <option key={v.voiceURI} value={v.voiceURI}>
                            {v.name} ({v.lang})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-neutral-400 mb-1">
                          Rate ({speechRate}x)
                        </label>
                        <input
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.1"
                          value={speechRate}
                          onChange={(e) =>
                            setSpeechRate(parseFloat(e.target.value))
                          }
                          className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-400 mb-1">
                          Pitch ({speechPitch})
                        </label>
                        <input
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.1"
                          value={speechPitch}
                          onChange={(e) =>
                            setSpeechPitch(parseFloat(e.target.value))
                          }
                          className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="border-t border-neutral-900 pt-2 mt-1">
                      <label className="block text-[10px] text-neutral-400 mb-1">
                        Volume ({Math.round(speechVolume * 100)}%)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={speechVolume}
                        onChange={(e) =>
                          setSpeechVolume(parseFloat(e.target.value))
                        }
                        className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                      />
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
                title="Previous Scroll"
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
                  selectedChapterNum === chapters.length ||
                  !chapters.find((c) => c.number === selectedChapterNum + 1)
                }
                className="p-2 text-neutral-400 hover:text-human transition-colors disabled:opacity-20 disabled:pointer-events-none"
                title="Next Scroll"
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
                  onClick={handleSpeak}
                  disabled={!selectedChapter.generatedContent}
                  className={`absolute h-10 w-10 rounded-full flex items-center justify-center transition-all z-10 ${
                    !selectedChapter.generatedContent
                      ? "bg-neutral-900 text-neutral-600 border border-neutral-800 shadow-none"
                      : isPlayingText && !isPausedText
                        ? "bg-[#8B0000] text-[#FAFAFA] border border-[#fafafa]/25 shadow-[0_0_15px_rgba(139,0,0,0.6)] hover:scale-105"
                        : "bg-[#04ACFF] text-[#000000] border border-[#fafafa]/15 shadow-[0_0_15px_rgba(4,172,255,0.6)] hover:scale-105"
                  }`}
                  title={
                    isPlayingText && !isPausedText
                      ? "Pause Recitation"
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
                <p className="font-sc font-bold text-signal text-[10px] tracking-widest uppercase">
                  {isPlayingText && !isPausedText
                    ? "Rhythmic Recitation Active"
                    : "Listen to Scroll"}
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
                  onClick={() => setShowTtsControls(!showTtsControls)}
                  className={`p-1 border rounded transition-colors ${showTtsControls ? "bg-neutral-800 border-neutral-700 text-signal" : "bg-void border-neutral-800 hover:text-signal hover:bg-neutral-900"}`}
                >
                  <Settings size={14} />
                </button>

                {showTtsControls && (
                  <div className="absolute bottom-full mb-3 left-0 w-64 bg-black border border-neutral-800 rounded-lg shadow-xl p-3 z-50">
                    <h4 className="text-[10px] uppercase font-sc text-neutral-500 mb-2 tracking-wider">
                      Voice Synthesis Engine
                    </h4>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] text-neutral-400 mb-1">
                          Narrator Voice Signature
                        </label>
                        <select
                          value={selectedVoiceURI}
                          onChange={(e) => setSelectedVoiceURI(e.target.value)}
                          className="w-full bg-void border border-neutral-800 rounded text-[11px] p-1.5 focus:border-portal focus:outline-none mb-2"
                        >
                          {availableVoices.map((v) => (
                            <option key={v.voiceURI} value={v.voiceURI}>
                              {v.name} ({v.lang})
                            </option>
                          ))}
                        </select>
                        
                        <label className="block text-[10px] text-neutral-400 mb-1">
                          Dialogue Voice Signature
                        </label>
                        <select
                          value={selectedDialogueVoiceURI}
                          onChange={(e) => setSelectedDialogueVoiceURI(e.target.value)}
                          className="w-full bg-void border border-neutral-800 rounded text-[11px] p-1.5 focus:border-portal focus:outline-none"
                        >
                          {availableVoices.map((v) => (
                            <option key={v.voiceURI} value={v.voiceURI}>
                              {v.name} ({v.lang})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-neutral-400 mb-1">
                            Rate ({speechRate}x)
                          </label>
                          <input
                            type="range"
                            min="0.5"
                            max="2"
                            step="0.1"
                            value={speechRate}
                            onChange={(e) =>
                              setSpeechRate(parseFloat(e.target.value))
                            }
                            className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-neutral-400 mb-1">
                            Pitch ({speechPitch})
                          </label>
                          <input
                            type="range"
                            min="0.5"
                            max="2"
                            step="0.1"
                            value={speechPitch}
                            onChange={(e) =>
                              setSpeechPitch(parseFloat(e.target.value))
                            }
                            className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
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
                  <span>Previous Scroll</span>
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
                    selectedChapterNum === chapters.length ||
                    !chapters.find((c) => c.number === selectedChapterNum + 1)
                  }
                  className="px-3 py-1.5 flex items-center space-x-1.5 text-neutral-400 hover:text-human disabled:opacity-25 disabled:pointer-events-none transition-colors text-[10px] font-sc uppercase tracking-wider font-semibold"
                >
                  <ArrowRight size={14} />
                  <span>Next Scroll</span>
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
      <AnimatePresence>
        {showBookmarksPanel && (
          <>
            {/* Backdrop blur overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBookmarksPanel(false)}
              className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm"
            />

            {/* Sidebar Drawer container */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 24, stiffness: 180 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-black border-l border-neutral-900 z-50 p-6 flex flex-col justify-between shadow-[2px_0_20px_rgba(0,0,0,0.95)]"
            >
              <div className="flex-1 flex flex-col min-h-0">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-neutral-900 mb-6">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-1.5 bg-portal/10 text-portal rounded">
                      <BookmarkIcon size={18} fill="currentColor" />
                    </div>
                    <div>
                      <h3 className="font-sc font-bold text-sm text-signal tracking-widest uppercase">
                        The Chronicle Anchors
                      </h3>
                      <p className="text-[10px] text-neutral-550 uppercase tracking-wider font-semibold font-sc">
                        Spatial Memory Nodes
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowBookmarksPanel(false)}
                    className="p-1.5 text-neutral-400 hover:text-signal rounded border border-neutral-900 hover:border-neutral-850 transition-all font-sc text-[10px] uppercase tracking-wider"
                  >
                    Close
                  </button>
                </div>

                {/* Scroll list */}
                <div className="flex-1 min-h-0">
                  <VirtualizedList
                    items={activeBookmarks}
                    itemHeight={180} // Estimated height of each memoir card element with annotations
                    containerHeight="100%"
                    className="pr-1"
                    emptyPlaceholder={
                      <div className="h-full flex flex-col items-center justify-center text-center text-neutral-650 space-y-3 py-16">
                        <BookmarkIcon
                          size={36}
                          className="text-neutral-800 animate-pulse animate-duration-1000"
                        />
                        <p className="font-serif italic text-xs max-w-xs px-4">
                          "No memory anchors exist in current alignment. Hover
                          beside paragraphs to affix anchors, annotations, and
                          memory marks."
                        </p>
                      </div>
                    }
                    renderItem={(bookmark) => {
                      const bookmarkedChapter = chapters.find(
                        (c) => c.number === bookmark.chapterNumber,
                      );
                      return (
                        <div
                          key={bookmark.id}
                          className="p-4 bg-neutral-950 border border-neutral-900 hover:border-portal/40 rounded-lg space-y-2.5 transition-all text-left relative group mb-4"
                        >
                          {/* Title metadata */}
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-sc font-bold text-gold-accent tracking-wider uppercase">
                              Ch. {bookmark.chapterNumber} •{" "}
                              {bookmarkedChapter
                                ? bookmarkedChapter.title.substring(0, 24) +
                                  "..."
                                : "Sacred Chapter"}
                            </span>
                            <span className="text-neutral-600 font-mono text-[9px]">
                              {new Date(bookmark.createdAt).toLocaleDateString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          </div>

                          {/* Passage snippet */}
                          <p className="font-serif italic text-xs text-neutral-400 line-clamp-3 leading-relaxed border-l border-neutral-800 pl-2.5">
                            "{bookmark.paragraphExcerpt}..."
                          </p>

                          {/* Anchor feedback notes */}
                          {bookmark.note && (
                            <div className="bg-portal/5 border border-portal/10 p-2 rounded text-[11px] font-sans text-neutral-200 italic">
                              <span className="font-sc font-bold text-[8px] text-portal tracking-widest uppercase block not-italic mb-0.5">
                                Anchor Resonance:
                              </span>
                              {bookmark.note}
                            </div>
                          )}

                          {/* Controls row */}
                          <div className="flex items-center justify-between pt-2 border-t border-neutral-900/60">
                            <button
                              onClick={() =>
                                handleRemoveBookmark(
                                  bookmark.chapterNumber,
                                  bookmark.paragraphIndex,
                                )
                              }
                              className="text-neutral-600 hover:text-red-500 text-[10px] font-sc font-bold uppercase tracking-wider flex items-center space-x-1"
                              title="Shed memory anchor"
                            >
                              <Trash2 size={12} />
                              <span>Release</span>
                            </button>

                            <button
                              onClick={() => handleJumpToBookmark(bookmark)}
                              className="px-3 py-1 bg-portal/11 hover:bg-portal text-portal hover:text-void text-[10px] font-sc font-bold uppercase tracking-wider rounded transition-all flex items-center space-x-1.5"
                            >
                              <span>Venture (Jump)</span>
                              <ChevronRight size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    }}
                  />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
    </div>
  );
}
