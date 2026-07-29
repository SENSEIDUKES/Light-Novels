import { afterEach, describe, expect, it, vi } from 'vitest';

const authMock = vi.hoisted(() => ({
  currentUser: {
    uid: 'owner-a',
    getIdToken: vi.fn(async () => 'token-owner-a'),
  } as any,
}));

vi.mock('../firebase', () => ({
  auth: authMock,
}));

import type { MediaAssetDescriptor } from '../../contracts/mediaAssets';
import {
  deleteMediaAsset,
  getMediaAsset,
  MediaAssetClientError,
  requirePersistenceUuid,
  saveMediaAsset,
  selectMediaAsset,
} from './mediaAssetClient';

const COMPACT_ASSET_ID = 'fc0aac17fb014f7ea9bce3121204125d';
const CANONICAL_ASSET_ID = 'fc0aac17-fb01-4f7e-a9bc-e3121204125d';

function descriptor(id = COMPACT_ASSET_ID): MediaAssetDescriptor {
  return {
    id,
    assetType: 'IMAGE',
    purpose: 'STORY_COVER',
    visibility: 'PRIVATE',
    status: 'READY',
    mimeType: 'image/png',
    byteSize: '12',
    checksumSha256: 'a'.repeat(64),
    version: 1,
    deliveryUrl: 'https://delivery.example/cover',
    createdAt: '2026-07-29T00:00:00.000Z',
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  authMock.currentUser = {
    uid: 'owner-a',
    getIdToken: vi.fn(async () => 'token-owner-a'),
  };
});

describe('mediaAssetClient canonical identity', () => {
  it('accepts compact PostgreSQL UUIDs as canonical persistence identities', () => {
    expect(requirePersistenceUuid(COMPACT_ASSET_ID, 'Media target')).toBe(
      CANONICAL_ASSET_ID,
    );
  });

  it('uses a canonical asset route and canonicalizes the returned descriptor', async () => {
    const fetchMock = vi.fn(async (
      _input: RequestInfo | URL,
      _init?: RequestInit,
    ) => new Response(
      JSON.stringify({ asset: descriptor() }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getMediaAsset(COMPACT_ASSET_ID)).resolves.toMatchObject({
      id: CANONICAL_ASSET_ID,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/foundation/media-assets/${CANONICAL_ASSET_ID}`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token-owner-a' }),
      }),
    );
  });

  it('never mistakes a hexadecimal Firebase account uid for a PostgreSQL UUID', async () => {
    const hexadecimalUid = '0123456789abcdef0123456789abcdef';
    authMock.currentUser = {
      uid: hexadecimalUid,
      getIdToken: vi.fn(async () => 'token-hex-owner'),
    };
    const fetchMock = vi.fn(async (
      _input: RequestInfo | URL,
      _init?: RequestInit,
    ) => new Response(
      JSON.stringify({ asset: descriptor() }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    ));
    vi.stubGlobal('fetch', fetchMock);

    await saveMediaAsset({
      source: 'data:image/png;base64,aW1hZ2U=',
      assetType: 'IMAGE',
      purpose: 'CELESTIAL_PORTRAIT',
      association: {
        targetKind: 'PORTRAIT',
        targetKey: hexadecimalUid,
      },
      expectedOwnerUid: hexadecimalUid,
      idempotencyKey: '30000000-0000-4000-8000-000000000009',
    });

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      association: { targetKey: hexadecimalUid },
    });
  });

  it('canonicalizes replacement and generation UUIDs before publishing media', async () => {
    const fetchMock = vi.fn(async (
      _input: RequestInfo | URL,
      _init?: RequestInit,
    ) => new Response(
      JSON.stringify({ asset: descriptor() }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    ));
    vi.stubGlobal('fetch', fetchMock);

    await saveMediaAsset({
      source: 'data:image/png;base64,aW1hZ2U=',
      assetType: 'IMAGE',
      purpose: 'STORY_COVER',
      association: {
        storyId: '7da538b775ce44f9bdf982e7f9e4d7ae',
        targetKind: 'STORY',
        targetKey: '7da538b775ce44f9bdf982e7f9e4d7ae',
      },
      generationJobId: 'dca40be10ee94acf91d67035516eb209',
      replacesAssetId: COMPACT_ASSET_ID,
      expectedOwnerUid: 'owner-a',
      idempotencyKey: '30000000-0000-4000-8000-000000000009',
    });

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      association: {
        storyId: '7da538b7-75ce-44f9-bdf9-82e7f9e4d7ae',
        targetKey: '7da538b7-75ce-44f9-bdf9-82e7f9e4d7ae',
      },
      generationJobId: 'dca40be1-0ee9-4acf-91d6-7035516eb209',
      replacesAssetId: CANONICAL_ASSET_ID,
    });
  });

  it('selects and deletes by the same canonical identity', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
      init?.method === 'DELETE'
        ? new Response(null, { status: 204 })
        : new Response(
          JSON.stringify({ asset: descriptor() }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ));
    vi.stubGlobal('fetch', fetchMock);

    await expect(selectMediaAsset(COMPACT_ASSET_ID, {
      storyId: '7da538b775ce44f9bdf982e7f9e4d7ae',
      targetKind: 'STORY',
      targetKey: '7da538b775ce44f9bdf982e7f9e4d7ae',
      purpose: 'STORY_COVER',
    })).resolves.toMatchObject({ id: CANONICAL_ASSET_ID });
    await deleteMediaAsset(COMPACT_ASSET_ID);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `/api/foundation/media-assets/${CANONICAL_ASSET_ID}/select`,
      `/api/foundation/media-assets/${CANONICAL_ASSET_ID}`,
    ]);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      association: {
        storyId: '7da538b7-75ce-44f9-bdf9-82e7f9e4d7ae',
        targetKey: '7da538b7-75ce-44f9-bdf9-82e7f9e4d7ae',
      },
    });
  });

  it.each([
    ['media_upload_failed', 502, 'R2 upload failed'],
    ['invalid_association', 409, 'Association target is not owned'],
    ['database_commit_failed', 503, 'PostgreSQL commit failed'],
    ['media_delivery_failed', 502, 'Signed delivery URL could not be resolved'],
  ])('preserves the distinct %s failure from the permanent-media boundary', async (
    code,
    status,
    message,
  ) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ error: { code, message, details: { recoverable: status >= 500 } } }),
      { status, headers: { 'Content-Type': 'application/json' } },
    )));

    const failure = getMediaAsset(COMPACT_ASSET_ID);

    await expect(failure).rejects.toMatchObject({
      name: 'MediaAssetClientError',
      code,
      status,
      message,
      recoverable: status >= 500,
    } satisfies Partial<MediaAssetClientError>);
  });

  it('rejects a response that finishes after the expected account changes', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => {
        authMock.currentUser = {
          uid: 'owner-b',
          getIdToken: vi.fn(async () => 'token-owner-b'),
        };
        return { asset: descriptor() };
      },
    } as Response)));

    await expect(getMediaAsset(COMPACT_ASSET_ID, 'owner-a')).rejects.toMatchObject({
      name: 'MediaAssetClientError',
      code: 'auth/account-changed',
      recoverable: false,
    });
  });

  it('guards history selection against an account change in flight', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      authMock.currentUser = {
        uid: 'owner-b',
        getIdToken: vi.fn(async () => 'token-owner-b'),
      };
      return new Response(
        JSON.stringify({ asset: descriptor() }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }));

    await expect(selectMediaAsset(COMPACT_ASSET_ID, {
      storyId: '7da538b7-75ce-44f9-bdf9-82e7f9e4d7ae',
      targetKind: 'STORY',
      targetKey: '7da538b7-75ce-44f9-bdf9-82e7f9e4d7ae',
      purpose: 'STORY_COVER',
    }, 'owner-a')).rejects.toMatchObject({
      name: 'MediaAssetClientError',
      code: 'auth/account-changed',
      recoverable: false,
    });
  });
});
