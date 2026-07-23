import type { AppUser, UserProfile } from '../types';
import { resolveMediaAssetForDisplay } from './media/privateMediaResolver';

const ACCOUNT_PROFILE_CACHE_PREFIX = 'seihouse-account-profile-cache-v1:';

type CachedAccountProfile = Pick<
  UserProfile,
  | 'uid'
  | 'username'
  | 'displayName'
  | 'avatarUrl'
  | 'preferredLanguage'
  | 'defaultTranslationLanguage'
  | 'joinedDate'
  | 'updatedAt'
> & Partial<Pick<
  UserProfile,
  | 'displayNameColor'
  | 'activePortraitId'
  | 'avatarMediaDescriptor'
  | 'dao_xp'
  | 'dao_rank'
  | 'qi'
  | 'heavenly_qi'
  | 'sect_qi'
>>;

const cacheKey = (uid: string) => `${ACCOUNT_PROFILE_CACHE_PREFIX}${encodeURIComponent(uid)}`;

const isOwnerEmail = (email: string | null) => {
  const normalizedEmail = email?.toLowerCase();
  return normalizedEmail === 'amaurylindy@gmail.com'
    || normalizedEmail === 'seihouseproductions@gmail.com';
};

const isCachedAccountProfile = (value: unknown, uid: string): value is CachedAccountProfile => {
  if (!value || typeof value !== 'object') return false;
  const profile = value as Partial<CachedAccountProfile>;
  return profile.uid === uid
    && typeof profile.username === 'string'
    && typeof profile.displayName === 'string'
    && typeof profile.avatarUrl === 'string'
    && typeof profile.preferredLanguage === 'string'
    && typeof profile.defaultTranslationLanguage === 'string'
    && typeof profile.joinedDate === 'string'
    && typeof profile.updatedAt === 'string';
};

export const cacheAccountProfile = (profile: UserProfile): void => {
  const cachedProfile: CachedAccountProfile = {
    uid: profile.uid,
    username: profile.username,
    displayName: profile.displayName,
    // Private R2 delivery URLs expire and must be refreshed from PostgreSQL/R2.
    // Cache only non-portrait identity avatars; the asset ID remains canonical.
    avatarUrl: profile.activePortraitId ? '' : profile.avatarUrl,
    preferredLanguage: profile.preferredLanguage,
    defaultTranslationLanguage: profile.defaultTranslationLanguage,
    joinedDate: profile.joinedDate,
    updatedAt: profile.updatedAt,
    displayNameColor: profile.displayNameColor,
    activePortraitId: profile.activePortraitId,
    avatarMediaDescriptor: profile.avatarMediaDescriptor
      ? { ...profile.avatarMediaDescriptor, deliveryUrl: '' }
      : undefined,
    dao_xp: profile.dao_xp,
    dao_rank: profile.dao_rank,
    qi: profile.qi,
    heavenly_qi: profile.heavenly_qi,
    sect_qi: profile.sect_qi,
  };

  try {
    localStorage.setItem(cacheKey(profile.uid), JSON.stringify(cachedProfile));
  } catch (error) {
    console.warn('Failed to cache account profile:', error);
  }
};

export const readCachedAccountProfile = (uid: string): CachedAccountProfile | null => {
  try {
    const serializedProfile = localStorage.getItem(cacheKey(uid));
    if (!serializedProfile) return null;
    const profile: unknown = JSON.parse(serializedProfile);
    return isCachedAccountProfile(profile, uid) ? profile : null;
  } catch (error) {
    console.warn('Failed to read cached account profile:', error);
    return null;
  }
};

export const createAccountProfileFallback = (user: AppUser): UserProfile => {
  const cachedProfile = readCachedAccountProfile(user.uid);
  const owner = isOwnerEmail(user.email);
  const now = new Date().toISOString();

  return {
    uid: user.uid,
    username: cachedProfile?.username || user.email?.split('@')[0] || `user_${user.uid.substring(0, 5)}`,
    displayName: cachedProfile?.displayName || user.displayName || '',
    displayNameColor: cachedProfile?.displayNameColor,
    avatarUrl: cachedProfile?.avatarUrl || user.photoURL || '',
    activePortraitId: cachedProfile?.activePortraitId,
    avatarMediaDescriptor: cachedProfile?.avatarMediaDescriptor,
    preferredLanguage: cachedProfile?.preferredLanguage || 'English',
    defaultTranslationLanguage: cachedProfile?.defaultTranslationLanguage || 'English',
    savedStoryCount: 0,
    activeStories: [],
    inactiveStories: [],
    joinedDate: cachedProfile?.joinedDate || now,
    updatedAt: cachedProfile?.updatedAt || now,
    role: owner ? 'owner' : 'user',
    premiumTier: owner ? 'immortal' : 'mortal',
    dao_xp: cachedProfile?.dao_xp,
    dao_rank: cachedProfile?.dao_rank,
    qi: cachedProfile?.qi,
    heavenly_qi: cachedProfile?.heavenly_qi,
    sect_qi: cachedProfile?.sect_qi,
  };
};

export const hydrateCachedAccountPortrait = async (
  profile: UserProfile,
): Promise<UserProfile> => {
  const descriptor = profile.avatarMediaDescriptor;
  if (!descriptor || descriptor.id !== profile.activePortraitId) return profile;
  try {
    const resolved = await resolveMediaAssetForDisplay(descriptor);
    return {
      ...profile,
      avatarUrl: resolved.url,
      avatarMediaDescriptor: { ...resolved.descriptor, deliveryUrl: '' },
    };
  } catch {
    return profile;
  }
};
