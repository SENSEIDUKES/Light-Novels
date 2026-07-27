import { describe, expect, it } from 'vitest';
import type { GeneratedImage } from '../../types';
import { resolveEntityImageHistory } from './entityImageHistory';

function image(overrides: Partial<GeneratedImage> = {}): GeneratedImage {
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
  it('returns the owner history and deduplicates immutable assets', () => {
    const retained = image({ id: 'hist-1', assetId: 'asset-1' });
    const entity = {
      id: 'char-1',
      imageHistory: [
        retained,
        { ...retained, id: 'duplicate-history-row', imageUrl: 'https://media.example/re-signed.png' },
      ],
    };

    const resolved = resolveEntityImageHistory(entity);

    expect(resolved).toEqual([retained]);
  });

  it('does not read the former combined story history', () => {
    const entity = { id: 'char-1', imageHistory: [image({ id: 'owned', assetId: 'owner-asset' })] };
    const formerStoryHistory = [
      image({ id: 'legacy-character', assetId: 'legacy-asset' }),
      image({ id: 'cover', assetId: 'cover-asset', entityId: 'story-1', entityType: 'cover' }),
    ];

    // The resolver has no story-history input: callers must first migrate any
    // legacy combined records to their real entity owner.
    const resolved = resolveEntityImageHistory(entity);

    expect(resolved).toEqual(entity.imageHistory);
    expect(resolved.map(entry => entry.assetId)).not.toContain(formerStoryHistory[0].assetId);
  });

  it('handles an entity that has never been manifested', () => {
    expect(resolveEntityImageHistory({ id: 'char-9' })).toEqual([]);
  });
});
