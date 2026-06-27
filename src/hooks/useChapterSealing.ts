import { useAppStore } from '../store/useAppStore';
import { StoryWorld } from '../types';
import { awardQi } from '../lib/qi';
import { unlockCosmicArtifact } from '../lib/artifacts';
import { storyApi } from '../services/api';

export const useChapterSealing = () => {
  const store = useAppStore();

  const handleUpdateStoryDirect = async (updatedStory: StoryWorld) => {
    updatedStory.updatedAt = new Date().toISOString();
    const updated = store.stories.map(s => s.id === updatedStory.id ? updatedStory : s);
    await store.saveStories(updated);
  };

  const handleCheckConsistency = async (chapterNumber: number): Promise<string[]> => {
    const activeStory = store.stories.find(s => s.id === store.activeStoryId);
    if (!activeStory) return [];
    
    const selectedArcIndex = activeStory.arcs.findIndex(arc => arc.chapters.some(c => c.number === chapterNumber));
    if (selectedArcIndex === -1) return [];

    const targetChapter = activeStory.arcs[selectedArcIndex].chapters.find(c => c.number === chapterNumber);
    if (!targetChapter || (!targetChapter.generatedContent && (!targetChapter.blocks || targetChapter.blocks.length === 0))) return [];

    let text = targetChapter.generatedContent || "";
    if (!text && targetChapter.blocks) {
      text = targetChapter.blocks.map(b => b.text).join('\n\n');
    }

    try {
      return await storyApi.checkConsistency(text, activeStory.memory, store.routingConfig.storyMaker);
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const handleSealChapter = async (chapterNumber: number) => {
    const activeStory = store.stories.find((s) => s.id === store.activeStoryId);
    if (!activeStory) return;

    const generateContentHash = async (content: string): Promise<string> => {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(content || '');
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      } catch {
        return Math.random().toString(36).substring(2, 15);
      }
    };

    const newArcs = await Promise.all(activeStory.arcs.map(async (arc) => {
      const newChapters = await Promise.all(arc.chapters.map(async (ch) => {
        if (ch.number === chapterNumber) {
          const contentHash = await generateContentHash(ch.generatedContent || '');
          const versionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
          const branchAnchor = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
          
          return { 
            ...ch, 
            isSealed: true,
            contentHash,
            sealedAt: Date.now(),
            versionId,
            assetManifest: {},
            translationCache: {},
            audioCueCache: {},
            branchAnchor
          };
        }
        return ch;
      }));
      return { ...arc, chapters: newChapters };
    }));

    await handleUpdateStoryDirect({ ...activeStory, arcs: newArcs });
    awardQi('chapter_sealed');
    
    // Scan sealed chapter content for artifacts
    const sealedCh = newArcs.flatMap(a => a.chapters).find(c => c.number === chapterNumber);
    if (sealedCh) {
      const fullText = (sealedCh.generatedContent || "") + " " + (sealedCh.blocks || []).map((b: any) => b.text).join(" ");
      import('../lib/artifacts').then(({ scanChapterForArtifacts }) => {
        scanChapterForArtifacts(activeStory.id, activeStory.title, chapterNumber, fullText, sealedCh).catch((err) => {
          console.error("Failed to scan sealed chapter for artifacts:", err);
        });
      });
    }
    
    // Unlock Mirror of Karmic Reflections artifact on first chapter seal
    unlockCosmicArtifact('chapter_seal', activeStory.id, activeStory.title).catch((err) => {
      console.error('Failed to unlock Chapter Seal artifact:', err);
    });
  };

  return {
    handleCheckConsistency,
    handleSealChapter
  };
};
