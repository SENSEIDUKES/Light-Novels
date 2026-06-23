import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Sparkles, BookA } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import SteerPortal from './SteerPortal';
import ReaderChamber from './ReaderChamber';
import { GlossarySidePanel } from './GlossarySidePanel';
import { Story, StreamingChapter } from '../types';
import { awardQi } from '../lib/qi';
import { RecapScreen } from './RecapScreen';

export const ReaderScreen: React.FC<{
  handleSteerArc: (direction: string, customPrompt: string) => Promise<void>,
  handleAlterFate: (chapterNumber: number, direction: string, customPrompt: string) => Promise<void>,
  handleGenerateChapter: (chapterNumber: number) => Promise<void>,
  handleToggleRead: (ch: number) => void,
  handleUpdateStoryDirect: (story: Story) => void,
  setIsCodexSheetOpen: (open: boolean) => void,
  handleSealChapter: (chapterNumber: number) => Promise<void>,
  handleCheckConsistency?: (chapterNumber: number) => Promise<string[]>
}> = ({
  handleSteerArc, handleAlterFate, handleGenerateChapter, handleToggleRead, handleUpdateStoryDirect, setIsCodexSheetOpen, handleSealChapter, handleCheckConsistency
}) => {
  const { currentScreen, setCurrentScreen, activeStoryId, stories, selectedChapterNum, setSelectedChapterNum, isGenerating, routingConfig, streamingChapter, isReaderFullscreen, currentUser } = useAppStore();
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [showRecap, setShowRecap] = useState(false);

  // Listen to custom DOM event to toggle glossary sidelobe via global hotkey
  useEffect(() => {
    const handleToggleGlossary = () => {
      setIsGlossaryOpen(prev => !prev);
    };
    window.addEventListener('toggle-glossary-panel', handleToggleGlossary);
    return () => {
      window.removeEventListener('toggle-glossary-panel', handleToggleGlossary);
    };
  }, []);

  const activeStory = stories.find(s => s.id === activeStoryId);

  useEffect(() => {
    if (activeStory && currentScreen === 'reader') {
      const currentChapter = activeStory.arcs.flatMap(a => a.chapters).find(c => c.number === selectedChapterNum);
      if (currentChapter && currentChapter.status === 'unread' && currentChapter.hasContent) {
         awardQi('chapter_read');
      }

      // Check if we need to show recap (has been gone for > 24 hours)
      // Since it's testing, let's also show it if lastReadAt doesn't exist but we are past chapter 3.
      if (activeStory.lastReadAt) {
        const lastReadDate = new Date(activeStory.lastReadAt).getTime();
        const now = Date.now();
        const hrsElapsed = (now - lastReadDate) / (1000 * 60 * 60);
        if (hrsElapsed > 12) {
          setShowRecap(true);
        }
      } else if (selectedChapterNum > 2) {
        setShowRecap(true);
      }
    } else {
      setShowRecap(false);
    }
  }, [activeStoryId, currentScreen, activeStory?.id]);

  if (currentScreen !== 'reader') return null;

  if (!activeStory) return null;

  if (showRecap) {
    return <RecapScreen story={activeStory} lastReadChapter={selectedChapterNum} onContinue={() => setShowRecap(false)} />;
  }

  return (
    <motion.div
      key="reader-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={`space-y-6 ${isReaderFullscreen ? '!space-y-0 relative' : ''}`}
    >
      {!isReaderFullscreen && (
        <div className="flex items-center justify-between bg-black/60 border border-neutral-900 px-3 py-1.5 sm:px-4 sm:py-2 rounded shadow-md backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
            <button onClick={() => setCurrentScreen('detail')} className="text-neutral-500 hover:text-gold-accent transition-colors flex-shrink-0">
              <ArrowLeft size={18} />
            </button>
            <span className="font-sc uppercase tracking-[0.12em] text-gold-accent font-bold text-[10px] sm:text-xs flex-shrink-0">{activeStory.genre}</span>
            <span className="text-neutral-700 font-mono flex-shrink-0">•</span>
            <span className="text-neutral-400 font-display text-xs sm:text-sm truncate pr-2">{activeStory.title}</span>
          </div>
          <div className="flex-shrink-0 flex items-center space-x-2">
             <button
               onClick={() => setIsGlossaryOpen(true)}
               className="px-2.5 py-1 sm:px-4 sm:py-1.5 bg-neutral-900 border border-neutral-800 text-neutral-400 font-sc font-bold uppercase tracking-wider rounded hover:bg-neutral-800 hover:text-white transition-all flex items-center space-x-1 sm:space-x-2 text-[9px] sm:text-[10px]"
             >
               <BookA size={11} />
               <span className="hidden sm:inline">Lore Glossary</span>
               <span className="sm:hidden">Lore</span>
             </button>
             <button
               onClick={() => setIsCodexSheetOpen(true)}
               className="px-2.5 py-1 sm:px-4 sm:py-1.5 bg-void border border-portal text-portal font-sc font-bold uppercase tracking-wider rounded hover:bg-portal hover:text-void transition-all flex items-center space-x-1 sm:space-x-2 text-[9px] sm:text-[10px]"
             >
               <Sparkles size={11} />
               <span>Codex</span>
             </button>
          </div>
        </div>
      )}

      {!currentUser && (selectedChapterNum === -1 || selectedChapterNum > 10) ? (
        <div className="max-w-xl mx-auto mt-20 text-center bg-black/60 border border-neutral-900 p-10 rounded-xl shadow-2xl animate-fadeIn">
          <h2 className="font-display font-bold text-3xl text-signal mb-4">Authentication Required</h2>
          <p className="text-neutral-400 font-sans text-sm mb-8 leading-relaxed">
            {selectedChapterNum === -1 
              ? "You must sync your spirit (sign in) to forge new destinies and steer the narrative."
              : "You have reached the limit of anonymous reading (10 chapters). Please sync your spirit (sign in) to continue your ascension and unlock unlimited chapters."}
          </p>
          <button
            onClick={() => {
              import('../lib/firebase').then(({ auth }) => {
                import('firebase/auth').then(({ signInWithPopup, GoogleAuthProvider }) => {
                  signInWithPopup(auth, new GoogleAuthProvider());
                });
              });
            }}
            className="px-8 py-3 bg-human text-signal font-sc font-bold uppercase tracking-widest text-sm rounded border border-human shadow-[0_0_15px_rgba(139,0,0,0.4)] hover:bg-void transition-all"
          >
            Sync Spirit (Sign In)
          </button>
        </div>
      ) : selectedChapterNum === -1 ? (
        <div className="animate-fadeIn max-w-4xl mx-auto shadow-2xl">
          <SteerPortal
            isSteering={isGenerating}
            onSteerArc={handleSteerArc}
            currentArcIndex={activeStory.arcs.length}
            activeStory={activeStory}
            routingConfig={routingConfig}
          />
        </div>
      ) : (
        <div className="mx-auto">
          <ReaderChamber
            chapters={activeStory.arcs.flatMap(a => a.chapters).map(ch => 
              (streamingChapter && ch.number === streamingChapter.number)
                ? { ...ch, generatedContent: streamingChapter.content, blocks: streamingChapter.blocks, status: 'read' as const }
                : ch
            )}
            arcTitle={activeStory.arcs.find(a => a.chapters.some(c => c.number === selectedChapterNum))?.title || activeStory.arcs[activeStory.arcs.length - 1].title}
            currentPowerStage={activeStory.memory.currentPowerStage}
            onGenerateChapter={handleGenerateChapter}
            isGenerating={isGenerating}
            selectedChapterNum={selectedChapterNum}
            setSelectedChapterNum={setSelectedChapterNum}
            onToggleRead={handleToggleRead}
            onSwitchTab={(tab) => {
              if (tab === 'codex') setIsCodexSheetOpen(true);
            }}
            activeStory={activeStory}
            onUpdateStory={handleUpdateStoryDirect}
            handleAlterFate={handleAlterFate}
            handleSealChapter={handleSealChapter}
            handleCheckConsistency={handleCheckConsistency}
          />

          {activeStory.arcs[activeStory.arcs.length - 1].isCompleted && (
            <div className="mt-4 max-w-4xl mx-auto p-4 bg-neutral-950 border border-neutral-900 rounded flex justify-between items-center text-xs">
              <span className="text-neutral-400 font-sans">All chapters of this arc generated! Steer next segment.</span>
              <button
                onClick={() => setSelectedChapterNum(-1)}
                className="px-4 py-1.5 bg-human text-signal text-[10px] font-bold font-sc uppercase tracking-wider rounded border border-human hover:bg-void transition-all"
              >
                Steer Story Fate
              </button>
            </div>
          )}
        </div>
      )}
      
      <GlossarySidePanel 
        isOpen={isGlossaryOpen} 
        onClose={() => setIsGlossaryOpen(false)} 
        novelId={activeStory.id} 
      />
    </motion.div>
  );
};
