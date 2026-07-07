import { useState } from 'react';
import { Bookmark, StoryWorld, Chapter } from '../types';
import { useAppStore } from '../store/useAppStore';
import { generateId } from '../lib/id';

interface UseCosmicBookmarkingProps {
  activeStory: StoryWorld;
  selectedChapter: Chapter;
  onUpdateStory: (updatedStory: StoryWorld) => void;
  setSelectedChapterNum: (num: number) => void;
}

export function useCosmicBookmarking({
  activeStory,
  selectedChapter,
  onUpdateStory,
  setSelectedChapterNum
}: UseCosmicBookmarkingProps) {
  const [showBookmarksPanel, setShowBookmarksPanel] = useState(false);
  const [editingBookmarkParagraphIndex, setEditingBookmarkParagraphIndex] = useState<number | null>(null);
  const [bookmarkNoteText, setBookmarkNoteText] = useState("");
  const [pendingScrollToParagraph, setPendingScrollToParagraph] = useState<number | null>(null);

  const activeBookmarks = activeStory.bookmarks || [];

  const handleSaveBookmark = (
    paraIdx: number,
    excerpt: string,
    noteText: string,
  ) => {
    const existing = activeBookmarks.find(
      (b) =>
        b.chapterNumber === selectedChapter.number &&
        b.paragraphIndex === paraIdx,
    );
    let updated: Bookmark[];
    if (existing) {
      updated = activeBookmarks.map((b) => {
        if (
          b.chapterNumber === selectedChapter.number &&
          b.paragraphIndex === paraIdx
        ) {
          return { ...b, note: noteText };
        }
        return b;
      });
    } else {
      updated = [
        ...activeBookmarks,
        {
          id: generateId(7),
          chapterNumber: selectedChapter.number,
          paragraphIndex: paraIdx,
          paragraphExcerpt: excerpt.substring(0, 150),
          note: noteText,
          createdAt: new Date().toISOString(),
        },
      ];
    }
    const currentActiveStory = useAppStore.getState().stories.find(s => s.id === activeStory.id);
    if (currentActiveStory) {
      onUpdateStory({
        ...currentActiveStory,
        bookmarks: updated,
      });
    }
    setEditingBookmarkParagraphIndex(null);
    setBookmarkNoteText("");
  };

  const handleRemoveBookmark = (chapterNum: number, paraIdx: number) => {
    const updated = activeBookmarks.filter(
      (b) => !(b.chapterNumber === chapterNum && b.paragraphIndex === paraIdx),
    );
    const currentActiveStory = useAppStore.getState().stories.find(s => s.id === activeStory.id);
    if (currentActiveStory) {
      onUpdateStory({
        ...currentActiveStory,
        bookmarks: updated,
      });
    }
  };

  const handleJumpToBookmark = (b: Bookmark) => {
    setSelectedChapterNum(b.chapterNumber);
    setPendingScrollToParagraph(b.paragraphIndex);
    setShowBookmarksPanel(false);
  };

  return {
    showBookmarksPanel,
    setShowBookmarksPanel,
    editingBookmarkParagraphIndex,
    setEditingBookmarkParagraphIndex,
    bookmarkNoteText,
    setBookmarkNoteText,
    pendingScrollToParagraph,
    setPendingScrollToParagraph,
    activeBookmarks,
    handleSaveBookmark,
    handleRemoveBookmark,
    handleJumpToBookmark
  };
}
