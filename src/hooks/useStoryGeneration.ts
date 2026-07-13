import { generateId, generateUUID } from '../lib/id';
import { useAppStore } from '../store/useAppStore';
import { IntakeData, WorldBlueprint, Chapter, Story } from '../types';
import { auth } from '../lib/firebase';
import { awardQi } from '../lib/qi';
import { storyApi } from '../services/api';

export const useStoryGeneration = () => {
    const store_saveStories = useAppStore(state => state.saveStories);
    const store_setActiveStoryId = useAppStore(state => state.setActiveStoryId);
    const store_setSelectedChapterNum = useAppStore(state => state.setSelectedChapterNum);
    const store_setCurrentScreen = useAppStore(state => state.setCurrentScreen);
    const store_setAppError = useAppStore(state => state.setAppError);
    const store_setIsGenerating = useAppStore(state => state.setIsGenerating);
    const store_setGenerationPhase = useAppStore(state => state.setGenerationPhase);
    const store_setActiveAgentId = useAppStore(state => state.setActiveAgentId);

  const handleGenerateBlueprint = async (intake: IntakeData): Promise<WorldBlueprint> => {
    const currentStoreState = useAppStore.getState();
    const initiatingUserId = auth.currentUser?.uid ?? null;
    const accountIsCurrent = () =>
      (auth.currentUser?.uid ?? null) === initiatingUserId;
    if (currentStoreState.isGenerating) {
      console.warn("Generation already in progress. Ignoring duplicate click.");
      return {} as any;
    }
    currentStoreState.setIsGenerating(true);
    currentStoreState.setGenerationPhase('blueprint');
    currentStoreState.setActiveAgentId('versa');
    currentStoreState.setAppError(null);
    try {
      const blueprint = await storyApi.generateBlueprint(intake, currentStoreState.routingConfig.storyMaker);
      if (!accountIsCurrent()) {
        throw new Error('Active account changed while generating the blueprint');
      }
      return blueprint;
    } catch (err: any) {
      console.error(err);
      if (accountIsCurrent()) {
        currentStoreState.setAppError(err.message || "Failed to generate world blueprint.");
      }
      throw err;
    } finally {
      currentStoreState.setIsGenerating(false);
      currentStoreState.setGenerationPhase(null);
      currentStoreState.setActiveAgentId(null);
    }
  };

  const handleStartStory = async (intake: IntakeData, blueprint: WorldBlueprint, chapterCount: number) => {
    const currentStoreState = useAppStore.getState();
    const initiatingUserId = auth.currentUser?.uid ?? null;
    const accountIsCurrent = () =>
      (auth.currentUser?.uid ?? null) === initiatingUserId;
    if (currentStoreState.isGenerating) {
      console.warn("Generation already in progress. Ignoring duplicate click.");
      return;
    }
    currentStoreState.setIsGenerating(true);
    currentStoreState.setGenerationPhase('initial-arc');
    currentStoreState.setActiveAgentId('versa');
    currentStoreState.setAppError(null);

    try {
      const responseData = await storyApi.generateInitialArc(
        intake,
        blueprint,
        chapterCount,
        currentStoreState.routingConfig.storyMaker
      );
      if (!accountIsCurrent()) {
        console.warn('Discarded generated story because the active account changed.');
        return;
      }

      const formattedChapters: Chapter[] = responseData.chapters.map((ch: any) => ({
        number: ch.number,
        title: ch.title,
        premise: ch.premise,
        status: 'unread'
      }));

      const newStory: Story = {
        id: `story-${generateUUID()}`,
        userId: initiatingUserId || undefined,
        title: responseData.title || blueprint.title || 'The Ascension Chronicles',
        genre: intake.genrePath || 'Xianxia',
        mcName: intake.mcName || 'Unknown',
        customPremise: intake.corePremise || blueprint.logline || '',
        intake: intake,
        blueprint: blueprint,
        hardcoreFateMode: !!intake.hardcoreFateMode,
        fatePressure: intake.fatePressure || 'Balanced',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currentChapterNumber: 1,
        memory: {
          powerSystem: responseData.powerSystem || blueprint.powerSystemOutline,
          currentPowerStage: responseData.currentPowerStage || 'Novice stage',
          worldRules: responseData.worldRules || ['Survival of the fittest'],
          characters: responseData.characters?.map((c: any) => ({
            id: `char-${generateId(9)}`,
            ...c
          })) || [],
          unresolvedPlotThreads: (responseData.unresolvedPlotThreads || []).map((t: any) => ({
            id: `thread-${generateId(9)}`,
            description: typeof t === 'string' ? t : t.description,
            status: 'active',
            originChapter: 1
          })),
          resolvedPlotThreads: []
        },
        arcs: [
          {
            title: responseData.title || 'Volume I Genesis',
            chapters: formattedChapters,
            isCompleted: false
          }
        ]
      };

      const updated = [newStory, ...useAppStore.getState().stories];
      await store_saveStories(updated);
      if (!accountIsCurrent()) return;
      store_setActiveStoryId(newStory.id);
      store_setSelectedChapterNum(1);
      store_setCurrentScreen('detail');
      awardQi('world_created');
    } catch (err: any) {
      console.error(err);
      if (accountIsCurrent()) {
        store_setAppError(err.message || "Failed to align celestial gates.");
      }
    } finally {
      store_setIsGenerating(false);
      store_setGenerationPhase(null);
      store_setActiveAgentId(null);
    }
  };

  return {
    handleGenerateBlueprint,
    handleStartStory
  };
};
