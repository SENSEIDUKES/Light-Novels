import { useAppStore } from '../store/useAppStore';
import { GeneratedImage } from '../types';
import { storyApi } from '../services/api';
import { generateId, generateUUID } from '../lib/id';
import {
  MEDIA_PURPOSE,
  MEDIA_TARGET_KIND,
  requirePersistenceUuid,
  saveMediaAsset,
  selectMediaAsset,
} from '../lib/media/mediaAssetClient';
import {
  discardCachedMedia,
  resolveMediaAssetForDisplay,
} from '../lib/media/privateMediaResolver';

export const useVisualAssets = () => {
  const store_stories = useAppStore(state => state.stories);
    const store_setAppError = useAppStore(state => state.setAppError);
    const store_setIsGenerating = useAppStore(state => state.setIsGenerating);
    const store_setGenerationPhase = useAppStore(state => state.setGenerationPhase);
    const store_activeStoryId = useAppStore(state => state.activeStoryId);

  const handleGenerateCover = async (customModifier?: string): Promise<{ imageUrls: string[], promptUsed: string } | undefined> => {
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

      let prompt = `Cover image for a story titled "${activeStory.title}". Genre: ${activeStory.genre}. Core Premise: ${activeStory.customPremise}. Main character visual description: ${mcProfile}. Main visual conflict: ${firstArcPromise}. World aesthetic: ${worldOverview}. Shared visual style: ${styleConfig}. Epic fantasy webnovel book cover, digital painting, textless.`;

      if (customModifier) {
        prompt = `Ascended Sage custom Cover image. Story: "${activeStory.title}". Genre: ${activeStory.genre}. Ultimate theme: ${customModifier}. Core Premise: ${activeStory.customPremise}. Main character visual description: ${mcProfile}. Main visual conflict: ${firstArcPromise}. World aesthetic: ${worldOverview}. Shared visual style: ${styleConfig}. Epic fantasy webnovel book cover, divine sage of branching paths, majestic cosmic aura, digital painting, textless.`;
      }

      const data = await storyApi.generateCardImage(prompt, "cover", currentStoreState.routingConfig.imageGenerator);

      let newImageUrls = data.imageUrls;
      if (!newImageUrls && data.imageUrl) newImageUrls = [data.imageUrl];
      if (!newImageUrls && data.fallbackUrl) newImageUrls = [data.fallbackUrl];

      if (newImageUrls && newImageUrls.length > 0) {
        return { imageUrls: newImageUrls, promptUsed: prompt };
      }
    } catch(err: any) {
      store_setAppError(err.message || "Failed to forge new cover.");
    } finally {
      store_setIsGenerating(false);
      store_setGenerationPhase(null);
    }
    return undefined;
  };

  const handleApplyCover = async (imageUrl: string, promptUsed: string) => {
    const activeStory = store_stories.find(s => s.id === store_activeStoryId);
    if (!activeStory) return;

    const legacyMediaId = generateId(8);
    const storyId = requirePersistenceUuid(
      activeStory.persistenceId ?? activeStory.id,
      'Story',
    );
    const asset = await saveMediaAsset({
      source: imageUrl,
      assetType: 'IMAGE',
      purpose: MEDIA_PURPOSE.STORY_COVER,
      association: {
        targetKind: MEDIA_TARGET_KIND.STORY,
        // Media slots are addressed by the canonical relational id, never the
        // client-facing story id.
        targetKey: storyId,
        storyId,
        legacyMediaId,
        entityType: 'cover',
        promptUsed,
        chapterNumber: activeStory.currentChapterNumber,
      },
      replacesAssetId: activeStory.coverAssetId,
      idempotencyKey: generateUUID(),
    });
    const resolved = await resolveMediaAssetForDisplay(asset);
    if (activeStory.coverAssetId && activeStory.coverAssetId !== asset.id) {
      await discardCachedMedia(activeStory.coverAssetId);
    }

    const imageRecord: GeneratedImage = {
      id: legacyMediaId,
      assetId: asset.id,
      assetVersion: asset.version,
      checksumSha256: asset.checksumSha256,
      deliveryUrlExpiresAt: asset.deliveryUrlExpiresAt ?? undefined,
      entityId: activeStory.id,
      entityType: 'cover',
      imageUrl: resolved.url,
      promptUsed,
      createdAt: new Date().toISOString(),
      isCurrent: true,
      chapterNumber: activeStory.currentChapterNumber
    };

    // Re-read after the media round-trip before deriving the new history, the
    // same way handleSelectCover does. `activeStory` was captured before
    // saveMediaAsset/resolveMediaAssetForDisplay, so deriving from it would
    // drop a cover applied while those requests were in flight. (Only covers
    // are at stake: story-level imageHistory is cover-only — Codex and chapter
    // visuals live on their own owners.)
    const latestStory = useAppStore.getState().stories.find(
      story => story.id === activeStory.id,
    ) ?? activeStory;
    const currentHistory = latestStory.imageHistory || [];
    const updatedHistory: GeneratedImage[] = currentHistory.map(img =>
      img.entityType === 'cover' ? { ...img, isCurrent: false } : img
    ).concat(imageRecord);

    // Was a hook-local copy of handleUpdateStoryDirect (read stories, swap the
    // story, saveStories). The store owns that write now.
    await useAppStore.getState().updateStory(
      activeStory.id,
      {
        persistenceId: storyId,
        imageUrl: resolved.url,
        coverAssetId: asset.id,
        imageHistory: updatedHistory,
        evolutionReady: false,
        availableVisualUpdate: false,
        lastImageChapter: activeStory.currentChapterNumber
      },
      { markEdited: false, touchUpdatedAt: true },
    );
  };

  /**
   * Make a previously generated cover the active story cover. The media slot is
   * authoritative: updating the local URL alone is overwritten the next time
   * the story hydrates from PostgreSQL.
   */
  const handleSelectCover = async (assetId: string): Promise<void> => {
    const selectedAssetId = assetId.trim();
    if (!selectedAssetId) {
      throw new Error('This cover has not been saved to permanent media yet.');
    }

    const currentStoreState = useAppStore.getState();
    const activeStory = currentStoreState.stories.find(
      story => story.id === currentStoreState.activeStoryId,
    );
    if (!activeStory) return;

    const selectedHistory = activeStory.imageHistory?.find(
      image => image.entityType === 'cover' && image.assetId === selectedAssetId,
    );
    if (!selectedHistory) {
      throw new Error('That cover is not recorded in this story\'s saved cover history.');
    }

    const storyId = requirePersistenceUuid(
      activeStory.persistenceId ?? activeStory.id,
      'Story',
    );
    const selectedAsset = await selectMediaAsset(selectedAssetId, {
      targetKind: MEDIA_TARGET_KIND.STORY,
      targetKey: storyId,
      purpose: MEDIA_PURPOSE.STORY_COVER,
      storyId,
      entityType: 'cover',
    });
    const resolved = await resolveMediaAssetForDisplay(selectedAsset);
    if (!resolved.url.trim()) {
      throw new Error('The selected cover could not be resolved and was left unchanged.');
    }

    // Re-read state after the media request so a concurrent story edit is not
    // overwritten while the selected cover is being made current.
    const latestStoreState = useAppStore.getState();
    const latestStory = latestStoreState.stories.find(
      story => story.id === activeStory.id,
    ) ?? activeStory;
    const latestHistory = latestStory.imageHistory ?? [];
    const historyWithSelectedCover = latestHistory.some(
      image => image.entityType === 'cover' && image.assetId === selectedAsset.id,
    )
      ? latestHistory
      : [...latestHistory, selectedHistory];
    const updatedHistory = historyWithSelectedCover.map(image => {
      if (image.entityType !== 'cover') return image;
      if (image.assetId !== selectedAsset.id) return { ...image, isCurrent: false };
      return {
        ...image,
        assetId: selectedAsset.id,
        assetVersion: selectedAsset.version,
        checksumSha256: selectedAsset.checksumSha256,
        deliveryUrlExpiresAt: selectedAsset.deliveryUrlExpiresAt ?? undefined,
        imageUrl: resolved.url,
        isCurrent: true,
      };
    });

    // The re-read above stays: `updatedHistory` is derived from the story's
    // history and has to be computed against a post-request copy. Committing
    // it is the store's job — updateStory applies this patch at the front of
    // the save queue rather than against the snapshot read here.
    await useAppStore.getState().updateStory(
      latestStory.id,
      {
        persistenceId: storyId,
        coverAssetId: selectedAsset.id,
        imageUrl: resolved.url,
        imageHistory: updatedHistory,
      },
      { markEdited: false, touchUpdatedAt: true },
    );
  };

  return {
    handleGenerateCover,
    handleApplyCover,
    handleSelectCover,
  };
};
