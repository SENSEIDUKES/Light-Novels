import { useState, useEffect, useRef } from "react";
import { Chapter, VoiceClip } from "../types";
import { useAppStore } from "../store/useAppStore";
import { dispatchNarration, dispatchNarrativeCue } from "../lib/narrativeCues";
import { useAutoScroll } from "./useAutoScroll";

export const extractSFXCues = (text: string) => {
  const sfxList: string[] = [];

  let cleanText = text.replace(
    /\{[^{}]*?"(?:sceneType|intensity|tension|danger|mysticism|emotion|audioSignature|beastEvent|summary|statsChangeMessage|memoryUpdates)"[^{}]*?\}/gi,
    "",
  );

  cleanText = cleanText.replace(/\[\s*\{[\s\S]*?\}\s*\]/g, "");
  cleanText = cleanText.replace(/\[\s*\{[^{}]*?\}\s*\]/g, "");

  const hiddenSystemTagsRegex =
    /\[(?:SFX|Audio|Sound|Beat|Timing|Time|Duration|Trigger|SAP|Audio-Metadata|Metadata|Intensity|Tension|Danger|Mood|Emotion|Narrative):\s*([^\]]+)\]/gi;

  cleanText = cleanText.replace(hiddenSystemTagsRegex, (match, val) => {
    if (match.match(/\[(?:SFX|Audio|Sound):\s*/i)) {
      sfxList.push(val.trim().toLowerCase());
    }
    return "";
  });

  cleanText = cleanText.replace(/\[\s*\]/g, "");

  return { cleanText: cleanText.trim(), sfxList };
};

export function useReaderPlayback({
  selectedChapter,
  activeTranslationContent,
  containerRef,
  isAutoScrollPausedByUser: externalIsAutoScrollPausedByUser,
  setIsAutoScrollPausedByUser: externalSetIsAutoScrollPausedByUser,
}: {
  selectedChapter: Chapter;
  activeTranslationContent: string | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isAutoScrollPausedByUser?: boolean;
  setIsAutoScrollPausedByUser?: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const readerMode = useAppStore((state) => state.readerMode);
  const setReaderMode = useAppStore((state) => state.setReaderMode);
  const immersion = useAppStore((state) => state.immersion);

  const [isPlayingText, setIsPlayingText] = useState(false);
  const [isPausedText, setIsPausedText] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [speechPitch, setSpeechPitch] = useState<number>(1.0);
  const [speechVolume, setSpeechVolume] = useState<number>(0.9);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");
  const [selectedDialogueVoiceURI, setSelectedDialogueVoiceURI] = useState<string>("");
  const [showVoiceDetail, setShowVoiceDetail] = useState<boolean>(false);

  const [localIsAutoScrollPausedByUser, localSetIsAutoScrollPausedByUser] = useState(false);

  const actualIsAutoScrollPausedByUser = externalIsAutoScrollPausedByUser !== undefined ? externalIsAutoScrollPausedByUser : localIsAutoScrollPausedByUser;
  const actualSetIsAutoScrollPausedByUser = externalSetIsAutoScrollPausedByUser !== undefined ? externalSetIsAutoScrollPausedByUser : localSetIsAutoScrollPausedByUser;

  useEffect(() => {
    actualSetIsAutoScrollPausedByUser(false);
  }, [readerMode, selectedChapter?.number]);

  const { play: playAutoScroll, pause: pauseAutoScroll, isScrolling: isAutoScrolling } = useAutoScroll({
    containerRef,
    mode:
      (readerMode === "sen" || readerMode === "basic-tts") && immersion.autoScroll
        ? "paced"
        : readerMode === "teleprompter" && immersion.autoScroll && !actualIsAutoScrollPausedByUser
        ? "constant"
        : "off",
    wpm: Math.round(speechRate * 150),
    onManualPause: () => {
      if (readerMode === "teleprompter") {
        actualSetIsAutoScrollPausedByUser(true);
      }
    },
  });

  const [isMuted, setIsMuted] = useState(() => {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem("seihouse-audio-muted") === "true";
  });
  const [atmosphere, setAtmosphere] = useState(() => {
    if (typeof localStorage === 'undefined') return "none";
    return localStorage.getItem("seihouse-audio-atmosphere") || "none";
  });
  const [volume, setVolume] = useState(() => {
    if (typeof localStorage === 'undefined') return 0.5;
    const saved = localStorage.getItem("seihouse-audio-volume");
    return saved ? parseFloat(saved) : 0.5;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
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
    return () => window.removeEventListener("seihouse-audio-state", handleEvents);
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

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);

        if (voices.length > 0) {
          const defaultVoice =
            voices.find((v) => v.lang.includes("en-US") && v.name.toLowerCase().includes("google")) ||
            voices.find((v) => v.lang.includes("en-US")) ||
            voices.find((v) => v.lang.includes("en")) ||
            voices.find((v) => v.lang.includes("zh")) ||
            voices[0];
          setSelectedVoiceURI(defaultVoice?.voiceURI || "");

          const dialogueVoice =
            voices.find((v) => v.voiceURI !== defaultVoice?.voiceURI && v.lang.includes("en")) || defaultVoice;
          setSelectedDialogueVoiceURI(dialogueVoice?.voiceURI || "");
        }
      };

      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

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

  useEffect(() => { speechRateRef.current = speechRate; }, [speechRate]);
  useEffect(() => { speechPitchRef.current = speechPitch; }, [speechPitch]);
  useEffect(() => { selectedVoiceURIRef.current = selectedVoiceURI; }, [selectedVoiceURI]);
  useEffect(() => { selectedDialogueVoiceURIRef.current = selectedDialogueVoiceURI; }, [selectedDialogueVoiceURI]);
  useEffect(() => { speechVolumeRef.current = speechVolume; }, [speechVolume]);
  useEffect(() => { availableVoicesRef.current = availableVoices; }, [availableVoices]);
  useEffect(() => { currentChunkIndexRef.current = currentChunkIndex; }, [currentChunkIndex]);

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
    dispatchNarration({ status: 'block', blockIndex, durationMs });

    if (useAppStore.getState().readerMode === "sen" && blockIndex !== -1 && blockIndex > lastFiredParagraphIndexRef.current) {
      lastFiredParagraphIndexRef.current = blockIndex;
      const block = selectedChapter?.blocks?.[blockIndex];
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

    let blockIndex = selectedChapter?.blocks?.findIndex(b => b.id === clip.blockId) ?? -1;
    if (blockIndex === -1 && clip.blockId?.startsWith('para-')) {
      blockIndex = parseInt(clip.blockId.replace('para-', ''), 10);
    }

    if (startIndex === 0) dispatchNarration({ status: 'start' });

    audio.playbackRate = speechRate;
    audio.volume = speechVolume;

    audio.onloadedmetadata = () => {
      if (blockIndex !== -1) {
        let durationMs = (audio.duration * 1000) / audio.playbackRate;
        if (!isFinite(durationMs)) {
          const blockText = selectedChapter?.blocks?.[blockIndex]?.text || "";
          const wordCount = blockText.split(/\s+/).length || 10;
          durationMs = (wordCount / (speechRateRef.current * 2.7)) * 1000 || 4000;
        }
        fireBlockSideEffects(blockIndex, durationMs);
      }
    };

    audio.onended = () => startClipSequence(clips, startIndex + 1);
    audio.onerror = (e) => {
      console.warn("SEN clip audio failed, skipping:", e);
      startClipSequence(clips, startIndex + 1);
    };
    audio.play().catch(err => {
      console.warn("Audio play blocked/failed, skipping:", err);
      startClipSequence(clips, startIndex + 1);
    });
  };

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
    const hasWordChars = /[a-zA-Z0-9\u00C0-\u017F\u4E00-\u9FA5\u3040-\u309F\u30A0-\u30FF]/.test(chunkData?.text || "");

    if (!chunkData || !chunkData.text.trim() || !hasWordChars) {
      setCurrentChunkIndex(index + 1);
      setTimeout(() => speakChunk(index + 1), 50);
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
      ? availableVoicesRef.current.find((v) => v.voiceURI === voiceURI)
      : null;
    if (voice) utterance.voice = voice;
    utterance.rate = speechRateRef.current;
    utterance.pitch = speechPitchRef.current;
    utterance.volume = speechVolumeRef.current;

    utterance.onend = () => {
      const nextIndex = index + 1;
      setCurrentChunkIndex(nextIndex);
      setTimeout(() => speakChunk(nextIndex), 50);
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
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
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

    const newChunks: { text: string; isDialogue: boolean; paragraphIndex?: number }[] = [];
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
            newChunks.push({ text: sub.trim(), isDialogue, paragraphIndex: index });
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

  const handleStopSpeaking = () => {
    stopAllPlayback();
  };

  useEffect(() => {
    stopAllPlayback();
  }, [selectedChapter?.number]);

  useEffect(() => {
    if (!isPlayingText || isPausedText) return;
    const timer = setTimeout(() => {
      speakChunk(currentChunkIndexRef.current);
    }, 450);
    return () => clearTimeout(timer);
  }, [speechRate, speechPitch, selectedVoiceURI, selectedDialogueVoiceURI, speechVolume]);

  return {
    isPlayingText,
    isPausedText,
    speechRate, setSpeechRate,
    speechPitch, setSpeechPitch,
    speechVolume, setSpeechVolume,
    availableVoices,
    selectedVoiceURI, setSelectedVoiceURI,
    selectedDialogueVoiceURI, setSelectedDialogueVoiceURI,
    showVoiceDetail, setShowVoiceDetail,
    currentNarratedBlockIndex,
    activeChunks,
    currentChunkIndex,
    isMuted, handleMuteToggle,
    atmosphere, handleAtmosphereChange,
    volume, handleVolumeChange,
    handleTogglePlayback,
    handleStopSpeaking,
    isAutoScrolling,
    isAutoScrollPausedByUser: actualIsAutoScrollPausedByUser,
    setIsAutoScrollPausedByUser: actualSetIsAutoScrollPausedByUser,
    playAutoScroll,
    pauseAutoScroll,
  };
}
