import { parseChapterStream } from './parseChapterStream';

describe('parseChapterStream', () => {
  it('should extract valid JSON blocks and populate chapter text', () => {
    const streamContent = `
---CHAPTER_BLOCKS---
[
  { "text": "This is block 1. ${'a'.repeat(150)}", "type": "narrative" },
  { "text": "This is block 2.", "type": "dialogue" }
]
    `;

    const result = parseChapterStream(streamContent);
    expect(result.data.blocks).toHaveLength(2);
    expect(result.data.chapterText).toBe(`This is block 1. ${'a'.repeat(150)}\n\nThis is block 2.`);
  });

  it('should start with an empty summary instead of a decorative placeholder', () => {
    const streamContent = `
---CHAPTER_BLOCKS---
[
  { "text": "This is block 1. ${'a'.repeat(150)}", "type": "narrative" }
]
    `;
    const result = parseChapterStream(streamContent);
    expect(result.data.summary).toBe('');
  });

  it('should fallback to plain text if JSON extraction fails', () => {
    const streamContent = `
---CHAPTER_BLOCKS---
Some plain text content that is quite long to pass the minimum length check of 150 characters. 
Some plain text content that is quite long to pass the minimum length check of 150 characters.
Some plain text content that is quite long to pass the minimum length check of 150 characters.
    `;
    const result = parseChapterStream(streamContent);
    expect(result.data.blocks).toHaveLength(0);
    expect(result.data.chapterText.includes('Some plain text content')).toBe(true);
  });

  it('should throw an error if stream content is too short', () => {
    const streamContent = `
---CHAPTER_BLOCKS---
Short text
    `;
    expect(() => parseChapterStream(streamContent)).toThrow("Celestial stream dissipated prematurely. Chapter content is incomplete; creation has been safeguarded.");
  });

  it('should extract JSON blocks even without the CHAPTER_BLOCKS header', () => {
    const streamContent = `
[
  { "text": "First block ${'a'.repeat(150)}", "type": "narrative" },
  { "text": "Second block", "type": "dialogue" }
]
    `;
    const result = parseChapterStream(streamContent);
    expect(result.data.blocks).toHaveLength(2);
    expect(result.data.chapterText).toBe(`First block ${'a'.repeat(150)}\n\nSecond block`);
  });

  it('should parse individual braced JSON objects if array parsing fails', () => {
    const streamContent = `
---CHAPTER_BLOCKS---
{ "text": "First block ${'a'.repeat(150)}" }
{ "text": "Second block" }
    `;
    const result = parseChapterStream(streamContent);
    expect(result.data.blocks).toHaveLength(2);
    expect(result.data.chapterText).toBe(`First block ${'a'.repeat(150)}\n\nSecond block`);
  });
});
