import { describe, expect, it } from 'vitest';
import {
  isProfileSnapshotStillCurrent,
  isStoryRefreshStillCurrent,
} from './appSessionGuards';

describe('App account and refresh guards', () => {
  it('rejects a Harmony refresh when stories changed during chapter hydration', () => {
    const capturedStories = [{ id: 'story-1', title: 'Before local edit' }];
    const captured = {
      stories: capturedStories,
      activeStoryId: 'story-1',
      selectedChapterNum: 1,
    } as any;

    expect(isStoryRefreshStillCurrent(captured, captured)).toBe(true);
    expect(isStoryRefreshStillCurrent(captured, {
      ...captured,
      stories: [{ id: 'story-1', title: 'Newer local edit' }],
    })).toBe(false);
  });

  it('rejects profile snapshots from a previous auth epoch or UID', () => {
    const active = {
      expectedUid: 'account-b',
      expectedVersion: 2,
      currentVersion: 2,
      authenticatedUid: 'account-b',
      renderedUid: 'account-b',
    };

    expect(isProfileSnapshotStillCurrent(active)).toBe(true);
    expect(isProfileSnapshotStillCurrent({
      ...active,
      currentVersion: 3,
    })).toBe(false);
    expect(isProfileSnapshotStillCurrent({
      ...active,
      authenticatedUid: 'account-c',
      renderedUid: 'account-c',
    })).toBe(false);
  });
});
