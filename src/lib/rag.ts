import { Chapter, StoryWorld, ChapterContent } from '../types';
import { storyStorage } from './storage';

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
  let currentTotalChars = 0;
  // Maximum character limit roughly corresponding to 80% of 1M token limit
  // (1 token ~= 4 chars, 800k tokens ~= 3.2M chars). We cap at 2.5M for safety.
  const MAX_CONTEXT_CHARS = 2500000;

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

  const lastNCount = Math.max(topK, 5);
  for (let i = Math.max(0, allPastChapters.length - lastNCount); i < allPastChapters.length; i++) {
    allPastChapters[i].isRecent = true;
  }

  const recentChapterNumbers = new Set(allPastChapters.filter(c => c.isRecent).map(c => c.chapterNumber));

  // 1. Recovered Relevant Memories: Vector search over older chapters
  const oldCandidateChapters = allPastChapters.filter(c => !c.isRecent);
  const oldRecoveredContexts: string[] = [];
  
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
        
        oldRecoveredContexts.push("--- RECOVERED RELEVANT MEMORIES (OLDER CHAPTERS) ---");
        topVectorMatches.forEach(c => {
          oldRecoveredContexts.push(`Chapter ${c.chapterNumber}: ${c.summary}`);
        });
      }
    }
  }

  // 2. Sliding Window context starting from most recent backwards
  // We keep extracting actual dialogue/narrative blocks until token budget is full
  // If budget overflows or for chapters too far back, we prune to semantic summaries or episodic summaries
  const recentContextBlocks: string[] = [];
  
  // traverse backwards
  for (let i = allPastChapters.length - 1; i >= 0; i--) {
    const ch = allPastChapters[i];
    let chText = "";
    
    // Attempt to load full text
    if (ch.contentPromise) {
      try {
        const content = await ch.contentPromise;
        if (content) {
          if (!ch.summary && content.summary) ch.summary = content.summary;
          
          if (content.archivedBlocks && content.archivedBlocks.length > 0) {
             chText = `Chapter ${ch.chapterNumber} (ARCHIVED BLOCKS):\n` + content.archivedBlocks.map(b => b.text).join('\n');
          } else if (content.generatedContent) {
             chText = `Chapter ${ch.chapterNumber}:\n${content.generatedContent}`;
          } else if (content.episodicSummary) {
             chText = `Chapter ${ch.chapterNumber} Summary:\n${content.episodicSummary}`;
          }
        }
      } catch (e) {
        console.warn(`Could not load full content for ch ${ch.chapterNumber}`, e);
      }
    }

    if (!chText) {
      chText = `Chapter ${ch.chapterNumber} Summary: ${ch.summary || "No past summary"}`;
    }

    if (currentTotalChars + chText.length < MAX_CONTEXT_CHARS) {
       recentContextBlocks.unshift(chText); // prepend it because we are going backwards
       currentTotalChars += chText.length;
    } else {
       // Approach token limit: offload/prune to episodic summary, or just standard summary
       const shortText = `Chapter ${ch.chapterNumber} Pruned Summary: ${ch.summary || "Archived"}`;
       if (currentTotalChars + shortText.length < MAX_CONTEXT_CHARS) {
          recentContextBlocks.unshift(shortText);
          currentTotalChars += shortText.length;
       }
    }
  }

  // 3. Coarse History: Arc Summaries
  const arcSummaries: string[] = [];
  story.arcs.forEach(arc => {
    const hasPastChapters = arc.chapters.some(c => c.number < targetChapterNumber);
    if (hasPastChapters) {
       let arcSum = `Volume '${arc.title}' Summary: ${arc.summary || 'Summary pending'}`;
       if (arc.episodicSummaries && arc.episodicSummaries.length > 0) {
           arcSum += `\nEpisodic Log: ${arc.episodicSummaries.join(' | ')}`;
       }
       arcSummaries.push(arcSum);
    }
  });

  if (arcSummaries.length > 0) {
    const arcText = "--- COARSE HISTORY (ARC SUMMARIES) ---\n" + arcSummaries.join('\n');
    if (currentTotalChars + arcText.length < MAX_CONTEXT_CHARS) {
       contextBlocks.push(arcText);
       currentTotalChars += arcText.length;
    }
  }

  // Finally attach old recovered and recent sliding window
  if (oldRecoveredContexts.length > 0) {
     contextBlocks.push(...oldRecoveredContexts);
  }
  
  if (recentContextBlocks.length > 0) {
     contextBlocks.push("--- SLIDING WINDOW OF RECENT NARRATIVE BLOCKS/DIALOGUE ---");
     contextBlocks.push(...recentContextBlocks);
  }

  return contextBlocks;
}
