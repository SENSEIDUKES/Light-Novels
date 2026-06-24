import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useImageManifest } from './useImageManifest';

vi.mock('../lib/quota', () => ({
  checkAndConsumeImageQuota: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../lib/encryption', () => ({
  secureStorage: {
    getItem: vi.fn().mockResolvedValue('test-key')
  }
}));

vi.mock('../store/useAppStore', () => ({
  useAppStore: vi.fn((selector) => {
    const mockState = {
      stories: [{ id: 'story-1', currentChapterNumber: 1, arcs: [{ chapters: [{ number: 1, title: 'Ch 1' }] }] }],
      activeStoryId: 'story-1',
      saveStories: vi.fn(),
      routingConfig: {}
    };
    return selector(mockState);
  })
}));

describe('useImageManifest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes generatingIds as an empty set', () => {
    const { result } = renderHook(() => useImageManifest());
    expect(result.current.generatingIds).toBeDefined();
    expect(result.current.generatingIds.size).toBe(0);
  });
});
