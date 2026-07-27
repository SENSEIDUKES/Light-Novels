import { describe, it, expect } from 'vitest';
import { resolveEntityImageHistory } from './entityImageHistory';
import type { GeneratedImage } from '../../types';

function image(overrides: Partial<GeneratedImage>): GeneratedImage {
  return {
    id: 'hist-1',
    entityId: 'char-1',
    entityType: 'character',
    imageUrl: 'https://media.example/one.png',
    promptUsed: 'A frost-robed sect elder.',
    createdAt: '2026-07-20T00:00:00.000Z',
    isCurrent: true,
    ...overrides,
  };
}

describe('resolveEntityImageHistory', () => {
  it('returns the entity history the cloud persists, not the cover-only story history', () => {
    const entity = {
      id: 'char-1',
      imageHistory: [image({ id: 'hist-1', assetId: 'asset-1' })],
    };
    // What PostgreSQL actually hands back: story history holds covers alone.
    const storyHistory = [
      image({ id: 'hist-cover', assetId: 'asset-cover', entityId: 'story-1', entityType: 'cover' }),
    ];

    expect(resolveEntityImageHistory(entity, storyHistory)).toEqual(entity.imageHistory);
  });

  it('includes a manifestation the browser appended before the next sync pass', () => {
    const entity = { id: 'char-1', imageHistory: [image({ id: 'hist-1', assetId: 'asset-1' })] };
    const storyHistory = [
      image({ id: 'hist-2', assetId: 'asset-2', isCurrent: true }),
      image({ id: 'hist-cover', assetId: 'asset-cover', entityId: 'story-1', entityType: 'cover' }),
    ];

    const resolved = resolveEntityImageHistory(entity, storyHistory);

    expect(resolved.map(entry => entry.assetId)).toEqual(['asset-1', 'asset-2']);
  });

  it('counts an asset once when both sources still carry it', () => {
    const shared = image({ id: 'hist-1', assetId: 'asset-1' });
    const entity = { id: 'char-1', imageHistory: [shared] };

    // The delivery URL differs between the two copies; the asset id must win.
    const resolved = resolveEntityImageHistory(entity, [
      { ...shared, imageUrl: 'https://media.example/re-signed.png' },
    ]);

    expect(resolved).toHaveLength(1);
    expect(resolved[0].imageUrl).toBe('https://media.example/one.png');
  });

  it('handles an entity that has never been manifested', () => {
    expect(resolveEntityImageHistory({ id: 'char-9' }, undefined)).toEqual([]);
  });
});
