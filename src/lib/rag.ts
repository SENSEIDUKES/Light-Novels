import { Chapter, StoryWorld } from '../types';
import { storyStorage } from './storage';

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
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

/**
 * Executes a local Vector Search (RAG) substituting Server-side Firebase Vector Extensions.
 * It uses a rolling/hierarchical summary approach: per-arc summary + last-N detailed chapter summaries,
 * and falls back/adds older vector-searched chapters to maintain deep long-context continuity.
 */
export async function retrieveRelevantContext(
  currentPremise: string,
  targetChapterNumber: number,
  story: StoryWorld,
  apiHeaders: Record<string, string> = {},
  topK: number = 3
): Promise<string[]> {
  const contextBlocks: string[] = [];

  // 1. Coarse History: Arc Summaries
  const arcSummaries: string[] = [];
  story.arcs.forEach(arc => {
    const hasPastChapters = arc.chapters.some(c => c.number < targetChapterNumber);
    if (hasPastChapters && arc.summary) {
      arcSummaries.push(`Volume '${arc.title}' Summary: ${arc.summary}`);
    }
  });

  if (arcSummaries.length > 0) {
    contextBlocks.push("--- COARSE HISTORY (ARC SUMMARIES) ---");
    contextBlocks.push(...arcSummaries);
  }

  // 2. Fine Recent Detail: Last N Chapters
  const allPastChapters: { chapterNumber: number; summary: string, embedding?: number[] }[] = [];
  
  for (const arc of story.arcs) {
    for (const ch of arc.chapters) {
      if (ch.number < targetChapterNumber) {
        let chSummary = ch.summary;
        if (!chSummary && ch.hasContent) {
           const content = await storyStorage.getChapterContent(story.id, ch.number);
           if (content && content.summary) {
              chSummary = content.summary;
           }
        }
        if (chSummary) {
          allPastChapters.push({ chapterNumber: ch.number, summary: chSummary, embedding: ch.embedding });
        }
      }
    }
  }

  allPastChapters.sort((a, b) => a.chapterNumber - b.chapterNumber);

  // Take the last topK (plus 2 to ensure we have a solid recent chunk, as requested)
  const lastNCount = Math.max(topK, 5);
  const recentChapters = allPastChapters.slice(-lastNCount);
  const recentChapterNumbers = new Set(recentChapters.map(c => c.chapterNumber));

  if (recentChapters.length > 0) {
    if (contextBlocks.length > 0) contextBlocks.push(""); // spacer
    contextBlocks.push("--- RECENT FINE DETAIL (LATEST CHAPTERS) ---");
    recentChapters.forEach(c => {
      contextBlocks.push(`Chapter ${c.chapterNumber}: ${c.summary}`);
    });
  }

  // 3. Recovered Relevant Memories: Vector search over older chapters
  const oldCandidateChapters = allPastChapters.filter(c => !recentChapterNumbers.has(c.chapterNumber));
  
  if (oldCandidateChapters.length > 0) {
    const queryText = `Premise: ${currentPremise}. Unresolved: ${story.memory.unresolvedPlotThreads.join(', ')}`;
    const queryEmbedding = await generateEmbedding(queryText, apiHeaders);

    if (queryEmbedding) {
      const candidates: { chapterNumber: number; summary: string; score: number }[] = [];
      for (const ch of oldCandidateChapters) {
        if (ch.embedding) {
          const score = cosineSimilarity(queryEmbedding, ch.embedding);
          if (score > 0.70) {
            candidates.push({ chapterNumber: ch.chapterNumber, summary: ch.summary, score });
          }
        }
      }

      if (candidates.length > 0) {
        candidates.sort((a, b) => b.score - a.score);
        const topVectorMatches = candidates.slice(0, 2);
        topVectorMatches.sort((a, b) => a.chapterNumber - b.chapterNumber); // chronological
        
        if (contextBlocks.length > 0) contextBlocks.push(""); // spacer
        contextBlocks.push("--- RECOVERED RELEVANT MEMORIES (OLDER CHAPTERS) ---");
        topVectorMatches.forEach(c => {
          contextBlocks.push(`Chapter ${c.chapterNumber}: ${c.summary}`);
        });
      }
    }
  }

  return contextBlocks;
}
