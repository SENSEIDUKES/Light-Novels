import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useChapterSealing } from './useChapterSealing';
import { useAppStore } from '../store/useAppStore';
import { storyApi } from '../services/api';
import { renderHook } from '@testing-library/react';

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

describe('useChapterSealing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handleCheckConsistency returns empty array if no active story', async () => {
    useAppStore.setState({ activeStoryId: null, stories: [] } as any);
    const { result } = renderHook(() => useChapterSealing());
    const res = await result.current.handleCheckConsistency(1);
    expect(res).toEqual([]);
  });

  it('handleCheckConsistency returns empty array if chapter not found', async () => {
    useAppStore.setState({ 
      activeStoryId: 's1', 
      stories: [{ id: 's1', arcs: [{ chapters: [{ number: 2 }] }] }]
    } as any);
    const { result } = renderHook(() => useChapterSealing());
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
    const { result } = renderHook(() => useChapterSealing());
    const res = await result.current.handleCheckConsistency(1);
    expect(storyApi.checkConsistency).toHaveBeenCalledWith('content', {}, expect.any(Object));
    expect(res).toEqual(['warn']);
  });

  it('handleSealChapter seals the chapter', async () => {
    useAppStore.setState({ 
      activeStoryId: 's1', 
      saveStories: vi.fn().mockResolvedValue(true),
      stories: [{ id: 's1', arcs: [{ chapters: [{ number: 1, generatedContent: 'content', hasContent: true, isSealed: false }] }] }]
    } as any);
    
    // Polyfill crypto object for node
    const cryptoSubtleMock = { digest: vi.fn().mockResolvedValue(new ArrayBuffer(8)) };
    Object.defineProperty(global, 'window', { value: { crypto: { subtle: cryptoSubtleMock } }, writable: true });
    
    const { result } = renderHook(() => useChapterSealing());
    await result.current.handleSealChapter(1);
    
    const saveStories = useAppStore.getState().saveStories;
    expect(saveStories).toHaveBeenCalled();
    const updatedStory = vi.mocked(saveStories).mock.calls[0][0][0];
    expect(updatedStory.arcs[0].chapters[0].isSealed).toBe(true);
    expect(updatedStory.arcs[0].chapters[0].versionId).toBeDefined();
  });
});
