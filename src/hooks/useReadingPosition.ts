import { useEffect, useRef } from 'react';
import { StoryWorld } from '../types';
import { useAppStore } from '../store/useAppStore';
import {
  ReadingAnchor,
  contentSignature,
  findAnchorAtDocumentPosition,
  locateAnchorElement,
  scrollPositionForAnchor,
} from '../lib/cinematicScroll/anchors';
import {
  createDocumentScrollSurface,
  getFocusLine,
} from '../lib/cinematicScroll/scrollSurface';

const SAVE_DEBOUNCE_MS = 2000;

/**
 * Semantic reading-position persistence.
 *
 * Saves the paragraph nearest the focus line (plus the fractional position of
 * the focus line inside it) on debounced document scrolling, and restores it
 * when the chapter's content is rendered. Legacy raw-pixel positions
 * (`lastReadScrollPosition`) are migrated once: the pixel offset is restored,
 * resolved to the nearest paragraph, and re-saved as a semantic anchor.
 */
export function useReadingPosition({
  contentRef,
  activeStory,
  selectedChapter,
  selectedChapterNum,
  onUpdateStory,
  hasRenderableContent,
}: {
  contentRef: React.RefObject<HTMLElement | null>;
  activeStory: StoryWorld;
  selectedChapter: { blocks?: { id?: string; text: string }[]; generatedContent?: string } | undefined;
  selectedChapterNum: number;
  onUpdateStory: (updatedStory: StoryWorld) => void;
  hasRenderableContent: boolean;
}) {
  const surfaceRef = useRef(createDocumentScrollSurface());
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredChapterRef = useRef<number | null>(null);
  const suppressSaveUntilRef = useRef(0);
  const onUpdateStoryRef = useRef(onUpdateStory);
  const storyIdRef = useRef(activeStory.id);
  const chapterRef = useRef(selectedChapter);
  const chapterNumRef = useRef(selectedChapterNum);
  useEffect(() => {
    onUpdateStoryRef.current = onUpdateStory;
    storyIdRef.current = activeStory.id;
    chapterRef.current = selectedChapter;
    chapterNumRef.current = selectedChapterNum;
  });

  const buildAnchor = (): ReadingAnchor | null => {
    const container = contentRef.current;
    if (!container) return null;
    const surface = surfaceRef.current;
    const scrollTop = surface.getPosition();
    const focusLine = getFocusLine();
    const found = findAnchorAtDocumentPosition(container, scrollTop + focusLine, scrollTop);
    if (!found) return null;
    const blockText =
      chapterRef.current?.blocks?.[found.info.paragraphIndex]?.text ?? '';
    return {
      chapterNumber: chapterNumRef.current,
      blockId: found.info.blockId,
      paragraphIndex: found.info.paragraphIndex,
      contentSignature: blockText ? contentSignature(blockText) : undefined,
      intraBlockRatio: found.intraBlockRatio,
      savedAt: new Date().toISOString(),
    };
  };

  const persistAnchor = (anchor: ReadingAnchor) => {
    const currentActiveStory = useAppStore
      .getState()
      .stories.find((s) => s.id === storyIdRef.current);
    if (!currentActiveStory) return;
    onUpdateStoryRef.current({
      ...currentActiveStory,
      lastReadChapter: anchor.chapterNumber,
      readingAnchor: anchor,
      // Raw pixels are never written anymore; clear the legacy field so the
      // one-time migration cannot repeat.
      lastReadScrollPosition: undefined,
      lastReadAt: anchor.savedAt,
    });
  };

  // --- Save on debounced document scroll ------------------------------------
  useEffect(() => {
    const onScroll = () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        if (performance.now() < suppressSaveUntilRef.current) return;
        const anchor = buildAnchor();
        if (anchor) persistAnchor(anchor);
      }, SAVE_DEBOUNCE_MS);
    };
    const unsubscribe = surfaceRef.current.subscribe(onScroll);
    return () => {
      unsubscribe();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Restore on chapter render ---------------------------------------------
  useEffect(() => {
    if (!hasRenderableContent) return;
    if (activeStory.lastReadChapter !== selectedChapterNum) return;
    if (restoredChapterRef.current === selectedChapterNum) return;
    restoredChapterRef.current = selectedChapterNum;

    let cancelled = false;
    const surface = surfaceRef.current;

    const applyAnchor = (anchor: ReadingAnchor): boolean => {
      const container = contentRef.current;
      if (!container) return false;
      const element = locateAnchorElement(container, anchor);
      if (!element) return false;
      const position = scrollPositionForAnchor(
        element,
        anchor.intraBlockRatio,
        getFocusLine(),
        surface.getPosition(),
      );
      // Don't let restoration writes be saved back as a "new" position
      // before the layout fully settles.
      suppressSaveUntilRef.current = performance.now() + SAVE_DEBOUNCE_MS;
      surface.setPosition(position);
      return true;
    };

    const restore = async () => {
      // Fonts change line wrapping, which changes block heights — wait for
      // them before measuring.
      if (typeof document !== 'undefined' && document.fonts?.ready) {
        try {
          await document.fonts.ready;
        } catch {
          /* restoration proceeds with current metrics */
        }
      }
      if (cancelled) return;

      const anchor = activeStory.readingAnchor;
      if (anchor && anchor.chapterNumber === selectedChapterNum) {
        if (applyAnchor(anchor)) {
          // One corrective pass after the next stable rendering opportunity
          // (images/late layout may have shifted geometry).
          requestAnimationFrame(() => {
            if (!cancelled) applyAnchor(anchor);
          });
        }
        return;
      }

      // One-time legacy migration: restore the raw pixel offset, resolve the
      // nearest paragraph, and re-save it as a semantic anchor.
      const legacyPixels = activeStory.lastReadScrollPosition;
      if (legacyPixels != null && legacyPixels > 0 && !anchor) {
        suppressSaveUntilRef.current = performance.now() + SAVE_DEBOUNCE_MS;
        surface.setPosition(legacyPixels);
        requestAnimationFrame(() => {
          if (cancelled) return;
          const migrated = buildAnchor();
          if (migrated) persistAnchor(migrated);
        });
      }
    };

    restore();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedChapterNum,
    hasRenderableContent,
    activeStory.lastReadChapter,
  ]);
}
