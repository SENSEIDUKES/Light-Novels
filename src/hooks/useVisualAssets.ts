import { useAppStore } from '../store/useAppStore';
import { GeneratedImage, StoryWorld } from '../types';
import { storyApi } from '../services/api';

export const useVisualAssets = () => {
  const store = useAppStore();

  const handleUpdateStoryDirect = async (updatedStory: StoryWorld) => {
    updatedStory.updatedAt = new Date().toISOString();
    const updated = store.stories.map(s => s.id === updatedStory.id ? updatedStory : s);
    await store.saveStories(updated);
  };

  const handleGenerateCover = async (): Promise<{ imageUrls: string[], promptUsed: string } | undefined> => {
    const currentStoreState = useAppStore.getState();
    if (currentStoreState.isGenerating) {
      console.warn("Generation already in progress. Ignoring duplicate click.");
      return undefined;
    }
    currentStoreState.setIsGenerating(true);

    const activeStory = currentStoreState.stories.find(s => s.id === currentStoreState.activeStoryId);
    if (!activeStory) {
      currentStoreState.setIsGenerating(false);
      return undefined;
    }
    currentStoreState.setGenerationPhase('cover');
    currentStoreState.setAppError(null);
    try {
      const styleConfig = activeStory.blueprint?.styleBible || "Chinese light novel world aesthetic, xianxia / wuxia fantasy illustration, cinematic, mystical, premium webnovel art.";
      const mcProfile = activeStory.blueprint?.mcProfile || activeStory.mcName;
      const worldOverview = activeStory.blueprint?.worldOverview || activeStory.genre;
      const firstArcPromise = activeStory.blueprint?.firstArcPromise || activeStory.customPremise;

      const prompt = `Cover image for a story titled "${activeStory.title}". Genre: ${activeStory.genre}. Core Premise: ${activeStory.customPremise}. Main character visual description: ${mcProfile}. Main visual conflict: ${firstArcPromise}. World aesthetic: ${worldOverview}. Shared visual style: ${styleConfig}. Epic fantasy webnovel book cover, digital painting, textless.`;

      const data = await storyApi.generateCardImage(prompt, "cover", currentStoreState.routingConfig.imageGenerator);

      let newImageUrls = data.imageUrls;
      if (!newImageUrls && data.imageUrl) newImageUrls = [data.imageUrl];
      if (!newImageUrls && data.fallbackUrl) newImageUrls = [data.fallbackUrl];

      if (newImageUrls && newImageUrls.length > 0) {
        return { imageUrls: newImageUrls, promptUsed: prompt };
      }
    } catch(err: any) {
      store.setAppError(err.message || "Failed to forge new cover.");
    } finally {
      store.setIsGenerating(false);
      store.setGenerationPhase(null);
    }
    return undefined;
  };

  const handleApplyCover = async (imageUrl: string, promptUsed: string) => {
    const activeStory = store.stories.find(s => s.id === store.activeStoryId);
    if (!activeStory) return;

    const imageRecord: GeneratedImage = {
      id: Math.random().toString(36).substring(2, 10),
      entityId: activeStory.id,
      entityType: 'cover',
      imageUrl,
      promptUsed,
      createdAt: new Date().toISOString(),
      isCurrent: true,
      chapterNumber: activeStory.currentChapterNumber
    };
    
    const currentHistory = activeStory.imageHistory || [];
    const updatedHistory: GeneratedImage[] = currentHistory.map(img => 
      img.entityType === 'cover' ? { ...img, isCurrent: false } : img
    ).concat(imageRecord);

    handleUpdateStoryDirect({ 
      ...activeStory, 
      imageUrl,
      imageHistory: updatedHistory,
      evolutionReady: false,
      availableVisualUpdate: false,
      lastImageChapter: activeStory.currentChapterNumber
    });
  };

  return {
    handleGenerateCover,
    handleApplyCover
  };
};
