import { ChapterHandoff, SceneFingerprint, Story } from '../../types';
import { slimMemoryForRequest } from '../../lib/slimMemoryForRequest';
import { formatHandoffContextForGuard } from '../../lib/chapterHandoff';
import { checkChapterContinuity } from './checkChapterContinuity';
import { extractProseForContinuity } from './continuityText';
import { repairChapterStream } from './repairChapterStream';
import { scanForSceneReplay } from './replayScan';

export type ContinuityPhase = 'checking' | 'repairing';

export interface ContinuityPassResult {
  hasContinuityFaults: boolean;
  continuityWarnings: string[];
  continuitySoftNotes: string[];
  finalRawBlocksStr: string;
}

export interface ContinuityPassOptions {
  /** Chapter being generated; enables the deterministic replay scan. */
  targetChapterNumber?: number;
  /** Previous chapter's canonical handoff, forwarded to the guard LLM. */
  previousHandoff?: ChapterHandoff;
}

const collectPriorFingerprints = (
  activeStory: Story,
  targetChapterNumber: number,
): SceneFingerprint[] =>
  activeStory.arcs
    .flatMap(arc => arc.chapters)
    .filter(chapter => chapter.number < targetChapterNumber)
    .flatMap(chapter => chapter.sceneFingerprints || []);

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
 * Context Engine 2.5 adds an independent deterministic replay scan: re-narrated
 * deaths from the immediate 2-chapter lookback are severe (repairable);
 * breakthrough/acquisition replays surface as soft notes only.
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
  onProgress?: (phase: ContinuityPhase) => void,
  options?: ContinuityPassOptions,
): Promise<ContinuityPassResult> => {
  let hasContinuityFaults = false;
  let continuityWarnings: string[] = [];
  let continuitySoftNotes: string[] = [];
  let currentRawBlocksStr = finalRawBlocksStr;

  // Strip base64 media / embeddings so these requests also stay under the hosting
  // edge's ~4.5 MB body cap (the guard only reads text/status fields).
  const slimMemory = slimMemoryForRequest(activeStory.memory);
  const handoffContext = options?.previousHandoff
    ? formatHandoffContextForGuard(options.previousHandoff)
    : undefined;
  const priorFingerprints = typeof options?.targetChapterNumber === 'number'
    ? collectPriorFingerprints(activeStory, options.targetChapterNumber)
    : [];

  const runReplayScan = (rawBlocksStr: string) =>
    typeof options?.targetChapterNumber === 'number'
      ? scanForSceneReplay(
          extractProseForContinuity(rawBlocksStr),
          priorFingerprints,
          options.targetChapterNumber,
        )
      : { severe: [], soft: [] };

  try {
    onProgress?.('checking');
    let consistency = await checkChapterContinuity(
      currentRawBlocksStr,
      activeStory.memory,
      slimMemory,
      routingConfig,
      apiHeaders,
      handoffContext,
    );
    let replay = runReplayScan(currentRawBlocksStr);

    if (consistency) {
      let { classified, surfaceLeaks } = consistency;
      continuitySoftNotes = [...classified.soft, ...replay.soft];

      if (classified.severe.length > 0 || surfaceLeaks.length > 0 || replay.severe.length > 0) {
        const repairWarnings = [
          ...classified.severe,
          ...replay.severe,
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
            apiHeaders,
            handoffContext,
          );
          classified = consistency?.classified || { severe: [], soft: [] };
          surfaceLeaks = consistency?.surfaceLeaks || [];
          replay = runReplayScan(currentRawBlocksStr);
          continuitySoftNotes = [...classified.soft, ...replay.soft];
        }

        const remainingSevere = [...classified.severe, ...replay.severe];
        if (remainingSevere.length > 0) {
          console.log(
            'Continuity Guard found verified severe faults even after repair:',
            remainingSevere
          );
          hasContinuityFaults = true;
          continuityWarnings = remainingSevere;
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
