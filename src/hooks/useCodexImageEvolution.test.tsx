import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  saveMediaAsset: vi.fn(),
  selectMediaAsset: vi.fn(),
  getState: vi.fn(),
}));

vi.mock('../lib/media/mediaAssetClient', () => ({
  MEDIA_PURPOSE: { MANIFESTATION: 'MANIFESTATION' },
  MEDIA_TARGET_KIND: {
    ARTIFACT: 'ARTIFACT',
    BEAST: 'BEAST',
    CHARACTER: 'CHARACTER',
    LOCATION: 'LOCATION',
  },
  requirePersistenceUuid: (value: string) => value,
  saveMediaAsset: mocks.saveMediaAsset,
  selectMediaAsset: mocks.selectMediaAsset,
}));

vi.mock('../store/useAppStore', () => ({
  useAppStore: { getState: mocks.getState },
}));

vi.mock('../lib/id', () => ({
  generateId: () => 'legacy-media-id',
  generateUUID: () => 'idempotency-key',
}));

import { useCodexImageEvolution } from './useCodexImageEvolution';

const memory = {
  characters: [{ id: 'character-1', persistenceId: 'character-persistence-id' }],
  locations: [],
  artifacts: [],
} as any;

const activeStory = {
  id: 'story-id',
  persistenceId: 'story-persistence-id',
  currentChapterNumber: 1,
  imageHistory: [{
    id: 'history-id',
    assetId: 'asset-id',
    entityId: 'character-1',
    imageUrl: 'https://example.test/previous.png',
  }],
} as any;

describe('useCodexImageEvolution error handling', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getState.mockReturnValue({ stories: [] });
  });

  it('surfaces a failure to resolve a persisted image during revert', async () => {
    mocks.selectMediaAsset.mockRejectedValue(new Error('Image is no longer available'));
    const onUpdateStory = vi.fn();
    const { result } = renderHook(() => useCodexImageEvolution(
      memory,
      activeStory,
      onUpdateStory,
      undefined,
      vi.fn(),
    ));

    await act(async () => {
      await result.current.handleRevertImage(
        'character-1',
        'character',
        'https://example.test/previous.png',
      );
    });

    expect(result.current.generationError).toBe('Image is no longer available');
    expect(onUpdateStory).not.toHaveBeenCalled();
  });

  it('keeps a preview available when saving its media asset fails', async () => {
    mocks.saveMediaAsset.mockRejectedValue(new Error('Upload failed'));
    const { result } = renderHook(() => useCodexImageEvolution(
      memory,
      activeStory,
      vi.fn(),
      undefined,
      vi.fn(),
    ));

    act(() => {
      result.current.setPreviews({
        'character-1': {
          prompt: 'A cultivator',
          selectedIndex: 0,
          type: 'character',
          urls: ['https://example.test/new.png'],
        },
      });
    });
    await act(async () => {
      await result.current.handleSaveEvolution('character-1', 'character');
    });

    expect(result.current.generationError).toBe('Upload failed');
    expect(result.current.previews['character-1']).toBeDefined();
  });
});
