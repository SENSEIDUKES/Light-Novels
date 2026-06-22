import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractJsonBlocks, extractJsonMeta, useStoryEngine } from './useStoryEngine';
import { renderHook, act } from '@testing-library/react';

// Mock dependencies
vi.mock('../store/useAppStore', () => ({
  useAppStore: vi.fn(),
}));

vi.mock('../lib/encryption', () => ({
  secureStorage: { getItem: vi.fn(), setItem: vi.fn() }
}));

vi.mock('../lib/rag', () => ({
  retrieveRelevantContext: vi.fn().mockResolvedValue([]),
  generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2]),
}));

vi.mock('../lib/storage', () => ({
  storyStorage: { getStories: vi.fn().mockResolvedValue([]), saveStory: vi.fn() },
}));

vi.mock('../lib/qi', () => ({
  awardQi: vi.fn()
}));

vi.mock('../lib/firebase', () => ({
  auth: { currentUser: { uid: 'test-user-123' } }
}));

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

    it('should extract novelty block extraction ([System ...], [Audio ...]) effectively', () => {
      const input = `{"text": "[System: Warning - Health Low]"}\n{"text": "[Audio: tense_battle.mp3]"}`;
      const result = extractJsonBlocks(input);
      expect(result).toEqual([
        { text: "[System: Warning - Health Low]" },
        { text: "[Audio: tense_battle.mp3]" }
      ]);
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

import { useAppStore } from '../store/useAppStore';
import { storyStorage } from '../lib/storage';

describe('useStoryEngine hook functionalities', () => {
  let mockStore: any;
  let setStreamingChapterSpy: any;
  let setAppErrorSpy: any;
  let saveStoriesSpy: any;
  let setIsGeneratingSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    setStreamingChapterSpy = vi.fn();
    setAppErrorSpy = vi.fn();
    saveStoriesSpy = vi.fn();
    setIsGeneratingSpy = vi.fn();

    mockStore = {
      stories: [
        {
          id: 'story-123',
          title: 'Test Story',
          activeStoryId: 'story-123',
          currentChapterNumber: 1,
          memory: { characters: [], currentPowerStage: 'mortal', unresolvedPlotThreads: [], resolvedPlotThreads: [] },
          arcs: [
            {
              title: "Arc 1",
              chapters: [{ number: 1, title: "Chapter 1" }]
            }
          ]
        }
      ],
      activeStoryId: 'story-123',
      routingConfig: { storyMaker: 'default-route' },
      setGenerationPhase: vi.fn(),
      setIsGenerating: setIsGeneratingSpy,
      setAppError: setAppErrorSpy,
      setActiveAgentId: vi.fn(),
      setStreamingChapter: setStreamingChapterSpy,
      saveStories: saveStoriesSpy,
    };

    (useAppStore as any).mockReturnValue(mockStore);
    (storyStorage.getStories as any).mockResolvedValue(mockStore.stories);
    
    global.fetch = vi.fn();
  });

  it('handleGenerateChapter handles stream parsing and hydration successfully', async () => {
    const { result } = renderHook(() => useStoryEngine());
    const engine = result.current;

    // Mock readable stream
    const encoder = new TextEncoder();
    const mockChunks = [
      'data: {"chunk": "{\\"text\\":\\"[System: Loading region]\\"}\\n"}\n',
      'data: {"chunk": "{\\"text\\":\\"[Audio: play_bg.mp3]\\"}\\n"}\n',
      'data: [DONE]\n'
    ];
    let chunkIndex = 0;
    const mockReader = {
      read: vi.fn()
    };
    mockChunks.forEach((chunk) => {
      mockReader.read.mockResolvedValueOnce({ done: false, value: encoder.encode(chunk) });
    });
    mockReader.read.mockResolvedValueOnce({ done: true, value: undefined });

    (global.fetch as any).mockImplementation((url: string) => {
      if (url === '/api/generate-chapter-stream') {
        return Promise.resolve({ ok: true, body: { getReader: () => mockReader } });
      }
      if (url === '/api/extract-chapter-metadata') {
         return Promise.resolve({ ok: true, json: () => Promise.resolve({ summary: 'Extracted summary', statsChangeMessage: 'None' }) });
      }
      return Promise.reject(new Error('unmocked url'));
    });

    await act(async () => {
       await engine.handleGenerateChapter(1);
    });

    // Check finalization
    expect(setStreamingChapterSpy).toHaveBeenCalled();
    const finalSetCall = setStreamingChapterSpy.mock.calls[setStreamingChapterSpy.mock.calls.length - 2][0]; // the last updated streaming chapter before it clears logic on end
    expect(finalSetCall.blocks).toContainEqual({ text: "[System: Loading region]" });
    
    // Check saving the completed chapter state via store
    expect(saveStoriesSpy).toHaveBeenCalled();
    const savedStoriesCall = saveStoriesSpy.mock.calls[0][0];
    const updatedChapter = savedStoriesCall[0].arcs[0].chapters[0];
    expect(updatedChapter.summary).toBe('Extracted summary');
    expect(updatedChapter._isNewContent).toBe(true);
    expect(updatedChapter.blocks[0].text).toBe("[System: Loading region]");
    expect(updatedChapter.blocks[1].text).toBe("[Audio: play_bg.mp3]");
  });

  it('handleGenerateChapter handles error handling specifically', async () => {
    const { result } = renderHook(() => useStoryEngine());
    const engine = result.current;

    (global.fetch as any).mockImplementation((url: string) => {
      if (url === '/api/generate-chapter-stream') {
         return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: "Severely ruptured meridian bounds" }) });
      }
      return Promise.reject();
    });

    await act(async () => {
       await engine.handleGenerateChapter(1);
    });

    expect(setAppErrorSpy).toHaveBeenCalledWith("Severely ruptured meridian bounds");
    expect(setIsGeneratingSpy).toHaveBeenLastCalledWith(false); 
  });
});

