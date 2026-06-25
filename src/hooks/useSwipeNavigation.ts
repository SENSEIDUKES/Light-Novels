import { useState } from 'react';

interface UseSwipeNavigationProps {
  selectedChapterNum: number;
  maxChapterNum: number;
  navigatePrev: () => void;
  navigateNext: () => void;
}

export function useSwipeNavigation({
  selectedChapterNum,
  maxChapterNum,
  navigatePrev,
  navigateNext
}: UseSwipeNavigationProps) {
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchEndY, setTouchEndY] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchEndY(null);
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
    setTouchEndY(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchStartY) return;
    const currentEndX = touchEndX !== null ? touchEndX : touchStartX;
    const currentEndY = touchEndY !== null ? touchEndY : touchStartY;

    const distanceX = touchStartX - currentEndX;
    const distanceY = touchStartY - currentEndY;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;

    // Trigger horizontal swipe only if distanceX is significantly larger than distanceY
    // This prevents accidental chapter navigation while scrolling down
    if (
      Math.abs(distanceX) > Math.abs(distanceY) * 2 &&
      Math.abs(distanceX) > minSwipeDistance
    ) {
      if (isLeftSwipe) {
        if (selectedChapterNum < maxChapterNum) navigateNext();
      } else if (isRightSwipe) {
        if (selectedChapterNum > 1) navigatePrev();
      }
    }
  };

  return { handleTouchStart, handleTouchMove, handleTouchEnd };
}
