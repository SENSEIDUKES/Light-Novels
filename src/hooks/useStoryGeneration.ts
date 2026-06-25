import { useAppStore } from '../store/useAppStore';
import { IntakeData, WorldBlueprint, Chapter, Story } from '../types';
import { auth } from '../lib/firebase';
import { awardQi } from '../lib/qi';
import { storyApi } from '../services/api';

export const useStoryGeneration = () => {
  const store = useAppStore();

  const handleGenerateBlueprint = async (intake: IntakeData): Promise<WorldBlueprint> => {
    const currentStoreState = useAppStore.getState();
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
      return blueprint;
    } catch (err: any) {
      console.error(err);
      currentStoreState.setAppError(err.message || "Failed to generate world blueprint.");
      throw err;
    } finally {
      currentStoreState.setIsGenerating(false);
      currentStoreState.setGenerationPhase(null);
      currentStoreState.setActiveAgentId(null);
    }
  };

  const handleStartStory = async (intake: IntakeData, blueprint: WorldBlueprint, chapterCount: number) => {
    const currentStoreState = useAppStore.getState();
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

      const formattedChapters: Chapter[] = responseData.chapters.map((ch: any) => ({
        number: ch.number,
        title: ch.title,
        premise: ch.premise,
        status: 'unread'
      }));

      const newStory: Story = {
        id: `story-${Date.now()}`,
        userId: auth.currentUser?.uid || undefined,
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
            id: `char-${Math.random().toString(36).substr(2, 9)}`,
            ...c
          })) || [],
          unresolvedPlotThreads: (responseData.unresolvedPlotThreads || []).map((t: any) => ({
            id: `thread-${Math.random().toString(36).substr(2, 9)}`,
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

      const updated = [newStory, ...store.stories];
      await store.saveStories(updated);
      store.setActiveStoryId(newStory.id);
      store.setSelectedChapterNum(1);
      store.setCurrentScreen('detail');
      awardQi('world_created');
    } catch (err: any) {
      console.error(err);
      store.setAppError(err.message || "Failed to align celestial gates.");
    } finally {
      store.setIsGenerating(false);
      store.setGenerationPhase(null);
      store.setActiveAgentId(null);
    }
  };

  return {
    handleGenerateBlueprint,
    handleStartStory
  };
};
