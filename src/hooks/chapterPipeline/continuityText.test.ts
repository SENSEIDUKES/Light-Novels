import { describe, expect, it } from 'vitest';
import { extractProseForContinuity, findSurfaceProseLeaks } from './continuityText';

describe('extractProseForContinuity', () => {
  it('keeps only block prose and strips image/codex metadata', () => {
    const raw = JSON.stringify([
      { id: 'b1', type: 'narration', text: 'The hall was silent.' },
      { id: 'b2', type: 'worldcard', text: 'Zhu Feng appeared.', worldCard: { entityName: 'Zhu Feng', imageUrl: 'data:image/png;base64,AAAA', codexEntryId: 'char-5slteiy7f' } },
    ]);
    const prose = extractProseForContinuity(raw);
    expect(prose).toContain('The hall was silent.');
    expect(prose).toContain('Zhu Feng appeared.');
    expect(prose).not.toContain('base64');
    expect(prose).not.toContain('char-5slteiy7f');
    expect(prose).not.toContain('imageUrl');
  });

  it('falls back to raw text when no parseable blocks exist', () => {
    const raw = 'Just some plain prose with no JSON blocks.';
    expect(extractProseForContinuity(raw)).toBe(raw);
  });
});

describe('findSurfaceProseLeaks', () => {
  it('finds the mechanic-style denylist phrases case-insensitively', () => {
    expect(findSurfaceProseLeaks('A Death Flag Detected after their slow burn became enemies to lovers.')).toEqual([
      'enemies to lovers',
      'slow burn',
      'death flag detected',
    ]);
  });

  it('does not mistake natural mythic language or larger words for control leaks', () => {
    expect(findSurfaceProseLeaks('Fate and destiny weighed on her at midnight, but karma offered no answer.')).toEqual([]);
  });

  it('only scans block text, never system or metadata fields', () => {
    const raw = JSON.stringify([
      {
        id: 'p1',
        type: 'paragraph',
        text: 'The bell tolled over the mountain.',
        metadata: { directorNote: 'slow burn', storyTag: 'fate survival' },
        system: { title: 'Death Flag Detected' },
      },
    ]);
    expect(findSurfaceProseLeaks(extractProseForContinuity(raw))).toEqual([]);
  });
});
