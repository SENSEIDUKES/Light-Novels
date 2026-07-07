import { describe, it, expect } from 'vitest';
import { resolveEntity } from './entityResolver';

describe('resolveEntity', () => {
  const entities = [
    { id: '1', name: 'Lin Fan' },
    { id: '2', name: 'Ye Chen' },
    { id: '3', name: 'Su Chen' },
  ];

  it('resolves exact matches with 1.0 confidence', () => {
    const result = resolveEntity('Lin Fan', entities, 'test');
    expect(result.resolvedEntityId).toBe('1');
    expect(result.confidence).toBe(1.0);
    expect(result.rawName).toBe('Lin Fan');
    expect(result.updateType).toBe('test');
  });

  it('resolves exact matches case-insensitively', () => {
    const result = resolveEntity('lin fan', entities, 'test');
    expect(result.resolvedEntityId).toBe('1');
    expect(result.confidence).toBe(1.0);
  });

  it('resolves "contains" matches with 0.8 confidence', () => {
    const result = resolveEntity('Lin', entities, 'test');
    expect(result.resolvedEntityId).toBe('1');
    expect(result.confidence).toBe(0.8);
  });

  it('resolves "is contained in" matches with 0.8 confidence', () => {
    const result = resolveEntity('Lin Fan the Great', [{ id: '1', name: 'Lin Fan' }], 'test');
    expect(result.resolvedEntityId).toBe('1');
    expect(result.confidence).toBe(0.8);
  });

  it('resolves fuzzy matches using Levenshtein distance', () => {
    // 'Lin Fan' vs 'Lin Fon' -> distance 1, length 7
    // confidence = 1 - (1/7) = ~0.857
    const result = resolveEntity('Lin Fon', entities, 'test');
    expect(result.resolvedEntityId).toBe('1');
    expect(result.confidence).toBeCloseTo(0.857, 3);
  });

  it('returns null if best confidence is below 0.6', () => {
    // 'Lin Fan' vs 'Xyz' -> distance 7, length 7 -> confidence 0
    const result = resolveEntity('Xyz', entities, 'test');
    expect(result.resolvedEntityId).toBe(null);
    expect(result.confidence).toBeLessThan(0.6);
  });

  it('picks the highest confidence match among multiple candidates', () => {
    const manyEntities = [
      { id: '1', name: 'Su Chen' },
      { id: '2', name: 'Ye Chen' },
    ];
    // 'Chen' is contained in both, but let's test something closer to one
    // 'Ye Chon' vs 'Ye Chen' (dist 1/7 -> ~0.857)
    // 'Ye Chon' vs 'Su Chen' (dist 4/7? S-u-C-h vs Y-e-C-h ... actually longer)
    const result = resolveEntity('Ye Chon', manyEntities, 'test');
    expect(result.resolvedEntityId).toBe('2');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('handles entities without names', () => {
    const badEntities = [
      { id: '1' },
      { id: '2', name: 'Lin Fan' }
    ];
    const result = resolveEntity('Lin Fan', badEntities, 'test');
    expect(result.resolvedEntityId).toBe('2');
    expect(result.confidence).toBe(1.0);
  });

  it('handles empty entity list', () => {
    const result = resolveEntity('Lin Fan', [], 'test');
    expect(result.resolvedEntityId).toBe(null);
    expect(result.confidence).toBe(0);
  });
});
