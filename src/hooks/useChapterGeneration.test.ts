import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChapterGeneration } from './useChapterGeneration';
import { useAppStore } from '../store/useAppStore';
import { storyStorage } from '../lib/storage';
import { auth } from '../lib/firebase';
import { createRunHarness, makeActiveRun } from '../test/support/generationRun';
import { readGenerationRecoverySnapshot } from '../lib/generationRecovery';

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

vi.mock('../lib/firebase', () => ({ auth: { currentUser: { uid: 'reader-a' } } }));

describe('useChapterGeneration - Stream parsing & error handling', () => {
  let mockStore: any;
  let setAppErrorSpy: any;
  let saveStoriesSpy: any;
  /** What App.tsx does on a resolved account change: new session, run dropped. */
  let endAccountSession: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setAppErrorSpy = vi.fn();
    saveStoriesSpy = vi.fn();

    mockStore = {
      activeGenerationRun: null,
      authSessionGeneration: 0,
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
      setAppError: setAppErrorSpy,
      saveStories: saveStoriesSpy,
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
    (useAppStore as any).setState = vi.fn();
    (auth as any).currentUser = { uid: 'reader-a' };
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
    const contextManifest = {
      version: 1,
      route: 'generate-chapter-stream',
      generatedAt: '2026-07-12T00:00:00.000Z',
      chapterNumber: 1,
      totalEstimatedTokens: 123,
      memoryAndHistoryBudgetTokens: 80000,
      memoryAndHistoryEstimatedTokens: 50,
      memoryAndHistoryBudgetExceeded: false,
      providerInputTruncated: false,
      sections: [],
    };
    const chunks = [
      `data: ${JSON.stringify({ contextManifest })}\n\n`,
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
      if (url.includes('check-consistency')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ warnings: [] }) });
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
    expect(ch.contextManifest).toEqual(contextManifest);
  });

  it('opens no second run for a duplicated chapter request', async () => {
    const { result } = renderHook(() => useChapterGeneration());
    let resolveStream!: (value: any) => void;
    (global.fetch as any).mockReturnValue(new Promise(resolve => { resolveStream = resolve; }));

    let firstAttempt!: Promise<void>;
    act(() => {
      firstAttempt = result.current.handleGenerateChapter(1);
    });
    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalledOnce());
    const claimedRun = mockStore.activeGenerationRun;

    await act(async () => {
      await result.current.handleGenerateChapter(1);
    });

    expect(mockStore.startGenerationRun).toHaveBeenCalledTimes(2);
    expect(mockStore.startGenerationRun).toHaveLastReturnedWith(null);
    expect(mockStore.activeGenerationRun).toBe(claimedRun);
    expect(global.fetch).toHaveBeenCalledOnce();

    resolveStream({
      ok: true,
      body: { getReader: () => ({ read: vi.fn().mockResolvedValue({ done: true }) }) },
    });
    await act(async () => {
      await firstAttempt;
    });
  });

  // The snapshot itself is written by the store; this pins the claim that
  // carries the story and chapter it is frozen from.
  it('claims a single-chapter run naming the story and chapter to recover', async () => {
    const { result } = renderHook(() => useChapterGeneration());
    let resolveStream!: (value: any) => void;
    (global.fetch as any).mockReturnValue(new Promise(resolve => { resolveStream = resolve; }));

    let generation!: Promise<void>;
    act(() => {
      generation = result.current.handleGenerateChapter(1);
    });
    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalledOnce());

    expect(mockStore.startGenerationRun).toHaveBeenCalledWith({
      operation: 'chapter',
      userId: 'reader-a',
      storyId: 'story-123',
      chapterNumber: 1,
    });

    resolveStream({
      ok: true,
      body: { getReader: () => ({ read: vi.fn().mockResolvedValue({ done: true }) }) },
    });
    await act(async () => {
      await generation;
    });

    expect(mockStore.completeGenerationRun).toHaveBeenCalled();
    expect(readGenerationRecoverySnapshot()).toBeNull();
  });

  it('claims a batch run without a chapter number, so it writes no recovery snapshot', async () => {
    mockStore.stories[0].arcs[0].chapters = [
      { number: 1, title: 'C1', premise: 'P1' },
      { number: 2, title: 'C2', premise: 'P2' },
      { number: 3, title: 'C3', premise: 'P3' },
      { number: 4, title: 'C4', premise: 'P4' },
      { number: 5, title: 'C5', premise: 'P5' },
    ];
    const { result } = renderHook(() => useChapterGeneration());
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'LLM Failed' }),
    });

    await act(async () => {
      await result.current.handleGenerateNextFiveChapters(1);
    });

    expect(mockStore.startGenerationRun).toHaveBeenCalledWith({
      operation: 'chapter',
      userId: 'reader-a',
      storyId: 'story-123',
      chapterNumber: null,
    });
    expect(readGenerationRecoverySnapshot()).toBeNull();
  });

  it('resumes a paused five-chapter batch from its checkpoint, unchanged by run ownership', async () => {
    mockStore.stories[0].arcs[0].chapters = [
      { number: 1, title: 'C1', premise: 'P1', hasContent: true },
      { number: 2, title: 'C2', premise: 'P2', hasContent: true },
      { number: 3, title: 'C3', premise: 'P3' },
      { number: 4, title: 'C4', premise: 'P4' },
      { number: 5, title: 'C5', premise: 'P5' },
    ];
    mockStore.stories[0].chapterGenerationBatch = {
      id: 'batch-1',
      chapterNumbers: [1, 2, 3, 4, 5],
      status: 'paused',
      currentChapterNumber: null,
      completedChapterNumbers: [1, 2],
      createdAt: '2026-01-01T00:00:00.000Z',
      error: 'Generation was paused because the browser session ended.',
    };
    const { result } = renderHook(() => useChapterGeneration());
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'LLM Failed' }),
    });

    await act(async () => {
      await result.current.handleGenerateNextFiveChapters(1);
    });

    const persistedBatches = saveStoriesSpy.mock.calls.map(
      ([stories]: [any[]]) => stories[0].chapterGenerationBatch,
    );
    // The resumed batch keeps its completions and restarts at chapter 3.
    expect(persistedBatches[0]).toMatchObject({
      id: 'batch-1',
      status: 'queued',
      completedChapterNumbers: [1, 2],
      error: undefined,
    });
    expect(persistedBatches.find((batch: any) => batch.status === 'generating')?.currentChapterNumber).toBe(3);
    expect(persistedBatches.at(-1)).toMatchObject({
      status: 'failed',
      failedChapterNumber: 3,
      completedChapterNumbers: [1, 2],
    });
    // Chapters 1 and 2 were never regenerated.
    expect((global.fetch as any).mock.calls.every(
      ([url]: [string]) => !url.includes('chapterNumber=1'),
    )).toBe(true);
    expect(readGenerationRecoverySnapshot()).toBeNull();
  });

  it('turns a stale run\'s progress, agent and streaming writes into no-ops', async () => {
    const { result } = renderHook(() => useChapterGeneration());
    let resolveStream!: (value: any) => void;
    const mockReader = { read: vi.fn() };
    const encoder = new TextEncoder();
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('generate-chapter-stream')) {
        return new Promise(resolve => { resolveStream = resolve; });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ warnings: [] }) });
    });

    let generation!: Promise<void>;
    act(() => {
      generation = result.current.handleGenerateChapter(1);
    });
    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalledOnce());
    const abandoned = mockStore.activeGenerationRun;

    // The reader signs out mid-stream; a newer run then owns the pipeline.
    endAccountSession();
    mockStore.activeGenerationRun = makeActiveRun({
      runId: 'run-newer',
      authSessionGeneration: mockStore.authSessionGeneration,
    });
    mockStore.generationProgressMessage = 'the current run';
    mockStore.activeAgentId = 'scout';

    mockReader.read.mockResolvedValueOnce({
      done: false,
      value: encoder.encode(`data: {"chunk": "{\\"text\\": \\"${'A'.repeat(160)}\\"}\\n"}\n`),
    });
    mockReader.read.mockResolvedValue({ done: true, value: undefined });
    resolveStream({ ok: true, body: { getReader: () => mockReader } });
    await act(async () => {
      await generation;
    });

    // Every late write named the abandoned run and changed nothing.
    expect(mockStore.setStreamingChapterForRun.mock.calls.every(
      ([runId]: [string]) => runId === abandoned.runId,
    )).toBe(true);
    expect(mockStore.streamingChapter ?? null).toBeNull();
    expect(mockStore.generationProgressMessage).toBe('the current run');
    expect(mockStore.activeAgentId).toBe('scout');
    expect(mockStore.activeGenerationRun.runId).toBe('run-newer');
    // Only the run-start reset (`null`) — no error was published for the
    // abandoned run, and nothing it produced was persisted.
    expect(setAppErrorSpy).not.toHaveBeenCalledWith(expect.any(String));
    expect(saveStoriesSpy).not.toHaveBeenCalled();
  });

  it('publishes streaming payloads while running and clears them on completion', async () => {
    const { result } = renderHook(() => useChapterGeneration());

    const mockReader = { read: vi.fn() };
    const encoder = new TextEncoder();
    const chunks = [
      `data: {"chunk": "{\\"text\\": \\"${'A'.repeat(160)}\\"}\\n"}\n`,
      'data: [DONE]\n',
    ];
    chunks.forEach(c => {
      mockReader.read.mockResolvedValueOnce({ done: false, value: encoder.encode(c) });
    });
    mockReader.read.mockResolvedValueOnce({ done: true, value: undefined });

    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('generate-chapter-stream')) {
        return Promise.resolve({ ok: true, body: { getReader: () => mockReader } });
      }
      if (url.includes('check-consistency')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ warnings: [] }) });
      }
      if (url.includes('extract-chapter-metadata')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ summary: 'Sum', memoryUpdates: {} }) });
      }
      return Promise.reject(new Error('Unknown'));
    });

    await act(async () => {
      await result.current.handleGenerateChapter(1);
    });

    const calls = mockStore.setStreamingChapterForRun.mock.calls;
    // At least one live payload, addressed to the chapter being generated.
    expect(calls.some(([, payload]: any[]) => payload?.number === 1)).toBe(true);
    // Settling the run hands the reader back to the persisted chapter.
    expect(mockStore.streamingChapter).toBeNull();
    expect(mockStore.activeGenerationRun).toBeNull();
    expect(setAppErrorSpy).not.toHaveBeenCalledWith(expect.any(String));
  });

  it('clears the streaming payload when a run fails', async () => {
    const { result } = renderHook(() => useChapterGeneration());
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'LLM Failed' }),
    });

    await act(async () => {
      await result.current.handleGenerateChapter(1);
    });

    expect(setAppErrorSpy).toHaveBeenCalledWith(expect.stringContaining('LLM Failed'));
    expect(mockStore.streamingChapter).toBeNull();
    expect(mockStore.activeGenerationRun).toBeNull();
  });

  it('does not let an abandoned chapter generation clear a newer account run', async () => {
    let resolveAccountAResponse!: (value: any) => void;
    let resolveAccountBResponse!: (value: any) => void;
    const accountAResponse = new Promise(resolve => { resolveAccountAResponse = resolve; });
    const accountBResponse = new Promise(resolve => { resolveAccountBResponse = resolve; });
    let streamRequestCount = 0;
    (global.fetch as any).mockImplementation((url: string) => {
      if (!url.includes('generate-chapter-stream')) {
        throw new Error(`Unexpected request: ${url}`);
      }
      streamRequestCount += 1;
      return streamRequestCount === 1 ? accountAResponse : accountBResponse;
    });
    const { result } = renderHook(() => useChapterGeneration());

    let accountAGeneration!: Promise<void>;
    act(() => {
      accountAGeneration = result.current.handleGenerateChapter(1);
    });
    await vi.waitFor(() => expect(streamRequestCount).toBe(1));

    const abandonedRun = mockStore.activeGenerationRun;
    // Mirrors App.tsx's account-change handling: a new auth session generation
    // and the outgoing account's run invalidated.
    (auth as any).currentUser = { uid: 'reader-b' };
    endAccountSession();

    let accountBGeneration!: Promise<void>;
    act(() => {
      accountBGeneration = result.current.handleGenerateChapter(1);
    });
    await vi.waitFor(() => expect(streamRequestCount).toBe(2));
    const accountBRun = mockStore.activeGenerationRun;
    expect(accountBRun.runId).not.toBe(abandonedRun.runId);

    resolveAccountAResponse({
      ok: true,
      body: { getReader: () => ({ read: vi.fn().mockResolvedValue({ done: true }) }) },
    });
    await act(async () => {
      await accountAGeneration;
    });

    // The abandoned run settled nothing belonging to the run that replaced it.
    expect(mockStore.activeGenerationRun).toBe(accountBRun);
    expect(mockStore.ownsActiveRun(abandonedRun.runId)).toBe(false);
    expect(mockStore.streamingChapter ?? null).toBeNull();

    resolveAccountBResponse({
      ok: true,
      body: { getReader: () => ({ read: vi.fn().mockResolvedValue({ done: true }) }) },
    });
    await act(async () => {
      await accountBGeneration;
    });
  });

  it('clears the streaming payload when a five-chapter batch fails', async () => {
    mockStore.stories[0].arcs[0].chapters = [
      { number: 1, title: 'C1', premise: 'P1' },
      { number: 2, title: 'C2', premise: 'P2' },
      { number: 3, title: 'C3', premise: 'P3' },
      { number: 4, title: 'C4', premise: 'P4' },
      { number: 5, title: 'C5', premise: 'P5' },
    ];
    const { result } = renderHook(() => useChapterGeneration());
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'LLM Failed' }),
    });

    await act(async () => {
      await result.current.handleGenerateNextFiveChapters(1);
    });

    expect(mockStore.streamingChapter).toBeNull();
    expect(mockStore.activeGenerationRun).toBeNull();
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
      if (url.includes('check-consistency')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ warnings: [] }) });
      }
      if (url.includes('extract-chapter-metadata')) {
        return Promise.resolve({ ok: false });
      }
      return Promise.reject(new Error('Unknown'));
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

  it('handles continuity guard auto-repair flow', async () => {
    // A VERIFIED severe fault (a Codex-deceased entity active in the prose) is the only
    // thing that may trigger the expensive repair pass.
    mockStore.stories[0].memory.characters = [
      { id: 'char-1', name: 'Elder Zhao', status: 'deceased', role: 'Elder', description: '', relationshipToMC: '' }
    ];

    const { result } = renderHook(() => useChapterGeneration());

    const mockReader = { read: vi.fn() };
    const encoder = new TextEncoder();

    const chunks = [
      `data: {"chunk": "{\\"text\\": \\"Elder Zhao strode into the hall. ${'A'.repeat(160)}\\"}\\n"}\n`,
      'data: [DONE]\n'
    ];
    
    chunks.forEach(c => {
      mockReader.read.mockResolvedValueOnce({ done: false, value: encoder.encode(c) });
    });
    mockReader.read.mockResolvedValueOnce({ done: true, value: undefined });

    const repairReader = { read: vi.fn() };
    const repairChunks = [
      `data: {"chunk": "{\\"text\\": \\"${'B'.repeat(160)}\\"}\\n"}\n`,
      'data: [DONE]\n'
    ];
    
    repairChunks.forEach(c => {
      repairReader.read.mockResolvedValueOnce({ done: false, value: encoder.encode(c) });
    });
    repairReader.read.mockResolvedValueOnce({ done: true, value: undefined });

    let consistencyCallCount = 0;

    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('generate-chapter-stream')) {
        return Promise.resolve({ ok: true, body: { getReader: () => mockReader } });
      }
      if (url.includes('check-consistency')) {
        consistencyCallCount++;
        if (consistencyCallCount === 1) {
          // First check: return a VERIFIED severe warning (deceased entity active) to trigger repair
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ warnings: ['Elder Zhao is marked deceased but speaks and fights in the present scene.'] }) });
        } else {
          // Second check (after repair): no warnings, repair successful
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ warnings: [] }) });
        }
      }
      if (url.includes('repair-chapter-stream')) {
        return Promise.resolve({ ok: true, body: { getReader: () => repairReader } });
      }
      if (url.includes('extract-chapter-metadata')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ summary: 'Sum', memoryUpdates: {} }) });
      }
      return Promise.reject(new Error('Unknown url: ' + url));
    });

    await act(async () => {
      await result.current.handleGenerateChapter(1);
    });

    expect(consistencyCallCount).toBe(2);
    expect(saveStoriesSpy).toHaveBeenCalled();
    const updated = saveStoriesSpy.mock.calls[0][0];
    const ch = updated[0].arcs[0].chapters[0];
    
    // Check that repair DID replace the blocks
    expect(ch.blocks[0].text).toBe('B'.repeat(160));
    
    // Check fault flags were cleared because second check-consistency returned no warnings
    expect(ch.hasContinuityFaults).toBe(false);
    expect(ch.continuityWarnings).toEqual([]);
  });

  it('hydrates complex memory updates correctly (new characters, updates, factions, threads, relationships)', async () => {
    const { result } = renderHook(() => useChapterGeneration());
    
    const mockReader = { read: vi.fn() };
    const encoder = new TextEncoder();
    
    // Minimal stream content
    const chunks = [
      `data: {"chunk": "{\\"text\\": \\"${'A'.repeat(160)}\\"}\\n"}\n`,
      'data: [DONE]\n'
    ];
    
    chunks.forEach(c => {
      mockReader.read.mockResolvedValueOnce({ done: false, value: encoder.encode(c) });
    });
    mockReader.read.mockResolvedValueOnce({ done: true, value: undefined });

    const manifestationImportance = {
      narrativeWeight: 'major',
      namedStatus: true,
      recurrence: true,
      plotRelevance: true,
    } as const;
    const fullMemoryUpdates = {
      currentPowerStage: 'Ascendant',
      newCharacters: [{ name: 'Elder Lin', role: 'Mentor', manifestationImportance }],
      characterStatusUpdates: [{ name: 'Elder Lin', newStatus: 'deceased', descriptionAppend: ' Died bravely.', newPowerLevel: 'God', newAbilities: ['Flight'] }],
      factionUpdates: [{ name: 'Sect', statusOverride: 'Destroyed', descriptionAppend: ' Reduced to ashes.' }],
      locationUpdates: [{ name: 'Cave', safetyLevelOverride: 'Dangerous', descriptionAppend: ' Collapsed.' }],
      artifactUpdates: [{ name: 'Sword', newOwner: 'MC', descriptionAppend: ' Glowing.' }],
      newUnresolvedPlotThreads: ['Defeat the demon lord'],
      resolvedPlotThreads: ['Find the hidden core'],
      newFactions: [{ name: 'Different Clan', description: 'Old clan', manifestationImportance }],
      newLocations: [{ name: 'Dark Forest', description: 'Old forest', manifestationImportance }],
      newArtifacts: [{ name: 'Battle Axe', description: 'Sharp', manifestationImportance }],
      newMCAbilities: [{ name: 'Fireball', masteryLevel: 'Novice' }],
      mcAbilityUpdates: [{ name: 'Fireball', newMasteryLevel: 'Adept' }],
      relationshipUpdates: [{ sourceName: 'MC', targetName: 'Elder Lin', affinityDelta: 10, threatDelta: -5, reason: 'Helped' }],
      powerSystemViolationFlags: ['Used wrong element']
    };

    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('generate-chapter-stream')) {
        return Promise.resolve({ ok: true, body: { getReader: () => mockReader } });
      }
      if (url.includes('check-consistency')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ warnings: [] }) });
      }
      if (url.includes('extract-chapter-metadata')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ summary: 'Sum', memoryUpdates: fullMemoryUpdates }) });
      }
      return Promise.reject(new Error('Unknown'));
    });

    // Need to initialize some existing memory to test updates properly
    mockStore.stories[0].memory = {
      characters: [{ name: 'Elder Lin', status: 'alive' }],
      factions: [{ name: 'Sect', status: 'Active' }],
      locations: [{ name: 'Cave', safetyLevel: 'Safe' }],
      artifacts: [{ name: 'Sword', currentOwner: 'None' }],
      unresolvedPlotThreads: ['Find the hidden core', { description: 'Old thread', status: 'active', originChapter: 1 }],
      resolvedPlotThreads: [],
      abilities: ['Punch'],
      relationships: []
    };

    await act(async () => {
      await result.current.handleGenerateChapter(1);
    });

    expect(saveStoriesSpy).toHaveBeenCalled();
    const updated = saveStoriesSpy.mock.calls[0][0];
    const newMemory = updated[0].memory;
    
    // Check characters
    expect(newMemory.currentPowerStage).toBe('Ascendant');
    expect(newMemory.characters.length).toBe(2); // Existing + New
    expect(newMemory.characters.find((c: any) => c.name === 'Elder Lin' && c.status === 'deceased').abilities).toContain('Flight');
    
    // Check factions
    expect(newMemory.factions.length).toBe(2);
    expect(newMemory.factions.find((f: any) => f.name === 'Sect').status).toBe('Destroyed');
    
    // Check locations
    expect(newMemory.locations.length).toBe(2);
    expect(newMemory.locations.find((l: any) => l.name === 'Cave').safetyLevel).toBe('Dangerous');
    
    // Check artifacts
    expect(newMemory.artifacts.length).toBe(2);
    expect(newMemory.artifacts.find((a: any) => a.name === 'Sword').currentOwner).toBe('MC');

    // Check plot threads
    expect(newMemory.resolvedPlotThreads.length).toBe(1);
    expect(newMemory.resolvedPlotThreads[0].description).toBe('Find the hidden core');
    expect(newMemory.unresolvedPlotThreads.length).toBe(2);

    // Check abilities
    const fireballObj = newMemory.abilities.find((a: any) => typeof a !== 'string' && a.name === 'Fireball');
    expect(fireballObj).toBeDefined();
    expect(fireballObj.masteryLevel).toBe('Adept'); // since we passed Adept in mcAbilityUpdates
    expect(newMemory.abilities).toContain('Punch'); // Assuming punch is a legacy string

    // Check relationships
    expect(updated[0].relationships.length).toBe(1);
    expect(updated[0].relationships[0].sourceCharName).toBe('MC');
    expect(updated[0].relationships[0].affinity).toBe(10);
    
    // Check linter/warnings
    expect(newMemory.memoryWarnings).toContain('Used wrong element');
  });
});
