import type { AppUser, CosmicArtifact, StoryWorld, UserProfile } from '../types';

export const LOCAL_PROFILE_KEY = 'seihouse-local-user-profile';
export const LOCAL_INVENTORY_KEY = 'seihouse-local-cosmic-inventory';
export const LOCAL_USER_ID_KEY = 'seihouse-local-user-id';

const nowIso = () => new Date().toISOString();

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Local persistence write failed', key, error);
  }
}

export function getLocalUserId(): string {
  const existing = localStorage.getItem(LOCAL_USER_ID_KEY);
  if (existing) return existing;
  const generated = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(LOCAL_USER_ID_KEY, generated);
  return generated;
}

export function getLocalCosmicInventory(): CosmicArtifact[] {
  return readJson<CosmicArtifact[]>(LOCAL_INVENTORY_KEY, []);
}

export function saveLocalCosmicInventory(inventory: CosmicArtifact[]) {
  writeJson(LOCAL_INVENTORY_KEY, inventory);
}

export function getLocalUserProfile(stories: StoryWorld[] = []): UserProfile {
  const saved = readJson<Partial<UserProfile>>(LOCAL_PROFILE_KEY, {});
  const joinedDate = saved.joinedDate || nowIso();
  const displayName = saved.displayName || saved.username || 'Mortal Reader';
  return saveLocalUserProfile({
    uid: saved.uid || getLocalUserId(),
    username: saved.username || displayName,
    displayName,
    displayNameColor: saved.displayNameColor || '#E5E7EB',
    avatarUrl: saved.avatarUrl || '',
    preferredLanguage: saved.preferredLanguage || 'English',
    defaultTranslationLanguage: saved.defaultTranslationLanguage || 'English',
    savedStoryCount: stories.length,
    activeStories: saved.activeStories || stories.map((story) => story.id),
    inactiveStories: saved.inactiveStories || [],
    joinedDate,
    updatedAt: saved.updatedAt || joinedDate,
    role: saved.role || 'user',
    qi: saved.qi || 0,
    dao_xp: saved.dao_xp || saved.qi || 0,
    dao_rank: saved.dao_rank || 'Mortal Reader',
    heavenly_qi: saved.heavenly_qi || saved.dao_xp || saved.qi || 0,
    sect_qi: saved.sect_qi || 0,
    demonic_qi: saved.demonic_qi || 0,
    premiumTier: saved.premiumTier || 'mortal',
    imageGenerationCount: saved.imageGenerationCount || 0,
    imageQuotaResetAt: saved.imageQuotaResetAt,
    writingStreak: saved.writingStreak || 0,
    lastSessionEnd: saved.lastSessionEnd,
    daoPillarStreak: saved.daoPillarStreak || saved.writingStreak || 0,
    daoPillarCracked: saved.daoPillarCracked || false,
    lastReadDate: saved.lastReadDate,
    lastInteractionDate: saved.lastInteractionDate,
    cosmicInventory: saved.cosmicInventory || getLocalCosmicInventory(),
    equippedArtifactId: saved.equippedArtifactId || '',
    activeStatusEffects: saved.activeStatusEffects || [],
  });
}

export function getLocalAppUser(): AppUser {
  const profile = getLocalUserProfile();
  return {
    uid: profile.uid,
    email: null,
    displayName: profile.displayName,
    photoURL: profile.avatarUrl || null,
  };
}

export function saveLocalUserProfile(profile: UserProfile): UserProfile {
  const nextProfile = { ...profile, updatedAt: profile.updatedAt || nowIso() };
  writeJson(LOCAL_PROFILE_KEY, nextProfile);
  if (nextProfile.cosmicInventory) saveLocalCosmicInventory(nextProfile.cosmicInventory);
  return nextProfile;
}

export function mergeLocalUserProfile(updates: Partial<UserProfile>, stories: StoryWorld[] = []): UserProfile {
  return saveLocalUserProfile({ ...getLocalUserProfile(stories), ...updates, updatedAt: nowIso() });
}
