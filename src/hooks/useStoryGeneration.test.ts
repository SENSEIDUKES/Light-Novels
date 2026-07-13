import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStoryGeneration } from './useStoryGeneration';
import { storyApi } from '../services/api';
import { awardQi } from '../lib/qi';
import { useAppStore } from '../store/useAppStore';
import { auth } from '../lib/firebase';

vi.mock('../services/api', () => ({
  storyApi: {
    generateBlueprint: vi.fn(),
    generateInitialArc: vi.fn(),
  },
}));

vi.mock('../lib/qi', () => ({ awardQi: vi.fn() }));
vi.mock('../lib/firebase', () => ({ auth: { currentUser: { uid: 'reader-1' } } }));
vi.mock('../store/useAppStore', () => ({ useAppStore: vi.fn() }));

describe('useStoryGeneration', () => {
  let state: any;

  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).currentUser = { uid: 'reader-1' };
    state = {
      isGenerating: false,
      stories: [{ id: 'existing-story' }],
      routingConfig: { storyMaker: { provider: 'gemini' } },
      saveStories: vi.fn().mockResolvedValue(undefined),
      setActiveStoryId: vi.fn(),
      setSelectedChapterNum: vi.fn(),
      setCurrentScreen: vi.fn(),
      setAppError: vi.fn(),
      setIsGenerating: vi.fn((value: boolean) => { state.isGenerating = value; }),
      setGenerationPhase: vi.fn(),
      setActiveAgentId: vi.fn(),
    };
    vi.mocked(useAppStore).mockImplementation((selector: any) => selector(state));
    (useAppStore as any).getState = vi.fn(() => state);
  });

  it('creates a normalized story, saves it, and opens its first chapter', async () => {
    vi.mocked(storyApi.generateInitialArc).mockResolvedValue({
      title: 'The Jade Gate',
      chapters: [{ number: 1, title: 'Arrival', premise: 'Enter the sect.' }],
      powerSystem: 'Cultivation',
      currentPowerStage: 'Qi Gathering',
      worldRules: ['Debts have consequences'],
      characters: [{ name: 'Mei' }],
      unresolvedPlotThreads: ['Who opened the gate?'],
    });
    const intake = { mcName: 'Lin', genrePath: 'Xianxia', corePremise: 'A sealed gate.' };
    const blueprint = { title: 'Blueprint Title', logline: 'A logline', powerSystemOutline: 'Blueprint system' };
    const { result } = renderHook(() => useStoryGeneration());

    await act(async () => {
      await result.current.handleStartStory(intake, blueprint as any, 3);
    });

    expect(storyApi.generateInitialArc).toHaveBeenCalledWith(
      intake,
      blueprint,
      3,
      state.routingConfig.storyMaker,
    );
    const savedStories = state.saveStories.mock.calls[0][0];
    const created = savedStories[0];
    expect(created).toMatchObject({
      userId: 'reader-1',
      title: 'The Jade Gate',
      genre: 'Xianxia',
      mcName: 'Lin',
      currentChapterNumber: 1,
      arcs: [{ title: 'The Jade Gate', chapters: [{ number: 1, status: 'unread' }] }],
      memory: {
        powerSystem: 'Cultivation',
        currentPowerStage: 'Qi Gathering',
        worldRules: ['Debts have consequences'],
      },
    });
    expect(created.memory.characters[0]).toMatchObject({ id: expect.stringMatching(/^char-/), name: 'Mei' });
    expect(created.memory.unresolvedPlotThreads[0]).toMatchObject({
      id: expect.stringMatching(/^thread-/),
      description: 'Who opened the gate?',
      status: 'active',
      originChapter: 1,
    });
    expect(state.setActiveStoryId).toHaveBeenCalledWith(created.id);
    expect(state.setSelectedChapterNum).toHaveBeenCalledWith(1);
    expect(state.setCurrentScreen).toHaveBeenCalledWith('detail');
    expect(awardQi).toHaveBeenCalledWith('world_created');
    expect(state.setIsGenerating).toHaveBeenLastCalledWith(false);
    expect(state.setGenerationPhase).toHaveBeenLastCalledWith(null);
  });

  it('surfaces blueprint failures while restoring generation state', async () => {
    vi.mocked(storyApi.generateBlueprint).mockRejectedValue(new Error('Provider unavailable'));
    const { result } = renderHook(() => useStoryGeneration());

    await expect(result.current.handleGenerateBlueprint({})).rejects.toThrow('Provider unavailable');

    expect(state.setAppError).toHaveBeenCalledWith('Provider unavailable');
    expect(state.setIsGenerating).toHaveBeenLastCalledWith(false);
    expect(state.setGenerationPhase).toHaveBeenLastCalledWith(null);
    expect(state.setActiveAgentId).toHaveBeenLastCalledWith(null);
  });

  it('rejects a delayed blueprint result after the account changes', async () => {
    let resolveBlueprint!: (value: any) => void;
    vi.mocked(storyApi.generateBlueprint).mockReturnValue(
      new Promise((resolve) => {
        resolveBlueprint = resolve;
      }),
    );
    const { result } = renderHook(() => useStoryGeneration());
    const generation = result.current.handleGenerateBlueprint({
      corePremise: 'Private Account A premise',
    } as any);
    await vi.waitFor(() => {
      expect(storyApi.generateBlueprint).toHaveBeenCalledOnce();
    });

    (auth as any).currentUser = { uid: 'reader-2' };
    resolveBlueprint({ title: 'Private Account A blueprint' });

    await expect(generation).rejects.toThrow(
      'Active account changed while generating the blueprint',
    );
    expect(state.setAppError).not.toHaveBeenCalledWith(
      'Active account changed while generating the blueprint',
    );
  });

  it('does not start a second generation while one is already active', async () => {
    state.isGenerating = true;
    const { result } = renderHook(() => useStoryGeneration());

    await act(async () => {
      await result.current.handleStartStory({} as any, {} as any, 1);
    });

    expect(storyApi.generateInitialArc).not.toHaveBeenCalled();
    expect(state.saveStories).not.toHaveBeenCalled();
  });

  it('discards a delayed generation result after the account changes', async () => {
    let resolveGeneration!: (value: any) => void;
    vi.mocked(storyApi.generateInitialArc).mockReturnValue(
      new Promise((resolve) => {
        resolveGeneration = resolve;
      }),
    );
    const { result } = renderHook(() => useStoryGeneration());
    let generation!: Promise<void>;
    act(() => {
      generation = result.current.handleStartStory(
        { mcName: 'Account A hero' } as any,
        { title: 'Account A blueprint' } as any,
        1,
      );
    });
    await vi.waitFor(() => {
      expect(storyApi.generateInitialArc).toHaveBeenCalledOnce();
    });

    (auth as any).currentUser = { uid: 'reader-2' };
    resolveGeneration({
      title: 'Must be discarded',
      chapters: [{ number: 1, title: 'One', premise: '' }],
      characters: [],
      unresolvedPlotThreads: [],
      worldRules: [],
    });
    await act(async () => {
      await generation;
    });

    expect(state.saveStories).not.toHaveBeenCalled();
    expect(state.setActiveStoryId).not.toHaveBeenCalled();
    expect(awardQi).not.toHaveBeenCalled();
  });
});
