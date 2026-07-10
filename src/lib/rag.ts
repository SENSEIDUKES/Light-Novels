import { Chapter, StoryWorld, ChapterContent } from '../types';
import { storyStorage } from './storage';
import { isUsableSummary } from './summaryIntegrity';

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
  topK: number = 3,
  maxContextChars: number = 120000,
  recentNCount: number = 3
): Promise<string[]> {
  const contextBlocks: string[] = [];
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
  const oldRecoveredContexts: string[] = [];
  const recoveredChapterNumbers = new Set<number>();
  
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
        topVectorMatches.sort((a, b) => a.chapterNumber - b.chapterNumber); // chronological
        
        oldRecoveredContexts.push("--- RECOVERED RELEVANT MEMORIES (OLDER CHAPTERS) ---");
        topVectorMatches.forEach(c => {
          recoveredChapterNumbers.add(c.chapterNumber);
          oldRecoveredContexts.push(`Chapter ${c.chapterNumber}: ${c.summary}`);
        });
      }
    }
  }

  // 2. Recent N Chapters (Full Text)
  const recentContextBlocks: string[] = [];
  const recentCandidateChapters = allPastChapters.filter(c => c.isRecent);
  
  for (let i = recentCandidateChapters.length - 1; i >= 0; i--) {
    const ch = recentCandidateChapters[i];
    let chText = "";
    
    // Attempt to load full text
    if (ch.contentPromise) {
      try {
        const content = await ch.contentPromise;
        if (content) {
          if (!isUsableSummary(ch.summary) && isUsableSummary(content.summary)) ch.summary = content.summary;
          
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
      chText = `Chapter ${ch.chapterNumber} Summary: ${isUsableSummary(ch.summary) ? ch.summary : "No past summary"}`;
    }

    recentContextBlocks.unshift(chText);
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

  const arcHistoryBlocks: string[] = [];
  if (arcSummaries.length > 0) {
     arcHistoryBlocks.push("--- COARSE HISTORY (ARC SUMMARIES) ---\n" + arcSummaries.join('\n'));
  }

  // Assemble context blocks within budget
  // We prioritize recent full-text chapters FIRST to ensure they fit,
  // then older recovered contexts,
  // then coarse history summaries.
  
  let recentTotalChars = 0;
  const finalRecentBlocks: string[] = [];
  for (let i = recentContextBlocks.length - 1; i >= 0; i--) {
    const block = recentContextBlocks[i];
    if (recentTotalChars + block.length <= maxContextChars) {
      finalRecentBlocks.unshift(block);
      recentTotalChars += block.length;
    } else {
      // Approach token limit: prune to episodic summary or standard summary
      const shortText = `Chapter ${recentCandidateChapters[i].chapterNumber} Pruned Summary: ${isUsableSummary(recentCandidateChapters[i].summary) ? recentCandidateChapters[i].summary : "Archived"}`;
      if (recentTotalChars + shortText.length <= maxContextChars) {
        finalRecentBlocks.unshift(shortText);
        recentTotalChars += shortText.length;
      }
    }
  }

  currentTotalChars += recentTotalChars;

  const finalRecoveredBlocks: string[] = [];
  if (oldRecoveredContexts.length > 0) {
     const header = oldRecoveredContexts[0];
     let recChars = header.length;
     finalRecoveredBlocks.push(header);
     for (let i = 1; i < oldRecoveredContexts.length; i++) {
        const block = oldRecoveredContexts[i];
        if (currentTotalChars + recChars + block.length <= maxContextChars) {
           finalRecoveredBlocks.push(block);
           recChars += block.length;
        }
     }
     if (finalRecoveredBlocks.length > 1) {
        currentTotalChars += recChars;
     } else {
        finalRecoveredBlocks.length = 0; // empty if only header
     }
  }

  const finalArcBlocks: string[] = [];
  for (const block of arcHistoryBlocks) {
     if (currentTotalChars + block.length <= maxContextChars) {
        finalArcBlocks.push(block);
        currentTotalChars += block.length;
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
     contextBlocks.push("--- SLIDING WINDOW OF RECENT NARRATIVE BLOCKS/DIALOGUE ---");
     contextBlocks.push(...finalRecentBlocks);
  }

  return contextBlocks;
}
