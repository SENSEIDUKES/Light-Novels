import express from "express";
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
} from "../schemas";
import { routeTextGeneration, routeImageGeneration, routeTextGenerationStream, ROUTER_PRESETS } from "../../aiRouter";
import { ensureString, isValidOllamaHost, cleanBlueprint, cleanInitialArc, cleanSteerArc, cleanChapterResponse, filterRelevantEntities, rankRelevantEntities, truncateContextIfNeeded } from "../helpers";
import { PROMPTS } from "../prompts";
export const systemRouter = express.Router();
systemRouter.get("/__health", (req, res) => {
  res.json({
    status: "ok",
    version: process.env.npm_package_version || "1.0.0",
    services: {
      gemini: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY",
      openrouter: !!process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== "MY_OPENROUTER_API_KEY",
      deepl: !!process.env.DEEPL_AUTH_KEY,
    }
  });
});
systemRouter.get("/api/router-presets", (req, res) => {
  res.json(ROUTER_PRESETS);
});
systemRouter.post("/api/embed", validateBody(embedSchema), async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Missing text payload" });
    
    const customKeys = getCustomKeys(req);
    const apiKey = customKeys?.geminiApiKey || process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY environment variable is not configured for Vector generation.");
    }
    
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });
    
    const response = await ai.models.embedContent({
      model: "gemini-embedding-2-preview",
      contents: text,
      config: {
        outputDimensionality: 256,
        taskType: "RETRIEVAL_DOCUMENT"
      }
    });
    
    const embedValues = response.embeddings?.[0]?.values || (response as any).embedding?.values;
    if (!embedValues) {
      throw new Error("No embedding values returned from Gemini model.");
    }
    
    return res.json({ embedding: embedValues });
  } catch (error: any) {
    console.error("Error generating vector embedding:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});
systemRouter.post("/api/models", validateBody(modelsSchema), async (req, res) => {
  const { provider, host, key } = req.body;
  try {
    if (provider === "openrouter") {
      const resp = await fetch("https://openrouter.ai/api/v1/models");
      if (!resp.ok) {
        throw new Error(`OpenRouter returned status ${resp.status}`);
      }
      const json: any = await resp.json();
      if (json && Array.isArray(json.data)) {
        const ids = json.data.map((m: any) => m.id);
        return res.json({ models: ids });
      }
      throw new Error("Invalid response format from OpenRouter");
    }
    
    if (provider === "ollama") {
      if (host && !isValidOllamaHost(host)) {
        throw new Error("Invalid Ollama host provided. Only local connections are permitted.");
      }
      const ollamaHost = host || process.env.OLLAMA_HOST || "http://localhost:11434";
      const resp = await fetch(`${ollamaHost}/api/tags`);
      if (!resp.ok) {
        throw new Error(`Ollama returned status ${resp.status}`);
      }
      const json: any = await resp.json();
      if (json && Array.isArray(json.models)) {
        const names = json.models.map((m: any) => m.name);
        return res.json({ models: names });
      }
      throw new Error("Invalid response format from Ollama");
    }

    if (provider === "gemini") {
      const apiKey = key || process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.json({
          models: [
            "gemini-3.1-flash-lite-image",
            "google/gemini-2.5-flash-lite",
            "gemini-2.5-flash-image",
            "google/gemini-3.1-flash-lite-image-preview",
            "google/gemini-3.1-flash-lite-preview",
            "gemini-3.5-flash",
            "gemini-3.5-pro",
            "google/gemini-3.1-flash-image",
            "gemini-2.5-flash",
            "gemini-2.5-pro",
            "gemini-2.0-flash",
            "gemini-2.0-flash-lite",
            "gemini-2.0-pro-exp",
            "gemini-2.0-flash-thinking-exp",
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-1.5-flash-8b",
            "gemini-1.0-pro"
          ]
        });
      }
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (!resp.ok) {
        throw new Error(`Gemini API returned status ${resp.status}`);
      }
      const json: any = await resp.json();
      if (json && Array.isArray(json.models)) {
        const names = json.models
          .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
          .map((m: any) => m.name.replace(/^models\//, ""));
        return res.json({ models: names });
      }
      throw new Error("Invalid response format from Gemini");
    }

    return res.status(400).json({ error: "Unsupported provider" });
  } catch (error: any) {
    console.error(`Error fetching dynamic models for ${provider}:`, error);
    // Graceful fallback to static pre-defined lists
    let fallback: string[] = [];
    if (provider === "openrouter") {
      fallback = ROUTER_PRESETS.storyMaker.openrouter;
    } else if (provider === "ollama") {
      fallback = ROUTER_PRESETS.storyMaker.ollama;
    } else {
      fallback = ROUTER_PRESETS.storyMaker.gemini;
    }
    return res.json({ models: fallback, isFallback: true, error: error.message });
  }
});
systemRouter.get("/api/config-status", (req, res) => {
  const hasServerGemini = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY" && process.env.GEMINI_API_KEY.trim() !== "");
  const hasServerOpenRouter = !!(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== "MY_OPENROUTER_API_KEY" && process.env.OPENROUTER_API_KEY.trim() !== "");
  res.json({
    hasServerGemini,
    hasServerOpenRouter,
  });
});

// Helper to extract custom API credentials/configurations
function getCustomKeys(req: any) {
  return {
    geminiApiKey: (req.header("x-gemini-key") as string) || undefined,
    openrouterApiKey: (req.header("x-openrouter-key") as string) || undefined,
    ollamaHost: (req.header("x-ollama-host") as string) || undefined,
    deepinfraApiKey: (req.header("x-deepinfra-key") as string) || undefined,
  };
}

