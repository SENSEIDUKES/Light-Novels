import { StoryMemory } from '../../types';
import { extractJsonBlocks } from '../storyEngineHelpers';

/**
 * CONTINUITY VERIFIER
 * -------------------
 * The Continuity Guard LLM is a PROPOSER, not the gate. It over-flags: it narrates
 * "no contradiction found" essays, and it mistakes embedded image/codex data for
 * lore drift. Wording the prompt more strictly has never made that reach zero.
 *
 * So the reader-facing decision is made HERE, in deterministic code, grounded in the
 * Codex's own structured status fields (Character.status === 'deceased',
 * Faction.status === 'Destroyed'). A warning can only reach the alarming red box if it
 * genuinely references a dead/destroyed entity that actually appears in this chapter.
 * Everything plausible-but-unproven is downgraded to a quiet "soft note"; obvious noise
 * is dropped entirely.
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

// Control language is useful as prompt/UI metadata, but it should not reach ordinary
// reader-facing narration or dialogue. Keep this deliberately phrase-based: mythic
// words such as "fate", "destiny", and "karma" remain valid cultivation prose.
const SURFACE_PROSE_DENYLIST = [
  'enemies to lovers',
  'slow burn',
  'face-slapping',
  'power fantasy',
  'relationship development',
  'romance tension',
  'arc goal',
  'scene intent',
  'pacing directive',
  'story tag',
  'trope',
  'mid',
  'fate pressure',
  'fate survival',
  'hardcore fate',
  'dao master',
  'death flag detected',
  'betrayal check',
  'fate lock',
  'hidden timer',
  'doom deadline',
  'fate deadline',
  'fate scar',
  'timeline scar',
  'destiny shift',
  'fate event',
  'this action shifted destiny',
  'permanently alter the timeline',
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
 * Pull ONLY the prose the reader sees out of the raw NDJSON blocks. World-card /
 * image / system metadata (imageUrl, codexEntryId, entity ids like `char-5slteiy7f`)
 * is dropped so the guard can never mistake it for lore drift.
 */
export const extractProseForContinuity = (rawBlocksStr: string): string => {
  try {
    const blocks = extractJsonBlocks(rawBlocksStr);
    if (Array.isArray(blocks) && blocks.length > 0) {
      const prose = blocks
        .map((b: any) => (typeof b?.text === 'string' ? b.text : ''))
        .filter(Boolean)
        .join('\n\n')
        .trim();
      if (prose.length > 0) return prose;
    }
  } catch {
    /* fall through to raw */
  }
  return rawBlocksStr;
};

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Unicode-aware "word" characters. JavaScript's \b is ASCII-only, so it never matches a
// boundary around accented ("René"), Cyrillic, or CJK ("林越") names — silently
// downgrading genuine severe faults for non-English stories. These lookarounds recreate
// a whole-word boundary using Unicode letter/number/mark classes under the `u` flag.
const WORD_CHAR = '[\\p{L}\\p{N}\\p{M}_]';

/** Finds literal control-language leaks in prose without inspecting block metadata. */
export const findSurfaceProseLeaks = (prose: string): string[] => {
  const proseText = prose || '';
  return SURFACE_PROSE_DENYLIST.filter((phrase) =>
    new RegExp(`(?<!${WORD_CHAR})${escapeRegExp(phrase)}(?!${WORD_CHAR})`, 'ui').test(proseText)
  );
};

/**
 * Whole-word, case-insensitive matchers for every Codex entity currently marked
 * deceased/destroyed. The boundary is essential: a short name like "Lin" must NOT
 * match "smiling" or "link", or the verifier would manufacture the very false positives
 * it exists to prevent.
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
    .map(
      (n) =>
        new RegExp(`(?<!${WORD_CHAR})${escapeRegExp(n.trim())}(?!${WORD_CHAR})`, 'ui')
    );
};

/**
 * Turn the LLM's raw list of "warnings" into what the reader may actually see.
 *
 * DROP:   self-negating essays + embedded media noise + rambling over-length text.
 * SEVERE: names a Codex entity that is literally deceased/destroyed AND that entity
 *         appears in this chapter's prose — the only thing worth alarming over.
 * SOFT:   everything else that survived — a quiet, non-alarming FYI.
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

    // DROP — obvious noise / the model contradicting itself.
    if (text.length > MAX_WARNING_LENGTH) continue;
    if (SELF_NEGATING.some((p) => lower.includes(p))) continue;
    if (MEDIA_NOISE.some((p) => lower.includes(p))) continue;

    // SEVERE — grounded in the Codex's own status fields, not the model's vibes.
    // Whole-word match required in BOTH the warning and the chapter prose.
    const isVerifiedSevere = deadMatchers.some(
      (re) => re.test(text) && re.test(proseText)
    );

    if (isVerifiedSevere) {
      severe.push(text);
    } else {
      soft.push(text);
    }
  }

  // A genuine hard contradiction is rare and singular; cap soft notes so a chatty
  // guard can never wall the chapter in FYIs.
  return { severe, soft: soft.slice(0, 4) };
};
