import type { GlossaryResult, GenerationResult } from './types';

const isGenerationResult = (entry: GlossaryResult): entry is GenerationResult =>
  entry.mode === 'generation';

export function formatGlossaryForPrompt(entries: GlossaryResult[], maxTerms: number = 8): string {
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
REFERENCE GLOSSARY GUIDANCE
=========================================
Use these notes only when the term or concept naturally appears in the scene.
Do not introduce, mention, or force any listed term just because it appears here.
Do not add new systems, ranks, powers, factions, or mechanics from this glossary unless the chapter context already calls for them.
${lines.join('\n')}
=========================================
`;
}
