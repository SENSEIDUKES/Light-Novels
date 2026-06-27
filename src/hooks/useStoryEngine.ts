import { useAppStore } from '../store/useAppStore';
import { StoryMemory, StoryWorld } from '../types';
import { awardQi } from '../lib/qi';
import { extractJsonBlocks, extractJsonMeta } from './storyEngineHelpers';
import { useChapterGeneration } from './useChapterGeneration';
import { useArcSteering } from './useArcSteering';
import { useStoryGeneration } from './useStoryGeneration';
import { useVisualAssets } from './useVisualAssets';
import { useChapterSealing } from './useChapterSealing';
import { useSaveStory } from './useStoryQueries';
import { storyStorage } from '../lib/storage';

export { extractJsonBlocks, extractJsonMeta };

/**
 * Core hook orchestrating the high-level generation lifecycle of the story engine.
 * Exposes methods to generate blueprints, initialize stories, trigger chapter generations,
 * steer story arcs, and manage consistency validation.
 * @returns Object containing async handlers for various generation phases.
 */
export const useStoryEngine = () => {
  const store = useAppStore();
  const { handleGenerateChapter } = useChapterGeneration();
  const { handleSteerArc, handleAlterFate } = useArcSteering();
  const { handleGenerateBlueprint, handleStartStory } = useStoryGeneration();
  const { handleGenerateCover, handleApplyCover } = useVisualAssets();
  const { handleCheckConsistency, handleSealChapter } = useChapterSealing();
  
  const saveStoryMutation = useSaveStory();

  /**
   * Replaces the story's memory explicitly.
   * @param {StoryMemory} updatedMemory - The new memory object.
   */
  const handleUpdateMemoryManual = async (updatedMemory: StoryMemory) => {
    const activeStoryId = useAppStore.getState().activeStoryId;
    if (!activeStoryId) return;
    const activeStory = await storyStorage.getStory(activeStoryId);
    if (!activeStory) return;
    
    const updated = {
      ...activeStory,
      memory: updatedMemory,
      updatedAt: new Date().toISOString()
    };
    await saveStoryMutation.mutateAsync(updated);
  };

  /**
   * Overwrites the active story object completely in the local store.
   * @param {StoryWorld} updatedStory - The comprehensive story object to persist.
   */
  const handleUpdateStoryDirect = async (updatedStory: StoryWorld) => {
    updatedStory.updatedAt = new Date().toISOString();
    await saveStoryMutation.mutateAsync(updatedStory);
  };

  const handleToggleRead = async (charNum: number) => {
    const activeStoryId = useAppStore.getState().activeStoryId;
    if (!activeStoryId) return;
    const activeStory = await storyStorage.getStory(activeStoryId);
    if (!activeStory) return;
    
    const updated = {
      ...activeStory,
      arcs: activeStory.arcs.map(arc => ({
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
    await saveStoryMutation.mutateAsync(updated);
  };

  return {
    handleGenerateBlueprint,
    handleStartStory,
    handleGenerateChapter,
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
