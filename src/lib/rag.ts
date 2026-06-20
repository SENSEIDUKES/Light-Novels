import { Chapter, StoryWorld } from '../types';

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
 * It filters past chapters using cosine distance to ensure AI maintains deep continuity.
 */
export async function retrieveRelevantContext(
  currentPremise: string,
  targetChapterNumber: number,
  story: StoryWorld,
  apiHeaders: Record<string, string> = {},
  topK: number = 3
): Promise<string[]> {
  // 1. Generate an embedding for the prompt's intent (premise + loose plot threads)
  const queryText = `Premise: ${currentPremise}. Unresolved: ${story.memory.unresolvedPlotThreads.join(', ')}`;
  const queryEmbedding = await generateEmbedding(queryText, apiHeaders);

  // Fallback to all standard summaries if embedding fails
  if (!queryEmbedding) {
    const fallbackSummaries: string[] = [];
    story.arcs.forEach(arc => {
      arc.chapters.forEach(ch => {
        if (ch.number < targetChapterNumber && ch.summary) {
          fallbackSummaries.push(`Chapter ${ch.number}: ${ch.summary}`);
        }
      });
    });
    
    // Just return the last K + 2 to prevent token overflow if vector search failed
    return fallbackSummaries.slice(-topK - 2);
  }

  // 2. Gather all candidate chapters that have summaries
  const candidates: { chapterNumber: number; summary: string; embedding: number[]; score: number }[] = [];
  
  story.arcs.forEach(arc => {
    arc.chapters.forEach(ch => {
      if (ch.number < targetChapterNumber && ch.summary && ch.embedding) {
        const score = cosineSimilarity(queryEmbedding, ch.embedding);
        candidates.push({
          chapterNumber: ch.number,
          summary: ch.summary,
          embedding: ch.embedding,
          score
        });
      }
    });
  });

  // Sort by score descending (closest vectors first)
  candidates.sort((a, b) => b.score - a.score);

  // Take top K semantically relevant
  const topCandidates = candidates.slice(0, topK);

  // ALWAYS include the immediate preceding chapter for continuity lock
  if (targetChapterNumber > 1) {
    const immediatePrevNumber = targetChapterNumber - 1;
    if (!topCandidates.some(c => c.chapterNumber === immediatePrevNumber)) {
      const prevFallback = candidates.find(c => c.chapterNumber === immediatePrevNumber);
      if (prevFallback) {
         topCandidates.push(prevFallback);
      }
    }
  }

  // Re-sort temporally so the AI reads them in chronological chronological order
  topCandidates.sort((a, b) => a.chapterNumber - b.chapterNumber);

  return topCandidates.map(c => `Chapter ${c.chapterNumber}: ${c.summary}`);
}
