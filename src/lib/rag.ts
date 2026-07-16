import { ContextBlock, StoryWorld, ChapterContent } from '../types';
import { storyStorage } from './storage';
import { isUsableSummary } from './summaryIntegrity';
import {
  ARC_HISTORY_HEADER,
  CONTEXT_CHAR_LIMITS,
  ContextEngine,
  contextBlocksToLegacyStrings,
  RAG_HISTORY_HEADER,
} from './contextBlocks';
export {
  CONTEXT_CHAR_LIMITS,
  contextBlocksToLegacyStrings,
} from './contextBlocks';
const SECOND_RECENT_EPISODIC_SUMMARY_THRESHOLD = 8000;
const SECOND_RECENT_BLOCK_FRACTION = 0.4;

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function generateEmbedding(text: string, apiHeaders: Record<string, string> = {}): Promise<number[] | null> {
  try {
    const res = await fetch('/api/embed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...apiHeaders
      },
      body: JSON.stringify({ text })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.embedding;
  } catch (err) {
    console.error("Failed to generate embedding", err);
    return null;
  }
}

const chapterSummaryText = (
  chapterNumber: number,
  summary: string,
  label: 'Summary' | 'Pruned Summary' = 'Summary',
) => `Chapter ${chapterNumber} ${label}: ${isUsableSummary(summary) ? summary : label === 'Pruned Summary' ? 'Archived' : 'No past summary'}`;

const getNarrativeBlockTexts = (content: ChapterContent): string[] => {
  const sourceBlocks = content.blocks?.length
    ? content.blocks
    : content.archivedBlocks?.length
      ? content.archivedBlocks
      : [];
  const blockTexts = sourceBlocks
    .map(block => block.text?.trim())
    .filter((text): text is string => Boolean(text));
  if (blockTexts.length > 0) return blockTexts;

  return (content.generatedContent || '')
    .split(/\n{2,}/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean);
};

const fullRecentBlock = (
  chapterNumber: number,
  summary: string,
  content: ChapterContent | null,
): ContextBlock => {
  const summaryText = isUsableSummary(content?.episodicSummary)
    ? content?.episodicSummary
    : isUsableSummary(summary)
      ? summary
      : undefined;
  if (content?.archivedBlocks?.length) {
    return {
      kind: 'recent-full',
      chapterNumber,
      text: `Chapter ${chapterNumber} (ARCHIVED BLOCKS):\n${content.archivedBlocks.map(block => block.text).join('\n')}`,
      summaryText,
    };
  }
  if (content?.generatedContent) {
    return {
      kind: 'recent-full',
      chapterNumber,
      text: `Chapter ${chapterNumber}:\n${content.generatedContent}`,
      summaryText,
    };
  }
  if (content?.episodicSummary) {
    return {
      kind: 'recent-summary',
      chapterNumber,
      text: `Chapter ${chapterNumber} Summary:\n${content?.episodicSummary}`,
    };
  }
  return {
    kind: 'recent-summary',
    chapterNumber,
    text: chapterSummaryText(chapterNumber, summary),
  };
};

const reducedRecentBlock = (
  chapterNumber: number,
  summary: string,
  content: ChapterContent | null,
  distanceFromTarget: number,
): ContextBlock => {
  if (distanceFromTarget === 0) {
    return fullRecentBlock(chapterNumber, summary, content);
  }

  if (distanceFromTarget >= 2) {
    const summaryText = isUsableSummary(content?.episodicSummary)
      ? content?.episodicSummary || ''
      : summary;
    return {
      kind: 'recent-summary',
      chapterNumber,
      text: chapterSummaryText(chapterNumber, summaryText),
    };
  }

  const narrativeBlocks = content ? getNarrativeBlockTexts(content) : [];
  const narrativeTextLength = narrativeBlocks.join('\n\n').length;
  if (
    narrativeTextLength > SECOND_RECENT_EPISODIC_SUMMARY_THRESHOLD
    && isUsableSummary(content?.episodicSummary)
  ) {
    return {
      kind: 'recent-summary',
      chapterNumber,
      text: `Chapter ${chapterNumber} Summary:\n${content?.episodicSummary}`,
    };
  }

  if (narrativeBlocks.length > 0) {
    const retainedBlockCount = Math.max(
      1,
      Math.ceil(narrativeBlocks.length * SECOND_RECENT_BLOCK_FRACTION),
    );
    return {
      kind: 'recent-full',
      chapterNumber,
      text: `Chapter ${chapterNumber}:\n${narrativeBlocks.slice(-retainedBlockCount).join('\n\n')}`,
      summaryText: isUsableSummary(content?.episodicSummary)
        ? content?.episodicSummary
        : isUsableSummary(summary)
          ? summary
          : undefined,
    };
  }

  return {
    kind: 'recent-summary',
    chapterNumber,
    text: chapterSummaryText(chapterNumber, summary),
  };
};

/**
 * Executes a local Vector Search (RAG) substituting Server-side Firebase Vector Extensions.
 * It uses a rolling/hierarchical summary approach: per-arc summary + recent chapter blocks,
 * and falls back/adds older vector-searched chapters to maintain deep long-context continuity.
 */
export async function retrieveRelevantContext(
  currentPremise: string,
  targetChapterNumber: number,
  story: StoryWorld,
  apiHeaders: Record<string, string> = {},
  topK: number = 3,
  maxContextChars?: number,
  recentNCount: number = 3,
  contextEngine: ContextEngine = 'v1',
): Promise<ContextBlock[]> {
  const contextBlocks: ContextBlock[] = [];
  const effectiveMaxContextChars = maxContextChars ?? CONTEXT_CHAR_LIMITS[contextEngine];
  let currentTotalChars = 0;

  // We want to fetch the real narrative blocks of the most recent chapters (sliding window).
  const allPastChapters: { 
    chapterNumber: number; 
    summary: string; 
    embedding?: number[];
    isRecent: boolean;
    contentPromise: Promise<ChapterContent | null> | null;
  }[] = [];
  
  for (const arc of story.arcs) {
    for (const ch of arc.chapters) {
      if (ch.number < targetChapterNumber) {
        allPastChapters.push({ 
          chapterNumber: ch.number, 
          summary: ch.summary || "", 
          embedding: ch.embedding,
          isRecent: false,
          contentPromise: ch.hasContent ? storyStorage.getChapterContent(story.id, ch.number) : null
        });
      }
    }
  }

  allPastChapters.sort((a, b) => a.chapterNumber - b.chapterNumber);

  for (let i = Math.max(0, allPastChapters.length - recentNCount); i < allPastChapters.length; i++) {
    allPastChapters[i].isRecent = true;
  }

  // 1. Recovered Relevant Memories: Vector search over older chapters
  const oldCandidateChapters = allPastChapters.filter(c => !c.isRecent);
  const oldRecoveredContexts: ContextBlock[] = [];
  
  if (oldCandidateChapters.length > 0 && currentPremise) {
    const queryText = `Premise: ${currentPremise}. Unresolved: ${story.memory.unresolvedPlotThreads.join(', ')}`;
    const queryEmbedding = await generateEmbedding(queryText, apiHeaders);

    if (queryEmbedding) {
      const candidates: { chapterNumber: number; summary: string; score: number }[] = [];
      for (const ch of oldCandidateChapters) {
        // Skip chapters whose stored summary is empty or a known placeholder —
        // they carry no narrative memory worth recovering.
        if (ch.embedding && isUsableSummary(ch.summary)) {
          const score = cosineSimilarity(queryEmbedding, ch.embedding);
          if (score > 0.70) {
            candidates.push({ chapterNumber: ch.chapterNumber, summary: ch.summary, score });
          }
        }
      }

      if (candidates.length > 0) {
        candidates.sort((a, b) => b.score - a.score);
        const topVectorMatches = candidates.slice(0, topK);
        if (contextEngine === 'v1') {
          topVectorMatches.sort((a, b) => a.chapterNumber - b.chapterNumber);
        }
        
        topVectorMatches.forEach(c => {
          oldRecoveredContexts.push({
            kind: 'rag',
            chapterNumber: c.chapterNumber,
            text: `Chapter ${c.chapterNumber}: ${c.summary}`,
          });
        });
      }
    }
  }

  // 2. Recent chapters. v1 retains the full-text behavior; v2 uses
  // one full chapter, one final-40%-or-summary chapter, and one summary.
  const recentContextBlocks: ContextBlock[] = [];
  const recentCandidateChapters = allPastChapters.filter(c => c.isRecent);
  
  for (let i = recentCandidateChapters.length - 1; i >= 0; i--) {
    const ch = recentCandidateChapters[i];
    let content: ChapterContent | null = null;
    
    // Attempt to load full text
    if (ch.contentPromise) {
      try {
        content = await ch.contentPromise;
        if (content) {
          if (!isUsableSummary(ch.summary) && isUsableSummary(content.summary)) ch.summary = content.summary;
        }
      } catch (e) {
        console.warn(`Could not load full content for ch ${ch.chapterNumber}`, e);
      }
    }

    const distanceFromTarget = recentCandidateChapters.length - 1 - i;
    recentContextBlocks.unshift(
      contextEngine === 'v2'
        ? reducedRecentBlock(ch.chapterNumber, ch.summary, content, distanceFromTarget)
        : fullRecentBlock(ch.chapterNumber, ch.summary, content),
    );
  }

  // 3. Coarse History: Arc Summaries
  const arcHistoryBlocks: ContextBlock[] = [];
  story.arcs.forEach(arc => {
    const hasPastChapters = arc.chapters.some(c => c.number < targetChapterNumber);
    if (hasPastChapters) {
       let arcSum = `Volume '${arc.title}' Summary: ${arc.summary || 'Summary pending'}`;
       if (arc.episodicSummaries && arc.episodicSummaries.length > 0) {
           arcSum += `\nEpisodic Log: ${arc.episodicSummaries.join(' | ')}`;
       }
       arcHistoryBlocks.push({
         kind: 'arc-summary',
         text: arcSum,
       });
    }
  });

  // Assemble context blocks within budget
  // We prioritize recent full-text chapters FIRST to ensure they fit,
  // then older recovered contexts,
  // then coarse history summaries.
  
  let recentTotalChars = 0;
  const finalRecentBlocks: ContextBlock[] = [];
  for (let i = recentContextBlocks.length - 1; i >= 0; i--) {
    const block = recentContextBlocks[i];
    if (recentTotalChars + block.text.length <= effectiveMaxContextChars) {
      finalRecentBlocks.unshift(block);
      recentTotalChars += block.text.length;
    } else {
      // Approach token limit: prune to episodic summary or standard summary
      const shortBlock: ContextBlock = {
        kind: 'recent-summary',
        chapterNumber: recentCandidateChapters[i].chapterNumber,
        text: chapterSummaryText(
          recentCandidateChapters[i].chapterNumber,
          recentCandidateChapters[i].summary,
          'Pruned Summary',
        ),
      };
      if (recentTotalChars + shortBlock.text.length <= effectiveMaxContextChars) {
        finalRecentBlocks.unshift(shortBlock);
        recentTotalChars += shortBlock.text.length;
      }
    }
  }

  currentTotalChars += recentTotalChars;

  const finalRecoveredBlocks: ContextBlock[] = [];
  if (oldRecoveredContexts.length > 0) {
     let recChars = RAG_HISTORY_HEADER.length;
     for (const block of oldRecoveredContexts) {
        if (currentTotalChars + recChars + block.text.length <= effectiveMaxContextChars) {
           finalRecoveredBlocks.push(block);
           recChars += block.text.length;
        }
     }
     if (finalRecoveredBlocks.length > 0) {
        currentTotalChars += recChars;
     }
  }

  const finalArcBlocks: ContextBlock[] = [];
  if (contextEngine === 'v1') {
    const combinedArcLength = ARC_HISTORY_HEADER.length
      + 1
      + arcHistoryBlocks.map(block => block.text).join('\n').length;
    if (currentTotalChars + combinedArcLength <= effectiveMaxContextChars) {
      finalArcBlocks.push(...arcHistoryBlocks);
      currentTotalChars += combinedArcLength;
    }
  } else {
    let arcChars = 0;
    for (let index = arcHistoryBlocks.length - 1; index >= 0; index -= 1) {
      const block = arcHistoryBlocks[index];
      const separatorLength = finalArcBlocks.length > 0 ? 1 : 0;
      if (
        currentTotalChars
        + ARC_HISTORY_HEADER.length
        + 1
        + arcChars
        + separatorLength
        + block.text.length
        <= effectiveMaxContextChars
      ) {
        finalArcBlocks.unshift(block);
        arcChars += separatorLength + block.text.length;
      }
    }
    if (finalArcBlocks.length > 0) {
      currentTotalChars += ARC_HISTORY_HEADER.length + 1 + arcChars;
    }
  }

  // Append in chronological order logically:
  // Arc Summaries -> Recovered Older -> Recent
  if (finalArcBlocks.length > 0) {
     contextBlocks.push(...finalArcBlocks);
  }

  if (finalRecoveredBlocks.length > 0) {
     contextBlocks.push(...finalRecoveredBlocks);
  }

  if (finalRecentBlocks.length > 0) {
     contextBlocks.push(...finalRecentBlocks);
  }

  return contextBlocks;
}

export async function retrieveRelevantContextLegacy(
  currentPremise: string,
  targetChapterNumber: number,
  story: StoryWorld,
  apiHeaders: Record<string, string> = {},
  topK: number = 3,
  maxContextChars?: number,
  recentNCount: number = 3,
  contextEngine: ContextEngine = 'v1',
): Promise<string[]> {
  const blocks = await retrieveRelevantContext(
    currentPremise,
    targetChapterNumber,
    story,
    apiHeaders,
    topK,
    maxContextChars,
    recentNCount,
    contextEngine,
  );
  return contextBlocksToLegacyStrings(blocks);
}
