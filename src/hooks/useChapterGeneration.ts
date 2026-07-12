import { useAppStore } from '../store/useAppStore';
import { Story, ChapterGenerationBatch } from '../types';
import { awardQi } from '../lib/qi';
import { unlockCosmicArtifact } from '../lib/artifacts';
import { getApiHeaders } from './storyEngineHelpers';
import { buildChapterContext } from './chapterPipeline/buildChapterContext';
import { streamChapterBlocks } from './chapterPipeline/streamChapterBlocks';
import { parseChapterStream } from './chapterPipeline/parseChapterStream';
import { runContinuityPass } from './chapterPipeline/runContinuityPass';
import { extractChapterMetadata } from './chapterPipeline/extractChapterMetadata';
import { persistGeneratedChapter } from './chapterPipeline/persistGeneratedChapter';
import {
  getNextFiveUngeneratedChapters,
  getRemainingBatchChapterNumbers,
  runSequentialChapterBatch,
} from './chapterPipeline/chapterBatch';

type BatchProgress = { index: number; total: number } | null;

/**
 * Streaming chapter generation and its sequential five-chapter orchestration.
 * Both flows call the same per-chapter work so continuity, metadata, persistence,
 * Qi, and artifacts never diverge.
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
  const store_setGenerationProgressMessage = useAppStore(state => state.setGenerationProgressMessage);

  const persistBatch = async (story: Story, batch: ChapterGenerationBatch): Promise<Story> => {
    const state = useAppStore.getState();
    const updatedStories = state.stories.map(currentStory =>
      currentStory.id === story.id
        ? { ...currentStory, chapterGenerationBatch: batch, updatedAt: new Date().toISOString() }
        : currentStory
    );
    const updatedStory = updatedStories.find(currentStory => currentStory.id === story.id);
    if (!updatedStory) throw new Error('The active story is no longer available.');
    await state.saveStories(updatedStories);
    return updatedStory;
  };

  const generateOneChapter = async (
    activeStory: Story,
    chapterNumber: number,
    batchProgress: BatchProgress = null,
  ): Promise<Story> => {
    const selectedArcIndex = activeStory.arcs.findIndex(arc => arc.chapters.some(chapter => chapter.number === chapterNumber));
    if (selectedArcIndex === -1) throw new Error(`Chapter ${chapterNumber} is not part of the active story.`);

    const currentArc = activeStory.arcs[selectedArcIndex];
    const targetChapter = currentArc.chapters.find(chapter => chapter.number === chapterNumber);
    if (!targetChapter) throw new Error(`Chapter ${chapterNumber} could not be found.`);

    const setProgress = (message: string) => {
      const prefix = batchProgress
        ? `Forging Chapter ${chapterNumber} · ${batchProgress.index} of ${batchProgress.total}`
        : '';
      store_setGenerationProgressMessage?.(prefix && message ? `${prefix} — ${message}` : prefix || message);
    };

    store_setActiveAgentId('scout');
    const apiHeaders = await getApiHeaders();
    const { pastSummaries, pacingDirective } = await buildChapterContext(activeStory, targetChapter, apiHeaders);

    store_setActiveAgentId('versa');
    setProgress('VERSA is weaving the chapter into being...');
    const accumulatedRaw = await streamChapterBlocks(
      activeStory,
      targetChapter,
      pastSummaries,
      pacingDirective,
      store_routingConfig.storyMaker,
      apiHeaders,
      (currentChapterText, blocksData, raw) => {
        useAppStore.getState().setStreamingChapter({
          number: chapterNumber,
          content: currentChapterText || raw,
          blocks: blocksData,
        });
      },
    );

    let { data, finalRawBlocksStr } = parseChapterStream(accumulatedRaw);
    const continuityResult = await runContinuityPass(
      finalRawBlocksStr,
      activeStory,
      store_routingConfig.storyMaker,
      apiHeaders,
      phase => setProgress(
        phase === 'repairing'
          ? 'Reconciling the timeline — mending continuity threads...'
          : 'Verifying continuity against the Codex...',
      ),
    );

    if (continuityResult.finalRawBlocksStr !== finalRawBlocksStr) {
      finalRawBlocksStr = continuityResult.finalRawBlocksStr;
      const repaired = parseChapterStream(finalRawBlocksStr);
      data.blocks = repaired.data.blocks;
      data.chapterText = repaired.data.chapterText;
    }
    data.hasContinuityFaults = continuityResult.hasContinuityFaults;
    data.continuityWarnings = continuityResult.continuityWarnings;
    data.continuitySoftNotes = continuityResult.continuitySoftNotes;
    data = await extractChapterMetadata(targetChapter, finalRawBlocksStr, store_routingConfig.storyMaker, apiHeaders, data);

    const updatedStories = await persistGeneratedChapter(activeStory, chapterNumber, selectedArcIndex, data, apiHeaders);
    await store_saveStories(updatedStories);
    const updatedStory = updatedStories.find(story => story.id === activeStory.id);
    if (!updatedStory) throw new Error('The generated story could not be persisted.');

    awardQi('chapter_generated');
    import('../lib/artifacts').then(({ scanChapterForArtifacts }) => {
      const fullText = `${data.chapterText || ''} ${(data.blocks || []).map((block: any) => block.text).join(' ')}`;
      scanChapterForArtifacts(activeStory.id, activeStory.title, chapterNumber, fullText, data).catch(err => {
        console.error('Failed to scan chapter for artifacts:', err);
      });
    });
    if (chapterNumber === 5) {
      unlockCosmicArtifact('chapter_5', activeStory.id, activeStory.title).catch(err => {
        console.error('Failed to unlock Chapter 5 artifact:', err);
      });
    }

    return updatedStory;
  };

  const handleGenerateChapter = async (chapterNumber: number) => {
    const state = useAppStore.getState();
    if (state.isGenerating) {
      console.warn('Generation already in progress. Ignoring duplicate click.');
      return;
    }

    state.setIsGenerating(true);
    state.setGeneratingChapterNum(chapterNumber);
    state.setIsVeilMinimized?.(false);
    const activeStory = state.stories.find(story => story.id === state.activeStoryId);
    if (!activeStory) {
      state.setIsGenerating(false);
      state.setGeneratingChapterNum(null);
      return;
    }

    state.setGenerationPhase('chapter');
    state.setAppError(null);
    try {
      await generateOneChapter(activeStory, chapterNumber);
    } catch (err: any) {
      console.error(err);
      store_setAppError(err.message || 'Celestial feedback received. Chapter generation failed.');
    } finally {
      store_setIsGenerating(false);
      store_setGenerationPhase(null);
      store_setGeneratingChapterNum(null);
      store_setActiveAgentId(null);
      store_setStreamingChapter(null);
      store_setGenerationProgressMessage?.('');
    }
  };

  const handleGenerateNextFiveChapters = async (fromChapterNumber: number) => {
    const state = useAppStore.getState();
    if (state.isGenerating) {
      console.warn('Generation already in progress. Ignoring duplicate batch request.');
      return;
    }

    const activeStory = state.stories.find(story => story.id === state.activeStoryId);
    if (!activeStory) return;

    const resumableBatch = activeStory.chapterGenerationBatch;
    const canResume = resumableBatch && (resumableBatch.status === 'paused' || resumableBatch.status === 'failed');
    const chapterNumbers = canResume
      ? resumableBatch.chapterNumbers
      : getNextFiveUngeneratedChapters(activeStory, fromChapterNumber);

    if (!canResume && chapterNumbers.length !== 5) {
      store_setAppError('Five ungenerated chapters must be planned before a batch manifestation can begin.');
      return;
    }
    if (canResume && getRemainingBatchChapterNumbers(resumableBatch).length === 0) return;

    const batch: ChapterGenerationBatch = canResume
      ? {
          ...resumableBatch,
          status: 'queued',
          currentChapterNumber: null,
          failedChapterNumber: undefined,
          error: undefined,
          completedAt: undefined,
        }
      : {
          id: `batch-${Date.now()}`,
          chapterNumbers,
          status: 'queued',
          currentChapterNumber: null,
          completedChapterNumbers: [],
          createdAt: new Date().toISOString(),
        };

    state.setIsGenerating(true);
    state.setGenerationPhase('chapter');
    state.setIsVeilMinimized?.(false);
    state.setAppError(null);
    try {
      const preparedStory = await persistBatch(activeStory, batch);
      await runSequentialChapterBatch({
        story: preparedStory,
        batch,
        persistBatch,
        generateChapter: (story, chapterNumber) => {
          const index = batch.chapterNumbers.indexOf(chapterNumber) + 1;
          state.setGeneratingChapterNum(chapterNumber);
          return generateOneChapter(story, chapterNumber, { index, total: batch.chapterNumbers.length });
        },
      });
    } catch (err: any) {
      console.error(err);
      store_setAppError(err.message || 'Celestial feedback received. Chapter batch generation failed.');
    } finally {
      store_setIsGenerating(false);
      store_setGenerationPhase(null);
      store_setGeneratingChapterNum(null);
      store_setActiveAgentId(null);
      store_setStreamingChapter(null);
      store_setGenerationProgressMessage?.('');
    }
  };

  return { handleGenerateChapter, handleGenerateNextFiveChapters };
};
