import React, { useRef, useState, useEffect } from 'react';
import { 
  Sparkles, ChevronRight, Check, Eye, EyeOff, 
  Download, ArrowLeft, ArrowRight, Zap, ListMusic, 
  Award, ShieldAlert, CheckCircle, RefreshCcw,
  Play, Pause, Square, Volume2, VolumeX, Sliders,
  Bookmark as BookmarkIcon, Trash2, Plus
} from 'lucide-react';
import { Chapter, StoryMemory, StoryWorld, ReaderPreferences, Bookmark } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { VirtualizedList } from './VirtualizedList';
import { dispatchNarrativeCue, NarrativeCueEventType } from '../lib/narrativeCues';

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
  activeStory: StoryWorld;
  onUpdateStory: (updatedStory: StoryWorld) => void;
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
  onUpdateStory
}: ReaderChamberProps) {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const readerRef = useRef<HTMLDivElement>(null);

  // --- Theme & Reader Typography Customizer States ---
  const [showReaderPreferences, setShowReaderPreferences] = useState(false);

  const defaultPrefs: ReaderPreferences = {
    fontSize: 'lg',
    fontFamily: 'serif',
    lineHeight: 'relaxed',
    paragraphSpacing: 'normal',
    themeOverride: 'void'
  };

  const currentPrefs = activeStory.readerPreferences || defaultPrefs;

  const handleUpdatePreference = <K extends keyof ReaderPreferences>(key: K, value: ReaderPreferences[K]) => {
    const updatedPrefs = {
      ...currentPrefs,
      [key]: value
    };
    onUpdateStory({
      ...activeStory,
      readerPreferences: updatedPrefs
    });
  };

  const getThemeClasses = () => {
    const t = currentPrefs.themeOverride || 'void';
    if (t === 'crimson') return 'bg-[#080202] text-[#fad4d4] border-t border-human/25';
    if (t === 'abyss') return 'bg-black text-slate-100';
    if (t === 'sepia') return 'bg-[#1a140f] text-[#ecd8bd] border-t border-amber-950/30';
    if (t === 'emerald') return 'bg-[#020c08] text-[#cbfbe1] border-t border-emerald-950/25';
    return 'bg-[#111111] text-[#dfd8cf]'; // default void style
  };

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

  // --- Cosmic Bookmarking System States & Handlers ---
  const [showBookmarksPanel, setShowBookmarksPanel] = useState(false);
  const [editingBookmarkParagraphIndex, setEditingBookmarkParagraphIndex] = useState<number | null>(null);
  const [bookmarkNoteText, setBookmarkNoteText] = useState('');
  const [pendingScrollToParagraph, setPendingScrollToParagraph] = useState<number | null>(null);

  // --- Swipe Navigation States ---
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      if (selectedChapterNum < chapters.length) navigateNext();
    } else if (isRightSwipe) {
      if (selectedChapterNum > 1) navigatePrev();
    }
  };

  // IntersectionObserver for narrative cues
  useEffect(() => {
    const targets = document.querySelectorAll('.narrative-trigger');
    const observer = new window.IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const type = entry.target.getAttribute('data-cue-type') as NarrativeCueEventType;
            const cueId = entry.target.getAttribute('data-cue-id');
            if (type && cueId) {
              let parsedValue: any = entry.target.getAttribute('data-cue-value') || undefined;
              let parsedMeta: any = undefined;
              
              const metaRaw = entry.target.getAttribute('data-cue-metadata');
              if (metaRaw) {
                try {
                  parsedMeta = JSON.parse(metaRaw);
                  parsedValue = parsedValue || parsedMeta; 
                } catch(e) {
                }
              }

              if (typeof parsedValue === 'string') {
                try {
                  parsedValue = JSON.parse(parsedValue);
                } catch(e) {
                  // Not JSON, leave as is
                }
              }

              dispatchNarrativeCue({
                id: cueId,
                type,
                once: !!entry.target.getAttribute('data-cue-once'),
                value: parsedValue,
                metadata: parsedMeta
              });
            }
          }
        });
      },
      { threshold: 0.5 }
    );
    
    targets.forEach(t => observer.observe(t));
    return () => observer.disconnect();
  }, [selectedChapterNum, activeStory.currentChapterNumber, selectedChapter.generatedContent, selectedChapter.blocks]);

  // Scroll to paragraph effect
  useEffect(() => {
    if (pendingScrollToParagraph !== null && (selectedChapter.generatedContent || selectedChapter.blocks)) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`para-${pendingScrollToParagraph}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('bg-portal/10', 'border-l-2', 'border-portal', 'p-2', 'rounded');
          setTimeout(() => {
            element.classList.remove('bg-portal/10', 'border-l-2', 'border-portal', 'p-2', 'rounded');
          }, 3000);
        }
        setPendingScrollToParagraph(null);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [pendingScrollToParagraph, selectedChapterNum, selectedChapter.generatedContent]);

  const activeBookmarks = activeStory.bookmarks || [];

  const handleSaveBookmark = (paraIdx: number, excerpt: string, noteText: string) => {
    const existing = activeBookmarks.find(b => b.chapterNumber === selectedChapter.number && b.paragraphIndex === paraIdx);
    let updated: Bookmark[];
    if (existing) {
      updated = activeBookmarks.map(b => {
        if (b.chapterNumber === selectedChapter.number && b.paragraphIndex === paraIdx) {
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
          createdAt: new Date().toISOString()
        }
      ];
    }
    onUpdateStory({
      ...activeStory,
      bookmarks: updated
    });
    setEditingBookmarkParagraphIndex(null);
    setBookmarkNoteText('');
  };

  const handleRemoveBookmark = (chapterNum: number, paraIdx: number) => {
    const updated = activeBookmarks.filter(b => !(b.chapterNumber === chapterNum && b.paragraphIndex === paraIdx));
    onUpdateStory({
      ...activeStory,
      bookmarks: updated
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
    const isUnlocked = !!c.generatedContent || !!c.hasContent || (c.blocks && c.blocks.length > 0);
    if (filter === 'unlocked') return isUnlocked;
    if (filter === 'locked') return !isUnlocked;
    return true;
  });

  return (
    <div className={`flex flex-col min-h-[85vh] rounded-t-xl transition-colors duration-300 ${getThemeClasses()}`} id="reader-chamber-root">
      
      {/* HEADER: Readability & Chapter Title */}
      <div 
        data-cue-type="narrative.chapter.enter"
        data-cue-id={`chapter-enter-${selectedChapter.number}`}
        data-cue-once="true"
        data-cue-value={selectedChapter.cuePayload ? JSON.stringify(selectedChapter.cuePayload) : undefined}
        className="narrative-trigger sticky top-[38px] sm:top-[44px] z-20 bg-[#111111]/90 backdrop-blur-md px-4 py-2 sm:py-3 flex items-center justify-between border-b border-neutral-900"
      >
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

            <button
              onClick={() => setShowReaderPreferences(!showReaderPreferences)}
              className={`p-2 rounded-full border flex items-center justify-center transition-all ${
                showReaderPreferences 
                  ? 'border-portal bg-portal/10 text-portal'
                  : 'border-neutral-800 text-neutral-400 hover:text-signal hover:bg-neutral-900'
              }`}
              title="Aetherial Styles"
            >
              <Sliders size={14} />
            </button>

            <button
              onClick={() => setShowBookmarksPanel(!showBookmarksPanel)}
              className={`p-2 rounded-full border flex items-center justify-center transition-all relative ${
                showBookmarksPanel
                  ? 'border-gold-accent bg-gold-accent/15 text-gold-accent'
                  : activeBookmarks.length > 0
                    ? 'border-portal/40 bg-portal/5 text-portal'
                    : 'border-neutral-800 text-neutral-400 hover:text-signal hover:bg-neutral-900'
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

      {/* Dynamic Collapsible Reader Preferences Panel */}
      <AnimatePresence>
        {showReaderPreferences && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-neutral-950 border-b border-neutral-900 overflow-hidden px-4 py-4 space-y-4"
          >
            <div className="max-w-2xl mx-auto grid grid-cols-2 sm:grid-cols-5 gap-4">
              
              {/* Font Family control */}
              <div className="space-y-1">
                <span className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block">Aura Font</span>
                <div className="flex flex-col gap-1">
                  {(['serif', 'sans', 'mono'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => handleUpdatePreference('fontFamily', f)}
                      className={`px-2 py-1 text-[10px] rounded border text-left flex items-center justify-between transition-all capitalize ${
                        currentPrefs.fontFamily === f 
                          ? 'bg-portal/10 border-portal text-portal font-bold' 
                          : 'bg-void border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <span>{f}</span>
                      {currentPrefs.fontFamily === f && <Check size={8} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size control */}
              <div className="space-y-1">
                <span className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block">Sizing Index</span>
                <div className="flex flex-col gap-1">
                  {(['xs', 'sm', 'base', 'lg', 'xl'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => handleUpdatePreference('fontSize', s)}
                      className={`px-2 py-1 text-[10px] rounded border text-left flex items-center justify-between transition-all uppercase ${
                        currentPrefs.fontSize === s 
                          ? 'bg-portal/10 border-portal text-portal font-bold' 
                          : 'bg-void border-neutral-800 text-neutral-400 hover:border-neutral-700'
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
                <span className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block">Line Spacing</span>
                <div className="flex flex-col gap-1">
                  {(['snug', 'normal', 'relaxed', 'loose'] as const).map(l => (
                    <button
                      key={l}
                      onClick={() => handleUpdatePreference('lineHeight', l)}
                      className={`px-2 py-1 text-[10px] rounded border text-left flex items-center justify-between transition-all capitalize ${
                        currentPrefs.lineHeight === l
                          ? 'bg-portal/10 border-portal text-portal font-bold' 
                          : 'bg-void border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <span>{l}</span>
                      {currentPrefs.lineHeight === l && <Check size={8} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paragraph Spacing control */}
              <div className="space-y-1">
                <span className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block">Break Spacing</span>
                <div className="flex flex-col gap-1">
                  {(['normal', 'wide', 'double'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => handleUpdatePreference('paragraphSpacing', p)}
                      className={`px-2 py-1 text-[10px] rounded border text-left flex items-center justify-between transition-all capitalize ${
                        currentPrefs.paragraphSpacing === p
                          ? 'bg-portal/10 border-portal text-portal font-bold' 
                          : 'bg-void border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <span>{p}</span>
                      {currentPrefs.paragraphSpacing === p && <Check size={8} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme override control */}
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <span className="text-[9px] font-sc text-neutral-500 uppercase tracking-widest block">Ethereal Hue</span>
                <div className="flex flex-col gap-1">
                  {(['void', 'crimson', 'abyss', 'sepia', 'emerald'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => handleUpdatePreference('themeOverride', t)}
                      className={`px-2 py-1 text-[10px] rounded border text-left flex items-center justify-between transition-all capitalize ${
                        currentPrefs.themeOverride === t
                          ? 'bg-portal/10 border-portal text-portal font-bold' 
                          : 'bg-void border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <span>{t}</span>
                      {currentPrefs.themeOverride === t && <Check size={8} />}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* READING VIEWPORT */}
      <div 
        ref={readerRef} 
        className="flex-1 overflow-y-auto px-4 sm:px-12 md:px-24 py-8 mb-24 custom-scrollbar relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {selectedChapter.generatedContent ? (
          <div className="max-w-2xl mx-auto">
             <div className={`${
               currentPrefs.fontSize === 'xs' ? 'text-xs' :
               currentPrefs.fontSize === 'sm' ? 'text-sm' :
               currentPrefs.fontSize === 'base' ? 'text-base' :
               currentPrefs.fontSize === 'lg' ? 'text-[17px] sm:text-lg' :
               'text-lg sm:text-xl'
             } ${
               currentPrefs.fontFamily === 'serif' ? 'font-serif' :
               currentPrefs.fontFamily === 'sans' ? 'font-sans' :
               'font-mono'
             } ${
               currentPrefs.lineHeight === 'snug' ? 'leading-snug' :
               currentPrefs.lineHeight === 'normal' ? 'leading-normal' :
               currentPrefs.lineHeight === 'relaxed' ? 'leading-relaxed' :
               'leading-loose'
             } max-w-2xl mx-auto select-text`}>
               {selectedChapter.blocks ? selectedChapter.blocks.map((block, index) => {
                 if (!block.text.trim()) return null;
                 const isSystemLine = block.text.startsWith('[') && block.text.endsWith(']');
                 
                 if (isSystemLine) {
                   return (
                     <div 
                       key={block.id || `para-${index}`} 
                       data-cue-type="narrative.metadata.signature"
                       data-cue-id={block.id || `system-line-${selectedChapter.number}-${index}`}
                       data-cue-metadata={block.metadata ? JSON.stringify(block.metadata) : undefined}
                       data-cue-once="true"
                       className={`narrative-trigger my-8 p-6 bg-black border border-portal/15 font-mono text-xs text-portal rounded shadow-[0_0_15px_rgba(4,172,255,0.05)] text-center tracking-widest leading-relaxed ${block.metadata ? 'metadata-block' : ''}`}
                     >
                       {block.text.replace('[', '').replace(']', '')}
                     </div>
                   );
                 }

                 const existingBookmark = activeBookmarks.find(b => b.chapterNumber === selectedChapter.number && b.paragraphIndex === index);
                 const isEditingThisBookmark = editingBookmarkParagraphIndex === index;

                 return (
                   <div 
                      key={block.id || `para-${index}`} 
                      id={`para-${index}`} 
                      data-cue-type={block.metadata ? "narrative.metadata.signature" : undefined}
                      data-cue-id={block.id || `para-${selectedChapter.number}-${index}`}
                      data-cue-metadata={block.metadata ? JSON.stringify(block.metadata) : undefined}
                      data-cue-once="true"
                      className={`relative group paragraph-block transition-colors duration-200 mb-6 ${existingBookmark ? 'custom-bookmark-bg' : ''} ${block.metadata ? 'narrative-trigger metadata-block' : ''}`}
                   >
                     {/* Floating bookmark button */}
                     <div className="absolute -left-12 top-0 bottom-0 w-10 flex items-start justify-end pt-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none md:pointer-events-auto">
                        <button 
                          onClick={() => {
                             if (existingBookmark) {
                               handleRemoveBookmark(selectedChapter.number, index);
                             } else {
                               setEditingBookmarkParagraphIndex(index);
                               setBookmarkNoteText('');
                             }
                          }}
                          className={`pointer-events-auto p-1.5 rounded transition-all hover:bg-neutral-800 ${existingBookmark ? 'text-gold-accent' : 'text-neutral-500 hover:text-signal'}`}
                          title="Bookmark this position"
                        >
                           <BookmarkIcon size={14} className={existingBookmark ? 'fill-current' : ''} />
                        </button>
                     </div>
                     <p className="indent-8 text-neutral-800 dark:text-neutral-300">
                        {block.text}
                     </p>
                     
                     {/* Inline Bookmark Editor */}
                     {isEditingThisBookmark && (
                        <div className="mt-4 p-4 bg-void border border-neutral-800 rounded-lg shadow-xl relative z-20">
                           <textarea
                             value={bookmarkNoteText}
                             onChange={(e) => setBookmarkNoteText(e.target.value)}
                             placeholder="Add a contemplation or heavenly mechanic note here..."
                             className="w-full bg-neutral-900 border border-neutral-800 rounded p-3 text-sm text-signal placeholder-neutral-600 focus:outline-none focus:border-portal mb-3 min-h-[80px]"
                             autoFocus
                           />
                           <div className="flex justify-end space-x-2">
                             <button
                               onClick={() => setEditingBookmarkParagraphIndex(null)}
                               className="px-4 py-1.5 text-xs text-neutral-400 hover:text-signal transition-colors font-mono"
                             >
                               Cancel
                             </button>
                             <button
                               onClick={() => handleSaveBookmark(index, block.text.substring(0, 100) + '...', bookmarkNoteText)}
                               className="px-4 py-1.5 text-xs bg-human text-signal rounded hover:bg-void transition-colors font-sans"
                             >
                               Save Bookmark
                             </button>
                           </div>
                        </div>
                     )}

                     {/* Display Saved Bookmark Note (if active) */}
                     {existingBookmark && existingBookmark.note && !isEditingThisBookmark && (
                       <div className="mt-2 text-xs font-mono text-gold-accent flex items-start space-x-2 bg-neutral-900/50 p-2 border-l border-gold-accent/50 ml-8">
                         <span className="opacity-70">Note:</span>
                         <span className="break-words font-sans italic opacity-90">{existingBookmark.note}</span>
                       </div>
                     )}
                   </div>
                 );
               }) : (selectedChapter.generatedContent || '').split('\n\n').map((paragraph, index) => {
                 if (!paragraph.trim()) return null;
                 const isSystemLine = paragraph.startsWith('[') && paragraph.endsWith(']');
                 if (isSystemLine) {
                   return (
                     <div 
                       key={index} 
                       data-cue-type="narrative.metadata.signature"
                       data-cue-id={`system-line-${selectedChapter.number}-${index}`}
                       className="narrative-trigger my-8 p-6 bg-black border border-portal/15 font-mono text-xs text-portal rounded shadow-[0_0_15px_rgba(4,172,255,0.05)] text-center tracking-widest leading-relaxed"
                     >
                       {paragraph.replace('[', '').replace(']', '')}
                     </div>
                   );
                 }

                 const existingBookmark = activeBookmarks.find(b => b.chapterNumber === selectedChapter.number && b.paragraphIndex === index);
                 const isEditingThis = editingBookmarkParagraphIndex === index;

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
                               setEditingBookmarkParagraphIndex(index);
                               setBookmarkNoteText(existingBookmark.note || '');
                             }}
                             className="text-portal hover:text-gold-accent transition-colors p-1"
                             title="Engraved Anchor - Edit Note"
                           >
                             <BookmarkIcon size={12} fill="currentColor" />
                           </button>
                         ) : (
                           <button
                             onClick={() => {
                               setEditingBookmarkParagraphIndex(index);
                               setBookmarkNoteText('');
                             }}
                             className="opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-portal transition-all p-1"
                             title="Affix Anchor"
                           >
                             <Plus size={12} />
                           </button>
                         )}
                       </div>

                       {/* Paragraph text */}
                       <div className="flex-1 min-w-0 font-serif leading-relaxed">
                         <p 
                           className={`text-justify indent-8 ${
                             currentPrefs.paragraphSpacing === 'normal' ? 'mb-0' :
                             currentPrefs.paragraphSpacing === 'wide' ? 'mb-2' :
                             'mb-4'
                           }`}
                         >
                           {paragraph}
                         </p>
                       </div>
                     </div>

                     {/* Display saved Note under anchored paragraph */}
                     {existingBookmark && !isEditingThis && existingBookmark.note && (
                       <div className="mt-2 ml-8 pl-3 border-l-2 border-portal bg-portal/5 p-2 rounded text-xs text-neutral-350 font-sans italic flex items-start justify-between">
                         <span>
                           <span className="font-sc font-semibold text-portal uppercase tracking-wider text-[9px] block not-italic">Resonance Note:</span>
                           {existingBookmark.note}
                         </span>
                         <button
                           onClick={() => handleRemoveBookmark(selectedChapter.number, index)}
                           className="text-neutral-550 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
                           {existingBookmark ? 'Edit Aetherial Resonance' : 'Engrave Aetherial Resonance'}
                         </span>
                         <input
                           type="text"
                           value={bookmarkNoteText}
                           onChange={(e) => setBookmarkNoteText(e.target.value)}
                           placeholder="Type an insightful note, prediction, or timeline event..."
                           className="w-full bg-void text-xs text-signal border border-neutral-850 focus:border-portal p-2 rounded focus:outline-none"
                           onKeyDown={(e) => {
                             if (e.key === 'Enter') {
                               handleSaveBookmark(index, paragraph, bookmarkNoteText);
                             }
                           }}
                         />
                         <div className="flex items-center justify-between">
                           <span className="text-[9px] text-neutral-500 font-mono">Press Enter to engrave</span>
                           <div className="flex space-x-2">
                             {existingBookmark && (
                               <button
                                 onClick={() => {
                                   handleRemoveBookmark(selectedChapter.number, index);
                                   setEditingBookmarkParagraphIndex(null);
                                 }}
                                 className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-widest text-red-500 hover:bg-neutral-900"
                               >
                                 Release
                               </button>
                             )}
                             <button
                               onClick={() => setEditingBookmarkParagraphIndex(null)}
                               className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-widest text-neutral-550 hover:bg-neutral-900"
                             >
                               Cancel
                             </button>
                             <button
                               onClick={() => handleSaveBookmark(index, paragraph, bookmarkNoteText)}
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
               <div className="flex items-center space-x-2">
                  <button
                     onClick={handleSpeak}
                     disabled={!selectedChapter.generatedContent}
                     className={`h-11 w-11 rounded-full flex items-center justify-center transition-all ${
                       !selectedChapter.generatedContent ? 'bg-neutral-900 text-neutral-600' : 'bg-gold-accent text-void hover:scale-105 shadow-[0_0_12px_rgba(255,215,0,0.3)]'
                     }`}
                  >
                     {isPlayingText && !isPausedText ? <Pause size={18} fill="currentColor"/> : <Play size={18} className="ml-0.5" fill="currentColor"/>}
                  </button>
                  <button 
                     onClick={() => setSpeechRate(prev => prev >= 2 ? 0.5 : prev + 0.5)} 
                     className="text-[9px] font-mono hover:text-signal bg-void border border-neutral-850 px-2.5 py-2 min-w-[44px] rounded text-neutral-400"
                  >
                     {speechRate.toFixed(1)}x
                  </button>
               </div>

               {/* Quick Access Icons on Right */}
               <div className="flex items-center space-x-1.5 bg-void/60 border border-neutral-900 rounded-full px-1.5 py-1">
                  <button 
                     onClick={() => onSwitchTab && onSwitchTab('codex')} 
                     className="p-2 text-neutral-400 hover:text-jade-accent transition-colors"
                     title="Realms"
                  >
                     <Award size={16} />
                  </button>
                  <button 
                     onClick={() => onSwitchTab && onSwitchTab('codex')} 
                     className="p-2 text-neutral-400 hover:text-portal transition-colors"
                     title="Codex"
                  >
                     <ListMusic size={16} />
                  </button>
                  <button 
                     onClick={() => onSwitchTab && onSwitchTab('codex')} 
                     className="p-2 text-neutral-400 hover:text-human transition-colors"
                     title="Bonds"
                  >
                     <ShieldAlert size={16} />
                  </button>
               </div>
            </div>

            {/* Desktop View (Hidden on Mobile) */}
            <div className="hidden sm:flex flex-row items-center justify-between gap-4">
                
                {/* TTS Audio Controls */}
                <div className="flex items-center space-x-4">
                   <button
                      onClick={handleSpeak}
                      disabled={!selectedChapter.generatedContent}
                      className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${
                        !selectedChapter.generatedContent ? 'bg-neutral-900 text-neutral-600' : 'bg-gold-accent text-void hover:scale-105 shadow-[0_0_15px_rgba(255,215,0,0.4)]'
                      }`}
                   >
                      {isPlayingText && !isPausedText ? <Pause size={20} fill="currentColor"/> : <Play size={20} className="ml-1" fill="currentColor"/>}
                   </button>
                   <div>
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
                      <button onClick={handleExportText} className="text-[10px] font-sc uppercase hover:text-signal bg-void border border-neutral-800 px-2 py-1 rounded">
                         Download
                      </button>
                    </div>
                 </div>

                 {/* Quick Access Lore Action Links */}
                 <div className="flex items-center space-x-4 bg-void border border-neutral-900 rounded-full px-2 py-1">
                     <button 
                      onClick={() => onSwitchTab && onSwitchTab('codex')} 
                      className="px-3 py-1.5 flex items-center space-x-1.5 text-neutral-400 hover:text-jade-accent transition-colors text-[10px] font-sc uppercase tracking-wider"
                     >
                         <Award size={14} />
                         <span>Realms</span>
                     </button>
                     <div className="w-[1px] h-4 bg-neutral-800"></div>
                     <button 
                      onClick={() => onSwitchTab && onSwitchTab('codex')} 
                      className="px-3 py-1.5 flex items-center space-x-1.5 text-neutral-400 hover:text-portal transition-colors text-[10px] font-sc uppercase tracking-wider"
                     >
                         <ListMusic size={14} />
                         <span>Codex</span>
                     </button>
                     <div className="w-[1px] h-4 bg-neutral-800"></div>
                     <button 
                      onClick={() => onSwitchTab && onSwitchTab('codex')} 
                      className="px-3 py-1.5 flex items-center space-x-1.5 text-neutral-400 hover:text-human transition-colors text-[10px] font-sc uppercase tracking-wider"
                     >
                         <ShieldAlert size={14} />
                         <span>Bonds</span>
                     </button>
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
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 24, stiffness: 180 }}
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
                      <BookmarkIcon size={36} className="text-neutral-800 animate-pulse animate-duration-1000" />
                      <p className="font-serif italic text-xs max-w-xs px-4">
                        "No memory anchors exist in current alignment. Hover beside paragraphs to affix anchors, annotations, and memory marks."
                      </p>
                    </div>
                  }
                  renderItem={(bookmark) => {
                    const bookmarkedChapter = chapters.find(c => c.number === bookmark.chapterNumber);
                    return (
                      <div
                        key={bookmark.id}
                        className="p-4 bg-neutral-950 border border-neutral-900 hover:border-portal/40 rounded-lg space-y-2.5 transition-all text-left relative group mb-4"
                      >
                        {/* Title metadata */}
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-sc font-bold text-gold-accent tracking-wider uppercase">
                            Ch. {bookmark.chapterNumber} • {bookmarkedChapter ? bookmarkedChapter.title.substring(0, 24) + "..." : "Sacred Chapter"}
                          </span>
                          <span className="text-neutral-600 font-mono text-[9px]">
                            {new Date(bookmark.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        {/* Passage snippet */}
                        <p className="font-serif italic text-xs text-neutral-400 line-clamp-3 leading-relaxed border-l border-neutral-800 pl-2.5">
                          "{bookmark.paragraphExcerpt}..."
                        </p>

                        {/* Anchor feedback notes */}
                        {bookmark.note && (
                          <div className="bg-portal/5 border border-portal/10 p-2 rounded text-[11px] font-sans text-neutral-200 italic">
                            <span className="font-sc font-bold text-[8px] text-portal tracking-widest uppercase block not-italic mb-0.5">Anchor Resonance:</span>
                            {bookmark.note}
                          </div>
                        )}

                        {/* Controls row */}
                        <div className="flex items-center justify-between pt-2 border-t border-neutral-900/60">
                          <button
                            onClick={() => handleRemoveBookmark(bookmark.chapterNumber, bookmark.paragraphIndex)}
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
    </div>
  );
}
