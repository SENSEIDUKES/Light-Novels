import { SceneFingerprint } from '../../types';
import { createWholeWordMatcher } from './continuityMatchers';

/**
 * Deterministic Stage A replay scan (Context Engine 2.5).
 *
 * Detects re-narration of recent irreversible events in NEW prose. Tuned hard
 * against false positives:
 * - Quoted dialogue is stripped before matching — characters may freely
 *   discuss, mourn, or reference past events.
 * - Paragraphs with retrospective framing (memories, recaps, past-perfect
 *   references) never match.
 * - Only `death` fingerprints from the immediate 2-chapter lookback can become
 *   SEVERE (repair-triggering); `breakthrough`/`acquisition` replays are soft.
 */

const HARD_LOOKBACK_CHAPTERS = 2;

const DEATH_KEYWORDS =
  /\b(dies|died|dying|slain|slays|kills?|killed|perish(es|ed)?|breathed? (his|her|their) last|life (left|fled) (his|her|their)|lifeless body (fell|dropped|collapsed))\b/i;
const BREAKTHROUGH_KEYWORDS =
  /\b(broke through|breaks? through|breakthrough|advanced to|ascend(s|ed) to|stepped into the .{0,40}(realm|stage|rank|tier))\b/i;
const ACQUISITION_KEYWORDS =
  /\b(for the first time|newly (learned|acquired|obtained)|finally (grasped|learned|mastered)|acquired|obtained)\b/i;

// Retrospective / non-present framing: memories, recaps, dreams, grief, and
// past-perfect narration are legitimate references, never replays.
const RETROSPECTIVE_MARKERS =
  /\b(remember(s|ed|ing)?|recall(s|ed|ing)?|memor(y|ies)|flashback|dream(s|t|ed)?|mourn(s|ed|ing)?|grie(f|ve|ved|ving)|had (died|fallen|killed|slain|perished|broken through|learned|acquired|obtained)|was already (dead|gone)|days? (ago|before|earlier)|that (day|night|battle)|since (then|the))\b/i;

/** Removes straight- and curly-quoted spans so dialogue can never match. */
export const stripQuotedSpans = (text: string): string =>
  text
    .replace(/"[^"\n]*"/g, ' ')
    .replace(/“[^”\n]*”/g, ' ')
    .replace(/‘[^’\n]*’/g, ' ');

const keywordsForActionType = (
  actionType: SceneFingerprint['actionType'],
): RegExp | null => {
  if (actionType === 'death') return DEATH_KEYWORDS;
  if (actionType === 'breakthrough') return BREAKTHROUGH_KEYWORDS;
  if (actionType === 'acquisition') return ACQUISITION_KEYWORDS;
  return null;
};

export interface ReplayScanResult {
  /** Verified re-narrated deaths from the immediate lookback — repairable. */
  severe: string[];
  /** Plausible replays (breakthrough/acquisition) — quiet notes only. */
  soft: string[];
}

export const scanForSceneReplay = (
  prose: string,
  priorFingerprints: SceneFingerprint[],
  targetChapterNumber: number,
): ReplayScanResult => {
  const severe: string[] = [];
  const soft: string[] = [];
  if (!prose || priorFingerprints.length === 0) return { severe, soft };

  const candidates = priorFingerprints.filter(fp =>
    fp.chapterNumber >= targetChapterNumber - HARD_LOOKBACK_CHAPTERS
    && fp.chapterNumber < targetChapterNumber
    && keywordsForActionType(fp.actionType) !== null
    && fp.participants.length > 0);
  if (candidates.length === 0) return { severe, soft };

  const paragraphs = prose
    .split(/\n{2,}/)
    .map(paragraph => stripQuotedSpans(paragraph))
    .filter(paragraph => paragraph.trim().length > 0
      && !RETROSPECTIVE_MARKERS.test(paragraph));

  for (const fp of candidates) {
    const keywords = keywordsForActionType(fp.actionType)!;
    const participantMatcher = createWholeWordMatcher(fp.participants[0]);
    const replayed = paragraphs.some(paragraph =>
      participantMatcher.test(paragraph) && keywords.test(paragraph));
    if (!replayed) continue;

    const message =
      `Replay of a completed Chapter ${fp.chapterNumber} event detected: `
      + `"${fp.actionType} — ${fp.participants.join(', ')} → ${fp.outcome}" `
      + `is re-narrated as happening again in the present scene. `
      + `This already happened and must only be referenced, never replayed.`;
    if (fp.actionType === 'death') {
      severe.push(message);
    } else {
      soft.push(message);
    }
  }

  return { severe, soft };
};
