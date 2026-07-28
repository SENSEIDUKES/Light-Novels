import React, { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReaderViewport } from './ReaderViewport';
import type { Chapter, StoryWorld } from '../types';

const mocks = vi.hoisted(() => ({
  updateStory: vi.fn(),
}));

vi.mock('motion/react', () => ({
  motion: {
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      whileHover: _whileHover,
      whileInView: _whileInView,
      viewport: _viewport,
      ...props
    }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('../store/useAppStore', () => ({
  useAppStore: (selector?: (state: unknown) => unknown) => {
    const state = { updateStory: mocks.updateStory };
    return selector ? selector(state) : state;
  },
}));

type ReaderViewportProps = React.ComponentProps<typeof ReaderViewport>;

const baseChapter: Chapter = {
  number: 2,
  title: 'The Second Gate',
  premise: 'A test of resolve.',
  status: 'read',
  generatedContent: 'First paragraph.\n\nSecond paragraph.',
};

const baseStory = {
  id: 'story-1',
  title: 'Test Story',
  genre: 'Xianxia',
  mcName: 'Lin',
  customPremise: 'A journey.',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  memory: {},
  arcs: [],
} as StoryWorld;

function makeProps(overrides: Partial<ReaderViewportProps> = {}): ReaderViewportProps {
  return {
    readerRef: createRef<HTMLDivElement>(),
    isReaderFullscreen: false,
    handleTouchStart: vi.fn(),
    handleTouchMove: vi.fn(),
    handleTouchEnd: vi.fn(),
    handleTextClick: vi.fn(),
    isTranslating: false,
    preferredLang: 'en',
    selectedChapter: baseChapter,
    activeStory: baseStory,
    currentPowerStage: 'Foundation',
    selectedChapterNum: 2,
    maxChapterNum: 3,
    codexTerms: [],
    generatingRevealId: null,
    handleManifestReveal: vi.fn(),
    readerMode: 'normal',
    immersion: { imagePopups: true },
    isPlayingText: false,
    isPausedText: false,
    currentNarratedBlockIndex: null,
    currentPrefs: {
      fontSize: 'base',
      fontFamily: 'serif',
      lineHeight: 'normal',
      paragraphSpacing: 'normal',
    },
    handleUpdatePreference: vi.fn(),
    activeBookmarks: [],
    editingBookmarkParagraphIndex: null,
    setEditingBookmarkParagraphIndex: vi.fn(),
    bookmarkNoteText: '',
    setBookmarkNoteText: vi.fn(),
    handleRemoveBookmark: vi.fn(),
    handleSaveBookmark: vi.fn(),
    activeTranslationContent: null,
    renderHighlightedText: (text: string) => text,
    getFocusClass: () => '',
    onUpdateStory: vi.fn(),
    navigatePrev: vi.fn(),
    navigateNext: vi.fn(),
    handleSealClick: vi.fn(),
    isCheckingConsistency: false,
    isGenerating: false,
    handleGenerate: vi.fn(),
    handleGenerateNextFive: vi.fn(),
    activeAgentId: null,
    showFateCodex: false,
    setShowFateCodex: vi.fn(),
    showLegend: false,
    setShowLegend: vi.fn(),
    hasSystemBlocks: false,
    chapters: [baseChapter],
    ...overrides,
  };
}

describe('ReaderViewport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the translation state while chapter content is being translated', () => {
    render(
      <ReaderViewport
        {...makeProps({
          isTranslating: true,
          selectedChapter: { ...baseChapter, generatedContent: undefined },
        })}
      />,
    );

    expect(screen.getByText('Translating the Heavenly Dao...')).toBeDefined();
  });

  it('renders generated prose and wires navigation and reader gestures', () => {
    const props = makeProps();
    render(<ReaderViewport {...props} />);

    expect(screen.getByText('First paragraph.')).toBeDefined();
    expect(screen.getByText('Second paragraph.')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /previous/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(props.navigatePrev).toHaveBeenCalledTimes(1);
    expect(props.navigateNext).toHaveBeenCalledTimes(1);

    const viewport = props.readerRef.current;
    expect(viewport).toBeTruthy();
    fireEvent.touchStart(viewport);
    fireEvent.touchMove(viewport);
    fireEvent.touchEnd(viewport);
    expect(props.handleTouchStart).toHaveBeenCalledTimes(1);
    expect(props.handleTouchMove).toHaveBeenCalledTimes(1);
    expect(props.handleTouchEnd).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Context Inspector')).toBeNull();
  });

  it('uses language-aware reader prose instead of forced justification', () => {
    render(<ReaderViewport {...makeProps({
      preferredLang: 'ar',
      activeTranslationContent: 'نص مترجم.',
      currentPrefs: {
        fontSize: 'base',
        fontFamily: 'serif',
        lineHeight: 'normal',
        paragraphSpacing: 'normal',
        textAlignment: 'start',
        wordSpacing: 0,
        readingWidth: 58,
      },
    })} />);

    const prose = screen.getByText('نص مترجم.').closest('.reader-prose');
    expect(prose?.getAttribute('lang')).toBe('ar');
    expect(prose?.getAttribute('dir')).toBe('rtl');
    expect(prose?.getAttribute('style')).toContain('text-align: start');
    expect(prose?.getAttribute('style')).toContain('max-inline-size: 58ch');
    expect(screen.getByText('نص مترجم.').closest('.reader-paragraph')).toBeTruthy();
  });

  it('renders the chapter context manifest as one collapsed inspector list', () => {
    const sectionKeys = [
      ['pinnedRules', 'Pinned rules'],
      ['premise', 'Premise'],
      ['anchor', 'Anchor'],
      ['recentChapters', 'Recent chapters'],
      ['entityCards', 'Entity cards'],
      ['threads', 'Threads'],
      ['rag', 'RAG'],
      ['arcSummaries', 'Arc summaries'],
    ] as const;
    const contextManifest = {
      version: 1 as const,
      route: 'generate-chapter-stream' as const,
      generatedAt: '2026-07-12T00:00:00.000Z',
      chapterNumber: 2,
      totalEstimatedTokens: 800,
      memoryAndHistoryBudgetTokens: 80000,
      memoryAndHistoryEstimatedTokens: 400,
      memoryAndHistoryBudgetExceeded: false,
      providerInputTruncated: false,
      sections: sectionKeys.map(([key, label], index) => ({
        key,
        label,
        estimatedTokens: 100,
        includedItemCount: 1,
        availableItemCount: index === 4 ? 2 : 1,
        includedItems: index === 4 ? ['Artifact: Sun Shield'] : [`${label} input`],
        omittedItems: index === 4 ? ['Artifact: Moon Sword'] : [],
        truncated: index === 4,
      })),
    };

    render(
      <ReaderViewport
        {...makeProps({
          selectedChapter: { ...baseChapter, contextManifest },
        })}
      />,
    );

    const summary = screen.getByText('Context Inspector').closest('summary');
    const inspector = summary?.closest('details') as HTMLDetailsElement | null;
    expect(summary).toBeTruthy();
    expect(inspector?.open).toBe(false);

    fireEvent.click(summary!);
    expect(inspector?.open).toBe(true);
    sectionKeys.forEach(([, label]) => {
      expect(screen.getByText(label)).toBeDefined();
    });
    expect(screen.getByText('Artifact: Moon Sword')).toBeDefined();
  });

  it('wires bookmark editing callbacks for generated prose', () => {
    const props = makeProps({
      activeBookmarks: [{
        id: 'bookmark-1',
        chapterNumber: 2,
        paragraphIndex: 0,
        paragraphExcerpt: 'First paragraph.',
        note: 'Original note',
        createdAt: '2026-01-01',
      }],
      editingBookmarkParagraphIndex: 0,
      bookmarkNoteText: 'Updated note',
    });

    render(<ReaderViewport {...props} />);

    const noteInput = screen.getByPlaceholderText('Type an insightful note, prediction, or timeline event...');
    fireEvent.change(noteInput, { target: { value: 'New note' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save bookmark' }));

    expect(props.setBookmarkNoteText).toHaveBeenCalledWith('New note');
    // setBookmarkNoteText is mocked, so bookmarkNoteText stays 'Updated note'.
    // This verifies Save passes the current prop value to the callback.
    expect(props.handleSaveBookmark).toHaveBeenCalledWith(0, 'First paragraph.', 'Updated note');
  });

  it('offers chapter manifestation controls when content has not been generated', () => {
    const props = makeProps({
      selectedChapter: { ...baseChapter, generatedContent: undefined, blocks: [], hasContent: false },
      chapters: [],
    });

    render(<ReaderViewport {...props} />);

    expect(screen.getByRole('heading', { name: 'Unmanifested Segment' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Manifest' }));
    fireEvent.click(screen.getByRole('button', { name: 'Manifest Next 5 Chapters' }));
    expect(props.handleGenerate).toHaveBeenCalledTimes(1);
    expect(props.handleGenerateNextFive).toHaveBeenCalledTimes(1);
  });
});
