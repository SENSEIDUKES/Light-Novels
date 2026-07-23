import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { secureStorage } from '../lib/encryption';
import { checkAndConsumeImageQuota } from '../lib/quota';
import { generateId, generateUUID } from '../lib/id';
import {
  MEDIA_PURPOSE,
  MEDIA_TARGET_KIND,
  requirePersistenceUuid,
  saveMediaAsset,
} from '../lib/media/mediaAssetClient';

export function useImageManifest() {
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const stories = useAppStore(state => state.stories);
  const activeStoryId = useAppStore(state => state.activeStoryId);
  const saveStories = useAppStore(state => state.saveStories);
  const routingConfig = useAppStore(state => state.routingConfig);

  const manifestImage = async (entry: any, type: string) => {
    if (generatingIds.has(entry.id)) return;
    
    setGeneratingIds(prev => new Set(prev).add(entry.id));
    
    try {
      await checkAndConsumeImageQuota();

      const apiHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      const gemini = await secureStorage.getItem('@seihouse/api-key-gemini');
      const openrouter = await secureStorage.getItem('@seihouse/api-key-openrouter');
      const ollama = await secureStorage.getItem('@seihouse/api-key-ollama-host');
      if (gemini) apiHeaders['x-gemini-key'] = gemini;
      if (openrouter) apiHeaders['x-openrouter-key'] = openrouter;
      if (ollama) apiHeaders['x-ollama-host'] = ollama;

      const activeStory = stories.find(s => s.id === activeStoryId);
      const res = await fetch('/api/generate-card-image', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          prompt: `${entry.name}. ${entry.description}`,
          type,
          routingConfig
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Aetherial alignment gate failed to synchronize imagery.");
      }

      let newImageUrls = data.imageUrls;
      if (!newImageUrls && data.imageUrl) newImageUrls = [data.imageUrl];
      if (!newImageUrls && data.fallbackUrl) newImageUrls = [data.fallbackUrl];

      if (!newImageUrls || newImageUrls.length === 0) {
        throw new Error("No imagery frames returned.");
      }
      let selectedUrl = newImageUrls[0];

      if (activeStory) {
        const id = entry.id;
        const currentChapterNumber = activeStory.currentChapterNumber || 1;
        const legacyMediaId = generateId(8);
        const storyPersistenceId = requirePersistenceUuid(
          activeStory.persistenceId ?? activeStory.id,
          'Story',
        );
        const entityPersistenceId = requirePersistenceUuid(
          entry.persistenceId ?? entry.id,
          `${type} entity`,
        );
        const targetKindByType: Record<string, string> = {
          character: MEDIA_TARGET_KIND.CHARACTER,
          beast: MEDIA_TARGET_KIND.BEAST,
          location: MEDIA_TARGET_KIND.LOCATION,
          artifact: MEDIA_TARGET_KIND.ARTIFACT,
          faction: MEDIA_TARGET_KIND.FACTION,
        };
        const targetKind = targetKindByType[type];
        if (!targetKind) throw new Error(`Unsupported manifestation type: ${type}`);
        const promptUsed = `${entry.name}. ${entry.description}`;
        const asset = await saveMediaAsset({
          source: selectedUrl,
          assetType: 'IMAGE',
          purpose: MEDIA_PURPOSE.MANIFESTATION,
          association: {
            targetKind,
            targetKey: id,
            storyId: storyPersistenceId,
            entityId: entityPersistenceId,
            legacyMediaId,
            entityType: type,
            promptUsed,
            chapterNumber: currentChapterNumber,
          },
          idempotencyKey: generateUUID(),
        });
        selectedUrl = asset.deliveryUrl;
        const newHistoryItem = {
          id: legacyMediaId,
          assetId: asset.id,
          assetVersion: asset.version,
          checksumSha256: asset.checksumSha256,
          deliveryUrlExpiresAt: asset.deliveryUrlExpiresAt ?? undefined,
          entityId: id,
          entityType: type as any,
          imageUrl: selectedUrl,
          promptUsed,
          createdAt: new Date().toISOString(),
          isCurrent: true,
          chapterNumber: currentChapterNumber
        };

        const currentStoryHistory = activeStory.imageHistory || [];
        const updatedStoryHistory = currentStoryHistory
          .map((img: any) => img.entityId === id ? { ...img, isCurrent: false } : img)
          .concat(newHistoryItem);

        const memory = activeStory.memory;
        const updatedMemory = { ...memory };
        if (type === 'character') {
          updatedMemory.characters = memory.characters.map((c: any) => 
            c.id === id ? { ...c, persistenceId: entityPersistenceId, imageAssetId: asset.id, imageUrl: selectedUrl, imageHistory: (c.imageHistory || []).concat(newHistoryItem) } : c
          );
        } else if (type === 'location') {
          updatedMemory.locations = (memory.locations || []).map((l: any) => 
            l.id === id ? { ...l, persistenceId: entityPersistenceId, imageAssetId: asset.id, imageUrl: selectedUrl, imageHistory: (l.imageHistory || []).concat(newHistoryItem) } : l
          );
        } else if (type === 'artifact') {
          updatedMemory.artifacts = (memory.artifacts || []).map((a: any) => 
            a.id === id ? { ...a, persistenceId: entityPersistenceId, imageAssetId: asset.id, imageUrl: selectedUrl, imageHistory: (a.imageHistory || []).concat(newHistoryItem) } : a
          );
        } else if (type === 'beast') {
          updatedMemory.characters = memory.characters.map((c: any) =>
            c.id === id ? { ...c, persistenceId: entityPersistenceId, imageAssetId: asset.id, imageUrl: selectedUrl, imageHistory: (c.imageHistory || []).concat(newHistoryItem) } : c
          );
        } else if (type === 'faction') {
          updatedMemory.factions = (memory.factions || []).map((f: any) =>
            f.id === id ? { ...f, persistenceId: entityPersistenceId, imageAssetId: asset.id, imageUrl: selectedUrl, imageHistory: (f.imageHistory || []).concat(newHistoryItem) } : f
          );
        }

        const updatedStories = stories.map(s => {
          if (s.id === activeStoryId) {
            return {
              ...s,
              persistenceId: storyPersistenceId,
              memory: updatedMemory,
              imageHistory: updatedStoryHistory,
              updatedAt: new Date().toISOString()
            };
          }
          return s;
        });

        await saveStories(updatedStories);
      }
      
      setGeneratingIds(prev => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
      return selectedUrl;
    } catch (err: any) {
      setGeneratingIds(prev => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
      window.dispatchEvent(new CustomEvent('seihouse-toast', { 
        detail: { 
          title: "Manifestation Collapse", 
          message: err.message, 
          type: "error" 
        }
      }));
      throw err;
    }
  };

  const manifestChapterHero = async (chapterNumber: number, promptText: string) => {
    const genId = `chapter-hero-${chapterNumber}`;
    if (generatingIds.has(genId)) return;
    
    setGeneratingIds(prev => new Set(prev).add(genId));
    
    try {
      await checkAndConsumeImageQuota({ automatic: true });

      const apiHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      const gemini = await secureStorage.getItem('@seihouse/api-key-gemini');
      const openrouter = await secureStorage.getItem('@seihouse/api-key-openrouter');
      const ollama = await secureStorage.getItem('@seihouse/api-key-ollama-host');
      if (gemini) apiHeaders['x-gemini-key'] = gemini;
      if (openrouter) apiHeaders['x-openrouter-key'] = openrouter;
      if (ollama) apiHeaders['x-ollama-host'] = ollama;

      const activeStory = stories.find(s => s.id === activeStoryId);
      const res = await fetch('/api/generate-card-image', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          prompt: promptText,
          type: 'chapterHero',
          routingConfig
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Aetherial alignment gate failed to synchronize imagery.");
      }

      let newImageUrls = data.imageUrls;
      if (!newImageUrls && data.imageUrl) newImageUrls = [data.imageUrl];
      if (!newImageUrls && data.fallbackUrl) newImageUrls = [data.fallbackUrl];

      if (!newImageUrls || newImageUrls.length === 0) {
        throw new Error("No imagery frames returned.");
      }
      let selectedUrl = newImageUrls[0];

      if (activeStory) {
        const storyPersistenceId = requirePersistenceUuid(
          activeStory.persistenceId ?? activeStory.id,
          'Story',
        );
        const chapter = activeStory.arcs
          .flatMap(arc => arc.chapters)
          .find(candidate => candidate.number === chapterNumber);
        const chapterPersistenceId = requirePersistenceUuid(
          chapter?.persistenceId,
          `Chapter ${chapterNumber}`,
        );
        const legacyMediaId = generateId(8);
        const asset = await saveMediaAsset({
          source: selectedUrl,
          assetType: 'IMAGE',
          purpose: MEDIA_PURPOSE.CHAPTER_HERO,
          association: {
            targetKind: MEDIA_TARGET_KIND.CHAPTER,
            targetKey: `${activeStory.id}:${chapterNumber}`,
            storyId: storyPersistenceId,
            chapterId: chapterPersistenceId,
            legacyMediaId,
            entityType: 'chapterHero',
            promptUsed: promptText,
            chapterNumber,
          },
          idempotencyKey: generateUUID(),
        });
        selectedUrl = asset.deliveryUrl;
        const newHistoryItem = {
          id: legacyMediaId,
          assetId: asset.id,
          assetVersion: asset.version,
          checksumSha256: asset.checksumSha256,
          deliveryUrlExpiresAt: asset.deliveryUrlExpiresAt ?? undefined,
          entityId: `chapter-hero-${chapterNumber}`,
          entityType: 'chapterHero' as const,
          imageUrl: selectedUrl,
          promptUsed: promptText,
          createdAt: new Date().toISOString(),
          isCurrent: true,
          chapterNumber: chapterNumber
        };

        const currentStoryHistory = activeStory.imageHistory || [];
        const updatedStoryHistory = currentStoryHistory
          .map((img: any) => img.entityId === `chapter-hero-${chapterNumber}` ? { ...img, isCurrent: false } : img)
          .concat(newHistoryItem);

        const updatedStories = stories.map(s => {
          if (s.id === activeStoryId) {
            const updatedArcs = s.arcs.map(arc => ({
              ...arc,
              chapters: arc.chapters.map(ch => {
                if (ch.number === chapterNumber) {
                  return {
                    ...ch,
                    persistenceId: chapterPersistenceId,
                    heroImageAssetId: asset.id,
                    assetManifest: {
                      ...(ch.assetManifest || {}),
                      heroImage: selectedUrl
                    }
                  };
                }
                return ch;
              })
            }));
            
            return {
              ...s,
              persistenceId: storyPersistenceId,
              arcs: updatedArcs,
              imageHistory: updatedStoryHistory,
              updatedAt: new Date().toISOString()
            };
          }
          return s;
        });

        await saveStories(updatedStories);
      }
      
      setGeneratingIds(prev => {
        const next = new Set(prev);
        next.delete(genId);
        return next;
      });
      return selectedUrl;
    } catch (err: any) {
      setGeneratingIds(prev => {
        const next = new Set(prev);
        next.delete(genId);
        return next;
      });
      console.warn("Hero generation failed:", err);
      throw err;
    }
  };

  return { manifestImage, manifestChapterHero, generatingIds };
}
