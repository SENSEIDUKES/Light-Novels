import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Plus, Trash2, Bookmark as BookmarkIcon, Lock, ArrowLeft, ArrowRight, Sparkles, Zap, Play, ShieldAlert } from 'lucide-react';
import { Chapter, StoryWorld, Bookmark } from '../types';
import { extractSFXCues } from '../hooks/useReaderPlayback';
import { SystemBlock, SYSTEM_COLORS_LEGEND } from './SystemBlock';
import { FateSurvivalExplanation } from './FateSurvivalExplanation';
import { CodexHovercard } from './CodexHovercard';
import { WorldEntityCard } from './WorldEntityCard';
import { VoiceEditionPanel } from './VoiceEditionPanel';

interface ReaderViewportProps {
  readerRef: React.RefObject<HTMLDivElement | null>;
  driftInnerRef: React.RefObject<HTMLDivElement | null>;
  isReaderFullscreen: boolean;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
  handleTextClick: (e: React.MouseEvent | React.TouchEvent) => void;
  handleViewportScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  
  isTranslating: boolean;
  preferredLang: string;
  selectedChapter: Chapter;
  activeStory: StoryWorld;
  currentPowerStage: string;
  selectedChapterNum: number;
  maxChapterNum: number;
  
  codexTerms: any[];
  generatingRevealId: string | null;
  handleManifestReveal: (entry: any, type: string) => void;
  
  readerMode: string;
  immersion: any;
  isPlayingText: boolean;
  isPausedText: boolean;
  currentNarratedBlockIndex: number | null;
  
  currentPrefs: any;
  handleUpdatePreference: (key: string, value: any) => void;
  activeBookmarks: Bookmark[];
  editingBookmarkParagraphIndex: number | null;
  setEditingBookmarkParagraphIndex: (idx: number | null) => void;
  bookmarkNoteText: string;
  setBookmarkNoteText: (text: string) => void;
  handleRemoveBookmark: (chapterNum: number, paraIdx: number) => void;
  handleSaveBookmark: (paraIdx: number, excerpt: string, noteText: string) => void;
  
  activeTranslationContent: string | null;
  renderHighlightedText: (text: string, paragraphIndex: number) => React.ReactNode;
  getFocusClass: (paraIdx: number) => string;
  
  onUpdateStory: (updatedStory: StoryWorld) => void;
  navigatePrev: () => void;
  navigateNext: () => void;
  
  handleSealChapter?: (chapterNumber: number) => Promise<void>;
  handleSealClick: () => void;
  isCheckingConsistency: boolean;
  
  isGenerating: boolean;
  handleGenerate: () => void;
  activeAgentId: string | null;
  
  showFateCodex: boolean;
  setShowFateCodex: (show: boolean) => void;
  showLegend: boolean;
  setShowLegend: (show: boolean) => void;
  hasSystemBlocks: boolean;
  
  chapters: Chapter[];
}

export function ReaderViewport({
  readerRef,
  driftInnerRef,
  isReaderFullscreen,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  handleTextClick,
  handleViewportScroll,
  isTranslating,
  preferredLang,
  selectedChapter,
  activeStory,
  currentPowerStage,
  selectedChapterNum,
  maxChapterNum,
  codexTerms,
  generatingRevealId,
  handleManifestReveal,
  readerMode,
  immersion,
  isPlayingText,
  isPausedText,
  currentNarratedBlockIndex,
  currentPrefs,
  handleUpdatePreference,
  activeBookmarks,
  editingBookmarkParagraphIndex,
  setEditingBookmarkParagraphIndex,
  bookmarkNoteText,
  setBookmarkNoteText,
  handleRemoveBookmark,
  handleSaveBookmark,
  activeTranslationContent,
  renderHighlightedText,
  getFocusClass,
  onUpdateStory,
  navigatePrev,
  navigateNext,
  handleSealChapter,
  handleSealClick,
  isCheckingConsistency,
  isGenerating,
  handleGenerate,
  activeAgentId,
  showFateCodex,
  setShowFateCodex,
  showLegend,
  setShowLegend,
  hasSystemBlocks,
  chapters
}: ReaderViewportProps) {
  
  return (
    <div
      ref={readerRef as any}
      className={`flex-1 overflow-y-auto px-4 sm:px-12 md:px-24 py-8 relative ${isReaderFullscreen ? "mb-4 no-scrollbar" : "mb-24 custom-scrollbar"}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleTextClick}
      onScroll={handleViewportScroll} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (handleTextClick)(e as any); } }}
    >
      <div ref={driftInnerRef as any} style={{ willChange: 'transform' }}>
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

              {activeStory.genre === 'Fate Survival' && (
                <div className="mb-8 p-5 rounded-lg bg-neutral-950 border border-red-950/40 relative overflow-hidden shadow-[0_0_25px_rgba(139,0,0,0.15)] animate-fadeIn">
                  <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-br from-red-600/10 to-transparent pointer-events-none rounded-bl-full" />
                  <div className="flex items-center justify-between border-b border-red-950/20 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-red-500 animate-pulse text-xs">💀</span>
                      <h4 className="font-sc font-bold text-xs sm:text-sm text-red-500 tracking-[0.2em] uppercase">
                        Fate Survival Mode Active
                      </h4>
                    </div>
                    <div className="px-2 py-0.5 rounded bg-red-950/30 border border-red-900/30 text-red-400 font-mono text-[9px] tracking-wider uppercase">
                      DOOM DEADLINE: CHAPTER 7
                    </div>
                  </div>
                  
                  <p className="text-neutral-300 font-serif text-sm italic mb-4 leading-relaxed">
                    "The timeline is moving toward a fated outcome. You must use limited choices, clues, and intervention to alter destiny before it becomes irreversible."
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans mb-4">
                    <div className="space-y-1.5 p-3 rounded bg-black/40 border border-neutral-900">
                      <div className="text-[10px] uppercase font-mono tracking-wider text-neutral-500">
                        Target Profile
                      </div>
                      <div className="font-display font-medium text-signal">
                        MC: <span className="text-neutral-200 font-bold">{activeStory.mcName}</span>
                      </div>
                      <div className="text-neutral-400">
                        Current Stage: <span className="text-gold-accent font-mono">{activeStory.memory?.currentPowerStage || currentPowerStage}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 p-3 rounded bg-black/40 border border-neutral-900">
                      <div className="text-[10px] uppercase font-mono tracking-wider text-neutral-500">
                        Chronos Calibration
                      </div>
                      <div className="font-display font-medium text-signal">
                        Remaining Steps: <span className="text-red-500 font-bold">{Math.max(0, 7 - selectedChapterNum)} Chapters</span>
                      </div>
                      <div className="text-neutral-400">
                        Status: <span className="text-red-400 font-bold uppercase tracking-wider">{selectedChapterNum >= 7 ? 'Critical Apex' : 'Fate Approaching'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 rounded-md bg-void border border-neutral-900 text-[11px] leading-relaxed text-neutral-400 font-sans">
                      <strong className="text-neutral-300">How to intervene:</strong> Read carefully for death or crisis flags. The danger is not always physical—you could be surviving a Death, Love, Kingdom, Villain, Betrayal, Poverty, War, Regression, Reputation, or World Fate. Use the <span className="text-portal font-semibold">Alter Fate (Branch)</span> panel below to force a timeline shift!
                    </div>

                    <div className="flex justify-start">
                      <button
                        type="button"
                         tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setShowFateCodex(!showFateCodex)}
                        className="px-3 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-signal text-xs font-sc uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5"
                      >
                        <span>{showFateCodex ? "✦ Hide Fate Codex" : "🔍 Inspect Fate Codex"}</span>
                      </button>
                    </div>

                    <AnimatePresence>
                      {showFateCodex && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden pt-2"
                        >
                          <FateSurvivalExplanation compact={true} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {activeStory.hardcoreFateMode && (
                <div className="mb-8 p-5 rounded-lg bg-neutral-950 border border-red-950/40 relative overflow-hidden shadow-[0_0_20px_rgba(139,0,0,0.1)] animate-fadeIn">
                  <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-br from-red-600/10 to-transparent pointer-events-none rounded-bl-full" />
                  <div className="flex items-center justify-between border-b border-red-950/20 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-red-500 animate-pulse text-xs">☠️</span>
                      <h4 className="font-sc font-bold text-xs sm:text-sm text-red-500 tracking-[0.2em] uppercase">
                        Hardcore Fate Mode Engaged
                      </h4>
                    </div>
                    <div className="px-2 py-0.5 rounded bg-red-950/30 border border-red-900/30 text-red-400 font-mono text-[9px] tracking-wider uppercase animate-pulse">
                      HIGH DANGER
                    </div>
                  </div>
                  
                  <p className="text-neutral-300 font-sans text-xs leading-relaxed">
                    The system is authorized to introduce irreversible consequences, death flags on allies, sudden betrayals, and forced tradeoffs. There are no safe choices. Protect your timeline!
                  </p>
                </div>
              )}

              {showLegend && hasSystemBlocks && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-8 p-5 bg-[#080808]/90 border border-portal/30 rounded-lg max-w-2xl mx-auto shadow-[0_0_30px_rgba(4,172,255,0.1)] relative z-10"
                >
                  <div className="flex items-center justify-between border-b border-portal/20 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-portal text-sm animate-pulse">✦</span>
                      <h4 className="font-display font-medium text-xs sm:text-sm text-signal tracking-widest uppercase">
                        Aetherial System Codes
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={currentPrefs?.colorPaletteId || 'default'}
                        onChange={(e) => handleUpdatePreference('colorPaletteId', e.target.value)}
                        className="text-[9px] uppercase font-mono tracking-wider text-portal transition-colors px-2.5 py-1.5 border border-portal/30 hover:border-portal rounded-sm bg-portal/5 hover:bg-portal/15 cursor-pointer outline-none focus:ring-1 focus:ring-portal appearance-none"
                      >
                        <option value="default" className="bg-void text-signal">Custom Mapping: Default</option>
                        <option value="protanopia" className="bg-void text-signal">Protanopia (Red-Blind)</option>
                        <option value="deuteranopia" className="bg-void text-signal">Deuteranopia (Green-Blind)</option>
                        <option value="tritanopia" className="bg-void text-signal">Tritanopia (Blue-Blind)</option>
                        <option value="high_contrast_dark" className="bg-void text-signal">High Contrast Dark</option>
                      </select>
                      <button
                         tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                          localStorage.setItem("seihouse-system-legend-dismissed", "true");
                          setShowLegend(false);
                        }}
                        className="text-[9px] uppercase font-mono tracking-wider text-portal hover:text-signal transition-colors px-2.5 py-1.5 border border-portal/30 hover:border-portal rounded-sm bg-portal/5 hover:bg-portal/15 cursor-pointer shadow-[0_0_10px_rgba(4,172,255,0.1)]"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-neutral-400 text-xs font-serif italic mb-4 leading-relaxed">
                    The Heavenly System speaks through colors. The resonance of each hue carries deep narrative significance. Learn to feel the thread of your fate.
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                    {SYSTEM_COLORS_LEGEND.map((m) => (
                      <div
                        key={m.type}
                        className={`p-2 border rounded-md ${m.cssVar ? '' : `${m.bgColor} ${m.borderColor}`} flex flex-col justify-between min-h-[60px] transition-all hover:scale-[1.02]`}
                        style={m.cssVar ? {
                          backgroundColor: `color-mix(in srgb, var(${m.cssVar}) 15%, transparent)`,
                          borderColor: `color-mix(in srgb, var(${m.cssVar}) 40%, transparent)`
                        } : {}}
                      >
                        <span 
                          className={`text-[10px] font-bold uppercase tracking-wider ${m.cssVar ? '' : m.textColor}`}
                          style={m.cssVar ? { color: `var(${m.cssVar})` } : {}}
                        >
                          {m.name}
                        </span>
                        <span className="text-[9px] text-neutral-400 font-mono tracking-tight mt-1 leading-normal">
                          {m.playerMeaning}
                        </span>
                      </div>
                    ))}
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
                            <SystemBlock
                              key={index}
                              id={`para-${index}`}
                              data-block-index={index}
                              content={cleanText}
                            />
                          );
                        }

                        return (
                          <div
                            key={index}
                            id={`para-${index}`}
                            data-block-index={index}
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
                                <div
                                  className={`text-justify indent-8 ${currentPrefs.paragraphSpacing === "normal" ? "mb-0" : currentPrefs.paragraphSpacing === "wide" ? "mb-2" : "mb-4"} ${getFocusClass(index)}`}
                                >
                                  {renderHighlightedText(cleanText, index)}
                                </div>
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
                        const isPlayerPlaying = isPlayingText || isPausedText;
                        const isRevealed = !isSenMode || !immersion.imagePopups || (!isPlayerPlaying) || index <= (currentParaIdx || 0);

                        let revealCard = null;
                        if (block.worldCard) {
                          const cardWithImage = { ...block.worldCard };
                          if (!cardWithImage.imageUrl && revealImageUrl) {
                            cardWithImage.imageUrl = revealImageUrl;
                          }
                          revealCard = (isRevealed || !isSenMode || immersion.imagePopups) ? (
                            <WorldEntityCard card={cardWithImage} />
                          ) : null;
                        } else if (revealTerm && (!isSenMode || immersion.imagePopups)) {
                          revealCard = (
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
                                     tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => handleManifestReveal(revealTerm.entry, revealTerm.type)}
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
                          );
                        }

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
                            <div className={`text-justify indent-8 relative ${getFocusClass(index)}`}>
                              {renderHighlightedText(cleanText, index)}
                              <button
                                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
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
                            </div>

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
                                />
                                <div className="flex justify-end space-x-2">
                                  <button
                                     tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() =>
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
                                id={`para-${index}`}
                                data-block-index={index}
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
                              data-block-index={index}
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
                                       tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
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
                                  <div
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
                                  </div>
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
                                       tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() =>
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
               tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={navigatePrev}
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
                   tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={handleSealClick}
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
               tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={navigateNext}
              disabled={selectedChapterNum === maxChapterNum}
              className="px-6 py-2 rounded-full border border-neutral-800 hover:border-gold-accent text-neutral-400 hover:text-gold-accent disabled:opacity-20 transition-all font-sc uppercase text-[10px] tracking-wider flex items-center space-x-2"
            >
              <span>Next</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </>
      ) : isGenerating || selectedChapter.hasContent ? (
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
             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={handleGenerate}
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
                  Manifest
                </span>
              </>
            )}
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
