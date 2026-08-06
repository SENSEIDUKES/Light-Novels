import { useAppStore } from '../store/useAppStore';
import { StoryMemory, UpdateStoryFields } from '../types';
import { awardQi } from '../lib/qi';
import { extractJsonBlocks, extractJsonMeta } from './storyEngineHelpers';
import { useChapterGeneration } from './useChapterGeneration';
import { useStorySteering } from './useStorySteering';
import { useStoryGeneration } from './useStoryGeneration';
import { useVisualAssets } from './useVisualAssets';
import { useChapterLock } from './useChapterLock';
import { selectIsGenerating } from '../store/useGenerationStore';

export { extractJsonBlocks, extractJsonMeta };

/**
 * Core hook orchestrating the high-level generation lifecycle of the story engine.
 * Exposes methods to generate blueprints, initialize stories, trigger chapter generations,
 * steer story arcs, and manage consistency validation.
 * @returns Object containing async handlers for various generation phases.
 */
export const useStoryEngine = () => {
  // No `stories`/`saveStories` selectors: every mutation below goes through
  // the store's own updateStory/updateChapter, so this hook never rebuilds
  // the stories array and never re-renders merely because some unrelated
  // story changed.
  const { handleGenerateChapter, handleGenerateNextFiveChapters } = useChapterGeneration();
  const { handleSteerArc, handleAlterFate } = useStorySteering();
  const { handleGenerateBlueprint, handleStartStory } = useStoryGeneration();
  const { handleGenerateCover, handleApplyCover, handleSelectCover } = useVisualAssets();
  const { handleCheckConsistency, handleSealChapter } = useChapterLock();

  /**
   * Replaces the story's memory explicitly.
   *
   * Routed through the store's `updateStory`, the single authoritative path
   * for patching a story, rather than reconstructing the stories array here.
   * `markEdited: false` preserves this handler's original behavior of not
   * flagging the story as reader-edited — only `updatedAt` moves.
   * @param {StoryMemory} updatedMemory - The new memory object.
   */
  const handleUpdateMemoryManual = async (updatedMemory: StoryMemory) => {
    const storyId = useAppStore.getState().activeStoryId;
    if (!storyId) return;
    await useAppStore.getState().updateStory(
      storyId,
      { memory: updatedMemory },
      { markEdited: false, touchUpdatedAt: true },
    );
  };

  /**
   * Reader/Codex mutation boundary. Callers name the story and send only the
   * fields they own; functional patches read the latest queued story.
   */
  const updateStoryFields: UpdateStoryFields = async (storyId, updates, options) => {
    await useAppStore.getState().updateStory(
      storyId,
      updates,
      { markEdited: false, touchUpdatedAt: true, ...options },
    );
  };

  /**
   * Toggles a chapter between read and unread, awarding Qi on the
   * unread-to-read transition only.
   *
   * The actual patch is computed by the updater function passed to the
   * store's `updateChapter`, which the store evaluates against the chapter's
   * value at the moment this call is actually applied — not a value read
   * up front. `updateChapter` serializes concurrent callers through the same
   * save queue `saveStories` already uses, so a second rapid toggle is
   * evaluated against the first toggle's committed result instead of racing
   * it on a stale read; that ordering is what makes a double award
   * impossible without any lock of our own to get stuck if a save fails.
   * Qi is awarded only after the store call resolves, so a failed save
   * (network, storage, account change) awards nothing.
   */
  const handleToggleRead = async (charNum: number) => {
    if (selectIsGenerating(useAppStore.getState())) return;

    const storyId = useAppStore.getState().activeStoryId;
    if (!storyId) return;
    let didTransitionToRead = false;
    await useAppStore.getState().updateChapter(storyId, charNum, (chapter) => {
      // This updater runs only when the queued mutation reaches the
      // serialized save boundary. Recheck generation here so a run that
      // starts after the click but before the update applies still blocks it.
      if (selectIsGenerating(useAppStore.getState())) return {};

      const newStatus = chapter.status === 'read' ? 'unread' : 'read';
      didTransitionToRead = newStatus === 'read';
      return { status: newStatus };
    });
    if (didTransitionToRead) {
      awardQi('chapter_finished');
      // Dao Pillar (Daily Reading Streak) is now an active check-in mechanic on the UserProfile page.
    }
  };

  return {
    handleGenerateBlueprint,
    handleStartStory,
    handleGenerateChapter,
    handleGenerateNextFiveChapters,
    handleSteerArc,
    handleAlterFate,
    handleCheckConsistency,
    handleSealChapter,
    handleUpdateMemoryManual,
    updateStoryFields,
    handleToggleRead,
    handleGenerateCover,
    handleApplyCover,
    handleSelectCover,
  };
};
