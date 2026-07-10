import { useState, useEffect, useRef, useCallback } from "react";
import { Chapter, VoiceClip } from "../types";
import { useAppStore } from "../store/useAppStore";
import { dispatchNarration, dispatchNarrativeCue } from "../lib/narrativeCues";
import { storyStorage } from "../lib/storage";
import { buildSpeechChunks, SpeechChunk, TTS_WORDS_PER_SECOND_AT_RATE_1 } from "../lib/voice/webSpeechCast";
import { useAudioSettings } from "./audio/useAudioSettings";
import { useVoicePreferences } from "./audio/useVoicePreferences";
import { countWords } from "../utils/textUtils";

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
}: {
  selectedChapter: Chapter;
  activeTranslationContent: string | null;
}) {
  const readerMode = useAppStore((state) => state.readerMode);
  const setReaderMode = useAppStore((state) => state.setReaderMode);
  const immersion = useAppStore((state) => state.immersion);
  const autoPlayNarration = useAppStore((state) => state.autoPlayNarration);
  const setAutoPlayNarration = useAppStore((state) => state.setAutoPlayNarration);
  const isGenerating = useAppStore((state) => state.isGenerating);
  const streamingChapter = useAppStore((state) => state.streamingChapter);

  const [isPlayingText, setIsPlayingText] = useState(false);
  const [isPausedText, setIsPausedText] = useState(false);

  const {
    isMuted,
    handleMuteToggle,
    atmosphere,
    handleAtmosphereChange,
    volume,
    handleVolumeChange,
  } = useAudioSettings();

  const {
    speechRate,
    setSpeechRate,
    speechPitch,
    setSpeechPitch,
    speechVolume,
    setSpeechVolume,
    availableVoices,
    selectedVoiceURI,
    setSelectedVoiceURI,
    selectedDialogueVoiceURI,
    setSelectedDialogueVoiceURI,
    selectedSideVoiceURI,
    setSelectedSideVoiceURI,
    showVoiceDetail,
    setShowVoiceDetail,
  } = useVoicePreferences();

  const selectedChapterRef = useRef(selectedChapter);
  useEffect(() => {
    selectedChapterRef.current = selectedChapter;
  }, [selectedChapter]);

  const chunksRef = useRef<SpeechChunk[]>([]);
  const [activeChunks, setActiveChunks] = useState<SpeechChunk[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [currentNarratedBlockIndex, setCurrentNarratedBlockIndex] = useState(-1);

  const speechRateRef = useRef(speechRate);
  const speechPitchRef = useRef(speechPitch);
  const selectedVoiceURIRef = useRef(selectedVoiceURI);
  const selectedDialogueVoiceURIRef = useRef(selectedDialogueVoiceURI);
  const selectedSideVoiceURIRef = useRef(selectedSideVoiceURI);
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
  useEffect(() => { selectedSideVoiceURIRef.current = selectedSideVoiceURI; }, [selectedSideVoiceURI]);
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

  const fireBlockSideEffects = useCallback((blockIndex: number, durationMs: number) => {
    setCurrentNarratedBlockIndex(blockIndex);
    dispatchNarration({ status: 'block', blockIndex, durationMs });

    if (useAppStore.getState().readerMode === "sen" && blockIndex !== -1 && blockIndex > lastFiredParagraphIndexRef.current) {
      lastFiredParagraphIndexRef.current = blockIndex;
      const block = selectedChapterRef.current?.blocks?.[blockIndex];
      const { immersion } = useAppStore.getState();
      
      if (block && immersion.master) {
        if (immersion.audioCues) {
          const { sfxList } = extractSFXCues(block.text);
          sfxList.forEach((sfx, i) => {
            dispatchNarrativeCue({
              id: `sfx-block-${selectedChapterRef.current?.number}-${blockIndex}-${i}`,
              type: "narrative.fx.play",
              once: true,
              value: sfx,
            });
          });
        }
        if ((immersion.imagePopups || immersion.sceneMusic) && block.metadata) {
          dispatchNarrativeCue({
             id: block.id || `para-${selectedChapterRef.current?.number}-${blockIndex}`,
             type: "narrative.metadata.signature",
             once: true,
             metadata: block.metadata,
          });
        }
      }
    }
  }, []);

  const startClipSequence = async (clips: VoiceClip[], startIndex = 0) => {
    if (startIndex >= clips.length) {
      stopAllPlayback();
      setReaderMode('teleprompter');
      return;
    }
    setIsPlayingText(true);
    setIsPausedText(false);
    activeClipIndexRef.current = startIndex;

    const clip = clips[startIndex];
    let audioUrlToPlay = clip.audioUrl;
    
    // Check for offline cache
    try {
      const blob = await storyStorage.getAudioBlob(clip.audioUrl);
      if (blob) {
         audioUrlToPlay = URL.createObjectURL(blob);
      }
    } catch(e) {
      console.warn("Failed to retrieve offline audio cache:", e);
    }

    const audio = new Audio(audioUrlToPlay);
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
        // Prefer real audio duration; fall back to word-count estimate
        let durationMs = (audio.duration * 1000) / audio.playbackRate;
        if (!isFinite(durationMs) || durationMs <= 0) {
          const blockText = selectedChapter?.blocks?.[blockIndex]?.text || "";
          const words = countWords(blockText) || 10;
          durationMs =
            (words / (speechRateRef.current * TTS_WORDS_PER_SECOND_AT_RATE_1)) * 1000 || 4000;
        }
        // Real audio: the block event carries the actual media duration, and
        // the cinematic scroll controller paces its timeline from it.
        fireBlockSideEffects(blockIndex, durationMs);
      }
    };

    audio.onended = () => {
      if (audioUrlToPlay.startsWith("blob:")) {
        URL.revokeObjectURL(audioUrlToPlay);
      }
      startClipSequence(clips, startIndex + 1);
    };
    audio.onerror = (e) => {
      console.warn("SEN clip audio failed, skipping:", e);
      if (audioUrlToPlay.startsWith("blob:")) {
        URL.revokeObjectURL(audioUrlToPlay);
      }
      startClipSequence(clips, startIndex + 1);
    };
    audio.play().catch(err => {
      console.warn("Audio play blocked/failed, skipping:", err);
      if (audioUrlToPlay.startsWith("blob:")) {
        URL.revokeObjectURL(audioUrlToPlay);
      }
      startClipSequence(clips, startIndex + 1);
    });
  };

  const speakChunkRef = useRef<(index: number) => void>(() => {});

  const speakChunk = useCallback((index: number) => {
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
      setTimeout(() => speakChunkRef.current(index + 1), 50);
      return;
    }

    // Estimate a chunk's spoken duration from its word count at the current rate.
    const chunkDurationMs = (i: number) => {
      const c = chunksRef.current[i];
      const wc = countWords(c?.text) || 0;
      return (wc / (speechRateRef.current * TTS_WORDS_PER_SECOND_AT_RATE_1)) * 1000;
    };

    const estimatedDurationMs = chunkDurationMs(index);
    const currentPara = chunkData.paragraphIndex ?? -1;

    // The block event carries the *remaining* spoken time of the current
    // paragraph (this chunk plus the rest of its chunks). The cinematic
    // scroll timeline lerps toward the next paragraph over that window, so
    // each intra-paragraph chunk boundary re-measures and self-corrects
    // instead of rushing ahead and stalling.
    let remainingParaMs = 0;
    for (
      let j = index;
      j < chunksRef.current.length && (chunksRef.current[j].paragraphIndex ?? -1) === currentPara;
      j++
    ) {
      remainingParaMs += chunkDurationMs(j);
    }
    fireBlockSideEffects(currentPara, remainingParaMs || estimatedDurationMs);

    const utterance = new SpeechSynthesisUtterance(chunkData.text);
    currentUtteranceRef.current = utterance;

    // Three-voice cast: narrator for prose, MC voice for the protagonist,
    // side voice for everyone else. An unset side voice falls back to the
    // dialogue voice, which is exactly the old two-voice behavior.
    const voiceURI =
      chunkData.slot === 'side'
        ? (selectedSideVoiceURIRef.current || selectedDialogueVoiceURIRef.current)
        : chunkData.slot === 'mc' || chunkData.isDialogue
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
      setTimeout(() => speakChunkRef.current(nextIndex), 50);
    };

    utterance.onerror = (e) => {
      console.warn("Aetherial speech synthesis chunk interrupted/errored:", e);
      if (e.error !== "interrupted" && e.error !== "canceled") {
        setIsPlayingText(false);
        setIsPausedText(false);
        // A failed chunk must not leave the scroll state stuck in `following`.
        dispatchNarration({ status: 'end' });
      }
    };

    synth.speak(utterance);
  }, [fireBlockSideEffects]);

  useEffect(() => {
    speakChunkRef.current = speakChunk;
  }, [speakChunk]);

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

    // Blocks carry speaker metadata (speakerName/speakerRole from the LLM)
    // so dialogue can be attributed to the MC or a side character. Plain
    // translations and legacy content have no metadata and keep the old
    // two-voice behavior.
    let paragraphs: { text: string; metadata?: any }[] = [];
    if (activeTranslationContent) {
      paragraphs = activeTranslationContent.split("\n\n").map((text) => ({ text }));
    } else if (selectedChapter.blocks && selectedChapter.blocks.length > 0) {
      paragraphs = selectedChapter.blocks.map((b: any) => ({ text: b.text, metadata: b.metadata }));
    } else if (selectedChapter.generatedContent) {
      paragraphs = selectedChapter.generatedContent.split("\n\n").map((text) => ({ text }));
    }

    if (paragraphs.length === 0) return;

    const cleanedParagraphs = paragraphs.map((p) => {
      const proseCleaned = extractSFXCues(p.text).cleanText;
      const cleanText = proseCleaned
        .replace(/\[System Alert:[^\]]+\]/gi, "")
        .replace(/\[System Breakthrough:[^\]]+\]/gi, "")
        .replace(/\[System Notification:[^\]]+\]/gi, "")
        .replace(/\[Aura[^\]]+\]/gi, "");
      return { text: cleanText, metadata: p.metadata };
    });

    const newChunks: SpeechChunk[] = [
      {
        text: `Chapter ${selectedChapter.number}. ${selectedChapter.title}.`,
        isDialogue: false,
        slot: 'narrator',
        paragraphIndex: -1,
      },
      ...buildSpeechChunks(cleanedParagraphs),
    ];

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
      if (activeAudioRef.current) {
        const audio = activeAudioRef.current;
        if (!audio.paused) {
          audio.pause();
          setIsPausedText(true);
          dispatchNarration({ status: 'pause' });
        } else {
          audio.play().catch(err => console.warn("Audio resume failed:", err));
          setIsPausedText(false);
          dispatchNarration({ status: 'resume' });
        }
      } else {
        handleSpeak();
      }
      return;
    }

    // Pressing play enters listening mode: subsequent chapters the user
    // manifests / navigates to auto-continue narration until they stop.
    setAutoPlayNarration(true);

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
    // An explicit stop leaves listening mode — do not auto-continue.
    setAutoPlayNarration(false);
    stopAllPlayback();
    setReaderMode('teleprompter');
  };

  useEffect(() => {
    // Chapter change: stopAllPlayback dispatches narration 'end', which is the
    // canonical signal that returns the cinematic scroll state machine to idle.
    stopAllPlayback();
  }, [selectedChapter?.number]);

  // Keep live refs to the latest toggle handler and autoplay flag so the
  // auto-continue effect can invoke / re-check them without listing them as
  // dependencies (which would re-run the effect — and reschedule its timeout —
  // on every render).
  const handleTogglePlaybackRef = useRef<() => void>(() => {});
  const autoPlayNarrationRef = useRef(autoPlayNarration);
  useEffect(() => {
    handleTogglePlaybackRef.current = handleTogglePlayback;
    autoPlayNarrationRef.current = autoPlayNarration;
  });

  // --- Auto-continue (listening-mode skeleton) -----------------------------
  // When listening mode is on and a fully-ready chapter becomes selected — the
  // user manifested the next chapter, or navigated to an existing one — start
  // narration automatically instead of requiring another press of play.
  const autoStartedChapterRef = useRef<number | null>(null);
  useEffect(() => {
    const chNum = selectedChapter?.number;
    if (chNum == null) return;
    if (!autoPlayNarration) return;
    if (isPlayingText) return;                        // already narrating
    if (isGenerating) return;                         // wait for generation to finish
    if (streamingChapter?.number === chNum) return;   // still streaming this chapter

    const hasContent = !!(
      selectedChapter?.generatedContent ||
      (selectedChapter?.blocks && selectedChapter.blocks.length > 0)
    );
    if (!hasContent) return;
    if (autoStartedChapterRef.current === chNum) return; // only once per chapter

    autoStartedChapterRef.current = chNum;
    let fired = false;
    // Defer so the chapter-change stopAllPlayback settles and the paragraphs
    // are in the DOM before narration (and its scroll pacing) begins.
    const timer = setTimeout(() => {
      fired = true;
      const stillSpeaking =
        typeof window !== "undefined" && !!window.speechSynthesis?.speaking;
      if (
        selectedChapterRef.current?.number === chNum &&
        autoPlayNarrationRef.current &&
        !stillSpeaking &&
        !activeAudioRef.current
      ) {
        handleTogglePlaybackRef.current();
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      // If we never fired (deps changed first), allow a later re-schedule.
      if (!fired) autoStartedChapterRef.current = null;
    };
  }, [
    autoPlayNarration,
    selectedChapter?.number,
    selectedChapter?.generatedContent,
    selectedChapter?.blocks,
    isPlayingText,
    isGenerating,
    // Only the streaming chapter's number matters here — depending on the whole
    // object would re-run (and reschedule the timer) on every stream tick.
    streamingChapter?.number,
  ]);

  useEffect(() => {
    if (!isPlayingText || isPausedText) return;
    if (activeAudioRef.current) {
      activeAudioRef.current.playbackRate = speechRate;
      activeAudioRef.current.volume = isMuted ? 0 : speechVolume;
      return;
    }
    const timer = setTimeout(() => {
      speakChunk(currentChunkIndexRef.current);
    }, 450);
    return () => clearTimeout(timer);
  }, [speechRate, speechPitch, selectedVoiceURI, selectedDialogueVoiceURI, selectedSideVoiceURI, speechVolume, isPlayingText, isPausedText, speakChunk, isMuted]);

  return {
    isPlayingText,
    isPausedText,
    speechRate, setSpeechRate,
    speechPitch, setSpeechPitch,
    speechVolume, setSpeechVolume,
    availableVoices,
    selectedVoiceURI, setSelectedVoiceURI,
    selectedDialogueVoiceURI, setSelectedDialogueVoiceURI,
    selectedSideVoiceURI, setSelectedSideVoiceURI,
    showVoiceDetail, setShowVoiceDetail,
    currentNarratedBlockIndex,
    activeChunks,
    currentChunkIndex,
    isMuted, handleMuteToggle,
    atmosphere, handleAtmosphereChange,
    volume, handleVolumeChange,
    handleTogglePlayback,
    handleStopSpeaking,
  };
}
