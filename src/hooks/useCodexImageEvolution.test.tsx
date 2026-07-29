import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  saveMediaAsset: vi.fn(),
  selectMediaAsset: vi.fn(),
  getState: vi.fn(),
  resolveMediaAssetForDisplay: vi.fn(async (descriptor: { id: string }) => ({
    assetId: descriptor.id,
    descriptor,
    url: `blob:${descriptor.id}`,
    source: 'network' as const,
  })),
}));

const authState = vi.hoisted(() => ({
  currentUser: { uid: 'reader-a' } as { uid: string } | null,
}));

vi.mock('../lib/firebase', () => ({ auth: authState }));

vi.mock('../lib/media/mediaAssetClient', () => ({
  MEDIA_PURPOSE: { MANIFESTATION: 'MANIFESTATION' },
  MEDIA_TARGET_KIND: {
    ARTIFACT: 'ARTIFACT',
    BEAST: 'BEAST',
    CHARACTER: 'CHARACTER',
    FACTION: 'FACTION',
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
  resolveMediaAssetForDisplay: mocks.resolveMediaAssetForDisplay,
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
    authState.currentUser = { uid: 'reader-a' };
    mocks.resolveMediaAssetForDisplay.mockImplementation(async (descriptor: { id: string }) => ({
      assetId: descriptor.id,
      descriptor,
      url: `blob:${descriptor.id}`,
      source: 'network' as const,
    }));
    mocks.getState.mockReturnValue({ stories: [], userProfile: {} });
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
    }), 'reader-a');
    const committed = onUpdateStory.mock.calls[0][1];
    expect(committed.memory.characters[0].imageAssetId).toBe('asset-older');
    expect(committed.memory.characters[0].imageHistory.find((image: { id: string }) => image.id === 'history-older').isCurrent)
      .toBe(true);
    expect(committed.memory.characters[0].imageHistory.find((image: { id: string }) => image.id === 'history-newer').isCurrent)
      .toBe(false);
    expect(committed).toEqual({
      memory: expect.anything(),
      mediaDescriptors: {
        'asset-older': expect.objectContaining({
          id: 'asset-older',
          deliveryUrl: '',
        }),
      },
    });
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
    expect(mocks.selectMediaAsset).toHaveBeenCalledWith(
      'asset-older',
      expect.anything(),
      'reader-a',
    );
    const character = onUpdateStory.mock.calls[0][1].memory.characters[0];
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

  it('keeps a committed version selection when delivery resolves to no URL', async () => {
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

    expect(onUpdateStory).toHaveBeenCalledWith(
      activeStory.id,
      expect.objectContaining({
        memory: expect.objectContaining({
          characters: [
            expect.objectContaining({
              imageAssetId: 'asset-older',
              imageUrl: '',
              imageHistory: [
                expect.objectContaining({
                  assetId: 'asset-older',
                  isCurrent: true,
                }),
              ],
            }),
          ],
        }),
        mediaDescriptors: {
          'asset-older': expect.objectContaining({
            id: 'asset-older',
            deliveryUrl: '',
          }),
        },
      }),
    );
    expect(result.current.generationError)
      .toContain('The manifestation selection was saved, but its image could not be loaded yet.');
  });

  it('reverts a faction through its own canonical slot and history', async () => {
    mocks.selectMediaAsset.mockResolvedValue({ id: 'asset-faction-old', deliveryUrl: '' });
    const onUpdateStory = vi.fn();
    const factionMemory = {
      ...memory,
      factions: [{
        id: 'faction-1',
        persistenceId: 'faction-persistence-id',
        imageAssetId: 'asset-faction-new',
        imageHistory: [
          {
            id: 'faction-history-old',
            assetId: 'asset-faction-old',
            entityId: 'faction-1',
            entityType: 'faction',
            imageUrl: '',
            isCurrent: false,
          },
          {
            id: 'faction-history-new',
            assetId: 'asset-faction-new',
            entityId: 'faction-1',
            entityType: 'faction',
            imageUrl: '',
            isCurrent: true,
          },
        ],
      }],
    };
    const { result } = renderHook(() => useCodexImageEvolution(
      factionMemory,
      activeStory,
      onUpdateStory,
      undefined,
      vi.fn(),
    ));

    await act(async () => {
      await result.current.handleRevertImage(
        'faction-1',
        'faction',
        'faction-history-old',
      );
    });

    expect(mocks.selectMediaAsset).toHaveBeenCalledWith(
      'asset-faction-old',
      expect.objectContaining({
        targetKind: 'FACTION',
        targetKey: 'faction-persistence-id',
        entityId: 'faction-persistence-id',
      }),
      'reader-a',
    );
    const faction = onUpdateStory.mock.calls[0][1].memory.factions[0];
    expect(faction).toMatchObject({
      imageAssetId: 'asset-faction-old',
      imageUrl: 'blob:asset-faction-old',
    });
    expect(faction.imageHistory.find(
      (image: { id: string }) => image.id === 'faction-history-old',
    ).isCurrent).toBe(true);
    expect(faction.imageHistory.find(
      (image: { id: string }) => image.id === 'faction-history-new',
    ).isCurrent).toBe(false);
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

  it('retains a blank local descriptor when an evolution is saved', async () => {
    const descriptor = {
      id: 'asset-new',
      version: 2,
      checksumSha256: 'checksum',
      deliveryUrl: 'https://signed.example/new?X-Amz-Signature=abc',
    };
    mocks.saveMediaAsset.mockResolvedValue(descriptor);
    const onUpdateStory = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useCodexImageEvolution(
      memory,
      activeStory,
      onUpdateStory,
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

    expect(mocks.saveMediaAsset).toHaveBeenCalledWith(expect.objectContaining({
      expectedOwnerUid: 'reader-a',
    }));
    expect(mocks.resolveMediaAssetForDisplay).toHaveBeenCalledWith(
      descriptor,
      'reader-a',
    );
    expect(onUpdateStory).toHaveBeenCalledWith(
      activeStory.id,
      expect.objectContaining({
        mediaDescriptors: {
          'asset-new': expect.objectContaining({
            id: 'asset-new',
            version: 2,
            checksumSha256: 'checksum',
            deliveryUrl: '',
          }),
        },
      }),
    );
  });

  it('keeps a saved evolution canonical when delivery signing fails', async () => {
    const descriptor = {
      id: 'asset-new',
      version: 2,
      checksumSha256: 'checksum',
      deliveryUrl: '',
    };
    mocks.saveMediaAsset.mockResolvedValue(descriptor);
    mocks.resolveMediaAssetForDisplay.mockRejectedValue(
      new Error('R2 signing unavailable'),
    );
    const onUpdateStory = vi.fn().mockResolvedValue(undefined);
    const pushNotification = vi.fn();
    const { result } = renderHook(() => useCodexImageEvolution(
      memory,
      activeStory,
      onUpdateStory,
      undefined,
      pushNotification,
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

    expect(onUpdateStory).toHaveBeenCalledWith(
      activeStory.id,
      expect.objectContaining({
        memory: expect.objectContaining({
          characters: [
            expect.objectContaining({
              imageAssetId: 'asset-new',
              imageUrl: '',
              imageHistory: expect.arrayContaining([
                expect.objectContaining({
                  assetId: 'asset-new',
                  imageUrl: '',
                  isCurrent: true,
                }),
              ]),
            }),
          ],
        }),
        mediaDescriptors: {
          'asset-new': expect.objectContaining({
            id: 'asset-new',
            deliveryUrl: '',
          }),
        },
      }),
    );
    expect(result.current.previews['character-1']).toBeUndefined();
    expect(result.current.generationError)
      .toContain('The manifestation was saved, but its image could not be loaded yet.');
    expect(pushNotification).not.toHaveBeenCalled();
  });

  it('abandons a revert when slot selection resolves under another account', async () => {
    let resolveSelection!: (asset: any) => void;
    mocks.selectMediaAsset.mockReturnValue(
      new Promise(resolve => { resolveSelection = resolve; }),
    );
    const onUpdateStory = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useCodexImageEvolution(
      memory,
      activeStory,
      onUpdateStory,
      undefined,
      vi.fn(),
    ));

    let revert!: Promise<void>;
    act(() => {
      revert = result.current.handleRevertImage('character-1', 'character', 'history-id');
    });
    await vi.waitFor(() => expect(mocks.selectMediaAsset).toHaveBeenCalledOnce());

    authState.currentUser = { uid: 'reader-b' };
    resolveSelection({ id: 'asset-id', deliveryUrl: '' });

    await act(async () => {
      await revert;
    });

    expect(mocks.resolveMediaAssetForDisplay).not.toHaveBeenCalled();
    expect(onUpdateStory).not.toHaveBeenCalled();
    expect(result.current.generationError).toBeNull();
  });

  it('abandons an evolution save when its media upload resolves under another account', async () => {
    let resolveAsset!: (asset: any) => void;
    mocks.saveMediaAsset.mockReturnValue(
      new Promise(resolve => { resolveAsset = resolve; }),
    );
    const onUpdateStory = vi.fn().mockResolvedValue(undefined);
    const pushNotification = vi.fn();
    const { result } = renderHook(() => useCodexImageEvolution(
      memory,
      activeStory,
      onUpdateStory,
      undefined,
      pushNotification,
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

    let save!: Promise<void>;
    act(() => {
      save = result.current.handleSaveEvolution('character-1', 'character');
    });
    await vi.waitFor(() => expect(mocks.saveMediaAsset).toHaveBeenCalledOnce());

    authState.currentUser = { uid: 'reader-b' };
    resolveAsset({
      id: 'asset-new',
      version: 1,
      checksumSha256: 'a'.repeat(64),
    });

    await act(async () => {
      await save;
    });

    expect(mocks.resolveMediaAssetForDisplay).not.toHaveBeenCalled();
    expect(onUpdateStory).not.toHaveBeenCalled();
    expect(pushNotification).not.toHaveBeenCalled();
    expect(result.current.generationError).toBeNull();
  });
});
