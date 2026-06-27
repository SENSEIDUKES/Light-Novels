import React, { useState } from "react";
import FocusLock from "react-focus-lock";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  BookOpen,
  MoreHorizontal,
  BookCheck,
  Download,
  Trash2,
  Zap,
  GitBranch,
  Scroll,
  Cloud,
  Check,
  RefreshCw,
  Compass,
  CloudDownload,
  Film,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { DestinyChoicePanel } from "./DestinyChoicePanel";
import { FateTimeline } from "./FateTimeline";
import { storyStorage } from "../lib/storage";
import { getAuraTextStyle } from "../lib/qi";
import { vibrate } from "../lib/vibration";
import { useStories, useSaveStory } from "../hooks/useStoryQueries";

export const StoryDetailScreen: React.FC<{
  handleGenerateCover: () => Promise<
    { imageUrls: string[]; promptUsed: string } | undefined
  >;
  handleApplyCover: (imageUrl: string, promptUsed: string) => void;
  handleExportFullTome: (story: any) => void;
  handleExportEPUB: (story: any) => void;
  handleExportSingleStory: (story: any) => void;
  handleDeleteStory: (id: string, e: React.MouseEvent) => void;
  setIsCodexSheetOpen: (open: boolean) => void;
}> = ({
  handleGenerateCover,
  handleApplyCover,
  handleExportFullTome,
  handleExportEPUB,
  handleExportSingleStory,
  handleDeleteStory,
  setIsCodexSheetOpen,
}) => {
  const {
    currentScreen,
    setCurrentScreen,
    activeStoryId,
    isGenerating,
    setSelectedChapterNum,
    userProfile,
  } = useAppStore();
  const { data: stories = [] } = useStories();
  const saveStoryMutation = useSaveStory();
  const [isStoryMenuOpen, setIsStoryMenuOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [coverPreview, setCoverPreview] = useState<{
    urls: string[];
    prompt: string;
    selectedIndex: number;
  } | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isDownloadingOffline, setIsDownloadingOffline] = useState(false);
  const [offlineProgress, setOfflineProgress] = useState({
    current: 0,
    total: 0,
  });
  const [dominantColor, setDominantColor] = useState<string>("rgba(4, 172, 255, 0.6)");

  React.useEffect(() => {
    const activeStory = stories.find((s) => s.id === activeStoryId);
    const imageUrl = activeStory?.imageUrl;
    
    if (!imageUrl) {
      setDominantColor("rgba(4, 172, 255, 0.6)");
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, 1, 1);
          const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
          
          // Boost very dark colors so the aura/glow is still vibrant
          const totalBrightness = r + g + b;
          let finalR = r;
          let finalG = g;
          let finalB = b;
          if (totalBrightness < 120) {
            const scale = 140 / Math.max(totalBrightness, 1);
            finalR = Math.min(255, Math.round(r * scale));
            finalG = Math.min(255, Math.round(g * scale));
            finalB = Math.min(255, Math.round(b * scale));
          }
          
          setDominantColor(`rgba(${finalR}, ${finalG}, ${finalB}, 0.75)`);
        }
      } catch (e) {
        console.warn("Failed to extract dominant color from cover art", e);
        setDominantColor("rgba(4, 172, 255, 0.6)");
      }
    };
    img.onerror = () => {
      setDominantColor("rgba(4, 172, 255, 0.6)");
    };
  }, [activeStoryId, stories]);

  const handleDownloadOffline = async () => {
    if (!activeStory) return;
    setIsDownloadingOffline(true);

    const itemsToFetch: {
      type: "chapter" | "audio";
      url?: string;
      storyId?: string;
      chapterNumber?: number;
    }[] = [];

    for (const arc of activeStory.arcs) {
      for (const chapter of arc.chapters) {
        if (chapter.hasContent) {
          itemsToFetch.push({
            type: "chapter",
            storyId: activeStory.id,
            chapterNumber: chapter.number,
          });
        }
        if (chapter.audioManifest && chapter.audioManifest.clips) {
          for (const clip of chapter.audioManifest.clips) {
            if (clip.audioUrl && clip.audioUrl.startsWith("http")) {
              itemsToFetch.push({ type: "audio", url: clip.audioUrl });
            }
          }
        }
      }
    }

    setOfflineProgress({ current: 0, total: itemsToFetch.length });

    let current = 0;
    for (const item of itemsToFetch) {
      if (item.type === "chapter") {
        await storyStorage.getChapterContent(
          item.storyId!,
          item.chapterNumber!,
        );
      } else if (item.type === "audio" && item.url) {
        try {
          const cached = await storyStorage.getAudioBlob(item.url);
          if (!cached) {
            const res = await fetch(item.url);
            if (res.ok) {
              const blob = await res.blob();
              await storyStorage.saveAudioBlob(item.url, blob);
            }
          }
        } catch (e) {
          console.error("Failed to download audio for offline", e);
        }
      }
      current++;
      setOfflineProgress({ current, total: itemsToFetch.length });
    }

    setIsDownloadingOffline(false);
  };

  if (currentScreen !== "detail") return null;

  const activeStory = stories.find((s) => s.id === activeStoryId);
  if (!activeStory) return null;

  const handleToggleMotionCover = async () => {
    vibrate("softTap");
    const updatedStory = {
      ...activeStory,
      motionCoverActive: !activeStory.motionCoverActive,
    };
    await saveStoryMutation.mutateAsync(updatedStory);
  };

  const isCurrentArcFinished =
    activeStory.arcs.length > 0 &&
    activeStory.arcs[activeStory.arcs.length - 1].chapters.every(
      (c) => c.hasContent || !!c.generatedContent,
    );

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
        onSelect={(index) =>
          setCoverPreview((prev) =>
            prev ? { ...prev, selectedIndex: index } : null,
          )
        }
        onApply={() => {
          if (coverPreview) {
            handleApplyCover(
              coverPreview.urls[coverPreview.selectedIndex],
              coverPreview.prompt,
            );
            setCoverPreview(null);
          }
        }}
        onDiscard={() => setCoverPreview(null)}
        title="Cover Evolution"
        subtitle="Choose the most fitting reflection for your next volume."
      />

      <FateTimeline
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        activeStoryId={activeStoryId || ""}
      />

      {/* Unified Export Tome Modal */}
      <AnimatePresence>
        {isExportModalOpen && (
          <FocusLock>
            <motion.div
              key="export-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25 }}
                className="bg-[#050505] border border-neutral-800 rounded-xl shadow-[0_0_30px_rgba(4,172,255,0.05)] overflow-hidden max-w-2xl w-full flex flex-col"
              >
                {/* Modal Header */}
                <div className="p-6 text-center border-b border-neutral-900 bg-void">
                  <h2 className="text-lg font-sc font-bold text-signal tracking-[0.2em] uppercase flex items-center justify-center gap-2.5">
                    <Scroll className="text-portal" size={20} />
                    <span>Export Novel</span>
                    <Scroll className="text-portal" size={20} />
                  </h2>
                  <p className="text-xs text-neutral-400 mt-2 font-sans max-w-md mx-auto">
                    Select your preferred format to save or read this novel
                    outside the SEIHouse platform.
                  </p>
                </div>

                {/* Form Options Grid */}
                <div className="p-6 space-y-4 bg-neutral-950/40">
                  {/* HTML Option */}
                  <button
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.currentTarget.click();
                      }
                    }}
                    onClick={() => {
                      handleExportFullTome(activeStory);
                      setIsExportModalOpen(false);
                    }}
                    className="w-full text-left p-4 rounded-lg bg-void border border-neutral-850 hover:border-portal hover:bg-neutral-900/40 transition-all duration-300 flex items-start space-x-4 group"
                  >
                    <div className="p-2.5 bg-neutral-900 rounded border border-neutral-800 text-portal group-hover:bg-portal group-hover:text-void group-hover:border-portal transition-all duration-300">
                      <BookCheck size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs font-mono font-bold text-signal uppercase tracking-wider group-hover:text-portal transition-colors">
                        Web Page (HTML Format)
                      </h4>
                      <p className="text-[11px] text-neutral-400 mt-1 font-serif leading-relaxed">
                        Creates a single HTML file containing all generated
                        chapters, complete with modern reading styles. Perfect
                        for printing, sharing, or reading in any web browser.
                      </p>
                    </div>
                  </button>

                  {/* EPUB Option */}
                  <button
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.currentTarget.click();
                      }
                    }}
                    onClick={() => {
                      handleExportEPUB(activeStory);
                      setIsExportModalOpen(false);
                    }}
                    className="w-full text-left p-4 rounded-lg bg-void border border-neutral-850 hover:border-gold-accent hover:bg-neutral-900/40 transition-all duration-300 flex items-start space-x-4 group"
                  >
                    <div className="p-2.5 bg-neutral-900 rounded border border-neutral-800 text-gold-accent group-hover:bg-gold-accent group-hover:text-void group-hover:border-gold-accent transition-all duration-300">
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs font-mono font-bold text-signal uppercase tracking-wider group-hover:text-gold-accent transition-colors">
                        E-Book (EPUB Format)
                      </h4>
                      <p className="text-[11px] text-neutral-400 mt-1 font-serif leading-relaxed">
                        Downloads a standard .epub file compatible with
                        e-readers, Kindle, Apple Books, and other popular
                        digital reader devices or apps.
                      </p>
                    </div>
                  </button>

                  {/* JSON Option */}
                  <button
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.currentTarget.click();
                      }
                    }}
                    onClick={() => {
                      handleExportSingleStory(activeStory);
                      setIsExportModalOpen(false);
                    }}
                    className="w-full text-left p-4 rounded-lg bg-void border border-neutral-850 hover:border-jade-accent hover:bg-neutral-900/40 transition-all duration-300 flex items-start space-x-4 group"
                  >
                    <div className="p-2.5 bg-neutral-900 rounded border border-neutral-800 text-jade-accent group-hover:bg-jade-accent group-hover:text-void group-hover:border-jade-accent transition-all duration-300">
                      <Download size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs font-mono font-bold text-signal uppercase tracking-wider group-hover:text-jade-accent transition-colors">
                        Backup File (JSON Format)
                      </h4>
                      <p className="text-[11px] text-neutral-400 mt-1 font-serif leading-relaxed">
                        Downloads a raw data payload including story settings,
                        metadata, structures, and character registers so you can
                        backup or transfer your novel profile.
                      </p>
                    </div>
                  </button>
                </div>

                {/* Close Button Footer */}
                <div className="p-4 border-t border-neutral-900 bg-void flex justify-end">
                  <button
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.currentTarget.click();
                      }
                    }}
                    onClick={() => setIsExportModalOpen(false)}
                    className="px-6 py-2.5 rounded font-mono text-[11px] uppercase tracking-wider bg-neutral-900 text-neutral-400 hover:bg-neutral-850 hover:text-signal transition-colors border border-neutral-800"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </FocusLock>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row gap-8 bg-[#0a0a0a] border border-neutral-900 rounded-xl p-6 shadow-2xl">
        {/* Cover Art & Motion Canva Cards Container */}
        <div className="w-full md:w-auto flex-shrink-0 flex flex-col sm:flex-row gap-6 items-center sm:items-start justify-center">
          {/* Cover Art Card */}
          <div className="w-44 md:w-56 flex-shrink-0 relative">
            {/* Ethereal QI Glow Aura */}
            <AnimatePresence>
              {activeStory.motionCoverActive && (
                <>
                  {/* Layer 1: Wide Deep Pulse Fog */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{
                      opacity: [0.5, 0.85, 0.5],
                      scale: [1.04, 1.15, 1.04],
                    }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{
                      duration: 4.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute -inset-6 rounded-lg filter blur-3xl z-0 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle, ${dominantColor} 0%, transparent 80%)`,
                    }}
                  />
                  
                  {/* Layer 2: Intense Mid-range High-Energy Pulse */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{
                      opacity: [0.8, 1.0, 0.8],
                      scale: [1.02, 1.08, 1.02],
                    }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute -inset-4 rounded-lg filter blur-2xl z-0 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle, ${dominantColor} 10%, transparent 75%)`,
                      boxShadow: `0 0 65px 28px ${dominantColor}, inset 0 0 30px ${dominantColor}`,
                    }}
                  />

                  {/* Layer 3: Sharp High-Clarity Neon Halo Outline */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: [0.7, 0.95, 0.7],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 2.2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute -inset-1 rounded-lg filter blur-md z-0 pointer-events-none"
                    style={{
                      border: `2px solid ${dominantColor.replace('0.75', '0.9').replace('0.6', '0.9')}`,
                      boxShadow: `0 0 25px 12px ${dominantColor}, inset 0 0 12px ${dominantColor}`,
                    }}
                  />
                </>
              )}
            </AnimatePresence>

            <div
              className={`relative z-10 group aspect-[2/3] rounded-lg overflow-hidden border ${activeStory.evolutionReady && !coverPreview ? "border-portal/50 shadow-[0_0_15px_rgba(4,172,255,0.15)]" : "border-neutral-800"} mb-2`}
            >
              <img
                src={
                  activeStory.imageUrl ||
                  `https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?auto=format&fit=crop&q=80`
                }
                alt={activeStory.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />

              {/* Canva Video Peak Overlay */}
              <AnimatePresence>
                {activeStory.motionCoverActive && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    className="absolute inset-0 w-full h-full bg-void z-10"
                  >
                    <video
                      src="https://pub-e482c2dbbb984c3c87ecdd8ae3a92183.r2.dev/LIBRARY/videos/VIDEO/Apocalypse%20Cultivation%20CANVA.mp4"
                      className="w-full h-full object-cover"
                      autoPlay
                      muted
                      playsInline
                      onEnded={handleToggleMotionCover}
                    />
                    
                    {/* Visual Accent Badge */}
                    <div className="absolute top-2 left-2 bg-portal/80 backdrop-blur-sm text-void font-sc font-bold text-[9px] uppercase tracking-widest px-2 py-0.5 rounded shadow z-20 pointer-events-none">
                      ⓈSEN
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Hover Overlay for Cover Generation and Canva Toggle */}
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2.5 p-4 backdrop-blur-sm z-20">
                <button
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.currentTarget.click();
                    }
                  }}
                  onClick={async () => {
                    vibrate("mediumTap");
                    const result = await handleGenerateCover();
                    if (result)
                      setCoverPreview({
                        urls: result.imageUrls,
                        prompt: result.promptUsed,
                        selectedIndex: 0,
                      });
                  }}
                  disabled={
                    isGenerating ||
                    (!!activeStory.imageUrl && !activeStory.evolutionReady)
                  }
                  className="w-full py-2 bg-portal/20 border border-portal/50 text-portal text-[10px] font-bold font-sc uppercase tracking-wider rounded hover:bg-portal hover:text-void transition-colors flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(4,172,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles size={14} />
                  <span>
                    {activeStory.evolutionReady
                      ? "Awaken Evolution"
                      : activeStory.imageUrl
                        ? "Progression"
                        : "Forge Cover"}
                  </span>
                </button>

                {/* Canva Button inside Hover Overlay */}
                <button
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.currentTarget.click();
                    }
                  }}
                  onClick={handleToggleMotionCover}
                  className={`w-full py-2 border text-[10px] font-bold font-sc uppercase tracking-wider rounded flex items-center justify-center gap-1.5 transition-all shadow-[0_0_10px_rgba(4,172,255,0.1)] ${
                    activeStory.motionCoverActive
                      ? "bg-portal/20 border-portal/50 text-signal hover:bg-portal hover:text-void"
                      : "bg-[#8B0000]/20 border-[#8B0000]/40 text-signal hover:bg-[#8B0000]/40"
                  }`}
                >
                  <Film size={14} />
                  <span>{activeStory.motionCoverActive ? "Disable Canva" : "Canva"}</span>
                </button>
              </div>
            </div>

            {/* Mobile / Tablet buttons below Cover Card */}
            <div className="flex flex-col gap-2 mt-2 mb-3">
              <button
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.currentTarget.click();
                  }
                }}
                onClick={async () => {
                  vibrate("mediumTap");
                  const result = await handleGenerateCover();
                  if (result)
                    setCoverPreview({
                      urls: result.imageUrls,
                      prompt: result.promptUsed,
                      selectedIndex: 0,
                    });
                }}
                disabled={
                  isGenerating ||
                  (!!activeStory.imageUrl && !activeStory.evolutionReady)
                }
                className="w-full py-2.5 bg-portal/10 border border-portal/30 text-portal text-[11px] font-bold font-sc uppercase tracking-wider rounded flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(4,172,255,0.1)] hover:bg-portal hover:text-void transition-all"
              >
                <Sparkles size={12} />
                <span>
                  {activeStory.evolutionReady
                    ? "Awaken Evolution"
                    : activeStory.imageUrl
                      ? "Progression Required"
                      : "Forge Core Cover"}
                </span>
              </button>

              <button
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.currentTarget.click();
                  }
                }}
                onClick={handleToggleMotionCover}
                className={`w-full py-2 border text-[11px] font-bold font-sc uppercase tracking-wider rounded flex items-center justify-center gap-1.5 transition-all ${
                  activeStory.motionCoverActive
                    ? "bg-[#04ACFF]/10 border-[#04ACFF]/30 text-signal hover:bg-portal hover:text-void"
                    : "bg-[#8B0000]/10 border-[#8B0000]/30 text-signal hover:bg-human hover:border-human"
                }`}
              >
                <Film size={12} />
                <span>{activeStory.motionCoverActive ? "Disable Canva" : "Canva"}</span>
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
            {activeStory.imageHistory &&
              activeStory.imageHistory.filter((img) => img.entityType === "cover")
                .length > 1 && (
                <div className="flex space-x-1.5 overflow-x-auto p-1.5 bg-neutral-950 border border-neutral-900 rounded custom-scrollbar mt-2">
                  {activeStory.imageHistory
                    .filter((img) => img.entityType === "cover")
                    .map((img) => (
                      <div
                        key={img.id}
                        className="relative flex-shrink-0 w-10 h-14 rounded overflow-hidden border border-neutral-800 cursor-pointer hover:border-portal transition-colors shadow-lg"
                        onClick={() => {
                          const updatedHistory = activeStory.imageHistory?.map((h) =>
                            h.entityType === "cover"
                              ? {
                                  ...h,
                                  isCurrent: h.imageUrl === img.imageUrl,
                                }
                              : h,
                          );
                          const updatedStory = {
                            ...activeStory,
                            imageUrl: img.imageUrl,
                            imageHistory: updatedHistory,
                          };
                          saveStoryMutation.mutate(updatedStory);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            const updatedHistory = activeStory.imageHistory?.map((h) =>
                              h.entityType === "cover"
                                ? {
                                    ...h,
                                    isCurrent: h.imageUrl === img.imageUrl,
                                  }
                                : h,
                            );
                            const updatedStory = {
                              ...activeStory,
                              imageUrl: img.imageUrl,
                              imageHistory: updatedHistory,
                            };
                            saveStoryMutation.mutate(updatedStory);
                          }
                        }}
                        aria-label={`Apply cover image from chapter ${img.chapterNumber || "Unknown"}`}
                        title={`Generated at Chapter ${img.chapterNumber || "Unknown"}\nPrompt: ${img.promptUsed}`}
                      >
                        <img
                          src={img.imageUrl}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          alt=""
                        />
                      </div>
                    ))}
                </div>
              )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 space-y-4">
          <div className="space-y-1">
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-signal leading-tight">
              {activeStory.title}
            </h2>
            <p className="font-sans text-xs text-neutral-400">
              Written by{" "}
              {(() => {
                const styleObj = getAuraTextStyle(
                  userProfile?.displayNameColor,
                  userProfile?.activeStatusEffects,
                );
                return (
                  <span
                    className={`${styleObj.className || ""} font-bold`}
                    style={styleObj.style}
                  >
                    {userProfile?.displayName ||
                      userProfile?.username ||
                      "Aetherial Resonance"}
                  </span>
                );
              })()}{" "}
              • {activeStory.createdAt.split("T")[0]}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="bg-void border border-neutral-800 text-jade-accent px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider font-mono">
              {activeStory.genre}
            </span>
            <span className="bg-void border border-neutral-800 text-neutral-400 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider font-mono">
              Cultivation Rate: Heaven
            </span>
            {activeStory.readingStats?.totalReadingTimeMs && (
              <span
                className="bg-void border border-neutral-800 text-portal px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider font-mono"
                title="Total Ascension Time"
              >
                Ascension Time:{" "}
                {Math.floor(
                  activeStory.readingStats.totalReadingTimeMs / 60000,
                )}
                m{" "}
                {Math.floor(
                  (activeStory.readingStats.totalReadingTimeMs % 60000) / 1000,
                )}
                s
              </span>
            )}
            {activeStory.intake?.storyTags &&
              activeStory.intake.storyTags.map((tag) => (
                <span
                  key={tag}
                  className="bg-neutral-900 border border-portal/20 text-portal px-2 py-1 rounded text-[10px] font-medium font-sans"
                >
                  #{tag}
                </span>
              ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-void border border-neutral-800 rounded-lg">
            <div>
              <p className="text-[10px] text-neutral-500 font-sc uppercase tracking-wider font-bold">
                Chapters
              </p>
              <p className="font-mono text-signal text-lg">
                {activeStory.arcs.reduce(
                  (sum, a) => sum + a.chapters.length,
                  0,
                )}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-500 font-sc uppercase tracking-wider font-bold">
                Current Arc
              </p>
              <p className="font-mono text-signal text-sm mt-1 truncate">
                {activeStory.arcs[activeStory.arcs.length - 1].title}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-500 font-sc uppercase tracking-wider font-bold">
                Realm
              </p>
              <p className="font-mono text-portal text-sm mt-1 truncate">
                {activeStory.memory.currentPowerStage}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-500 font-sc uppercase tracking-wider font-bold">
                Status
              </p>
              <p className="font-mono text-yellow-500 text-sm mt-1">
                {isCurrentArcFinished ? "Awaiting Arc" : "Manifesting"}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <h3 className="font-sc font-bold text-neutral-300 text-xs uppercase tracking-widest mb-2 border-b border-neutral-800 pb-1">
              Synopsis
            </h3>
            <p className="font-serif text-sm text-neutral-400 leading-relaxed italic">
              "{activeStory.customPremise}"
            </p>
          </div>

          {activeStory.blueprint?.destinedEnding && (
            <div className="pt-2">
              <h3 className="font-sc font-bold text-portal text-xs uppercase tracking-widest mb-2 border-b border-neutral-800 pb-1 flex items-center gap-1.5">
                <Sparkles size={12} />
                Destined Ending
              </h3>
              <p className="font-sans text-sm text-neutral-300 leading-relaxed bg-portal/5 border border-portal/10 p-3 rounded-lg">
                {activeStory.blueprint.destinedEnding}
              </p>
            </div>
          )}

          <div className="pt-6 flex flex-wrap gap-3 items-center relative">
            <button
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.currentTarget.click();
                }
              }}
              onClick={() => {
                vibrate("softTap");
                if (
                  activeStory.lastReadChapter &&
                  activeStory.lastReadChapter > 0
                ) {
                  setSelectedChapterNum(activeStory.lastReadChapter);
                } else {
                  const lastCh =
                    activeStory.arcs[activeStory.arcs.length - 1].chapters.find(
                      (c) => !(c.hasContent || !!c.generatedContent),
                    )?.number ||
                    activeStory.arcs[activeStory.arcs.length - 1].chapters[0]
                      .number;
                  setSelectedChapterNum(lastCh);
                }
                setCurrentScreen("reader");
              }}
              className="px-6 py-2.5 bg-human border border-human text-signal font-sc font-bold uppercase tracking-wider rounded shadow-md hover:bg-void hover:text-human transition-all flex items-center space-x-2 text-xs"
            >
              <BookOpen size={16} />
              <span>
                {activeStory.lastReadChapter
                  ? "Resume Reading"
                  : "Start Reading"}
              </span>
            </button>

            <button
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.currentTarget.click();
                }
              }}
              onClick={() => {
                vibrate("softTap");
                setIsCodexSheetOpen(true);
              }}
              className="px-6 py-2.5 bg-void border border-portal text-portal font-sc font-bold uppercase tracking-wider rounded hover:bg-portal hover:text-void transition-all flex items-center space-x-2 text-xs"
            >
              <Sparkles size={16} />
              <span>Open Codex</span>
            </button>

            <button
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.currentTarget.click();
                }
              }}
              onClick={() => {
                vibrate("softTap");
                setIsTimelineOpen(true);
              }}
              className="px-6 py-2.5 bg-void border border-jade-accent text-jade-accent font-sc font-bold uppercase tracking-wider rounded hover:bg-jade-accent hover:text-void transition-all flex items-center space-x-2 text-xs"
            >
              <GitBranch size={16} />
              <span>Fate Timeline</span>
            </button>

            <div className="relative">
              <button
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.currentTarget.click();
                  }
                }}
                onClick={() => {
                  vibrate("softTap");
                  setIsStoryMenuOpen(!isStoryMenuOpen);
                }}
                aria-expanded={isStoryMenuOpen}
                aria-label="More options"
                className="p-2.5 bg-void border border-neutral-800 text-neutral-400 hover:text-signal rounded hover:bg-neutral-900 hover:border-neutral-750 transition-all flex items-center justify-center"
                title="More options"
                type="button"
              >
                <MoreHorizontal size={18} />
              </button>

              {isStoryMenuOpen && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsStoryMenuOpen(false)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setIsStoryMenuOpen(false);
                    }
                  }}
                />
              )}
              <AnimatePresence>
                {isStoryMenuOpen && (
                  <motion.div
                    key="story-menu-dropdown"
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 mt-2 w-56 rounded bg-neutral-950 border border-neutral-800 shadow-xl z-50 overflow-hidden divide-y divide-neutral-900"
                  >
                    <div className="py-1">
                      <button
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.currentTarget.click();
                          }
                        }}
                        onClick={() => {
                          setIsStoryMenuOpen(false);
                          setIsExportModalOpen(true);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs text-neutral-300 hover:bg-neutral-900 hover:text-gold-accent transition-colors flex items-center space-x-2 font-sc font-bold uppercase tracking-wider"
                      >
                        <Scroll size={14} className="text-portal" />
                        <span>Export Tome</span>
                      </button>
                    </div>

                    <div className="py-1 border-t border-neutral-900">
                      <button
                        disabled={isDownloadingOffline}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.currentTarget.click();
                          }
                        }}
                        onClick={(e) => {
                          handleDownloadOffline();
                          setIsStoryMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs text-neutral-300 hover:bg-neutral-900 hover:text-jade-accent transition-colors flex items-center space-x-2 font-sc font-bold uppercase tracking-wider disabled:opacity-50"
                      >
                        <CloudDownload size={14} className="text-jade-accent" />
                        <span>Offline Dao (Cache)</span>
                      </button>
                    </div>

                    <div className="py-1 border-t border-neutral-900">
                      <button
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.currentTarget.click();
                          }
                        }}
                        onClick={(e) => {
                          handleDeleteStory(activeStory.id, e);
                          setIsStoryMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs text-red-500 hover:bg-red-950/20 hover:text-red-400 transition-colors flex items-center space-x-2 font-sc font-bold uppercase tracking-wider"
                      >
                        <Trash2 size={14} />
                        <span>Burn Story</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {isDownloadingOffline && (
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-full text-[10px] font-mono text-jade-accent whitespace-nowrap shadow-lg">
                <RefreshCw size={12} className="animate-spin" />
                <span>
                  Gathering Qi: {offlineProgress.current} /{" "}
                  {offlineProgress.total}
                </span>
              </div>
            )}

            {isCurrentArcFinished && (
              <button
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.currentTarget.click();
                  }
                }}
                onClick={() => {
                  vibrate("softTap");
                  setSelectedChapterNum(-1);
                  setCurrentScreen("reader");
                }}
                className="px-6 py-2.5 bg-void border border-portal text-portal font-sc font-bold uppercase tracking-wider rounded hover:bg-portal/10 transition-all flex items-center space-x-2 text-xs ml-auto shadow-[0_0_15px_rgba(4,172,255,0.15)]"
              >
                <Compass size={16} />
                <span>Continue Fate</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
