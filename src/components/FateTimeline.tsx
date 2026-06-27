import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, GitBranch, Play, Star } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { StoryWorld } from '../types';
import { useStories } from '../hooks/useStoryQueries';

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

export const FateTimeline: React.FC<FateTimelineProps> = ({ isOpen, onClose, activeStoryId }) => {
  const { setActiveStoryId, setCurrentScreen } = useAppStore();
  const { data: stories = [] } = useStories();

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
      
      const children = (childrenMap.get(s.id) || []).sort((a,b) => (a.forkChapterNumber || 0) - (b.forkChapterNumber || 0));
      
      const childNum = 0;
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

    return { tree, flatNodes, maxChapter };
  }, [activeStoryId, stories]);

  if (!isOpen || !familyData) return null;

  const { flatNodes, maxChapter } = familyData;

  const rowHeight = 36;
  const colWidth = 240; // wide enough to show titles side by side
  const paddingX = 40;
  const paddingY = 80;
  
  const height = maxChapter * rowHeight + paddingY * 2;
  const width = flatNodes.length * colWidth + paddingX * 2;

  const renderNodePaths = () => {
    return flatNodes.map(node => {
      if (!node.story.parentStoryId) return null;
      
      const parent = flatNodes.find(n => n.story.id === node.story.parentStoryId);
      if (!parent || !node.forkChNum) return null;

      const startX = paddingX + parent.x * colWidth + colWidth / 2;
      const startY = paddingY + node.forkChNum * rowHeight - rowHeight/2;
      
      const endX = paddingX + node.x * colWidth + colWidth / 2;
      const endY = paddingY + (node.forkChNum + 1) * rowHeight - rowHeight/2;

      // Draw SVG smooth curve
      const controlY = startY + (endY - startY) / 2;
      const pathData = `M ${startX} ${startY} C ${startX} ${controlY}, ${endX} ${controlY}, ${endX} ${endY}`;
      
      return (
        <path 
          key={`path-${node.story.id}`} 
          d={pathData} 
          fill="none" 
          stroke="rgba(4, 172, 255, 0.4)" 
          strokeWidth="3" 
          strokeDasharray="4 4"
        />
      );
    });
  };

  const getStoryChapterCount = (s: StoryWorld) => s.arcs.reduce((sum, a) => sum + a.chapters.length, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="fate-timeline-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6"
        >
          <div
            className="absolute inset-0 bg-neutral-950/90 backdrop-blur-sm"
            onClick={onClose} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); } }}
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl w-full h-[90vh] flex flex-col overflow-hidden"
          >
          <div className="flex items-center justify-between p-4 border-b border-neutral-900 bg-void">
            <div className="flex items-center space-x-3">
              <GitBranch className="text-portal" />
              <h2 className="title-sc text-lg text-signal tracking-widest">Fate Branch Timeline</h2>
            </div>
            <button
               tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={onClose}
              aria-label="Close timeline"
              className="text-neutral-500 hover:text-signal transition-colors p-2"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-auto relative custom-scrollbar bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:4rem_4rem]">
            
            <div style={{ width, height, position: 'relative' }}>
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                {renderNodePaths()}
                {flatNodes.map(node => {
                  const x = paddingX + node.x * colWidth + colWidth / 2;
                  const totalCh = getStoryChapterCount(node.story);
                  // Starting point (if fork, starts at step after fork, else 1)
                  const startCh = node.forkChNum ? node.forkChNum : 1;
                  const startY = paddingY + startCh * rowHeight - rowHeight/2;
                  const endY = paddingY + totalCh * rowHeight - rowHeight/2;
                  
                  return (
                    <line 
                      key={`line-${node.story.id}`}
                      x1={x} y1={startY} x2={x} y2={endY}
                      stroke={node.story.id === activeStoryId ? "rgba(4, 172, 255, 0.8)" : "rgba(100, 100, 100, 0.3)"}
                      strokeWidth="4"
                    />
                  );
                })}
              </svg>

              {/* Render branches, titles, points */}
              {flatNodes.map(node => {
                const isCurrent = node.story.id === activeStoryId;
                const topY = paddingY + (node.forkChNum || 1) * rowHeight - rowHeight;
                const leftX = paddingX + node.x * colWidth;
                
                const totalCh = getStoryChapterCount(node.story);
                
                // create dots
                const dots = [];
                for(let c = (node.forkChNum || 0) + 1; c <= totalCh; c++) {
                  dots.push(
                    <div 
                      key={c}
                      className={`w-3 h-3 rounded-full border-2 absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all ${isCurrent ? 'bg-portal border-neutral-900 shadow-[0_0_8px_rgba(4,172,255,0.8)] z-10 hover:w-4 hover:h-4' : 'bg-neutral-800 border-neutral-950 hover:bg-neutral-500'}`}
                      style={{ 
                        left: colWidth / 2, 
                        top: (c - (node.forkChNum || 1)) * rowHeight + rowHeight/2 
                      }}
                      title={`Chapter ${c}`}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setActiveStoryId(node.story.id);
                          onClose();
                          setCurrentScreen('reader');
                        }
                      }}
                      aria-label={`Jump to Chapter ${c} of ${node.story.title}`}
                      onClick={() => {
                        setActiveStoryId(node.story.id);
                        onClose();
                        setCurrentScreen('reader');
                      }}
                    />
                  );
                }

                return (
                  <div 
                    key={node.story.id}
                    className="absolute"
                    style={{ left: leftX, top: topY - 50, width: colWidth }}
                  >
                    <div className="flex flex-col items-center justify-center p-2">
                       <button
                          tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                           setActiveStoryId(node.story.id);
                           onClose();
                           setCurrentScreen('reader');
                         }}
                         className={`text-xs font-mono max-w-full truncate px-3 py-1 rounded border transition-all ${isCurrent ? 'bg-portal/20 text-portal border-portal-500/50 shadow-[0_0_10px_rgba(4,172,255,0.2)]' : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-600 hover:text-signal'}`}
                         title={node.story.title}
                       >
                         {node.story.title} {isCurrent && <Star size={10} className="inline ml-1 mb-0.5"/>}
                       </button>
                    </div>

                    <div className="relative mt-[10px]" style={{ height: totalCh * rowHeight }}>
                      {dots}
                    </div>
                  </div>
                );
              })}
            </div>
            
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};
