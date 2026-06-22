import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { routeTextGeneration, routeImageGeneration, routeTextGenerationStream, ROUTER_PRESETS } from "./aiRouter";
import { ensureString, cleanBlueprint, cleanInitialArc, cleanSteerArc, cleanChapterResponse, filterRelevantEntities, rankRelevantEntities } from "./src/server/helpers";
import { PROMPTS } from "./src/server/prompts";

import * as deepl from "deepl-node";

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
  
  console.log("\n==================================================");
  console.log("   S E I H O U S E   A P I   C O N F I G U R I N G ");
  console.log("==================================================");
  
  if (geminiKey && geminiKey !== "MY_GEMINI_API_KEY" && geminiKey.trim() !== "") {
    console.log("🟢 [Server Status] SEIHouse core engine active (Server-managed keys enabled).");
  } else {
    console.log("ℹ️ [Server Status] Waiting for platform-managed cloud endpoints initialization...");
  }
  console.log("==================================================\n");
}

const app = express();

// Helper to extract custom API credentials/configurations passed securely by the client from standard headers
function getCustomKeys(req: express.Request) {
  return {
    geminiApiKey: (req.header("x-gemini-key") as string) || undefined,
    openrouterApiKey: (req.header("x-openrouter-key") as string) || undefined,
    ollamaHost: (req.header("x-ollama-host") as string) || undefined,
  };
}
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Increase payload sizes
app.use(express.json({ limit: "20mb" }));

// ==========================================
// API ROUTES
// ==========================================

// 0. Get available router presets
app.get("/api/router-presets", (req, res) => {
  res.json(ROUTER_PRESETS);
});

// 0.2. Fetch dynamic list of models from providers (OpenRouter, Ollama, Gemini)
app.post("/api/embed", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Missing text payload" });
    
    // We enforce Gemini for embeddings as it provides state-of-the-art vector embeddings natively
    // We use getCustomKeys to allow overriding if they placed a valid key.
    const customKeys = getCustomKeys(req);
    const apiKey = customKeys?.geminiApiKey || process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY environment variable is not configured for Vector generation.");
    }
    
    // Simple fetch directly to gemini API for text-embedding-004
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/text-embedding-004",
        content: { parts: [{ text }] }
      })
    });
    
    if (!response.ok) {
      const errBase = await response.text();
      throw new Error(`Embedding generation failed: ${response.status} - ${errBase}`);
    }
    
    const data = await response.json();
    return res.json({ embedding: data.embedding.values });
  } catch (error: any) {
    console.error("Error generating vector embedding:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 0.2. Fetch dynamic list of models from providers (OpenRouter, Ollama, Gemini)
app.post("/api/models", async (req, res) => {
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
            "google/gemini-2.5-flash-lite",
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

// 0.1. Get API configuration status (safety flags check, no key content is leaked)
app.get("/api/config-status", (req, res) => {
  const hasServerGemini = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY" && process.env.GEMINI_API_KEY.trim() !== "");
  const hasServerOpenRouter = !!(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== "MY_OPENROUTER_API_KEY" && process.env.OPENROUTER_API_KEY.trim() !== "");
  res.json({
    hasServerGemini,
    hasServerOpenRouter,
  });
});

// 0.5. Generate World Blueprint
app.post("/api/generate-blueprint", async (req, res) => {
  try {
    const { intake, routingConfig } = req.body;
    
    if (!intake) {
      return res.status(400).json({ error: "Missing required fields: intake" });
    }

    const data = await routeTextGeneration(
      "storyMaker",
      PROMPTS.blueprint.system,
      PROMPTS.blueprint.userPrompt(JSON.stringify(intake, null, 2)),
      "generate-blueprint",
      routingConfig,
      getCustomKeys(req)
    );
    return res.json(cleanBlueprint(data));
  } catch (error: any) {
    console.error("Error generating blueprint:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 1. Initial story arc generation
app.post("/api/generate-initial-arc", async (req, res) => {
  try {
    const { intake, blueprint, chapterCount, routingConfig } = req.body;
    
    if (!intake || !blueprint) {
      return res.status(400).json({ error: "Missing required fields: intake, blueprint" });
    }

    const count = Math.min(parseInt(chapterCount) || 10, 10);

    const data = await routeTextGeneration(
      "storyMaker",
      PROMPTS.initialArc.system,
      PROMPTS.initialArc.userPrompt(
        JSON.stringify(blueprint, null, 2),
        JSON.stringify(blueprint.powerSystemOutline),
        blueprint.unresolvedPlotThreads || [],
        count
      ),
      "generate-initial-arc",
      routingConfig,
      getCustomKeys(req)
    );
    return res.json(cleanInitialArc(data));
  } catch (error: any) {
    console.error("Error generating initial arc:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 2. Generate a single chapter scenically with streaming output
app.post("/api/generate-chapter-stream", async (req, res) => {
  try {
    const { 
      mcName, 
      genre, 
      customPremise, 
      memory, 
      pastSummaries, 
      currentChapter,
      routingConfig
    } = req.body;

    if (!mcName || !currentChapter || !memory) {
      return res.status(400).json({ error: "Missing required fields for chapter generation" });
    }

    const pastSummariesStr = pastSummaries && pastSummaries.length > 0 
      ? pastSummaries.join("\n") 
      : "This is the very first chapter of the story arc! Set the scene dramatically.";

    const lastSummary = pastSummaries && pastSummaries.length > 0 ? pastSummaries[pastSummaries.length - 1] : undefined;

    const currentChapterNum = currentChapter.number || 1;
    const formattedThreads = (memory.unresolvedPlotThreads || []).map((t: any) => {
      if (typeof t === 'string') return t;
      if (t && t.description) {
        if (typeof t.originChapter === 'number' && currentChapterNum > t.originChapter) {
          const age = currentChapterNum - t.originChapter;
          if (age >= 1) {
            return `${t.description} (Thread open for ${age} chapter${age > 1 ? 's' : ''} — pay it off or deepen it!)`;
          }
        }
        return t.description;
      }
      return String(t);
    });

    const memoryJsonStr = JSON.stringify({
      powerSystem: memory.powerSystem,
      currentPowerStage: memory.currentPowerStage,
      worldRules: memory.worldRules,
      unresolvedPlotThreads: formattedThreads,
      characters: rankRelevantEntities(memory.characters, mcName, lastSummary, currentChapter.premise, [memory.unresolvedPlotThreads?.join(" "), customPremise]),
      factions: rankRelevantEntities(memory.factions, mcName, lastSummary, currentChapter.premise, [memory.unresolvedPlotThreads?.join(" "), customPremise]),
      locations: rankRelevantEntities(memory.locations, mcName, lastSummary, currentChapter.premise, [memory.unresolvedPlotThreads?.join(" "), customPremise]),
      artifacts: rankRelevantEntities(memory.artifacts, mcName, lastSummary, currentChapter.premise, [memory.unresolvedPlotThreads?.join(" "), customPremise])
    }, null, 2);

    const systemInstruction = PROMPTS.chapter.system;
    const userPrompt = PROMPTS.chapter.userPrompt(
      currentChapter.number,
      currentChapter.title,
      currentChapter.premise,
      mcName,
      genre,
      customPremise,
      memoryJsonStr,
      pastSummariesStr,
      true
    );

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await routeTextGenerationStream(
      "storyMaker",
      systemInstruction,
      userPrompt,
      "generate-chapter-stream",
      routingConfig,
      getCustomKeys(req)
    );

    for await (const chunk of stream) {
      if (chunk) {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.error("Error generating chapter stream:", error);
    res.write(`data: ${JSON.stringify({ error: error.message || "Internal server error" })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  }
});

// 2. Generate a single chapter scenically
app.post("/api/generate-chapter", async (req, res) => {
  try {
    const { 
      mcName, 
      genre, 
      customPremise, 
      memory, 
      pastSummaries, 
      currentChapter,
      routingConfig
    } = req.body;

    if (!mcName || !currentChapter || !memory) {
      return res.status(400).json({ error: "Missing required fields for chapter generation" });
    }

    const pastSummariesStr = pastSummaries && pastSummaries.length > 0 
      ? pastSummaries.join("\n") 
      : "This is the very first chapter of the story arc! Set the scene dramatically.";

    const lastSummary = pastSummaries && pastSummaries.length > 0 ? pastSummaries[pastSummaries.length - 1] : undefined;

    const currentChapterNum = currentChapter.number || 1;
    const formattedThreads = (memory.unresolvedPlotThreads || []).map((t: any) => {
      if (typeof t === 'string') return t;
      if (t && t.description) {
        if (typeof t.originChapter === 'number' && currentChapterNum > t.originChapter) {
          const age = currentChapterNum - t.originChapter;
          if (age >= 1) {
            return `${t.description} (Thread open for ${age} chapter${age > 1 ? 's' : ''} — pay it off or deepen it!)`;
          }
        }
        return t.description;
      }
      return String(t);
    });

    const memoryJsonStr = JSON.stringify({
      powerSystem: memory.powerSystem,
      currentPowerStage: memory.currentPowerStage,
      worldRules: memory.worldRules,
      unresolvedPlotThreads: formattedThreads,
      characters: rankRelevantEntities(memory.characters, mcName, lastSummary, currentChapter.premise, [memory.unresolvedPlotThreads?.join(" "), customPremise]),
      factions: rankRelevantEntities(memory.factions, mcName, lastSummary, currentChapter.premise, [memory.unresolvedPlotThreads?.join(" "), customPremise]),
      locations: rankRelevantEntities(memory.locations, mcName, lastSummary, currentChapter.premise, [memory.unresolvedPlotThreads?.join(" "), customPremise]),
      artifacts: rankRelevantEntities(memory.artifacts, mcName, lastSummary, currentChapter.premise, [memory.unresolvedPlotThreads?.join(" "), customPremise])
    }, null, 2);

    const systemInstruction = PROMPTS.chapter.nonStreamSystem;
    const userPrompt = PROMPTS.chapter.userPrompt(
      currentChapter.number,
      currentChapter.title,
      currentChapter.premise,
      mcName,
      genre,
      customPremise,
      memoryJsonStr,
      pastSummariesStr,
      false
    );

    const data = await routeTextGeneration(
      "storyMaker",
      systemInstruction,
      userPrompt,
      "generate-chapter",
      routingConfig,
      getCustomKeys(req)
    );
    return res.json(cleanChapterResponse(data));
  } catch (error: any) {
    console.error("Error generating chapter:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 2.1 Extract Metadata from Chapters
app.post("/api/extract-chapter-metadata", async (req, res) => {
  try {
    const { chapterNumber, title, chapterText, routingConfig } = req.body;
    
    if (!chapterText) {
      return res.status(400).json({ error: "Missing chapter text" });
    }

    const systemInstruction = PROMPTS.extractMetadata.system;
    const userPrompt = PROMPTS.extractMetadata.userPrompt(chapterNumber, title || "Unknown", chapterText);

    const metadataSchema = {
      type: "OBJECT",
      properties: {
        summary: { type: "STRING" },
        arcSummary: { type: "STRING" },
        statsChangeMessage: { type: "STRING" },
        cuePayload: {
          type: "OBJECT",
          properties: {
            intensity: { type: "NUMBER" },
            tension: { type: "NUMBER" },
            powerShift: { type: "NUMBER" },
            emotion: { type: "STRING" },
            danger: { type: "NUMBER" },
            mysticism: { type: "NUMBER" },
            element: { type: "STRING" },
            relationshipShift: { type: "NUMBER" },
            signature: { type: "STRING" }
          }
        },
        memoryUpdates: {
          type: "OBJECT",
          properties: {
            currentPowerStage: { type: "STRING" },
            newCharacters: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING"}, role: { type: "STRING"}, description: { type: "STRING"}, relationshipToMC: { type: "STRING"}, status: { type: "STRING"}, powerLevel: { type: "STRING"}, faction: { type: "STRING"} } } },
            characterStatusUpdates: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING"}, newStatus: { type: "STRING"}, newRelationship: { type: "STRING"}, newPowerLevel: { type: "STRING"}, descriptionAppend: { type: "STRING"} } } },
            relationshipUpdates: { type: "ARRAY", items: { type: "OBJECT", properties: { sourceName: { type: "STRING" }, targetName: { type: "STRING" }, affinityDelta: { type: "NUMBER" }, threatDelta: { type: "NUMBER" }, reason: { type: "STRING" } } } },
            newUnresolvedPlotThreads: { type: "ARRAY", items: { type: "STRING" } },
            resolvedPlotThreads: { type: "ARRAY", items: { type: "STRING" } },
            newFactions: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING"}, description: { type: "STRING"}, alignment: { type: "STRING"}, headquarters: { type: "STRING"}, status: { type: "STRING"} } } },
            factionUpdates: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING"}, statusOverride: { type: "STRING"}, descriptionAppend: { type: "STRING"} } } },
            newLocations: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING"}, description: { type: "STRING"}, realm: { type: "STRING"}, safetyLevel: { type: "STRING"} } } },
            locationUpdates: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING"}, safetyLevelOverride: { type: "STRING"}, descriptionAppend: { type: "STRING"} } } },
            newArtifacts: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING"}, description: { type: "STRING"}, tier: { type: "STRING"}, currentOwner: { type: "STRING"} } } },
            artifactUpdates: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING"}, newOwner: { type: "STRING"}, descriptionAppend: { type: "STRING"} } } },
            newMCAbilities: { type: "ARRAY", items: { type: "STRING" } }
          }
        }
      },
      required: ["summary", "arcSummary", "statsChangeMessage", "memoryUpdates"]
    };

    const data = await routeTextGeneration(
      "storyMaker",
      systemInstruction,
      userPrompt,
      "extract-chapter-metadata",
      routingConfig,
      getCustomKeys(req),
      metadataSchema
    );

    return res.json(cleanChapterResponse(data));
  } catch (error: any) {
    console.error("Error extracting memory updates:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 2.2 Consistency Guard Check
app.post("/api/check-consistency", async (req, res) => {
  try {
    const { chapterText, memory, routingConfig } = req.body;
    if (!chapterText || !memory) {
      return res.status(400).json({ error: "Missing chapterText or memory payload" });
    }

    // Use json structure to pass to the prompt
    const memoryStr = JSON.stringify(memory, null, 2);

    const systemInstruction = PROMPTS.consistencyGuard.system;
    const userPrompt = PROMPTS.consistencyGuard.userPrompt(chapterText, memoryStr);

    const schema = {
      type: "OBJECT",
      properties: {
        warnings: {
          type: "ARRAY",
          items: { type: "STRING" }
        }
      },
      required: ["warnings"]
    };

    const data = await routeTextGeneration(
      "storyMaker",
      systemInstruction,
      userPrompt,
      "check-consistency",
      routingConfig,
      getCustomKeys(req),
      schema
    );

    return res.json({ warnings: data.warnings || [] });
  } catch (error: any) {
    console.error("Error in consistency guard:", error);
    return res.status(500).json({ error: error.message || "Consistency check failed" });
  }
});

// 2.5 Generate Next Story Directions based on memories
app.post("/api/generate-next-directions", async (req, res) => {
  const { 
    mcName, 
    genre, 
    customPremise, 
    memory, 
    pastSummaries, 
    routingConfig 
  } = req.body;

  try {
    if (!mcName || !memory) {
      return res.status(400).json({ error: "Missing required fields for directions generation" });
    }

    const pastSummariesStr = pastSummaries && pastSummaries.length > 0 
      ? pastSummaries.join("\n") 
      : "Starting fresh in the immortal matrix.";
      
    const lastSummary = pastSummaries && pastSummaries.length > 0 ? pastSummaries[pastSummaries.length - 1] : undefined;

    const memoryJsonStr = JSON.stringify({
      powerSystem: memory.powerSystem,
      currentPowerStage: memory.currentPowerStage,
      worldRules: memory.worldRules,
      unresolvedPlotThreads: memory.unresolvedPlotThreads,
      characters: rankRelevantEntities(memory.characters, mcName, lastSummary, "", [memory.unresolvedPlotThreads?.join(" "), customPremise]),
      factions: rankRelevantEntities(memory.factions, mcName, lastSummary, "", [memory.unresolvedPlotThreads?.join(" "), customPremise]),
      locations: rankRelevantEntities(memory.locations, mcName, lastSummary, "", [memory.unresolvedPlotThreads?.join(" "), customPremise]),
      artifacts: rankRelevantEntities(memory.artifacts, mcName, lastSummary, "", [memory.unresolvedPlotThreads?.join(" "), customPremise]),
    }, null, 2);

    const systemInstruction = PROMPTS.directions.system;
    const userPrompt = PROMPTS.directions.userPrompt(
      mcName,
      genre,
      customPremise,
      memoryJsonStr,
      pastSummariesStr
    );

    const data = await routeTextGeneration(
      "storyMaker",
      systemInstruction,
      userPrompt,
      "generate-next-directions",
      routingConfig,
      getCustomKeys(req)
    );
    return res.json(data);
  } catch (error: any) {
    console.warn("Directions generation failed. Serving celestial fallback directions:", error);
    const mc = mcName || "Han Feng";
    const fallbackDirections = [
      {
        title: "Demonic Ascension Clash",
        directionType: "darker",
        description: `${mc} is lured into an ancient blood trap by a rival sect. To survive, they must embrace a dark, taboo demonic mantra, threatening their humanity for supreme martial might.`
      },
      {
        title: "The Celestial Alchemist Tournament",
        directionType: "action",
        description: `A grand gathering of master refinery sects is announced. ${mc} enters with their unique crucible to slap down arrogant young masters and claim the Primordial Heart Pill.`
      },
      {
        title: "Jade Beauty of the Snow Pavilions",
        directionType: "romance",
        description: `An ancient promise binds ${mc} to the cold-hearted Snow Sect Princess. To break her curse, they must cultivate yin-yang fusion, sparking bitter enmity with her family's chosen son.`
      },
      {
        title: "The System Glitch: Shattered Rules",
        directionType: "twist",
        description: `Under a cosmic eclipse, the LitRPG status window begins printing corrupt alerts, revealing an ancient sentient entity hiding within the core code of ${mc}'s system.`
      },
      {
        title: "Shattering Upper Plane Barriers",
        directionType: "new location",
        description: `${mc} triggers a spatial ascension portal, leaving the mortal realm behind and entering a lethal higher-tier celestial court where their relative power scales are reset.`
      }
    ];
    return res.json({ directions: fallbackDirections, isFallback: true });
  }
});

// 3. Steer a finished story arc into a new Direction / Volume
app.post("/api/steer-arc", async (req, res) => {
  try {
    const { 
      mcName, 
      genre, 
      customPremise, 
      memory, 
      pastSummaries, 
      currentArcCount,
      steerDirection, // e.g. "darker", "romance", "action", "twist", "new location", "continue"
      userCustomDirections,
      routingConfig
    } = req.body;

    if (!mcName || !memory || !steerDirection) {
      return res.status(400).json({ error: "Missing required steering fields" });
    }

    const count = 10; // Generate next 10 chapters max to maintain excellent quality and prevent drift
    const startNum = (parseInt(currentArcCount) || 10) + 1;

    const pastSummariesStr = pastSummaries && pastSummaries.length > 0 
      ? pastSummaries.join("\n") 
      : "No previous record. Use your creativity to extend smoothly.";

    const lastSummary = pastSummaries && pastSummaries.length > 0 ? pastSummaries[pastSummaries.length - 1] : undefined;

    const memoryJsonStr = JSON.stringify({
      currentPowerStage: memory.currentPowerStage,
      powerSystem: memory.powerSystem,
      unresolvedPlotThreads: memory.unresolvedPlotThreads,
      resolvedPlotThreads: memory.resolvedPlotThreads,
      characters: rankRelevantEntities(memory.characters, mcName, lastSummary, steerDirection, [userCustomDirections, memory.unresolvedPlotThreads?.join(" "), customPremise]),
      factions: rankRelevantEntities(memory.factions, mcName, lastSummary, steerDirection, [userCustomDirections, memory.unresolvedPlotThreads?.join(" "), customPremise]),
      locations: rankRelevantEntities(memory.locations, mcName, lastSummary, steerDirection, [userCustomDirections, memory.unresolvedPlotThreads?.join(" "), customPremise]),
      artifacts: rankRelevantEntities(memory.artifacts, mcName, lastSummary, steerDirection, [userCustomDirections, memory.unresolvedPlotThreads?.join(" "), customPremise])
    }, null, 2);

    const data = await routeTextGeneration(
      "storyMaker",
      PROMPTS.steer.system,
      PROMPTS.steer.userPrompt(
        startNum,
        mcName,
        genre,
        customPremise,
        steerDirection,
        userCustomDirections,
        memoryJsonStr,
        pastSummariesStr,
        count
      ),
      "steer-arc",
      routingConfig,
      getCustomKeys(req)
    );
    return res.json(cleanSteerArc(data));
  } catch (error: any) {
    console.error("Error steering arc:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 4. Generate Portrait or Scenery Card Illustration
app.post("/api/generate-card-image", async (req, res) => {
  const { prompt, type, routingConfig } = req.body;
  try {
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt parameter for image generation" });
    }
    const result = await routeImageGeneration(prompt, type, routingConfig, getCustomKeys(req));
    // Provide backwards compatible property and new array
    return res.json({ ...result, imageUrl: result.imageUrls?.[0] });
  } catch (error: any) {
    console.error("Error generating card image:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 5. Generate Story-Specific Glossary terms and lore definitions
app.post("/api/generate-custom-glossary", async (req, res) => {
  const { storyTitle, mcName, genre, customPremise, characterNames, factionNames, routingConfig } = req.body;
  try {
    const data = await routeTextGeneration(
      "storyMaker",
      PROMPTS.glossary.system,
      PROMPTS.glossary.userPrompt(
        storyTitle,
        mcName,
        genre,
        customPremise,
        JSON.stringify(characterNames || []),
        JSON.stringify(factionNames || [])
      ),
      "generate-custom-glossary",
      routingConfig,
      getCustomKeys(req)
    );
    return res.json(data);
  } catch (error: any) {
    console.warn("Glossary generation failed, serving celestial fallback glossary:", error);
    
    const fallbackTerms = [
      {
        term: `${mcName || "Han Feng"}'s Primordial Crimson Meridian (太初精髓)`,
        category: "Concept",
        definition: `A legendary sealed energetic pathway within ${mcName || "Han Feng"}'s physical core, capable of consuming cosmic static aura to spark swift level break-throughs.`
      },
      {
        term: "Nine Transformations Crimson Scripture (九阳秘籍)",
        category: "Technique",
        definition: "An ancient manual that tempers spiritual channels in celestial solar flares, refining mortal bone dust into golden immortal jade form."
      },
      {
        term: "Astral Lotus Spiritfrost Pill (霜华神丹)",
        category: "Item",
        definition: "A legendary rank cultivation medicine brewed in high star arrays. Consuming it completely dilates spiritual meridians and cleanses dark blockades."
      },
      {
        term: "Void Rift Navigation Array (太虚裂缝)",
        category: "Location / Spell",
        definition: "An ethereal ancient network node that folds three-dimensional coordinate fields, enabling instantaneous spatial leaps across celestial worlds."
      }
    ];

    return res.json({ 
      terms: fallbackTerms, 
      isFallback: true,
      note: "Projected via celestial scribe memory: " + error.message 
    });
  }
});


// 6. Translate Chapter
app.post("/api/translate-chapter", async (req, res) => {
  try {
    const { chapterId, targetLang, englishText, glossaryTerms, routingConfig } = req.body;

    if (!englishText || !targetLang) {
      return res.status(400).json({ error: "Missing required fields: targetLang, englishText" });
    }

    const langMapForDeepL: Record<string, string> = {
      'zh-CN': 'ZH',
      'zh-TW': 'ZH',
      'ko': 'KO',
      'es': 'ES',
      'fr': 'FR',
      'pt-BR': 'PT-BR',
      'it': 'IT',
      'de': 'DE',
      'ja': 'JA',
      'ru': 'RU',
      'id': 'ID',
      'ar': 'AR'
    };

    let finalTranslatedText = "";
    let tempGlossaryInfo: deepl.GlossaryInfo | null = null;

    try {
      if (translator) {
        const deeplLangCode = langMapForDeepL[targetLang] || targetLang.toUpperCase();
        let translateOptions: deepl.TranslateTextOptions = {};

        if (glossaryTerms && Array.isArray(glossaryTerms) && glossaryTerms.length > 0) {
          try {
            const entriesObj: Record<string, string> = {};
            glossaryTerms.forEach((term: any) => {
               if (term.source_text && term.target_text) {
                 entriesObj[term.source_text] = term.target_text;
               }
            });
            
            if (Object.keys(entriesObj).length > 0) {
              const entries = new deepl.GlossaryEntries({ entries: entriesObj });
              tempGlossaryInfo = await translator.createGlossary(`Temp_${Date.now()}`, 'en', deeplLangCode as deepl.TargetLanguageCode, entries);
              translateOptions.glossary = tempGlossaryInfo;
            }
          } catch (glossaryError) {
            console.warn("Could not create DeepL glossary, proceeding without it.", glossaryError);
          }
        }

        const result = await translator.translateText(englishText, null, deeplLangCode as deepl.TargetLanguageCode, translateOptions);
        finalTranslatedText = Array.isArray(result) ? result[0].text : result.text;
      }
    } catch (deeplError) {
      console.warn("DeepL translation failed or not supported for this language. Falling back to Gemini...", deeplError);
    } finally {
      if (tempGlossaryInfo && translator) {
        try {
           await translator.deleteGlossary(tempGlossaryInfo);
        } catch (delError) {
           console.error("Failed to delete temp glossary:", delError);
        }
      }
    }

    if (!finalTranslatedText) {
      // Fallback to Gemini
      let geminiGlossaryString = "";
      if (glossaryTerms && Array.isArray(glossaryTerms) && glossaryTerms.length > 0) {
         const list = glossaryTerms.map((t: any) => `${t.source_text} -> ${t.target_text}`).join('\\n');
         geminiGlossaryString = `\n\nMust use these EXACT translations for specific terms (Glossary):\n${list}\n`;
      }

      const prompt = `Translate the following chapter text into the language with language code '${targetLang}'.
Maintain the literary style, formatting, system tags (e.g., [SFX:...]), and keep paragraph breaks intact.${geminiGlossaryString}

Text to translate:
${englishText}
`;
      const systemInstruction = `You are an expert translator specializing in fantasy, wuxia, and xianxia light novels. Keep translations immersive, descriptive, and accurate to the genre. Do not include raw translation notes or metadata tags inside the final text.`;
      
      const data = await routeTextGeneration(
        "storyMaker",
        systemInstruction,
        prompt,
        "translate-chapter-fallback",
        routingConfig,
        getCustomKeys(req)
      );
      finalTranslatedText = data.text || englishText;
    }

    return res.json({
      translatedText: finalTranslatedText,
      targetLang,
      chapterId
    });
  } catch (error: any) {
    console.error("Error translating chapter:", error);
    return res.status(500).json({ error: error.message || "Failed to translate chapter" });
  }
});


// 7. Generate Audio (TTS) for the Voice Edition
app.post("/api/generate-audio", async (req, res) => {
  try {
    const { text, speakerVoice, routingConfig } = req.body;
    if (!text || !speakerVoice) {
      return res.status(400).json({ error: "Missing required fields: text, speakerVoice" });
    }

    const customKeys = getCustomKeys(req);
    const apiKey = customKeys?.geminiApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY is missing or invalid.");
    }

    const { GoogleGenAI, Modality } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: speakerVoice }
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("Failed to generate audio from Gemini.");
    }

    return res.json({ base64Audio });
  } catch (error: any) {
    console.error("Error generating audio:", error);
    return res.status(500).json({ error: error.message || "Failed to generate audio" });
  }
});


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
