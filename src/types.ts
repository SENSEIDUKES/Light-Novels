export interface StreamingChapter {
  number: number;
  content: string;
  blocks?: StoryBlock[];
}

export interface StatusEffectDef {
  name: string;
  type: "Curse" | "Blessing" | "Affliction" | "Mutation";
  description: string;
  durationMs: number;
  scope: "Account-wide" | "Story-specific";
  visual?: string;
  counterplay?: string;
  rewardHook?: string;
  qiMultiplier?: number;
  sectQiMultiplier?: number;
  targetProgress?: number;
}

export interface ActiveStatusEffect {
  id: string;
  effectDef: StatusEffectDef;
  appliedAt: string;
  expiresAt: string;
  sourceArtifactId?: string;
  progress?: number;
  targetProgress?: number;
  completedAt?: string;
  isUnlockedReward?: boolean;
}

export interface CosmicArtifact {
  id: string;
  name: string;
  description: string;
  unlockedAt: string;
  sourceStoryId?: string;
  sourceStoryTitle?: string;
  milestoneType:
    | "chapter_seal"
    | "rank_up"
    | "challenge_complete"
    | "first_breakthrough"
    | "streak_attained"
    | "codex_linked";
  milestoneName: string;
  imageUrl?: string;
  rarity: "Common" | "Rare" | "Epic" | "Legendary" | "Mythic" | "Transcendent";
  attributeBoost?: string;
  statusEffectDef?: StatusEffectDef;
  
  // Weekly Offering System
  offeringWeekId?: string;
  gatheredAt?: string;
  status?: "unsubmitted" | "submitted" | "auto_submitted";
  rewardValueQi?: number;
  rewardValueSectMerit?: number;
}

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  displayNameColor?: string;
  avatarUrl: string;
  preferredLanguage: string;
  defaultTranslationLanguage: string;
  savedStoryCount: number;
  activeStories: string[];
  inactiveStories: string[];
  joinedDate: string;
  updatedAt: string;
  role?: "owner" | "admin" | "user";
  qi?: number; // legacy
  dao_xp?: number;
  dao_rank?: string;
  heavenly_qi?: number;
  sect_qi?: number;
  demonic_qi?: number;
  premiumTier?: "mortal" | "outer_sect" | "inner_sect" | "sect_master" | "immortal";
  imageGenerationCount?: number;
  imageQuotaResetAt?: string;
  writingStreak?: number;

  // Idle Cultivation & Dao Pillar
  lastSessionEnd?: string;
  daoPillarStreak?: number;
  daoPillarCracked?: boolean;
  lastReadDate?: string;

  lastInteractionDate?: string;
  cosmicInventory?: CosmicArtifact[];
  equippedArtifactId?: string;
  activeStatusEffects?: ActiveStatusEffect[];
}

export interface DaoXpEvent {
  id?: string;
  user_id: string;
  event_type: string;
  xp_amount: number;
  source_id?: string;
  source_type?: string;
  created_at: string;
}

export interface GeneratedImage {
  id: string;
  entityId: string;
  entityType: "cover" | "character" | "beast" | "location" | "artifact" | "chapterHero";
  imageUrl: string;
  chapterNumber?: number;
  arcTitle?: string;
  label?: string;
  promptUsed: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface BeastSonicProfile {
  size: "tiny" | "human-sized" | "giant" | "world-scale";
  bodyType:
    | "insect"
    | "serpent"
    | "bird"
    | "mammal"
    | "spirit"
    | "undead"
    | "dragon"
    | "cosmic";
  element:
    | "lightning"
    | "fire"
    | "ice"
    | "void"
    | "blood"
    | "wind"
    | "poison"
    | "none";
  movement:
    | "crawling"
    | "flying"
    | "burrowing"
    | "teleporting"
    | "stomping"
    | "none";
  intelligence: "animal" | "cunning" | "ancient" | "divine";
  threatTier: "common" | "elite" | "boss" | "calamity" | "mythic";
  signatureSound:
    | "screech"
    | "roar"
    | "chitter"
    | "hum"
    | "pulse"
    | "chant"
    | "silence";
}

export type RelevanceState =
  | "active"
  | "warm"
  | "dormant"
  | "archived"
  | "reactivated";

export interface MemoryProvenance {
  sourceChapterNumber?: number;
  sourceBlockId?: string;
  createdBy?: string;
  confidence?: number;
  lastMentionedChapter?: number;
  supersedesMemoryId?: string;
  isUserPinned?: boolean;
}

export interface PlotThread {
  id?: string;
  description: string;
  status: "active" | "resolved";
  provenance?: MemoryProvenance;
  originChapter?: number;
}

export interface Ability extends BaseCodexEntry {
  id: string;
  name: string;
  description: string;
  source?: string;
  acquiredChapter?: number;
  acquisitionMethod?: string;
  cost?: string;
  limits?: string;
  masteryLevel?: string;
  lastUsedChapter?: number;
  canonStatus?: 'confirmed' | 'rumored' | 'forbidden' | 'lost';
}

export interface BaseCodexEntry {
  relevanceState?: RelevanceState;
  firstAppeared?: number;
  lastMajorInvolvement?: number;
  unresolvedThreads?: string[];
  currentRelevance?: string;
  toneMemory?: string;
  provenance?: MemoryProvenance;
  pendingEvolution?: boolean;
  arcAccumulation?: string;
}

export interface Character extends BaseCodexEntry {
  id: string;
  name: string;
  role: string;
  description: string;
  relationshipToMC: string;
  status: "alive" | "deceased" | "unknown" | "ascended";
  powerLevel?: string;
  abilities?: Array<string | Ability>;
  faction?: string;
  imageUrl?: string;
  imageHistory?: GeneratedImage[];
  isBeast?: boolean;
  beastProfile?: BeastSonicProfile;
  lastImageChapter?: number;
  evolutionReady?: boolean;
  evolutionReason?: string;
  availableVisualUpdate?: boolean;
  voicePresetId?: string;
  signatureQuote?: string;
  voiceClipUrl?: string;
}

export interface Faction extends BaseCodexEntry {
  id: string;
  name: string;
  description: string;
  alignment: "Righteous" | "Demonic" | "Neutral" | "Mysterious" | string;
  headquarters?: string;
  status?: "Active" | "Destroyed" | "Fractured" | string;
}

export interface Location extends BaseCodexEntry {
  id: string;
  name: string;
  description: string;
  realm?: string;
  safetyLevel?: "Safe" | "Dangerous" | "Lethal" | string;
  imageUrl?: string;
  imageHistory?: GeneratedImage[];
  lastImageChapter?: number;
  evolutionReady?: boolean;
  evolutionReason?: string;
  availableVisualUpdate?: boolean;
}

export interface Artifact extends BaseCodexEntry {
  id: string;
  name: string;
  description: string;
  tier?: "Mortal" | "Earth" | "Heaven" | "Primordial" | string;
  currentOwner?: string;
  imageUrl?: string;
  imageHistory?: GeneratedImage[];
  lastImageChapter?: number;
  evolutionReady?: boolean;
  evolutionReason?: string;
  availableVisualUpdate?: boolean;
}

export interface StoryMemory {
  powerSystem: string;
  currentPowerStage: string;
  worldRules: string[];
  characters: Character[];
  unresolvedPlotThreads: Array<string | PlotThread>;
  resolvedPlotThreads: Array<string | PlotThread>;
  memoryWarnings?: string[];

  // Living Codex expansions
  factions?: Faction[];
  locations?: Location[];
  artifacts?: Artifact[];
  abilities?: Array<string | Ability>; // MC-specific learned arts & skills
}

export interface StoryBlockMetadata {
  sceneType?: string;
  environment?: string[];
  motion?: string;
  emotion?: string;
  intensity?: number;
  tension?: number;
  danger?: number;
  mysticism?: number;
  audioSignature?: string;
  speakerName?: string;
  mode?: string;
  speakerRole?: string;
  entities?: {
    name: string;
    type: "character" | "artifact" | "location" | "beast" | "faction";
    mention: "reveal" | "reference";
  }[];
  music?: {
    mood:
      | "war"
      | "duel"
      | "serenity"
      | "romance"
      | "dread"
      | "mystery"
      | "triumph"
      | "tribulation"
      | "travel"
      | "tragedy"
      | "fighting"
      | "adventure"
      | "ambient"
      | "boss-fight"
      | "tension"
      | "sad"
      | "mystical"
      | "excitement"
      | "tired"
      | "horror";
    region?: "chinese" | "japanese" | "western";
    intensity?: number;
    customUrl?: string;
    trackId?: string;
  };
  beastEvent?: {
    type:
      | "reveal"
      | "power-up"
      | "technique"
      | "injury"
      | "turning-point"
      | "death"
      | "breakthrough";
    profile: BeastSonicProfile;
  };
}

export interface FateResultData {
  outcome: "FATE AVERTED" | "FATE SCARRED" | "DOOM MANIFESTED";
  timelineScar: string;
  permanentCosts: string[];
  newStoryState: string;
  newActiveStats: string[];
  genreShift: string;
}

export interface SystemEvent {
  kind:
    | "status"
    | "skill_acquired"
    | "level_up"
    | "quest"
    | "appraisal"
    | "fate_result";
  promptType?:
    | "neutral"
    | "codex_update"
    | "friendly_scan"
    | "enemy_scan"
    | "warning"
    | "critical_danger"
    | "progression"
    | "breakthrough"
    | "reward"
    | "romance"
    | "karmic_bond"
    | "mystery"
    | "fate_event"
    | "corruption"
    | "death_event"
    | "quest_update"
    | "choice_consequence"
    | "system_error";
  title: string;
  rows?: { label: string; value: string }[];
  rarity?: string;
  fateResult?: FateResultData;
}

export interface WorldCardEvent {
  id?: string;
  entityType:
    | "character"
    | "creature"
    | "artifact"
    | "location"
    | "faction"
    | "system"
    | "fate_event";
  entityName: string;
  displayTitle: string;
  imageUrl?: string;
  quote?: string;
  audioText?: string;
  audioType: "tts_line" | "roar" | "ambience" | "chime";
  voicePreset?: string;
  codexEntryId?: string;
}

export interface StoryBlock {
  id: string;
  type: string;
  text: string;
  metadata?: StoryBlockMetadata;
  system?: SystemEvent;
  worldCard?: WorldCardEvent;
}

export interface StoryCuePayload {
  intensity?: number;
  tension?: number;
  powerShift?: number;
  emotion?: string;
  relationshipShift?: number;
  danger?: number;
  mysticism?: number;
  element?: string;
  signature?: string;
  beastEvent?: {
    type:
      | "reveal"
      | "power-up"
      | "technique"
      | "injury"
      | "turning-point"
      | "death"
      | "breakthrough";
    profile: BeastSonicProfile;
  };
}

export interface VoiceClip {
  blockId: string;
  audioUrl: string;
  speakerVoice: string;
}

export interface AudioManifest {
  version: string;
  language: string;
  clips: VoiceClip[];
  generatedAt: number;
}

export interface ChapterContent {
  storyId: string;
  chapterNumber: number;
  generatedContent: string;
  blocks?: StoryBlock[];
  archivedBlocks?: StoryBlock[]; // For offloading older dialogue/non-essential blocks
  summary?: string;
  episodicSummary?: string; // Episodic summaries
  statsChangeMessage?: string;
  cuePayload?: StoryCuePayload;
  translations?: {
    [langCode: string]: {
      title: string;
      content: string;
      translatedAt: number;
    };
  };
  audioManifest?: AudioManifest;
  syncStatus?: "local" | "synced" | "conflict";
  revisionId?: string;
  updatedAt?: string;
}

export interface Chapter {
  number: number;
  title: string;
  premise: string;
  status: "unlocked" | "generating" | "read" | "unread";
  generatedContent?: string; // Optional, only populated when currently viewed
  blocks?: StoryBlock[];
  hasContent?: boolean; // Indicates if the content was generated and stored
  isSealed?: boolean; // Indicates the chapter is published/locked for editing
  contentHash?: string;
  sealedAt?: number;
  versionId?: string;
  assetManifest?: Record<string, string>;
  translationCache?: Record<string, string>;
  audioCueCache?: Record<string, string>;
  branchAnchor?: string;
  summary?: string; // Optional
  embedding?: number[]; // Optional vector embedding for RAG continuity searches
  statsChangeMessage?: string;
  cuePayload?: StoryCuePayload;
  translations?: {
    [langCode: string]: {
      title: string;
      content: string;
      translatedAt: number;
    };
  };
  audioManifest?: AudioManifest;
  _isNewContent?: boolean;
  hasContinuityFaults?: boolean;
  continuityWarnings?: string[];
  continuitySoftNotes?: string[];
}

export interface StoryArc {
  title: string;
  chapters: Chapter[];
  isCompleted: boolean;
  summary?: string;
  episodicSummaries?: string[];
}

export interface ReaderPreferences {
  fontSize: "xs" | "sm" | "base" | "lg" | "xl";
  fontFamily: "serif" | "sans" | "mono";
  lineHeight: "snug" | "normal" | "relaxed" | "loose";
  paragraphSpacing: "normal" | "wide" | "double";
  themeOverride?: "void" | "crimson" | "abyss" | "sepia" | "emerald";
  colorPaletteId?: "default" | "protanopia" | "deuteranopia" | "tritanopia" | "high_contrast_dark";
  highlightStyle?: "full" | "underline" | "tint";
}

export interface ReaderAccessibilitySettings {
  fontSizeRem: number; // defaults to 1.0, ranges from 0.85 to 2.5
  lineHeightScale: number; // spacing weight, e.g., 1.5 to 2.2
  fontFamilyId: 'system' | 'serif' | 'dyslexic' | 'custom';
  colorPaletteId: 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'high_contrast_dark';
  letterSpacing: number;
}

export interface KarmaFateNode {
  id: string;
  sourceId: string; // ID of character, location, or thread
  sourceName: string;
  targetId: string; // ID of character, location, or thread
  targetName: string;
  description: string;
  severity: "Minor" | "Major" | "Cosmic";
  type: "Debt" | "Boon" | "Enmity" | "Destiny";
  status: "active" | "resolved";
  createdAt: string;
}

export interface CharacterRelationship {
  id: string;
  sourceCharId: string;
  sourceCharName: string;
  targetCharId: string;
  targetCharName: string;
  affinity: number; // -100 to +100
  threat?: number; // -100 to +100
  description: string;
  updatedAt: string;
}

export interface IntakeCharacter {
  id: string;
  name: string;
  age?: string;
  skinTone?: string;
  eyeColor?: string;
  powerType?: string;
  rankLevel?: string;
  role?: string;
  connectionToMC?: string;
  bio?: string;
}

export interface IntakeFaction {
  id: string;
  name: string;
  role?: string;
  powerLevel?: string;
  alignment?: string;
  connectionToMC?: string;
  description?: string;
}

export interface IntakeData {
  // 1. Core Seed
  novelTitle?: string;
  mcName?: string;
  genrePath?: string;
  corePremise?: string;
  desiredPlotDirection?: string;
  storyTags?: string[];
  destinedEnding?: string;
  estimatedArcs?: number;

  // 2. World Setting
  worldType?: string;
  startingLocation?: string;
  societyStructure?: string;
  dangerLevel?: string;
  generalAtmosphere?: string;

  // 3. Main Character Setup
  startingIdentity?: string;
  personality?: string;
  mainFlaw?: string;
  secretAdvantage?: string;
  startingWeakness?: string;
  moralAlignment?: string;
  mcBio?: string;

  // 3.5. Character Intake
  customCharacters?: IntakeCharacter[];

  // 3.8. Faction Intake
  customFactions?: IntakeFaction[];

  // 4. Power System Seed
  startingPowerConcept?: string;
  powerFlavor?: string;
  powerPace?: string;
  knownRanks?: string;
  uniquePath?: string;

  // 5. Plot & Trope Control
  longTermGoal?: string;
  firstMajorConflict?: string;
  mainAntagonistPressure?: string;
  romanceLevel?: string;
  faceSlappingLevel?: string;
  comedyLevel?: string;
  tournamentArcPreference?: string;
  haremPreference?: string;
  betrayalLevel?: string;
  thingsToAvoid?: string;
  mustIncludeElements?: string;
  hardcoreFateMode?: boolean;
  fatePressure?: "Relaxed" | "Balanced" | "Hardcore" | "Dao Master";

  // 6. Make it Work (Absolute Custom Rule)
  makeItWorkInstruction?: string;
}

export interface WorldBlueprint {
  title: string;
  logline: string;
  worldOverview: string;
  startingLocation: string;
  societyStructure: string;
  powerSystemOutline: string;
  mcProfile: string;
  majorFactions: string[];
  initialCharacters: string[];
  majorMysteries: string[];
  firstArcPromise: string;
  tropeRules: string;
  styleBible: string;
  destinedEnding?: string;
  estimatedArcs: number;
  unresolvedPlotThreads: string[];
}

export interface StoryWorld {
  userId?: string;
  id: string;
  parentStoryId?: string;
  forkChapterNumber?: number;
  title: string;
  genre: string;
  mcName: string;
  customPremise: string;
  createdAt: string;
  updatedAt: string;
  memory: StoryMemory;
  arcs: StoryArc[];
  currentChapterNumber: number;
  imageUrl?: string;
  imageHistory?: GeneratedImage[];
  lastImageChapter?: number;
  evolutionReady?: boolean;
  evolutionReason?: string;
  availableVisualUpdate?: boolean;
  intake?: IntakeData;
  blueprint?: WorldBlueprint;
  isEdited?: boolean; // Track if the user has modified/actively worked on the demo story
  motionCoverActive?: boolean; // Alternative video covers active state
  hardcoreFateMode?: boolean;
  fatePressure?: "Relaxed" | "Balanced" | "Hardcore" | "Dao Master";
  deleted?: boolean; // Soft delete for synchronization

  // Local-first persistent storage properties
  relationships?: CharacterRelationship[];
  karmaNodes?: KarmaFateNode[];
  readerPreferences?: ReaderPreferences;
  bookmarks?: Bookmark[];
  assignedRevealBackdrops?: Record<string, string>;

  // Reader experience tracking
  lastReadChapter?: number;
  /**
   * Legacy raw pixel offset. Read once for migration to `readingAnchor`,
   * never written anymore.
   */
  lastReadScrollPosition?: number;
  /** Semantic reading position — survives layout, font, and viewport changes. */
  readingAnchor?: import('./lib/cinematicScroll/anchors').ReadingAnchor;
  readingStats?: {
    totalReadingTimeMs?: number;
    arcReadingTimeMs?: Record<number, number>;
  };
  lastReadAt?: string;
  conflictResolvedAt?: string;
}

export interface Bookmark {
  id: string;
  chapterNumber: number;
  paragraphIndex: number;
  paragraphExcerpt: string;
  note?: string;
  createdAt: string;
}

export type Story = StoryWorld;

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface LoreGlossary {
  id: string;
  novel_id: string;
  source_text: string;
  target_text: string;
  target_lang: string;
}

export interface RouteConfig {
  provider: "gemini" | "openrouter" | "ollama";
  model: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface MultiModelRouting {
  storyMaker: RouteConfig;
  imageGenerator: RouteConfig;
}

// Fate Survival Challenge Types
export interface FateChoice {
  id: string;
  label: string;
  description?: string;
  effects: {
    survival?: number;
    relationship?: number;
    danger?: number;
    fateResistance?: number;
    trust?: number;
  };
}

export interface FateChoicePoint {
  id: string;
  stepNumber: number;
  prompt: string;
  choices: FateChoice[];
}

export interface FateSurvivalChallenge {
  id: string;
  title: string;
  genre: string;
  description: string;
  fatedOutcome: string;
  startingScenario: string;
  totalSteps: number;
  choicePoints: FateChoicePoint[];
  successCondition: string;
  failureCondition: string;
  rewards: {
    attemptQi: number;
    failureQi: number;
    partialSuccessQi: number;
    successQi: number;
  };
}

export interface FateSurvivalRun {
  id: string;
  challengeId: string;
  userId: string;
  currentStep: number;
  status: "not_started" | "active" | "completed" | "failed";
  selectedChoices: string[]; // Store IDs of chosen choices
  state: {
    survival: number;
    relationship: number;
    danger: number;
    fateResistance: number;
    trust: number;
  };
  result?: "failure" | "partial_success" | "success";
  qiAwarded?: number;
  createdAt: string;
  completedAt?: string;
}

export interface DraftRecoverySession {
  activeStoryId: string;
  generatingChapterNum: number;
}
