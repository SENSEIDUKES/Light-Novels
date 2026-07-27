import { describe, it, expect } from 'vitest';
import {
  HUB_STORY_ID_MARKERS,
  hasDemoMatrixIdPrefix,
  hasHubStoryIdPrefix,
  isHubStory,
  isHubStoryLockedForUser,
  isMortalTier,
} from './hubStories';

describe('isHubStory', () => {
  it('matches the built-in demo and challenge templates', () => {
    expect(isHubStory('demo-matrix-1')).toBe(true);
    expect(isHubStory('challenge-prince-die')).toBe(true);
  });

  it('matches an account-scoped copy of a built-in world', () => {
    // openPublishedWorld mints `${templateId}-${uid}`.
    expect(isHubStory('demo-matrix-1-abc123uid')).toBe(true);
    expect(isHubStory('challenge-prince-die-user2')).toBe(true);
    expect(isHubStory('demo-matrix-random-a1b2c3')).toBe(true);
  });

  it('matches a marker anywhere in the id, preserving the gate behaviour', () => {
    // The entitlement checks this replaced used `includes`, not `startsWith`.
    expect(isHubStory('imported-demo-matrix-1')).toBe(true);
  });

  it('does not match reader-authored stories', () => {
    expect(isHubStory('story-9f3a')).toBe(false);
    expect(isHubStory('my-challenger-tale')).toBe(false);
  });

  it('accepts a story object or a bare id, and tolerates absent input', () => {
    expect(isHubStory({ id: 'demo-matrix-1' })).toBe(true);
    expect(isHubStory(null)).toBe(false);
    expect(isHubStory(undefined)).toBe(false);
    expect(isHubStory({ id: null })).toBe(false);
    expect(isHubStory('')).toBe(false);
  });
});

describe('hasHubStoryIdPrefix', () => {
  it('anchors at the start of the id', () => {
    expect(hasHubStoryIdPrefix('demo-matrix-1')).toBe(true);
    expect(hasHubStoryIdPrefix('challenge-prince-die-user2')).toBe(true);
  });

  it('refuses ids that only contain a marker, keeping deletion paths narrow', () => {
    // isHubStory would accept this; the cleanup paths must not, or a
    // reader-authored world becomes eligible for deletion.
    expect(isHubStory('imported-demo-matrix-1')).toBe(true);
    expect(hasHubStoryIdPrefix('imported-demo-matrix-1')).toBe(false);
  });

  it('tolerates absent input', () => {
    expect(hasHubStoryIdPrefix(null)).toBe(false);
    expect(hasHubStoryIdPrefix(undefined)).toBe(false);
  });
});

describe('hasDemoMatrixIdPrefix', () => {
  it('selects demo matrices only, not challenges', () => {
    expect(hasDemoMatrixIdPrefix('demo-matrix-2')).toBe(true);
    expect(hasDemoMatrixIdPrefix('challenge-kingdom-falls')).toBe(false);
  });
});

describe('isMortalTier', () => {
  it('treats an absent or unset profile as mortal', () => {
    expect(isMortalTier(null)).toBe(true);
    expect(isMortalTier(undefined)).toBe(true);
    expect(isMortalTier({})).toBe(true);
    expect(isMortalTier({ premiumTier: 'mortal' })).toBe(true);
  });

  it('treats any ascended tier as non-mortal', () => {
    expect(isMortalTier({ premiumTier: 'outer_sect' })).toBe(false);
    expect(isMortalTier({ premiumTier: 'inner_sect' })).toBe(false);
    expect(isMortalTier({ premiumTier: 'immortal' })).toBe(false);
  });
});

describe('isHubStoryLockedForUser', () => {
  it('locks a mortal reader out of built-in Hub content', () => {
    expect(isHubStoryLockedForUser({ id: 'demo-matrix-1' }, null)).toBe(true);
    expect(
      isHubStoryLockedForUser({ id: 'challenge-prince-die' }, { premiumTier: 'mortal' }),
    ).toBe(true);
  });

  it('leaves an ascended reader unlocked on the same story', () => {
    expect(
      isHubStoryLockedForUser({ id: 'demo-matrix-1' }, { premiumTier: 'inner_sect' }),
    ).toBe(false);
  });

  it('never locks a reader out of their own story', () => {
    expect(isHubStoryLockedForUser({ id: 'story-9f3a' }, null)).toBe(false);
  });
});

describe('HUB_STORY_ID_MARKERS', () => {
  it('is the single list every predicate reads', () => {
    expect(HUB_STORY_ID_MARKERS).toEqual(['demo-matrix-', 'challenge-']);
    for (const marker of HUB_STORY_ID_MARKERS) {
      expect(isHubStory(`${marker}x`)).toBe(true);
      expect(hasHubStoryIdPrefix(`${marker}x`)).toBe(true);
    }
  });
});
