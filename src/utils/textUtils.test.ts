import { describe, expect, it } from 'vitest';
import { countWords } from './textUtils';

describe('countWords', () => {
  it('matches JavaScript whitespace splitting for Unicode separators', () => {
    const unicodeWhitespace = [
      '\u00a0', '\u1680', '\u2000', '\u200a', '\u2028', '\u2029',
      '\u202f', '\u205f', '\u3000', '\ufeff',
    ];

    for (const whitespace of unicodeWhitespace) {
      const text = `first${whitespace}second`;
      expect(countWords(text)).toBe(text.trim().split(/\s+/).filter(Boolean).length);
    }
  });
});
