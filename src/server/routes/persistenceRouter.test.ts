// @vitest-environment node
import { createServer, type Server } from 'node:http';
import express from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StoryWorld } from '../../types';
import type { ApplicationPersistenceRepository } from '../persistence/applicationPersistenceRepository';
import { createPersistenceRouter } from './persistenceRouter';

const ownerUid = 'reader-a';
const story = {
  id: '770b6a28-d1ed-4d4d-926a-86e592ef656d',
  persistenceId: '770b6a28-d1ed-4d4d-926a-86e592ef656d',
  userId: ownerUid,
  title: 'The SQL Chronicle',
  genre: 'Xianxia',
  mcName: 'Lin',
  customPremise: 'A normalized realm.',
  createdAt: '2026-07-22T10:00:00.000Z',
  updatedAt: '2026-07-22T10:00:00.000Z',
  currentChapterNumber: 1,
  memory: {
    powerSystem: 'Qi',
    currentPowerStage: 'Mortal',
    worldRules: [],
    characters: [],
    unresolvedPlotThreads: [],
    resolvedPlotThreads: [],
  },
  arcs: [],
} satisfies StoryWorld;

describe('persistenceRouter', () => {
  let server: Server;
  let baseUrl: string;
  let repository: ApplicationPersistenceRepository;

  beforeEach(async () => {
    repository = {
      listStories: vi.fn().mockResolvedValue([story]),
      getStory: vi.fn().mockResolvedValue(story),
      saveStory: vi.fn().mockResolvedValue(story),
    } as unknown as ApplicationPersistenceRepository;
    const app = express();
    app.use(createPersistenceRouter({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: ownerUid }),
      getRepository: () => repository,
    }));
    server = createServer(app);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server did not bind.');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
  });

  it('requires a verified Firebase ID token', async () => {
    const response = await fetch(`${baseUrl}/api/persistence/stories`);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'unauthenticated' },
    });
    expect(repository.listStories).not.toHaveBeenCalled();
  });

  it('lists only through the authenticated owner repository scope', async () => {
    const response = await fetch(`${baseUrl}/api/persistence/stories`, {
      headers: { Authorization: 'Bearer valid-token' },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ stories: [story] });
    expect(repository.listStories).toHaveBeenCalledWith(ownerUid);
  });

  it('passes the complete CAS expectation and stable idempotency key', async () => {
    const expected = {
      exists: true,
      updatedAt: story.updatedAt,
      syncRevision: 'remote-revision',
    };
    const response = await fetch(`${baseUrl}/api/persistence/stories/${story.id}`, {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer valid-token',
        'Content-Type': 'application/json',
        'Idempotency-Key': 'stable-story-save-key',
      },
      body: JSON.stringify({ story, expected }),
    });
    expect(response.status).toBe(200);
    expect(repository.saveStory).toHaveBeenCalledWith(ownerUid, story, {
      idempotencyKey: 'stable-story-save-key',
      expected,
    });
  });

  it('rejects a payload that names a different owner before repository access', async () => {
    const response = await fetch(`${baseUrl}/api/persistence/stories/${story.id}`, {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer valid-token',
        'Content-Type': 'application/json',
        'Idempotency-Key': 'stable-owner-check-key',
      },
      body: JSON.stringify({ story: { ...story, userId: 'reader-b' } }),
    });
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'forbidden' } });
    expect(repository.saveStory).not.toHaveBeenCalled();
  });

  it('maps optimistic concurrency failures to HTTP 409', async () => {
    const conflict = Object.assign(new Error('changed'), { code: 'sync/revision-changed' });
    vi.mocked(repository.saveStory).mockRejectedValue(conflict);
    const response = await fetch(`${baseUrl}/api/persistence/stories/${story.id}`, {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer valid-token',
        'Content-Type': 'application/json',
        'Idempotency-Key': 'stable-conflict-key',
      },
      body: JSON.stringify({ story }),
    });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'revision_conflict' },
    });
  });
});
