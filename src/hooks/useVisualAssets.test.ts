import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useVisualAssets } from './useVisualAssets';
import { useAppStore } from '../store/useAppStore';
import { storyApi } from '../services/api';
import { auth } from '../lib/firebase';
import { saveMediaAsset } from '../lib/media/mediaAssetClient';
import { resolveMediaAssetForDisplay } from '../lib/media/privateMediaResolver';

vi.mock('../store/useAppStore', () => ({ useAppStore: vi.fn() }));

vi.mock('../services/api', () => ({
  storyApi: { generateCardImage: vi.fn() },
}));

vi.mock('../lib/firebase', () => ({ auth: { currentUser: { uid: 'reader-a' } } }));

vi.mock('../lib/media/mediaAssetClient', () => ({
  MEDIA_PURPOSE: { STORY_COVER: 'STORY_COVER' },
  MEDIA_TARGET_KIND: { STORY: 'STORY' },
  requirePersistenceUuid: vi.fn(() => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  saveMediaAsset: vi.fn(),
  selectMediaAsset: vi.fn(),
}));

vi.mock('../lib/media/privateMediaResolver', () => ({
  discardCachedMedia: vi.fn(),
  resolveMediaAssetForDisplay: vi.fn(),
}));

describe('useVisualAssets account-transition isolation', () => {
  let state: any;

  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).currentUser = { uid: 'reader-a' };
    state = {
      isGenerating: false,
      activeStoryId: 'story-a',
      stories: [{
        id: 'story-a',
        persistenceId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        title: 'Account A story',
        genre: 'Xianxia',
        mcName: 'Aster',
        customPremise: 'A private cultivation path.',
        currentChapterNumber: 1,
        memory: {},
        arcs: [],
      }],
      routingConfig: { imageGenerator: 'default' },
      setAppError: vi.fn(),
      setIsGenerating: vi.fn((value: boolean) => { state.isGenerating = value; }),
      setGenerationPhase: vi.fn(),
      updateStory: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(useAppStore).mockImplementation((selector: any) => selector(state));
    (useAppStore as any).getState = vi.fn(() => state);
  });

  it('keeps same-account cover success behavior intact', async () => {
    vi.mocked(storyApi.generateCardImage).mockResolvedValue({ imageUrls: ['https://image.test/cover.png'] });
    const { result } = renderHook(() => useVisualAssets());

    let generated: any;
    await act(async () => {
      generated = await result.current.handleGenerateCover();
    });

    expect(generated).toMatchObject({ imageUrls: ['https://image.test/cover.png'] });
    expect(state.setAppError).toHaveBeenCalledWith(null);
    expect(state.setIsGenerating).toHaveBeenLastCalledWith(false);
    expect(state.setGenerationPhase).toHaveBeenLastCalledWith(null);
  });

  it('keeps same-account cover failures visible and restores runtime state', async () => {
    vi.mocked(storyApi.generateCardImage).mockRejectedValue(new Error('Image provider unavailable'));
    const { result } = renderHook(() => useVisualAssets());

    await act(async () => {
      await result.current.handleGenerateCover();
    });

    expect(state.setAppError).toHaveBeenCalledWith('Image provider unavailable');
    expect(state.setIsGenerating).toHaveBeenLastCalledWith(false);
    expect(state.setGenerationPhase).toHaveBeenLastCalledWith(null);
  });

  it('discards an old cover result before it can reach permanent media', async () => {
    let resolveImage!: (value: any) => void;
    vi.mocked(storyApi.generateCardImage).mockReturnValue(
      new Promise(resolve => { resolveImage = resolve; }),
    );
    const { result } = renderHook(() => useVisualAssets());

    let generation!: Promise<any>;
    act(() => {
      generation = result.current.handleGenerateCover();
    });
    await vi.waitFor(() => expect(storyApi.generateCardImage).toHaveBeenCalledOnce());

    (auth as any).currentUser = { uid: 'reader-b' };
    state.isGenerating = false;
    resolveImage({ imageUrls: ['https://image.test/account-a.png'] });

    await expect(generation).resolves.toBeUndefined();
    expect(saveMediaAsset).not.toHaveBeenCalled();
    expect(state.setAppError).not.toHaveBeenCalledWith(expect.any(String));
    expect(state.setIsGenerating).not.toHaveBeenCalledWith(false);
    expect(state.setGenerationPhase).not.toHaveBeenCalledWith(null);
  });

  it('does not update a cover after a media save resolves under another account', async () => {
    let resolveAsset!: (value: any) => void;
    vi.mocked(saveMediaAsset).mockReturnValue(
      new Promise(resolve => { resolveAsset = resolve; }) as any,
    );
    const { result } = renderHook(() => useVisualAssets());

    let apply!: Promise<void>;
    act(() => {
      apply = result.current.handleApplyCover('https://image.test/account-a.png', 'Account A prompt');
    });
    await vi.waitFor(() => expect(saveMediaAsset).toHaveBeenCalledOnce());

    (auth as any).currentUser = { uid: 'reader-b' };
    resolveAsset({ id: 'asset-a', version: 1, checksumSha256: 'checksum' });

    await act(async () => {
      await apply;
    });

    expect(resolveMediaAssetForDisplay).not.toHaveBeenCalled();
    expect(state.updateStory).not.toHaveBeenCalled();
  });
});
