// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { MediaAssetDescriptor } from '../../contracts/mediaAssets';
import type { UserProfile } from '../../types';
import { hydrateProfilePortraitDelivery } from './mediaDeliveryHydrator';

const COMPACT_ID = '1dc21be263c047bda086980e44d67029';
const HYPHENATED_ID = '1dc21be2-63c0-47bd-a086-980e44d67029';

function descriptor(id: string): MediaAssetDescriptor {
  return {
    id,
    ownerUid: 'owner-a',
    assetType: 'IMAGE',
    purpose: 'CELESTIAL_PORTRAIT',
    visibility: 'PRIVATE',
    status: 'READY',
    mimeType: 'image/png',
    byteSize: '128',
    checksumSha256: 'a'.repeat(64),
    version: 1,
    deliveryUrl: 'https://signed.example/portrait',
    deliveryUrlExpiresAt: '2026-07-26T00:15:00.000Z',
    createdAt: '2026-07-26T00:00:00.000Z',
    updatedAt: '2026-07-26T00:00:00.000Z',
  } as unknown as MediaAssetDescriptor;
}

function profile(activePortraitId?: string): UserProfile {
  return {
    uid: 'owner-a',
    username: 'owner',
    displayName: 'Owner',
    avatarUrl: '',
    activePortraitId,
    preferredLanguage: 'en',
    defaultTranslationLanguage: 'en',
    savedStoryCount: 0,
    activeStories: [],
    inactiveStories: [],
    joinedDate: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-26T00:00:00.000Z',
  } as unknown as UserProfile;
}

describe('hydrateProfilePortraitDelivery', () => {
  // The profile hydrator re-hyphenates activePortraitAssetId while the media
  // descriptor keeps the media row's own UUID form. A strict `!==` therefore
  // decided the account's own portrait belonged to someone else and answered
  // with a blank avatar, so a saved Celestial Portrait never came back.
  it('matches a portrait whose descriptor uses the other UUID form', () => {
    const hydrated = hydrateProfilePortraitDelivery(
      profile(HYPHENATED_ID),
      descriptor(COMPACT_ID),
    );
    expect(hydrated.avatarUrl).toBe('https://signed.example/portrait');
    expect(hydrated.avatarMediaDescriptor?.id).toBe(COMPACT_ID);
  });

  it('leaves the profile untouched for a different asset', () => {
    const original = profile(HYPHENATED_ID);
    expect(hydrateProfilePortraitDelivery(
      original,
      descriptor('99999999-9999-4999-8999-999999999999'),
    )).toBe(original);
  });

  it('leaves the profile untouched when no portrait is selected', () => {
    const original = profile();
    expect(hydrateProfilePortraitDelivery(original, descriptor(COMPACT_ID))).toBe(original);
  });
});
