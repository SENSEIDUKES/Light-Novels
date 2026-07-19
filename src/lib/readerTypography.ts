import type { ReaderPreferences } from '../types';

export const DEFAULT_READER_TYPOGRAPHY = {
  lineHeightScale: 1.62,
  paragraphSpacingScale: 1.15,
  letterSpacing: 0,
  wordSpacing: 0,
  readingWidth: 62,
  textAlignment: 'start',
} as const;

const LEGACY_LINE_HEIGHT: Record<ReaderPreferences['lineHeight'], number> = {
  snug: 1.55,
  normal: 1.6,
  relaxed: 1.65,
  loose: 1.7,
};

const LEGACY_PARAGRAPH_SPACING: Record<ReaderPreferences['paragraphSpacing'], number> = {
  normal: 1.15,
  wide: 1.5,
  double: 2,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * Normalizes saved reader settings so old stories gain the new book-like
 * defaults without requiring a data migration.
 */
export function getReaderTypography(preferences: ReaderPreferences) {
  return {
    lineHeightScale: clamp(
      preferences.lineHeightScale ?? LEGACY_LINE_HEIGHT[preferences.lineHeight],
      1.45,
      1.9,
    ),
    paragraphSpacingScale: clamp(
      preferences.paragraphSpacingScale ?? LEGACY_PARAGRAPH_SPACING[preferences.paragraphSpacing],
      0.5,
      2.5,
    ),
    letterSpacing: clamp(preferences.letterSpacing ?? DEFAULT_READER_TYPOGRAPHY.letterSpacing, -0.03, 0.08),
    wordSpacing: clamp(preferences.wordSpacing ?? DEFAULT_READER_TYPOGRAPHY.wordSpacing, -0.04, 0.08),
    readingWidth: clamp(preferences.readingWidth ?? DEFAULT_READER_TYPOGRAPHY.readingWidth, 44, 76),
    textAlignment: preferences.textAlignment ?? DEFAULT_READER_TYPOGRAPHY.textAlignment,
  };
}

const RTL_LANGUAGES = new Set(['ar', 'arc', 'dv', 'fa', 'ha', 'he', 'ku', 'ps', 'sd', 'ug', 'ur', 'yi']);

export function getReadingDirection(language: string): 'ltr' | 'rtl' {
  return RTL_LANGUAGES.has(language.toLowerCase().split('-')[0]) ? 'rtl' : 'ltr';
}
