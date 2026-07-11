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
    expect(console.warn).toHaveBeenCalledWith("Direct JSON parse failed, trying regex extraction");
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

  it('should throw error when regex match is still invalid even after inner cleaning', () => {
    const input = 'Malformed: {"key": value_without_quotes}';
    expect(() => cleanAndParseJSON(input)).toThrow('The model returned an invalid structured response');
  });

  it('should handle cases where only an array match is found via regex', () => {
    const input = 'Only array here [4, 5, 6] and no objects';
    expect(cleanAndParseJSON(input)).toEqual([4, 5, 6]);
  });

  it('should handle cases where only an object match is found via regex', () => {
    const input = 'Only object here {"x": 10} and no arrays';
    expect(cleanAndParseJSON(input)).toEqual({ x: 10 });
  });

  it('should throw error for invalid JSON that cannot be recovered', () => {
    const input = 'this is not json at all';
    expect(() => cleanAndParseJSON(input)).toThrow('The model returned an invalid structured response');
  });

  it('should handle empty input', () => {
    expect(() => cleanAndParseJSON('')).toThrow('The model returned an invalid structured response');
  });

  it('should handle case-insensitive markdown blocks', () => {
    const input = '```JSON\n{"key": "value"}\n```';
    expect(cleanAndParseJSON(input)).toEqual({ key: 'value' });
  });

  it('should handle markdown blocks with excessive whitespace', () => {
    const input = '   \n  ```json\n\n  {"key": "value"}  \n\n  ```  \n ';
    expect(cleanAndParseJSON(input)).toEqual({ key: 'value' });
  });

  it('should handle incomplete <think> blocks by falling back to regex', () => {
    const input = '<think>I am thinking but never finish {"key": "value"}';
    expect(cleanAndParseJSON(input)).toEqual({ key: 'value' });
    expect(console.warn).toHaveBeenCalledWith("Direct JSON parse failed, trying regex extraction");
  });

  it('should handle multiple <think> blocks correctly (non-greedy)', () => {
    const input = '<think>thought 1</think> some text <think>thought 2</think> {"key": "value"}';
    expect(cleanAndParseJSON(input)).toEqual({ key: 'value' });
  });

  it('should handle JSON containing unicode characters', () => {
    const input = '{"greeting": "こんにちは", "emoji": "🚀"}';
    expect(cleanAndParseJSON(input)).toEqual({ greeting: 'こんにちは', emoji: '🚀' });
  });

  it('should handle nested JSON objects correctly', () => {
    const input = 'Result: {"outer": {"inner": 42}}';
    expect(cleanAndParseJSON(input)).toEqual({ outer: { inner: 42 } });
  });

  it('recovers a valid JSON object followed by a repeated closing-brace tail', () => {
    const validResponse = JSON.stringify({ title: 'Volume I', chapters: [{ number: 1 }] });
    const repeatedBraces = '}\n'.repeat(3452);

    expect(cleanAndParseJSON(validResponse + repeatedBraces)).toEqual({
      title: 'Volume I',
      chapters: [{ number: 1 }]
    });
  });

  it('does not expose raw model output in unrecoverable parse errors', () => {
    const rawModelOutput = '{"title": unquoted_value}';

    expect(() => cleanAndParseJSON(rawModelOutput)).toThrow(
      'The model returned an invalid structured response. Please retry generation.'
    );
    expect(() => cleanAndParseJSON(rawModelOutput)).not.toThrow(rawModelOutput);
  });
});
