import { useAppStore } from '../store/useAppStore';
import { StoryMemory, StoryWorld } from '../types';
import { awardQi } from '../lib/qi';
import { extractJsonBlocks, extractJsonMeta } from './storyEngineHelpers';
import { useChapterGeneration } from './useChapterGeneration';
import { useArcSteering } from './useArcSteering';
import { useStoryGeneration } from './useStoryGeneration';
import { useVisualAssets } from './useVisualAssets';
import { useChapterSealing } from './useChapterSealing';

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
  const { handleSteerArc, handleAlterFate } = useArcSteering();
  const { handleGenerateBlueprint, handleStartStory } = useStoryGeneration();
  const { handleGenerateCover, handleApplyCover, handleSelectCover } = useVisualAssets();
  const { handleCheckConsistency, handleSealChapter } = useChapterSealing();

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
   * Persists a whole story object, targeting it by its own id (not the active
   * story — a caller may legitimately write a story that is not open).
   *
   * Routed through the store's `updateStory` like the other handlers here, so
   * the hook no longer reconstructs the stories array. `markEdited: false` and
   * `touchUpdatedAt: true` reproduce this handler's original metadata
   * behavior.
   *
   * The store spreads the payload over the freshest copy of the story rather
   * than swapping the object wholesale, so any key *absent* from the payload
   * survives a concurrent write — including a key that write newly added.
   * The limit: callers reaching this through the `onUpdateStory` prop pass a
   * full `{ ...story, changes }` spread, so a field that already existed on
   * their snapshot rides along at its old value and still clobbers a
   * concurrent update to it, exactly as before. Narrowing that prop to a
   * partial patch is the real fix and is deliberately not done here, because
   * it means changing the Reader Chamber and Codex components that thread it.
   * @param {StoryWorld} updatedStory - The comprehensive story object to persist.
   */
  const handleUpdateStoryDirect = async (updatedStory: StoryWorld) => {
    await useAppStore.getState().updateStory(
      updatedStory.id,
      updatedStory,
      { markEdited: false, touchUpdatedAt: true },
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
    const storyId = useAppStore.getState().activeStoryId;
    if (!storyId) return;
    let didTransitionToRead = false;
    await useAppStore.getState().updateChapter(storyId, charNum, (chapter) => {
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
    handleUpdateStoryDirect,
    handleToggleRead,
    handleGenerateCover,
    handleApplyCover,
    handleSelectCover,
  };
};
