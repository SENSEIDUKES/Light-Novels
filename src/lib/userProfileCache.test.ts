import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppUser, UserProfile } from '../types';
import {
  cacheAccountProfile,
  createAccountProfileFallback,
  readCachedAccountProfile,
} from './userProfileCache';

const user: AppUser = {
  uid: 'account-a',
  email: 'reader@example.com',
  displayName: 'Provider Name',
  photoURL: 'provider-photo.png',
};

const profile: UserProfile = {
  uid: user.uid,
  username: 'reader',
  displayName: 'Cultivator Name',
  avatarUrl: 'https://firebasestorage.example/portrait.webp',
  activePortraitId: 'portrait-1',
  preferredLanguage: 'Japanese',
  defaultTranslationLanguage: 'English',
  savedStoryCount: 3,
  activeStories: ['story-1'],
  inactiveStories: [],
  joinedDate: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-07-14T00:00:00.000Z',
  premiumTier: 'inner_sect',
};

describe('account profile cache', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('restores a previously selected account portrait during a cloud outage', () => {
    cacheAccountProfile(profile);

    expect(createAccountProfileFallback(user)).toMatchObject({
      uid: user.uid,
      username: 'reader',
      displayName: 'Cultivator Name',
      avatarUrl: 'https://firebasestorage.example/portrait.webp',
      activePortraitId: 'portrait-1',
      preferredLanguage: 'Japanese',
    });
  });

  it('falls back to the identity-provider photo when no account profile is cached', () => {
    expect(createAccountProfileFallback(user)).toMatchObject({
      uid: user.uid,
      displayName: 'Provider Name',
      avatarUrl: 'provider-photo.png',
      role: 'user',
      premiumTier: 'mortal',
    });
  });

  it('ignores malformed cache data without crossing account boundaries', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    localStorage.setItem('seihouse-account-profile-cache-v1:account-a', '{malformed-json');

    expect(readCachedAccountProfile('account-a')).toBeNull();
    expect(createAccountProfileFallback({ ...user, uid: 'account-b' }).avatarUrl).toBe('provider-photo.png');
    expect(warning).toHaveBeenCalled();
  });
});
