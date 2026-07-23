// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChapterContent, LoreGlossary, StoryWorld } from '../../types';
import {
  assertPermanentPersistencePayload,
  DataConnectStorageAdapter,
  DataConnectStorageError,
  PermanentPersistencePayloadError,
  type PersistenceAuth,
  type PersistenceAuthUser,
} from './dataConnectStorageAdapter';

const SHA256_KEY = /^[0-9a-f]{64}$/i;

const story = {
  id: 'story/one',
  title: 'The First Story',
  coverAssetId: 'asset-cover-1',
} as StoryWorld;

const chapter = {
  storyId: story.id,
  chapterNumber: 3,
  generatedContent: 'The chapter body.',
  syncRevision: 'chapter-revision',
} satisfies ChapterContent;

const glossaryTerm: LoreGlossary = {
  id: 'term/one',
  novel_id: story.id,
  source_text: 'Moon blade',
  target_text: 'Lunar edge',
  target_lang: 'en',
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorCode(error: unknown): string | undefined {
  return error instanceof DataConnectStorageError ? error.code : undefined;
}

describe('DataConnectStorageAdapter', () => {
  let currentUser: PersistenceAuthUser;
  let auth: { currentUser: PersistenceAuthUser | null };
  let fetchMock: ReturnType<typeof vi.fn>;
  let adapter: DataConnectStorageAdapter;

  beforeEach(() => {
    currentUser = {
      uid: 'account-a',
      getIdToken: vi.fn().mockResolvedValue('firebase-id-token'),
    };
    auth = { currentUser };
    fetchMock = vi.fn();
    adapter = new DataConnectStorageAdapter({
      auth: auth as PersistenceAuth,
      fetch: fetchMock as typeof fetch,
      baseUrl: '/api/persistence/',
    });
  });

  it('lists stories with a Firebase ID token and validates the response envelope', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ stories: [story] }));

    await expect(adapter.getStories()).resolves.toEqual([story]);

    expect(currentUser.getIdToken).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(url).toBe('/api/persistence/stories');
    expect(init.method).toBeUndefined();
    expect(headers.get('Authorization')).toBe('Bearer firebase-id-token');
    expect(headers.get('Accept')).toBe('application/json');
    expect(headers.has('Idempotency-Key')).toBe(false);
  });

  it('sends full CAS expectations with retry-stable, payload-specific idempotency keys', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ story }))
      .mockResolvedValueOnce(jsonResponse({ story }))
      .mockResolvedValueOnce(jsonResponse({ story }))
      .mockResolvedValueOnce(jsonResponse({ story }));
    const expected = {
      exists: true,
      updatedAt: '2026-07-22T10:00:00.000Z',
      syncRevision: 'story-revision',
    };

    await adapter.saveStory(story);
    await adapter.saveStoryIfUnchanged(story, expected);
    await adapter.saveStoryIfUnchanged(story, expected);
    await adapter.saveStoryIfUnchanged(story, {
      ...expected,
      syncRevision: 'newer-story-revision',
    });

    const [firstUrl, firstInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const [secondUrl, secondInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(firstUrl).toBe('/api/persistence/stories/story%2Fone');
    expect(secondUrl).toBe(firstUrl);
    expect(firstInit.method).toBe('PUT');
    expect(JSON.parse(firstInit.body as string)).toEqual({ story });
    expect(JSON.parse(secondInit.body as string)).toEqual({ story, expected });

    for (const call of fetchMock.mock.calls) {
      const init = call[1] as RequestInit;
      const headers = new Headers(init.headers);
      expect(headers.get('Content-Type')).toBe('application/json');
      expect(headers.get('Idempotency-Key')).toMatch(SHA256_KEY);
    }
    const keys = fetchMock.mock.calls.map((call) =>
      new Headers((call[1] as RequestInit).headers).get('Idempotency-Key'),
    );
    expect(keys[0]).not.toBe(keys[1]);
    expect(keys[1]).toBe(keys[2]);
    expect(keys[2]).not.toBe(keys[3]);
  });

  it('maps a stale conditional write to sync/revision-changed', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: 'The story changed on another device.' }, 409),
    );

    await expect(
      adapter.saveStoryIfUnchanged(story, {
        exists: false,
        updatedAt: null,
        syncRevision: null,
      }),
    ).rejects.toMatchObject({
      code: 'sync/revision-changed',
      status: 409,
      message: 'The story changed on another device.',
    });
  });

  it('uses the chapter endpoint for reads and conditional writes', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ content: chapter }))
      .mockResolvedValueOnce(jsonResponse({ content: chapter }));

    await expect(adapter.getChapterContent(story.id, 3)).resolves.toEqual(chapter);
    await adapter.saveChapterContentIfUnchanged(chapter, {
      exists: true,
      updatedAt: null,
      syncRevision: 'chapter-revision',
    });

    expect(fetchMock.mock.calls[0][0]).toBe(
      '/api/persistence/stories/story%2Fone/chapters/3',
    );
    const [writeUrl, writeInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(writeUrl).toBe('/api/persistence/stories/story%2Fone/chapters/3');
    expect(writeInit.method).toBe('PUT');
    expect(JSON.parse(writeInit.body as string)).toEqual({
      content: chapter,
      expected: {
        exists: true,
        updatedAt: null,
        syncRevision: 'chapter-revision',
      },
    });
    expect(new Headers(writeInit.headers).get('Idempotency-Key')).toMatch(SHA256_KEY);
  });

  it('implements glossary list, single-save, batch-save, and delete routes', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ terms: [glossaryTerm] }))
      .mockResolvedValueOnce(jsonResponse({ terms: [glossaryTerm] }))
      .mockResolvedValueOnce(jsonResponse({ terms: [glossaryTerm] }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(adapter.getLoreGlossary(story.id)).resolves.toEqual([glossaryTerm]);
    await adapter.saveLoreGlossaryTerm(glossaryTerm);
    await adapter.saveLoreGlossaryTerms(story.id, [glossaryTerm]);
    await adapter.deleteLoreGlossaryTerm(glossaryTerm.id);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/persistence/stories/story%2Fone/glossary',
      '/api/persistence/stories/story%2Fone/glossary',
      '/api/persistence/stories/story%2Fone/glossary/batch',
      '/api/persistence/glossary/term%2Fone',
    ]);
    expect((fetchMock.mock.calls[1][1] as RequestInit).method).toBe('POST');
    expect(JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string)).toEqual({
      term: glossaryTerm,
    });
    expect(JSON.parse((fetchMock.mock.calls[2][1] as RequestInit).body as string)).toEqual({
      terms: [glossaryTerm],
    });
    expect((fetchMock.mock.calls[3][1] as RequestInit).method).toBe('DELETE');

    for (const call of fetchMock.mock.calls.slice(1)) {
      expect(new Headers((call[1] as RequestInit).headers).get('Idempotency-Key')).toMatch(
        SHA256_KEY,
      );
    }
  });

  it('rejects an account change while obtaining the token before sending a request', async () => {
    const accountB: PersistenceAuthUser = {
      uid: 'account-b',
      getIdToken: vi.fn().mockResolvedValue('account-b-token'),
    };
    currentUser.getIdToken = vi.fn().mockImplementation(async () => {
      auth.currentUser = accountB;
      return 'stale-account-a-token';
    });

    await expect(adapter.getStories()).rejects.toSatisfy(
      (error: unknown) => errorCode(error) === 'auth/account-changed',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('discards a response if the signed-in account changes during the request', async () => {
    const accountB: PersistenceAuthUser = {
      uid: 'account-b',
      getIdToken: vi.fn().mockResolvedValue('account-b-token'),
    };
    fetchMock.mockImplementation(async () => {
      auth.currentUser = accountB;
      return jsonResponse({ stories: [story] });
    });

    await expect(adapter.getStories()).rejects.toSatisfy(
      (error: unknown) => errorCode(error) === 'auth/account-changed',
    );
  });

  it('does not call persistence routes while signed out', async () => {
    auth.currentUser = null;

    await expect(adapter.getStories()).rejects.toMatchObject({ code: 'auth/unauthenticated' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects invalid response shapes rather than accepting another account payload', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ stories: { id: 'not-an-array' } }));

    await expect(adapter.getStories()).rejects.toMatchObject({
      code: 'persistence/invalid-response',
    });
  });
});

describe('assertPermanentPersistencePayload', () => {
  it('allows durable asset identifiers and ordinary curated R2 URLs', () => {
    expect(() =>
      assertPermanentPersistencePayload({
        coverAssetId: 'asset-123',
        audioAssetId: 'catalog-wind-1',
        curatedAudioUrl: 'https://audio.seihouse.org/catalog/wind-1.mp3',
      }),
    ).not.toThrow();
  });

  it.each([
    ['data URL', { imageUrl: 'data:image/png;base64,AAEC' }],
    ['blob URL', { imageUrl: 'blob:https://example.com/preview-id' }],
    [
      'short raw image base64',
      {
        imageUrl:
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      },
    ],
    ['binary value', { image: new Uint8Array([1, 2, 3]) }],
    [
      'known provider URL',
      { imageUrl: 'https://image.pollinations.ai/prompt/castle?width=1024' },
    ],
    [
      'signed temporary URL',
      { imageUrl: 'https://media.example.com/render.webp?X-Amz-Signature=abc&Expires=123' },
    ],
  ])('rejects a permanent %s payload', (_label, payload) => {
    expect(() => assertPermanentPersistencePayload(payload)).toThrow(
      PermanentPersistencePayloadError,
    );
  });

  it('blocks rejected media before an HTTP mutation is sent', async () => {
    const fetchMock = vi.fn();
    const adapter = new DataConnectStorageAdapter({
      auth: {
        currentUser: {
          uid: 'account-a',
          getIdToken: vi.fn().mockResolvedValue('token'),
        },
      },
      fetch: fetchMock as typeof fetch,
    });

    await expect(
      adapter.saveStory({
        ...story,
        coverAssetId: undefined,
        imageUrl: 'blob:https://example.com/preview',
      }),
    ).rejects.toBeInstanceOf(PermanentPersistencePayloadError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('strips R2 delivery URLs only when their matching canonical asset IDs exist', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ story }));
    const adapter = new DataConnectStorageAdapter({
      auth: {
        currentUser: {
          uid: 'account-a',
          getIdToken: vi.fn().mockResolvedValue('token'),
        },
      },
      fetch: fetchMock as typeof fetch,
    });
    const signedUrl = 'https://private-r2.example.com/file.webp?X-Amz-Signature=abc';
    const storyWithReadyAssets = {
      ...story,
      imageUrl: signedUrl,
      coverAssetId: 'cover-asset',
      imageHistory: [{ assetId: 'cover-history-asset', imageUrl: signedUrl }],
      memory: {
        characters: [
          {
            id: 'character-1',
            imageAssetId: 'character-asset',
            imageUrl: signedUrl,
            voiceAssetId: 'voice-asset',
            voiceClipUrl: signedUrl,
            imageHistory: [{ assetId: 'character-history-asset', imageUrl: signedUrl }],
          },
        ],
      },
      arcs: [
        {
          chapters: [
            {
              number: 1,
              heroImageAssetId: 'hero-asset',
              assetManifest: { heroImage: signedUrl, atmosphere: 'rain' },
            },
          ],
        },
      ],
    } as unknown as StoryWorld;

    await adapter.saveStory(storyWithReadyAssets);

    const requestBody = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    ) as { story: Record<string, any> };
    expect(requestBody.story.imageUrl).toBeUndefined();
    expect(requestBody.story.coverAssetId).toBe('cover-asset');
    expect(requestBody.story.imageHistory[0]).toEqual({ assetId: 'cover-history-asset' });
    expect(requestBody.story.memory.characters[0].imageUrl).toBeUndefined();
    expect(requestBody.story.memory.characters[0].voiceClipUrl).toBeUndefined();
    expect(requestBody.story.memory.characters[0].imageHistory[0].imageUrl).toBeUndefined();
    expect(requestBody.story.arcs[0].chapters[0].assetManifest).toEqual({
      atmosphere: 'rain',
    });
    expect(JSON.stringify(requestBody)).not.toContain(signedUrl);
    expect(storyWithReadyAssets.imageUrl).toBe(signedUrl);
  });
});
