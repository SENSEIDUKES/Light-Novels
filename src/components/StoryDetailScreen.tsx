import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, BookOpen, MoreHorizontal, BookCheck, Download, Trash2, Zap } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { DestinyChoicePanel } from './DestinyChoicePanel';

export const StoryDetailScreen: React.FC<{ 
  handleGenerateCover: () => Promise<{ imageUrls: string[], promptUsed: string } | undefined>,
  handleApplyCover: (imageUrl: string, promptUsed: string) => void,
  handleExportFullTome: (story: any) => void,
  handleExportEPUB: (story: any) => void,
  handleExportSingleStory: (story: any) => void,
  handleDeleteStory: (id: string, e: React.MouseEvent) => void,
  setIsCodexSheetOpen: (open: boolean) => void
}> = ({
  handleGenerateCover, handleApplyCover, handleExportFullTome, handleExportEPUB, handleExportSingleStory, handleDeleteStory, setIsCodexSheetOpen
}) => {
  const { currentScreen, setCurrentScreen, activeStoryId, stories, isGenerating, setSelectedChapterNum } = useAppStore();
  const [isStoryMenuOpen, setIsStoryMenuOpen] = useState(false);
  const [coverPreview, setCoverPreview] = useState<{ urls: string[], prompt: string, selectedIndex: number } | null>(null);

  if (currentScreen !== 'detail') return null;

  const activeStory = stories.find(s => s.id === activeStoryId);
  if (!activeStory) return null;

  const isCurrentArcFinished = activeStory.arcs.length > 0 && 
    activeStory.arcs[activeStory.arcs.length - 1].chapters.every(c => c.hasContent || !!c.generatedContent);

  return (
    <motion.div
      key="detail-screen"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      <DestinyChoicePanel 
        isOpen={!!coverPreview}
        imageUrls={coverPreview?.urls || []}
        selectedIndex={coverPreview?.selectedIndex || 0}
        onSelect={(index) => setCoverPreview(prev => prev ? { ...prev, selectedIndex: index } : null)}
        onApply={() => {
          if (coverPreview) {
            handleApplyCover(coverPreview.urls[coverPreview.selectedIndex], coverPreview.prompt);
            setCoverPreview(null);
          }
        }}
        onDiscard={() => setCoverPreview(null)}
        title="Cover Evolution"
        subtitle="Choose the most fitting reflection for your next volume."
      />

      <div className="flex flex-col md:flex-row gap-8 bg-[#0a0a0a] border border-neutral-900 rounded-xl p-6 shadow-2xl">
        {/* Cover Art */}
        <div className="w-full max-w-[180px] mx-auto md:max-w-none md:w-64 flex-shrink-0">
          <div className={`relative group aspect-[2/3] rounded-lg overflow-hidden border ${activeStory.evolutionReady && !coverPreview ? 'border-portal/50 shadow-[0_0_15px_rgba(4,172,255,0.15)]' : 'border-neutral-800'} mb-2`}>
            <img 
              src={activeStory.imageUrl || `https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?auto=format&fit=crop&q=80`}
              alt={activeStory.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            
            {/* Hover Overlay for Cover Generation */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
              <button 
                onClick={async () => {
                  const result = await handleGenerateCover();
                  if (result) setCoverPreview({ urls: result.imageUrls, prompt: result.promptUsed, selectedIndex: 0 });
                }}
                disabled={isGenerating || (!!activeStory.imageUrl && !activeStory.evolutionReady)}
                className="px-4 py-2 bg-portal/20 border border-portal/50 text-portal text-[10px] font-bold font-sc uppercase tracking-wider rounded hover:bg-portal hover:text-void transition-colors flex flex-col items-center gap-1.5 shadow-[0_0_15px_rgba(4,172,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles size={16} />
                <span>{activeStory.evolutionReady ? 'Awaken Evolution' : activeStory.imageUrl ? 'Progression Required' : 'Forge Core Cover'}</span>
              </button>
            </div>
          </div>

          {/* Mobile visible cover generation/evolution button */}
          <div className="block md:hidden mt-2 mb-3">
            <button
              onClick={async () => {
                const result = await handleGenerateCover();
                if (result) setCoverPreview({ urls: result.imageUrls, prompt: result.promptUsed, selectedIndex: 0 });
              }}
              disabled={isGenerating || (!!activeStory.imageUrl && !activeStory.evolutionReady)}
              className="w-full py-2.5 bg-portal/10 border border-portal/30 text-portal text-[11px] font-bold font-sc uppercase tracking-wider rounded flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(4,172,255,0.1)] hover:bg-portal hover:text-void transition-all"
            >
              <Sparkles size={12} />
              <span>{activeStory.evolutionReady ? 'Awaken Evolution' : activeStory.imageUrl ? 'Progression Required' : 'Forge Core Cover'}</span>
            </button>
          </div>
          
          {/* Cover Evolution Readiness indicator */}
          {activeStory.evolutionReady && !coverPreview && (
             <div className="text-[10px] font-mono text-portal animate-pulse flex items-center justify-center gap-1.5 mb-2 px-1 text-center bg-portal/10 py-1 rounded">
               <Sparkles size={10} />
               <span>Evolution Available</span>
             </div>
          )}
          
          {/* Cover Image History */}
          {activeStory.imageHistory && activeStory.imageHistory.filter(img => img.entityType === 'cover').length > 1 && (
            <div className="flex space-x-1.5 overflow-x-auto p-1.5 bg-neutral-950 border border-neutral-900 rounded custom-scrollbar mt-2">
              {activeStory.imageHistory.filter(img => img.entityType === 'cover').map((img) => (
                <div 
                  key={img.id} 
                  className="relative flex-shrink-0 w-10 h-14 rounded overflow-hidden border border-neutral-800 cursor-pointer hover:border-portal transition-colors shadow-lg" 
                  onClick={() => {
                    const store = useAppStore.getState();
                    const updated = store.stories.map(s => {
                      if (s.id === activeStory.id) {
                        const updatedHistory = s.imageHistory?.map(h => 
                          h.entityType === 'cover' ? { ...h, isCurrent: h.imageUrl === img.imageUrl } : h
                        );
                        return { ...s, imageUrl: img.imageUrl, imageHistory: updatedHistory };
                      }
                      return s;
                    });
                    store.saveStories(updated as any);
                  }}
                  title={`Generated at Chapter ${img.chapterNumber || 'Unknown'}\nPrompt: ${img.promptUsed}`}
                >
                  <img src={img.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 space-y-4">
          <div className="space-y-1">
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-signal leading-tight">{activeStory.title}</h2>
            <p className="font-sans text-xs text-neutral-400">Written by <span className="text-gold-accent">Aetherial Resonance</span> • {activeStory.createdAt.split('T')[0]}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="bg-void border border-neutral-800 text-jade-accent px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider font-mono">
              {activeStory.genre}
            </span>
            <span className="bg-void border border-neutral-800 text-neutral-400 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider font-mono">
              Cultivation Rate: Heaven
            </span>
            {activeStory.intake?.storyTags && activeStory.intake.storyTags.map(tag => (
              <span key={tag} className="bg-neutral-900 border border-portal/20 text-portal px-2 py-1 rounded text-[10px] font-medium font-sans">
                #{tag}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-void border border-neutral-800 rounded-lg">
            <div>
              <p className="text-[10px] text-neutral-500 font-sc uppercase tracking-wider font-bold">Chapters</p>
              <p className="font-mono text-signal text-lg">{activeStory.arcs.reduce((sum, a) => sum + a.chapters.length, 0)}</p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-500 font-sc uppercase tracking-wider font-bold">Current Arc</p>
              <p className="font-mono text-signal text-sm mt-1 truncate">{activeStory.arcs[activeStory.arcs.length - 1].title}</p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-500 font-sc uppercase tracking-wider font-bold">Realm</p>
              <p className="font-mono text-portal text-sm mt-1 truncate">{activeStory.memory.currentPowerStage}</p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-500 font-sc uppercase tracking-wider font-bold">Status</p>
              <p className="font-mono text-yellow-500 text-sm mt-1">
                {isCurrentArcFinished ? 'Awaiting Arc' : 'Manifesting'}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <h3 className="font-sc font-bold text-neutral-300 text-xs uppercase tracking-widest mb-2 border-b border-neutral-800 pb-1">Synopsis</h3>
            <p className="font-serif text-sm text-neutral-400 leading-relaxed italic">
              "{activeStory.customPremise}"
            </p>
          </div>

          <div className="pt-6 flex flex-wrap gap-3 items-center relative">
            <button
              onClick={() => {
                const lastCh = activeStory.arcs[activeStory.arcs.length - 1].chapters.find(c => !(c.hasContent || !!c.generatedContent))?.number || activeStory.arcs[activeStory.arcs.length - 1].chapters[0].number;
                setSelectedChapterNum(lastCh);
                setCurrentScreen('reader');
              }}
              className="px-6 py-2.5 bg-human border border-human text-signal font-sc font-bold uppercase tracking-wider rounded shadow-md hover:bg-void hover:text-human transition-all flex items-center space-x-2 text-xs"
            >
              <BookOpen size={16} />
              <span>Start Reading</span>
            </button>

            <button
              onClick={() => setIsCodexSheetOpen(true)}
              className="px-6 py-2.5 bg-void border border-portal text-portal font-sc font-bold uppercase tracking-wider rounded hover:bg-portal hover:text-void transition-all flex items-center space-x-2 text-xs"
            >
              <Sparkles size={16} />
              <span>Open Codex</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setIsStoryMenuOpen(!isStoryMenuOpen)}
                className="p-2.5 bg-void border border-neutral-800 text-neutral-400 hover:text-signal rounded hover:bg-neutral-900 hover:border-neutral-750 transition-all flex items-center justify-center"
                title="More options"
                type="button"
              >
                <MoreHorizontal size={18} />
              </button>

              <AnimatePresence>
                {isStoryMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsStoryMenuOpen(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 mt-2 w-56 rounded bg-neutral-950 border border-neutral-800 shadow-xl z-50 overflow-hidden divide-y divide-neutral-900"
                    >
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setIsStoryMenuOpen(false);
                            handleExportFullTome(activeStory);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs text-neutral-300 hover:bg-neutral-900 hover:text-gold-accent transition-colors flex items-center space-x-2 font-sc font-bold uppercase tracking-wider"
                        >
                          <BookCheck size={14} className="text-portal" />
                          <span>Export Full Tome (HTML)</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsStoryMenuOpen(false);
                            handleExportEPUB(activeStory);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs text-neutral-300 hover:bg-neutral-900 hover:text-portal transition-colors flex items-center space-x-2 font-sc font-bold uppercase tracking-wider"
                        >
                          <BookOpen size={14} className="text-gold-accent" />
                          <span>Export Full Tome (EPUB)</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsStoryMenuOpen(false);
                            handleExportSingleStory(activeStory);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs text-neutral-350 hover:bg-neutral-900 hover:text-signal transition-colors flex items-center space-x-2 font-sc font-bold uppercase tracking-wider"
                        >
                          <Download size={14} className="text-gold-accent" />
                          <span>Export JSON Metadata</span>
                        </button>
                      </div>

                      <div className="py-1">
                        <button
                          onClick={(e) => {
                            handleDeleteStory(activeStory.id, e);
                            setIsStoryMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs text-red-500 hover:bg-red-950/20 hover:text-red-400 transition-colors flex items-center space-x-2 font-sc font-bold uppercase tracking-wider"
                        >
                          <Trash2 size={14} />
                          <span>Burn Scroll</span>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            
            {isCurrentArcFinished && (
              <button
                onClick={() => {
                  setSelectedChapterNum(-1);
                  setCurrentScreen('reader');
                }}
                className="px-6 py-2.5 bg-void border border-gold-accent text-gold-accent font-sc font-bold uppercase tracking-wider rounded hover:bg-gold-accent/10 transition-all flex items-center space-x-2 text-xs ml-auto"
              >
                <Zap size={16} />
                <span>Generate Next Arc</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
