const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// JavaScript's \b is ASCII-only. These lookarounds preserve whole-word matching for
// accented, Cyrillic, and CJK text under the Unicode flag.
const WORD_CHAR = '[\\p{L}\\p{N}\\p{M}_]';

export const createWholeWordMatcher = (value: string): RegExp =>
  new RegExp(`(?<!${WORD_CHAR})${escapeRegExp(value)}(?!${WORD_CHAR})`, 'ui');
