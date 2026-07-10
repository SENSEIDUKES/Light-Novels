import { Story } from '../../types';
import { slimMemoryForRequest } from '../../lib/slimMemoryForRequest';
import { checkChapterContinuity } from './checkChapterContinuity';
import { repairChapterStream } from './repairChapterStream';

export type ContinuityPhase = 'checking' | 'repairing';

export interface ContinuityPassResult {
  hasContinuityFaults: boolean;
  continuityWarnings: string[];
  continuitySoftNotes: string[];
  finalRawBlocksStr: string;
}

/**
 * Runs the Continuity Guard entirely BEHIND the generation veil, before the chapter is
 * ever revealed to the reader.
 *
 * The guard LLM only PROPOSES warnings — it is unreliable and over-flags. The real gate
 * is deterministic: a proposed warning can only become a
 * reader-facing `hasContinuityFaults` (the alarming red box) if it references a Codex
 * entity that is literally marked deceased/destroyed AND that entity appears in this
 * chapter's prose. Everything plausible-but-unproven is downgraded to a quiet soft note;
 * obvious noise (self-negating essays, embedded image/codex data) is dropped entirely.
 *
 * The repair pass is attempted for VERIFIED severe faults and deterministic
 * reader-surface leaks. Surface leaks remain behind the veil and can never create a
 * reader-facing continuity fault.
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
): Promise<ContinuityPassResult> => {
  let hasContinuityFaults = false;
  let continuityWarnings: string[] = [];
  let continuitySoftNotes: string[] = [];
  let currentRawBlocksStr = finalRawBlocksStr;

  // Strip base64 media / embeddings so these requests also stay under the hosting
  // edge's ~4.5 MB body cap (the guard only reads text/status fields).
  const slimMemory = slimMemoryForRequest(activeStory.memory);

  try {
    onProgress?.('checking');
    let consistency = await checkChapterContinuity(
      currentRawBlocksStr,
      activeStory.memory,
      slimMemory,
      routingConfig,
      apiHeaders
    );

    if (consistency) {
      let { classified, surfaceLeaks } = consistency;
      continuitySoftNotes = classified.soft;

      if (classified.severe.length > 0 || surfaceLeaks.length > 0) {
        const repairWarnings = [
          ...classified.severe,
          ...surfaceLeaks.map((phrase) => `Surface hygiene: replace leaked control phrase "${phrase}" with natural in-world prose.`),
        ];

        console.log(
          'Continuity pass detected repairable prose issues during generation:',
          repairWarnings
        );

        console.log('Attempting silent chapter repair...');
        onProgress?.('repairing');
        const repairRaw = await repairChapterStream(
          currentRawBlocksStr,
          slimMemory,
          repairWarnings,
          routingConfig,
          apiHeaders
        );

        if (repairRaw.length > 150) {
          currentRawBlocksStr = repairRaw;

          consistency = await checkChapterContinuity(
            currentRawBlocksStr,
            activeStory.memory,
            slimMemory,
            routingConfig,
            apiHeaders
          );
          classified = consistency?.classified || { severe: [], soft: [] };
          surfaceLeaks = consistency?.surfaceLeaks || [];
          continuitySoftNotes = classified.soft;
        }

        if (classified.severe.length > 0) {
          console.log(
            'Continuity Guard found verified severe faults even after repair:',
            classified.severe
          );
          hasContinuityFaults = true;
          continuityWarnings = classified.severe;
        }

        if (surfaceLeaks.length > 0) {
          console.warn('Chapter repair left surface-hygiene leaks; they remain hidden from reader-facing continuity warnings.', surfaceLeaks);
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
