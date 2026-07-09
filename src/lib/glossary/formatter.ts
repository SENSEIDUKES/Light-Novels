import { GlossaryResult } from './types';

/**
 * Formats a list of glossary retrieval results into a compact string block
 * that can be injected directly into AI prompts to enforce canon terminology.
 * Limits the output to a specified max size to prevent prompt bloat.
 * 
 * @param entries - The retrieved glossary entries
 * @param maxTerms - Maximum number of terms to include (default: 15)
 * @returns A formatted string block, or an empty string if no entries exist
 */
export function formatGlossaryForPrompt(entries: GlossaryResult[], maxTerms: number = 15): string {
  if (!entries || entries.length === 0) {
    return '';
  }

  const genEntries = entries.filter(e => e.mode === 'generation') as any[];
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
