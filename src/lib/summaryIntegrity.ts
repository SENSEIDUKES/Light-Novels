/**
 * Known placeholder/error summary states that must never be treated as real
 * chapter memory (persisted, embedded, or fed back into RAG context).
 */
const PLACEHOLDER_SUMMARIES = [
  'an ethereal mist obscures the historical records',
  'summary pending',
  'no past summary',
  'archived'
];

const normalizeSummary = (summary: string): string =>
  summary.trim().toLowerCase().replace(/[.…]+$/, '');

/**
 * Returns true when a stored summary is missing, empty, or matches a known
 * fallback placeholder — i.e. it carries no narrative information.
 */
export const isPlaceholderSummary = (summary: string | undefined | null): boolean => {
  if (!summary) return true;
  const normalized = normalizeSummary(summary);
  if (!normalized) return true;
  return PLACEHOLDER_SUMMARIES.includes(normalized);
};

/**
 * Returns true when a summary carries real narrative content usable as chapter memory.
 */
export const isUsableSummary = (summary: string | undefined | null): summary is string =>
  !isPlaceholderSummary(summary);
