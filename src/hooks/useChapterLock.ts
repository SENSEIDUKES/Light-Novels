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

  const getBlockText = (chapter: { blocks?: Array<{ text: string }> }) =>
    chapter.blocks && chapter.blocks.length > 0
      ? chapter.blocks.map((block) => block.text).join('\n\n')
      : '';

  const handleCheckConsistency = async (chapterNumber: number): Promise<string[]> => {
    const activeStory = store_stories.find(s => s.id === store_activeStoryId);
    if (!activeStory) return [];

    const selectedArcIndex = activeStory.arcs.findIndex(arc => arc.chapters.some(c => c.number === chapterNumber));
    if (selectedArcIndex === -1) return [];

    const targetChapter = activeStory.arcs[selectedArcIndex].chapters.find(c => c.number === chapterNumber);
    if (!targetChapter) return [];

    let text = targetChapter.generatedContent || '';
    if (!text && targetChapter.hasContent) {
      try {
        const hydrated = await storyStorage.getChapterContent(activeStory.id, targetChapter.number);
        if (hydrated) {
          text = hydrated.generatedContent || '';
        }
      } catch (err) {
        console.warn('Failed to hydrate chapter content for consistency check:', err);
      }
    }

    if (!text) {
      text = getBlockText(targetChapter);
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
    let contentSource: 'generated' | 'storage' | 'blocks' | 'none' = contentAtHashStart ? 'generated' : 'none';

    if (!contentAtHashStart && targetChapter.hasContent) {
      try {
        const hydrated = await storyStorage.getChapterContent(activeStory.id, targetChapter.number);
        if (hydrated?.generatedContent) {
          contentAtHashStart = hydrated.generatedContent;
          contentSource = 'storage';
        }
      } catch (err) {
        console.warn('Failed to hydrate chapter content before sealing:', err);
      }
    }

    if (!contentAtHashStart) {
      const blockText = getBlockText(targetChapter);
      if (blockText) {
        contentAtHashStart = blockText;
        contentSource = 'blocks';
      }
    }

    // A chapter marked as having content must never be sealed with an empty hash
    // simply because its offloaded body could not be read.
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

        const currentText = chapter.generatedContent || getBlockText(chapter);
        const isTrulyOffloaded = !currentText && chapter.hasContent;

        // An offloaded chapter may legitimately have no prose in the Story
        // scaffold, but only a successful storage hydration is enough to seal
        // that path. Otherwise compare current in-memory content strictly,
        // including the genuinely-cleared empty-string case.
        if (isTrulyOffloaded) {
          if (contentSource !== 'storage') return {};
        } else if (currentText !== contentAtHashStart) {
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

    // Scan sealed chapter content for artifacts if it contains major milestones.
    // When the hash input itself came from blocks, do not append those blocks a
    // second time or every artifact signal is duplicated.
    const sealedCh = sealedChapterForArtifacts;
    const sealedBlockText = Array.isArray(sealedCh.blocks)
      ? sealedCh.blocks.map((b: any) => b.text).join(' ')
      : '';
    const fullText = contentSource === 'blocks'
      ? contentAtHashStart
      : [contentAtHashStart, sealedBlockText].filter(Boolean).join(' ');

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
