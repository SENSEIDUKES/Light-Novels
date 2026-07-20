import { describe, expect, it } from 'vitest';
import { isManifestationEligible } from './manifestationEligibility';

describe('isManifestationEligible', () => {
  it('rejects incidental named props and one-scene locations', () => {
    expect(isManifestationEligible({
      manifestationImportance: { narrativeWeight: 'minor', namedStatus: true, ownership: true },
    }, 'artifact')).toBe(false);
    expect(isManifestationEligible({
      manifestationImportance: { narrativeWeight: 'supporting', namedStatus: true, recurrence: true },
    }, 'location')).toBe(false);
  });

  it('admits only strong, durable story entities', () => {
    expect(isManifestationEligible({
      manifestationImportance: {
        narrativeWeight: 'major', namedStatus: true, recurrence: true,
        plotRelevance: true, futureRelevance: true,
      },
    }, 'character')).toBe(true);
  });

  it('keeps an already manifested entry visible regardless of legacy metadata', () => {
    expect(isManifestationEligible({ imageUrl: 'https://example.com/existing.png' }, 'artifact')).toBe(true);
  });
});
