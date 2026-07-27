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

vi.mock('../lib/media/privateMediaResolver', () => ({
  resolveMediaAssetForDisplay: vi.fn(async (descriptor: { id: string }) => ({
    assetId: descriptor.id,
    descriptor,
    url: `blob:${descriptor.id}`,
    source: 'network' as const,
  })),
  discardCachedMedia: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/id', () => ({
  generateId: () => 'legacy-media-id',
  generateUUID: () => 'idempotency-key',
}));

import { resolveMediaAssetForDisplay } from '../lib/media/privateMediaResolver';
import { useCodexImageEvolution } from './useCodexImageEvolution';

const memory = {
  characters: [{
    id: 'character-1',
    persistenceId: 'character-persistence-id',
    imageHistory: [{
      id: 'history-id',
      assetId: 'asset-id',
      entityId: 'character-1',
      entityType: 'character',
      imageUrl: 'https://example.test/previous.png',
      promptUsed: 'An earlier manifestation',
      createdAt: '2026-07-20T00:00:00.000Z',
      isCurrent: true,
    }],
  }],
  locations: [],
  artifacts: [],
} as any;

const activeStory = {
  id: 'story-id',
  persistenceId: 'story-persistence-id',
  currentChapterNumber: 1,
  imageHistory: [],
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
      await result.current.handleRevertImage('character-1', 'character', 'history-id');
    });

    expect(result.current.generationError).toBe('Image is no longer available');
    expect(onUpdateStory).not.toHaveBeenCalled();
  });

  // A story read only hydrates delivery URLs for the current surface, so every
  // superseded version comes back with an empty `imageUrl`. Matching on that
  // URL restored whichever blank version happened to be first.
  it('reverts to the version identified by its durable history id', async () => {
    mocks.selectMediaAsset.mockResolvedValue({ id: 'asset-older', deliveryUrl: '' });
    const onUpdateStory = vi.fn();
    const entityMemory = {
      ...memory,
      characters: [{
        id: 'character-1',
        persistenceId: 'character-persistence-id',
        imageHistory: [
          { id: 'history-older', assetId: 'asset-older', entityId: 'character-1', entityType: 'character', imageUrl: '', isCurrent: false },
          { id: 'history-newer', assetId: 'asset-newer', entityId: 'character-1', entityType: 'character', imageUrl: '', isCurrent: true },
        ],
      }],
    };
    const { result } = renderHook(() => useCodexImageEvolution(
      entityMemory, activeStory, onUpdateStory, undefined, vi.fn(),
    ));

    await act(async () => {
      await result.current.handleRevertImage('character-1', 'character', 'history-older');
    });

    expect(mocks.selectMediaAsset).toHaveBeenCalledWith('asset-older', expect.objectContaining({
      targetKind: 'CHARACTER',
      targetKey: 'character-persistence-id',
      entityId: 'character-persistence-id',
    }));
    const committed = onUpdateStory.mock.calls[0][0];
    expect(committed.memory.characters[0].imageAssetId).toBe('asset-older');
    expect(committed.memory.characters[0].imageHistory.find((image: { id: string }) => image.id === 'history-older').isCurrent)
      .toBe(true);
    expect(committed.memory.characters[0].imageHistory.find((image: { id: string }) => image.id === 'history-newer').isCurrent)
      .toBe(false);
    expect(committed.imageHistory).toEqual([]);
  });

  // PostgreSQL rebuilds the story-level history from STORY-targeted media
  // attachments alone, so after a round-trip an entity's versions live only on
  // the entity. Searching the story alone found nothing and the revert blanked
  // the very portrait it was asked to restore.
  it('reverts to a version the cloud stores on the entity, not on the story', async () => {
    mocks.selectMediaAsset.mockResolvedValue({ id: 'asset-older', deliveryUrl: '' });
    const onUpdateStory = vi.fn();
    const entityMemory = {
      ...memory,
      characters: [{
        id: 'character-1',
        persistenceId: 'character-persistence-id',
        imageAssetId: 'asset-newer',
        imageUrl: 'blob:asset-newer',
        imageHistory: [
          { id: 'history-older', assetId: 'asset-older', entityId: 'character-1', imageUrl: '', isCurrent: false },
          { id: 'history-newer', assetId: 'asset-newer', entityId: 'character-1', imageUrl: '', isCurrent: true },
        ],
      }],
    };
    // The cloud shape: covers only.
    const story = { ...activeStory, imageHistory: [] };

    const { result } = renderHook(() => useCodexImageEvolution(
      entityMemory, story, onUpdateStory, undefined, vi.fn(),
    ));

    await act(async () => {
      await result.current.handleRevertImage('character-1', 'character', 'history-older');
    });

    expect(result.current.generationError).toBeNull();
    expect(mocks.selectMediaAsset).toHaveBeenCalledWith('asset-older', expect.anything());
    const character = onUpdateStory.mock.calls[0][0].memory.characters[0];
    expect(character.imageAssetId).toBe('asset-older');
    expect(character.imageUrl).toBe('blob:asset-older');
    expect(character.imageHistory.find((i: { id: string }) => i.id === 'history-older').isCurrent)
      .toBe(true);
    expect(character.imageHistory.find((i: { id: string }) => i.id === 'history-newer').isCurrent)
      .toBe(false);
  });

  it('does not blank a portrait when the requested version is unknown', async () => {
    const onUpdateStory = vi.fn();
    const { result } = renderHook(() => useCodexImageEvolution(
      memory, { ...activeStory, imageHistory: [] }, onUpdateStory, undefined, vi.fn(),
    ));

    await act(async () => {
      await result.current.handleRevertImage('character-1', 'character', 'history-missing');
    });

    expect(mocks.selectMediaAsset).not.toHaveBeenCalled();
    expect(onUpdateStory).not.toHaveBeenCalled();
    expect(result.current.generationError)
      .toBe('That manifestation is no longer recorded and cannot be restored.');
  });

  // PostgreSQL returns every superseded version with a blank `imageUrl`; the
  // `assetId` is the only way to re-sign one. A version carrying neither used
  // to commit that blank straight onto the entity, erasing the live portrait
  // the revert was asked to change.
  it('does not erase the live portrait for a version with no asset and no URL', async () => {
    const onUpdateStory = vi.fn();
    const entityMemory = {
      ...memory,
      characters: [{
        id: 'character-1',
        persistenceId: 'character-persistence-id',
        imageAssetId: 'asset-live',
        imageUrl: 'blob:asset-live',
        imageHistory: [
          { id: 'history-orphan', entityId: 'character-1', imageUrl: '', isCurrent: false },
          { id: 'history-live', assetId: 'asset-live', entityId: 'character-1', imageUrl: '', isCurrent: true },
        ],
      }],
    };

    const { result } = renderHook(() => useCodexImageEvolution(
      entityMemory, { ...activeStory, imageHistory: [] }, onUpdateStory, undefined, vi.fn(),
    ));

    await act(async () => {
      await result.current.handleRevertImage('character-1', 'character', 'history-orphan');
    });

    expect(mocks.selectMediaAsset).not.toHaveBeenCalled();
    expect(onUpdateStory).not.toHaveBeenCalled();
    expect(result.current.generationError)
      .toBe('That manifestation is no longer stored and cannot be restored.');
  });

  it('does not commit a version whose descriptor resolves to no URL', async () => {
    mocks.selectMediaAsset.mockResolvedValue({ id: 'asset-older', deliveryUrl: '' });
    vi.mocked(resolveMediaAssetForDisplay).mockResolvedValueOnce({
      assetId: 'asset-older',
      descriptor: { id: 'asset-older' } as never,
      url: '',
      source: 'network',
    });
    const onUpdateStory = vi.fn();
    const entityMemory = {
      ...memory,
      characters: [{
        id: 'character-1',
        persistenceId: 'character-persistence-id',
        imageAssetId: 'asset-live',
        imageUrl: 'blob:asset-live',
        imageHistory: [
          { id: 'history-older', assetId: 'asset-older', entityId: 'character-1', imageUrl: '', isCurrent: false },
        ],
      }],
    };

    const { result } = renderHook(() => useCodexImageEvolution(
      entityMemory, { ...activeStory, imageHistory: [] }, onUpdateStory, undefined, vi.fn(),
    ));

    await act(async () => {
      await result.current.handleRevertImage('character-1', 'character', 'history-older');
    });

    expect(onUpdateStory).not.toHaveBeenCalled();
    expect(result.current.generationError)
      .toBe('That manifestation could not be resolved and was left unchanged.');
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
