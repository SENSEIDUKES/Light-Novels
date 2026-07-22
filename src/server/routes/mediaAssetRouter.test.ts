// @vitest-environment node

import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MediaAssetDescriptor } from '../../contracts/mediaAssets';
import { logger } from '../logger';
import {
  createMediaAssetRouter,
  type MediaAssetRouteDependencies,
  type MediaAssetRouteService,
} from './mediaAssetRouter';

const ASSET_ID = '11111111-1111-4111-8111-111111111111';
const READY_ASSET: MediaAssetDescriptor = {
  id: ASSET_ID,
  assetType: 'IMAGE',
  purpose: 'cover',
  visibility: 'PRIVATE',
  status: 'READY',
  mimeType: 'image/png',
  byteSize: '8',
  checksumSha256: 'a'.repeat(64),
  version: 1,
  deliveryUrl: 'https://signed.example.test/media',
  createdAt: '2026-07-21T12:00:00.000Z',
  readyAt: '2026-07-21T12:00:01.000Z',
};

describe('foundation media asset routes', () => {
  let server: Server;
  let baseUrl: string;
  let service: MediaAssetRouteService;
  let dependencies: MediaAssetRouteDependencies;

  beforeEach(async () => {
    service = {
      save: vi.fn(async () => READY_ASSET),
      get: vi.fn(async () => READY_ASSET),
      delete: vi.fn(async () => undefined),
    };
    dependencies = {
      verifyIdToken: vi.fn(async () => ({ uid: 'owner-a', email: 'owner-a@example.test', name: 'Owner A' })),
      getService: vi.fn(async () => service),
    };
    const app = express();
    app.use(createMediaAssetRouter(dependencies));
    server = await new Promise<Server>((resolve) => {
      const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
    });
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  });

  it('rejects requests without a Firebase bearer token before resolving the service', async () => {
    const response = await fetch(`${baseUrl}/api/foundation/media-assets/${ASSET_ID}`);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: {
        code: 'unauthenticated',
        message: 'A Firebase ID token is required.',
      },
    });
    expect(dependencies.verifyIdToken).not.toHaveBeenCalled();
    expect(dependencies.getService).not.toHaveBeenCalled();
  });

  it('authenticates before attempting to parse a JSON request body', async () => {
    const response = await fetch(`${baseUrl}/api/foundation/media-assets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"malformed":',
    });

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe('unauthenticated');
    expect(dependencies.verifyIdToken).not.toHaveBeenCalled();
    expect(dependencies.getService).not.toHaveBeenCalled();
  });

  it('sanitizes malformed authenticated JSON without logging its raw media body', async () => {
    const logError = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const response = await fetch(`${baseUrl}/api/foundation/media-assets`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-token',
        'content-type': 'application/json',
      },
      body: '{"source":"data:image/png;base64,DO_NOT_LOG_THIS_SENTINEL"',
    });

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('invalid_json');
    expect(logError).not.toHaveBeenCalled();
    expect(dependencies.getService).not.toHaveBeenCalled();
    logError.mockRestore();
  });

  it('rejects an invalid or revoked Firebase token', async () => {
    vi.mocked(dependencies.verifyIdToken).mockRejectedValueOnce(new Error('revoked'));

    const response = await fetch(`${baseUrl}/api/foundation/media-assets/${ASSET_ID}`, {
      headers: { authorization: 'Bearer invalid-token' },
    });

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe('invalid_token');
    expect(dependencies.getService).not.toHaveBeenCalled();
  });

  it('derives the owner exclusively from the verified token for JSON media sources', async () => {
    const response = await fetch(`${baseUrl}/api/foundation/media-assets`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        assetType: 'IMAGE',
        purpose: 'cover',
        association: { targetKind: 'PROFILE', targetKey: 'owner-a' },
        source: { kind: 'data-url', dataUrl: 'data:image/png;base64,iVBORw0KGgo=' },
      }),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ asset: READY_ASSET });
    expect(service.save).toHaveBeenCalledWith(
      {
        uid: 'owner-a',
        email: 'owner-a@example.test',
        displayName: 'Owner A',
      },
      expect.objectContaining({
        assetType: 'IMAGE',
        purpose: 'cover',
        association: expect.objectContaining({ purpose: 'cover', targetKey: 'owner-a' }),
      }),
    );
  });

  it('rejects owner injection and unknown JSON fields', async () => {
    const response = await fetch(`${baseUrl}/api/foundation/media-assets`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        ownerUid: 'attacker-controlled',
        assetType: 'IMAGE',
        purpose: 'cover',
        association: { targetKind: 'PROFILE', targetKey: 'owner-a' },
        source: { kind: 'remote-url', url: 'https://provider.example.test/image.png' },
      }),
    });

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('invalid_request');
    expect(service.save).not.toHaveBeenCalled();
  });

  it('accepts raw bytes through the isolated upload endpoint', async () => {
    const query = new URLSearchParams({
      assetType: 'IMAGE',
      purpose: 'cover',
      targetKind: 'PROFILE',
      targetKey: 'owner-a',
      filename: 'cover.png',
    });
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

    const response = await fetch(`${baseUrl}/api/foundation/media-assets/upload?${query}`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-token',
        'content-type': 'image/png',
      },
      body: bytes,
    });

    expect(response.status).toBe(201);
    const request = vi.mocked(service.save).mock.calls[0][1];
    expect(request.source.kind).toBe('bytes');
    if (request.source.kind !== 'bytes') throw new Error('Expected byte source.');
    expect(Array.from(request.source.bytes)).toEqual(Array.from(bytes));
    expect(request.source.mimeType).toBe('image/png');
    expect(request.source.filename).toBe('cover.png');
  });

  it('preserves application/json exports as raw upload bytes', async () => {
    const query = new URLSearchParams({
      assetType: 'EXPORT',
      purpose: 'story-export',
      targetKind: 'PROFILE',
      targetKey: 'owner-a',
      filename: 'story.json',
    });
    const bytes = new TextEncoder().encode('{"story":"one"}');

    const response = await fetch(`${baseUrl}/api/foundation/media-assets/upload?${query}`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-token',
        'content-type': 'application/json',
      },
      body: bytes,
    });

    expect(response.status).toBe(201);
    const request = vi.mocked(service.save).mock.calls[0][1];
    expect(request.source.kind).toBe('bytes');
    if (request.source.kind !== 'bytes') throw new Error('Expected byte source.');
    expect(new TextDecoder().decode(request.source.bytes)).toBe('{"story":"one"}');
    expect(request.source.mimeType).toBe('application/json');
  });

  it('uses the verified uid for reads and deletes without exposing cross-owner records', async () => {
    vi.mocked(service.get).mockResolvedValueOnce(null);
    const missing = await fetch(`${baseUrl}/api/foundation/media-assets/${ASSET_ID}`, {
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(missing.status).toBe(404);
    expect(service.get).toHaveBeenCalledWith('owner-a', ASSET_ID);

    const deleted = await fetch(`${baseUrl}/api/foundation/media-assets/${ASSET_ID}`, {
      method: 'DELETE',
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(deleted.status).toBe(204);
    expect(service.delete).toHaveBeenCalledWith('owner-a', ASSET_ID);
  });

  it('maps association ownership failures to a non-leaking forbidden response', async () => {
    vi.mocked(service.save).mockRejectedValueOnce(new Error('Story media target is not owned by the authenticated user.'));

    const response = await fetch(`${baseUrl}/api/foundation/media-assets`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        assetType: 'IMAGE',
        purpose: 'cover',
        association: { targetKind: 'STORY', targetKey: ASSET_ID, storyId: ASSET_ID },
        source: { kind: 'remote-url', url: 'https://provider.example.test/image.png' },
      }),
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: {
        code: 'forbidden',
        message: 'The authenticated user does not own the requested media target.',
      },
    });
  });
});
