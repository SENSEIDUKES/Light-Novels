import { generateId, generateUUID } from '../lib/id';
import { slimMemoryForRequest } from '../lib/slimMemoryForRequest';
import { useAppStore } from '../store/useAppStore';
import { retrieveRelevantContext } from '../lib/rag';
import { Chapter, StoryArc, StoryWorld, Character } from '../types';
import { storyStorage } from '../lib/storage';
import { awardQi } from '../lib/qi';
import { getApiHeaders } from './storyEngineHelpers';
import { getFateLockMessage } from '../lib/fateLock';
import { stripAuthorControlledCodexFields } from '../lib/codexContext';
import { ACTIVE_CONTEXT_ENGINE } from '../lib/contextBlocks';
import { auth } from '../lib/firebase';

const PROVIDER_CHARACTER_STATUSES = new Set<Character['status']>([
  'alive',
  'deceased',
  'unknown',
  'ascended',
]);

const providerString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
};

/** Keep provider-created arc characters inside the generated character contract. */
const sanitizeProviderCharacter = (value: unknown): Character => {
  const candidate = value && typeof value === 'object'
    ? stripAuthorControlledCodexFields(value as Record<string, unknown>)
    : {};
  const requestedStatus = providerString(candidate.status)?.toLocaleLowerCase();
  const status = PROVIDER_CHARACTER_STATUSES.has(requestedStatus as Character['status'])
    ? requestedStatus as Character['status']
    : 'alive';

  return {
    ...candidate,
    id: `char-${generateId(9)}`,
    name: providerString(candidate.name) || 'Unknown',
    role: providerString(candidate.role) || 'Neutral figure',
    description: providerString(candidate.description) || '',
    relationshipToMC: providerString(candidate.relationshipToMC) || 'Neutral',
    status,
  };
};

/**
 * Custom hook managing branching narratives and Arc-level destiny steering.
 * Allows users to forcefully inject a custom direction to the next story volume
 * or branch out from a specific chapter to rewrite history.
 */
export const useArcSteering = () => {
  const store_setActiveAgentIdForRun = useAppStore(state => state.setActiveAgentIdForRun);
    const store_routingConfig = useAppStore(state => state.routingConfig);
    const store_saveStories = useAppStore(state => state.saveStories);
    const store_setSelectedChapterNum = useAppStore(state => state.setSelectedChapterNum);

  /**
   * Appends a new arc to the active story driven by a specific directional prompt.
   * @param {string} direction - The high-level intent (e.g., 'darker', 'romance').
   * @param {string} customPrompt - Custom user-provided narrative instructions.
   */
  const handleSteerArc = async (direction: string, customPrompt: string) => {
    const currentStoreState = useAppStore.getState();
    const activeStory = currentStoreState.stories.find(s => s.id === currentStoreState.activeStoryId);
    if (!activeStory) return;

    // Claimed synchronously, before any async work, so a second click cannot
    // open a second run.
    const run = currentStoreState.startGenerationRun({
      operation: 'steer',
      userId: auth.currentUser?.uid ?? null,
      storyId: activeStory.id,
    });
    if (!run) {
      console.warn("Generation already in progress. Ignoring duplicate click.");
      return;
    }
    const runId = run.runId;
    const accountIsCurrent = () => useAppStore.getState().ownsActiveRun(runId);

    currentStoreState.setAppError(null);

    const totalPreviousChapters = activeStory.arcs.reduce((acc, arc) => acc + arc.chapters.length, 0);
    const queryIntent = `Overall Arc Direction: ${direction}. Extra Context: ${customPrompt || ''}`;
    const nextChapterNumber = totalPreviousChapters + 1;
    
    try {
      store_setActiveAgentIdForRun(runId, 'scout');
      const apiHeaders = await getApiHeaders();
      if (!accountIsCurrent()) return;

      const pastSummaries = await retrieveRelevantContext(
        queryIntent,
        nextChapterNumber,
        activeStory,
        apiHeaders,
        10,
        undefined,
        3,
        ACTIVE_CONTEXT_ENGINE,
      );
      if (!accountIsCurrent()) return;

      store_setActiveAgentIdForRun(runId, 'versa');
      const response = await fetch('/api/steer-arc', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          mcName: activeStory.mcName,
          genre: activeStory.genre,
          customPremise: activeStory.customPremise,
          memory: slimMemoryForRequest(activeStory.memory),
          pastSummaries,
          contextEngine: ACTIVE_CONTEXT_ENGINE,
          currentArcCount: totalPreviousChapters,
          steerDirection: direction,
          userCustomDirections: customPrompt,
          routingConfig: store_routingConfig.storyMaker
        })
      });
      if (!accountIsCurrent()) return;

      if (!response.ok) {
        const errorData = await response.json();
        if (!accountIsCurrent()) return;
        throw new Error(errorData.error || `Story steering broke with status: ${response.status}`);
      }

      const data = await response.json();
      if (!accountIsCurrent()) return;
      if (!Array.isArray(data?.chapters)) {
        throw new Error('Story steering returned invalid chapter data.');
      }

      const nextChapters: Chapter[] = data.chapters.map((ch: any) => ({
        number: ch.number,
        title: ch.title,
        premise: ch.premise,
        status: 'unread'
      }));

      const freshStories = await storyStorage.getStories();
      if (!accountIsCurrent()) return;
      if (!Array.isArray(freshStories)) {
        throw new Error('The story library could not be loaded.');
      }
      const updatedStories = freshStories.map(s => {
        if (s.id !== activeStory.id) return s;

        const nextStoriesMemory = { ...s.memory };

        if (Array.isArray(data.newCharacters) && data.newCharacters.length > 0) {
          const verified = data.newCharacters.map(sanitizeProviderCharacter);
          nextStoriesMemory.characters = [...(nextStoriesMemory.characters || []), ...verified];
        }

        if (data.newUnresolvedPlotThreads && data.newUnresolvedPlotThreads.length > 0) {
          const newThreads = data.newUnresolvedPlotThreads.map((t: string) => ({
            id: `thread-${generateId(9)}`,
            description: t,
            status: 'active',
            originChapter: nextChapters[0]?.number || activeStory.currentChapterNumber
          }));
          nextStoriesMemory.unresolvedPlotThreads = [...(nextStoriesMemory.unresolvedPlotThreads || []), ...newThreads];
        }

        let updatedArcs = [...s.arcs];
        const lastArc = updatedArcs[updatedArcs.length - 1];

        if (lastArc && lastArc.chapters.length < 100) {
          updatedArcs[updatedArcs.length - 1] = {
            ...lastArc,
            chapters: [...lastArc.chapters, ...nextChapters],
            isCompleted: false
          };
        } else {
          const newArcTitle = data.title || `Volume ${s.arcs.length + 1}`;
          updatedArcs = [
            ...updatedArcs,
            { title: newArcTitle, chapters: nextChapters, isCompleted: false },
          ];
        }

        return {
          ...s,
          arcs: updatedArcs,
          memory: nextStoriesMemory,
          updatedAt: new Date().toISOString()
        };
      });

      if (!accountIsCurrent()) return;
      await store_saveStories(updatedStories);
      if (!accountIsCurrent()) return;
      store_setSelectedChapterNum(nextChapters[0].number);
    } catch (err: any) {
      if (!accountIsCurrent()) return;
      console.error(err);
      useAppStore.getState().failGenerationRun(
        runId,
        err.message || "Failed to steer next story arc successfully.",
      );
    } finally {
      useAppStore.getState().completeGenerationRun(runId);
    }
  };

  /**
   * Forks the active story at a specified chapter and steers the narrative down a new path.
   * @param {number} chapterNumber - The chapter to fork from.
   * @param {string} direction - The new narrative direction to take.
   * @param {string} customPrompt - Additional user narrative constraints.
   */
  const handleAlterFate = async (chapterNumber: number, direction: string, customPrompt: string) => {
    const currentStoreState = useAppStore.getState();
    const activeStory = currentStoreState.stories.find(s => s.id === currentStoreState.activeStoryId);
    if (!activeStory) return;
    const fateLockMessage = getFateLockMessage(activeStory, chapterNumber);
    if (fateLockMessage) {
      currentStoreState.setAppError(fateLockMessage);
      return;
    }

    // The fork's id is minted here, before the run is claimed, so the run owns
    // the story it will actually write to. The origin story stays in this
    // closure, and the `setActiveStoryId(newStory.id)` further down is only a
    // reader selection change — it cannot move what this run owns.
    const newStoryId = generateUUID();
    // Claimed synchronously, before any async/complex operations.
    const run = currentStoreState.startGenerationRun({
      operation: 'steer',
      userId: auth.currentUser?.uid ?? null,
      storyId: newStoryId,
    });
    if (!run) {
      console.warn("Generation already in progress. Ignoring duplicate click.");
      return;
    }
    const runId = run.runId;
    const accountIsCurrent = () => useAppStore.getState().ownsActiveRun(runId);

    try {
    const clonedArcsRaw = await Promise.all(activeStory.arcs.map(async arc => {
      const slicedChapters = arc.chapters.filter(ch => ch.number <= chapterNumber);
      const hydratedChapters = await Promise.all(slicedChapters.map(async ch => {
        if (ch.hasContent || ch.generatedContent) {
          const content = await storyStorage.getChapterContent(activeStory.id, ch.number);
          if (!accountIsCurrent()) return ch;
          if (content) {
            return {
              ...ch,
              generatedContent: content.generatedContent,
              blocks: content.blocks,
              summary: content.summary,
              statsChangeMessage: content.statsChangeMessage,
              cuePayload: content.cuePayload,
              _isNewContent: true
            };
          }
        }
        return ch;
      }));
      return { ...arc, chapters: hydratedChapters };
    }));
    if (!accountIsCurrent()) return;
    
    const clonedArcs = clonedArcsRaw.filter(arc => arc.chapters.length > 0);

    const clonedBookmarks = (activeStory.bookmarks || []).filter(b => b.chapterNumber <= chapterNumber);

    const newStory: StoryWorld = {
      ...activeStory,
      id: newStoryId,
      persistenceId: newStoryId,
      parentStoryId: activeStory.persistenceId ?? activeStory.id,
      forkChapterNumber: chapterNumber,
      title: `[Fate Fork] ${activeStory.title}`,
      arcs: clonedArcs,
      bookmarks: clonedBookmarks,
      // A fork has its own future. It must not inherit a paused or failed
      // generation queue from the parent timeline.
      chapterGenerationBatch: undefined,
      updatedAt: new Date().toISOString()
    };

    if (!accountIsCurrent()) return;
    const updated = [newStory, ...currentStoreState.stories];
    if (!accountIsCurrent()) return;
    await currentStoreState.saveStories(updated);
    if (!accountIsCurrent()) return;
    currentStoreState.setActiveStoryId(newStory.id);

    currentStoreState.setAppError(null);

    const totalPreviousChapters = clonedArcs.reduce((acc, arc) => acc + arc.chapters.length, 0);
    const queryIntent = `Overall Arc Direction: ${direction}. Extra Context: ${customPrompt || ''}`;
    const nextChapterNumber = totalPreviousChapters + 1;
    
      store_setActiveAgentIdForRun(runId, 'scout');
      const apiHeaders = await getApiHeaders();
      if (!accountIsCurrent()) return;

      const pastSummaries = await retrieveRelevantContext(
        queryIntent,
        nextChapterNumber,
        newStory,
        apiHeaders,
        10,
        undefined,
        3,
        ACTIVE_CONTEXT_ENGINE,
      );
      if (!accountIsCurrent()) return;

      store_setActiveAgentIdForRun(runId, 'versa');
      const response = await fetch('/api/steer-arc', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          mcName: newStory.mcName,
          genre: newStory.genre,
          customPremise: newStory.customPremise,
          memory: slimMemoryForRequest(newStory.memory),
          pastSummaries,
          contextEngine: ACTIVE_CONTEXT_ENGINE,
          currentArcCount: totalPreviousChapters,
          steerDirection: direction,
          userCustomDirections: customPrompt,
          routingConfig: store_routingConfig.storyMaker
        })
      });
      if (!accountIsCurrent()) return;

      if (!response.ok) {
        const errorData = await response.json();
        if (!accountIsCurrent()) return;
        throw new Error(errorData.error || `Story fork broke with status: ${response.status}`);
      }

      const data = await response.json();
      if (!accountIsCurrent()) return;
      if (!Array.isArray(data?.chapters)) {
        throw new Error('Story fork returned invalid chapter data.');
      }

      const nextChapters: Chapter[] = data.chapters.map((ch: any) => ({
        number: ch.number,
        title: ch.title,
        premise: ch.premise,
        status: 'unread'
      }));

      const freshStories = await storyStorage.getStories();
      if (!accountIsCurrent()) return;
      if (!Array.isArray(freshStories)) {
        throw new Error('The story library could not be loaded.');
      }
      const updatedStories = freshStories.map((s: StoryWorld) => {
        if (s.id !== newStory.id) return s;

        const nextStoriesMemory = { ...s.memory };

        if (Array.isArray(data.newCharacters) && data.newCharacters.length > 0) {
          const verified = data.newCharacters.map(sanitizeProviderCharacter);
          nextStoriesMemory.characters = [...(nextStoriesMemory.characters || []), ...verified];
        }

        if (data.newUnresolvedPlotThreads && data.newUnresolvedPlotThreads.length > 0) {
          const newThreads = data.newUnresolvedPlotThreads.map((t: string) => ({
            id: `thread-${generateId(9)}`,
            description: t,
            status: 'active',
            originChapter: nextChapters[0]?.number || chapterNumber
          }));
          nextStoriesMemory.unresolvedPlotThreads = [...(nextStoriesMemory.unresolvedPlotThreads || []), ...newThreads];
        }

        let updatedArcs = [...s.arcs];
        const lastArc = updatedArcs[updatedArcs.length - 1];

        if (lastArc && lastArc.chapters.length < 100) {
          updatedArcs[updatedArcs.length - 1] = {
            ...lastArc,
            chapters: [...lastArc.chapters, ...nextChapters],
            isCompleted: false
          };
        } else {
          const newArcTitle = data.title || `Vivergence Path`;
          updatedArcs = [
            ...updatedArcs,
            { title: newArcTitle, chapters: nextChapters, isCompleted: false },
          ];
        }

        return {
          ...s,
          arcs: updatedArcs,
          memory: nextStoriesMemory,
          updatedAt: new Date().toISOString()
        };
      });

      if (!accountIsCurrent()) return;
      await store_saveStories(updatedStories);
      if (!accountIsCurrent()) return;
      store_setSelectedChapterNum(nextChapters[0].number);
      if (!accountIsCurrent()) return;
      awardQi('branch_created');
    } catch (err: any) {
      if (!accountIsCurrent()) return;
      console.error(err);
      useAppStore.getState().failGenerationRun(
        runId,
        err.message || "Failed to alter fate successfully.",
      );
    } finally {
      useAppStore.getState().completeGenerationRun(runId);
    }
  };

  return { handleSteerArc, handleAlterFate };
};
