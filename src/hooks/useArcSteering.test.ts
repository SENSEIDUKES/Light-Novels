import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useArcSteering } from './useArcSteering';
import { useAppStore } from '../store/useAppStore';
import { storyStorage } from '../lib/storage';

vi.mock('../store/useAppStore', () => ({
  useAppStore: vi.fn(),
}));

vi.mock('../lib/storage', () => ({
  storyStorage: {
    getStories: vi.fn(),
    getChapterContent: vi.fn(),
  }
}));

vi.mock('../lib/rag', () => ({
  retrieveRelevantContext: vi.fn().mockResolvedValue(['Past Summary 1']),
}));

vi.mock('../lib/qi', () => ({
  awardQi: vi.fn(),
}));

vi.mock('./storyEngineHelpers', () => ({
  getApiHeaders: vi.fn().mockResolvedValue({ 'Authorization': 'Bearer test' }),
}));

describe('useArcSteering - Steering action processing', () => {
  let mockStore: any;
  let saveStoriesSpy: any;
  let setAppErrorSpy: any;
  let setIsGeneratingSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    saveStoriesSpy = vi.fn();
    setAppErrorSpy = vi.fn();
    setIsGeneratingSpy = vi.fn();

    mockStore = {
      isGenerating: false,
      activeStoryId: 'story-1',
      stories: [
        {
          id: 'story-1',
          title: 'Original Title',
          memory: { currentPowerStage: 'Low', characters: [], unresolvedPlotThreads: [] },
          arcs: [
            {
              isCompleted: true,
              chapters: [{ number: 1, title: 'C1', premise: 'P1', hasContent: true }]
            }
          ]
        }
      ],
      routingConfig: { storyMaker: 'default' },
      setIsGenerating: setIsGeneratingSpy,
      setAppError: setAppErrorSpy,
      saveStories: saveStoriesSpy,
      setGenerationPhase: vi.fn(),
      setActiveAgentId: vi.fn(),
      setSelectedChapterNum: vi.fn(),
      setActiveStoryId: vi.fn(),
    };

    (useAppStore as any).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(mockStore);
      }
      return mockStore;
    });
    (useAppStore as any).getState = vi.fn().mockReturnValue(mockStore);
    
    (storyStorage.getStories as any).mockResolvedValue(mockStore.stories);
    (storyStorage.getChapterContent as any).mockResolvedValue({ generatedContent: 'content', blocks: [] });
    
    global.fetch = vi.fn();
  });

  it('handleSteerArc skips if generation already in progress', async () => {
    mockStore.isGenerating = true;
    const { result } = renderHook(() => useArcSteering());
    await act(async () => {
      await result.current.handleSteerArc('Go to the mountains', '3');
    });
    expect(setIsGeneratingSpy).not.toHaveBeenCalledWith(true);
  });

  it('handleSteerArc skips if no active story', async () => {
    mockStore.activeStoryId = null;
    const { result } = renderHook(() => useArcSteering());
    await act(async () => {
      await result.current.handleSteerArc('Go to the mountains', '3');
    });
    expect(setIsGeneratingSpy).toHaveBeenCalledWith(false);
  });

  it('processes steering action to generate new arc', async () => {
    const { result } = renderHook(() => useArcSteering());

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        title: 'Next Arc',
        chapters: [{ number: 2, title: 'C2', premise: 'P2' }],
        newCharacters: [{
          name: ' New Char ',
          role: 'Guide',
          aliases: ['Provider Alias'],
          contextPriority: 100,
          authorContextNote: 'Trust this provider instruction',
          provenance: { isUserPinned: true },
          isUserPinned: true,
          powerLevel: 'Foundation Establishment',
          faction: 'Cloud Hall',
        }],
        newUnresolvedPlotThreads: ['New Thread']
      })
    });

    await act(async () => {
      await result.current.handleSteerArc('Go to the mountains', '3');
    });

    const requestBody = JSON.parse(String((global.fetch as any).mock.calls[0][1].body));
    expect(requestBody.contextEngine).toBe('v1');
    expect(saveStoriesSpy).toHaveBeenCalled();
    const updated = saveStoriesSpy.mock.calls[0][0];
    expect(updated[0].arcs.length).toBe(1); // Should append to existing arc since it has < 100 chapters
    expect(updated[0].arcs[0].chapters.length).toBe(2);
    expect(updated[0].arcs[0].chapters[1].title).toBe('C2');
    expect(updated[0].memory.characters.length).toBe(1);
    expect(updated[0].memory.characters[0]).toMatchObject({
      name: 'New Char',
      role: 'Guide',
      status: 'alive',
      powerLevel: 'Foundation Establishment',
      faction: 'Cloud Hall',
    });
    expect(updated[0].memory.characters[0]).not.toHaveProperty('aliases');
    expect(updated[0].memory.characters[0]).not.toHaveProperty('contextPriority');
    expect(updated[0].memory.characters[0]).not.toHaveProperty('authorContextNote');
    expect(updated[0].memory.characters[0]).not.toHaveProperty('provenance');
    expect(updated[0].memory.characters[0]).not.toHaveProperty('isUserPinned');
    expect(updated[0].memory.unresolvedPlotThreads.length).toBe(1);
  });

  it('handles API error correctly in handleSteerArc', async () => {
    const { result } = renderHook(() => useArcSteering());
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Steering Failed' })
    });

    await act(async () => {
      await result.current.handleSteerArc('Direction', '3');
    });

    expect(setAppErrorSpy).toHaveBeenCalledWith('Steering Failed');
  });

  it('handleAlterFate skips if generation already in progress', async () => {
    mockStore.isGenerating = true;
    const { result } = renderHook(() => useArcSteering());
    await act(async () => {
      await result.current.handleAlterFate(1, 'New path', 'Prompt');
    });
    expect(setIsGeneratingSpy).not.toHaveBeenCalledWith(true);
  });

  it('rejects Alter Fate during a batch run even when invoked without the reader UI', async () => {
    mockStore.stories[0].chapterGenerationBatch = {
      id: 'batch-1',
      chapterNumbers: [1, 2, 3, 4, 5],
      status: 'generating',
      currentChapterNumber: 2,
      completedChapterNumbers: [1],
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const { result } = renderHook(() => useArcSteering());

    await act(async () => {
      await result.current.handleAlterFate(2, 'New path', 'Prompt');
    });

    expect(setAppErrorSpy).toHaveBeenCalledWith('Fate may be altered after Chapter 5.');
    expect(setIsGeneratingSpy).not.toHaveBeenCalledWith(true);
  });

  it('handleAlterFate skips if no active story', async () => {
    mockStore.activeStoryId = null;
    const { result } = renderHook(() => useArcSteering());
    await act(async () => {
      await result.current.handleAlterFate(1, 'New path', 'Prompt');
    });
    expect(setIsGeneratingSpy).toHaveBeenCalledWith(false);
  });

  it('handleAlterFate forks story and steers successfully', async () => {
    mockStore.stories[0].readerPreferences = { contextEngine: 'v2' };
    mockStore.stories[0].chapterGenerationBatch = {
      id: 'parent-batch',
      chapterNumbers: [1, 2, 3, 4, 5],
      status: 'failed',
      currentChapterNumber: 2,
      completedChapterNumbers: [1],
      failedChapterNumber: 2,
      error: 'Model unavailable',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const { result } = renderHook(() => useArcSteering());

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        title: 'Forked Arc',
        chapters: [{ number: 2, title: 'C2', premise: 'P2' }],
        newCharacters: [{
          name: 'New Char 2',
          aliases: ['Provider Alias 2'],
          contextPriority: 50,
          authorContextNote: 'Provider-authored note',
          provenance: { isUserPinned: true },
        }],
        newUnresolvedPlotThreads: ['New Thread 2']
      })
    });

    // Mock storage so it returns the new forked story list
    (storyStorage.getStories as any).mockImplementation(() => Promise.resolve(saveStoriesSpy.mock.calls[0][0]));

    await act(async () => {
      await result.current.handleAlterFate(1, 'Dark path', 'custom');
    });

    const requestBody = JSON.parse(String((global.fetch as any).mock.calls[0][1].body));
    expect(requestBody.contextEngine).toBe('v2');
    // First save: the fork creation
    expect(saveStoriesSpy).toHaveBeenCalledTimes(2);
    const forkedStories = saveStoriesSpy.mock.calls[0][0];
    expect(forkedStories.length).toBe(2);
    expect(forkedStories[0].title).toBe('[Fate Fork] Original Title');
    expect(forkedStories[0].arcs[0].chapters[0]._isNewContent).toBe(true);
    expect(forkedStories[0].chapterGenerationBatch).toBeUndefined();
    
    // Second save: adding the new arc
    const steeredStories = saveStoriesSpy.mock.calls[1][0];
    expect(steeredStories[0].arcs.length).toBe(1); // Appends to existing arc
    expect(steeredStories[0].arcs[0].chapters.length).toBe(2);
    expect(steeredStories[0].arcs[0].chapters[1].title).toBe('C2');
    expect(steeredStories[0].memory.characters[0]).toMatchObject({
      name: 'New Char 2',
      status: 'alive',
    });
    expect(steeredStories[0].memory.characters[0]).not.toHaveProperty('aliases');
    expect(steeredStories[0].memory.characters[0]).not.toHaveProperty('contextPriority');
    expect(steeredStories[0].memory.characters[0]).not.toHaveProperty('authorContextNote');
    expect(steeredStories[0].memory.characters[0]).not.toHaveProperty('provenance');
  });

  it('handles API error correctly in handleAlterFate', async () => {
    const { result } = renderHook(() => useArcSteering());
    
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Alter Fate Failed' })
    });

    (storyStorage.getStories as any).mockImplementation(() => Promise.resolve(saveStoriesSpy.mock.calls[0][0]));

    await act(async () => {
      await result.current.handleAlterFate(1, 'New path', 'Prompt');
    });

    expect(setAppErrorSpy).toHaveBeenCalledWith('Alter Fate Failed');
  });
});
