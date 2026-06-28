import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Sparkles, BookA } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import SteerPortal from "./SteerPortal";
import ReaderChamber from "./ReaderChamber";
import { GlossarySidePanel } from "./GlossarySidePanel";
import { Story, StreamingChapter } from "../types";
import { awardQi } from "../lib/qi";
import { RecapScreen } from "./RecapScreen";
import { storyStorage } from "../lib/storage";

export const ReaderScreen: React.FC<{
  handleSteerArc: (direction: string, customPrompt: string) => Promise<void>;
  handleAlterFate: (
    chapterNumber: number,
    direction: string,
    customPrompt: string,
  ) => Promise<void>;
  handleGenerateChapter: (chapterNumber: number) => Promise<void>;
  handleToggleRead: (ch: number) => void;
  handleUpdateStoryDirect: (story: Story) => void;
  setIsCodexSheetOpen: (open: boolean) => void;
  handleSealChapter: (chapterNumber: number) => Promise<void>;
  handleCheckConsistency?: (chapterNumber: number) => Promise<string[]>;
}> = ({
  handleSteerArc,
  handleAlterFate,
  handleGenerateChapter,
  handleToggleRead,
  handleUpdateStoryDirect,
  setIsCodexSheetOpen,
  handleSealChapter,
  handleCheckConsistency,
}) => {
  const currentScreen = useAppStore(state => state.currentScreen);
    const setCurrentScreen = useAppStore(state => state.setCurrentScreen);
    const activeStoryId = useAppStore(state => state.activeStoryId);
    const stories = useAppStore(state => state.stories);
    const selectedChapterNum = useAppStore(state => state.selectedChapterNum);
    const setSelectedChapterNum = useAppStore(state => state.setSelectedChapterNum);
    const isGenerating = useAppStore(state => state.isGenerating);
    const routingConfig = useAppStore(state => state.routingConfig);
    const streamingChapter = useAppStore(state => state.streamingChapter);
    const isReaderFullscreen = useAppStore(state => state.isReaderFullscreen);
    const currentUser = useAppStore(state => state.currentUser);

  const activeStory = stories.find((s) => s.id === activeStoryId);

  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const [localChapterCache, setLocalChapterCache] = useState<
    Record<number, any>
  >({});
  const pendingFetches = React.useRef<Set<number>>(new Set());

  // Reading time tracking state
  const [clockTime, setClockTime] = useState(new Date());
  const [localStatsDelta, setLocalStatsDelta] = useState<{
    total: number;
    arc: Record<number, number>;
  }>({ total: 0, arc: {} });
  const readingTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastActiveTimeRef = React.useRef<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setClockTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine current arc index
  const currentArcIndex =
    activeStory?.arcs.findIndex((a) =>
      a.chapters.some((c) => c.number === selectedChapterNum),
    ) ?? -1;

  useEffect(() => {
    if (
      !activeStory ||
      currentScreen !== "reader" ||
      selectedChapterNum === -1
    ) {
      if (readingTimerRef.current) clearInterval(readingTimerRef.current);
      return;
    }

    lastActiveTimeRef.current = Date.now();

    const timer = setInterval(() => {
      if (!document.hidden) {
        const now = Date.now();
        const deltaMs = now - lastActiveTimeRef.current;
        lastActiveTimeRef.current = now;

        setLocalStatsDelta((prev) => {
          const newArc = { ...prev.arc };
          if (currentArcIndex !== -1) {
            newArc[currentArcIndex] = (newArc[currentArcIndex] || 0) + deltaMs;
          }
          return {
            total: prev.total + deltaMs,
            arc: newArc,
          };
        });
      } else {
        lastActiveTimeRef.current = Date.now();
      }
    }, 1000);
    readingTimerRef.current = timer;

    return () => clearInterval(timer);
  }, [activeStory?.id, currentScreen, selectedChapterNum, currentArcIndex]);

  // Flush stats to store periodically
  useEffect(() => {
    const flushInterval = setInterval(() => {
      if (activeStory && localStatsDelta.total > 0) {
        const stats = activeStory.readingStats || {
          totalReadingTimeMs: 0,
          arcReadingTimeMs: {},
        };
        const newTotal =
          (stats.totalReadingTimeMs || 0) + localStatsDelta.total;

        const newArcTimes = { ...(stats.arcReadingTimeMs || {}) };
        for (const [arcIdx, timeMs] of Object.entries(localStatsDelta.arc)) {
          newArcTimes[Number(arcIdx)] =
            (newArcTimes[Number(arcIdx)] || 0) + timeMs;
        }

        handleUpdateStoryDirect({
          ...activeStory,
          readingStats: {
            totalReadingTimeMs: newTotal,
            arcReadingTimeMs: newArcTimes,
          },
        });

        // Reset delta
        setLocalStatsDelta({ total: 0, arc: {} });
      }
    }, 15000);

    return () => {
      clearInterval(flushInterval);
      // We don't flush on unmount here to avoid react state update on unmounted component
      // 15 seconds is a reasonable loss window if they immediately close.
    };
  }, [activeStory, localStatsDelta, handleUpdateStoryDirect]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  const storyTotalTimeS =
    ((activeStory?.readingStats?.totalReadingTimeMs || 0) +
      (localStatsDelta.total || 0)) /
    1000;

  // Listen to custom DOM event to toggle glossary sidelobe via global hotkey
  useEffect(() => {
    const handleToggleGlossary = () => {
      setIsGlossaryOpen((prev) => !prev);
    };
    window.addEventListener("toggle-glossary-panel", handleToggleGlossary);
    return () => {
      window.removeEventListener("toggle-glossary-panel", handleToggleGlossary);
    };
  }, []);

  useEffect(() => {
    if (activeStory && currentScreen === "reader") {
      const currentChapter = activeStory.arcs
        .flatMap((a) => a.chapters)
        .find((c) => c.number === selectedChapterNum);
      if (
        currentChapter &&
        currentChapter.status === "unread" &&
        currentChapter.hasContent
      ) {
        awardQi("chapter_read");
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

  useEffect(() => {
    if (
      activeStory &&
      currentScreen === "reader" &&
      selectedChapterNum !== -1
    ) {
      const currentChapter = activeStory.arcs
        .flatMap((a) => a.chapters)
        .find((c) => c.number === selectedChapterNum);
      if (
        currentChapter &&
        currentChapter.hasContent &&
        !currentChapter.generatedContent &&
        (!currentChapter.blocks || currentChapter.blocks.length === 0)
      ) {
        if (
          !localChapterCache[selectedChapterNum] &&
          !pendingFetches.current.has(selectedChapterNum)
        ) {
          pendingFetches.current.add(selectedChapterNum);
          storyStorage
            .getChapterContent(activeStory.id, selectedChapterNum)
            .then((content) => {
              if (content) {
                setLocalChapterCache((prev) => ({
                  ...prev,
                  [selectedChapterNum]: content,
                }));
              }
            })
            .catch(console.error)
            .finally(() => {
              pendingFetches.current.delete(selectedChapterNum);
            });
        }
      }
    }
  }, [activeStory, currentScreen, selectedChapterNum, localChapterCache]);

  if (currentScreen !== "reader") return null;

  if (!activeStory) return null;

  if (showRecap) {
    return (
      <RecapScreen
        story={activeStory}
        lastReadChapter={selectedChapterNum}
        onContinue={() => setShowRecap(false)}
      />
    );
  }

  return (
    <motion.div
      key="reader-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={`space-y-6 ${isReaderFullscreen ? "!space-y-0 relative" : ""}`}
    >
      {!isReaderFullscreen && (
        <div className="flex items-center justify-between bg-black/60 border border-neutral-900 px-3 py-1.5 sm:px-4 sm:py-2 rounded shadow-md backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
            <button
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.currentTarget.click();
                }
              }}
              onClick={() => setCurrentScreen("detail")}
              className="text-neutral-500 hover:text-gold-accent transition-colors flex-shrink-0"
            >
              <ArrowLeft size={18} />
            </button>
            <span className="font-sc uppercase tracking-[0.12em] text-gold-accent font-bold text-[10px] sm:text-xs flex-shrink-0">
              {activeStory.genre}
            </span>
            <span className="text-neutral-700 font-mono flex-shrink-0">•</span>
            <span className="text-neutral-400 font-display text-xs sm:text-sm truncate pr-2">
              {activeStory.title}
            </span>
          </div>
          <div className="flex-shrink-0 flex items-center space-x-2">
            <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-black/40 border border-neutral-800 rounded text-neutral-400 font-mono text-[10px]">
              <div
                className="flex items-center space-x-1"
                title="Current Local Time"
              >
                <span className="text-jade-accent">Time:</span>
                <span>
                  {clockTime.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <span className="text-neutral-700">|</span>
              <div
                className="flex items-center space-x-1"
                title="Total Story Reading Time"
              >
                <span className="text-gold-accent">Story:</span>
                <span>{formatTime(storyTotalTimeS)}</span>
              </div>
            </div>
            <button
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.currentTarget.click();
                }
              }}
              onClick={() => setIsGlossaryOpen(true)}
              className="px-2.5 py-1 sm:px-4 sm:py-1.5 bg-neutral-900 border border-neutral-800 text-neutral-400 font-sc font-bold uppercase tracking-wider rounded hover:bg-neutral-800 hover:text-white transition-all flex items-center space-x-1 sm:space-x-2 text-[9px] sm:text-[10px]"
            >
              <BookA size={11} />
              <span className="hidden sm:inline">Lore Glossary</span>
              <span className="sm:hidden">Lore</span>
            </button>
            <button
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.currentTarget.click();
                }
              }}
              onClick={() => setIsCodexSheetOpen(true)}
              className="px-2.5 py-1 sm:px-4 sm:py-1.5 bg-void border border-portal text-portal font-sc font-bold uppercase tracking-wider rounded hover:bg-portal hover:text-void transition-all flex items-center space-x-1 sm:space-x-2 text-[9px] sm:text-[10px]"
            >
              <Sparkles size={11} />
              <span>Codex</span>
            </button>
          </div>
        </div>
      )}

      {!currentUser &&
      (selectedChapterNum === -1 || selectedChapterNum > 10) ? (
        <div className="max-w-xl mx-auto mt-20 text-center bg-black/60 border border-neutral-900 p-10 rounded-xl shadow-2xl animate-fadeIn">
          <h2 className="font-display font-bold text-3xl text-signal mb-4">
            Authentication Required
          </h2>
          <p className="text-neutral-400 font-sans text-sm mb-8 leading-relaxed">
            {selectedChapterNum === -1
              ? "You must sync your spirit (sign in) to forge new destinies and steer the narrative."
              : "You have reached the limit of anonymous reading (10 chapters). Please sync your spirit (sign in) to continue your ascension and unlock unlimited chapters."}
          </p>
          <button
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.currentTarget.click();
              }
            }}
            onClick={() => {
              import("../lib/firebase").then(({ auth }) => {
                import("firebase/auth").then(
                  ({ signInWithPopup, GoogleAuthProvider }) => {
                    signInWithPopup(auth, new GoogleAuthProvider());
                  },
                );
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
            chapters={activeStory.arcs
              .flatMap((a) => a.chapters)
              .map((ch) => {
                if (streamingChapter && ch.number === streamingChapter.number) {
                  return {
                    ...ch,
                    generatedContent: streamingChapter.content,
                    blocks: streamingChapter.blocks,
                    status: "read" as const,
                  };
                }
                if (localChapterCache[ch.number]) {
                  const cached = localChapterCache[ch.number];
                  return {
                    ...ch,
                    generatedContent: cached.generatedContent,
                    blocks: cached.blocks,
                    summary: cached.summary || ch.summary,
                    statsChangeMessage:
                      cached.statsChangeMessage || ch.statsChangeMessage,
                    cuePayload: cached.cuePayload || ch.cuePayload,
                  };
                }
                return ch;
              })}
            arcTitle={
              activeStory.arcs.find((a) =>
                a.chapters.some((c) => c.number === selectedChapterNum),
              )?.title || activeStory.arcs[activeStory.arcs.length - 1].title
            }
            currentPowerStage={activeStory.memory.currentPowerStage}
            onGenerateChapter={handleGenerateChapter}
            isGenerating={isGenerating}
            selectedChapterNum={selectedChapterNum}
            setSelectedChapterNum={setSelectedChapterNum}
            onToggleRead={handleToggleRead}
            onSwitchTab={(tab) => {
              if (tab === "codex") setIsCodexSheetOpen(true);
            }}
            activeStory={activeStory}
            onUpdateStory={handleUpdateStoryDirect}
            handleAlterFate={handleAlterFate}
            handleSealChapter={handleSealChapter}
            handleCheckConsistency={handleCheckConsistency}
          />

          {activeStory.arcs[activeStory.arcs.length - 1].isCompleted && (
            <div className="mt-4 max-w-4xl mx-auto p-4 bg-neutral-950 border border-neutral-900 rounded flex justify-between items-center text-xs">
              <span className="text-neutral-400 font-sans">
                All chapters of this arc generated! Steer next segment.
              </span>
              <button
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.currentTarget.click();
                  }
                }}
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
