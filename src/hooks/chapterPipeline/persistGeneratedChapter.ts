import { Story, Chapter, ChapterHandoff, SceneFingerprint } from '../../types';
import { generateEmbedding } from '../../lib/rag';
import { storyStorage } from '../../lib/storage';
import { resolveEntity } from '../../lib/entityResolver';
import { applyMemoryPatch } from './applyMemoryPatch';
import { isPlaceholderSummary } from '../../lib/summaryIntegrity';

/**
 * Fingerprint participants are canonicalized through the entity resolver so
 * duplicate detection compares Codex identities, not surface spellings.
 * Unresolved names are kept as written.
 */
const canonicalizeFingerprints = (
  handoff: ChapterHandoff,
  story: Story,
): ChapterHandoff => {
  const characters = story.memory?.characters || [];
  if (characters.length === 0) return handoff;

  const canonicalize = (name: string): string => {
    const resolved = resolveEntity(name, characters, 'fingerprintParticipant');
    const match = characters.find(c => c.id === resolved.resolvedEntityId);
    return match?.name || name;
  };

  const fingerprints: SceneFingerprint[] = handoff.fingerprints.map(fp => ({
    ...fp,
    participants: Array.from(new Set(fp.participants.map(canonicalize))),
  }));
  return { ...handoff, fingerprints };
};

export const persistGeneratedChapter = async (
  activeStory: Story,
  chapterNumber: number,
  selectedArcIndex: number,
  data: any,
  apiHeaders: any
) => {
  // Placeholder/error summaries must not become chapter memory: persist them
  // as empty and skip embedding so they never surface through RAG.
  const persistedSummary = isPlaceholderSummary(data.summary) ? '' : data.summary;

  let newChapterEmbedding;
  if (persistedSummary) {
    newChapterEmbedding = await generateEmbedding(persistedSummary, apiHeaders);
  }

  const handoff: ChapterHandoff | undefined = data.handoff
    ? canonicalizeFingerprints(data.handoff, activeStory)
    : undefined;

  const freshStories = await storyStorage.getStories();
  const updatedStories = freshStories.map((s: Story) => {
    if (s.id !== activeStory.id) return s;

    const cloned = { ...s };

    cloned.arcs = cloned.arcs.map((arc, aIdx) => {
      if (aIdx !== selectedArcIndex) return arc;
      return {
        ...arc,
        summary: data.arcSummary || arc.summary,
        chapters: arc.chapters.map((ch: Chapter) => {
          if (ch.number !== chapterNumber) return ch;
          return {
            ...ch,
            _isNewContent: true,
            generatedContent: data.chapterText,
            blocks: data.blocks,
            summary: persistedSummary,
            embedding: newChapterEmbedding,
            statsChangeMessage: data.statsChangeMessage !== 'None' ? data.statsChangeMessage : undefined,
            cuePayload: data.cuePayload,
            status: 'read' as const,
            hasContinuityFaults: data.hasContinuityFaults || false,
            continuityWarnings: data.continuityWarnings || [],
            continuitySoftNotes: data.continuitySoftNotes || [],
            contextManifest: data.contextManifest,
            // Context Engine 2.5: the full handoff/contract ride the chapter
            // transiently and move to ChapterContent at save time (like
            // contextManifest); fingerprints and the contract report stay on
            // the always-loaded scaffold.
            handoff,
            contract: data.contract,
            sceneFingerprints: handoff?.fingerprints,
            contractReport: data.contractReport,
          };
        })
      };
    });

    const isArcFinished = cloned.arcs[selectedArcIndex].chapters.every((ch: Chapter) => ch.hasContent || !!ch.generatedContent);
    if (isArcFinished) {
      cloned.arcs[selectedArcIndex].isCompleted = true;
    }

    if (data.memoryUpdates) {
       cloned.memory = applyMemoryPatch(cloned, data, chapterNumber, isArcFinished, selectedArcIndex);
    }

    cloned.updatedAt = new Date().toISOString();
    return cloned;
  });

  return updatedStories;
};
