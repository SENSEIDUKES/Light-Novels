import React, { useRef, useEffect } from 'react';
import { StoryWorld } from '../types';
import { useAppStore } from '../store/useAppStore';

interface UseReaderScrollProps {
  activeStory: StoryWorld;
  selectedChapterNum: number;
  selectedChapter: any;
  onUpdateStory: (updatedStory: StoryWorld) => void;
}

export function useReaderScroll({
  activeStory,
  selectedChapterNum,
  selectedChapter,
  onUpdateStory
}: UseReaderScrollProps) {
  const readerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedScrollRef = useRef<number>(0);
  
  const handleViewportScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollTop = target.scrollTop;
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      if (Math.abs(scrollTop - lastSavedScrollRef.current) > 100) {
        lastSavedScrollRef.current = scrollTop;
        const currentActiveStory = useAppStore.getState().stories.find(s => s.id === activeStory.id);
        if (currentActiveStory) {
          onUpdateStory({
            ...currentActiveStory,
            lastReadChapter: useAppStore.getState().selectedChapterNum || selectedChapterNum,
            lastReadScrollPosition: scrollTop,
            lastReadAt: new Date().toISOString()
          });
        }
      }
    }, 2000); // 2000ms debounce
  };

  // Restore scroll position on mount/chapter change
  useEffect(() => {
    if (readerRef.current && activeStory.lastReadChapter === selectedChapterNum) {
      // Only restore if we have valid content to scroll on
      if (selectedChapter.generatedContent || selectedChapter.blocks) {
        // Small delay to ensure content is fully rendered before scrolling
        setTimeout(() => {
           if (readerRef.current && activeStory.lastReadScrollPosition) {
             readerRef.current.scrollTop = activeStory.lastReadScrollPosition;
           }
        }, 100);
      }
    }
  }, [selectedChapterNum, activeStory.lastReadChapter, activeStory.lastReadScrollPosition, selectedChapter.generatedContent, selectedChapter.blocks]);

  return { readerRef, handleViewportScroll };
}
