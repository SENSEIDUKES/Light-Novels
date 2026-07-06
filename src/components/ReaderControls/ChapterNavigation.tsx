import React from 'react';
import { ArrowLeft, ArrowRight, ListMusic, Zap } from 'lucide-react';
import { ChapterNavigationState, FateActions } from './types';

interface Props {
  navigation: ChapterNavigationState;
  actions: FateActions;
  isDesktop?: boolean;
}

export function ChapterNavigation({ navigation, actions, isDesktop = false }: Props) {
  const { selectedChapterNum, maxChapterNum, navigatePrev, navigateNext, onSwitchTab } = navigation;
  const { handleAlterFate, setIsAlterFateOpen } = actions;

  if (isDesktop) {
    return (
      <div className="flex items-center justify-end gap-4 w-full sm:w-auto mt-4 sm:mt-0">
        {/* Quick Access Lore Action Links */}
        <div className="flex items-center space-x-2 sm:space-x-4 bg-void border border-neutral-900 rounded-full px-2 py-1">
          <button onClick={navigatePrev}
            disabled={selectedChapterNum <= 1}
            className="px-2 sm:px-3 py-1.5 flex items-center space-x-1.5 text-neutral-400 hover:text-portal disabled:opacity-25 disabled:pointer-events-none transition-colors text-[9px] sm:text-[10px] font-sc uppercase tracking-wider font-semibold focus:outline-none"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Previous Chapter</span>
            <span className="sm:hidden">Prev</span>
          </button>
          <div className="w-[1px] h-4 bg-neutral-800"></div>
          <button onClick={() => onSwitchTab && onSwitchTab("codex")}
            className="px-2 sm:px-3 py-1.5 flex items-center space-x-1.5 text-neutral-400 hover:text-portal transition-colors text-[9px] sm:text-[10px] font-sc uppercase tracking-wider focus:outline-none"
          >
            <ListMusic size={14} />
            <span className="hidden sm:inline">Codex</span>
          </button>
          <div className="w-[1px] h-4 bg-neutral-800"></div>
          <button onClick={navigateNext}
            disabled={selectedChapterNum === maxChapterNum}
            className="px-2 sm:px-3 py-1.5 flex items-center space-x-1.5 text-neutral-400 hover:text-human disabled:opacity-25 disabled:pointer-events-none transition-colors text-[9px] sm:text-[10px] font-sc uppercase tracking-wider font-semibold focus:outline-none"
          >
            <span className="hidden sm:inline">Next Chapter</span>
            <span className="sm:hidden">Next</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {handleAlterFate && (
          <button onClick={() => setIsAlterFateOpen(true)}
            className="px-4 py-2 border border-portal text-portal font-sc font-bold uppercase tracking-wider text-[10px] rounded-full hover:bg-portal hover:text-void transition-colors flex items-center gap-2 shadow-[0_0_10px_rgba(4,172,255,0.15)] shrink-0 focus:outline-none"
          >
            <Zap size={14} />
            <span className="hidden sm:inline">Alter Fate (Branch)</span>
            <span className="sm:hidden">Alter Fate</span>
          </button>
        )}
      </div>
    );
  }

  // Mobile View
  return (
    <div className="flex items-center gap-1.5">
      {handleAlterFate && (
        <button
          onClick={() => setIsAlterFateOpen(true)}
          className="p-2 border border-portal/60 text-portal font-sc font-bold rounded-full hover:bg-portal hover:text-void transition-colors shadow-[0_0_10px_rgba(4,172,255,0.15)] shrink-0 focus:outline-none"
          title="Alter Fate (Branch)"
        >
          <Zap size={16} />
        </button>
      )}
      <div className="flex items-center bg-void border border-neutral-800 rounded-full shrink-0">
         <button onClick={navigatePrev} disabled={selectedChapterNum <= 1} className="p-2 text-neutral-400 disabled:opacity-20 hover:text-signal rounded-l-full focus:outline-none"> <ArrowLeft size={16}/> </button>
         <span className="text-[10px] font-mono text-neutral-400 select-none px-0.5">{selectedChapterNum}/{maxChapterNum}</span>
         <button onClick={navigateNext} disabled={selectedChapterNum === maxChapterNum} className="p-2 text-neutral-400 disabled:opacity-20 hover:text-signal rounded-r-full focus:outline-none"> <ArrowRight size={16}/> </button>
      </div>
    </div>
  );
}
