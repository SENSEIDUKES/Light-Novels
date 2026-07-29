import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useArcSteering } from './useArcSteering';
import { useAppStore } from '../store/useAppStore';
import { storyStorage } from '../lib/storage';
import { auth } from '../lib/firebase';
import { createRunHarness, makeActiveRun } from '../test/support/generationRun';

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

vi.mock('../lib/firebase', () => ({ auth: { currentUser: { uid: 'reader-a' } } }));

describe('useArcSteering - Steering action processing', () => {
  let mockStore: any;
  let saveStoriesSpy: any;
  let setAppErrorSpy: any;
  /** What App.tsx does on a resolved account change: new session, run dropped. */
  let endAccountSession: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
    saveStoriesSpy = vi.fn();
    setAppErrorSpy = vi.fn();

    mockStore = {
      activeGenerationRun: null,
      authSessionGeneration: 0,
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
      setAppError: setAppErrorSpy,
      saveStories: saveStoriesSpy,
      setSelectedChapterNum: vi.fn(),
      setActiveStoryId: vi.fn(),
    };

    const runHarness = createRunHarness(mockStore);
    Object.assign(mockStore, {
      startGenerationRun: vi.fn(runHarness.startGenerationRun),
      ownsActiveRun: vi.fn(runHarness.ownsActiveRun),
      completeGenerationRun: vi.fn(runHarness.completeGenerationRun),
      failGenerationRun: vi.fn(runHarness.failGenerationRun),
      setActiveAgentIdForRun: vi.fn(runHarness.setActiveAgentIdForRun),
      setStreamingChapterForRun: vi.fn(runHarness.setStreamingChapterForRun),
      setGeneratingChapterNumForRun: vi.fn(runHarness.setGeneratingChapterNumForRun),
      setGenerationProgressMessageForRun: vi.fn(runHarness.setGenerationProgressMessageForRun),
    });
    endAccountSession = () => {
      mockStore.authSessionGeneration += 1;
      runHarness.clearActiveRunForAccountTransition();
    };

    (useAppStore as any).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(mockStore);
      }
      return mockStore;
    });
    (useAppStore as any).getState = vi.fn().mockReturnValue(mockStore);
    (auth as any).currentUser = { uid: 'reader-a' };
    
    (storyStorage.getStories as any).mockResolvedValue(mockStore.stories);
    (storyStorage.getChapterContent as any).mockResolvedValue({ generatedContent: 'content', blocks: [] });
    
    global.fetch = vi.fn();
  });

  it('handleSteerArc opens no second run while one is in progress', async () => {
    const inFlight = makeActiveRun({ runId: 'run-in-flight', operation: 'chapter' });
    mockStore.activeGenerationRun = inFlight;
    const { result } = renderHook(() => useArcSteering());
    await act(async () => {
      await result.current.handleSteerArc('Go to the mountains', '3');
    });
    expect(mockStore.startGenerationRun).toHaveReturnedWith(null);
    expect(mockStore.activeGenerationRun).toBe(inFlight);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('handleSteerArc claims no run when there is no active story', async () => {
    mockStore.activeStoryId = null;
    const { result } = renderHook(() => useArcSteering());
    await act(async () => {
      await result.current.handleSteerArc('Go to the mountains', '3');
    });
    expect(mockStore.startGenerationRun).not.toHaveBeenCalled();
    expect(mockStore.activeGenerationRun).toBeNull();
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
    expect(requestBody.contextEngine).toBe('v2');
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

  it('surfaces invalid steering chapter data for the current account', async () => {
    const { result } = renderHook(() => useArcSteering());
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ chapters: null }),
    });

    await act(async () => {
      await result.current.handleSteerArc('Direction', '3');
    });

    expect(setAppErrorSpy).toHaveBeenCalledWith('Story steering returned invalid chapter data.');
    expect(saveStoriesSpy).not.toHaveBeenCalled();
  });

  it('surfaces an invalid persisted story collection for the current account', async () => {
    const { result } = renderHook(() => useArcSteering());
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        title: 'Next Arc',
        chapters: [{ number: 2, title: 'C2', premise: 'P2' }],
      }),
    });
    (storyStorage.getStories as any).mockResolvedValue({});

    await act(async () => {
      await result.current.handleSteerArc('Direction', '3');
    });

    expect(setAppErrorSpy).toHaveBeenCalledWith('The story library could not be loaded.');
    expect(saveStoriesSpy).not.toHaveBeenCalled();
  });

  it('does not change the new account chapter selection after an old steering request resolves', async () => {
    let resolveSteering!: (value: any) => void;
    (global.fetch as any).mockReturnValue(new Promise(resolve => { resolveSteering = resolve; }));
    const { result } = renderHook(() => useArcSteering());

    let steering!: Promise<void>;
    act(() => {
      steering = result.current.handleSteerArc('Account A direction', 'Private context');
    });
    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalledOnce());

    (auth as any).currentUser = { uid: 'reader-b' };
    endAccountSession();
    resolveSteering({
      ok: true,
      json: () => Promise.resolve({
        title: 'Discarded Arc',
        chapters: [{ number: 2, title: 'Discarded', premise: '' }],
      }),
    });

    await act(async () => {
      await steering;
    });

    expect(saveStoriesSpy).not.toHaveBeenCalled();
    expect(mockStore.setSelectedChapterNum).not.toHaveBeenCalled();
    expect(setAppErrorSpy).not.toHaveBeenCalledWith(expect.any(String));
  });

  it('handleAlterFate opens no second run while one is in progress', async () => {
    const inFlight = makeActiveRun({ runId: 'run-in-flight', operation: 'chapter' });
    mockStore.activeGenerationRun = inFlight;
    const { result } = renderHook(() => useArcSteering());
    await act(async () => {
      await result.current.handleAlterFate(1, 'New path', 'Prompt');
    });
    expect(mockStore.startGenerationRun).toHaveReturnedWith(null);
    expect(mockStore.activeGenerationRun).toBe(inFlight);
    expect(saveStoriesSpy).not.toHaveBeenCalled();
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
    expect(mockStore.startGenerationRun).not.toHaveBeenCalled();
  });

  it('handleAlterFate claims no run when there is no active story', async () => {
    mockStore.activeStoryId = null;
    const { result } = renderHook(() => useArcSteering());
    await act(async () => {
      await result.current.handleAlterFate(1, 'New path', 'Prompt');
    });
    expect(mockStore.startGenerationRun).not.toHaveBeenCalled();
    expect(mockStore.activeGenerationRun).toBeNull();
  });

  it('handleAlterFate forks story and steers successfully', async () => {
    mockStore.stories[0].readerPreferences = { contextEngine: 'v1' };
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

  it('keeps Alter Fate ownership through its internal switch to the fork story', async () => {
    const { result } = renderHook(() => useArcSteering());
    let ownedAfterStorySwitch: boolean | null = null;

    // The fork becomes the active story mid-run. Ownership must not move with it.
    mockStore.setActiveStoryId.mockImplementation((id: string) => {
      mockStore.activeStoryId = id;
      const run = mockStore.activeGenerationRun;
      ownedAfterStorySwitch = run ? mockStore.ownsActiveRun(run.runId) : false;
    });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        title: 'Forked Arc',
        chapters: [{ number: 2, title: 'C2', premise: 'P2' }],
      }),
    });
    (storyStorage.getStories as any).mockImplementation(() => Promise.resolve(saveStoriesSpy.mock.calls[0][0]));

    await act(async () => {
      await result.current.handleAlterFate(1, 'Dark path', 'custom');
    });

    // The run was claimed against the fork id, minted before the run started.
    const claimedStoryId = mockStore.startGenerationRun.mock.calls[0][0].storyId;
    const forkedStory = saveStoriesSpy.mock.calls[0][0][0];
    expect(claimedStoryId).toBe(forkedStory.id);
    expect(mockStore.startGenerationRun.mock.calls[0][0].operation).toBe('steer');
    expect(mockStore.setActiveStoryId).toHaveBeenCalledWith(forkedStory.id);
    expect(ownedAfterStorySwitch).toBe(true);
    // ...and the run survived to persist the steered arc and settle normally.
    expect(saveStoriesSpy).toHaveBeenCalledTimes(2);
    expect(mockStore.setSelectedChapterNum).toHaveBeenCalledWith(2);
    expect(setAppErrorSpy).not.toHaveBeenCalledWith(expect.stringContaining('Failed'));
    expect(mockStore.activeGenerationRun).toBeNull();
  });

  it('does not save an Alter Fate fork after its account changes during chapter hydration', async () => {
    let resolveContent!: (value: any) => void;
    (storyStorage.getChapterContent as any).mockReturnValue(
      new Promise(resolve => { resolveContent = resolve; }),
    );
    const { result } = renderHook(() => useArcSteering());

    let alteration!: Promise<void>;
    act(() => {
      alteration = result.current.handleAlterFate(1, 'Account A fork', 'Private direction');
    });
    await vi.waitFor(() => expect(storyStorage.getChapterContent).toHaveBeenCalledOnce());

    (auth as any).currentUser = { uid: 'reader-b' };
    endAccountSession();
    resolveContent({ generatedContent: 'Old account content', blocks: [] });

    await act(async () => {
      await alteration;
    });

    expect(saveStoriesSpy).not.toHaveBeenCalled();
    expect(mockStore.setActiveStoryId).not.toHaveBeenCalled();
    expect(setAppErrorSpy).not.toHaveBeenCalled();
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
