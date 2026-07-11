import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCosmicBookmarking } from './useCosmicBookmarking';
import { useAppStore } from '../store/useAppStore';

vi.mock('../store/useAppStore', () => ({ useAppStore: { getState: vi.fn() } }));

describe('useCosmicBookmarking', () => {
  const latestStory = {
    id: 'story-1',
    title: 'Latest title',
    bookmarks: [{ id: 'existing', chapterNumber: 1, paragraphIndex: 2, paragraphExcerpt: 'Old', note: 'Before', createdAt: '2026-01-01' }],
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAppStore.getState).mockReturnValue({ stories: [latestStory] } as any);
  });

  it('adds a truncated bookmark against the latest story snapshot and closes the editor', () => {
    const onUpdateStory = vi.fn();
    const { result } = renderHook(() => useCosmicBookmarking({
      activeStory: { ...latestStory, title: 'Stale title' },
      selectedChapter: { number: 3 },
      onUpdateStory,
      setSelectedChapterNum: vi.fn(),
    } as any));
    const excerpt = 'x'.repeat(180);

    act(() => {
      result.current.setEditingBookmarkParagraphIndex(4);
      result.current.setBookmarkNoteText('Draft note');
      result.current.handleSaveBookmark(4, excerpt, 'Keep this turn');
    });

    expect(onUpdateStory).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Latest title',
      bookmarks: [
        latestStory.bookmarks[0],
        expect.objectContaining({
          chapterNumber: 3,
          paragraphIndex: 4,
          paragraphExcerpt: excerpt.slice(0, 150),
          note: 'Keep this turn',
        }),
      ],
    }));
    expect(result.current.editingBookmarkParagraphIndex).toBeNull();
    expect(result.current.bookmarkNoteText).toBe('');
  });

  it('updates an existing note without creating a duplicate and removes the requested bookmark', () => {
    const onUpdateStory = vi.fn();
    const { result } = renderHook(() => useCosmicBookmarking({
      activeStory: latestStory,
      selectedChapter: { number: 1 },
      onUpdateStory,
      setSelectedChapterNum: vi.fn(),
    } as any));

    act(() => result.current.handleSaveBookmark(2, 'Ignored', 'Revised'));
    expect(onUpdateStory).toHaveBeenLastCalledWith(expect.objectContaining({
      bookmarks: [expect.objectContaining({ id: 'existing', note: 'Revised' })],
    }));

    act(() => result.current.handleRemoveBookmark(1, 2));
    expect(onUpdateStory).toHaveBeenLastCalledWith(expect.objectContaining({ bookmarks: [] }));
  });

  it('jumps to a bookmark chapter, records the paragraph target, and closes the panel', () => {
    const setSelectedChapterNum = vi.fn();
    const { result } = renderHook(() => useCosmicBookmarking({
      activeStory: latestStory,
      selectedChapter: { number: 1 },
      onUpdateStory: vi.fn(),
      setSelectedChapterNum,
    } as any));

    act(() => {
      result.current.setShowBookmarksPanel(true);
      result.current.handleJumpToBookmark({ chapterNumber: 5, paragraphIndex: 8 } as any);
    });

    expect(setSelectedChapterNum).toHaveBeenCalledWith(5);
    expect(result.current.pendingScrollToParagraph).toBe(8);
    expect(result.current.showBookmarksPanel).toBe(false);
  });
});
