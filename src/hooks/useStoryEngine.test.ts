import { describe, it, expect } from 'vitest';
import { extractJsonBlocks, extractJsonMeta } from './useStoryEngine';

describe('JSON Extraction from LLM outputs', () => {
  describe('extractJsonBlocks', () => {
    it('should extract a valid JSON array', () => {
      const input = `Here are the blocks:\n\`\`\`json\n[\n  { "text": "block 1" },\n  { "text": "block 2" }\n]\n\`\`\``;
      const result = extractJsonBlocks(input);
      expect(result).toEqual([{ text: "block 1" }, { text: "block 2" }]);
    });

    it('should extract NDJSON format', () => {
      const input = `Some chatter before\n{"text": "block 1"}\n{"text": "block 2"}\nSome chatter after`;
      const result = extractJsonBlocks(input);
      expect(result).toEqual([{ text: "block 1" }, { text: "block 2" }]);
    });

    it('should fallback to brace extraction for malformed or trailing commas', () => {
      const input = `{"text": "block 1",} random words {"text": "block 2" }`;
      const result = extractJsonBlocks(input);
      expect(result).toEqual([{ text: "block 1" }, { text: "block 2" }]);
    });

    it('should return empty if no JSON objects are found', () => {
      const input = `Completely normal text with no objects.`;
      const result = extractJsonBlocks(input);
      expect(result).toEqual([]);
    });

    it('should handle unescaped quotes safely by falling back', () => {
       const input = `{"text": "He said \\"Hello\\""}`;
       const result = extractJsonBlocks(input);
       expect(result).toEqual([{ text: 'He said "Hello"' }]);
    });
  });

  describe('extractJsonMeta', () => {
    it('should extract valid JSON enclosed in markdown', () => {
      const input = `\`\`\`json\n{"title": "My Story","summary":"Test"}\n\`\`\``;
      const result = extractJsonMeta(input);
      expect(result).toEqual({ title: "My Story", summary: "Test" });
    });

    it('should extract valid JSON by ignoring <think> blocks', () => {
      const input = `<think>Evaluating the premise...</think>\n\`\`\`json\n{"title": "My Story"}\n\`\`\``;
      const result = extractJsonMeta(input);
      expect(result).toEqual({ title: "My Story" });
    });

    it('should extract the structural object if wrapped in random text', () => {
      const input = `Here is your JSON:\n\n{\n  "title": "Story Title",\n  "powerSystem": "Magic"\n}\n\nHope this helps.`;
      const result = extractJsonMeta(input);
      expect(result).toEqual({ title: "Story Title", powerSystem: "Magic" });
    });

    it('should handle trailing commas', () => {
      const input = `{"title": "Story", }`;
      const result = extractJsonMeta(input);
      expect(result).toEqual({ title: "Story" });
    });
  });
});
