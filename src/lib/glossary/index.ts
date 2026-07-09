/**
 * `src/lib/glossary` — public API barrel.
 *
 * All callers outside this module should import from this path:
 *
 *   import { retrieveGlossaryEntries } from '@/src/lib/glossary';
 *   // or
 *   import { retrieveGlossaryEntries } from '../lib/glossary';
 *
 * Do NOT import from `./registry`, `./retrieve`, or `./types` directly
 * in feature code — use this barrel so internal structure can change freely.
 */

// ── Retrieval function ────────────────────────────────────────────────────────
export { retrieveGlossaryEntries, RETRIEVAL_SCORES } from './retrieve';

// ── Registry helpers (for advanced use cases e.g. autocomplete) ───────────────
export {
  getAllEntries,
  getEntryByTerm,
  getEntryByAlias,
  getEntriesByCategory,
  getEntriesByGenre,
  getEntriesByGenres,
  getCategories,
  getGenres,
} from './registry';

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  // Schema types
  GlossaryEntry,
  GlossaryCategory,
  GlossaryGenre,
  GlossaryPriority,
  GlossaryStatus,
  GlossaryUsageMode,
  TranslationStrategy,
  NativeLanguages,
  NativeLanguageEntry,
  LocalizationEntry,
  Localizations,
  // Retrieval types
  GlossaryRetrievalParams,
  GlossaryResult,
  TranslationResult,
  GenerationResult,
  ReaderTooltipResult,
  CodexResult,
  TtsResult,
} from './types';
