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
  storyStorage: { 
    getStories: vi.fn().mockResolvedValue([]), 
    saveStory: vi.fn(),
    getChapterContent: vi.fn(),
    saveChapterContent: vi.fn(),
    deleteStory: vi.fn(),
    startTransaction: vi.fn(),
    commitTransaction: vi.fn().mockResolvedValue(true),
    rollbackTransaction: vi.fn(),
  },
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
      setGeneratingChapterNum: vi.fn(),
      setActiveStoryId: vi.fn(),
      setSelectedChapterNum: vi.fn(),
      setCurrentScreen: vi.fn(),
    };

    (useAppStore as any).mockReturnValue(mockStore);
    (useAppStore as any).getState = vi.fn().mockReturnValue(mockStore);
    (storyStorage.getStories as any).mockResolvedValue(mockStore.stories);
    
    global.fetch = vi.fn();
  });

  it('handleGenerateChapter handles stream parsing and hydration successfully', async () => {
    const { result } = renderHook(() => useStoryEngine());
    const engine = result.current;

    // Mock readable stream
    const encoder = new TextEncoder();
    const longChunk = 'This is a very long text chunk to bypass the minimum length requirement of one hundred and fifty characters to prevent throwing the stream dissipation error in the chapter generation sequence. '.repeat(5);
    const mockChunks = [
      'data: {"chunk": "{\\"text\\":\\"[System: Loading region]\\"}\\n"}\n',
      'data: {"chunk": "{\\"text\\":\\"[Audio: play_bg.mp3]\\"}\\n"}\n',
      `data: {"chunk": "{\\"text\\":\\"${longChunk}\\"}\\n"}\n`,
      'data: [DONE]\n'
    ];
    const chunkIndex = 0;
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

  it('handleGenerateBlueprint executes and returns successfully', async () => {
    const { result } = renderHook(() => useStoryEngine());
    const engine = result.current;

    (global.fetch as any).mockImplementation((url: string) => {
      if (url === '/api/generate-blueprint') {
         return Promise.resolve({ ok: true, json: () => Promise.resolve({ title: "New BP Title" }) });
      }
      return Promise.reject(new Error('unmocked url'));
    });

    let res;
    await act(async () => {
       res = await engine.handleGenerateBlueprint({} as any);
    });

    expect(res).toEqual({ title: "New BP Title" });
    expect(setIsGeneratingSpy).toHaveBeenCalledWith(false);
  });

  it('handleGenerateBlueprint handles failure', async () => {
    const { result } = renderHook(() => useStoryEngine());
    const engine = result.current;

    (global.fetch as any).mockImplementation((url: string) => {
      if (url === '/api/generate-blueprint') {
         return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: "API Failure" }) });
      }
      return Promise.reject(new Error('unmocked url'));
    });

    await act(async () => {
       try { await engine.handleGenerateBlueprint({} as any); } catch {}
    });

    expect(setAppErrorSpy).toHaveBeenCalledWith("API Failure");
  });

  it('handleStartStory creates story successfully', async () => {
    const { result } = renderHook(() => useStoryEngine());
    const engine = result.current;

    (global.fetch as any).mockImplementation((url: string) => {
      if (url === '/api/generate-initial-arc') {
         return Promise.resolve({ ok: true, json: () => Promise.resolve({
           chapters: [{ number: 1, title: 'C1', premise: 'P1' }],
           title: 'The Generated Title',
           powerSystem: 'Generated Power',
           unresolvedPlotThreads: ['Thread 1']
         }) });
      }
      return Promise.reject(new Error('unmocked url'));
    });

    await act(async () => {
       await engine.handleStartStory({ genrePath: 'scifi' } as any, { title: 'B Title' } as any, 1);
    });

    expect(saveStoriesSpy).toHaveBeenCalled();
    const saveArgs = saveStoriesSpy.mock.calls[0][0];
    expect(saveArgs[0].title).toBe('The Generated Title');
    expect(saveArgs[0].arcs[0].chapters[0].title).toBe('C1');
  });

  it('handleStartStory handles failure', async () => {
    const { result } = renderHook(() => useStoryEngine());
    const engine = result.current;

    (global.fetch as any).mockImplementation((url: string) => {
      if (url === '/api/generate-initial-arc') {
         return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: "Arc API error" }) });
      }
      return Promise.reject(new Error('unmocked url'));
    });

    await act(async () => {
       await engine.handleStartStory({ genrePath: 'scifi' } as any, { title: 'B Title' } as any, 1);
    });

    expect(setAppErrorSpy).toHaveBeenCalledWith("Arc API error");
  });

  it('handleUpdateMemoryManual skips updating other stories', async () => {
    mockStore.stories.push({ id: 'other-story', memory: {} });
    const { result } = renderHook(() => useStoryEngine());
    await act(async () => {
       await result.current.handleUpdateMemoryManual({ currentPowerStage: 'Advanced' } as any);
    });
    expect(saveStoriesSpy).toHaveBeenCalled();
    const updated = saveStoriesSpy.mock.calls[0][0];
    const otherStory = updated.find((s: any) => s.id === 'other-story');
    expect(otherStory.memory.currentPowerStage).toBeUndefined();
  });

  it('handleToggleRead skips other stories and chapters', async () => {
    mockStore.stories.push({ id: 'other-story', arcs: [] });
    mockStore.stories[0].arcs[0].chapters.push({ number: 99, status: 'unread' });
    const { result } = renderHook(() => useStoryEngine());
    await act(async () => {
       await result.current.handleToggleRead(1);
    });
    expect(saveStoriesSpy).toHaveBeenCalled();
    const updated = saveStoriesSpy.mock.calls[0][0];
    const otherStory = updated.find((s: any) => s.id === 'other-story');
    expect(otherStory).toBeDefined();
    
    const activeStory = updated.find((s: any) => s.id === 'story-123');
    const chapter99 = activeStory.arcs[0].chapters.find((c: any) => c.number === 99);
    expect(chapter99.status).toBe('unread'); // Unchanged
  });
  it('handleUpdateMemoryManual skips if no active story', async () => {
    mockStore.activeStoryId = null;
    const { result } = renderHook(() => useStoryEngine());
    await act(async () => {
       await result.current.handleUpdateMemoryManual({ currentPowerStage: 'Advanced' } as any);
    });
    expect(saveStoriesSpy).not.toHaveBeenCalled();
  });

  it('handleUpdateMemoryManual properly updates active story', async () => {
    const { result } = renderHook(() => useStoryEngine());
    const engine = result.current;

    await act(async () => {
       await engine.handleUpdateMemoryManual({ currentPowerStage: 'Advanced' } as any);
    });

    expect(saveStoriesSpy).toHaveBeenCalled();
    const updatedStores = saveStoriesSpy.mock.calls[0][0];
    expect(updatedStores[0].memory.currentPowerStage).toBe('Advanced');
  });

  it('handleUpdateStoryDirect directly updates the passed story', async () => {
    const { result } = renderHook(() => useStoryEngine());
    const engine = result.current;

    await act(async () => {
       await engine.handleUpdateStoryDirect({ id: 'story-123', title: 'Modified' } as any);
    });

    expect(saveStoriesSpy).toHaveBeenCalled();
    expect(saveStoriesSpy.mock.calls[0][0][0].title).toBe('Modified');
  });

  it('handleToggleRead skips if no active story', async () => {
    mockStore.activeStoryId = null;
    const { result } = renderHook(() => useStoryEngine());
    await act(async () => {
       await result.current.handleToggleRead(1);
    });
    expect(saveStoriesSpy).not.toHaveBeenCalled();
  });

  it('handleToggleRead toggles chapter read status', async () => {
    const { result } = renderHook(() => useStoryEngine());
    const engine = result.current;

    mockStore.stories[0].arcs[0].chapters[0].status = 'unread';

    await act(async () => {
       await engine.handleToggleRead(1);
    });

    expect(saveStoriesSpy).toHaveBeenCalled();
    const updated = saveStoriesSpy.mock.calls[0][0];
    expect(updated[0].arcs[0].chapters[0].status).toBe('read');
  });

  it('handleGenerateCover calls api', async () => {
    const { result } = renderHook(() => useStoryEngine());
    const engine = result.current;

    (global.fetch as any).mockImplementation((url: string) => {
      if (url === '/api/generate-card-image') {
         return Promise.resolve({ ok: true, json: () => Promise.resolve({ imageUrls: ['http://img1'] }) });
      }
      return Promise.reject(new Error('unmocked url'));
    });

    let res;
    await act(async () => {
       res = await engine.handleGenerateCover();
    });

    expect(res?.imageUrls).toEqual(['http://img1']);
  });

  it('handleApplyCover updates story image history', async () => {
    const { result } = renderHook(() => useStoryEngine());
    const engine = result.current;

    await act(async () => {
       await engine.handleApplyCover('http://img1', 'prompt');
    });

    expect(saveStoriesSpy).toHaveBeenCalled();
    const updated = saveStoriesSpy.mock.calls[0][0];
    expect(updated[0].imageUrl).toBe('http://img1');
    expect(updated[0].imageHistory.length).toBe(1);
  });

  it('handleCheckConsistency returns warnings', async () => {
    const { result } = renderHook(() => useStoryEngine());
    const engine = result.current;

    mockStore.stories[0].arcs[0].chapters[0].generatedContent = 'some text';

    (global.fetch as any).mockImplementation((url: string) => {
      if (url === '/api/check-consistency') {
         return Promise.resolve({ ok: true, json: () => Promise.resolve({ warnings: ['Warning 1'] }) });
      }
      return Promise.reject(new Error('unmocked url'));
    });

    let res;
    await act(async () => {
       res = await engine.handleCheckConsistency(1);
    });

    expect(res).toEqual(['Warning 1']);
  });

  it('handleSealChapter updates chapter correctly', async () => {
    const { result } = renderHook(() => useStoryEngine());
    const engine = result.current;

    Object.defineProperty(window, 'crypto', {
      value: {
        subtle: {
          digest: vi.fn().mockResolvedValue(new ArrayBuffer(8))
        },
        randomUUID: vi.fn().mockReturnValue('uuid-test')
      }
    });

    await act(async () => {
       await engine.handleSealChapter(1);
    });

    expect(saveStoriesSpy).toHaveBeenCalled();
    const updated = saveStoriesSpy.mock.calls[0][0];
    const targetChapter = updated[0].arcs[0].chapters[0];
    expect(targetChapter.isSealed).toBe(true);
    expect(targetChapter.versionId).toBe('uuid-test');
  });
});

