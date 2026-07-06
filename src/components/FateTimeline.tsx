import React, { useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, GitBranch, Star, Search, ChevronRight, Compass, Play, ListTree } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { StoryWorld } from '../types';

interface FateTimelineProps {
  isOpen: boolean;
  onClose: () => void;
  activeStoryId: string;
}

interface TreeStory {
  story: StoryWorld;
  x: number; // column index
  children: TreeStory[];
  forkChNum?: number; // chapter from parent where it forked
}

// Premium branch color language shared with the Living Codex.
type BranchKey = 'blue' | 'purple' | 'red' | 'gold' | 'gray';

const BRANCH_STYLES: Record<BranchKey, { hex: string; text: string; glow: string; label: string }> = {
  blue: { hex: '#04ACFF', text: 'text-portal', glow: 'fate-glow-blue', label: 'Main Timeline' },
  purple: { hex: '#a855f7', text: 'text-purple-400', glow: 'fate-glow-purple', label: 'Fate Fork' },
  red: { hex: '#ff3333', text: 'text-human', glow: 'fate-glow-red', label: 'Chaotic Branch' },
  gold: { hex: '#eab308', text: 'text-amber-400', glow: 'fate-glow-gold', label: 'Diverged Path' },
  gray: { hex: '#6b7280', text: 'text-neutral-400', glow: '', label: 'Unexplored' }
};

// Fork nodes cycle through this palette in the order they appear.
const FORK_ORDER: BranchKey[] = ['purple', 'red', 'gold', 'gray'];

export const FateTimeline: React.FC<FateTimelineProps> = ({ isOpen, onClose, activeStoryId }) => {
  const stories = useAppStore(state => state.stories);
  const setActiveStoryId = useAppStore(state => state.setActiveStoryId);
  const setCurrentScreen = useAppStore(state => state.setCurrentScreen);

  // UI-only local state (no persistent/global state introduced).
  const [pickerOpen, setPickerOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'main' | 'branches'>('all');
  const [query, setQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const familyData = useMemo(() => {
    if (!activeStoryId) return null;

    // 1. Find all stories
    const storyMap = new Map<string, StoryWorld>();
    stories.forEach(s => storyMap.set(s.id, s));

    const currentStory = storyMap.get(activeStoryId);
    if (!currentStory) return null;

    // 2. Find root
    let root = currentStory;
    let fallbackCounter = 0;
    while (root.parentStoryId && storyMap.has(root.parentStoryId) && fallbackCounter < 100) {
      root = storyMap.get(root.parentStoryId)!;
      fallbackCounter++;
    }

    // 3. Collect all stories that belong to this family (descendants of root)
    // Actually we can just build a tree from root
    const childrenMap = new Map<string, StoryWorld[]>();
    stories.forEach(s => {
      if (s.parentStoryId) {
        const arr = childrenMap.get(s.parentStoryId) || [];
        arr.push(s);
        childrenMap.set(s.parentStoryId, arr);
      }
    });

    // We only care about stories reachable from root
    let nextX = 0;
    const buildNode = (s: StoryWorld, currentX: number, forkChNum?: number): TreeStory => {
      const nodeX = currentX;
      nextX = Math.max(nextX, currentX + 1); // increment for siblings?

      const children = (childrenMap.get(s.id) || []).sort((a, b) => (a.forkChapterNumber || 0) - (b.forkChapterNumber || 0));

      const childNodes = children.map(child => {
        const cx = nextX;
        nextX++;
        return buildNode(child, cx, child.forkChapterNumber);
      });

      return {
        story: s,
        x: nodeX,
        children: childNodes,
        forkChNum
      };
    };

    const tree = buildNode(root, 0);

    // Flat list of all nodes with x coordinates
    const flatNodes: TreeStory[] = [];
    const traverse = (n: TreeStory) => {
      flatNodes.push(n);
      n.children.forEach(traverse);
    };
    traverse(tree);

    // Max chapter calculation
    let maxChapter = 0;
    flatNodes.forEach(n => {
      const chCount = n.story.arcs.reduce((sum, arc) => sum + arc.chapters.length, 0);
      if (chCount > maxChapter) maxChapter = chCount;
    });

    // Ancestor chain of the active story == the "main / active path"
    const activePathIds = new Set<string>();
    let cursor: StoryWorld | undefined = currentStory;
    let guard = 0;
    while (cursor && guard < 100) {
      activePathIds.add(cursor.id);
      cursor = cursor.parentStoryId ? storyMap.get(cursor.parentStoryId) : undefined;
      guard++;
    }

    // Resolve a branch color key per node from available data (no schema fields required).
    const forkNodes = flatNodes.filter(n => !!n.story.parentStoryId);
    const branchKeyMap = new Map<string, BranchKey>();
    flatNodes.forEach(n => {
      if (!n.story.parentStoryId) {
        branchKeyMap.set(n.story.id, 'blue');
      } else {
        const idx = forkNodes.findIndex(fn => fn.story.id === n.story.id);
        branchKeyMap.set(n.story.id, FORK_ORDER[idx % FORK_ORDER.length]);
      }
    });

    // Flattened chapter list for the picker — memoized here so typing in the
    // search box (query state) does not re-flatten every node/arc/chapter.
    const flatChapters = flatNodes.flatMap(node => {
      const chapters = node.story.arcs.flatMap(a => a.chapters);
      const total = chapters.length;
      const start = (node.forkChNum || 0) + 1;
      const branchKey = branchKeyMap.get(node.story.id) || 'blue';
      const isMain = activePathIds.has(node.story.id);
      const isCurrentStory = node.story.id === activeStoryId;
      const rows = [];
      for (let c = start; c <= total; c++) {
        const ch = chapters[c - 1];
        rows.push({
          key: `${node.story.id}-${c}`,
          storyId: node.story.id,
          storyTitle: node.story.title,
          chapterNumber: ch?.number ?? c,
          chapterTitle: ch?.title || `Chapter ${c}`,
          branchKey,
          isMain,
          isCurrentStory
        });
      }
      return rows;
    });

    return { tree, flatNodes, maxChapter, activePathIds, rootTitle: root.title, branchKeyMap, forkNodes, flatChapters };
  }, [activeStoryId, stories]);

  // Center the scroll view on the active story column when the modal opens.
  useEffect(() => {
    if (!isOpen || !familyData) return;
    const el = scrollRef.current;
    if (!el) return;
    const activeNode = familyData.flatNodes.find(n => n.story.id === activeStoryId);
    if (!activeNode) return;
    const colWidth = 240;
    const paddingX = 40;
    const centerX = paddingX + activeNode.x * colWidth + colWidth / 2;
    // Defer to next frame so layout is measured.
    const raf = requestAnimationFrame(() => {
      el.scrollTo({ left: Math.max(0, centerX - el.clientWidth / 2), behavior: 'auto' });
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen, familyData, activeStoryId]);

  if (!isOpen || !familyData) return null;

  const { flatNodes, maxChapter, activePathIds, rootTitle, branchKeyMap, forkNodes, flatChapters } = familyData;

  const rowHeight = 36;
  const colWidth = 240; // wide enough to show titles side by side
  const paddingX = 40;
  const paddingY = 80;

  const height = maxChapter * rowHeight + paddingY * 2;
  const width = flatNodes.length * colWidth + paddingX * 2;

  const getStoryChapterCount = (s: StoryWorld) => s.arcs.reduce((sum, a) => sum + a.chapters.length, 0);

  const branchKeyOf = (node: TreeStory): BranchKey => branchKeyMap.get(node.story.id) || 'blue';

  const forkCount = forkNodes.length;
  const activeChapters = flatNodes.find(n => n.story.id === activeStoryId);
  const activeChapterCount = activeChapters ? getStoryChapterCount(activeChapters.story) : 0;

  const goToStory = (storyId: string) => {
    setActiveStoryId(storyId);
    onClose();
    setCurrentScreen('reader');
  };

  const renderNodePaths = () => {
    return flatNodes.map(node => {
      if (!node.story.parentStoryId) return null;

      const parent = flatNodes.find(n => n.story.id === node.story.parentStoryId);
      if (!parent || !node.forkChNum) return null;

      const startX = paddingX + parent.x * colWidth + colWidth / 2;
      const startY = paddingY + node.forkChNum * rowHeight - rowHeight / 2;

      const endX = paddingX + node.x * colWidth + colWidth / 2;
      const endY = paddingY + (node.forkChNum + 1) * rowHeight - rowHeight / 2;

      // Draw SVG smooth curve
      const controlY = startY + (endY - startY) / 2;
      const pathData = `M ${startX} ${startY} C ${startX} ${controlY}, ${endX} ${controlY}, ${endX} ${endY}`;

      const style = BRANCH_STYLES[branchKeyOf(node)];
      const onActivePath = activePathIds.has(node.story.id);

      return (
        <path
          key={`path-${node.story.id}`}
          d={pathData}
          fill="none"
          stroke={style.hex}
          strokeWidth={onActivePath ? 3.5 : 2.5}
          strokeDasharray="5 5"
          strokeLinecap="round"
          opacity={onActivePath ? 0.95 : 0.5}
          filter="url(#fate-edge-glow)"
        />
      );
    });
  };

  const normalizedQuery = query.trim().toLowerCase();
  const filteredChapters = flatChapters.filter(row => {
    if (filter === 'main' && !row.isMain) return false;
    if (filter === 'branches' && row.isMain) return false;
    if (!normalizedQuery) return true;
    return (
      row.chapterTitle.toLowerCase().includes(normalizedQuery) ||
      row.storyTitle.toLowerCase().includes(normalizedQuery) ||
      `chapter ${row.chapterNumber}`.includes(normalizedQuery) ||
      String(row.chapterNumber) === normalizedQuery
    );
  });

  // Labels mirror BRANCH_STYLES exactly; the active path is conveyed by glow/emphasis, not a color.
  const legend: { key: BranchKey; label: string }[] = [
    { key: 'blue', label: 'Main Timeline' },
    { key: 'purple', label: 'Fate Fork' },
    { key: 'red', label: 'Chaotic Branch' },
    { key: 'gold', label: 'Diverged Path' },
    { key: 'gray', label: 'Unexplored' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="fate-timeline-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-1.5 sm:p-6"
        >
          <div
            className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            onClick={onClose} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); } }}
          />

          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            className="fate-timeline-shell relative rounded-2xl w-full h-[92vh] sm:h-[90vh] flex flex-col overflow-hidden"
          >
            {/* Portal aura line */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-portal to-transparent opacity-80 pointer-events-none"></div>

            {/* HEADER */}
            <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4 border-b border-portal/15 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg border border-portal/30 bg-portal/5 flex items-center justify-center flex-shrink-0 shadow-[0_0_14px_rgba(4,172,255,0.2)]">
                  <GitBranch size={18} className="text-portal" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-display font-medium text-lg sm:text-xl text-signal tracking-wide fate-glow-blue leading-tight">Fate Branch Timeline</h2>
                  <p className="hidden sm:block text-[10px] text-neutral-500 font-sans tracking-tight mt-0.5">Choose a chapter, return to a path, or inspect a forked fate.</p>
                </div>
              </div>
              <button
                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={onClose}
                aria-label="Close timeline"
                className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-white/10 bg-black/50 text-neutral-400 hover:text-signal hover:border-portal/40 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* OVERVIEW / CONTROL CARD */}
            <div className="px-3 sm:px-5 pt-3 flex-shrink-0">
              <div className="rounded-xl border border-portal/30 bg-black/60 shadow-[0_0_20px_rgba(4,172,255,0.08)] p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0">
                    <span className="text-[9px] text-portal/80 uppercase font-bold tracking-[0.25em] font-sc">Destiny Family</span>
                    <h3 className="font-display text-base sm:text-lg text-signal tracking-wide truncate max-w-[60vw] sm:max-w-none">{rootTitle}</h3>
                  </div>
                  <div className="flex items-center gap-4 sm:gap-5">
                    <div className="text-center">
                      <span className="block text-[8.5px] text-neutral-500 uppercase tracking-[0.2em] font-sc">Chapters</span>
                      <span className="text-signal font-display text-lg leading-none">{activeChapterCount}<span className="text-neutral-600 text-xs">/{maxChapter}</span></span>
                    </div>
                    {forkCount > 0 && (
                      <div className="text-center">
                        <span className="block text-[8.5px] text-neutral-500 uppercase tracking-[0.2em] font-sc">Forks</span>
                        <span className="text-purple-400 font-display text-lg leading-none fate-glow-purple">{forkCount}</span>
                      </div>
                    )}
                    <button
                       tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setPickerOpen(o => !o)}
                      className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-sc uppercase tracking-widest border transition-all ${pickerOpen ? 'bg-portal/15 border-portal/50 text-portal' : 'bg-black/50 border-white/10 text-neutral-400 hover:text-portal hover:border-portal/40'}`}
                    >
                      <ListTree size={12} />
                      <span>Jump to Chapter</span>
                    </button>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3 pt-2.5 border-t border-white/5">
                  {legend.map(({ key, label }) => (
                    <span key={key} className="flex items-center gap-1.5 text-[8.5px] sm:text-[9px] font-sc uppercase tracking-widest text-neutral-500">
                      <span className="w-2 h-2 rounded-full border" style={{ borderColor: BRANCH_STYLES[key].hex, boxShadow: `0 0 6px ${BRANCH_STYLES[key].hex}66` }}></span>
                      <span>{label}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* GRAPH CANVAS */}
            <div className="relative flex-1 min-h-0 mt-3 fate-scroll-mask">
              {/* Mobile swipe hint */}
              <div className="sm:hidden absolute top-1 left-1/2 -translate-x-1/2 z-20 text-[8.5px] font-sc uppercase tracking-[0.25em] text-neutral-600 pointer-events-none">
                Swipe to explore branches
              </div>

              <div
                ref={scrollRef}
                className="h-full overflow-auto relative custom-scrollbar fate-grid-bg"
              >
                <div style={{ width, height, position: 'relative' }}>
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    <defs>
                      <filter id="fate-edge-glow" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="2.2" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>
                    {renderNodePaths()}
                    {flatNodes.map(node => {
                      const x = paddingX + node.x * colWidth + colWidth / 2;
                      const totalCh = getStoryChapterCount(node.story);
                      // Starting point (if fork, starts at step after fork, else 1)
                      const startCh = node.forkChNum ? node.forkChNum : 1;
                      const startY = paddingY + startCh * rowHeight - rowHeight / 2;
                      const endY = paddingY + totalCh * rowHeight - rowHeight / 2;

                      const style = BRANCH_STYLES[branchKeyOf(node)];
                      const isCurrent = node.story.id === activeStoryId;
                      const onActivePath = activePathIds.has(node.story.id);
                      const lineOpacity = isCurrent ? 1 : onActivePath ? 0.8 : 0.35;

                      return (
                        <line
                          key={`line-${node.story.id}`}
                          x1={x} y1={startY} x2={x} y2={endY}
                          stroke={style.hex}
                          strokeWidth={isCurrent ? 4 : 3}
                          strokeLinecap="round"
                          opacity={lineOpacity}
                          filter={isCurrent ? 'url(#fate-edge-glow)' : undefined}
                        />
                      );
                    })}
                  </svg>

                  {/* Render branches, titles, points */}
                  {flatNodes.map(node => {
                    const isCurrent = node.story.id === activeStoryId;
                    const onActivePath = activePathIds.has(node.story.id);
                    const topY = paddingY + (node.forkChNum || 1) * rowHeight - rowHeight;
                    const leftX = paddingX + node.x * colWidth;
                    const style = BRANCH_STYLES[branchKeyOf(node)];
                    const isRoot = !node.story.parentStoryId;

                    const totalCh = getStoryChapterCount(node.story);

                    // Badge label per node type
                    const badge = isCurrent ? 'CURRENT' : isRoot ? 'MAIN TIMELINE' : BRANCH_STYLES[branchKeyOf(node)].label.toUpperCase();

                    // create dots
                    const dots = [];
                    for (let c = (node.forkChNum || 0) + 1; c <= totalCh; c++) {
                      const dotTop = (c - (node.forkChNum || 1)) * rowHeight + rowHeight / 2;
                      dots.push(
                        <button
                          key={c}
                          type="button"
                          className="fate-node-button absolute -translate-x-1/2 -translate-y-1/2 w-9 h-9 z-10"
                          style={{ left: colWidth / 2, top: dotTop }}
                          title={`Chapter ${c}`}
                          aria-label={`Jump to Chapter ${c} of ${node.story.title}`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              goToStory(node.story.id);
                            }
                          }}
                          onClick={() => goToStory(node.story.id)}
                        >
                          <span
                            className="block rounded-full transition-all"
                            style={{
                              width: isCurrent ? 13 : 10,
                              height: isCurrent ? 13 : 10,
                              background: onActivePath ? style.hex : '#1c1c1c',
                              border: `2px solid ${onActivePath ? '#000' : '#0a0a0a'}`,
                              boxShadow: isCurrent
                                ? `0 0 10px ${style.hex}, 0 0 4px ${style.hex}`
                                : onActivePath
                                  ? `0 0 6px ${style.hex}88`
                                  : 'none'
                            }}
                          />
                          {/* Chapter number alongside the active path only, to avoid clutter */}
                          {onActivePath && (
                            <span className="absolute left-[18px] top-1/2 -translate-y-1/2 text-[9px] font-sc text-neutral-500 tabular-nums pointer-events-none">
                              {c}
                            </span>
                          )}
                        </button>
                      );
                    }

                    return (
                      <div
                        key={node.story.id}
                        className="absolute"
                        style={{ left: leftX, top: topY - 58, width: colWidth }}
                      >
                        <div className="flex flex-col items-center justify-center px-2">
                          <button
                             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => goToStory(node.story.id)}
                            className={`group w-full max-w-[210px] rounded-xl border px-3 py-2 text-left transition-all ${
                              isCurrent
                                ? 'bg-portal/15 border-portal/60 shadow-[0_0_18px_rgba(4,172,255,0.25)]'
                                : onActivePath
                                  ? 'bg-black/70 border-white/15 hover:border-portal/40'
                                  : 'bg-black/50 border-white/8 opacity-70 hover:opacity-100 hover:border-white/20'
                            }`}
                            title={node.story.title}
                          >
                            <span
                              className={`text-[8px] font-sc font-bold uppercase tracking-[0.2em] ${isCurrent ? 'text-portal' : style.text} ${isCurrent ? style.glow : ''}`}
                            >
                              {badge}
                            </span>
                            <span className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-display text-sm text-signal truncate">{node.story.title}</span>
                              {isCurrent && <Star size={11} className="text-portal flex-shrink-0" />}
                            </span>
                            <span className="flex items-center gap-2 mt-1 text-[9px] font-sc uppercase tracking-wider text-neutral-500">
                              <span>{getStoryChapterCount(node.story)} Ch</span>
                              {node.forkChNum && (
                                <span className="flex items-center gap-1">
                                  <span className="text-neutral-700">•</span>
                                  <span>Forked at Ch {node.forkChNum}</span>
                                </span>
                              )}
                            </span>
                          </button>
                        </div>

                        <div className="relative mt-[14px]" style={{ height: totalCh * rowHeight }}>
                          {dots}

                          {/* Premium Continue node at the tail of the active story path */}
                          {isCurrent && (
                            <button
                              type="button"
                              tabIndex={0}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToStory(node.story.id); } }}
                              onClick={() => goToStory(node.story.id)}
                              className="absolute -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-portal/15 border border-portal/50 text-portal text-[10px] font-sc uppercase tracking-widest shadow-[0_0_16px_rgba(4,172,255,0.25)] hover:bg-portal hover:text-void transition-all whitespace-nowrap"
                              style={{ left: colWidth / 2, top: (totalCh - (node.forkChNum || 0)) * rowHeight + rowHeight / 2 }}
                              aria-label={`Continue reading ${node.story.title}`}
                            >
                              <Play size={11} />
                              <span>Continue…</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* JUMP TO CHAPTER PICKER (collapsible) */}
            <div className="flex-shrink-0">
              {/* Mobile toggle bar */}
              <button
                type="button"
                onClick={() => setPickerOpen(o => !o)}
                className="sm:hidden w-full flex items-center justify-center gap-2 py-2.5 border-t border-portal/20 bg-black/60 text-[10px] font-sc uppercase tracking-widest text-portal"
                aria-expanded={pickerOpen}
              >
                <ListTree size={12} />
                <span>{pickerOpen ? 'Hide Chapter Picker' : 'Jump to Chapter'}</span>
                <ChevronRight size={12} className={`transition-transform ${pickerOpen ? '-rotate-90' : 'rotate-90'}`} />
              </button>

              <AnimatePresence initial={false}>
                {pickerOpen && (
                  <motion.div
                    key="fate-picker"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="fate-panel overflow-hidden"
                  >
                    <div className="p-3 sm:p-4 max-h-[40vh] flex flex-col">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-sc uppercase tracking-widest text-portal">
                          <Compass size={12} />
                          <span>Jump to Chapter</span>
                        </span>
                        {/* Filter chips */}
                        <div className="flex items-center gap-1.5">
                          {(['all', 'main', 'branches'] as const).map(f => (
                            <button
                              key={f}
                              type="button"
                              onClick={() => setFilter(f)}
                              className={`px-2.5 py-1 rounded-full text-[9px] font-sc uppercase tracking-widest border transition-all ${filter === f ? 'bg-portal/15 border-portal/50 text-portal' : 'bg-black/50 border-white/10 text-neutral-500 hover:text-neutral-300'}`}
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                        {/* Search */}
                        <div className="relative flex-1 min-w-[140px]">
                          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-600 pointer-events-none" />
                          <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search chapters…"
                            aria-label="Search chapters"
                            className="w-full bg-black/60 border border-white/10 focus:border-portal/40 rounded-lg pl-8 pr-2 py-1.5 text-xs text-signal placeholder:text-neutral-600 focus:outline-none font-sans"
                          />
                        </div>
                      </div>

                      <div className="overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                        {filteredChapters.length === 0 ? (
                          <div className="text-center py-8 text-neutral-600 font-serif italic text-xs">
                            No chapters match this filter.
                          </div>
                        ) : (
                          filteredChapters.map(row => {
                            const style = BRANCH_STYLES[row.branchKey];
                            return (
                              <button
                                key={row.key}
                                type="button"
                                onClick={() => goToStory(row.storyId)}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-black/50 border border-white/8 hover:border-portal/40 hover:bg-black/70 transition-all text-left group"
                              >
                                <span
                                  className="w-1.5 h-8 rounded-full flex-shrink-0"
                                  style={{ background: style.hex, boxShadow: `0 0 6px ${style.hex}66` }}
                                ></span>
                                <span className="flex-shrink-0 w-9 text-center font-display text-sm text-neutral-400 tabular-nums">{row.chapterNumber}</span>
                                <span className="min-w-0 flex-1">
                                  <span className="block text-sm font-serif text-signal truncate">{row.chapterTitle}</span>
                                  <span className={`block text-[9px] font-sc uppercase tracking-widest ${style.text} truncate`}>
                                    {row.isCurrentStory ? 'Current • ' : ''}{row.storyTitle}
                                  </span>
                                </span>
                                <ChevronRight size={14} className="text-neutral-700 group-hover:text-portal transition-colors flex-shrink-0" />
                              </button>
                            );
                          })
                        )}
                      </div>

                      <p className="text-[8.5px] text-neutral-600 font-sans text-center mt-2 pt-2 border-t border-white/5">
                        Tap a node to continue from that path.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
