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

export interface Chapter {
  number: number;
  title: string;
  premise: string;
  status: 'unlocked' | 'generating' | 'read' | 'unread';
  generatedContent?: string;
  summary?: string;
  statsChangeMessage?: string;
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

export interface StoryWorld {
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
  
  // Local-first persistent storage properties
  relationships?: CharacterRelationship[];
  karmaNodes?: KarmaFateNode[];
  readerPreferences?: ReaderPreferences;
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

