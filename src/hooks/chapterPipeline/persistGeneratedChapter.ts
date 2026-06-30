import { Story, Chapter } from '../../types';
import { generateEmbedding } from '../../lib/rag';
import { storyStorage } from '../../lib/storage';
import { applyMemoryPatch } from './applyMemoryPatch';

export const persistGeneratedChapter = async (
  activeStory: Story,
  chapterNumber: number,
  selectedArcIndex: number,
  data: any,
  apiHeaders: any
) => {
  let newChapterEmbedding;
  if (data.summary) {
    newChapterEmbedding = await generateEmbedding(data.summary, apiHeaders);
  }

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
            summary: data.summary,
            embedding: newChapterEmbedding,
            statsChangeMessage: data.statsChangeMessage !== 'None' ? data.statsChangeMessage : undefined,
            cuePayload: data.cuePayload,
            status: 'read' as const,
            hasContinuityFaults: data.hasContinuityFaults || false,
            continuityWarnings: data.continuityWarnings || []
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
