import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import { ContextBlock, ContextBlockKind } from "../types";
import { classifyHistoryBlocks } from "./contextManifest";

export const routeConfigSchema = z.object({
  provider: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().optional(),
  maxOutputTokens: z.number().optional(),
}).passthrough();

export const routingConfigSchema = z.object({
  storyMaker: routeConfigSchema.optional(),
  imageGenerator: routeConfigSchema.optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().optional(),
  maxOutputTokens: z.number().optional(),
}).passthrough().optional();

export const contextBlockSchema = z.object({
  kind: z.enum(["anchor", "recent-full", "recent-summary", "rag", "arc-summary"]),
  chapterNumber: z.number().optional(),
  text: z.string(),
  summaryText: z.string().optional(),
});

const legacyHistoryHeaderPattern =
  /^---\s*(?:IMMEDIATE CONTINUATION ANCHOR(?:\s*\([^)]*\))?|COARSE HISTORY \(ARC SUMMARIES\)|RECOVERED RELEVANT MEMORIES \(OLDER CHAPTERS\)|SLIDING WINDOW OF RECENT NARRATIVE BLOCKS\/DIALOGUE)\s*---\s*(?:\r?\n)?/i;

const legacyHistoryKind = (
  key: ReturnType<typeof classifyHistoryBlocks>[number]["key"],
  text: string,
): ContextBlockKind => {
  if (key === "anchor") return "anchor";
  if (key === "rag") return "rag";
  if (key === "arcSummaries") return "arc-summary";

  const looksLikeFullChapter =
    /^Chapter\s+\d+(?:\s+\(ARCHIVED BLOCKS\))?:\s*(?:\r?\n)/i.test(text)
    && !/^Chapter\s+\d+\s+(?:Pruned\s+)?Summary:/i.test(text);
  return looksLikeFullChapter ? "recent-full" : "recent-summary";
};

const coerceHistoryBlocks = (
  values: Array<string | z.infer<typeof contextBlockSchema>>,
): ContextBlock[] => {
  const classifiedLegacy = classifyHistoryBlocks(
    values.filter((value): value is string => typeof value === "string"),
  );
  let legacyIndex = 0;

  return values.flatMap(value => {
    if (typeof value !== "string") return [value];

    const classified = classifiedLegacy[legacyIndex++];
    const text = value.replace(legacyHistoryHeaderPattern, "").trim();
    if (!text) return [];

    const chapterMatch = value.match(/Chapter\s+(\d+)/i);
    return [{
      kind: legacyHistoryKind(classified.key, text),
      chapterNumber: chapterMatch ? Number(chapterMatch[1]) : undefined,
      text,
    }];
  });
};

export const pastSummariesSchema = z
  .array(z.union([z.string(), contextBlockSchema]))
  .transform(coerceHistoryBlocks);

export const contextEngineSchema = z.enum(["v1", "v2"]);

const memoryProvenanceSchema = z.object({
  sourceChapterNumber: z.number().optional(),
  sourceBlockId: z.string().optional(),
  createdBy: z.string().optional(),
  confidence: z.number().optional(),
  lastMentionedChapter: z.number().optional(),
  supersedesMemoryId: z.string().optional(),
  isUserPinned: z.boolean().optional(),
}).passthrough();

const relevanceStateSchema = z.enum(["active", "warm", "dormant", "archived", "reactivated"]);

const baseCodexEntrySchema = z.object({
  aliases: z.array(z.string()).optional(),
  contextPriority: z.number().optional(),
  authorContextNote: z.string().optional(),
  relevanceState: relevanceStateSchema.optional(),
  firstAppeared: z.number().optional(),
  lastMajorInvolvement: z.number().optional(),
  unresolvedThreads: z.array(z.string()).optional(),
  currentRelevance: z.string().optional(),
  toneMemory: z.string().optional(),
  provenance: memoryProvenanceSchema.optional(),
  pendingEvolution: z.boolean().optional(),
  arcAccumulation: z.string().optional(),
}).passthrough();

const generatedImageSchema = z.object({
  url: z.string().optional(),
  prompt: z.string().optional(),
  chapter: z.number().optional(),
}).passthrough();

const characterSchema = baseCodexEntrySchema.extend({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  description: z.string(),
  relationshipToMC: z.string(),
  status: z.string(),
  powerLevel: z.string().optional(),
  abilities: z.array(z.any()).optional(),
  faction: z.string().optional(),
  imageUrl: z.string().optional(),
  imageHistory: z.array(generatedImageSchema).optional(),
  isBeast: z.boolean().optional(),
  beastProfile: z.any().optional(),
  lastImageChapter: z.number().optional(),
  evolutionReady: z.boolean().optional(),
  evolutionReason: z.string().optional(),
  availableVisualUpdate: z.boolean().optional(),
  voicePresetId: z.string().optional(),
  signatureQuote: z.string().optional(),
  voiceClipUrl: z.string().optional(),
}).passthrough();

const factionSchema = baseCodexEntrySchema.extend({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  alignment: z.string(),
  headquarters: z.string().optional(),
  status: z.string().optional(),
}).passthrough();

const locationSchema = baseCodexEntrySchema.extend({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  realm: z.string().optional(),
  safetyLevel: z.string().optional(),
  imageUrl: z.string().optional(),
  imageHistory: z.array(generatedImageSchema).optional(),
  lastImageChapter: z.number().optional(),
  evolutionReady: z.boolean().optional(),
  evolutionReason: z.string().optional(),
  availableVisualUpdate: z.boolean().optional(),
}).passthrough();

const artifactSchema = baseCodexEntrySchema.extend({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  tier: z.string().optional(),
  currentOwner: z.string().optional(),
  imageUrl: z.string().optional(),
  imageHistory: z.array(generatedImageSchema).optional(),
  lastImageChapter: z.number().optional(),
  evolutionReady: z.boolean().optional(),
  evolutionReason: z.string().optional(),
}).passthrough();

const abilitySchema = baseCodexEntrySchema.extend({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  source: z.string().optional(),
  acquiredChapter: z.number().optional(),
  acquisitionMethod: z.string().optional(),
  cost: z.string().optional(),
  limits: z.string().optional(),
  masteryLevel: z.string().optional(),
  lastUsedChapter: z.number().optional(),
}).passthrough();

const plotThreadSchema = z.object({
  id: z.string().optional(),
  description: z.string(),
  status: z.enum(["active", "resolved"]),
  provenance: memoryProvenanceSchema.optional(),
  originChapter: z.number().optional(),
}).passthrough();

export const storyMemorySchema = z.object({
  powerSystem: z.string(),
  currentPowerStage: z.string(),
  worldRules: z.array(z.string()),
  characters: z.array(characterSchema),
  unresolvedPlotThreads: z.array(z.union([z.string(), plotThreadSchema])),
  resolvedPlotThreads: z.array(z.union([z.string(), plotThreadSchema])),
  memoryWarnings: z.array(z.string()).optional(),
  factions: z.array(factionSchema).optional(),
  locations: z.array(locationSchema).optional(),
  artifacts: z.array(artifactSchema).optional(),
  abilities: z.array(z.union([z.string(), abilitySchema])).optional(),
}).passthrough();

const intakeCharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
  aliases: z.array(z.string()).optional(),
  age: z.string().optional(),
  skinTone: z.string().optional(),
  eyeColor: z.string().optional(),
  powerType: z.string().optional(),
  rankLevel: z.string().optional(),
  role: z.string().optional(),
  connectionToMC: z.string().optional(),
  bio: z.string().optional(),
}).passthrough();

const intakeFactionSchema = z.object({
  id: z.string(),
  name: z.string(),
  aliases: z.array(z.string()).optional(),
  role: z.string().optional(),
  powerLevel: z.string().optional(),
  alignment: z.string().optional(),
  connectionToMC: z.string().optional(),
  description: z.string().optional(),
}).passthrough();

export const intakeDataSchema = z.object({
  novelTitle: z.string().optional(),
  mcName: z.string().optional(),
  genrePath: z.string().optional(),
  corePremise: z.string().optional(),
  desiredPlotDirection: z.string().optional(),
  storyTags: z.array(z.string()).optional(),
  destinedEnding: z.string().optional(),
  estimatedArcs: z.number().optional(),
  
  worldType: z.string().optional(),
  startingLocation: z.string().optional(),
  societyStructure: z.string().optional(),
  dangerLevel: z.string().optional(),
  generalAtmosphere: z.string().optional(),
  
  startingIdentity: z.string().optional(),
  personality: z.string().optional(),
  mainFlaw: z.string().optional(),
  secretAdvantage: z.string().optional(),
  startingWeakness: z.string().optional(),
  moralAlignment: z.string().optional(),
  mcBio: z.string().optional(),
  
  customCharacters: z.array(intakeCharacterSchema).optional(),
  customFactions: z.array(intakeFactionSchema).optional(),
  
  startingPowerConcept: z.string().optional(),
  powerFlavor: z.string().optional(),
  powerPace: z.string().optional(),
  knownRanks: z.string().optional(),
  uniquePath: z.string().optional(),
  
  longTermGoal: z.string().optional(),
  firstMajorConflict: z.string().optional(),
  mainAntagonistPressure: z.string().optional(),
  romanceLevel: z.string().optional(),
  faceSlappingLevel: z.string().optional(),
  comedyLevel: z.string().optional(),
  tournamentArcPreference: z.string().optional(),
  haremPreference: z.string().optional(),
  betrayalLevel: z.string().optional(),
  thingsToAvoid: z.string().optional(),
  mustIncludeElements: z.string().optional(),
  hardcoreFateMode: z.boolean().optional(),
  fatePressure: z.string().optional(),
  
  makeItWorkInstruction: z.string().optional(),
}).passthrough();

export const worldBlueprintSchema = z.object({
  title: z.string(),
  logline: z.string(),
  worldOverview: z.string(),
  startingLocation: z.string(),
  societyStructure: z.string(),
  powerSystemOutline: z.string(),
  mcProfile: z.string(),
  majorFactions: z.array(z.string()),
  initialCharacters: z.array(z.string()),
  majorMysteries: z.array(z.string()),
  firstArcPromise: z.string(),
  tropeRules: z.string(),
  styleBible: z.string(),
  destinedEnding: z.string().optional(),
  estimatedArcs: z.number(),
  unresolvedPlotThreads: z.array(z.string()),
}).passthrough();

export const embedSchema = z.object({
  text: z.string(),
});

export const modelsSchema = z.object({
  provider: z.string(),
  host: z.string().optional(),
  key: z.string().optional(),
});

export const daoInsightSchema = z.object({
  category: z.string().optional(),
  routingConfig: routingConfigSchema,
});

export const generateBlueprintSchema = z.object({
  intake: intakeDataSchema, // Since intake format is complex
  routingConfig: routingConfigSchema,
});

export const generateInitialArcSchema = z.object({
  intake: intakeDataSchema,
  blueprint: worldBlueprintSchema,
  chapterCount: z.union([z.string(), z.number()]).optional(),
  routingConfig: routingConfigSchema,
});

export const chapterGenerationSchema = z.object({
  mcName: z.string(),
  genre: z.string().optional(),
  customPremise: z.string().optional(),
  memory: storyMemorySchema,
  pastSummaries: pastSummariesSchema.optional(),
  currentChapter: z.object({
    number: z.number().optional(),
    title: z.string().optional(),
    premise: z.string().optional(),
  }),
  routingConfig: routingConfigSchema,
  hardcoreFateMode: z.boolean().optional(),
  fatePressure: z.string().optional(),
  pacingDirective: z.string().optional(),
  styleBible: z.string().optional(),
  tropeRules: z.union([z.string(), z.array(z.string())])
    .transform((val) => (Array.isArray(val) ? val.join("\n") : val))
    .optional(),
  storyTags: z.array(z.string()).optional(),
  contextEngine: contextEngineSchema.optional(),
});

export const extractMetadataSchema = z.object({
  chapterNumber: z.number().optional(),
  title: z.string().optional(),
  chapterText: z.string(),
  routingConfig: routingConfigSchema,
});

export const checkConsistencySchema = z.object({
  chapterText: z.string(),
  memory: storyMemorySchema,
  routingConfig: routingConfigSchema,
});

export const repairChapterSchema = z.object({
  chapterText: z.string(),
  memory: storyMemorySchema,
  warnings: z.array(z.string()),
  routingConfig: routingConfigSchema,
});

export const generateNextDirectionsSchema = z.object({
  mcName: z.string(),
  genre: z.string().optional(),
  customPremise: z.string().optional(),
  memory: storyMemorySchema,
  pastSummaries: pastSummariesSchema.optional(),
  routingConfig: routingConfigSchema,
  destinedEnding: z.string().optional(),
  currentArcCount: z.union([z.string(), z.number()]).optional(),
  estimatedArcs: z.number().optional(),
  contextEngine: contextEngineSchema.optional(),
});

export const suggestTagsSchema = z.object({
  premise: z.string(),
  genrePath: z.string().optional(),
  routingConfig: routingConfigSchema,
});

export const steerArcSchema = z.object({
  mcName: z.string(),
  genre: z.string().optional(),
  customPremise: z.string().optional(),
  memory: storyMemorySchema,
  pastSummaries: pastSummariesSchema.optional(),
  currentArcCount: z.union([z.string(), z.number()]).optional(),
  steerDirection: z.string(),
  userCustomDirections: z.string().optional(),
  routingConfig: routingConfigSchema,
  contextEngine: contextEngineSchema.optional(),
});

export const generateCardImageSchema = z.object({
  prompt: z.string(),
  type: z.string().optional(),
  routingConfig: routingConfigSchema,
});

export const generateCultivatorPortraitSchema = z.object({
  image: z.string().optional(),
  description: z.string().optional(),
  daoRank: z.string().optional(),
  daoXp: z.number().optional(),
  powerStage: z.string().optional(),
  equippedArtifact: artifactSchema.optional(),
  routingConfig: routingConfigSchema,
});

export const generateCustomGlossarySchema = z.object({
  storyTitle: z.string().optional(),
  mcName: z.string().optional(),
  genre: z.string().optional(),
  customPremise: z.string().optional(),
  characterNames: z.array(z.string()).optional(),
  factionNames: z.array(z.string()).optional(),
  routingConfig: routingConfigSchema,
});

export const translateChapterSchema = z.object({
  chapterId: z.string().optional(),
  targetLang: z.string(),
  englishText: z.string(),
  glossaryTerms: z.array(z.object({
    term: z.string().optional(),
    definition: z.string().optional(),
  }).passthrough()).optional(),
  routingConfig: routingConfigSchema,
});

export const generateAudioSchema = z.object({
  text: z.string(),
  speakerVoice: z.string(),
});

export const escalateFateSchema = z.object({
  previousFate: z.string(),
  survivalMethod: z.string(),
  currentCodexState: storyMemorySchema,
  routingConfig: routingConfigSchema,
});

// Middleware for validation
export const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const flattened = error.flatten();
        const errorDetail = Object.entries(flattened.fieldErrors)
          .map(([field, errs]) => {
            const errList = Array.isArray(errs) ? errs : [];
            return `${field}: ${errList.join(", ")}`;
          })
          .join("; ");
        console.error("Zod Validation Error on Route:", req.originalUrl, "Payload:", req.body, "Errors:", JSON.stringify(flattened, null, 2));
        return res.status(400).json({
          error: `Invalid request payload: ${errorDetail || error.message}`,
          details: flattened,
        });
      }
      next(error);
    }
  };
};

