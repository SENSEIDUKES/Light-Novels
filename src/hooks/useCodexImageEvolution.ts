import { useState } from 'react';
import { StoryMemory, StoryWorld, GeneratedImage, MultiModelRouting } from '../types';
import { secureStorage } from '../lib/encryption';
import { checkAndConsumeImageQuota } from '../lib/quota';
import { useAppStore } from '../store/useAppStore';
import { generateId } from '../lib/id';

export function useCodexImageEvolution(
  memory: StoryMemory,
  activeStory: StoryWorld,
  onUpdateStory: (updatedStory: StoryWorld) => void,
  routingConfig: MultiModelRouting | undefined,
  pushNotification: (msg: string) => void
) {
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, { urls: string[], prompt: string, selectedIndex: number, type: 'character' | 'location' | 'artifact' | 'beast' }>>({});

  const handleRevertImage = (id: string, type: string, newUrl: string) => {
    let finalMemory = { ...memory };
    if (type === 'character' || type === 'beast') {
      const updated = memory.characters?.map(c => c.id === id ? { ...c, imageUrl: newUrl } : c) || [];
      finalMemory = { ...memory, characters: updated };
    } else if (type === 'location') {
      const updated = (memory.locations || []).map(l => l.id === id ? { ...l, imageUrl: newUrl } : l);
      finalMemory = { ...memory, locations: updated };
    } else if (type === 'artifact') {
      const updated = (memory.artifacts || []).map(a => a.id === id ? { ...a, imageUrl: newUrl } : a);
      finalMemory = { ...memory, artifacts: updated };
    }

    const updatedStoryHistory = activeStory.imageHistory ? activeStory.imageHistory.map(img => {
      if (img.entityId === id) {
        return { ...img, isCurrent: img.imageUrl === newUrl };
      }
      return img;
    }) : [];

    const currentActiveStory = useAppStore.getState().stories.find(s => s.id === activeStory.id) || activeStory;
    onUpdateStory({
      ...currentActiveStory,
      memory: finalMemory,
      imageHistory: updatedStoryHistory
    });
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
      const isHubStory = activeStory?.id ? (
        activeStory.id.startsWith('demo-matrix-') || 
        activeStory.id.startsWith('challenge-') || 
        activeStory.id.includes('demo-matrix-') || 
        activeStory.id.includes('challenge-')
      ) : false;
      const isFreeUser = !userProfile || !userProfile.premiumTier || userProfile.premiumTier === 'mortal';
      if (isFreeUser && isHubStory) {
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

  const handleSaveEvolution = (id: string, type: 'character' | 'location' | 'artifact' | 'beast') => {
    const preview = previews[id];
    if (!preview) return;

    const selectedUrl = preview.urls[preview.selectedIndex];

    const newHistoryItem: GeneratedImage = {
      id: generateId(8),
      entityId: id,
      entityType: type,
      imageUrl: selectedUrl,
      promptUsed: preview.prompt,
      createdAt: new Date().toISOString(),
      isCurrent: true,
      chapterNumber: activeStory.currentChapterNumber
    };

    const currentStoryHistory = activeStory.imageHistory || [];
    const updatedStoryHistory: GeneratedImage[] = currentStoryHistory
      .map(img => img.entityId === id ? { ...img, isCurrent: false } : img)
      .concat(newHistoryItem);

    let finalMemory = { ...memory };

    if (type === 'character' || type === 'beast') {
      const updated = memory.characters?.map(c => 
        c.id === id ? { ...c, imageUrl: selectedUrl, evolutionReady: false, availableVisualUpdate: false, lastImageChapter: activeStory.currentChapterNumber, arcAccumulation: undefined } : c
      ) || [];
      finalMemory = { ...memory, characters: updated };
    } else if (type === 'location') {
      const updated = (memory.locations || []).map(l => 
        l.id === id ? { ...l, imageUrl: selectedUrl, evolutionReady: false, availableVisualUpdate: false, lastImageChapter: activeStory.currentChapterNumber, arcAccumulation: undefined } : l
      );
      finalMemory = { ...memory, locations: updated };
    } else if (type === 'artifact') {
      const updated = (memory.artifacts || []).map(a => 
        a.id === id ? { ...a, imageUrl: selectedUrl, evolutionReady: false, availableVisualUpdate: false, lastImageChapter: activeStory.currentChapterNumber, arcAccumulation: undefined } : a
      );
      finalMemory = { ...memory, artifacts: updated };
    }

    const currentActiveStory = useAppStore.getState().stories.find(s => s.id === activeStory.id) || activeStory;
    onUpdateStory({
      ...currentActiveStory,
      memory: finalMemory,
      imageHistory: updatedStoryHistory
    });

    setPreviews(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    pushNotification("Evolution successfully bonded to entity record.");
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
