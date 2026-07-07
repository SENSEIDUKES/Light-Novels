import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanAndParseJSON } from './aiRouter';

describe('cleanAndParseJSON', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should parse a simple JSON object', () => {
    const input = '{"key": "value"}';
    expect(cleanAndParseJSON(input)).toEqual({ key: 'value' });
  });

  it('should remove <think> blocks', () => {
    const input = '<think>some reasoning</think>{"key": "value"}';
    expect(cleanAndParseJSON(input)).toEqual({ key: 'value' });
  });

  it('should remove multiple <think> blocks', () => {
    const input = '<think>reasoning 1</think><think>reasoning 2</think>{"key": "value"}';
    expect(cleanAndParseJSON(input)).toEqual({ key: 'value' });
  });

  it('should strip markdown json blocks', () => {
    const input = '```json\n{"key": "value"}\n```';
    expect(cleanAndParseJSON(input)).toEqual({ key: 'value' });
  });

  it('should strip generic markdown blocks', () => {
    const input = '```\n{"key": "value"}\n```';
    expect(cleanAndParseJSON(input)).toEqual({ key: 'value' });
  });

  it('should handle both <think> blocks and markdown blocks', () => {
    const input = '<think>reasoning</think>\n```json\n{"key": "value"}\n```';
    expect(cleanAndParseJSON(input)).toEqual({ key: 'value' });
  });

  it('should extract JSON using regex if direct parse fails', () => {
    const input = 'Here is the result: {"key": "value"} hope it helps!';
    expect(cleanAndParseJSON(input)).toEqual({ key: 'value' });
  });

  it('should extract JSON array using regex', () => {
    const input = 'Behold: [1, 2, 3]';
    expect(cleanAndParseJSON(input)).toEqual([1, 2, 3]);
  });

  it('should prefer the first JSON match when array comes first', () => {
    const input = 'Array: [1, 2] followed by Object: {"a": 1}';
    expect(cleanAndParseJSON(input)).toEqual([1, 2]);
  });

  it('should prefer the first JSON match when object comes first', () => {
    const input = 'Object: {"a": 1} followed by Array: [1, 2]';
    expect(cleanAndParseJSON(input)).toEqual({ a: 1 });
  });

  it('should handle hallucinated inner markdown', () => {
    // This tests the nested catch block where model puts markdown INSIDE the JSON
    const hallucinated = '{"foo": ```json {"bar": 1} ```}';
    expect(cleanAndParseJSON(hallucinated)).toEqual({ foo: { bar: 1 } });
  });

  it('should throw error for invalid JSON that cannot be recovered', () => {
    const input = 'this is not json at all';
    expect(() => cleanAndParseJSON(input)).toThrow('Failed to parse JSON response');
  });

  it('should handle empty input', () => {
    expect(() => cleanAndParseJSON('')).toThrow('Failed to parse JSON response');
  });
});
