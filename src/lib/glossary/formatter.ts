import type { GlossaryResult, GenerationResult } from './types';

const isGenerationResult = (entry: GlossaryResult): entry is GenerationResult =>
  entry.mode === 'generation';

export function formatGlossaryForPrompt(entries: GlossaryResult[], maxTerms: number = 15): string {
  if (!entries || entries.length === 0) {
    return '';
  }

  const genEntries = entries.filter(isGenerationResult);
  if (genEntries.length === 0) return '';

  const uniqueEntries = Array.from(new Map(genEntries.map(e => [e.term, e])).values());
  const cappedEntries = uniqueEntries.slice(0, maxTerms);

  const lines = cappedEntries.map(e => {
    return `- "${e.term}" (${e.category}): ${e.rule}`;
  });

  return `
=========================================
CANON GLOSSARY RULES
=========================================
Adhere STRICTLY to the following established terminology, lore, and definitions:
Use these rules when relevant. Do not force every listed term into the chapter.
${lines.join('\n')}
=========================================
`;
}
