import { isPlaceholderSummary, isUsableSummary } from './summaryIntegrity';

describe('summaryIntegrity', () => {
  it('treats missing or empty summaries as placeholders', () => {
    expect(isPlaceholderSummary(undefined)).toBe(true);
    expect(isPlaceholderSummary(null)).toBe(true);
    expect(isPlaceholderSummary('')).toBe(true);
    expect(isPlaceholderSummary('   ')).toBe(true);
  });

  it('recognizes known fallback placeholders regardless of case and trailing punctuation', () => {
    expect(isPlaceholderSummary('An ethereal mist obscures the historical records.')).toBe(true);
    expect(isPlaceholderSummary('an ethereal mist obscures the historical records')).toBe(true);
    expect(isPlaceholderSummary('Summary pending')).toBe(true);
    expect(isPlaceholderSummary('No past summary')).toBe(true);
  });

  it('accepts real narrative summaries', () => {
    const real = 'Kael defeated Overseer Chen and claimed the Thunder Roc egg.';
    expect(isPlaceholderSummary(real)).toBe(false);
    expect(isUsableSummary(real)).toBe(true);
  });
});
