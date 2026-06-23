export interface StreamingChapter {
  number: number;
  content: string;
  blocks?: StoryBlock[];
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
  qi?: number; // legacy
  dao_xp?: number;
  dao_rank?: string;
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
  entityType: 'cover' | 'character' | 'beast' | 'location' | 'artifact';
  imageUrl: string;
  chapterNumber?: number;
  arcTitle?: string;
  label?: string;
  promptUsed: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface BeastSonicProfile {
  size: 'tiny' | 'human-sized' | 'giant' | 'world-scale';
  bodyType: 'insect' | 'serpent' | 'bird' | 'mammal' | 'spirit' | 'undead' | 'dragon' | 'cosmic';
  element: 'lightning' | 'fire' | 'ice' | 'void' | 'blood' | 'wind' | 'poison' | 'none';
  movement: 'crawling' | 'flying' | 'burrowing' | 'teleporting' | 'stomping' | 'none';
  intelligence: 'animal' | 'cunning' | 'ancient' | 'divine';
  threatTier: 'common' | 'elite' | 'boss' | 'calamity' | 'mythic';
  signatureSound: 'screech' | 'roar' | 'chitter' | 'hum' | 'pulse' | 'chant' | 'silence';
}

export type RelevanceState = 'active' | 'warm' | 'dormant' | 'archived' | 'reactivated';

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
  status: 'active' | 'resolved';
  provenance?: MemoryProvenance;
  originChapter?: number;
}

export interface Ability {
  id?: string;
  name: string;
  description?: string;
  provenance?: MemoryProvenance;
}

export interface BaseCodexEntry {
  relevanceState?: RelevanceState;
  firstAppeared?: number;
  lastMajorInvolvement?: number;
  unresolvedThreads?: string[];
  currentRelevance?: string;
  toneMemory?: string;
  provenance?: MemoryProvenance;
}

export interface Character extends BaseCodexEntry {
  id: string;
  name: string;
  role: string;
  description: string;
  relationshipToMC: string;
  status: 'alive' | 'deceased' | 'unknown' | 'ascended';
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
}

export interface Faction extends BaseCodexEntry {
  id: string;
  name: string;
  description: string;
  alignment: 'Righteous' | 'Demonic' | 'Neutral' | 'Mysterious' | string;
  headquarters?: string;
  status?: 'Active' | 'Destroyed' | 'Fractured' | string;
}

export interface Location extends BaseCodexEntry {
  id: string;
  name: string;
  description: string;
  realm?: string;
  safetyLevel?: 'Safe' | 'Dangerous' | 'Lethal' | string;
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
  tier?: 'Mortal' | 'Earth' | 'Heaven' | 'Primordial' | string;
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
  entities?: { name: string; type: 'character'|'artifact'|'location'|'beast'|'faction'; mention: 'reveal'|'reference' }[];
  music?: { mood: 'war'|'duel'|'serenity'|'romance'|'dread'|'mystery'|'triumph'|'tribulation'|'travel'|'tragedy'|'fighting'|'adventure'|'ambient'|'boss-fight'|'tension'|'sad'|'mystical'|'excitement'|'tired'|'horror'; region?: 'chinese'|'japanese'|'western'; intensity?: number; customUrl?: string; trackId?: string };
}

export interface SystemEvent {
  kind: 'status' | 'skill_acquired' | 'level_up' | 'quest' | 'appraisal';
  promptType?: 'neutral' | 'codex_update' | 'friendly_scan' | 'enemy_scan' | 'warning' | 'critical_danger' | 'progression' | 'breakthrough' | 'reward' | 'romance' | 'karmic_bond' | 'mystery' | 'fate_event' | 'corruption' | 'death_event' | 'quest_update' | 'choice_consequence' | 'system_error';
  title: string;
  rows?: {label: string; value: string}[];
  rarity?: string;
}

export interface StoryBlock {
  id: string;
  type: string;
  text: string;
  metadata?: StoryBlockMetadata;
  system?: SystemEvent;
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
    type: 'reveal' | 'power-up' | 'technique' | 'injury' | 'turning-point' | 'death' | 'breakthrough';
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
  summary?: string;
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
  syncStatus?: 'local' | 'synced' | 'conflict';
  revisionId?: string;
  updatedAt?: string;
}

export interface Chapter {
  number: number;
  title: string;
  premise: string;
  status: 'unlocked' | 'generating' | 'read' | 'unread';
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
}

export interface StoryArc {
  title: string;
  chapters: Chapter[];
  isCompleted: boolean;
  summary?: string;
}

export interface ReaderPreferences {
  fontSize: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
  fontFamily: 'serif' | 'sans' | 'mono';
  lineHeight: 'snug' | 'normal' | 'relaxed' | 'loose';
  paragraphSpacing: 'normal' | 'wide' | 'double';
  themeOverride?: 'void' | 'crimson' | 'abyss' | 'sepia' | 'emerald';
}

export interface KarmaFateNode {
  id: string;
  sourceId: string; // ID of character, location, or thread
  sourceName: string;
  targetId: string; // ID of character, location, or thread
  targetName: string;
  description: string;
  severity: 'Minor' | 'Major' | 'Cosmic';
  type: 'Debt' | 'Boon' | 'Enmity' | 'Destiny';
  status: 'active' | 'resolved';
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

export interface IntakeData {
  // 1. Core Seed
  novelTitle?: string;
  mcName?: string;
  genrePath?: string;
  corePremise?: string;
  desiredPlotDirection?: string;
  storyTags?: string[];

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
  
  // Local-first persistent storage properties
  relationships?: CharacterRelationship[];
  karmaNodes?: KarmaFateNode[];
  readerPreferences?: ReaderPreferences;
  bookmarks?: Bookmark[];

  // Reader experience tracking
  lastReadChapter?: number;
  lastReadScrollPosition?: number;
  lastReadAt?: string;
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
  provider: 'gemini' | 'openrouter' | 'ollama';
  model: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface MultiModelRouting {
  storyMaker: RouteConfig;
  imageGenerator: RouteConfig;
}

