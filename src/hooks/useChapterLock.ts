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
    if (!text && targetChapter.blocks) {
      text = targetChapter.blocks.map(b => b.text).join('\n\n');
    }
    if (!text && targetChapter.hasContent) {
      const content = await storyStorage.getChapterContent(activeStory.id, chapterNumber);
      if (content) {
        text = content.generatedContent || (content.blocks ? content.blocks.map(b => b.text).join('\n\n') : '');
      }
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
    if (!contentAtHashStart && targetChapter.blocks) {
      contentAtHashStart = targetChapter.blocks.map(b => b.text).join('\n\n');
    }
    if (!contentAtHashStart && targetChapter.hasContent) {
      const content = await storyStorage.getChapterContent(activeStory.id, chapterNumber);
      if (content) {
        contentAtHashStart = content.generatedContent || (content.blocks ? content.blocks.map(b => b.text).join('\n\n') : '');
      }
    }
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

        // In case of offloaded content, we need to compare against the
        // resolved/hydrated content that was just hashed.
        // A hydrated chapter in state might have an empty string `""` or `undefined` for `generatedContent`,
        // meaning checking `if (currentContent)` is dangerous. Instead, calculate the current resolved string.
        let currentContent = chapter.generatedContent || '';
        if (!currentContent && chapter.blocks) {
          currentContent = chapter.blocks.map(b => b.text).join('\n\n');
        }

        // Only if it's explicitly populated in memory, verify it matches what we hashed.
        if ((chapter.generatedContent || chapter.blocks?.length) && currentContent !== contentAtHashStart) {
            return {};
        }

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
    const fullText = (sealedCh.generatedContent || '') + ' ' + (Array.isArray(sealedCh.blocks) ? sealedCh.blocks.map((b: any) => b.text).join(' ') : '');
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