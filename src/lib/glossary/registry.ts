/**
 * Centralized glossary registry.
 *
 * Loads and indexes the master glossary JSON once at module initialization.
 * All retrieval code should access the glossary through this registry rather
 * than importing the raw JSON.
 *
 * Design notes:
 * - The registry is lazy: the JSON is imported via a static import so bundlers
 *   can tree-shake or code-split it, but the indexes are built on first access.
 * - Three indexes are maintained for fast O(1) lookups:
 *     1. `byTerm`     — canonical term (lowercased)
 *     2. `byAlias`    — every alias (lowercased) → canonical term
 *     3. `byCategory` — category → entry[]
 *     4. `byGenre`    — genre tag → entry[]
 */

import type { GlossaryEntry, GlossaryCategory, GlossaryGenre } from './types';
import rawGlossary from '../../../glossary/master_glossary_schema_locked.json';

// Cast the imported JSON — Vite resolves JSON imports as `any[]`
const _entries: GlossaryEntry[] = rawGlossary as unknown as GlossaryEntry[];

// ─── Index structures ─────────────────────────────────────────────────────────

let _initialized = false;

/** Maps lowercased canonical term → entry */
const _byTerm = new Map<string, GlossaryEntry>();

/** Maps lowercased alias → canonical term key (for use with _byTerm) */
const _byAlias = new Map<string, string>();

/** Maps category → entries */
const _byCategory = new Map<GlossaryCategory, GlossaryEntry[]>();

/** Maps sourceGenre (as-is) → entries */
const _byGenre = new Map<GlossaryGenre, GlossaryEntry[]>();

function buildIndexes(): void {
  if (_initialized) return;

  for (const entry of _entries) {
    const termKey = entry.term.toLowerCase();
    _byTerm.set(termKey, entry);

    // Alias index
    for (const alias of entry.aliases ?? []) {
      const aliasKey = alias.toLowerCase();
      if (!_byAlias.has(aliasKey)) {
        _byAlias.set(aliasKey, termKey);
      }
    }

    // Category index
    if (entry.category) {
      const existing = _byCategory.get(entry.category) ?? [];
      existing.push(entry);
      _byCategory.set(entry.category, existing);
    }

    // Genre index
    for (const genre of entry.sourceGenres ?? []) {
      const existing = _byGenre.get(genre) ?? [];
      existing.push(entry);
      _byGenre.set(genre, existing);
    }
  }

  _initialized = true;
}

// ─── Public registry API ──────────────────────────────────────────────────────

/** Returns every entry in the glossary (unfiltered). */
export function getAllEntries(): readonly GlossaryEntry[] {
  buildIndexes();
  return _entries;
}

/**
 * Looks up an entry by its canonical term name (case-insensitive).
 * Returns `undefined` if no match is found.
 */
export function getEntryByTerm(term: string): GlossaryEntry | undefined {
  buildIndexes();
  return _byTerm.get(term.toLowerCase());
}

/**
 * Looks up an entry by an alias (case-insensitive).
 * Falls back to looking up the string as a canonical term.
 * Returns `undefined` if no match is found.
 */
export function getEntryByAlias(alias: string): GlossaryEntry | undefined {
  buildIndexes();
  const aliasKey = alias.toLowerCase();
  const termKey = _byAlias.get(aliasKey) ?? aliasKey;
  return _byTerm.get(termKey);
}

/**
 * Returns all entries for a given category.
 * Returns an empty array when the category has no entries.
 */
export function getEntriesByCategory(category: GlossaryCategory): GlossaryEntry[] {
  buildIndexes();
  return _byCategory.get(category) ?? [];
}

/**
 * Returns all entries whose `sourceGenres` includes the given genre.
 * Genre matching is exact and case-sensitive (matching the JSON values).
 */
export function getEntriesByGenre(genre: GlossaryGenre): GlossaryEntry[] {
  buildIndexes();
  return _byGenre.get(genre) ?? [];
}

/**
 * Returns all entries whose `sourceGenres` overlaps with the given list.
 * Results are deduplicated and ordered by priority (high → medium → low),
 * then alphabetically by term.
 */
export function getEntriesByGenres(genres: GlossaryGenre[]): GlossaryEntry[] {
  buildIndexes();
  if (!genres.length) return [];

  const seen = new Set<string>();
  const results: GlossaryEntry[] = [];

  for (const genre of genres) {
    for (const entry of _byGenre.get(genre) ?? []) {
      if (!seen.has(entry.term)) {
        seen.add(entry.term);
        results.push(entry);
      }
    }
  }

  return sortByPriority(results);
}

/**
 * Returns all distinct categories present in the glossary.
 */
export function getCategories(): GlossaryCategory[] {
  buildIndexes();
  return Array.from(_byCategory.keys());
}

/**
 * Returns all distinct source genres present in the glossary.
 */
export function getGenres(): GlossaryGenre[] {
  buildIndexes();
  return Array.from(_byGenre.keys());
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

export function sortByPriority(entries: GlossaryEntry[]): GlossaryEntry[] {
  return [...entries].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 3;
    const pb = PRIORITY_ORDER[b.priority] ?? 3;
    if (pa !== pb) return pa - pb;
    return a.term.localeCompare(b.term);
  });
}
