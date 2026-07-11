import { describe, expect, it } from 'vitest';
import { getDialectLabel, resolveDialect } from './dialect';

describe('resolveDialect', () => {
  it.each([
    [undefined, 'xianxia'],
    ['System apocalypse LitRPG', 'litrpg'],
    ['Academy romance drama', 'modern_romance'],
    ['Grim vampire tale', 'dark_fantasy'],
    ['Kingdom war chronicle', 'military'],
    ['Xuanhuan cultivation journey', 'xianxia'],
    ['Cozy mystery', 'plain'],
  ] as const)('maps %s to %s', (genrePath, expected) => {
    expect(resolveDialect(genrePath)).toBe(expected);
  });

  it('uses genre labels when present and plain-language labels when a key is unknown', () => {
    expect(getDialectLabel('alter_fate', 'Military war story')).toBe('Operation');
    expect(getDialectLabel('relationship_map', 'Cozy mystery')).toBe('Relationship Map');
    expect(getDialectLabel('unknown_key', 'Xianxia')).toBe('unknown_key');
  });
});
