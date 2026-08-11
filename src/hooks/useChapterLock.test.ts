import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useChapterLock } from './useChapterLock';
import { useAppStore } from '../store/useAppStore';
import { storyApi } from '../services/api';
import { renderHook, act } from '@testing-library/react';
import { awardQi } from '../lib/qi';
import { storyStorage } from '../lib/storage';

vi.mock('../lib/storage', () => ({
  storyStorage: {
    getChapterContent: vi.fn(),
  }
}));

vi.mock('../services/api', () => ({
  storyApi: {
    checkConsistency: vi.fn(),
  },
}));

vi.mock('../lib/qi', () => ({
  awardQi: vi.fn(),
}));

vi.mock('../lib/artifacts', () => ({
  unlockCosmicArtifact: vi.fn().mockResolvedValue(null),
  scanChapterForArtifacts: vi.fn().mockResolvedValue(null),
}));

describe('useChapterLock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handleCheckConsistency returns empty array if no active story', async () => {
    useAppStore.setState({ activeStoryId: null, stories: [] } as any);
    const { result } = renderHook(() => useChapterLock());
    const res = await result.current.handleCheckConsistency(1);
    expect(res).toEqual([]);
  });

  it('handleCheckConsistency returns empty array if chapter not found', async () => {
    useAppStore.setState({ 
      activeStoryId: 's1', 
      stories: [{ id: 's1', arcs: [{ chapters: [{ number: 2 }] }] }]
    } as any);
    const { result } = renderHook(() => useChapterLock());
    const res = await result.current.handleCheckConsistency(1);
    expect(res).toEqual([]);
  });

  it('handleCheckConsistency calls api successfully', async () => {
    useAppStore.setState({ 
      activeStoryId: 's1', 
      routingConfig: { storyMaker: {} },
      stories: [{ id: 's1', memory: {}, arcs: [{ chapters: [{ number: 1, generatedContent: 'content', hasContent: true }] }] }]
    } as any);
    vi.mocked(storyApi.checkConsistency).mockResolvedValue(['warn']);
    const { result } = renderHook(() => useChapterLock());
    const res = await result.current.handleCheckConsistency(1);
    expect(storyApi.checkConsistency).toHaveBeenCalledWith('content', {}, expect.any(Object));
    expect(res).toEqual(['warn']);
  });

  it('handleCheckConsistency hydrates offloaded content', async () => {
    useAppStore.setState({
      activeStoryId: 's1',
      routingConfig: { storyMaker: {} },
      stories: [{ id: 's1', memory: {}, arcs: [{ chapters: [{ number: 1, generatedContent: '', hasContent: true }] }] }]
    } as any);

    vi.mocked(storyStorage.getChapterContent).mockResolvedValue({ generatedContent: 'hydrated content' } as any);
    vi.mocked(storyApi.checkConsistency).mockResolvedValue(['warn']);
    const { result } = renderHook(() => useChapterLock());
    const res = await result.current.handleCheckConsistency(1);

    expect(storyStorage.getChapterContent).toHaveBeenCalledWith('s1', 1);
    expect(storyApi.checkConsistency).toHaveBeenCalledWith('hydrated content', {}, expect.any(Object));
    expect(res).toEqual(['warn']);
  });

  it('handleSealChapter seals the chapter and prevents multiple awards', async () => {
    // Reset stories before test
    useAppStore.setState({
      activeStoryId: 's1',
      saveStories: vi.fn().mockImplementation(async (updates) => {
          if (typeof updates === 'function') {
            useAppStore.setState({ stories: updates(useAppStore.getState().stories) });
          } else {
            useAppStore.setState({ stories: updates });
          }
      }),
      stories: [{ id: 's1', arcs: [{ chapters: [{ number: 1, generatedContent: 'content', hasContent: true, isSealed: false }] }] }]
    } as any);
    
    // Polyfill crypto object for node
    const cryptoSubtleMock = { digest: vi.fn().mockResolvedValue(new ArrayBuffer(8)) };
    Object.defineProperty(global, 'window', { value: { crypto: { subtle: cryptoSubtleMock } }, writable: true });
    
    const { result } = renderHook(() => useChapterLock());
    
    // Simulate double click
    await act(async () => {
      await Promise.all([
        result.current.handleSealChapter(1),
        result.current.handleSealChapter(1)
      ]);
    });

    expect(awardQi).toHaveBeenCalledTimes(1);
    const updatedStory = useAppStore.getState().stories[0];
    expect(updatedStory.arcs[0].chapters[0].isSealed).toBe(true);
    expect(updatedStory.arcs[0].chapters[0].versionId).toBeDefined();
  });

  it('handleSealChapter hydrates offloaded content before sealing', async () => {
    useAppStore.setState({
      activeStoryId: 's1',
      saveStories: vi.fn().mockImplementation(async (updates) => {
          if (typeof updates === 'function') {
            useAppStore.setState({ stories: updates(useAppStore.getState().stories) });
          } else {
            useAppStore.setState({ stories: updates });
          }
      }),
      stories: [{ id: 's1', arcs: [{ chapters: [{ number: 1, generatedContent: '', hasContent: true, isSealed: false }] }] }]
    } as any);

    const cryptoSubtleMock = { digest: vi.fn().mockResolvedValue(new ArrayBuffer(8)) };
    Object.defineProperty(global, 'window', { value: { crypto: { subtle: cryptoSubtleMock } }, writable: true });

    vi.mocked(storyStorage.getChapterContent).mockResolvedValue({ generatedContent: 'hydrated content' } as any);

    const { result } = renderHook(() => useChapterLock());

    await act(async () => {
      await result.current.handleSealChapter(1);
    });

    expect(storyStorage.getChapterContent).toHaveBeenCalledWith('s1', 1);
    expect(awardQi).toHaveBeenCalledTimes(1);
    const updatedStory = useAppStore.getState().stories[0];
    expect(updatedStory.arcs[0].chapters[0].isSealed).toBe(true);
  });
});
