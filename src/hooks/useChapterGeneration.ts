import { useAppStore } from '../store/useAppStore';
import { awardQi } from '../lib/qi';
import { unlockCosmicArtifact } from '../lib/artifacts';
import { getApiHeaders } from './storyEngineHelpers';
import { buildChapterContext } from './chapterPipeline/buildChapterContext';
import { streamChapterBlocks } from './chapterPipeline/streamChapterBlocks';
import { parseChapterStream } from './chapterPipeline/parseChapterStream';
import { runContinuityPass } from './chapterPipeline/runContinuityPass';
import { extractChapterMetadata } from './chapterPipeline/extractChapterMetadata';
import { persistGeneratedChapter } from './chapterPipeline/persistGeneratedChapter';

/**
 * Hook responsible for streaming generation of an individual chapter.
 * Handles pacing logic, RAG history fetching, memory updating, and UI stream coordination.
 */
export const useChapterGeneration = () => {
  const store_setActiveAgentId = useAppStore(state => state.setActiveAgentId);
    const store_routingConfig = useAppStore(state => state.routingConfig);
    const store_saveStories = useAppStore(state => state.saveStories);
    const store_setAppError = useAppStore(state => state.setAppError);
    const store_setIsGenerating = useAppStore(state => state.setIsGenerating);
    const store_setGenerationPhase = useAppStore(state => state.setGenerationPhase);
    const store_setGeneratingChapterNum = useAppStore(state => state.setGeneratingChapterNum);
    const store_setStreamingChapter = useAppStore(state => state.setStreamingChapter);

  /**
   * Generates content and metadata for a specific chapter within the active story.
   * Leverages streaming from the backend to provide real-time reader feedback.
   * @param {number} chapterNumber - The index of the chapter to generate.
   */
  const handleGenerateChapter = async (chapterNumber: number) => {
    const currentStoreState = useAppStore.getState();
    if (currentStoreState.isGenerating) {
      console.warn("Generation already in progress. Ignoring duplicate click.");
      return;
    }
    // Synchronously set generating state on the global store before any async operations
    currentStoreState.setIsGenerating(true);
    currentStoreState.setGeneratingChapterNum(chapterNumber);

    const activeStory = currentStoreState.stories.find(s => s.id === currentStoreState.activeStoryId);
    if (!activeStory) {
      currentStoreState.setIsGenerating(false);
      currentStoreState.setGeneratingChapterNum(null);
      return;
    }
    currentStoreState.setGenerationPhase('chapter');
    currentStoreState.setAppError(null);

    const selectedArcIndex = activeStory.arcs.findIndex(arc => arc.chapters.some(c => c.number === chapterNumber));
    if (selectedArcIndex === -1) {
      currentStoreState.setIsGenerating(false);
      currentStoreState.setGeneratingChapterNum(null);
      return;
    }

    const currentArc = activeStory.arcs[selectedArcIndex];
    const targetChapter = currentArc.chapters.find(c => c.number === chapterNumber);
    if (!targetChapter) {
      currentStoreState.setIsGenerating(false);
      currentStoreState.setGeneratingChapterNum(null);
      return;
    }

    try {
      store_setActiveAgentId('scout');
      const apiHeaders = await getApiHeaders();

      const { pastSummaries, pacingDirective } = await buildChapterContext(
        activeStory,
        targetChapter,
        apiHeaders
      );

      store_setActiveAgentId('versa');
      
      const accumulatedRaw = await streamChapterBlocks(
        activeStory,
        targetChapter,
        pastSummaries,
        pacingDirective,
        store_routingConfig.storyMaker,
        apiHeaders,
        (currentChapterText, blocksData, raw) => {
          currentStoreState.setStreamingChapter({
            number: chapterNumber,
            content: currentChapterText || raw,
            blocks: blocksData
          });
        }
      );

      let { data, finalRawBlocksStr } = parseChapterStream(accumulatedRaw);

      const continuityResult = await runContinuityPass(
        finalRawBlocksStr,
        activeStory,
        store_routingConfig.storyMaker,
        apiHeaders
      );

      if (continuityResult.finalRawBlocksStr !== finalRawBlocksStr) {
        finalRawBlocksStr = continuityResult.finalRawBlocksStr;
        const parsedRe = parseChapterStream(finalRawBlocksStr);
        data.blocks = parsedRe.data.blocks;
        data.chapterText = parsedRe.data.chapterText;
      }
      data.hasContinuityFaults = continuityResult.hasContinuityFaults;
      data.continuityWarnings = continuityResult.continuityWarnings;

      data = await extractChapterMetadata(
        targetChapter,
        finalRawBlocksStr,
        store_routingConfig.storyMaker,
        apiHeaders,
        data
      );

      const updatedStories = await persistGeneratedChapter(
        activeStory,
        chapterNumber,
        selectedArcIndex,
        data,
        apiHeaders
      );

      await store_saveStories(updatedStories);
      awardQi('chapter_generated');
      
      // Scan chapter content for epic story-event artifacts
      import('../lib/artifacts').then(({ scanChapterForArtifacts }) => {
        const fullText = (data.chapterText || "") + " " + (data.blocks || []).map((b: any) => b.text).join(" ");
        scanChapterForArtifacts(activeStory.id, activeStory.title, chapterNumber, fullText, data).catch((err) => {
          console.error("Failed to scan chapter for artifacts:", err);
        });
      });
      
      // Award Compass of Pathless Destinies on reaching Chapter 5
      if (chapterNumber === 5) {
        unlockCosmicArtifact('chapter_5', activeStory.id, activeStory.title).catch((err) => {
          console.error('Failed to unlock Chapter 5 artifact:', err);
        });
      }

    } catch (err: any) {
      console.error(err);
      store_setAppError(err.message || "Celestial feedback received. Chapter generation failed.");
    } finally {
      store_setIsGenerating(false);
      store_setGenerationPhase(null);
      store_setGeneratingChapterNum(null);
      store_setActiveAgentId(null);
      store_setStreamingChapter(null);
    }
  };

  return { handleGenerateChapter };
};
