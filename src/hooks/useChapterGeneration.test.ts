import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChapterGeneration } from './useChapterGeneration';
import { useAppStore } from '../store/useAppStore';
import { storyStorage } from '../lib/storage';

vi.mock('../store/useAppStore', () => ({
  useAppStore: vi.fn()
}));

vi.mock('../lib/rag', () => ({
  retrieveRelevantContext: vi.fn().mockResolvedValue([]),
  generateEmbedding: vi.fn().mockResolvedValue([0.1])
}));

vi.mock('../lib/storage', () => ({
  storyStorage: {
    getStories: vi.fn(),
    saveStory: vi.fn(),
    getChapterContent: vi.fn(),
    saveChapterContent: vi.fn()
  }
}));

vi.mock('../lib/qi', () => ({
  awardQi: vi.fn()
}));

describe('useChapterGeneration - Stream parsing & error handling', () => {
  let mockStore: any;
  let setIsGeneratingSpy: any;
  let setAppErrorSpy: any;
  let saveStoriesSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    setIsGeneratingSpy = vi.fn();
    setAppErrorSpy = vi.fn();
    saveStoriesSpy = vi.fn();

    mockStore = {
      isGenerating: false,
      activeStoryId: 'story-123',
      stories: [
        {
          id: 'story-123',
          memory: { characters: [], unresolvedPlotThreads: [], currentPowerStage: 'mortal' },
          arcs: [
            {
              chapters: [
                { number: 1, title: 'C1', premise: 'P1' }
              ]
            }
          ]
        }
      ],
      routingConfig: { storyMaker: 'default' },
      setIsGenerating: setIsGeneratingSpy,
      setGeneratingChapterNum: vi.fn(),
      setGenerationPhase: vi.fn(),
      setAppError: setAppErrorSpy,
      setActiveAgentId: vi.fn(),
      setStreamingChapter: vi.fn(),
      saveStories: saveStoriesSpy,
    };

    (useAppStore as any).mockReturnValue(mockStore);
    (useAppStore as any).getState = vi.fn().mockReturnValue(mockStore);
    (storyStorage.getStories as any).mockResolvedValue(mockStore.stories);
    global.fetch = vi.fn();
  });

  it('handles stream parsing and novelty block excision', async () => {
    const { result } = renderHook(() => useChapterGeneration());
    
    const mockReader = {
      read: vi.fn()
    };
    const encoder = new TextEncoder();
    
    // Send novelty blocks and proper content
    const chunks = [
      'data: {"chunk": "{\\"text\\": \\"[System: Novelty]\\"}\\n"}\n',
      `data: {"chunk": "{\\"text\\": \\"${'A'.repeat(160)}\\"}\\n"}\n`,
      'data: [DONE]\n'
    ];
    
    chunks.forEach(c => {
      mockReader.read.mockResolvedValueOnce({ done: false, value: encoder.encode(c) });
    });
    mockReader.read.mockResolvedValueOnce({ done: true, value: undefined });

    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('generate-chapter-stream')) {
        return Promise.resolve({ ok: true, body: { getReader: () => mockReader } });
      }
      if (url.includes('extract-chapter-metadata')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ summary: 'Sum', memoryUpdates: {} }) });
      }
      return Promise.reject(new Error('Unknown'));
    });

    await act(async () => {
      await result.current.handleGenerateChapter(1);
    });

    expect(saveStoriesSpy).toHaveBeenCalled();
    const updated = saveStoriesSpy.mock.calls[0][0];
    const ch = updated[0].arcs[0].chapters[0];
    expect(ch.blocks.length).toBe(2);
    expect(ch.blocks[0].text).toBe('[System: Novelty]');
    expect(ch.summary).toBe('Sum');
  });

  it('handles malformed LLM responses with safe fallbacks', async () => {
    const { result } = renderHook(() => useChapterGeneration());
    
    const mockReader = { read: vi.fn() };
    const encoder = new TextEncoder();
    
    // Send unparseable stream data but ultimately enough raw text
    const chunks = [
      'data: {"chunk": "Just plain text without JSON blocks.' + 'A'.repeat(160) + '"}\n',
      'data: [DONE]\n'
    ];
    
    chunks.forEach(c => {
      mockReader.read.mockResolvedValueOnce({ done: false, value: encoder.encode(c) });
    });
    mockReader.read.mockResolvedValueOnce({ done: true, value: undefined });

    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('generate-chapter-stream')) {
        return Promise.resolve({ ok: true, body: { getReader: () => mockReader } });
      }
      if (url.includes('extract-chapter-metadata')) {
        return Promise.resolve({ ok: false });
      }
      return Promise.reject();
    });

    await act(async () => {
      await result.current.handleGenerateChapter(1);
    });

    expect(saveStoriesSpy).toHaveBeenCalled();
  });

  it('handles network error in stream', async () => {
    const { result } = renderHook(() => useChapterGeneration());
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'LLM Failed' })
    });

    await act(async () => {
      await result.current.handleGenerateChapter(1);
    });

    expect(setAppErrorSpy).toHaveBeenCalledWith(expect.stringContaining('LLM Failed'));
  });

  it('handles abrupt stream dissipation', async () => {
    const { result } = renderHook(() => useChapterGeneration());
    const mockReader = { read: vi.fn() };
    const encoder = new TextEncoder();
    mockReader.read.mockResolvedValueOnce({ done: false, value: encoder.encode('data: {"chunk": "Short"}\n') });
    mockReader.read.mockResolvedValueOnce({ done: true, value: undefined });

    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('generate-chapter-stream')) {
        return Promise.resolve({ ok: true, body: { getReader: () => mockReader } });
      }
      return Promise.resolve({ ok: true });
    });

    await act(async () => {
      await result.current.handleGenerateChapter(1);
    });

    expect(setAppErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Celestial stream dissipated prematurely'));
  });
});
