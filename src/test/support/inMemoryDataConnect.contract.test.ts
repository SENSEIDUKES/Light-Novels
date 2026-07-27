import { describe, expect, it } from 'vitest';
import { InMemoryDataConnect } from './inMemoryDataConnect';

describe('InMemoryDataConnect production-contract guards', () => {
  it('rejects conflicting idempotency-key reuse before applying a second mutation', async () => {
    const store = new InMemoryDataConnect();
    const original = {
      ownerUid: 'owner',
      storyId: 'story-1',
      expectedSyncRevision: null,
      newSyncRevision: 'revision-1',
      newRevision: '1',
      idempotencyKey: 'story-write-1',
      requestHash: 'hash-original',
      story: {
        id: 'story-1',
        ownerUid: 'owner',
        title: 'Original title',
        syncRevision: 'revision-1',
      },
    };

    await store.executeRetiredMutation('AdminUpsertStoryGraph', original);

    await expect(store.executeRetiredMutation('AdminUpsertStoryGraph', {
      ...original,
      requestHash: 'hash-conflict',
      story: { ...original.story, title: 'Conflicting title' },
    })).rejects.toThrow(/reused with a different operation or payload/i);

    expect(store.mutationLog).toEqual(['AdminUpsertStoryGraph']);
    expect(
      (store.getOwnedStoryGraph('owner', 'story-1').story as { title: string }).title,
    ).toBe('Original title');
  });

  it('requires an idempotency key before consuming image quota', () => {
    const store = new InMemoryDataConnect();

    expect(() => store.consumeImageQuota({
      ownerUid: 'owner',
      now: '2026-07-26T00:00:00.000Z',
      nextReset: '2026-07-27T00:00:00.000Z',
    })).toThrow(/requires an idempotency key/i);
  });

  it('rejects cross-account seed deletion', () => {
    const store = new InMemoryDataConnect();
    store.upsertStorySeedGraph({
      ownerUid: 'owner',
      seedId: 'seed-1',
      expectedSyncRevision: null,
      idempotencyKey: 'seed-create-1',
      requestHash: 'seed-hash',
      seed: { id: 'seed-1', ownerUid: 'owner', syncRevision: 'seed-revision-1' },
      fields: [],
      entities: [],
      entityAliases: [],
    });

    expect(
      () => store.deleteOwnedStorySeed('intruder', 'seed-1', 'seed-delete-1'),
    ).toThrow(/owned by another account/i);
    expect(store.getOwnedStorySeedGraph('owner', 'seed-1').storySeed).toBeTruthy();
  });

  it('returns the media purpose attached to the asset', async () => {
    const store = new InMemoryDataConnect();
    store.attachMedia({
      assetId: 'cover-asset',
      ownerUid: 'owner',
      storyId: 'story-1',
      targetKind: 'STORY',
      targetKey: 'story-1',
      purpose: 'STORY_COVER',
      deliveryUrl: 'https://media.example/cover',
    });

    const descriptor = await store.loadMediaDescriptor('owner', 'cover-asset');
    expect(descriptor?.purpose).toBe('STORY_COVER');
  });
});
