/**
 * Glossary retrieval function.
 *
 * `retrieveGlossaryEntries` is the single entry-point for all feature code
 * that needs glossary context. It never returns the full 396-entry glossary;
 * it always filters to only the entries relevant to the given source text,
 * genre tags, and usage mode.
 *
 * Ranking strategy (local-first, no external vector DB):
 *   Entries are scored across six dimensions and returned highest-score-first.
 *
 *   1. Exact term match    — canonical term appears verbatim in source text
 *   2. Alias match         — any alias appears verbatim in source text
 *   3. Priority            — high / medium / low per the editorial `priority` field
 *   4. Genre overlap       — per-genre bonus for each sourceGenre in genreTags
 *   5. Category relevance  — bonus when the entry shares its category with the
 *                            dominant category of text-matched (exact/alias) entries
 *   6. Related term overlap — bonus for each of the entry's `related_terms` that
 *                             also appears in the current matched set
 *
 * Entries with a total score of zero are excluded.
 * `maxResults` caps the final list (default 10).
 *
 * Two-pass design:
 *   Pass 1 — per-entry base score: exact match, alias, priority, genre overlap.
 *   Pass 2 — relational bonuses that require knowing the full matched set first:
 *             category relevance and related-term overlap.
 */

import type {
  GlossaryEntry,
  GlossaryCategory,
  GlossaryGenre,
  GlossaryResult,
  GlossaryRetrievalParams,
  TranslationResult,
  GenerationResult,
  ReaderTooltipResult,
  CodexResult,
  TtsResult,
} from './types';
import { getAllEntries } from './registry';

// ─── Score weights ────────────────────────────────────────────────────────────

/**
 * Numeric weights for each ranking dimension.
 * Exported so callers and tests can reason about expected ordering without
 * magic numbers.
 */
export const RETRIEVAL_SCORES = {
  /** Canonical term found verbatim in source text. */
  EXACT_TERM: 1000,
  /** An alias found verbatim in source text (weaker than exact term). */
  ALIAS_MATCH: 800,
  /** `priority: "high"` editorial weight. */
  PRIORITY_HIGH: 300,
  /** `priority: "medium"` editorial weight. */
  PRIORITY_MEDIUM: 150,
  /** `priority: "low"` editorial weight. */
  PRIORITY_LOW: 50,
  /**
   * Added per overlapping genre between `sourceGenres` and caller's `genreTags`.
   * Multiple genre overlaps stack (e.g., Xianxia + Xuanhuan → +200).
   */
  GENRE_PER_MATCH: 100,
  /**
   * Added when the entry's category matches the dominant category of
   * text-matched entries (i.e., categories of exact/alias-matched entries).
   * Ensures thematically on-topic entries from the same conceptual cluster
   * surface above unrelated terms of equal priority.
   */
  CATEGORY_BONUS: 75,
  /**
   * Added per `related_terms` string that also appears as a matched term
   * in the current result set. Rewards tight conceptual clusters.
   */
  RELATED_TERM_BONUS: 50,
} as const;

// ─── Internal types ───────────────────────────────────────────────────────────

interface ScoredEntry {
  entry: GlossaryEntry;
  score: number;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Retrieves relevant glossary entries for the given source text and context,
 * ranked by a multi-dimensional relevance score.
 *
 * @example
 * // Translation mode — get localized terms + forbidden rules for Spanish
 * const entries = retrieveGlossaryEntries({
 *   sourceText: 'He circulated Qi through his Dantian',
 *   genreTags: ['Xianxia'],
 *   targetLocale: 'es',
 *   usageMode: 'translation',
 * });
 *
 * @example
 * // Generation mode — compact rules to prevent genre contamination
 * const rules = retrieveGlossaryEntries({
 *   sourceText: systemPrompt,
 *   genreTags: ['Xianxia', 'Xuanhuan'],
 *   usageMode: 'generation',
 *   maxResults: 15,
 * });
 */
export function retrieveGlossaryEntries(
  params: GlossaryRetrievalParams
): GlossaryResult[] {
  const {
    sourceText,
    genreTags = [],
    targetLocale,
    usageMode,
    maxResults = 10,
  } = params;

  const ranked = rankEntries(sourceText, genreTags);
  const capped = ranked.slice(0, maxResults);

  return capped.map(({ entry }) => projectEntry(entry, usageMode, targetLocale));
}

// ─── Scoring pipeline ─────────────────────────────────────────────────────────

/**
 * Scores all glossary entries against the given source text and genre tags,
 * then returns them sorted by score descending. Entries with a score of 0
 * (no signal at all) are excluded.
 */
function rankEntries(
  sourceText: string,
  genreTags: GlossaryGenre[]
): ScoredEntry[] {
  const allEntries = getAllEntries();
  const sourceLower = sourceText.toLowerCase();
  const genreSet = new Set(genreTags);
  const hasGenreFilter = genreSet.size > 0;

  // ── Pass 1: base scores ───────────────────────────────────────────────────
  const scored: ScoredEntry[] = [];

  for (const entry of allEntries) {
    const baseScore = computeBaseScore(entry, sourceLower, genreSet, hasGenreFilter);
    if (baseScore > 0) {
      scored.push({ entry, score: baseScore });
    }
  }

  if (scored.length === 0) return [];

  // ── Pass 2: relational bonuses ────────────────────────────────────────────

  // Determine the dominant category from exact/alias-matched entries.
  // "Dominant" = the category with the highest count among text-matched entries;
  // ties broken by first encountered.
  const dominantCategory = computeDominantCategory(scored, sourceLower);

  // Build a set of canonical term names that are in the matched set for fast
  // O(1) related-term lookups. Use lowercased keys to match `related_terms` strings.
  const matchedTermNames = new Set(scored.map(({ entry }) => entry.term.toLowerCase()));

  // Apply relational bonuses in place.
  for (const item of scored) {
    item.score += computeRelationalBonus(
      item.entry,
      dominantCategory,
      matchedTermNames
    );
  }

  // Sort by score descending, then alphabetically by term for stable ordering.
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.entry.term.localeCompare(b.entry.term);
  });

  return scored;
}

// ─── Pass 1 helpers ───────────────────────────────────────────────────────────

/**
 * Computes the base score for a single entry across the first four dimensions.
 * Returns 0 if the entry has no signal (no text match and no genre match).
 */
function computeBaseScore(
  entry: GlossaryEntry,
  sourceLower: string,
  genreSet: Set<GlossaryGenre>,
  hasGenreFilter: boolean
): number {
  let score = 0;
  let hasTextMatch = false;
  let hasGenreMatch = false;

  // Dimension 1 — exact term match.
  // Checked first so an alias hit on the same term string doesn't double-count.
  if (termAppearsInText(entry.term, sourceLower)) {
    score += RETRIEVAL_SCORES.EXACT_TERM;
    hasTextMatch = true;
  } else {
    // Dimension 2 — alias match (only when the canonical term didn't match).
    for (const alias of entry.aliases ?? []) {
      if (alias && termAppearsInText(alias, sourceLower)) {
        score += RETRIEVAL_SCORES.ALIAS_MATCH;
        hasTextMatch = true;
        break; // One alias match is sufficient; don't stack multiple alias hits.
      }
    }
  }

  // Dimension 3 — editorial priority.
  score += priorityScore(entry.priority);

  // Dimension 4 — genre overlap (stacks per matching genre).
  if (hasGenreFilter) {
    for (const genre of entry.sourceGenres ?? []) {
      if (genreSet.has(genre)) {
        score += RETRIEVAL_SCORES.GENRE_PER_MATCH;
        hasGenreMatch = true;
      }
    }
  }

  // Exclude entries that only carry a priority score with no text or genre signal.
  if (!hasTextMatch && !hasGenreMatch) return 0;

  return score;
}

function priorityScore(priority: GlossaryEntry['priority']): number {
  switch (priority) {
    case 'high':   return RETRIEVAL_SCORES.PRIORITY_HIGH;
    case 'medium': return RETRIEVAL_SCORES.PRIORITY_MEDIUM;
    case 'low':    return RETRIEVAL_SCORES.PRIORITY_LOW;
    default:       return 0;
  }
}

// ─── Pass 2 helpers ───────────────────────────────────────────────────────────

/**
 * Identifies the most frequent category among entries that matched via source
 * text (exact term or alias). Returns `null` when no text matches exist.
 *
 * Used to compute the category relevance bonus: if most text-matched entries
 * are "Cultivation", that category becomes dominant, so other Cultivation
 * entries in the genre pool also receive the bonus.
 */
function computeDominantCategory(
  scored: ScoredEntry[],
  sourceLower: string
): GlossaryCategory | null {
  const counts = new Map<GlossaryCategory, number>();

  for (const { entry } of scored) {
    const isTextMatch =
      termAppearsInText(entry.term, sourceLower) ||
      (entry.aliases ?? []).some((a) => a && termAppearsInText(a, sourceLower));

    if (isTextMatch && entry.category) {
      counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
    }
  }

  if (counts.size === 0) return null;

  let dominant: GlossaryCategory | null = null;
  let maxCount = 0;
  for (const [cat, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      dominant = cat;
    }
  }
  return dominant;
}

/**
 * Computes the relational bonus for an entry:
 *
 *   Dimension 5 — category relevance:
 *     +CATEGORY_BONUS if entry.category === dominantCategory.
 *
 *   Dimension 6 — related term overlap:
 *     +RELATED_TERM_BONUS for each `related_terms` entry (lowercased) that is
 *     already present in the current matched term set.
 */
function computeRelationalBonus(
  entry: GlossaryEntry,
  dominantCategory: GlossaryCategory | null,
  matchedTermNames: Set<string>
): number {
  let bonus = 0;

  // Dimension 5 — category relevance.
  if (dominantCategory !== null && entry.category === dominantCategory) {
    bonus += RETRIEVAL_SCORES.CATEGORY_BONUS;
  }

  // Dimension 6 — related term overlap.
  for (const rel of entry.related_terms ?? []) {
    if (rel && matchedTermNames.has(rel.toLowerCase())) {
      bonus += RETRIEVAL_SCORES.RELATED_TERM_BONUS;
    }
  }

  return bonus;
}

// ─── Text matching helpers ────────────────────────────────────────────────────

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 
 * Returns true if the term appears as a distinct word in the text.
 * Uses unicode word boundaries for letters/numbers, but avoids boundaries 
 * on symbols to allow terms like "-sama" to match inside "Kazuma-sama".
 */
function termAppearsInText(term: string, textLower: string): boolean {
  const escaped = escapeRegExp(term);
  const startBound = /^[\p{L}\w]/iu.test(term) ? '\\b' : '';
  const endBound = /[\p{L}\w]$/iu.test(term) ? '\\b' : '';
  const regex = new RegExp(startBound + escaped + endBound, 'iu');
  return regex.test(textLower);
}

// ─── Projection helpers ───────────────────────────────────────────────────────

function projectEntry(
  entry: GlossaryEntry,
  mode: GlossaryRetrievalParams['usageMode'],
  targetLocale?: string
): GlossaryResult {
  switch (mode) {
    case 'translation':
      return projectTranslation(entry, targetLocale);
    case 'generation':
      return projectGeneration(entry);
    case 'readerTooltip':
      return projectReaderTooltip(entry, targetLocale);
    case 'codex':
      return projectCodex(entry);
    case 'tts':
      return projectTts(entry);
  }
}

// ── translation ───────────────────────────────────────────────────────────────

function projectTranslation(
  entry: GlossaryEntry,
  targetLocale?: string
): TranslationResult {
  const localization =
    (targetLocale && entry.localizations?.[targetLocale]) ?? null;

  return {
    mode: 'translation',
    term: entry.term,
    category: entry.category,
    priority: entry.priority,
    canonicalTerm: entry.term,
    localizedTerm: localization?.term ?? null,
    translationStrategy: entry.translationStrategy,
    translationNote: entry.translationNote,
    localizedNote: localization?.translationNote ?? null,
    aliases: entry.aliases ?? [],
    relatedTerms: entry.related_terms ?? [],
    forbiddenRules: extractForbiddenRules(entry.translationNote),
  };
}

/**
 * Extracts sentences/clauses that contain the word "never" from a translation
 * note. These represent hard forbidden-translation rules.
 */
function extractForbiddenRules(note: string): string[] {
  if (!note) return [];
  // Split on sentence boundaries (period, semicolon) then filter for "never"
  return note
    .split(/[.;]/)
    .map((s) => s.trim())
    .filter((s) => /\bnever\b/i.test(s));
}

// ── generation ────────────────────────────────────────────────────────────────

function projectGeneration(entry: GlossaryEntry): GenerationResult {
  // For generation mode we produce the most compact possible rule to inject
  // into a system prompt. We prioritise translation notes that contain
  // explicit "never" constraints, and fall back to a short form if none exist.
  const forbidden = extractForbiddenRules(entry.translationNote);
  const rule =
    forbidden.length > 0
      ? forbidden.join('; ')
      : entry.translationNote
        ? entry.translationNote.split('.')[0].trim()
        : `Use "${entry.term}" exactly as written.`;

  const surfaceForms = [
    entry.term,
    ...(entry.aliases ?? []),
  ].filter(Boolean);

  return {
    mode: 'generation',
    term: entry.term,
    category: entry.category,
    priority: entry.priority,
    canonicalTerm: entry.term,
    rule,
    surfaceForms,
  };
}

// ── readerTooltip ─────────────────────────────────────────────────────────────

function projectReaderTooltip(
  entry: GlossaryEntry,
  targetLocale?: string
): ReaderTooltipResult {
  const localization =
    (targetLocale && entry.localizations?.[targetLocale]) ?? null;

  const displayTerm = localization?.term ?? entry.term;

  // Build a concise native-script string (e.g. "丹田 (dāntián)") for tooltip
  const nativeScript = buildNativeScriptLabel(entry);

  return {
    mode: 'readerTooltip',
    term: entry.term,
    category: entry.category,
    priority: entry.priority,
    displayTerm,
    definition: entry.definition,
    nativeScript,
  };
}

function buildNativeScriptLabel(entry: GlossaryEntry): string | null {
  const zh = entry.nativeLanguages?.chinese;
  if (zh?.hanzi) {
    const parts = [zh.hanzi];
    if (zh.pinyin) parts.push(`(${zh.pinyin})`);
    return parts.join(' ');
  }
  const ko = entry.nativeLanguages?.korean;
  if (ko?.hangul) {
    const parts = [ko.hangul];
    if (ko.romanization) parts.push(`(${ko.romanization})`);
    return parts.join(' ');
  }
  const ja = entry.nativeLanguages?.japanese;
  if (ja?.kanji) {
    const parts = [ja.kanji];
    if (ja.romaji) parts.push(`(${ja.romaji})`);
    return parts.join(' ');
  }
  return null;
}

// ── codex ─────────────────────────────────────────────────────────────────────

function projectCodex(entry: GlossaryEntry): CodexResult {
  return {
    mode: 'codex',
    term: entry.term,
    category: entry.category,
    priority: entry.priority,
    definition: entry.definition,
    aliases: entry.aliases ?? [],
    relatedTerms: entry.related_terms ?? [],
    sourceGenres: entry.sourceGenres ?? [],
    translationStrategy: entry.translationStrategy,
    nativeLanguages: entry.nativeLanguages,
  };
}

// ── tts ───────────────────────────────────────────────────────────────────────

function projectTts(entry: GlossaryEntry): TtsResult {
  // Prefer pinyin for Chinese-origin terms, romanization for Korean, romaji for Japanese.
  const zh = entry.nativeLanguages?.chinese;
  const ko = entry.nativeLanguages?.korean;
  const ja = entry.nativeLanguages?.japanese;

  const preferredPronunciation =
    (zh?.pinyin || undefined) ??
    (ko?.romanization || undefined) ??
    (ja?.romaji || undefined) ??
    entry.term;

  const surfaceForms = [entry.term, ...(entry.aliases ?? [])].filter(Boolean);

  return {
    mode: 'tts',
    term: entry.term,
    category: entry.category,
    priority: entry.priority,
    preferredPronunciation,
    surfaceForms,
  };
}
