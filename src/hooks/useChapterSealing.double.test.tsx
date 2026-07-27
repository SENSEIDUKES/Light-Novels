import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChapterSealing } from './useChapterSealing';
import { useAppStore } from '../store/useAppStore';
import * as qi from '../lib/qi';
import React from 'react';

vi.mock('../lib/qi', () => ({
  awardQi: vi.fn(),
}));

vi.mock('../lib/storage', () => ({
  storyStorage: {
    startTransaction: vi.fn(),
    commitTransaction: vi.fn(),
    rollbackTransaction: vi.fn(),
    saveStory: vi.fn().mockResolvedValue(undefined),
  }
}));

vi.mock('../lib/firebase', () => ({
  auth: { currentUser: { uid: 'test-user' } },
  LOCAL_ONLY_MODE: true,
}));

describe('useChapterSealing double click race condition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      stories: [
        {
          id: 'story-1',
          title: 'Test Story',
          genre: 'test',
          mcName: 'Test',
          customPremise: 'Test',
          arcs: [
            {
              title: 'Arc 1',
              isCompleted: false,
              chapters: [
                {
                  number: 1,
                  isSealed: false,
                  generatedContent: 'test',
                  title: 'Test',
                  premise: 'Test',
                  status: 'unread'
                }
              ]
            }
          ],
          memory: {},
          createdAt: '2023-01-01',
          updatedAt: '2023-01-01',
          currentChapterNumber: 1
        } as any
      ],
      activeStoryId: 'story-1',
    });
  });

  it('should not award Qi twice on double invocation', async () => {
    const { result } = renderHook(() => useChapterSealing());

    // Fire two calls concurrently
    await act(async () => {
      await Promise.all([
        result.current.handleSealChapter(1),
        result.current.handleSealChapter(1)
      ]);
    });

    expect(qi.awardQi).toHaveBeenCalledTimes(1);
  });
});
