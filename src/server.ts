import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { z } from "zod";
import pinoHttp from "pino-http";
import { logger } from "./server/logger";
import { createApiRateLimiter, sanitizedGlobalErrorHandler } from "./server/httpMiddleware";
import {
  validateBody,
  embedSchema,
  modelsSchema,
  daoInsightSchema,
  generateBlueprintSchema,
  generateInitialArcSchema,
  chapterGenerationSchema,
  extractMetadataSchema,
  checkConsistencySchema,
  repairChapterSchema,
  generateNextDirectionsSchema,
  suggestTagsSchema,
  steerArcSchema,
  generateCardImageSchema,
  generateCultivatorPortraitSchema,
  generateCustomGlossarySchema,
  translateChapterSchema,
  generateAudioSchema
} from "./server/schemas";
import { routeTextGeneration, routeImageGeneration, routeTextGenerationStream, ROUTER_PRESETS } from "./aiRouter";
import { ensureString, cleanBlueprint, cleanInitialArc, cleanSteerArc, cleanChapterResponse, filterRelevantEntities, rankRelevantEntities, truncateContextIfNeeded } from "./server/helpers";
import { PROMPTS } from "./server/prompts";

import * as deepl from "deepl-node";
import { apiRouter } from "./server/routes";
import { mediaAssetRouter } from "./server/routes/mediaAssetRouter";
import { persistenceRouter } from "./server/routes/persistenceRouter";
import { captureVercelOidcToken } from "./server/vercelGcpCredential";

dotenv.config();

// DeepL Setup
let translator: deepl.Translator | null = null;
const DEEPL_AUTH_KEY = process.env.DEEPL_AUTH_KEY;
if (DEEPL_AUTH_KEY) {
  translator = new deepl.Translator(DEEPL_AUTH_KEY);
}

function validateEnvironmentOnStartup() {
  if (process.env.NODE_ENV === "production") return;
  const geminiKey = process.env.GEMINI_API_KEY;
  
  logger.info("\n==================================================");
  logger.info("   S E I H O U S E   A P I   C O N F I G U R I N G ");
  logger.info("==================================================");
  
  if (geminiKey && geminiKey !== "MY_GEMINI_API_KEY" && geminiKey.trim() !== "") {
    logger.info("🟢 [Server Status] SEIHouse core engine active (Server-managed keys enabled).");
  } else {
    logger.info("ℹ️ [Server Status] Waiting for platform-managed cloud endpoints initialization...");
  }
  logger.info("==================================================\n");
}

const app = express();
app.use(pinoHttp({ logger }));
app.use(captureVercelOidcToken);

// Helper to extract custom API credentials/configurations passed securely by the client from standard headers
function getCustomKeys(req: express.Request) {
  return {
    geminiApiKey: (req.header("x-gemini-key") as string) || undefined,
    openrouterApiKey: (req.header("x-openrouter-key") as string) || undefined,
    ollamaHost: (req.header("x-ollama-host") as string) || undefined,
    deepinfraApiKey: (req.header("x-deepinfra-key") as string) || undefined,
  };
}
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use("/api", createApiRateLimiter());

// The media foundation authenticates before its route-scoped body parsers.
// This also keeps raw application/json exports available to express.raw().
app.use(mediaAssetRouter);

// Increase payload sizes
app.use(express.json({ limit: "20mb" }));
app.use(persistenceRouter);

// ==========================================
// API ROUTES
// ==========================================

// 0. Health Check route
// 0. Get available router presets
// 0.2. Fetch dynamic list of models from providers (OpenRouter, Ollama, Gemini)
// 0.2. Fetch dynamic list of models from providers (OpenRouter, Ollama, Gemini)
// 0.1. Get API configuration status (safety flags check, no key content is leaked)
// New Endpoint: Insights from the Dao custom generator
// 0.5. Generate World Blueprint
// 1. Initial story arc generation
// 2. Generate a single chapter scenically with streaming output
// 2. Generate a single chapter scenically
// 2.1 Extract Metadata from Chapters
// 2.2.1 Repair Chapter Stream
// 2.2 Consistency Guard Check
// 2.5 Generate Next Story Directions based on memories
// 2.75. Dynamically suggest story tags based on custom novel premise
// 3. Steer a finished story arc into a new Direction / Volume
// 4. Generate Portrait or Scenery Card Illustration
// 4.5 Generate Cultivator Portrait from uploaded image and description
// 5. Generate Story-Specific Glossary terms and lore definitions
// 6. Translate Chapter
// 7. Generate Audio (TTS) for the Voice Edition

app.use(apiRouter);
app.use(sanitizedGlobalErrorHandler);

// ==========================================
// VITE CLIENT DEV SERVER INTEGRATION
// ==========================================

async function startServer() {
  // Validate standard environment keys on startup
  validateEnvironmentOnStartup();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    if (process.env.NODE_ENV !== "production") {
      console.log(`Server running on http://localhost:${PORT}`);
    }
  });
}

startServer();
