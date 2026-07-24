import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import FocusLock from 'react-focus-lock';
import { useAppStore } from '../store/useAppStore';
import { 
  AlertTriangle, 
  Database, 
  Cloud, 
  GitMerge, 
  Calendar, 
  BookOpen, 
  Users, 
  Flag, 
  ShieldAlert, 
  Check, 
  ArrowRight,
  Info
} from 'lucide-react';
import { vibrate } from '../lib/vibration';

export const SyncConflictModal: React.FC = () => {
  const activeConflict = useAppStore(state => state.activeConflict);
  const resolveConflict = useAppStore(state => state.resolveConflict);
  const [isResolving, setIsResolving] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState<'local' | 'cloud' | 'merge' | null>(null);

  if (!activeConflict) return null;

  const { localStory, cloudStory, chapterConflict } = activeConflict;

  const localTime = new Date(
    chapterConflict?.localContent.updatedAt || localStory.updatedAt || 0,
  ).getTime();
  const cloudTime = new Date(
    chapterConflict?.cloudContent.updatedAt || cloudStory.updatedAt || 0,
  ).getTime();
  
  const isLocalNewer = localTime > cloudTime;
  const isCloudNewer = cloudTime > localTime;

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'N/A';
    try {
      return new Date(isoStr).toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return 'N/A';
    }
  };

  const getChaptersCount = (story: any) => {
    let count = 0;
    if (story.arcs) {
      story.arcs.forEach((arc: any) => {
        if (arc.chapters) count += arc.chapters.length;
      });
    }
    return count;
  };

  const getHasContentCount = (story: any) => {
    let count = 0;
    if (story.arcs) {
      story.arcs.forEach((arc: any) => {
        if (arc.chapters) {
          arc.chapters.forEach((ch: any) => {
            if (ch.hasContent || ch.generatedContent) count++;
          });
        }
      });
    }
    return count;
  };

  const handleResolution = async (type: 'local' | 'cloud' | 'merge') => {
    setSelectedResolution(type);
    setIsResolving(true);
    vibrate('success');
    try {
      await resolveConflict(type);
    } catch (e) {
      console.error(e);
    } finally {
      setIsResolving(false);
      setSelectedResolution(null);
    }
  };

  return (
    <AnimatePresence>
      <FocusLock>
        <motion.div
          key="sync-conflict-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto"
          role="presentation"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative bg-neutral-950 border border-neutral-900 rounded-2xl shadow-2xl max-w-3xl w-full p-5 md:p-7 overflow-hidden my-8"
            role="dialog"
            aria-labelledby="sync-conflict-title"
          >
            {/* Top cosmic visual light bar */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-portal via-human to-gold-accent opacity-75"></div>

            {/* Header */}
            <div className="flex items-start gap-3.5 mb-6">
              <div className="p-3 bg-amber-950/40 border border-amber-900/40 text-amber-500 rounded-xl animate-pulse">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h2 id="sync-conflict-title" className="text-xl md:text-2xl font-display font-bold text-signal tracking-wide">
                  Aetheric Sync Divergence
                </h2>
                <p className="text-xs text-neutral-500 font-mono uppercase tracking-widest mt-1">
                  {chapterConflict
                    ? `Chapter ${chapterConflict.chapterNumber} differs across devices`
                    : 'Local and Cloud data differ significantly'}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-neutral-900/40 border border-neutral-900 rounded-xl flex items-start gap-2.5 mb-6 text-xs text-neutral-400 font-sans">
              <Info size={16} className="text-portal mt-0.5 flex-shrink-0" />
              <div>
                {chapterConflict
                  ? 'This chapter was edited independently on two devices. Choose which complete prose version to keep; neither copy will be overwritten until you decide.'
                  : 'We detected that this story has been modified independently on both your local device and the cloud. Please choose which timeline to keep, or merge their creative assets seamlessly.'}
              </div>
            </div>

            {/* Side-by-Side Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-7">
              {/* Local Version Card */}
              <div className={`relative border rounded-xl p-5 bg-neutral-900/20 transition-all ${
                isLocalNewer ? 'border-portal/40 ring-1 ring-portal/20' : 'border-neutral-900'
              }`}>
                {isLocalNewer && (
                  <span className="absolute top-4 right-4 text-[9px] font-mono font-bold bg-portal/10 text-portal px-2 py-0.5 rounded border border-portal/20 uppercase tracking-widest">
                    Newer Timeline
                  </span>
                )}
                <div className="flex items-center gap-2.5 mb-4">
                  <Database size={18} className="text-portal" />
                  <span className="font-sc font-bold text-[11px] uppercase tracking-wider text-portal">
                    Local Device Data
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-[10px] text-neutral-500 uppercase tracking-wider font-mono">Title</h4>
                    <p className="text-sm font-semibold text-neutral-200 mt-0.5 truncate">{localStory.title}</p>
                  </div>

                  <div>
                    <h4 className="text-[10px] text-neutral-500 uppercase tracking-wider font-mono">Main Character</h4>
                    <p className="text-xs text-neutral-300 mt-0.5">{localStory.mcName}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-neutral-900/60 text-center">
                    <div>
                      <span className="text-[9px] text-neutral-500 block font-mono">Chapter Progress</span>
                      <span className="text-xs font-bold text-neutral-300 flex items-center justify-center gap-1 mt-0.5">
                        <BookOpen size={11} className="text-neutral-500" /> {localStory.currentChapterNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-neutral-500 block font-mono">With Content</span>
                      <span className="text-xs font-bold text-neutral-300 flex items-center justify-center gap-1 mt-0.5">
                        <Check size={11} className="text-emerald-500" /> {getHasContentCount(localStory)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-neutral-500 block font-mono">Codex Characters</span>
                      <span className="text-xs font-bold text-neutral-300 flex items-center justify-center gap-1 mt-0.5">
                        <Users size={11} className="text-neutral-500" /> {localStory.memory?.characters?.length || 0}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] text-neutral-500 uppercase tracking-wider font-mono flex items-center gap-1">
                      <Calendar size={10} /> Last Modified
                    </h4>
                    <p className="text-xs text-neutral-400 mt-0.5 font-mono">
                      {formatDate(chapterConflict?.localContent.updatedAt || localStory.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cloud Version Card */}
              <div className={`relative border rounded-xl p-5 bg-neutral-900/20 transition-all ${
                isCloudNewer ? 'border-human/40 ring-1 ring-human/20' : 'border-neutral-900'
              }`}>
                {isCloudNewer && (
                  <span className="absolute top-4 right-4 text-[9px] font-mono font-bold bg-human/10 text-human px-2 py-0.5 rounded border border-human/20 uppercase tracking-widest">
                    Newer Timeline
                  </span>
                )}
                <div className="flex items-center gap-2.5 mb-4">
                  <Cloud size={18} className="text-human" />
                  <span className="font-sc font-bold text-[11px] uppercase tracking-wider text-human">
                    PostgreSQL Library Data
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-[10px] text-neutral-500 uppercase tracking-wider font-mono">Title</h4>
                    <p className="text-sm font-semibold text-neutral-200 mt-0.5 truncate">{cloudStory.title}</p>
                  </div>

                  <div>
                    <h4 className="text-[10px] text-neutral-500 uppercase tracking-wider font-mono">Main Character</h4>
                    <p className="text-xs text-neutral-300 mt-0.5">{cloudStory.mcName}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-neutral-900/60 text-center">
                    <div>
                      <span className="text-[9px] text-neutral-500 block font-mono">Chapter Progress</span>
                      <span className="text-xs font-bold text-neutral-300 flex items-center justify-center gap-1 mt-0.5">
                        <BookOpen size={11} className="text-neutral-500" /> {cloudStory.currentChapterNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-neutral-500 block font-mono">With Content</span>
                      <span className="text-xs font-bold text-neutral-300 flex items-center justify-center gap-1 mt-0.5">
                        <Check size={11} className="text-emerald-500" /> {getHasContentCount(cloudStory)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-neutral-500 block font-mono">Codex Characters</span>
                      <span className="text-xs font-bold text-neutral-300 flex items-center justify-center gap-1 mt-0.5">
                        <Users size={11} className="text-neutral-500" /> {cloudStory.memory?.characters?.length || 0}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] text-neutral-500 uppercase tracking-wider font-mono flex items-center gap-1">
                      <Calendar size={10} /> Last Modified
                    </h4>
                    <p className="text-xs text-neutral-400 mt-0.5 font-mono">
                      {formatDate(chapterConflict?.cloudContent.updatedAt || cloudStory.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Resolution Options Container */}
            <div className="space-y-3.5">
              {/* Option 1: Local wins */}
              <button
                type="button"
                disabled={isResolving}
                onClick={() => handleResolution('local')}
                className="w-full text-left p-4 rounded-xl border border-neutral-900 bg-neutral-950 hover:bg-neutral-900/50 hover:border-portal/40 transition-all duration-300 group flex items-start gap-4 disabled:opacity-50"
              >
                <div className="p-2.5 bg-neutral-900 border border-neutral-800 text-portal rounded-lg group-hover:bg-portal group-hover:text-black transition-colors">
                  <Database size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-200 group-hover:text-portal transition-colors">
                      Keep Local Version
                    </span>
                    <ArrowRight size={14} className="text-neutral-600 group-hover:translate-x-1 group-hover:text-portal transition-all" />
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    {chapterConflict
                      ? 'Keeps this device’s complete chapter prose and safely publishes it to the cloud.'
                      : "Uploads this device's version and overwrites cloud storage. Best if you worked offline on this device."}
                  </p>
                </div>
              </button>

              {/* Option 2: Cloud wins */}
              <button
                type="button"
                disabled={isResolving}
                onClick={() => handleResolution('cloud')}
                className="w-full text-left p-4 rounded-xl border border-neutral-900 bg-neutral-950 hover:bg-neutral-900/50 hover:border-human/40 transition-all duration-300 group flex items-start gap-4 disabled:opacity-50"
              >
                <div className="p-2.5 bg-neutral-900 border border-neutral-800 text-human rounded-lg group-hover:bg-human group-hover:text-black transition-colors">
                  <Cloud size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-200 group-hover:text-human transition-colors">
                      Keep Cloud Version
                    </span>
                    <ArrowRight size={14} className="text-neutral-600 group-hover:translate-x-1 group-hover:text-human transition-all" />
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    {chapterConflict
                      ? 'Keeps the cloud chapter prose and replaces the conflicting local copy.'
                      : 'Downloads the cloud version and discards any un-synchronized local edits. Best if you wrote content on another device.'}
                  </p>
                </div>
              </button>

              {/* Complete chapter prose cannot be merged safely. */}
              {!chapterConflict && <button
                type="button"
                disabled={isResolving}
                onClick={() => handleResolution('merge')}
                className="w-full text-left p-4 rounded-xl border border-neutral-900/70 bg-[#070b12] border-blue-950/40 hover:bg-blue-950/20 hover:border-blue-500/40 transition-all duration-300 group flex items-start gap-4 disabled:opacity-50"
              >
                <div className="p-2.5 bg-blue-950/50 border border-blue-900/40 text-blue-400 rounded-lg group-hover:bg-blue-500 group-hover:text-black transition-colors">
                  <GitMerge size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-200 group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                      Smart Merge Timelines <span className="text-[9px] tracking-wider uppercase bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 font-mono">Recommended</span>
                    </span>
                    <ArrowRight size={14} className="text-neutral-600 group-hover:translate-x-1 group-hover:text-blue-400 transition-all" />
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Combines the list of characters, locations, factions, and assets. Integrates chapters chronologically and preserves the latest edits of conflicting chapters.
                  </p>
                </div>
              </button>}
            </div>

            {/* Inner progress state if resolving */}
            {isResolving && (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-50">
                <div className="w-8 h-8 border-2 border-portal border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-mono text-neutral-400 uppercase tracking-widest">
                  Aligning Timelines ({selectedResolution === 'merge' ? 'Merging' : 'Applying Choice'})...
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      </FocusLock>
    </AnimatePresence>
  );
};
