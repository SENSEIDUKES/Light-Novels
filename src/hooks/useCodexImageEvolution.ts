import { useState } from 'react';
import { StoryMemory, StoryWorld, GeneratedImage, MultiModelRouting, UpdateStoryFields } from '../types';
import { secureStorage } from '../lib/encryption';
import { checkAndConsumeImageQuota } from '../lib/quota';
import { useAppStore } from '../store/useAppStore';
import { isHubStoryLockedForUser } from '../lib/hubStories';
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

export function useCodexImageEvolution(
  memory: StoryMemory,
  activeStory: StoryWorld,
  updateStoryFields: UpdateStoryFields,
  routingConfig: MultiModelRouting | undefined,
  pushNotification: (msg: string) => void
) {
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, { urls: string[], prompt: string, selectedIndex: number, type: 'character' | 'location' | 'artifact' | 'beast' }>>({});

  /**
   * Restore a previous manifestation.
   *
   * The version is addressed by its durable history id. It used to be matched
   * on the rendered `imageUrl`, which is a signed projection the server blanks
   * for every non-current version — so once a story round-tripped through
   * PostgreSQL every older version shared the same empty URL and reverting
   * silently restored whichever one happened to be first.
   */
  const handleRevertImage = async (id: string, type: string, historyId: string) => {
    try {
      const entity = type === 'location'
        ? memory.locations?.find(item => item.id === id)
        : type === 'artifact'
          ? memory.artifacts?.find(item => item.id === id)
          : memory.characters?.find(item => item.id === id);
      // Manifestation history belongs to its Codex owner. Story history is
      // cover-only, so consulting it here would revive the old combined-history
      // model and make a portrait revert mutate the wrong aggregate field.
      const selectedHistory = entity?.imageHistory?.find(image => image.id === historyId);
      if (!selectedHistory) {
        console.error(`No manifestation ${historyId} is recorded for codex entry ${id}.`);
        setGenerationError('That manifestation is no longer recorded and cannot be restored.');
        return;
      }
      // A superseded version comes back from PostgreSQL with a blank `imageUrl`
      // — its `assetId` is the only way to re-sign one. A version carrying
      // neither has nothing to restore, and committing that blank would erase
      // the live portrait this revert was asked to change.
      if (!selectedHistory.assetId && !selectedHistory.imageUrl?.trim()) {
        setGenerationError('That manifestation is no longer stored and cannot be restored.');
        return;
      }
      let selectedUrl = selectedHistory.imageUrl ?? '';
      if (selectedHistory.assetId) {
        const targetKind = type === 'location'
          ? MEDIA_TARGET_KIND.LOCATION
          : type === 'artifact'
            ? MEDIA_TARGET_KIND.ARTIFACT
            : type === 'beast'
              ? MEDIA_TARGET_KIND.BEAST
              : MEDIA_TARGET_KIND.CHARACTER;
        const entityPersistenceId = requirePersistenceUuid(
          entity?.persistenceId ?? entity?.id,
          `${type} entity`,
        );
        const descriptor = await selectMediaAsset(selectedHistory.assetId, {
          targetKind,
          targetKey: entityPersistenceId,
          purpose: MEDIA_PURPOSE.MANIFESTATION,
          storyId: requirePersistenceUuid(activeStory.persistenceId ?? activeStory.id, 'Story'),
          entityId: entityPersistenceId,
        });
        // Render the cached blob rather than the raw signed URL so a reverted
        // image keeps working after that short-lived signature expires.
        selectedUrl = (await resolveMediaAssetForDisplay(descriptor)).url;
      }
      // Resolution can still yield nothing — a descriptor whose delivery URL
      // could not be signed. Commit only a URL that actually renders.
      if (!selectedUrl.trim()) {
        setGenerationError('That manifestation could not be resolved and was left unchanged.');
        return;
      }
      // The entity's own history is what round-trips, so the restored version
      // has to be marked current on that owner.
      const revertEntity = <T extends { id: string; imageUrl?: string; imageAssetId?: string; imageHistory?: GeneratedImage[] }>(
        candidate: T,
      ): T => candidate.id === id
        ? {
            ...candidate,
            imageUrl: selectedUrl,
            imageAssetId: selectedHistory.assetId ?? candidate.imageAssetId,
            imageHistory: candidate.imageHistory?.map(img => ({
              ...img,
              imageUrl: img.id === selectedHistory.id ? selectedUrl : img.imageUrl,
              isCurrent: img.id === selectedHistory.id,
            })),
          }
        : candidate;

      let finalMemory = { ...memory };
      if (type === 'character' || type === 'beast') {
        finalMemory = { ...memory, characters: (memory.characters || []).map(revertEntity) };
      } else if (type === 'location') {
        finalMemory = { ...memory, locations: (memory.locations || []).map(revertEntity) };
      } else if (type === 'artifact') {
        finalMemory = { ...memory, artifacts: (memory.artifacts || []).map(revertEntity) };
      }

      void updateStoryFields(activeStory.id, { memory: finalMemory });
    } catch (error) {
      console.error('Failed to revert the codex image:', error);
      setGenerationError(error instanceof Error ? error.message : 'Failed to revert the codex image.');
    }
  };

  const handleAwakenCardImage = async (
    id: string, 
    type: 'character' | 'location' | 'artifact' | 'beast', 
    entity: any
  ) => {
    setGeneratingId(id);
    setGenerationError(null);

    const styleConfig = activeStory.blueprint?.styleBible || "Chinese light novel world aesthetic, xianxia / wuxia fantasy illustration, cinematic, mystical, premium webnovel art.";
    const accumulationContext = entity.arcAccumulation ? ` Recent arc events affecting their aura: ${entity.arcAccumulation}.` : "";

    let targetPrompt = "";
    if (type === 'character') {
      targetPrompt = `Character image. Name: ${entity.name}. Visual description: ${entity.description}. Role: ${entity.role}. Current state/status: ${entity.status}. Power level / aura: ${entity.powerLevel || 'Unknown'}.${accumulationContext} Shared visual style: ${styleConfig}.`;
    } else if (type === 'beast') {
      targetPrompt = `Beast image. Name: ${entity.name}. Species/Type: ${entity.beastProfile?.bodyType || 'Unknown Beast'}. Visual description: ${entity.description}. Evolution state/Threat Tier: ${entity.beastProfile?.threatTier || 'Unknown'}. Aura / element style: ${entity.beastProfile?.element || 'Unknown'}.${accumulationContext} Shared visual style: ${styleConfig}.`;
    } else if (type === 'location') {
      targetPrompt = `Location image. Name: ${entity.name}. Visual description: ${entity.description}. Realm/Zone type: ${entity.realm || 'Unknown'}. Atmosphere/Safety: ${entity.safetyLevel || 'Unknown'}.${accumulationContext} Shared visual style: ${styleConfig}.`;
    } else if (type === 'artifact') {
      targetPrompt = `Artifact image. Name: ${entity.name}. Visual description: ${entity.description}. Tier/Rarity: ${entity.tier || 'Unknown'}. Aura/Energy style: visually striking.${accumulationContext} Shared visual style: ${styleConfig}.`;
    }

    try {
      const userProfile = useAppStore.getState().userProfile;
      if (isHubStoryLockedForUser(activeStory, userProfile)) {
        pushNotification("Ascend to the Inner Sect to customize hub story visual representations!");
        throw new Error("Mortal tier users cannot customize the original codex of hub stories.");
      }

      await checkAndConsumeImageQuota();

      const apiHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      const gemini = await secureStorage.getItem('@seihouse/api-key-gemini');
      const openrouter = await secureStorage.getItem('@seihouse/api-key-openrouter');
      const ollama = await secureStorage.getItem('@seihouse/api-key-ollama-host');
      if (gemini) apiHeaders['x-gemini-key'] = gemini;
      if (openrouter) apiHeaders['x-openrouter-key'] = openrouter;
      if (ollama) apiHeaders['x-ollama-host'] = ollama;

      const res = await fetch('/api/generate-card-image', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({ prompt: targetPrompt, type, routingConfig })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Aetherial alignment gate failed to synchronize imagery.");
      }

      let newImageUrls = data.imageUrls;
      if (!newImageUrls && data.imageUrl) newImageUrls = [data.imageUrl];
      if (!newImageUrls && data.fallbackUrl) newImageUrls = [data.fallbackUrl];

      if (newImageUrls && newImageUrls.length > 0) {
        setPreviews(prev => ({ ...prev, [id]: { urls: newImageUrls, prompt: targetPrompt, selectedIndex: 0, type } }));
      } else {
        throw new Error("No imagery frames returned.");
      }

    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || "Failed to trigger visual aura synthesis.");
    } finally {
      setGeneratingId(null);
    }
  };

  const handleSaveEvolution = async (id: string, type: 'character' | 'location' | 'artifact' | 'beast') => {
    const preview = previews[id];
    if (!preview) return;

    try {
      const sourceUrl = preview.urls[preview.selectedIndex];
      const storyPersistenceId = requirePersistenceUuid(
        activeStory.persistenceId ?? activeStory.id,
        'Story',
      );
      const entity = type === 'location'
        ? memory.locations?.find(item => item.id === id)
        : type === 'artifact'
          ? memory.artifacts?.find(item => item.id === id)
          : memory.characters?.find(item => item.id === id);
      const entityPersistenceId = requirePersistenceUuid(
        entity?.persistenceId ?? entity?.id,
        `${type} entity`,
      );
      const targetKind = type === 'location'
        ? MEDIA_TARGET_KIND.LOCATION
        : type === 'artifact'
          ? MEDIA_TARGET_KIND.ARTIFACT
          : type === 'beast'
            ? MEDIA_TARGET_KIND.BEAST
            : MEDIA_TARGET_KIND.CHARACTER;
      const legacyMediaId = generateId(8);
      const asset = await saveMediaAsset({
        source: sourceUrl,
        assetType: 'IMAGE',
        purpose: MEDIA_PURPOSE.MANIFESTATION,
        association: {
          targetKind,
          targetKey: entityPersistenceId,
          storyId: storyPersistenceId,
          entityId: entityPersistenceId,
          legacyMediaId,
          entityType: type,
          promptUsed: preview.prompt,
          chapterNumber: activeStory.currentChapterNumber,
        },
        replacesAssetId: entity?.imageAssetId,
        idempotencyKey: generateUUID(),
      });
      const selectedUrl = (await resolveMediaAssetForDisplay(asset)).url;
      if (entity?.imageAssetId && entity.imageAssetId !== asset.id) {
        await discardCachedMedia(entity.imageAssetId);
      }

      const newHistoryItem: GeneratedImage = {
        id: legacyMediaId,
        assetId: asset.id,
        assetVersion: asset.version,
        checksumSha256: asset.checksumSha256,
        deliveryUrlExpiresAt: asset.deliveryUrlExpiresAt ?? undefined,
        entityId: id,
        entityType: type,
        imageUrl: selectedUrl,
        promptUsed: preview.prompt,
        createdAt: new Date().toISOString(),
        isCurrent: true,
        chapterNumber: activeStory.currentChapterNumber
      };

      let finalMemory = { ...memory };

      if (type === 'character' || type === 'beast') {
        const updated = memory.characters?.map(c =>
          c.id === id ? {
            ...c,
            persistenceId: entityPersistenceId,
            imageAssetId: asset.id,
            imageUrl: selectedUrl,
            imageHistory: (c.imageHistory || [])
              .map(img => ({ ...img, isCurrent: false }))
              .concat(newHistoryItem),
            evolutionReady: false,
            availableVisualUpdate: false,
            lastImageChapter: activeStory.currentChapterNumber,
            arcAccumulation: undefined,
          } : c
        ) || [];
        finalMemory = { ...memory, characters: updated };
      } else if (type === 'location') {
        const updated = (memory.locations || []).map(l =>
          l.id === id ? {
            ...l,
            persistenceId: entityPersistenceId,
            imageAssetId: asset.id,
            imageUrl: selectedUrl,
            imageHistory: (l.imageHistory || [])
              .map(img => ({ ...img, isCurrent: false }))
              .concat(newHistoryItem),
            evolutionReady: false,
            availableVisualUpdate: false,
            lastImageChapter: activeStory.currentChapterNumber,
            arcAccumulation: undefined,
          } : l
        );
        finalMemory = { ...memory, locations: updated };
      } else if (type === 'artifact') {
        const updated = (memory.artifacts || []).map(a =>
          a.id === id ? {
            ...a,
            persistenceId: entityPersistenceId,
            imageAssetId: asset.id,
            imageUrl: selectedUrl,
            imageHistory: (a.imageHistory || [])
              .map(img => ({ ...img, isCurrent: false }))
              .concat(newHistoryItem),
            evolutionReady: false,
            availableVisualUpdate: false,
            lastImageChapter: activeStory.currentChapterNumber,
            arcAccumulation: undefined,
          } : a
        );
        finalMemory = { ...memory, artifacts: updated };
      }

      void updateStoryFields(activeStory.id, { memory: finalMemory });

      setPreviews(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      pushNotification("Evolution successfully bonded to entity record.");
    } catch (error) {
      console.error('Failed to save the codex image evolution:', error);
      setGenerationError(error instanceof Error ? error.message : 'Failed to save the codex image evolution.');
    }
  };

  const handleDiscardPreview = (id: string) => {
    setPreviews(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  return {
    generatingId,
    generationError,
    setGenerationError,
    previews,
    setPreviews,
    handleRevertImage,
    handleAwakenCardImage,
    handleSaveEvolution,
    handleDiscardPreview
  };
}
