import { describe, it, expect, vi } from 'vitest';
import { extractJsonBlocks, extractJsonMeta, runMemoryLinter } from './storyEngineHelpers';
import { secureStorage } from '../lib/encryption';

describe('storyEngineHelpers', () => {
  describe('extractJsonBlocks', () => {
    it('extracts JSON array from text', () => {
      const raw = `Some text before
[
  { "text": "block 1" },
  { "text": "block 2" }
]
Some text after`;
      const result = extractJsonBlocks(raw);
      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('block 1');
      expect(result[1].text).toBe('block 2');
    });

    it('extracts individual JSON objects from lines', () => {
      const raw = `
{ "text": "block 1" }
some random text
{ "content": "block 2" }
`;
      const result = extractJsonBlocks(raw);
      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('block 1');
      expect(result[1].text).toBe('block 2');
    });

    it('extracts nested JSON objects safely', () => {
      const raw = `Here is some content: {"text": "hello { world }", "type": "paragraph"}`;
      const result = extractJsonBlocks(raw);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('hello { world }');
    });

    it('returns empty array if no valid JSON found', () => {
      const result = extractJsonBlocks("Just some random text without JSON");
      expect(result).toHaveLength(0);
    });
  });

  describe('extractJsonMeta', () => {
    it('extracts clean JSON from markdown', () => {
      const raw = `
\`\`\`json
{ "title": "New Chapter", "status": "draft" }
\`\`\`
`;
      const result = extractJsonMeta(raw);
      expect(result).toEqual({ title: "New Chapter", status: "draft" });
    });

    it('removes <think> tags before parsing', () => {
      const raw = `
<think>Thinking process</think>
{ "title": "Clean Title" }
`;
      const result = extractJsonMeta(raw);
      expect(result.title).toBe("Clean Title");
    });

    it('finds the longest object if multiple exist or messy formatting', () => {
      const raw = `
Here is something: {"small": 1}
And the main meta: {"title": "Main Title", "summary": "Big summary of the chapter that makes it longer"}
`;
      const result = extractJsonMeta(raw);
      expect(result.title).toBe("Main Title");
    });

    it('returns empty object if no JSON found', () => {
      const result = extractJsonMeta("No JSON here");
      expect(result).toEqual({});
    });
  });

  describe('runMemoryLinter', () => {
    it('warns if deceased character is mentioned in text', () => {
      const prevMemory = {
        characters: [{ name: 'Bob', status: 'deceased' }]
      } as any;
      const warnings = runMemoryLinter(prevMemory, {} as any, 'Bob walked into the room.');
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('Deceased character "Bob" was referenced');
    });

    it('warns about similar character names', () => {
      const nextMemory = {
        characters: [{ name: 'Alexander' }, { name: 'Alexandur' }]
      } as any;
      const warnings = runMemoryLinter({} as any, nextMemory, '');
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('Potential duplicate character names');
    });

    it('ignores same family names for similarity warning', () => {
      const nextMemory = {
        characters: [{ name: 'Smith John' }, { name: 'Smith Jane' }]
      } as any;
      const warnings = runMemoryLinter({} as any, nextMemory, '');
      expect(warnings).toHaveLength(0);
    });

    it('warns if plot thread is marked unresolved after being resolved', () => {
      const prevMemory = {
        resolvedPlotThreads: ['Find the sword']
      } as any;
      const nextMemory = {
        unresolvedPlotThreads: ['Find the sword']
      } as any;
      const warnings = runMemoryLinter(prevMemory, nextMemory, '');
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('previously resolved but is now marked unresolved');
    });
  });
});
