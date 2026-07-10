import { StoryMemory } from '../../types';
import { classifyContinuityWarnings, ClassifiedWarnings } from './classifyContinuityWarnings';
import { extractProseForContinuity, findSurfaceProseLeaks } from './continuityText';

export interface ChapterContinuityCheck {
  classified: ClassifiedWarnings;
  surfaceLeaks: string[];
}

/** Runs the advisory model check and applies the deterministic local gates. */
export const checkChapterContinuity = async (
  rawBlocksStr: string,
  memory: StoryMemory,
  slimMemory: StoryMemory,
  routingConfig: any,
  apiHeaders: any
): Promise<ChapterContinuityCheck> => {
  // Only the reader-facing prose is sent to the guard — world-card/image/codex
  // metadata is stripped so it can never be mistaken for lore drift.
  const prose = extractProseForContinuity(rawBlocksStr);
  const surfaceLeaks = findSurfaceProseLeaks(prose);

  try {
    const response = await fetch('/api/check-consistency', {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify({
        chapterText: prose,
        memory: slimMemory,
        routingConfig,
      }),
    });
    if (!response.ok) {
      return { classified: { severe: [], soft: [] }, surfaceLeaks };
    }
    const data = await response.json();
    return {
      classified: classifyContinuityWarnings(data.warnings || [], prose, memory),
      surfaceLeaks,
    };
  } catch {
    // The deterministic surface scan still gets a chance to repair prose if the
    // advisory continuity model is unavailable.
    return { classified: { severe: [], soft: [] }, surfaceLeaks };
  }
};
