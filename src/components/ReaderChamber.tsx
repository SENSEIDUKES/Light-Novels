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
import { secureStorage } from "../lib/encryption";
import { SystemBlock, SYSTEM_COLORS_LEGEND } from "./SystemBlock";
import { FateSurvivalExplanation } from "./FateSurvivalExplanation";

import { AlterFatePanel } from "./AlterFatePanel";

import { ReaderPreferencesPanel } from "./ReaderPreferencesPanel";
import { CosmicBookmarksPanel } from "./CosmicBookmarksPanel";
import { CodexHovercard } from "./CodexHovercard";
import { WorldEntityCard } from "./WorldEntityCard";
import { useReaderPlayback, extractSFXCues } from "../hooks/useReaderPlayback";
import { useReaderVisuals } from "../hooks/useReaderVisuals";

import { ReaderHeader } from "./ReaderHeader";
import { ReaderViewport } from "./ReaderViewport";
import { ReaderControls } from "./ReaderControls";
import { useCinematicScroll } from "../hooks/useCinematicScroll";

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

  const [showLegend, setShowLegend] = useState(() => {
    return localStorage.getItem("seihouse-system-legend-dismissed") !== "true";
  });

  const hasSystemBlocks = useMemo(() => {
    if (selectedChapter.blocks && selectedChapter.blocks.length > 0) {
      return selectedChapter.blocks.some(
        (b) => !!b.system || (b.text && b.text.trim().startsWith("[") && b.text.trim().endsWith("]"))
      );
    }
    if (selectedChapter.generatedContent) {
      const paragraphs = selectedChapter.generatedContent.split("\n\n");
      return paragraphs.some(
        (p) => p.trim().startsWith("[") && p.trim().endsWith("]")
      );
    }
    return false;
  }, [selectedChapter.blocks, selectedChapter.generatedContent]);

  const [filter, setFilter] = useState<"all" | "unlocked" | "locked">("all");
  const stories = useAppStore(state => state.stories);
  const activeStoryId = useAppStore(state => state.activeStoryId);
  const saveStories = useAppStore(state => state.saveStories);
  const routingConfig = useAppStore(state => state.routingConfig);

  const [isAlterFateOpen, setIsAlterFateOpen] = useState(false);
  const [showFateCodex, setShowFateCodex] = useState(false);
  const [isCheckingConsistency, setIsCheckingConsistency] = useState(false);
  const [consistencyWarnings, setConsistencyWarnings] = useState<string[] | null>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const driftInnerRef = useRef<HTMLDivElement>(null);
  const readerMode = useAppStore((state) => state.readerMode);
  const immersion = useAppStore((state) => state.immersion);
  const setReaderMode = useAppStore((state) => state.setReaderMode);
  const setImmersion = useAppStore((state) => state.setImmersion);

  const { handleManifestReveal, generatingRevealId, codexTerms } = useReaderVisuals({
    selectedChapter,
    activeStory,
    readerMode
  });

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

  const [isAutoScrollPausedByUser, setIsAutoScrollPausedByUser] = useState(false);

  const {
    isPlayingText,
    isPausedText,
    isAutoScrolling,
    speechRate,
    speechPitch,
    speechVolume,
    availableVoices,
    selectedVoiceURI,
    selectedDialogueVoiceURI,
    activeChunks,
    currentChunkIndex,
    setSpeechRate,
    setSpeechPitch,
    setSpeechVolume,
    setSelectedVoiceURI,
    setSelectedDialogueVoiceURI,
    handleTogglePlayback,
    handleStopSpeaking,
    playAutoScroll,
    pauseAutoScroll,
    currentNarratedBlockIndex
  } = useReaderPlayback({
    selectedChapter,
    activeTranslationContent,
    containerRef: readerRef,
    innerRef: driftInnerRef,
    isAutoScrollPausedByUser,
    setIsAutoScrollPausedByUser
  });

  useCinematicScroll(readerRef, isPlayingText && !isPausedText);

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
        const currentActiveStory = useAppStore.getState().stories.find(s => s.id === activeStory.id);
        if (currentActiveStory) {
          onUpdateStory({
            ...currentActiveStory,
            lastReadChapter: useAppStore.getState().selectedChapterNum || selectedChapterNum,
            lastReadScrollPosition: scrollTop,
            lastReadAt: new Date().toISOString()
          });
        }
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
  
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-palette', currentPrefs.colorPaletteId || 'default');
    
    return () => {
      root.removeAttribute('data-palette');
    };
  }, [currentPrefs.colorPaletteId]);

  const handleUpdatePreference = <K extends keyof ReaderPreferences>(
    key: K,
    value: ReaderPreferences[K],
  ) => {
    const updatedPrefs = {
      ...currentPrefs,
      [key]: value,
    };
    const currentActiveStory = useAppStore.getState().stories.find(s => s.id === activeStory.id);
    if (currentActiveStory) {
      onUpdateStory({
        ...currentActiveStory,
        readerPreferences: updatedPrefs,
      });
    }
  };

  const isDeathOrCriticalHealthScene = useMemo(() => {
    const textToMatch = `${selectedChapter.title || ""} ${selectedChapter.summary || ""}`.toLowerCase();
    const deathKeywords = [
      "death", "die", "dying", "killed", "fatal", "perish", 
      "critical health", "near-death", "near death", "slain", "demise", 
      "sacrificed", "mortal wound", "critical damage", "heart stops", 
      "breathes last", "breath last"
    ];
    const hasKeyword = deathKeywords.some(keyword => textToMatch.includes(keyword));

    const hasDeathOrCriticalBlock = selectedChapter.blocks?.some(b => {
      const blockText = (b.text || "").toLowerCase();
      const systemTitle = (b.system?.title || "").toLowerCase();
      const systemKind = (b.system?.kind || "").toLowerCase();
      
      return blockText.includes("death flag") || 
             blockText.includes("critical health") ||
             blockText.includes("near death") ||
             systemTitle.includes("death flag") ||
             systemTitle.includes("critical health") ||
             systemKind.includes("death flag") ||
             systemKind.includes("critical health") ||
             b.system?.promptType === "corruption";
    });

    const cue = selectedChapter.cuePayload;
    const isCriticalDangerCue = cue && (
      cue.danger >= 9.5 || 
      (cue.danger >= 8 && (cue.emotion === "sorrow" || cue.emotion === "grief" || cue.emotion === "fear"))
    );

    return hasKeyword || hasDeathOrCriticalBlock || isCriticalDangerCue || false;
  }, [selectedChapter.title, selectedChapter.summary, selectedChapter.blocks, selectedChapter.cuePayload]);

  const getDynamicShadingClasses = () => {
    if (isDeathOrCriticalHealthScene) {
      return "shadow-[inset_0_0_180px_rgba(139,0,0,0.35)] ring-1 ring-red-900/50 animate-[pulse_3.5s_ease-in-out_infinite]";
    }
    return "";
  };

  const getThemeClasses = () => {
    const t = currentPrefs.themeOverride || "void";
    const baseClasses = (() => {
      if (t === "crimson")
        return "bg-[#0f0404] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1d0a0a] to-[#0a0202] text-[#e0cfcf] border-t border-[#8B0000]/30 selection:bg-[#8B0000]/40 selection:text-white";
      if (t === "abyss")
        return "bg-[#05080f] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0a1222] to-[#020408] text-[#ccd4e0] border-t border-[#04ACFF]/20 selection:bg-[#04ACFF]/40 selection:text-white";
      if (t === "sepia")
        return "bg-[#1a1614] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#2a2420] to-[#14100e] text-[#d6c5b3] border-t border-[#8b5a2b]/30 selection:bg-[#8b5a2b]/40 selection:text-white";
      if (t === "emerald")
        return "bg-[#050f0a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0a1c12] to-[#020805] text-[#b9d6c1] border-t border-[#0f5132]/40 selection:bg-[#0f5132]/40 selection:text-white";
      return "bg-[#0a0a0a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#141414] to-[#050505] text-[#e8e8e8] border-t border-neutral-800/60 selection:bg-neutral-700 selection:text-white"; // default void style
    })();
    
    const dynamicShading = getDynamicShadingClasses();
    if (dynamicShading) {
      return `${baseClasses} ${dynamicShading}`;
    }
    
    // Add default static shadow if no dynamic shading
    if (t === "crimson") return `${baseClasses} shadow-[inset_0_0_120px_rgba(139,0,0,0.08)] ring-1 ring-[#8B0000]/10`;
    if (t === "abyss") return `${baseClasses} shadow-[inset_0_0_120px_rgba(4,172,255,0.06)] ring-1 ring-[#04ACFF]/10`;
    if (t === "sepia") return `${baseClasses} shadow-[inset_0_0_120px_rgba(139,90,43,0.08)] ring-1 ring-[#8b5a2b]/10`;
    if (t === "emerald") return `${baseClasses} shadow-[inset_0_0_120px_rgba(15,81,50,0.1)] ring-1 ring-[#0f5132]/20`;
    return `${baseClasses} shadow-[inset_0_0_120px_rgba(255,255,255,0.02)] ring-1 ring-white/5`;
  };

  // --- Rendering UI States ---
  const [showImmersionPopover, setShowImmersionPopover] = useState<boolean>(false);
  const [showVoiceDetail, setShowVoiceDetail] = useState<boolean>(false);

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

  // --- Climax Screen Shake State ---
  const [isShaking, setIsShaking] = useState(false);
  const chapterShakeRef = useRef<number | null>(null);

  useEffect(() => {
    const handleCue = (e: any) => {
      const cue = e.detail;
      if (cue.type === 'narrative.metadata.signature') {
        const meta = cue.metadata || cue.value;
        if (meta) {
          const isIntense = 
            (meta.danger && meta.danger >= 0.8 && meta.intensity && meta.intensity >= 0.8) ||
            (meta.powerShift && meta.powerShift >= 0.8) ||
            (meta.tension && meta.tension >= 0.8) ||
            (meta.beastEvent?.profile?.threatTier === 'boss');

          const isIntenseScale10 =
            (meta.danger && meta.danger >= 8 && meta.intensity && meta.intensity >= 8) ||
            (meta.powerShift && meta.powerShift >= 8) ||
            (meta.tension && meta.tension >= 8);

          if (isIntense || isIntenseScale10) {
            if (chapterShakeRef.current !== selectedChapterNum) {
              chapterShakeRef.current = selectedChapterNum;
              setIsShaking(true);
              setTimeout(() => {
                setIsShaking(false);
              }, 600);
            }
          }
        }
      }
    };
    
    window.addEventListener('narrative-cue', handleCue);
    return () => window.removeEventListener('narrative-cue', handleCue);
  }, [selectedChapterNum]);

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
          pauseAutoScroll();
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
    const currentActiveStory = useAppStore.getState().stories.find(s => s.id === activeStory.id);
    if (currentActiveStory) {
      onUpdateStory({
        ...currentActiveStory,
        bookmarks: updated,
      });
    }
    setEditingBookmarkParagraphIndex(null);
    setBookmarkNoteText("");
  };

  const handleRemoveBookmark = (chapterNum: number, paraIdx: number) => {
    const updated = activeBookmarks.filter(
      (b) => !(b.chapterNumber === chapterNum && b.paragraphIndex === paraIdx),
    );
    const currentActiveStory = useAppStore.getState().stories.find(s => s.id === activeStory.id);
    if (currentActiveStory) {
      onUpdateStory({
        ...currentActiveStory,
        bookmarks: updated,
      });
    }
  };

  const handleJumpToBookmark = (b: Bookmark) => {
    setSelectedChapterNum(b.chapterNumber);
    setPendingScrollToParagraph(b.paragraphIndex);
    setShowBookmarksPanel(false);
  };

  const handleGenerate = () => {
    if (isGenerating || useAppStore.getState().isGenerating) return;
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
      pauseAutoScroll();
      readerRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const navigateNext = () => {
    const nextChapter = chapters.find(
      (c) => c.number === selectedChapterNum + 1,
    );
    if (nextChapter) {
      setSelectedChapterNum(selectedChapterNum + 1);
      pauseAutoScroll();
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
      className={`flex flex-col min-h-[85dvh] rounded-t-xl transition-colors duration-500 relative overflow-hidden ${getThemeClasses()} ${isShaking ? "animate-screen-shake" : ""}`}
      id="reader-chamber-root"
    >
      <ParticleSystem
        count={40}
        className="opacity-20 pointer-events-none mix-blend-screen z-0 transition-colors duration-500"
        color={getParticleColor()}
      />

      {/* HEADER: Readability & Chapter Title */}
      {!isReaderFullscreen && (
        <ReaderHeader
          arcTitle={arcTitle}
          selectedChapter={selectedChapter}
          chapters={chapters}
          selectedChapterNum={selectedChapterNum}
          setSelectedChapterNum={setSelectedChapterNum}
          onToggleRead={onToggleRead}
          showReaderPreferences={showReaderPreferences}
          setShowReaderPreferences={setShowReaderPreferences}
          showBookmarksPanel={showBookmarksPanel}
          setShowBookmarksPanel={setShowBookmarksPanel}
          activeBookmarks={activeBookmarks}
          getHeaderThemeClasses={getHeaderThemeClasses}
        />
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
            showLegend={showLegend}
            onToggleLegend={() => {
              const nextState = !showLegend;
              setShowLegend(nextState);
              if (!nextState) {
                localStorage.setItem("seihouse-system-legend-dismissed", "true");
              } else {
                localStorage.removeItem("seihouse-system-legend-dismissed");
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* READING VIEWPORT */}
      <ReaderViewport
        readerRef={readerRef as any}
        driftInnerRef={driftInnerRef as any}
        isReaderFullscreen={isReaderFullscreen}
        handleTouchStart={handleTouchStart}
        handleTouchMove={handleTouchMove}
        handleTouchEnd={handleTouchEnd}
        handleTextClick={handleTextClick}
        handleViewportScroll={handleViewportScroll}
        
        isTranslating={isTranslating}
        preferredLang={preferredLang}
        selectedChapter={selectedChapter}
        activeStory={activeStory}
        currentPowerStage={currentPowerStage}
        selectedChapterNum={selectedChapterNum}
        maxChapterNum={maxChapterNum}
        
        codexTerms={codexTerms}
        generatingRevealId={generatingRevealId}
        handleManifestReveal={handleManifestReveal}
        
        readerMode={readerMode}
        immersion={immersion}
        isPlayingText={isPlayingText}
        isPausedText={isPausedText}
        currentNarratedBlockIndex={currentNarratedBlockIndex}
        
        currentPrefs={currentPrefs}
        handleUpdatePreference={handleUpdatePreference}
        activeBookmarks={activeBookmarks}
        editingBookmarkParagraphIndex={editingBookmarkParagraphIndex}
        setEditingBookmarkParagraphIndex={setEditingBookmarkParagraphIndex}
        bookmarkNoteText={bookmarkNoteText}
        setBookmarkNoteText={setBookmarkNoteText}
        handleRemoveBookmark={handleRemoveBookmark}
        handleSaveBookmark={handleSaveBookmark}
        
        activeTranslationContent={activeTranslationContent}
        renderHighlightedText={renderHighlightedText}
        getFocusClass={getFocusClass}
        
        onUpdateStory={onUpdateStory}
        navigatePrev={navigatePrev}
        navigateNext={navigateNext}
        
        handleSealChapter={handleSealChapter}
        handleSealClick={handleSealClick}
        isCheckingConsistency={isCheckingConsistency}
        
        isGenerating={isGenerating}
        handleGenerate={handleGenerate}
        activeAgentId={activeAgentId}
        
        showFateCodex={showFateCodex}
        setShowFateCodex={setShowFateCodex}
        showLegend={showLegend}
        setShowLegend={setShowLegend}
        hasSystemBlocks={hasSystemBlocks}
        chapters={chapters}
      />

      <ReaderControls
        selectedChapter={selectedChapter}
        selectedChapterNum={selectedChapterNum}
        maxChapterNum={maxChapterNum}
        navigatePrev={navigatePrev}
        navigateNext={navigateNext}
        onSwitchTab={onSwitchTab}
        isPlayingText={isPlayingText}
        isPausedText={isPausedText}
        speechRate={speechRate}
        setSpeechRate={setSpeechRate}
        handleTogglePlayback={handleTogglePlayback}
        readerMode={readerMode}
        availableVoices={availableVoices}
        selectedVoiceURI={selectedVoiceURI}
        setSelectedVoiceURI={setSelectedVoiceURI}
        selectedDialogueVoiceURI={selectedDialogueVoiceURI}
        setSelectedDialogueVoiceURI={setSelectedDialogueVoiceURI}
        immersion={immersion}
        setImmersion={setImmersion}
        handleExportText={handleExportText}
        handleAlterFate={handleAlterFate}
        setIsAlterFateOpen={setIsAlterFateOpen}
      />

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
               tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
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
                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setConsistencyWarnings(null)}
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
