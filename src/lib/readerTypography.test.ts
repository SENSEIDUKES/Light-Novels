import { describe, expect, it } from 'vitest';
import { getReaderTypography, getReadingDirection } from './readerTypography';

describe('reader typography', () => {
  it('gives legacy preferences a book-like, start-aligned baseline', () => {
    expect(getReaderTypography({
      fontSize: 'lg',
      fontFamily: 'serif',
      lineHeight: 'relaxed',
      paragraphSpacing: 'normal',
    })).toMatchObject({
      lineHeightScale: 1.65,
      paragraphSpacingScale: 1.15,
      letterSpacing: 0,
      wordSpacing: 0,
      readingWidth: 62,
      textAlignment: 'start',
    });
  });

  it('keeps persisted values within the supported reading range', () => {
    expect(getReaderTypography({
      fontSize: 'base',
      fontFamily: 'serif',
      lineHeight: 'normal',
      paragraphSpacing: 'normal',
      lineHeightScale: 4,
      paragraphSpacingScale: 0,
      letterSpacing: 1,
      wordSpacing: -1,
      readingWidth: 200,
    })).toMatchObject({
      lineHeightScale: 1.9,
      paragraphSpacingScale: 0.5,
      letterSpacing: 0.08,
      wordSpacing: -0.04,
      readingWidth: 76,
    });
  });

  it('uses RTL direction for right-to-left reading languages', () => {
    expect(getReadingDirection('ar')).toBe('rtl');
    expect(getReadingDirection('he-IL')).toBe('rtl');
    expect(getReadingDirection('ja')).toBe('ltr');
  });
});
