import { useAppStore } from '../store/useAppStore';
import { selectIsGenerating } from '../store/useGenerationStore';
import { awardQi } from '../lib/qi';
import { storyApi } from '../services/api';
import { generateId, generateUUID } from '../lib/id';
import { storyStorage } from '../lib/storage';

const resolveBlocksText = (blocks: unknown): string => {
  if (!Array.isArray(blocks)) return '';
  return blocks
    .map((block: any) => (typeof block?.text === 'string' ? block.text : ''))
    .filter(Boolean)
    .join('\n\n');
};

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
      try {
        const hydrated = await storyStorage.getChapterContent(activeStory.id, targetChapter.number);
        if (hydrated) {
          text = hydrated.generatedContent || resolveBlocksText(hydrated.blocks);
        }
      } catch (err) {
        console.error('Failed to hydrate chapter for consistency check:', err);
      }
    }

    if (!text) {
      text = resolveBlocksText(targetChapter.blocks);
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
      try {
        const hydrated = await storyStorage.getChapterContent(activeStory.id, targetChapter.number);
        if (hydrated) {
          contentAtHashStart = hydrated.generatedContent || resolveBlocksText(hydrated.blocks);
        }
      } catch (err) {
        console.error('Failed to hydrate chapter before sealing:', err);
      }
    }

    if (!contentAtHashStart) {
      contentAtHashStart = resolveBlocksText(targetChapter.blocks);
    }

    // Never hash an empty body. A failed/offline hydration is recoverable; an
    // empty hash recorded as a real seal is not.
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

        const currentInMemoryText = chapter.generatedContent || resolveBlocksText(chapter.blocks);
        const isStillOffloaded = !currentInMemoryText && chapter.hasContent;

        // A genuinely cleared or edited chapter must never be sealed with the
        // hash calculated from older text. An offloaded chapter is the only
        // case where an empty in-memory body is expected here.
        if (!isStillOffloaded && currentInMemoryText !== contentAtHashStart) return {};

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

    // Scan the exact resolved body that was hashed. Appending chapter blocks
    // again duplicates block-derived prose and can double-count artifacts.
    const sealedCh = sealedChapterForArtifacts;
    const fullText = contentAtHashStart;
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
