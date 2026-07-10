import { StoryMemory } from '../../types';
import { createWholeWordMatcher } from './continuityMatchers';

/**
 * The Continuity Guard LLM is a proposer, not the gate. Reader-facing severe
 * warnings are grounded here in the Codex's structured deceased/destroyed status.
 */

// The model confessing, inside a "warning", that nothing is actually wrong.
const SELF_NEGATING = [
  'no contradiction',
  'no direct contradiction',
  'no conflict',
  'no issue',
  'no discrepan',
  'no violation',
  'no continuity',
  'no problem',
  'not a contradiction',
  'consistent with',
  'is consistent',
  'are consistent',
  'aligns with',
  'align with',
  'matches the codex',
  'match the codex',
];

// Embedded image / codex-card data leaking into the guard as if it were prose.
const MEDIA_NOISE = [
  'image data',
  'image for',
  'placeholder image',
  'placeholder',
  'duplicate generation',
  'duplicate image',
  'identical to the existing codex',
  'identical to the codex',
  'imageurl',
  'base64',
  'thumbnail',
  'visual asset',
  'media data',
];

// A single genuine "the dead are walking" flag is one short sentence. Anything much
// longer is the model rambling an analysis, not reporting a hard contradiction.
const MAX_WARNING_LENGTH = 400;

export interface ClassifiedWarnings {
  /** Verified hard contradictions — these earn the alarming red box. */
  severe: string[];
  /** Plausible but unproven notes — shown quietly, never alarming. */
  soft: string[];
}

/**
 * Whole-word, case-insensitive matchers for every Codex entity currently marked
 * deceased/destroyed.
 */
const collectDeadEntityMatchers = (memory: StoryMemory): RegExp[] => {
  const names: string[] = [];
  for (const c of memory?.characters || []) {
    if (c?.status === 'deceased' && c?.name) names.push(c.name);
  }
  for (const f of memory?.factions || []) {
    if (f?.status === 'Destroyed' && f?.name) names.push(f.name);
  }
  return names
    .filter((n) => n.trim().length > 1)
    .map((n) => createWholeWordMatcher(n.trim()));
};

/**
 * DROP: self-negating essays, embedded media noise, and over-length text.
 * SEVERE: a dead/destroyed Codex entity named in both the warning and prose.
 * SOFT: every other surviving warning.
 */
export const classifyContinuityWarnings = (
  rawWarnings: any[],
  prose: string,
  memory: StoryMemory
): ClassifiedWarnings => {
  const severe: string[] = [];
  const soft: string[] = [];

  if (!Array.isArray(rawWarnings) || rawWarnings.length === 0) {
    return { severe, soft };
  }

  const deadMatchers = collectDeadEntityMatchers(memory);
  const proseText = prose || '';

  for (const raw of rawWarnings) {
    const text = typeof raw === 'string' ? raw.trim() : String(raw || '').trim();
    if (!text) continue;

    const lower = text.toLowerCase();

    if (text.length > MAX_WARNING_LENGTH) continue;
    if (SELF_NEGATING.some((p) => lower.includes(p))) continue;
    if (MEDIA_NOISE.some((p) => lower.includes(p))) continue;

    const isVerifiedSevere = deadMatchers.some(
      (re) => re.test(text) && re.test(proseText)
    );

    if (isVerifiedSevere) {
      severe.push(text);
    } else {
      soft.push(text);
    }
  }

  return { severe, soft: soft.slice(0, 4) };
};
