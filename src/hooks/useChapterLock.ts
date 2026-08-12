import { useAppStore } from '../store/useAppStore';
import { selectIsGenerating } from '../store/useGenerationStore';
import { awardQi } from '../lib/qi';
import { storyApi } from '../services/api';
import { generateId, generateUUID } from '../lib/id';
import { storyStorage } from '../lib/storage';

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
    if (!targetChapter) return [];

    let text = targetChapter.generatedContent || '';
    if (!text && targetChapter.hasContent) {
      const hydrated = await storyStorage.getChapterContent(activeStory.id, targetChapter.number);
      if (hydrated) {
        text = hydrated.generatedContent || '';
      }
    }

    if (!text && targetChapter.blocks && targetChapter.blocks.length > 0) {
      text = targetChapter.blocks.map(b => b.text).join('\n\n');
    }

    if (!text) return [];

    try {
      return await storyApi.checkConsistency(text, activeStory.memory, store_routingConfig.storyMaker);
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const handleSealChapter = async (chapterNumber: number) => {
    if (selectIsGenerating(useAppStore.getState())) return;

    const stateAtStart = useAppStore.getState();
    const activeStory = stateAtStart.stories.find((s) => s.id === stateAtStart.activeStoryId);
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

    let contentAtHashStart = targetChapter.generatedContent || '';
    if (!contentAtHashStart && targetChapter.hasContent) {
      const hydrated = await storyStorage.getChapterContent(activeStory.id, targetChapter.number);
      if (hydrated) {
        contentAtHashStart = hydrated.generatedContent || '';
      }
    }

    if (!contentAtHashStart && targetChapter.blocks && targetChapter.blocks.length > 0) {
       contentAtHashStart = targetChapter.blocks.map(b => b.text).join('\n\n');
    }

    // If we completely failed to find content for this chapter, abort rather than hashing empty string
    if (!contentAtHashStart) return;

    const contentHash = await generateContentHash(contentAtHashStart);
    let sealedChapterForArtifacts: typeof targetChapter | null = null;

    await useAppStore.getState().updateChapter(
      activeStory.id,
      chapterNumber,
      (chapter) => {
        // This callback runs inside the serialized story-save boundary. The
        // earlier handler snapshot is intentionally not trusted here: a run
        // may have started, or the chapter may have changed, while the hash
        // was being calculated or while this mutation waited in the queue.
        if (selectIsGenerating(useAppStore.getState())) return {};
        if (chapter.isSealed) return {};
        const checkContent = chapter.generatedContent || (chapter.blocks && chapter.blocks.length > 0 ? chapter.blocks.map((b: any) => b.text).join('\n\n') : '');
        // For offloaded chapters in state, chapter.generatedContent is empty, which wouldn't match contentAtHashStart.
        // We only fail the lock check if chapter.generatedContent is present and differs,
        // or if it's completely empty in state but the hash requires content AND chapter.hasContent is true
        if (checkContent && checkContent !== contentAtHashStart) return {};
        if (!checkContent && contentAtHashStart && !chapter.hasContent) return {}; // if we hashed something but now state is completely empty, reject
        // If it's missing from state (offloaded) but we had content to hash, we assume it's valid to lock since
        // the state hasn't been updated with new content since we checked.

        const sealPatch = {
          isSealed: true,
          contentHash,
          sealedAt: Date.now(),
          versionId: generateUUID(),
          assetManifest: {},
          translationCache: {},
          audioCueCache: {},
          branchAnchor: generateUUID(),
        };
        sealedChapterForArtifacts = { ...chapter, ...sealPatch };
        return sealPatch;
      },
    );

    if (!sealedChapterForArtifacts) return;

    awardQi('chapter_sealed');

    // Scan sealed chapter content for artifacts if it contains major milestones
    const sealedCh = sealedChapterForArtifacts;
    const fullText = contentAtHashStart + ' ' + (Array.isArray(sealedCh.blocks) ? sealedCh.blocks.map((b: any) => b.text).join(' ') : '');
    import('../lib/artifacts').then(({ scanChapterForArtifacts }) => {
      scanChapterForArtifacts(activeStory.id, activeStory.title, chapterNumber, fullText, sealedCh).catch((err) => {
        console.error('Failed to scan sealed chapter for artifacts:', err);
      });
    });
  };

  return {
    handleCheckConsistency,
    handleSealChapter
  };
};