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
  const store_stories = useAppStore(state => state.stories);
    const store_activeStoryId = useAppStore(state => state.activeStoryId);
    const store_saveStories = useAppStore(state => state.saveStories);
  const { handleGenerateChapter, handleGenerateNextFiveChapters } = useChapterGeneration();
  const { handleSteerArc, handleAlterFate } = useArcSteering();
  const { handleGenerateBlueprint, handleStartStory } = useStoryGeneration();
  const { handleGenerateCover, handleApplyCover } = useVisualAssets();
  const { handleCheckConsistency, handleSealChapter } = useChapterSealing();

  /**
   * Replaces the story's memory explicitly.
   * @param {StoryMemory} updatedMemory - The new memory object.
   */
  const handleUpdateMemoryManual = async (updatedMemory: StoryMemory) => {
    const activeStory = store_stories.find(s => s.id === store_activeStoryId);
    if (!activeStory) return;
    const updated = store_stories.map(s => {
      if (s.id === activeStory.id) {
        return {
          ...s,
          memory: updatedMemory,
          updatedAt: new Date().toISOString()
        };
      }
      return s;
    });
    await store_saveStories(updated);
  };

  /**
   * Overwrites the active story object completely in the local store.
   * @param {StoryWorld} updatedStory - The comprehensive story object to persist.
   */
  const handleUpdateStoryDirect = async (updatedStory: StoryWorld) => {
    updatedStory.updatedAt = new Date().toISOString();
    const updated = store_stories.map(s => s.id === updatedStory.id ? updatedStory : s);
    await store_saveStories(updated);
  };

  const handleToggleRead = async (charNum: number) => {
    const activeStory = store_stories.find(s => s.id === store_activeStoryId);
    if (!activeStory) return;
    const updated = store_stories.map(s => {
      if (s.id === activeStory.id) {
        return {
          ...s,
          arcs: s.arcs.map(arc => ({
            ...arc,
            chapters: arc.chapters.map(ch => {
              if (ch.number === charNum) {
                const newStatus = ch.status === 'read' ? 'unread' : 'read';
                if (newStatus === 'read') {
                  awardQi('chapter_finished');
                  
                  // Dao Pillar (Daily Reading Streak) is now an active check-in mechanic on the UserProfile page.
                }
                
                return {
                  ...ch,
                  status: newStatus as 'unread' | 'read'
                };
              }
              return ch;
            })
          })),
          updatedAt: new Date().toISOString()
        };
      }
      return s;
    });
    await store_saveStories(updated);
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
    handleApplyCover
  };
};
