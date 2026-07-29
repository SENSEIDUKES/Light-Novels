import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useImageManifest } from './useImageManifest';

const STORY_UUID = '11111111-1111-4111-8111-111111111111';
const CHAPTER_UUID = '22222222-2222-4222-8222-222222222222';
const ENTITY_UUID = '33333333-3333-4333-8333-333333333333';
const BEAST_UUID = '44444444-4444-4444-8444-444444444444';
const LOCATION_UUID = '55555555-5555-4555-8555-555555555555';
const ARTIFACT_UUID = '66666666-6666-4666-8666-666666666666';
const FACTION_UUID = '77777777-7777-4777-8777-777777777777';

const mocks = vi.hoisted(() => ({
  saveMediaAsset: vi.fn(),
  saveStories: vi.fn().mockResolvedValue(undefined),
  stories: [] as any[],
  storyOwnerUid: undefined as string | undefined,
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

vi.mock('../lib/quota', () => ({
  checkAndConsumeImageQuota: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../lib/encryption', () => ({
  secureStorage: {
    getItem: vi.fn().mockResolvedValue('test-key')
  }
}));

vi.mock('../lib/media/mediaAssetClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/media/mediaAssetClient')>();
  return { ...actual, saveMediaAsset: mocks.saveMediaAsset };
});

vi.mock('../lib/media/privateMediaResolver', () => ({
  resolveMediaAssetForDisplay: mocks.resolveMediaAssetForDisplay,
  discardCachedMedia: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../store/useAppStore', () => ({
  useAppStore: vi.fn((selector) => {
    const mockState = {
      stories: mocks.stories,
      activeStoryId: 'story-1',
      saveStories: mocks.saveStories,
      routingConfig: {}
    };
    return selector(mockState);
  })
}));

describe('useImageManifest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.currentUser = { uid: 'reader-a' };
    mocks.storyOwnerUid = undefined;
    mocks.stories = [{
      id: 'story-1',
      userId: mocks.storyOwnerUid,
      persistenceId: STORY_UUID,
      currentChapterNumber: 1,
      memory: {
        characters: [
          { id: 'char-ye-mo', persistenceId: ENTITY_UUID, name: 'Ye Mo' },
          { id: 'beast-azure', persistenceId: BEAST_UUID, name: 'Azure Serpent', isBeast: true },
        ],
        locations: [{ id: 'location-peak', persistenceId: LOCATION_UUID, name: 'Cloud Peak' }],
        artifacts: [{ id: 'artifact-seal', persistenceId: ARTIFACT_UUID, name: 'Moon Seal' }],
        factions: [{ id: 'faction-hall', persistenceId: FACTION_UUID, name: 'Moon Hall' }],
      },
      arcs: [{
        chapters: [{ number: 1, title: 'Ch 1', persistenceId: CHAPTER_UUID }],
      }],
    }];
    mocks.saveStories.mockImplementation(async (updated: any) => {
      mocks.stories = typeof updated === 'function'
        ? updated(mocks.stories)
        : updated;
    });
    mocks.saveMediaAsset.mockResolvedValue({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      version: 1,
      checksumSha256: 'a'.repeat(64),
      deliveryUrl: 'https://signed.example/asset',
      deliveryUrlExpiresAt: '2026-07-26T00:15:00.000Z',
      visibility: 'PRIVATE',
      mimeType: 'image/png',
    });
    mocks.resolveMediaAssetForDisplay.mockImplementation(async (descriptor: { id: string }) => ({
      assetId: descriptor.id,
      descriptor,
      url: `blob:${descriptor.id}`,
      source: 'network' as const,
    }));
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ imageUrls: ['https://image.pollinations.ai/prompt/ye-mo'] }),
    })) as unknown as typeof fetch);
  });

  it('initializes generatingIds as an empty set', () => {
    const { result } = renderHook(() => useImageManifest());
    expect(result.current.generatingIds).toBeDefined();
    expect(result.current.generatingIds.size).toBe(0);
  });

  // The media slot is addressed by (owner, targetKind, targetKey, purpose) and
  // the server requires targetKey to be the canonical relational id. Sending
  // the story-local stable key made every manifestation upload fail with
  // "Codex media must include the matching owned entity ID".
  it('keys a manifestation slot by the canonical Codex entity id', async () => {
    const { result } = renderHook(() => useImageManifest());

    await act(async () => {
      await result.current.manifestImage(
        { id: 'char-ye-mo', persistenceId: ENTITY_UUID, name: 'Ye Mo', description: 'A rival' },
        'character',
      );
    });

    const association = mocks.saveMediaAsset.mock.calls[0][0].association;
    expect(association).toMatchObject({
      targetKind: 'CHARACTER',
      targetKey: ENTITY_UUID,
      entityId: ENTITY_UUID,
      storyId: STORY_UUID,
    });
    expect(mocks.saveMediaAsset.mock.calls[0][0].expectedOwnerUid)
      .toBe('reader-a');
    expect(mocks.resolveMediaAssetForDisplay).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }),
      'reader-a',
    );
    expect(mocks.saveStories).toHaveBeenCalled();
  });

  it.each([
    ['character', { id: 'char-ye-mo', persistenceId: ENTITY_UUID, name: 'Ye Mo', description: 'A rival' }, 'characters', 'char-ye-mo'],
    ['beast', { id: 'beast-azure', persistenceId: BEAST_UUID, name: 'Azure Serpent', description: 'A spirit beast' }, 'characters', 'beast-azure'],
    ['location', { id: 'location-peak', persistenceId: LOCATION_UUID, name: 'Cloud Peak', description: 'A dangerous summit' }, 'locations', 'location-peak'],
    ['artifact', { id: 'artifact-seal', persistenceId: ARTIFACT_UUID, name: 'Moon Seal', description: 'An ancient seal' }, 'artifacts', 'artifact-seal'],
    ['faction', { id: 'faction-hall', persistenceId: FACTION_UUID, name: 'Moon Hall', description: 'A hidden sect' }, 'factions', 'faction-hall'],
  ])('writes a %s manifestation only onto its %s owner', async (type, entry, collection, ownerId) => {
    const { result } = renderHook(() => useImageManifest());

    await act(async () => {
      await result.current.manifestImage(entry, type);
    });

    const savedStory = mocks.stories[0];
    const owner = savedStory.memory[collection].find((candidate: { id: string }) => candidate.id === ownerId);
    expect(owner.imageHistory).toEqual([
      expect.objectContaining({
        assetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        entityId: ownerId,
        entityType: type,
        isCurrent: true,
      }),
    ]);
    expect(savedStory.mediaDescriptors).toMatchObject({
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa': {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        version: 1,
        checksumSha256: 'a'.repeat(64),
        deliveryUrl: '',
      },
    });
    expect(savedStory.imageHistory).toBeUndefined();
  });

  it('keys a chapter hero slot by the canonical chapter id', async () => {
    const { result } = renderHook(() => useImageManifest());

    await act(async () => {
      await result.current.manifestChapterHero(1, 'A cinematic memory.');
    });

    const association = mocks.saveMediaAsset.mock.calls[0][0].association;
    expect(association).toMatchObject({
      targetKind: 'CHAPTER',
      targetKey: CHAPTER_UUID,
      chapterId: CHAPTER_UUID,
      storyId: STORY_UUID,
    });
    const savedChapter = mocks.stories[0].arcs[0].chapters[0];
    expect(savedChapter.imageHistory).toEqual([
      expect.objectContaining({
        assetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        entityId: CHAPTER_UUID,
        entityType: 'chapterHero',
        chapterNumber: 1,
      }),
    ]);
    expect(mocks.stories[0].mediaDescriptors).toMatchObject({
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa': {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        deliveryUrl: '',
      },
    });
    expect(mocks.stories[0].imageHistory).toBeUndefined();
  });

  it('retains a saved manifestation when delivery signing fails', async () => {
    mocks.resolveMediaAssetForDisplay.mockRejectedValue(
      new Error('R2 signing unavailable'),
    );
    const { result } = renderHook(() => useImageManifest());

    let failure: unknown;
    await act(async () => {
      try {
        await result.current.manifestImage(
          {
            id: 'char-ye-mo',
            persistenceId: ENTITY_UUID,
            name: 'Ye Mo',
            description: 'A rival',
          },
          'character',
        );
      } catch (error) {
        failure = error;
      }
    });

    const savedStory = mocks.stories[0];
    expect(savedStory.memory.characters[0]).toMatchObject({
      imageAssetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      imageUrl: '',
      imageHistory: [
        expect.objectContaining({
          assetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          imageUrl: '',
          isCurrent: true,
        }),
      ],
    });
    expect(savedStory.mediaDescriptors).toMatchObject({
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa': {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        deliveryUrl: '',
      },
    });
    expect(failure).toEqual(expect.objectContaining({
      message: expect.stringContaining(
        'The manifestation was saved permanently, but its image could not be loaded yet.',
      ),
    }));
  });

  it('retains a saved chapter hero when delivery signing fails', async () => {
    mocks.resolveMediaAssetForDisplay.mockRejectedValue(
      new Error('R2 signing unavailable'),
    );
    const { result } = renderHook(() => useImageManifest());

    let failure: unknown;
    await act(async () => {
      try {
        await result.current.manifestChapterHero(1, 'A cinematic memory.');
      } catch (error) {
        failure = error;
      }
    });

    const savedStory = mocks.stories[0];
    expect(savedStory.arcs[0].chapters[0]).toMatchObject({
      heroImageAssetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      assetManifest: { heroImage: '' },
      imageHistory: [
        expect.objectContaining({
          assetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          imageUrl: '',
          isCurrent: true,
        }),
      ],
    });
    expect(savedStory.mediaDescriptors).toMatchObject({
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa': {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        deliveryUrl: '',
      },
    });
    expect(failure).toEqual(expect.objectContaining({
      message: expect.stringContaining(
        'The chapter hero was saved permanently, but its image could not be loaded yet.',
      ),
    }));
  });

  it('preserves a concurrent story and entity edit while saving a manifestation', async () => {
    let resolveDelivery!: (value: any) => void;
    mocks.resolveMediaAssetForDisplay.mockReturnValue(
      new Promise(resolve => { resolveDelivery = resolve; }),
    );
    const { result } = renderHook(() => useImageManifest());

    let manifestation!: Promise<string | undefined>;
    act(() => {
      manifestation = result.current.manifestImage(
        {
          id: 'char-ye-mo',
          persistenceId: ENTITY_UUID,
          name: 'Ye Mo',
          description: 'A rival',
        },
        'character',
      );
    });
    await waitFor(() =>
      expect(mocks.resolveMediaAssetForDisplay).toHaveBeenCalledOnce());

    mocks.stories = mocks.stories.map(story => ({
      ...story,
      title: 'Concurrent title edit',
      memory: {
        ...story.memory,
        characters: story.memory.characters.map((character: any) =>
          character.id === 'char-ye-mo'
            ? { ...character, description: 'Concurrent entity edit' }
            : character),
      },
    }));
    resolveDelivery({
      assetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      descriptor: mocks.saveMediaAsset.mock.results[0].value,
      url: 'blob:manifestation',
      source: 'network',
    });

    await act(async () => {
      await manifestation;
    });

    expect(mocks.saveStories.mock.calls[0][0]).toBeTypeOf('function');
    expect(mocks.stories[0]).toMatchObject({
      title: 'Concurrent title edit',
      memory: {
        characters: [
          expect.objectContaining({
            id: 'char-ye-mo',
            description: 'Concurrent entity edit',
            imageAssetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          }),
          expect.anything(),
        ],
      },
    });
  });

  it('preserves a concurrent chapter edit while saving its hero image', async () => {
    let resolveDelivery!: (value: any) => void;
    mocks.resolveMediaAssetForDisplay.mockReturnValue(
      new Promise(resolve => { resolveDelivery = resolve; }),
    );
    const { result } = renderHook(() => useImageManifest());

    let manifestation!: Promise<string | undefined>;
    act(() => {
      manifestation = result.current.manifestChapterHero(
        1,
        'A cinematic memory.',
      );
    });
    await waitFor(() =>
      expect(mocks.resolveMediaAssetForDisplay).toHaveBeenCalledOnce());

    mocks.stories = mocks.stories.map(story => ({
      ...story,
      title: 'Concurrent title edit',
      arcs: story.arcs.map((arc: any) => ({
        ...arc,
        chapters: arc.chapters.map((chapter: any) =>
          chapter.number === 1
            ? { ...chapter, title: 'Concurrent chapter title' }
            : chapter),
      })),
    }));
    resolveDelivery({
      assetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      descriptor: mocks.saveMediaAsset.mock.results[0].value,
      url: 'blob:chapter-hero',
      source: 'network',
    });

    await act(async () => {
      await manifestation;
    });

    expect(mocks.saveStories.mock.calls[0][0]).toBeTypeOf('function');
    expect(mocks.stories[0]).toMatchObject({
      title: 'Concurrent title edit',
      arcs: [{
        chapters: [{
          number: 1,
          title: 'Concurrent chapter title',
          heroImageAssetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        }],
      }],
    });
  });

  it('rejects a story owned by another account before quota or generation begins', async () => {
    mocks.storyOwnerUid = 'reader-b';
    mocks.stories[0].userId = 'reader-b';
    const quota = await import('../lib/quota');
    const { result } = renderHook(() => useImageManifest());

    await act(async () => {
      await result.current.manifestImage(
        {
          id: 'char-ye-mo',
          persistenceId: ENTITY_UUID,
          name: 'Ye Mo',
          description: 'A rival',
        },
        'character',
      );
      await result.current.manifestChapterHero(1, 'A cinematic memory.');
    });

    expect(quota.checkAndConsumeImageQuota).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.saveMediaAsset).not.toHaveBeenCalled();
    expect(result.current.generatingIds.size).toBe(0);
  });

  it('abandons a manifestation when its media save resolves under another account', async () => {
    let resolveAsset!: (asset: any) => void;
    mocks.saveMediaAsset.mockReturnValue(
      new Promise(resolve => { resolveAsset = resolve; }),
    );
    const { result } = renderHook(() => useImageManifest());

    let manifestation!: Promise<string | undefined>;
    act(() => {
      manifestation = result.current.manifestImage(
        { id: 'char-ye-mo', persistenceId: ENTITY_UUID, name: 'Ye Mo', description: 'A rival' },
        'character',
      );
    });
    await waitFor(() => expect(mocks.saveMediaAsset).toHaveBeenCalledOnce());

    authState.currentUser = { uid: 'reader-b' };
    resolveAsset({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      version: 1,
      checksumSha256: 'a'.repeat(64),
    });

    await act(async () => {
      await manifestation;
    });

    expect(mocks.resolveMediaAssetForDisplay).not.toHaveBeenCalled();
    expect(mocks.saveStories).not.toHaveBeenCalled();
  });

  it('abandons a chapter hero when its media save resolves under another account', async () => {
    let resolveAsset!: (asset: any) => void;
    mocks.saveMediaAsset.mockReturnValue(
      new Promise(resolve => { resolveAsset = resolve; }),
    );
    const { result } = renderHook(() => useImageManifest());

    let manifestation!: Promise<string | undefined>;
    act(() => {
      manifestation = result.current.manifestChapterHero(1, 'A cinematic memory.');
    });
    await waitFor(() => expect(mocks.saveMediaAsset).toHaveBeenCalledOnce());

    authState.currentUser = { uid: 'reader-b' };
    resolveAsset({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      version: 1,
      checksumSha256: 'a'.repeat(64),
    });

    await act(async () => {
      await manifestation;
    });

    expect(mocks.resolveMediaAssetForDisplay).not.toHaveBeenCalled();
    expect(mocks.saveStories).not.toHaveBeenCalled();
  });
});
