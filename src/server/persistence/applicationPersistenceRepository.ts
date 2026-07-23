import type {
  ChapterContent,
  CultivatorPortraitAsset,
  LoreGlossary,
  StorySeed,
  StoryWorld,
  UserProfile,
} from '../../types';
import type { CloudRevisionExpectation } from '../../lib/storage/types';

export interface PersistenceMutationContext {
  idempotencyKey: string;
  expected?: CloudRevisionExpectation;
}

export interface PersistenceAdminOverview {
  users: UserProfile[];
  stories: Array<{
    id: string;
    ownerUid: string;
    title: string;
    deleted?: boolean;
    updatedAt: string;
  }>;
}

export interface PortraitSelectionInput {
  assetId: string;
  prompt?: string;
  description?: string;
  daoRank?: string;
  daoXp?: number;
  powerStage?: string;
  equippedArtifactId?: string | null;
  usedReferenceImage?: boolean;
  customization?: {
    frameId?: string | null;
    glowId?: string | null;
    bannerId?: string | null;
    effectIds?: string[];
  };
}

export interface ApplicationPersistenceRepository {
  listStories(ownerUid: string): Promise<StoryWorld[]>;
  getStory(ownerUid: string, storyId: string): Promise<StoryWorld | null>;
  saveStory(
    ownerUid: string,
    story: StoryWorld,
    context: PersistenceMutationContext,
  ): Promise<StoryWorld>;
  deleteStory(
    ownerUid: string,
    storyId: string,
    context: PersistenceMutationContext,
  ): Promise<void>;

  getChapterContent(
    ownerUid: string,
    storyId: string,
    chapterNumber: number,
  ): Promise<ChapterContent | null>;
  saveChapterContent(
    ownerUid: string,
    storyId: string,
    content: ChapterContent,
    context: PersistenceMutationContext,
  ): Promise<ChapterContent>;

  listGlossary(ownerUid: string, storyId: string): Promise<LoreGlossary[]>;
  saveGlossaryTerms(
    ownerUid: string,
    storyId: string,
    terms: Array<Omit<LoreGlossary, 'id'> & { id?: string }>,
    idempotencyKey: string,
  ): Promise<LoreGlossary[]>;
  deleteGlossaryTerm(ownerUid: string, termId: string, idempotencyKey: string): Promise<void>;

  listSeeds(ownerUid: string): Promise<StorySeed[]>;
  getSeed(ownerUid: string, seedId: string): Promise<StorySeed | null>;
  saveSeed(
    ownerUid: string,
    seed: StorySeed,
    context: PersistenceMutationContext,
  ): Promise<StorySeed>;
  saveSeeds(
    ownerUid: string,
    seeds: StorySeed[],
    idempotencyKey: string,
  ): Promise<StorySeed[]>;
  deleteSeed(ownerUid: string, seedId: string, idempotencyKey: string): Promise<void>;

  getProfile(ownerUid: string): Promise<UserProfile | null>;
  saveProfile(
    ownerUid: string,
    patch: Partial<UserProfile>,
    context: PersistenceMutationContext,
  ): Promise<UserProfile>;
  consumeImageQuota(
    ownerUid: string,
    idempotencyKey: string,
  ): Promise<{ imageGenerationCount: number; imageQuotaResetAt: string }>;
  selectPortrait(
    ownerUid: string,
    input: PortraitSelectionInput,
    idempotencyKey: string,
  ): Promise<UserProfile>;
  recoverPortraits(ownerUid: string, idempotencyKey: string): Promise<number>;

  getAdminOverview(actorUid: string): Promise<PersistenceAdminOverview>;
  updateAdminAccount(
    actorUid: string,
    ownerUid: string,
    patch: Pick<UserProfile, 'role' | 'premiumTier'>,
    idempotencyKey: string,
  ): Promise<UserProfile>;
  deleteAdminStory(
    actorUid: string,
    storyId: string,
    idempotencyKey: string,
  ): Promise<void>;
}

export interface HydratedPortraitResult {
  portrait: CultivatorPortraitAsset;
  profile: UserProfile;
}
