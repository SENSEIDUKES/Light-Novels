import { Story } from '../../types';
import {
  classifyContinuityWarnings,
  extractProseForContinuity,
} from './verifyContinuityWarnings';
import { slimMemoryForRequest } from '../../lib/slimMemoryForRequest';

export type ContinuityPhase = 'checking' | 'repairing';

/**
 * Runs the Continuity Guard entirely BEHIND the generation veil, before the chapter is
 * ever revealed to the reader.
 *
 * The guard LLM only PROPOSES warnings — it is unreliable and over-flags. The real gate
 * is deterministic (see verifyContinuityWarnings): a proposed warning can only become a
 * reader-facing `hasContinuityFaults` (the alarming red box) if it references a Codex
 * entity that is literally marked deceased/destroyed AND that entity appears in this
 * chapter's prose. Everything plausible-but-unproven is downgraded to a quiet soft note;
 * obvious noise (self-negating essays, embedded image/codex data) is dropped entirely.
 *
 * The expensive repair pass is only attempted for VERIFIED severe faults, so early
 * chapters — where nobody has died yet — never trigger it.
 *
 * @param onProgress optional hook so the veil can show "Verifying continuity..." /
 *   "Reconciling the timeline..." while this runs.
 */
export const runContinuityPass = async (
  finalRawBlocksStr: string,
  activeStory: Story,
  routingConfig: any,
  apiHeaders: any,
  onProgress?: (phase: ContinuityPhase) => void
) => {
  let hasContinuityFaults = false;
  let continuityWarnings: string[] = [];
  let continuitySoftNotes: string[] = [];
  let currentRawBlocksStr = finalRawBlocksStr;

  // Strip base64 media / embeddings so these requests also stay under the hosting
  // edge's ~4.5 MB body cap (the guard only reads text/status fields).
  const slimMemory = slimMemoryForRequest(activeStory.memory);

  const checkConsistency = async (rawBlocksStr: string) => {
    // Only the reader-facing prose is sent to the guard — world-card/image/codex
    // metadata is stripped so it can never be mistaken for lore drift.
    const prose = extractProseForContinuity(rawBlocksStr);
    const response = await fetch('/api/check-consistency', {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify({
        chapterText: prose,
        memory: slimMemory,
        routingConfig,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return classifyContinuityWarnings(data.warnings || [], prose, activeStory.memory);
  };

  try {
    onProgress?.('checking');
    let classified = await checkConsistency(currentRawBlocksStr);

    if (classified) {
      continuitySoftNotes = classified.soft;

      if (classified.severe.length > 0) {
        console.log(
          'Continuity Guard detected VERIFIED severe faults during generation:',
          classified.severe
        );

        console.log('Attempting Continuity Repair...');
        onProgress?.('repairing');
        const repairResponse = await fetch('/api/repair-chapter-stream', {
          method: 'POST',
          headers: apiHeaders,
          body: JSON.stringify({
            chapterText: currentRawBlocksStr,
            memory: slimMemory,
            warnings: classified.severe,
            routingConfig,
          }),
        });

        if (repairResponse.ok && repairResponse.body) {
          const reader = repairResponse.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let repairRaw = '';
          let buffer = '';

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                  const parsed = JSON.parse(line.substring(6));
                  if (parsed.chunk) {
                    repairRaw += parsed.chunk;
                  }
                } catch (e) {}
              }
            }
          }

          if (repairRaw.length > 150) {
            currentRawBlocksStr = repairRaw;

            const recheck = await checkConsistency(currentRawBlocksStr);
            classified = recheck || { severe: [], soft: [] };
            continuitySoftNotes = classified.soft;
          }
        }

        if (classified.severe.length > 0) {
          console.log(
            'Continuity Guard found verified severe faults even after repair:',
            classified.severe
          );
          hasContinuityFaults = true;
          continuityWarnings = classified.severe;
        }
      }
    }
  } catch (err) {
    console.error('Continuity pass failed', err);
  }

  return {
    hasContinuityFaults,
    continuityWarnings,
    continuitySoftNotes,
    finalRawBlocksStr: currentRawBlocksStr,
  };
};
