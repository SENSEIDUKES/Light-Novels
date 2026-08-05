import { useAppStore } from '../store/useAppStore';
import { selectIsGenerating } from '../store/useGenerationStore';
import { awardQi } from '../lib/qi';
import { unlockCosmicArtifact } from '../lib/artifacts';
import { storyApi } from '../services/api';
import { generateId, generateUUID } from '../lib/id';

export const useChapterLock = () => {
  const store_stories = useAppStore(state => state.stories);
    const store_activeStoryId = useAppStore(state => state.activeStoryId);
    const store_routingConfig = useAppStore(state => state.routingConfig);

  const handleCheckConsistency = async (chapterNumber: number): Promise<string[]> => {
    const activeStory = store_stories.find(s => s.id === store_activeStoryId);
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
      return await storyApi.checkConsistency(text, activeStory.memory, store_routingConfig.storyMaker);
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const handleSealChapter = async (chapterNumber: number) => {
    if (selectIsGenerating(useAppStore.getState())) return;

    const activeStory = store_stories.find((s) => s.id === store_activeStoryId);
    if (!activeStory) return;

    const generateContentHash = async (content: string): Promise<string> => {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(content || '');
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      } catch {
        return generateId(13);
      }
    };

    const targetChapter = activeStory.arcs
      .flatMap((arc) => arc.chapters)
      .find((ch) => ch.number === chapterNumber);
    if (!targetChapter) return;

    // Sealing touches exactly one chapter, so it patches exactly one chapter.
    // Rebuilding the whole `arcs` array and writing it back — as this did
    // before — meant the snapshot read above, taken before the async content
    // hash, would clobber any chapter another writer changed while the hash
    // was being computed (a read/unread toggle, a generation completing).
    // updateChapter leaves every other chapter alone.
    const sealPatch = {
      isSealed: true,
      contentHash: await generateContentHash(targetChapter.generatedContent || ''),
      sealedAt: Date.now(),
      versionId: generateUUID(),
      assetManifest: {},
      translationCache: {},
      audioCueCache: {},
      branchAnchor: generateUUID(),
    };

    let wasAlreadySealed = true;

    await useAppStore.getState().updateChapter(
      activeStory.id,
      chapterNumber,
      (chapter) => {
        wasAlreadySealed = !!chapter.isSealed;
        if (wasAlreadySealed) return {};
        return sealPatch;
      },
    );

    if (!wasAlreadySealed) {
      awardQi('chapter_sealed');

      // Scan sealed chapter content for artifacts if it contains major milestones
      const sealedCh = { ...targetChapter, ...sealPatch };
      const fullText = (sealedCh.generatedContent || "") + " " + (Array.isArray(sealedCh.blocks) ? sealedCh.blocks.map((b: any) => b.text).join(" ") : "");
      import('../lib/artifacts').then(({ scanChapterForArtifacts }) => {
        scanChapterForArtifacts(activeStory.id, activeStory.title, chapterNumber, fullText, sealedCh).catch((err) => {
          console.error("Failed to scan sealed chapter for artifacts:", err);
        });
      });
    }
  };

  return {
    handleCheckConsistency,
    handleSealChapter
  };
};