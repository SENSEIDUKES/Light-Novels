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

    (useAppStore as any).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(mockStore);
      }
      return mockStore;
    });
    (useAppStore as any).getState = vi.fn().mockReturnValue(mockStore);
    (useAppStore as any).setState = vi.fn();
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

    const fullMemoryUpdates = {
      currentPowerStage: 'Ascendant',
      newCharacters: [{ name: 'Elder Lin', role: 'Mentor' }],
      characterStatusUpdates: [{ name: 'Elder Lin', newStatus: 'deceased', descriptionAppend: ' Died bravely.', newPowerLevel: 'God', newAbilities: ['Flight'] }],
      factionUpdates: [{ name: 'Sect', statusOverride: 'Destroyed', descriptionAppend: ' Reduced to ashes.' }],
      locationUpdates: [{ name: 'Cave', safetyLevelOverride: 'Dangerous', descriptionAppend: ' Collapsed.' }],
      artifactUpdates: [{ name: 'Sword', newOwner: 'MC', descriptionAppend: ' Glowing.' }],
      newUnresolvedPlotThreads: ['Defeat the demon lord'],
      resolvedPlotThreads: ['Find the hidden core'],
      newFactions: [{ name: 'Different Clan', description: 'Old clan' }],
      newLocations: [{ name: 'Dark Forest', description: 'Old forest' }],
      newArtifacts: [{ name: 'Battle Axe', description: 'Sharp' }],
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
