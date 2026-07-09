/**
 * Glossary type definitions.
 *
 * These types mirror the structure of `glossary/master_glossary_schema_locked.json`
 * and define the retrieval API surface. Do NOT import the raw JSON directly
 * outside of this module — use the registry and retrieval functions instead.
 */

// ─── Raw glossary schema (mirrors JSON) ─────────────────────────────────────

/** Native-language script data for a single language family. */
export interface NativeLanguageEntry {
  hanzi?: string;
  pinyin?: string;
  traditional?: string;
  hangul?: string;
  romanization?: string;
  kanji?: string;
  romaji?: string;
}

/** Native-language data across the three primary source language families. */
export interface NativeLanguages {
  chinese?: NativeLanguageEntry;
  korean?: NativeLanguageEntry;
  japanese?: NativeLanguageEntry;
}

/** A single locale's translated term with optional aliases and note. */
export interface LocalizationEntry {
  term: string;
  aliases: string[];
  translationNote: string;
}

/** All localized variants of a glossary entry, keyed by BCP-47 locale code. */
export type Localizations = Record<string, LocalizationEntry>;

/** How a term should be handled across translations. */
export type TranslationStrategy = 'preserve' | 'translate' | 'contextual' | 'hybrid';

/** Editorial priority of the entry. */
export type GlossaryPriority = 'high' | 'medium' | 'low';

/** Editorial status of the entry. */
export type GlossaryStatus = 'verified' | 'draft' | 'review';

/**
 * Broad thematic category for a glossary term.
 * Derived from the locked JSON; extend if new entries introduce new values.
 */
export type GlossaryCategory =
  | 'Cultivation'
  | 'Artifacts and Pills'
  | 'Techniques'
  | 'Sects'
  | 'Beast Taming'
  | 'Regression and Reincarnation'
  | 'Japanese'
  | 'Korean'
  | 'LitRPG System'
  | 'Genre'
  | 'Academy'
  | 'Character Archetypes'
  | 'Progression Tropes'
  | 'Realms'
  | 'SEN Platform'
  | 'Kingdom Building'
  | 'Cosmology'
  | 'Geography'
  | 'Meta-Fiction'
  | (string & {}); // allow forward-compat additions

/**
 * A known source genre tag used on `sourceGenres` arrays.
 * Keeping this as a wide string union so new genres don't break compilation,
 * while still providing autocomplete for common values.
 */
export type GlossaryGenre =
  | 'Xianxia'
  | 'Xuanhuan'
  | 'Wuxia'
  | 'Murim'
  | 'LitRPG'
  | 'Academy'
  | 'Beast-Taming'
  | 'Korean'
  | 'Japanese'
  | 'Chinese'
  | 'Romance'
  | 'Modern Fantasy'
  | 'Urban Fantasy'
  | 'Meta-Fiction'
  | 'Hunter'
  | 'System'
  | 'VRMMO'
  | 'Isekai'
  | 'Cultivation'
  | 'Esper/Guide'
  | 'Transmigration'
  | 'Otome Isekai'
  | 'Regression'
  | 'Multiverse'
  | 'Buddhist'
  | 'Tower'
  | 'SEN Platform'
  | 'Romance Fantasy'
  | 'Slice of Life'
  | 'Fantasy'
  | 'Comedy'
  | 'Harem'
  | 'Dungeon Core'
  | 'Base Building'
  | 'Kingdom Building'
  | 'Sect Management'
  | 'Historical'
  | 'Demonic'
  | 'Dark Fantasy'
  | 'Apocalypse'
  | 'Modern Romance'
  | 'Base-Building'
  | 'Sci-Fi'
  | (string & {});

/** A single entry in the master glossary JSON array. */
export interface GlossaryEntry {
  term: string;
  aliases: string[];
  definition: string;
  category: GlossaryCategory;
  translationNote: string;
  translationStrategy: TranslationStrategy;
  sourceGenres: GlossaryGenre[];
  priority: GlossaryPriority;
  status: GlossaryStatus;
  auditNotes: string;
  related_terms: string[];
  nativeLanguages: NativeLanguages;
  localizations: Localizations;
}

// ─── Retrieval API surface ───────────────────────────────────────────────────

/**
 * Usage mode that determines which fields are returned.
 *
 * - `translation`    — human / machine translation workflow
 * - `generation`     — AI story-generation prompt injection (compact rules only)
 * - `readerTooltip`  — in-app hover/tooltip display for readers
 * - `codex`          — Codex / lore-browser panel
 * - `tts`            — text-to-speech pronunciation guidance
 */
export type GlossaryUsageMode =
  | 'translation'
  | 'generation'
  | 'readerTooltip'
  | 'codex'
  | 'tts';

/** Input parameters for `retrieveGlossaryEntries`. */
export interface GlossaryRetrievalParams {
  /** Source text to match against (term name, aliases, definition keywords). */
  sourceText: string;
  /** Narrow results to entries whose `sourceGenres` overlap with these tags. */
  genreTags?: GlossaryGenre[];
  /**
   * BCP-47 locale code for the target locale (e.g. `'es'`, `'pt-br'`, `'vi'`).
   * Only used in `translation` and `readerTooltip` modes.
   */
  targetLocale?: string;
  /** Determines which fields are included in each returned result. */
  usageMode: GlossaryUsageMode;
  /**
   * Maximum number of entries to return. Defaults to 10.
   * Lower this when injecting into prompts.
   */
  maxResults?: number;
}

// ─── Mode-specific result shapes ─────────────────────────────────────────────

/** Fields shared by every result shape. */
interface GlossaryResultBase {
  term: string;
  category: GlossaryCategory;
  priority: GlossaryPriority;
}

/** Full translation payload — returned for `usageMode: 'translation'`. */
export interface TranslationResult extends GlossaryResultBase {
  mode: 'translation';
  canonicalTerm: string;
  localizedTerm: string | null;
  translationStrategy: TranslationStrategy;
  translationNote: string;
  localizedNote: string | null;
  aliases: string[];
  relatedTerms: string[];
  /**
   * Forbidden translation rules extracted from `translationNote`.
   * Any sentence/clause that contains the word "never" (case-insensitive)
   * is surfaced here for quick enforcement.
   */
  forbiddenRules: string[];
}

/**
 * Compact generation guard — returned for `usageMode: 'generation'`.
 * Keeps prompts small: only what the model needs to avoid genre contamination.
 */
export interface GenerationResult extends GlossaryResultBase {
  mode: 'generation';
  /** Canonical English term as it must appear in generated text. */
  canonicalTerm: string;
  /** Short instruction for the model (derived from `translationNote`). */
  rule: string;
  /** All known surface forms (term + aliases) so the model recognises them. */
  surfaceForms: string[];
}

/** Reader-facing tooltip — returned for `usageMode: 'readerTooltip'`. */
export interface ReaderTooltipResult extends GlossaryResultBase {
  mode: 'readerTooltip';
  /** Display term in the reader's locale (falls back to canonical). */
  displayTerm: string;
  /** Short definition for tooltip display. */
  definition: string;
  /** Native-script representation, if available. */
  nativeScript: string | null;
}

/** Rich lore entry for the Codex panel — returned for `usageMode: 'codex'`. */
export interface CodexResult extends GlossaryResultBase {
  mode: 'codex';
  definition: string;
  aliases: string[];
  relatedTerms: string[];
  sourceGenres: GlossaryGenre[];
  translationStrategy: TranslationStrategy;
  nativeLanguages: NativeLanguages;
}

/** Pronunciation guidance for TTS — returned for `usageMode: 'tts'`. */
export interface TtsResult extends GlossaryResultBase {
  mode: 'tts';
  /** Preferred spoken-form of the term (pinyin / romanization / canonical). */
  preferredPronunciation: string;
  /** All surface forms that the TTS engine may encounter. */
  surfaceForms: string[];
}

/** Discriminated union of all possible result types. */
export type GlossaryResult =
  | TranslationResult
  | GenerationResult
  | ReaderTooltipResult
  | CodexResult
  | TtsResult;
