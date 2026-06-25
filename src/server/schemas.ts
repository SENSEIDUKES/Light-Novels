import { z } from "zod";
import { Request, Response, NextFunction } from "express";

export const routingConfigSchema = z.object({
  provider: z.string().optional(),
  model: z.string().optional(),
}).optional();

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
  intake: z.any(), // Since intake format is complex
  routingConfig: routingConfigSchema,
});

export const generateInitialArcSchema = z.object({
  intake: z.any(),
  blueprint: z.any(),
  chapterCount: z.union([z.string(), z.number()]).optional(),
  routingConfig: routingConfigSchema,
});

export const chapterGenerationSchema = z.object({
  mcName: z.string(),
  genre: z.string().optional(),
  customPremise: z.string().optional(),
  memory: z.any(),
  pastSummaries: z.array(z.string()).optional(),
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
});

export const extractMetadataSchema = z.object({
  chapterNumber: z.number().optional(),
  title: z.string().optional(),
  chapterText: z.string(),
  routingConfig: routingConfigSchema,
});

export const checkConsistencySchema = z.object({
  chapterText: z.string(),
  memory: z.any(),
  routingConfig: routingConfigSchema,
});

export const generateNextDirectionsSchema = z.object({
  mcName: z.string(),
  genre: z.string().optional(),
  customPremise: z.string().optional(),
  memory: z.any(),
  pastSummaries: z.array(z.string()).optional(),
  routingConfig: routingConfigSchema,
  destinedEnding: z.string().optional(),
  currentArcCount: z.union([z.string(), z.number()]).optional(),
  estimatedArcs: z.number().optional(),
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
  memory: z.any(),
  pastSummaries: z.array(z.string()).optional(),
  currentArcCount: z.union([z.string(), z.number()]).optional(),
  steerDirection: z.string(),
  userCustomDirections: z.string().optional(),
  routingConfig: routingConfigSchema,
});

export const generateCardImageSchema = z.object({
  prompt: z.string(),
  type: z.string().optional(),
  routingConfig: routingConfigSchema,
});

export const generateCultivatorPortraitSchema = z.object({
  image: z.string(),
  description: z.string().optional(),
  daoRank: z.string().optional(),
  daoXp: z.number().optional(),
  powerStage: z.string().optional(),
  equippedArtifact: z.any().optional(),
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
  glossaryTerms: z.array(z.any()).optional(),
  routingConfig: routingConfigSchema,
});

export const generateAudioSchema = z.object({
  text: z.string(),
  speakerVoice: z.string(),
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

