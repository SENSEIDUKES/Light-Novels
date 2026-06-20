export interface StreamingChapter {
  number: number;
  content: string;
  blocks?: any[];
}

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  preferredLanguage: string;
  defaultTranslationLanguage: string;
  savedStoryCount: number;
  activeStories: string[];
  inactiveStories: string[];
  joinedDate: string;
  updatedAt: string;
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

export interface Character {
  id: string;
  name: string;
  role: string;
  description: string;
  relationshipToMC: string;
  status: 'alive' | 'deceased' | 'unknown' | 'ascended';
  powerLevel?: string;
  abilities?: string[];
  faction?: string;
  imageUrl?: string;
  isBeast?: boolean;
  beastProfile?: BeastSonicProfile;
}

export interface Faction {
  id: string;
  name: string;
  description: string;
  alignment: 'Righteous' | 'Demonic' | 'Neutral' | 'Mysterious' | string;
  headquarters?: string;
  status?: 'Active' | 'Destroyed' | 'Fractured' | string;
}

export interface Location {
  id: string;
  name: string;
  description: string;
  realm?: string;
  safetyLevel?: 'Safe' | 'Dangerous' | 'Lethal' | string;
  imageUrl?: string;
}

export interface Artifact {
  id: string;
  name: string;
  description: string;
  tier?: 'Mortal' | 'Earth' | 'Heaven' | 'Primordial' | string;
  currentOwner?: string;
  imageUrl?: string;
}

export interface StoryMemory {
  powerSystem: string;
  currentPowerStage: string;
  worldRules: string[];
  characters: Character[];
  unresolvedPlotThreads: string[];
  resolvedPlotThreads: string[];
  
  // Living Codex expansions
  factions?: Faction[];
  locations?: Location[];
  artifacts?: Artifact[];
  abilities?: string[]; // MC-specific learned arts & skills
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
}

export interface StoryBlock {
  id: string;
  type: string;
  text: string;
  metadata?: StoryBlockMetadata;
}

export interface ChapterContent {
  storyId: string;
  chapterNumber: number;
  generatedContent: string;
  blocks?: StoryBlock[];
  summary?: string;
  statsChangeMessage?: string;
  cuePayload?: {
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
  };
  translations?: {
    [langCode: string]: {
      title: string;
      content: string;
      translatedAt: number;
    };
  };
}

export interface Chapter {
  number: number;
  title: string;
  premise: string;
  status: 'unlocked' | 'generating' | 'read' | 'unread';
  generatedContent?: string; // Optional, only populated when currently viewed
  blocks?: StoryBlock[];
  hasContent?: boolean; // Indicates if the content was generated and stored
  summary?: string; // Optional
  embedding?: number[]; // Optional vector embedding for RAG continuity searches
  statsChangeMessage?: string;
  cuePayload?: any;
  translations?: {
    [langCode: string]: {
      title: string;
      content: string;
      translatedAt: number;
    };
  };
}

export interface StoryArc {
  title: string;
  chapters: Chapter[];
  isCompleted: boolean;
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
  intake?: IntakeData;
  blueprint?: WorldBlueprint;
  
  // Local-first persistent storage properties
  relationships?: CharacterRelationship[];
  karmaNodes?: KarmaFateNode[];
  readerPreferences?: ReaderPreferences;
  bookmarks?: Bookmark[];
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

export interface RouteConfig {
  provider: 'gemini' | 'openrouter' | 'ollama';
  model: string;
}

export interface MultiModelRouting {
  storyMaker: RouteConfig;
  imageGenerator: RouteConfig;
}

