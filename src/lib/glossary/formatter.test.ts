import { describe, expect, it } from 'vitest';
import { formatGlossaryForPrompt } from './formatter';

describe('formatGlossaryForPrompt', () => {
  it('omits empty and non-generation results', () => {
    expect(formatGlossaryForPrompt([])).toBe('');
    expect(formatGlossaryForPrompt([{ mode: 'tts', term: 'Qi' }] as any)).toBe('');
  });

  it('deduplicates generation guidance, caps it, and preserves the anti-contamination rules', () => {
    const result = formatGlossaryForPrompt([
      { mode: 'generation', term: 'Qi', category: 'Cultivation', rule: 'Keep Qi untranslated.' },
      { mode: 'generation', term: 'Qi', category: 'Cultivation', rule: 'This duplicate is ignored.' },
      { mode: 'generation', term: 'Dantian', category: 'Cultivation', rule: 'Keep the term specific.' },
    ] as any, 1);

    expect(result).toContain('- "Qi" (Cultivation): This duplicate is ignored.');
    expect(result).not.toContain('Keep Qi untranslated.');
    expect(result).not.toContain('Dantian');
    expect(result).toContain('Do not introduce, mention, or force any listed term');
  });
});
