import { useState } from 'react';
import { Bookmark, StoryWorld, Chapter, UpdateStoryFields } from '../types';
import { generateId } from '../lib/id';

interface UseCosmicBookmarkingProps {
  activeStory: StoryWorld;
  selectedChapter: Chapter;
  updateStoryFields: UpdateStoryFields;
  setSelectedChapterNum: (num: number) => void;
}

export function useCosmicBookmarking({
  activeStory,
  selectedChapter,
  updateStoryFields,
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
    const bookmark: Bookmark = {
      id: generateId(7),
      chapterNumber: selectedChapter.number,
      paragraphIndex: paraIdx,
      paragraphExcerpt: excerpt.substring(0, 150),
      note: noteText,
      createdAt: new Date().toISOString(),
    };
    void updateStoryFields(activeStory.id, (current) => {
      const bookmarks = current.bookmarks || [];
      const exists = bookmarks.some((candidate) => (
        candidate.chapterNumber === bookmark.chapterNumber
        && candidate.paragraphIndex === bookmark.paragraphIndex
      ));
      return {
        bookmarks: exists
          ? bookmarks.map((candidate) => (
            candidate.chapterNumber === bookmark.chapterNumber
            && candidate.paragraphIndex === bookmark.paragraphIndex
              ? { ...candidate, note: noteText }
              : candidate
          ))
          : [...bookmarks, bookmark],
      };
    });
    setEditingBookmarkParagraphIndex(null);
    setBookmarkNoteText("");
  };

  const handleRemoveBookmark = (chapterNum: number, paraIdx: number) => {
    void updateStoryFields(activeStory.id, (current) => ({
      bookmarks: (current.bookmarks || []).filter(
        (bookmark) => !(bookmark.chapterNumber === chapterNum && bookmark.paragraphIndex === paraIdx),
      ),
    }));
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
