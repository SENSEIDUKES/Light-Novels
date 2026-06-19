import React, { useRef, useState, useEffect } from 'react';
import { 
  Sparkles, ChevronRight, Check, Eye, EyeOff, 
  Download, ArrowLeft, ArrowRight, Zap, ListMusic, 
  Award, ShieldAlert, CheckCircle, RefreshCcw,
  Play, Pause, Square, Volume2, VolumeX, Sliders
} from 'lucide-react';
import { Chapter, StoryMemory } from '../types';
import { motion } from 'motion/react';

interface ReaderChamberProps {
  chapters: Chapter[];
  currentPowerStage: string;
  onGenerateChapter: (chapterNumber: number) => Promise<void>;
  isGenerating: boolean;
  selectedChapterNum: number;
  setSelectedChapterNum: (num: number) => void;
  onToggleRead: (chapterNumber: number) => void;
  arcTitle: string;
  onSwitchTab?: (tab: 'reader' | 'codex' | 'memory') => void;
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
  onSwitchTab
}: ReaderChamberProps) {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const readerRef = useRef<HTMLDivElement>(null);

  // --- Text-to-Speech (TTS) Engine States ---
  const [isPlayingText, setIsPlayingText] = useState(false);
  const [isPausedText, setIsPausedText] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [speechPitch, setSpeechPitch] = useState<number>(1.0);
  const [speechVolume, setSpeechVolume] = useState<number>(0.9);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [showTtsControls, setShowTtsControls] = useState<boolean>(false);

  // Load SpeechSynthesis voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
        
        // Auto-select a nice voice
        if (voices.length > 0) {
          const defaultVoice = voices.find(v => v.lang.includes('en-US') && v.name.toLowerCase().includes('google')) 
            || voices.find(v => v.lang.includes('en-US')) 
            || voices.find(v => v.lang.includes('en')) 
            || voices.find(v => v.lang.includes('zh')) 
            || voices[0];
          setSelectedVoiceURI(defaultVoice?.voiceURI || '');
        }
      };
      
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  // Stop speech if chapter changes or on unmount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingText(false);
      setIsPausedText(false);
    }
  }, [selectedChapterNum]);

  const handleSpeak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const synth = window.speechSynthesis;

    if (isPlayingText) {
      if (isPausedText) {
        synth.resume();
        setIsPausedText(false);
      } else {
        synth.pause();
        setIsPausedText(true);
      }
      return;
    }

    synth.cancel();

    if (!selectedChapter || !selectedChapter.generatedContent) return;

    // Clean text of UI markup blocks like system alert blocks for fluent stream
    const cleanText = selectedChapter.generatedContent
      .replace(/\[System Alert:[^\]]+\]/gi, '')
      .replace(/\[Aura[^\]]+\]/gi, '');

    const textToSpeak = `Chapter ${selectedChapter.number}. ${selectedChapter.title}. ${cleanText}`;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    
    if (selectedVoiceURI) {
      const matchedVoice = availableVoices.find(v => v.voiceURI === selectedVoiceURI);
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
    }

    utterance.rate = speechRate;
    utterance.pitch = speechPitch;
    utterance.volume = speechVolume;

    utterance.onend = () => {
      setIsPlayingText(false);
      setIsPausedText(false);
    };

    utterance.onerror = (e) => {
      console.warn("Aetherial speech synthesis interrupted:", e);
      setIsPlayingText(false);
      setIsPausedText(false);
    };

    setIsPlayingText(true);
    setIsPausedText(false);
    synth.speak(utterance);
  };

  const handleStopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingText(false);
      setIsPausedText(false);
    }
  };

  const selectedChapter = chapters.find(c => c.number === selectedChapterNum) || chapters[0];

  const handleGenerate = () => {
    if (isGenerating) return;
    onGenerateChapter(selectedChapter.number);
  };

  const handleExportText = () => {
    if (!selectedChapter.generatedContent) return;
    const blob = new Blob([
      `Chapter ${selectedChapter.number}: ${selectedChapter.title}\n`,
      `========================\n`,
      `Summary: ${selectedChapter.summary || 'None'}\n`,
      `System Alerts: ${selectedChapter.statsChangeMessage || 'None'}\n\n`,
      selectedChapter.generatedContent
    ], { type: 'text/plain;charset=utf-8' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Chapter_${selectedChapter.number}_${selectedChapter.title.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const navigatePrev = () => {
    if (selectedChapterNum > 1) {
      setSelectedChapterNum(selectedChapterNum - 1);
      readerRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navigateNext = () => {
    const nextChapter = chapters.find(c => c.number === selectedChapterNum + 1);
    if (nextChapter) {
      setSelectedChapterNum(selectedChapterNum + 1);
      readerRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const filteredChapters = chapters.filter(c => {
    const isUnlocked = !!c.generatedContent;
    if (filter === 'unlocked') return isUnlocked;
    if (filter === 'locked') return !isUnlocked;
    return true;
  });

  return (
    <div className="flex flex-col min-h-[85vh] bg-[#111111] rounded-t-xl" id="reader-chamber-root">
      
      {/* HEADER: Readability & Chapter Title */}
      <div className="sticky top-16 z-20 bg-gradient-to-b from-[#111111] to-[#111111]/80 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-neutral-900">
        <div className="min-w-0">
          <span className="font-sc font-semibold text-[10px] text-jade-accent tracking-[0.2em] uppercase block">
            {arcTitle} • Chapter {selectedChapter.number}
          </span>
          <h2 className="font-display font-medium text-signal text-base sm:text-xl line-clamp-1 mt-0.5">
            {selectedChapter.title}
          </h2>
        </div>
        <div className="flex space-x-2">
            <button
              onClick={() => onToggleRead(selectedChapter.number)}
              className={`p-2 rounded-full border flex items-center justify-center transition-all ${
                selectedChapter.status === 'read'
                  ? 'border-gold-accent bg-gold-accent/10 text-gold-accent'
                  : 'border-neutral-800 text-neutral-400 hover:text-signal hover:bg-neutral-900'
              }`}
            >
              <Check size={14} />
            </button>
            <div className="hidden sm:flex relative top-0 z-50">
                <select 
                    value={selectedChapterNum} 
                    onChange={(e) => setSelectedChapterNum(parseInt(e.target.value))}
                    className="bg-void border border-neutral-800 py-1 px-3 rounded text-xs text-neutral-400 font-sans cursor-pointer focus:outline-none"
                    >
                    {chapters.map(ch => (
                        <option key={ch.number} value={ch.number}>
                            Ch. {ch.number}: {ch.title.substring(0, 20)}...
                        </option>
                    ))}
                </select>
            </div>
        </div>
      </div>

      {/* READING VIEWPORT */}
      <div ref={readerRef} className="flex-1 overflow-y-auto px-4 sm:px-12 md:px-24 py-8 mb-24 custom-scrollbar relative">
        {selectedChapter.generatedContent ? (
          <div className="max-w-2xl mx-auto">
            {/* Core Chapter Content rendered in elegant Noto Serif */}
            <div className="light-novel-reader text-[#dfd8cf] text-lg sm:text-xl font-serif leading-loose tracking-wide select-text">
              {selectedChapter.generatedContent.split('\n\n').map((paragraph, index) => {
                if (!paragraph.trim()) return null;
                const isSystemLine = paragraph.startsWith('[') && paragraph.endsWith(']');
                if (isSystemLine) {
                  return (
                    <div key={index} className="my-8 p-6 bg-black border border-portal/15 font-mono text-xs text-portal rounded shadow-[0_0_15px_rgba(4,172,255,0.05)] text-center tracking-widest leading-relaxed">
                      {paragraph.replace('[', '').replace(']', '')}
                    </div>
                  );
                }
                return (
                  <p key={index} className="mb-6 indent-8 text-justify">
                    {paragraph}
                  </p>
                );
              })}
            </div>

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
              <button
                onClick={navigateNext}
                disabled={selectedChapterNum === chapters.length}
                className="px-6 py-2 rounded-full border border-neutral-800 hover:border-gold-accent text-neutral-400 hover:text-gold-accent disabled:opacity-20 transition-all font-sc uppercase text-[10px] tracking-wider flex items-center space-x-2"
              >
                <span>Next</span>
                <ArrowRight size={14} />
              </button>
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
              className={`font-sc w-full px-6 py-4 rounded text-xs uppercase font-bold tracking-widest flex items-center justify-center space-x-2 transition-all ${
                isGenerating
                  ? 'bg-neutral-900 border border-neutral-800 text-neutral-500 cursor-not-allowed'
                  : 'bg-gold-accent text-void border border-gold-accent hover:brightness-110 shadow-[0_0_20px_rgba(255,215,0,0.2)]'
              }`}
            >
              {isGenerating ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="w-4 h-4 border-2 border-void border-t-transparent rounded-full"
                  />
                  <span>Condensing Scroll...</span>
                </>
              ) : (
                <>
                  <span>Manifest Scripture</span>
                  <Zap size={14} />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Absolute Loading Veil */}
      {isGenerating && (
        <div className="absolute inset-0 bg-[#0a0a0a]/90 backdrop-blur-sm flex flex-col items-center justify-center text-center z-50 rounded-xl">
          <div className="flex space-x-2 mb-4">
             <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-2 h-2 rounded-full bg-gold-accent" />
             <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.15 }} className="w-2 h-2 rounded-full bg-jade-accent" />
             <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.3 }} className="w-2 h-2 rounded-full bg-gold-accent" />
          </div>
          <p className="font-sc font-bold text-signal tracking-widest text-[10px] uppercase">
             Transcribing...
          </p>
        </div>
      )}

      {/* BOTTOM AUDIO / PLAYER NAVIGATION BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-950/95 backdrop-blur-xl border-t border-neutral-900 z-40 px-4 sm:px-8 py-3 pb-8 sm:pb-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
         <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
             
             {/* TTS Audio Controls */}
             <div className="flex items-center space-x-4">
                <button
                   onClick={handleSpeak}
                   disabled={!selectedChapter.generatedContent}
                   className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${
                     !selectedChapter.generatedContent ? 'bg-neutral-900 text-neutral-600' : 'bg-gold-accent text-void hover:scale-105 shadow-[0_0_15px_rgba(255,215,0,0.4)]'
                   }`}
                >
                   {isPlayingText && !isPausedText ? <Pause size={20} className="ml-0" fill="currentColor"/> : <Play size={20} className="ml-1" fill="currentColor"/>}
                </button>
                <div className="hidden sm:block">
                    <p className="font-sc font-bold text-signal text-[10px] tracking-widest uppercase">
                       {isPlayingText && !isPausedText ? 'Rhythmic Recitation Active' : 'Listen to Scroll'}
                    </p>
                    <p className="font-sans text-[10px] text-neutral-500">
                       Chapter {selectedChapterNum}
                    </p>
                </div>
                {/* Voice / Speed toggles (Simple) */}
                <div className="flex items-center space-x-2 text-neutral-400">
                   <button onClick={() => setSpeechRate(prev => prev >= 2 ? 0.5 : prev + 0.5)} className="text-[10px] font-mono hover:text-signal bg-void border border-neutral-800 px-2 py-1 rounded">
                      {speechRate.toFixed(1)}x
                   </button>
                   <button onClick={handleExportText} className="text-[10px] font-sc uppercase hover:text-signal bg-void border border-neutral-800 px-2 py-1 rounded hidden md:block">
                      Download
                   </button>
                </div>
             </div>

             {/* Quick Access Lore Action Links */}
             <div className="flex items-center space-x-2 sm:space-x-4 bg-void border border-neutral-900 rounded-full px-2 py-1">
                 <button 
                  onClick={() => onSwitchTab && onSwitchTab('codex')} 
                  className="px-3 py-1.5 flex items-center space-x-1.5 text-neutral-400 hover:text-jade-accent transition-colors text-[10px] font-sc uppercase tracking-wider tooltip-trigger"
                 >
                     <Award size={14} />
                     <span className="hidden sm:inline">Realms</span>
                 </button>
                 <div className="w-[1px] h-4 bg-neutral-800 hidden sm:block"></div>
                 <button 
                  onClick={() => onSwitchTab && onSwitchTab('codex')} 
                  className="px-3 py-1.5 flex items-center space-x-1.5 text-neutral-400 hover:text-portal transition-colors text-[10px] font-sc uppercase tracking-wider"
                 >
                     <ListMusic size={14} />
                     <span className="hidden sm:inline">Codex</span>
                 </button>
                 <div className="w-[1px] h-4 bg-neutral-800 hidden sm:block"></div>
                 <button 
                  onClick={() => onSwitchTab && onSwitchTab('codex')} 
                  className="px-3 py-1.5 flex items-center space-x-1.5 text-neutral-400 hover:text-human transition-colors text-[10px] font-sc uppercase tracking-wider"
                 >
                     <ShieldAlert size={14} />
                     <span className="hidden sm:inline">Bonds</span>
                 </button>
                 
             </div>

             {/* Mobile Chapter nav inside bar */}
             <div className="sm:hidden flex items-center space-x-4 w-full justify-between pt-2 border-t border-neutral-900 mt-2">
                <button onClick={navigatePrev} disabled={selectedChapterNum===1} className="text-neutral-500 hover:text-signal disabled:opacity-20"><ArrowLeft size={16}/></button>
                <div className="text-[10px] font-sc uppercase text-neutral-400 select-none">
                   CH {selectedChapterNum} / {chapters.length}
                </div>
                <button onClick={navigateNext} disabled={selectedChapterNum===chapters.length} className="text-neutral-500 hover:text-signal disabled:opacity-20"><ArrowRight size={16}/></button>
             </div>
         </div>
      </div>
    </div>
  );
}
