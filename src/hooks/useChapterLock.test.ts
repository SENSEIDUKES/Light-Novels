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
    vi.mocked(storyStorage.getChapterContent).mockReset();
    vi.mocked(storyApi.checkConsistency).mockReset();
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

  it('handleCheckConsistency hydrates offloaded content and consumes the hydrated text', async () => {
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

  it('handleCheckConsistency falls back to blocks when offloaded hydration fails', async () => {
    useAppStore.setState({
      activeStoryId: 's1',
      routingConfig: { storyMaker: {} },
      stories: [{ id: 's1', memory: {}, arcs: [{ chapters: [{ number: 1, generatedContent: '', hasContent: true, blocks: [{ text: 'fallback block' }] }] }] }]
    } as any);

    vi.mocked(storyStorage.getChapterContent).mockRejectedValue(new Error('offline'));
    vi.mocked(storyApi.checkConsistency).mockResolvedValue(['warn']);
    const { result } = renderHook(() => useChapterLock());
    const res = await result.current.handleCheckConsistency(1);

    expect(storyApi.checkConsistency).toHaveBeenCalledWith('fallback block', {}, expect.any(Object));
    expect(res).toEqual(['warn']);
  });

  it('handleSealChapter seals the chapter and prevents multiple awards', async () => {
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

    const cryptoSubtleMock = { digest: vi.fn().mockResolvedValue(new ArrayBuffer(8)) };
    Object.defineProperty(global, 'window', { value: { crypto: { subtle: cryptoSubtleMock } }, writable: true });

    const { result } = renderHook(() => useChapterLock());

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

  it('handleSealChapter aborts when offloaded content cannot be recovered', async () => {
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
    vi.mocked(storyStorage.getChapterContent).mockResolvedValue(null);

    const { result } = renderHook(() => useChapterLock());

    await act(async () => {
      await result.current.handleSealChapter(1);
    });

    expect(cryptoSubtleMock.digest).not.toHaveBeenCalled();
    expect(awardQi).not.toHaveBeenCalled();
    const updatedStory = useAppStore.getState().stories[0];
    expect(updatedStory.arcs[0].chapters[0].isSealed).toBe(false);
  });

  it('handleSealChapter hydrates offloaded content and hashes the hydrated text', async () => {
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
    expect(cryptoSubtleMock.digest).toHaveBeenCalledTimes(1);
    const hashInput = cryptoSubtleMock.digest.mock.calls[0][1] as unknown as Uint8Array;
    expect(new TextDecoder().decode(hashInput)).toBe('hydrated content');
    expect(awardQi).toHaveBeenCalledTimes(1);
    const updatedStory = useAppStore.getState().stories[0];
    expect(updatedStory.arcs[0].chapters[0].isSealed).toBe(true);
  });

  it('handleSealChapter falls back to blocks when offloaded hydration fails', async () => {
    useAppStore.setState({
      activeStoryId: 's1',
      saveStories: vi.fn().mockImplementation(async (updates) => {
        if (typeof updates === 'function') {
          useAppStore.setState({ stories: updates(useAppStore.getState().stories) });
        } else {
          useAppStore.setState({ stories: updates });
        }
      }),
      stories: [{ id: 's1', arcs: [{ chapters: [{ number: 1, generatedContent: '', hasContent: true, blocks: [{ text: 'fallback block' }], isSealed: false }] }] }]
    } as any);

    const cryptoSubtleMock = { digest: vi.fn().mockResolvedValue(new ArrayBuffer(8)) };
    Object.defineProperty(global, 'window', { value: { crypto: { subtle: cryptoSubtleMock } }, writable: true });
    vi.mocked(storyStorage.getChapterContent).mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useChapterLock());

    await act(async () => {
      await result.current.handleSealChapter(1);
    });

    const hashInput = cryptoSubtleMock.digest.mock.calls[0][1] as unknown as Uint8Array;
    expect(new TextDecoder().decode(hashInput)).toBe('fallback block');
    expect(awardQi).toHaveBeenCalledTimes(1);
  });

  it('handleSealChapter rejects a chapter that is genuinely cleared while hashing', async () => {
    const initialStory = {
      id: 's1',
      arcs: [{ chapters: [{ number: 1, generatedContent: 'content', hasContent: true, isSealed: false }] }]
    } as any;
    useAppStore.setState({
      activeStoryId: 's1',
      saveStories: vi.fn().mockImplementation(async (updates) => {
        if (typeof updates === 'function') {
          useAppStore.setState({ stories: updates(useAppStore.getState().stories) });
        } else {
          useAppStore.setState({ stories: updates });
        }
      }),
      stories: [initialStory]
    } as any);

    const cryptoSubtleMock = {
      digest: vi.fn().mockImplementation(async () => {
        useAppStore.setState({
          stories: [{
            ...initialStory,
            arcs: [{ chapters: [{ number: 1, generatedContent: '', hasContent: false, isSealed: false }] }]
          }]
        } as any);
        return new ArrayBuffer(8);
      })
    };
    Object.defineProperty(global, 'window', { value: { crypto: { subtle: cryptoSubtleMock } }, writable: true });

    const { result } = renderHook(() => useChapterLock());
    await act(async () => {
      await result.current.handleSealChapter(1);
    });

    expect(awardQi).not.toHaveBeenCalled();
    expect(useAppStore.getState().stories[0].arcs[0].chapters[0].isSealed).toBe(false);
  });

  it('handleSealChapter scans blocks-only content once', async () => {
    useAppStore.setState({
      activeStoryId: 's1',
      saveStories: vi.fn().mockImplementation(async (updates) => {
        if (typeof updates === 'function') {
          useAppStore.setState({ stories: updates(useAppStore.getState().stories) });
        } else {
          useAppStore.setState({ stories: updates });
        }
      }),
      stories: [{ id: 's1', arcs: [{ chapters: [{ number: 1, generatedContent: '', hasContent: false, blocks: [{ text: 'block text' }], isSealed: false }] }] }]
    } as any);

    const cryptoSubtleMock = { digest: vi.fn().mockResolvedValue(new ArrayBuffer(8)) };
    Object.defineProperty(global, 'window', { value: { crypto: { subtle: cryptoSubtleMock } }, writable: true });
    const artifactsModule = await import('../lib/artifacts');
    vi.mocked(artifactsModule.scanChapterForArtifacts).mockResolvedValue(null);

    const { result } = renderHook(() => useChapterLock());

    await act(async () => {
      await result.current.handleSealChapter(1);
    });

    expect(awardQi).toHaveBeenCalledTimes(1);
    const updatedStory = useAppStore.getState().stories[0];
    expect(updatedStory.arcs[0].chapters[0].isSealed).toBe(true);
    expect(artifactsModule.scanChapterForArtifacts).toHaveBeenCalledWith(
      's1', undefined, 1, 'block text', expect.any(Object)
    );
  });
});
