import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
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
}));

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
  resolveMediaAssetForDisplay: vi.fn(async (descriptor: { id: string }) => ({
    assetId: descriptor.id,
    descriptor,
    url: `blob:${descriptor.id}`,
    source: 'network' as const,
  })),
  discardCachedMedia: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../store/useAppStore', () => ({
  useAppStore: vi.fn((selector) => {
    const mockState = {
      stories: [{
        id: 'story-1',
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
      }],
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
    mocks.saveMediaAsset.mockResolvedValue({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      version: 1,
      checksumSha256: 'a'.repeat(64),
      deliveryUrl: 'https://signed.example/asset',
      deliveryUrlExpiresAt: '2026-07-26T00:15:00.000Z',
      visibility: 'PRIVATE',
      mimeType: 'image/png',
    });
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

    const savedStory = mocks.saveStories.mock.calls[0][0][0];
    const owner = savedStory.memory[collection].find((candidate: { id: string }) => candidate.id === ownerId);
    expect(owner.imageHistory).toEqual([
      expect.objectContaining({
        assetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        entityId: ownerId,
        entityType: type,
        isCurrent: true,
      }),
    ]);
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
    const savedChapter = mocks.saveStories.mock.calls[0][0][0].arcs[0].chapters[0];
    expect(savedChapter.imageHistory).toEqual([
      expect.objectContaining({
        assetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        entityId: CHAPTER_UUID,
        entityType: 'chapterHero',
        chapterNumber: 1,
      }),
    ]);
    expect(mocks.saveStories.mock.calls[0][0][0].imageHistory).toBeUndefined();
  });
});
