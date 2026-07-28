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
import { validateChapterHandoff } from './chapterPipeline/validateChapterHandoff';
import { persistGeneratedChapter } from './chapterPipeline/persistGeneratedChapter';
import { auth } from '../lib/firebase';
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

  const persistBatch = async (
    story: Story,
    batch: ChapterGenerationBatch,
    accountIsCurrent: () => boolean,
  ): Promise<Story> => {
    if (!accountIsCurrent()) return story;
    const state = useAppStore.getState();
    const updatedStories = state.stories.map(currentStory =>
      currentStory.id === story.id
        ? { ...currentStory, chapterGenerationBatch: batch, updatedAt: new Date().toISOString() }
        : currentStory
    );
    const updatedStory = updatedStories.find(currentStory => currentStory.id === story.id);
    if (!updatedStory) throw new Error('The active story is no longer available.');
    if (!accountIsCurrent()) return story;
    await state.saveStories(updatedStories);
    if (!accountIsCurrent()) return story;
    return updatedStory;
  };

  const generateOneChapter = async (
    activeStory: Story,
    chapterNumber: number,
    accountIsCurrent: () => boolean,
    batchProgress: BatchProgress = null,
  ): Promise<Story> => {
    if (!accountIsCurrent()) return activeStory;
    const selectedArcIndex = activeStory.arcs.findIndex(arc => arc.chapters.some(chapter => chapter.number === chapterNumber));
    if (selectedArcIndex === -1) throw new Error(`Chapter ${chapterNumber} is not part of the active story.`);

    const currentArc = activeStory.arcs[selectedArcIndex];
    const targetChapter = currentArc.chapters.find(chapter => chapter.number === chapterNumber);
    if (!targetChapter) throw new Error(`Chapter ${chapterNumber} could not be found.`);

    const setProgress = (message: string) => {
      if (!accountIsCurrent()) return;
      const prefix = batchProgress
        ? `Forging Chapter ${chapterNumber} · ${batchProgress.index} of ${batchProgress.total}`
        : '';
      store_setGenerationProgressMessage?.(prefix && message ? `${prefix} — ${message}` : prefix || message);
    };

    store_setActiveAgentId('scout');
    const apiHeaders = await getApiHeaders();
    if (!accountIsCurrent()) return activeStory;
    const {
      pastSummaries,
      pacingDirective,
      chapterContract,
      previousHandoff,
    } = await buildChapterContext(activeStory, targetChapter, apiHeaders);
    if (!accountIsCurrent()) return activeStory;

    store_setActiveAgentId('versa');
    setProgress('VERSA is weaving the chapter into being...');
    const { accumulatedRaw, contextManifest } = await streamChapterBlocks(
      activeStory,
      targetChapter,
      pastSummaries,
      pacingDirective,
      store_routingConfig.storyMaker,
      apiHeaders,
      (currentChapterText, blocksData, raw) => {
        if (!accountIsCurrent()) return;
        useAppStore.getState().setStreamingChapter({
          number: chapterNumber,
          content: currentChapterText || raw,
          blocks: blocksData,
        });
      },
      chapterContract,
    );
    if (!accountIsCurrent()) return activeStory;

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
      { targetChapterNumber: chapterNumber, previousHandoff },
    );
    if (!accountIsCurrent()) return activeStory;

    if (continuityResult.finalRawBlocksStr !== finalRawBlocksStr) {
      finalRawBlocksStr = continuityResult.finalRawBlocksStr;
      const repaired = parseChapterStream(finalRawBlocksStr);
      data.blocks = repaired.data.blocks;
      data.chapterText = repaired.data.chapterText;
    }
    data.hasContinuityFaults = continuityResult.hasContinuityFaults;
    data.continuityWarnings = continuityResult.continuityWarnings;
    data.continuitySoftNotes = continuityResult.continuitySoftNotes;
    data = await extractChapterMetadata(targetChapter, finalRawBlocksStr, store_routingConfig.storyMaker, apiHeaders, data, chapterContract);
    if (!accountIsCurrent()) return activeStory;
    data.contextManifest = contextManifest;
    data.contract = chapterContract;

    // Stage B (Context Engine 2.5): deterministic handoff-vs-contract checks.
    // Prose is final here, so this stage only annotates — it never repairs.
    const priorFingerprints = activeStory.arcs
      .flatMap(arc => arc.chapters)
      .filter(chapter => chapter.number < chapterNumber)
      .flatMap(chapter => chapter.sceneFingerprints || []);
    const handoffValidation = validateChapterHandoff({
      chapterNumber,
      handoff: data.handoff,
      contract: chapterContract,
      contractReport: data.contractReport,
      memoryUpdates: data.memoryUpdates,
      memory: activeStory.memory,
      priorFingerprints,
      premise: targetChapter.premise,
    });
    if (handoffValidation.hardFaults.length > 0) {
      data.hasContinuityFaults = true;
      data.continuityWarnings = [
        ...(data.continuityWarnings || []),
        ...handoffValidation.hardFaults,
      ];
    }
    if (handoffValidation.warnings.length > 0) {
      data.continuitySoftNotes = [
        ...(data.continuitySoftNotes || []),
        ...handoffValidation.warnings,
      ];
    }

    if (!accountIsCurrent()) return activeStory;
    const updatedStories = await persistGeneratedChapter(
      activeStory,
      chapterNumber,
      selectedArcIndex,
      data,
      apiHeaders,
      accountIsCurrent,
    );
    if (!accountIsCurrent() || !updatedStories) return activeStory;
    await store_saveStories(updatedStories);
    if (!accountIsCurrent()) return activeStory;
    const updatedStory = updatedStories.find(story => story.id === activeStory.id);
    if (!updatedStory) throw new Error('The generated story could not be persisted.');

    if (!accountIsCurrent()) return activeStory;
    awardQi('chapter_generated');
    void import('../lib/artifacts').then(({ scanChapterForArtifacts }) => {
      if (!accountIsCurrent()) return;
      const fullText = `${data.chapterText || ''} ${(data.blocks || []).map((block: any) => block.text).join(' ')}`;
      return scanChapterForArtifacts(activeStory.id, activeStory.title, chapterNumber, fullText, data);
    }).catch(err => {
      if (accountIsCurrent()) {
        console.error('Failed to scan chapter for artifacts:', err);
      }
    });
    if (chapterNumber === 5 && accountIsCurrent()) {
      void unlockCosmicArtifact('chapter_5', activeStory.id, activeStory.title).catch(err => {
        if (accountIsCurrent()) {
          console.error('Failed to unlock Chapter 5 artifact:', err);
        }
      });
    }

    return updatedStory;
  };

  const handleGenerateChapter = async (chapterNumber: number) => {
    const state = useAppStore.getState();
    const initiatingUserId = auth.currentUser?.uid ?? null;
    const accountIsCurrent = () =>
      (auth.currentUser?.uid ?? null) === initiatingUserId;
    if (state.isGenerating) {
      console.warn('Generation already in progress. Ignoring duplicate click.');
      return;
    }

    state.setIsGenerating(true);
    state.setGeneratingChapterNum(chapterNumber);
    state.setIsVeilMinimized?.(false);
    const activeStory = state.stories.find(story => story.id === state.activeStoryId);
    if (!activeStory) {
      if (accountIsCurrent()) {
        state.setIsGenerating(false);
        state.setGeneratingChapterNum(null);
      }
      return;
    }

    state.setGenerationPhase('chapter');
    state.setAppError(null);
    try {
      await generateOneChapter(activeStory, chapterNumber, accountIsCurrent);
    } catch (err: any) {
      if (!accountIsCurrent()) return;
      console.error(err);
      store_setAppError(err.message || 'Celestial feedback received. Chapter generation failed.');
    } finally {
      if (accountIsCurrent()) {
        store_setIsGenerating(false);
        store_setGenerationPhase(null);
        store_setGeneratingChapterNum(null);
        store_setActiveAgentId(null);
        store_setStreamingChapter(null);
        store_setGenerationProgressMessage?.('');
      }
    }
  };

  const handleGenerateNextFiveChapters = async (fromChapterNumber: number) => {
    const state = useAppStore.getState();
    const initiatingUserId = auth.currentUser?.uid ?? null;
    const accountIsCurrent = () =>
      (auth.currentUser?.uid ?? null) === initiatingUserId;
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
      const preparedStory = await persistBatch(activeStory, batch, accountIsCurrent);
      if (!accountIsCurrent()) return;
      await runSequentialChapterBatch({
        story: preparedStory,
        batch,
        persistBatch: (story, nextBatch) => persistBatch(story, nextBatch, accountIsCurrent),
        accountIsCurrent,
        generateChapter: (story, chapterNumber) => {
          if (!accountIsCurrent()) return Promise.resolve(story);
          const index = batch.chapterNumbers.indexOf(chapterNumber) + 1;
          state.setGeneratingChapterNum(chapterNumber);
          return generateOneChapter(
            story,
            chapterNumber,
            accountIsCurrent,
            { index, total: batch.chapterNumbers.length },
          );
        },
      });
    } catch (err: any) {
      if (!accountIsCurrent()) return;
      console.error(err);
      store_setAppError(err.message || 'Celestial feedback received. Chapter batch generation failed.');
    } finally {
      if (accountIsCurrent()) {
        store_setIsGenerating(false);
        store_setGenerationPhase(null);
        store_setGeneratingChapterNum(null);
        store_setActiveAgentId(null);
        store_setStreamingChapter(null);
        store_setGenerationProgressMessage?.('');
      }
    }
  };

  return { handleGenerateChapter, handleGenerateNextFiveChapters };
};
