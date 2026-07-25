// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isUnmeteredApiPath } from './httpMiddleware';

describe('API rate limiter scope', () => {
  // The replica fires hundreds of persistence and media requests during one
  // reading session. Counting them against the shared per-IP budget exhausted
  // it during normal use, and then the expensive user-initiated work the budget
  // exists to protect started failing: generating a portrait returned 429
  // because syncing had already spent the allowance.
  it('does not meter ordinary replica sync traffic', () => {
    for (const path of [
      '/api/persistence/stories',
      '/api/persistence/stories/abc/chapters/3',
      '/api/persistence/profile',
      '/api/foundation/media-assets',
      '/api/foundation/media-assets/upload?assetType=IMAGE',
    ]) {
      expect(isUnmeteredApiPath(path)).toBe(true);
    }
  });

  it('still meters the model-backed endpoints', () => {
    for (const path of [
      '/api/generate-cultivator-portrait',
      '/api/generate-card-image',
      '/api/generate-chapter',
      '/api/translate-chapter',
    ]) {
      expect(isUnmeteredApiPath(path)).toBe(false);
    }
  });

  it('does not exempt a path that merely starts with the prefix text', () => {
    expect(isUnmeteredApiPath('/api/persistence-report')).toBe(false);
    expect(isUnmeteredApiPath('/api/foundationalize')).toBe(false);
  });
});
