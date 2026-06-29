import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { z } from "zod";
import pinoHttp from "pino-http";
import { logger } from "./server/logger";
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
import { ensureString, cleanBlueprint, cleanInitialArc, cleanSteerArc, cleanChapterResponse, filterRelevantEntities, rankRelevantEntities } from "./server/helpers";
import { PROMPTS } from "./server/prompts";

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

// Increase payload sizes
app.use(express.json({ limit: "20mb" }));

// ==========================================
// API ROUTES
// ==========================================

// 0. Health Check route
app.get("/__health", (req, res) => {
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

// 0. Get available router presets
app.get("/api/router-presets", (req, res) => {
  res.json(ROUTER_PRESETS);
});

// 0.2. Fetch dynamic list of models from providers (OpenRouter, Ollama, Gemini)
app.post("/api/embed", validateBody(embedSchema), async (req, res) => {
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

// 0.2. Fetch dynamic list of models from providers (OpenRouter, Ollama, Gemini)
app.post("/api/models", validateBody(modelsSchema), async (req, res) => {
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
            "gemini-2.5-flash-image",
            "google/gemini-3.1-flash-lite-image-preview",
            "google/gemini-3.1-flash-lite-preview",
            "gemini-3.5-flash",
            "gemini-3.5-pro",
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

// New Endpoint: Insights from the Dao custom generator
app.post("/api/dao-insight", validateBody(daoInsightSchema), async (req, res) => {
  try {
    const { category, routingConfig } = req.body;
    
    const categoryPrompt = category === 'comedic' 
      ? 'highly comedic, ironic, self-aware, mocking the absurdity of grand cultivation tropes, the endless face-slap loops, or imperial examinations.'
      : category === 'inspirational' 
      ? 'spiritually inspirational, speaking of mountains, hidden pathways in the meridian, enduring storms, and mastering one’s own destiny.'
      : 'incredibly warm, comforting, and good-feeling, reminding a sad and weary scholar that a simple cup of tea, a temporary rest, or a peaceful sunset is as sacred as ascending to the heavens.';
      
    const systemPrompt = `You are a legendary, ancient Wuxia and Daoist immortal visiting the secular world to cheer up a young scholar who failed their imperial examinations or feels stagnant in their Qi cultivation.
Generate a quote that fits the specified style. The quote must be:
- Written in elegant, poetic, and immersive Wuxia/Xianxia style (using terms like meridians, jade, spiritual soup, flying swords, scholarly ink, the Great Dao, tribulation).
- Short and punchy (1 to 2 sentences max).
- Addressed directly to a sad young scholar or written as a general timeless insight that relates to them.
- Response must be a raw JSON object matching: { "quote": "...", "author": "..." }. Do not include any explanation or markdown formatting, just raw JSON.

Author name should be authentic Wuxia-style titles like "Drunken Quill Immortal", "Unfettered Sword Monk", "Sleepless Master of the Nine Tea Cups", "Grand Elder of Stardust Ink", "Fairy Chef of the Red Lotus Valley".`;

    const userPrompt = `Generate a single ${category || 'general'} quote which is ${categoryPrompt}`;

    const data = await routeTextGeneration(
      "storyMaker",
      systemPrompt,
      userPrompt,
      "generate-dao-insight",
      routingConfig,
      getCustomKeys(req)
    );
    
    // Parse the generated text safely using our cleanAndParseJSON helper
    const { cleanAndParseJSON } = await import("./aiRouter");
    const parsed = cleanAndParseJSON(data);
    
    if (parsed && typeof parsed === "object" && parsed.quote) {
      return res.json({
        quote: parsed.quote,
        author: parsed.author || "An anonymous high-tier cultivator",
        category: category || "general"
      });
    } else {
      throw new Error("Invalid quote format returned from AI model");
    }
  } catch (error: any) {
    console.error("Error generating custom Dao quote:", error);
    return res.status(500).json({ error: error.message || "Celestial alignment interrupted." });
  }
});

// 0.5. Generate World Blueprint
app.post("/api/generate-blueprint", validateBody(generateBlueprintSchema), async (req, res) => {
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
app.post("/api/generate-initial-arc", validateBody(generateInitialArcSchema), async (req, res) => {
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
app.post("/api/generate-chapter-stream", validateBody(chapterGenerationSchema), async (req, res) => {
  try {
    const { 
      mcName, 
      genre, 
      customPremise, 
      memory, 
      pastSummaries, 
      currentChapter,
      routingConfig,
      hardcoreFateMode,
      fatePressure,
      pacingDirective,
      styleBible,
      tropeRules,
      storyTags
    } = req.body;

    const activeFatePressure = fatePressure || (hardcoreFateMode ? 'Hardcore' : 'Balanced');

    if (!mcName || !currentChapter || !memory) {
      return res.status(400).json({ error: "Missing required fields for chapter generation" });
    }

    const pastSummariesStr = pastSummaries && pastSummaries.length > 0 
      ? pastSummaries.join("\n") 
      : "This is the very first chapter of the story arc! Set the scene dramatically.";

    const lastSummary = pastSummaries && pastSummaries.length > 0 ? pastSummaries[pastSummaries.length - 1] : undefined;

    const currentChapterNum = currentChapter.number || 1;
    let rThreadsStream = memory.unresolvedPlotThreads || [];
    if (rThreadsStream.length > 30) rThreadsStream = [...rThreadsStream.slice(0, 10), ...rThreadsStream.slice(-20)];
    
    const formattedThreads = rThreadsStream.map((t: any) => {
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

    const safeStr = (s: string|undefined, max: number = 3000) => (s && s.length > max) ? s.substring(0, max) + "..." : s;

    const memoryJsonStr = JSON.stringify({
      powerSystem: safeStr(memory.powerSystem, 4000),
      currentPowerStage: safeStr(memory.currentPowerStage, 1000),
      worldRules: Array.isArray(memory.worldRules) ? memory.worldRules.slice(0, 20).map(r => safeStr(r, 1000)) : safeStr(memory.worldRules, 4000),
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
      true,
      styleBible,
      tropeRules,
      storyTags
    );

    let finalUserPrompt = userPrompt;
    if (pacingDirective) {
      finalUserPrompt += `
      
=========================================
AI DIRECTOR PACING INSTRUCTION
=========================================
${pacingDirective}
=========================================`;
    }

    if (activeFatePressure === 'Relaxed') {
      finalUserPrompt += `
      
=========================================
FATE PRESSURE: RELAXED
=========================================
The reader has set the story to RELAXED pressure. 
- Keep the story flow supportive, comforting, and relatively smooth.
- Avoid introducing heavy setbacks, irreversible tragedies, severe material losses, or shock betrayals.
- Let the Main Character solve problems with cleverness, charm, or typical effort without suffering crushing psychological or physical consequences.
- Power gains and faction status increases should proceed without severe counter-attacks or lethal danger.
- You MUST output a System Alert box (using the format "[Event Name: Description]" on its own line or the structured system object) for positive milestones or lucky events (e.g., "[Fortuitous Encounter: A hidden treasure resonates with your aura.]" or "[Karma Rewarded: Past kindness yields unexpected fruit.]").
=========================================`;
    } else if (activeFatePressure === 'Balanced') {
      finalUserPrompt += `
      
=========================================
FATE PRESSURE: BALANCED
=========================================
The story is operating under BALANCED fate pressure.
- Deliver standard webnovel stakes: normal progression setbacks, rival friction, and challenging but fully surmountable conflicts.
- Ensure setbacks feel organic and serve to build tension before the next breakthrough or training arc.
- You MUST output a System Alert box (using the format "[Event Name: Description]" on its own line or the structured system object) to highlight shifts in destiny or new moderate challenges (e.g., "[Destiny Shift: A new rival has noticed your ascent.]").
=========================================`;
    } else if (activeFatePressure === 'Hardcore' || activeFatePressure === 'Dao Master') {
      finalUserPrompt += `
      
=========================================
CRITICAL FATE PRESSURE IS ${activeFatePressure.toUpperCase()}:
=========================================
This story is operating under highly rigorous, consequence-driven settings. You must actively push back against typical "overpowered MC always wins and avoids all consequences" patterns.

HOWEVER, to keep events from feeling "cheap" or "randomly chaotic," you must only trigger or escalate a major Hardcore Fate Event when the story has built up sufficient setup. 

First, examine the previous chapters and current state of the world:
- Growth Pacing: Have there been 3-5 chapters of peaceful power-growth, safe exploration, or easy victories? If so, a setback is now earned!
- Ignored Threats: Has the user avoided or hand-waved past consequences, ignored a rising rival, neglected the faction economy/resources, or left high-pressure faction tensions bubbling?
- Relationship Instability: Are there high levels of jealousy or unstable alliances?
- Overpowered Cheats: Has the MC over-relied on an absolute cheat, heavenly treasure, or secret power?
- Codex Warnings: Are there many unresolved plot threats or active dangers?

If any of these setups are present, you are ORDERED to introduce or advance a major, tense Hardcore Fate Event. Choose ONE of the following event types that fits best with the narrative flow and integrate it seamlessly. 
You MUST output a System Alert box using the format "[Event Name: Description]" on its own line when the event triggers.

1. [DEATH FLAG DETECTED]: Place an important companion, mentor, or loved one at risk of death. Make their vulnerability clear. Example: \`[Death Flag Detected: Zhao Min has entered a doomed path. Without intervention, her survival odds are falling.]\`
2. [BETRAYAL CHECK]: Introduce clues or actions indicating a trusted ally might be secretly plotting, compromised, or forced to turn against the MC. Example: \`[Fate Event: A karmic bond is fraying. Trust is a luxury.]\`
3. [CALAMITY]: Force a sudden macro-level crisis: a plague, a massive crop failure, an approaching army, a demonic rift, or an ancient curse that threatens the setting. Example: \`[Critical Danger: The southern border and imperial capital are both under threat. You can reinforce only one before dawn.]\`
4. [MORAL CHOICE]: Force a high-stakes compromise or forced tradeoff where saving one thing means losing another (e.g., "You can save the capital or the border cities, not both"). Example: \`[Karma Backlash: Your mercy toward the bandit chief has created a hidden enemy.]\`
5. [KARMA BACKLASH]: Cause past selfish or risky choices to return with heavy, complex consequences. Example: \`[Karma Backlash: Your past debts have arrived to collect.]\`
6. [RIVAL ASCENSION]: Show an enemy gaining massive power, authority, or finding their own legendary cheat because they were left unchecked. Example: \`[Fate Lock: The enemy's destiny has solidified. They can no longer be defeated easily.]\`
7. [WORLD FRACTURE]: Introduce a major, irreversible change in the laws of nature, the sect structures, or the continent's geography. Example: \`[System Error: The laws of reality are unraveling.]\`
8. [RESOURCE CRISIS]: Put the MC's organization or faction under absolute physical stress (no food, depleted spiritual qi vein, empty treasury, or ruined defenses).
9. [HIDDEN TIMER]: Establish a visible countdown of danger (e.g., "The poison will reach her heart in three chapters," or "The High Sect arrives in two chapters"). Example: \`[Iron Fate Warning: 72 hours until absolute annihilation.]\`
10. [FATE LOCK]: Seal a narrative branch, rendering a past choice or loss completely irreversible. Example: \`[Fate Lock: This choice will permanently alter the timeline.]\`
 
=========================================
FATE EVENT FREQUENCY DIRECTIVE (1-3 PER ARC):
To maintain proper narrative pacing, follow the Min/Max Rule for Fate Events:
- MINIMUM: At least 1 major Hardcore Fate Event should occur per story arc to ensure real stakes and character growth.
- MAXIMUM: Do NOT exceed 3 major Hardcore Fate Events in a single arc. If an arc is already oversaturated with crises, focus on the dramatic fallout, recovery, or training rather than piling on new unrelated disasters.
If a major event just occurred in the previous chapter, allow the characters time to react and breathe before triggering another!
=========================================

=========================================
TIMING & PLACEMENT DIRECTIVE FOR SYSTEM ALERTS:
When triggering a Hardcore Fate Event, you MUST place the System Alert box/text block at the very end of the chapter, or when the narrative is at an active major turning point to serve as a dramatic cliffhanger. This prevents the alert from getting buried in the middle of a casual dialogue or descriptions. Build real narrative tension up to that point first, then drop the System Alert block as a heavy, climactic turning point or closing cliffhanger!
=========================================

${activeFatePressure === 'Dao Master' ? `
-----------------------------------------
SPECIAL DAO MASTER DIRECTIVE (PERMADEATH RULES):
-----------------------------------------
As a DAO MASTER story:
- Elevate stakes to the absolute maximum. Consequences are deadly and permanent.
- If the MC or an ally fails, there is no undo, no "Fate Alteration" backtracks. The run can end or key companions can die permanently.
- Infuse the narration with a solemn, brutal tone emphasizing the absolute weight of every single breath and action. Every choice is carved into eternity.
-----------------------------------------
` : ''}

PACING DIRECTIVE: Build real suspense and danger. Make sure characters face physical danger, psychological strain, or tough tradeoffs. Let the crisis feel fully earned from the story's setup!
=========================================`;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await routeTextGenerationStream(
      "storyMaker",
      systemInstruction,
      finalUserPrompt,
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
app.post("/api/generate-chapter", validateBody(chapterGenerationSchema), async (req, res) => {
  try {
    const { 
      mcName, 
      genre, 
      customPremise, 
      memory, 
      pastSummaries, 
      currentChapter,
      routingConfig,
      hardcoreFateMode,
      fatePressure,
      pacingDirective,
      styleBible,
      tropeRules,
      storyTags
    } = req.body;

    const activeFatePressure = fatePressure || (hardcoreFateMode ? 'Hardcore' : 'Balanced');

    if (!mcName || !currentChapter || !memory) {
      return res.status(400).json({ error: "Missing required fields for chapter generation" });
    }

    const pastSummariesStr = pastSummaries && pastSummaries.length > 0 
      ? pastSummaries.join("\n") 
      : "This is the very first chapter of the story arc! Set the scene dramatically.";

    const lastSummary = pastSummaries && pastSummaries.length > 0 ? pastSummaries[pastSummaries.length - 1] : undefined;

    const currentChapterNum = currentChapter.number || 1;
    let rThreadsStream = memory.unresolvedPlotThreads || [];
    if (rThreadsStream.length > 30) rThreadsStream = [...rThreadsStream.slice(0, 10), ...rThreadsStream.slice(-20)];
    
    const formattedThreads = rThreadsStream.map((t: any) => {
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

    const safeStr = (s: string|undefined, max: number = 3000) => (s && s.length > max) ? s.substring(0, max) + "..." : s;

    const memoryJsonStr = JSON.stringify({
      powerSystem: safeStr(memory.powerSystem, 4000),
      currentPowerStage: safeStr(memory.currentPowerStage, 1000),
      worldRules: Array.isArray(memory.worldRules) ? memory.worldRules.slice(0, 20).map(r => safeStr(r, 1000)) : safeStr(memory.worldRules, 4000),
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
      false,
      styleBible,
      tropeRules,
      storyTags
    );

    let finalUserPrompt = userPrompt;
    if (pacingDirective) {
      finalUserPrompt += `
      
=========================================
AI DIRECTOR PACING INSTRUCTION
=========================================
${pacingDirective}
=========================================`;
    }

    if (activeFatePressure === 'Relaxed') {
      finalUserPrompt += `
      
=========================================
FATE PRESSURE: RELAXED
=========================================
The reader has set the story to RELAXED pressure. 
- Keep the story flow supportive, comforting, and relatively smooth.
- Avoid introducing heavy setbacks, irreversible tragedies, severe material losses, or shock betrayals.
- Let the Main Character solve problems with cleverness, charm, or typical effort without suffering crushing psychological or physical consequences.
- Power gains and faction status increases should proceed without severe counter-attacks or lethal danger.
- You MUST output a System Alert box (using the format "[Event Name: Description]" on its own line or the structured system object) for positive milestones or lucky events (e.g., "[Fortuitous Encounter: A hidden treasure resonates with your aura.]" or "[Karma Rewarded: Past kindness yields unexpected fruit.]").
=========================================`;
    } else if (activeFatePressure === 'Balanced') {
      finalUserPrompt += `
      
=========================================
FATE PRESSURE: BALANCED
=========================================
The story is operating under BALANCED fate pressure.
- Deliver standard webnovel stakes: normal progression setbacks, rival friction, and challenging but fully surmountable conflicts.
- Ensure setbacks feel organic and serve to build tension before the next breakthrough or training arc.
- You MUST output a System Alert box (using the format "[Event Name: Description]" on its own line or the structured system object) to highlight shifts in destiny or new moderate challenges (e.g., "[Destiny Shift: A new rival has noticed your ascent.]").
=========================================`;
    } else if (activeFatePressure === 'Hardcore' || activeFatePressure === 'Dao Master') {
      finalUserPrompt += `
      
=========================================
CRITICAL FATE PRESSURE IS ${activeFatePressure.toUpperCase()}:
=========================================
This story is operating under highly rigorous, consequence-driven settings. You must actively push back against typical "overpowered MC always wins and avoids all consequences" patterns.

HOWEVER, to keep events from feeling "cheap" or "randomly chaotic," you must only trigger or escalate a major Hardcore Fate Event when the story has built up sufficient setup. 

First, examine the previous chapters and current state of the world:
- Growth Pacing: Have there been 3-5 chapters of peaceful power-growth, safe exploration, or easy victories? If so, a setback is now earned!
- Ignored Threats: Has the user avoided or hand-waved past consequences, ignored a rising rival, neglected the faction economy/resources, or left high-pressure faction tensions bubbling?
- Relationship Instability: Are there high levels of jealousy or unstable alliances?
- Overpowered Cheats: Has the MC over-relied on an absolute cheat, heavenly treasure, or secret power?
- Codex Warnings: Are there many unresolved plot threats or active dangers?

If any of these setups are present, you are ORDERED to introduce or advance a major, tense Hardcore Fate Event. Choose ONE of the following event types that fits best with the narrative flow and integrate it seamlessly. 
You MUST output a System Alert box using the format "[Event Name: Description]" on its own line when the event triggers.

1. [DEATH FLAG DETECTED]: Place an important companion, mentor, or loved one at risk of death. Make their vulnerability clear. Example: \`[Death Flag Detected: Zhao Min has entered a doomed path. Without intervention, her survival odds are falling.]\`
2. [BETRAYAL CHECK]: Introduce clues or actions indicating a trusted ally might be secretly plotting, compromised, or forced to turn against the MC. Example: \`[Fate Event: A karmic bond is fraying. Trust is a luxury.]\`
3. [CALAMITY]: Force a sudden macro-level crisis: a plague, a massive crop failure, an approaching army, a demonic rift, or an ancient curse that threatens the setting. Example: \`[Critical Danger: The southern border and imperial capital are both under threat. You can reinforce only one before dawn.]\`
4. [MORAL CHOICE]: Force a high-stakes compromise or forced tradeoff where saving one thing means losing another (e.g., "You can save the capital or the border cities, not both"). Example: \`[Karma Backlash: Your mercy toward the bandit chief has created a hidden enemy.]\`
5. [KARMA BACKLASH]: Cause past selfish or risky choices to return with heavy, complex consequences. Example: \`[Karma Backlash: Your past debts have arrived to collect.]\`
6. [RIVAL ASCENSION]: Show an enemy gaining massive power, authority, or finding their own legendary cheat because they were left unchecked. Example: \`[Fate Lock: The enemy's destiny has solidified. They can no longer be defeated easily.]\`
7. [WORLD FRACTURE]: Introduce a major, irreversible change in the laws of nature, the sect structures, or the continent's geography. Example: \`[System Error: The laws of reality are unraveling.]\`
8. [RESOURCE CRISIS]: Put the MC's organization or faction under absolute physical stress (no food, depleted spiritual qi vein, empty treasury, or ruined defenses).
9. [HIDDEN TIMER]: Establish a visible countdown of danger (e.g., "The poison will reach her heart in three chapters," or "The High Sect arrives in two chapters"). Example: \`[Iron Fate Warning: 72 hours until absolute annihilation.]\`
10. [FATE LOCK]: Seal a narrative branch, rendering a past choice or loss completely irreversible. Example: \`[Fate Lock: This choice will permanently alter the timeline.]\`
 
=========================================
FATE EVENT FREQUENCY DIRECTIVE (1-3 PER ARC):
To maintain proper narrative pacing, follow the Min/Max Rule for Fate Events:
- MINIMUM: At least 1 major Hardcore Fate Event should occur per story arc to ensure real stakes and character growth.
- MAXIMUM: Do NOT exceed 3 major Hardcore Fate Events in a single arc. If an arc is already oversaturated with crises, focus on the dramatic fallout, recovery, or training rather than piling on new unrelated disasters.
If a major event just occurred in the previous chapter, allow the characters time to react and breathe before triggering another!
=========================================

=========================================
TIMING & PLACEMENT DIRECTIVE FOR SYSTEM ALERTS:
When triggering a Hardcore Fate Event, you MUST place the System Alert box/text block at the very end of the chapter, or when the narrative is at an active major turning point to serve as a dramatic cliffhanger. This prevents the alert from getting buried in the middle of a casual dialogue or descriptions. Build real narrative tension up to that point first, then drop the System Alert block as a heavy, climactic turning point or closing cliffhanger!
=========================================

${activeFatePressure === 'Dao Master' ? `
-----------------------------------------
SPECIAL DAO MASTER DIRECTIVE (PERMADEATH RULES):
-----------------------------------------
As a DAO MASTER story:
- Elevate stakes to the absolute maximum. Consequences are deadly and permanent.
- If the MC or an ally fails, there is no undo, no "Fate Alteration" backtracks. The run can end or key companions can die permanently.
- Infuse the narration with a solemn, brutal tone emphasizing the absolute weight of every single breath and action. Every choice is carved into eternity.
-----------------------------------------
` : ''}

PACING DIRECTIVE: Build real suspense and danger. Make sure characters face physical danger, psychological strain, or tough tradeoffs. Let the crisis feel fully earned from the story's setup!
=========================================`;
    }

    const data = await routeTextGeneration(
      "storyMaker",
      systemInstruction,
      finalUserPrompt,
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
app.post("/api/extract-chapter-metadata", validateBody(extractMetadataSchema), async (req, res) => {
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
            signature: { type: "STRING" },
            entities: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  type: { type: "STRING" },
                  mention: { type: "STRING" }
                }
              }
            },
            system: {
              type: "OBJECT",
              properties: {
                kind: { type: "STRING" },
                title: { type: "STRING" },
                rarity: { type: "STRING" },
                rows: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      label: { type: "STRING" },
                      value: { type: "STRING" }
                    }
                  }
                }
              }
            },
            music: {
              type: "OBJECT",
              properties: {
                mood: { type: "STRING" },
                region: { type: "STRING" },
                intensity: { type: "NUMBER" },
                customUrl: { type: "STRING" },
                trackId: { type: "STRING" }
              }
            }
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
            newMCAbilities: { 
              type: "ARRAY", 
              items: { 
                type: "OBJECT", 
                properties: { 
                  name: { type: "STRING" }, 
                  description: { type: "STRING" }, 
                  source: { type: "STRING" }, 
                  acquisitionMethod: { type: "STRING" }, 
                  cost: { type: "STRING" }, 
                  limits: { type: "STRING" }, 
                  masteryLevel: { type: "STRING" } 
                } 
              } 
            },
            mcAbilityUpdates: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  newMasteryLevel: { type: "STRING" },
                  lastUsedChapter: { type: "NUMBER" }
                }
              }
            }
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

// 2.2.1 Repair Chapter Stream
app.post("/api/repair-chapter-stream", validateBody(repairChapterSchema), async (req, res) => {
  try {
    const { chapterText, memory, warnings, routingConfig } = req.body;
    
    if (!chapterText || !memory || !warnings) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const memoryStr = JSON.stringify(memory, null, 2);
    const systemInstruction = PROMPTS.repairChapter.system;
    const userPrompt = PROMPTS.repairChapter.userPrompt(chapterText, memoryStr, warnings);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await routeTextGenerationStream(
      "storyMaker",
      systemInstruction,
      userPrompt,
      "repair-chapter-stream",
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
    console.error("Error repairing chapter stream:", error);
    res.write(`data: ${JSON.stringify({ error: error.message || "Internal server error" })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  }
});

// 2.2 Consistency Guard Check
app.post("/api/check-consistency", validateBody(checkConsistencySchema), async (req, res) => {
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
app.post("/api/generate-next-directions", validateBody(generateNextDirectionsSchema), async (req, res) => {
  const { 
    mcName, 
    genre, 
    customPremise, 
    memory, 
    pastSummaries, 
    routingConfig,
    destinedEnding,
    currentArcCount,
    estimatedArcs
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
      destinedEnding: destinedEnding || memory.destinedEnding || undefined,
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
      pastSummariesStr,
      destinedEnding || memory.destinedEnding,
      currentArcCount,
      estimatedArcs
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

// 2.75. Dynamically suggest story tags based on custom novel premise
app.post("/api/suggest-tags", validateBody(suggestTagsSchema), async (req, res) => {
  try {
    const { premise, genrePath, routingConfig } = req.body;
    if (!premise) {
      return res.status(400).json({ error: "Missing required field: premise" });
    }

    const systemInstruction = `You are an elite light novel editor and genre expert. Your task is to recommend highly relevant, specialized creative tags for a new Chinese LitRPG or Cultivation/Wuxia novel based on its main premise and genre.
Only suggest tags that directly amplify, describe, or align with the user's premise.
Your response must be a valid, raw JSON object matching the exact schema:
{
  "suggestedTags": ["tag1", "tag2", ...],
  "reasoning": "A short, elegant, atmospheric, SEIHouse-branded one-sentence explanation of the alignment of these tags to the celestial catalyst."
}
Do not include any block markdown formatting, markdown wrappers, or explanation outside of raw JSON.`;

    const PREDEFINED_TAG_POOL = [
      // System & Progression
      'game systems', 'power scaling', 'cultivation realms', 'breakthrough pressure', 'bottleneck arcs', 
      'tribulation events', 'dao comprehension', 'martial techniques', 'bloodline awakening', 'artifact growth', 
      'weapon spirits', 'inheritance trials', 'class evolution', 'skill trees', 'job classes', 
      'level progression', 'stat growth', 'quest systems', 'achievement systems', 'reincarnation rules', 
      'regression rules', 'time loops', 'save points', 'death penalties', 'respawn logic', 
      'system corruption', 'system awakening', 'system missions', 'system rewards', 'system penalties', 
      'system shop', 'system diagnostics', 'hidden stats', 'karma points', 'influence points', 
      'admin points', 'military points', 'diplomacy points', 'logistics points',
      // Society & Economics
      'kingdom economy', 'resource management', 'territory control', 'trade routes', 'supply chains', 
      'infrastructure growth', 'settlement upgrades', 'city building', 'village growth', 'guild systems', 
      'tax reform', 'law reform', 'public order', 'famine pressure', 'refugee crisis', 'war economy', 
      'black market', 'scarcity economy', 'trade embargo', 'grain pricing', 'currency pressure', 
      'debt crisis', 'guild economy', 'artisan production', 'labor shortage', 'port economy', 
      'mining economy', 'rare materials', 'auction politics', 'tribute systems', 'foreign investment', 
      'smuggling routes', 'banking influence', 'land rights', 'market control', 'industrial growth', 
      'economic recovery', 'magical resources', 'contract enforcement',
      // Politics & War
      'faction memory', 'loyalty tracking', 'reputation tracking', 'political pressure', 'military strategy', 
      'court intrigue', 'border defense', 'warlord politics', 'noble resistance', 'imperial oversight', 
      'rebellion risk', 'succession crisis', 'spy networks', 'intelligence war', 'diplomatic leverage', 
      'treaty instability', 'alliance building', 'alliance decay', 'betrayal fallout', 'rival factions', 
      'proxy war', 'hostage diplomacy', 'merchant politics', 'clan politics', 'sect politics', 
      'council politics', 'propaganda war', 'public scandal', 'legitimacy crisis', 'hidden patrons', 
      'puppet ruler', 'rebel recruitment', 'vassal management', 'occupied territory', 'conquered loyalty', 
      'troop morale', 'unit progression', 'officer loyalty', 'siege warfare', 'guerrilla warfare', 
      'border raids', 'campaign planning', 'battlefield tactics', 'fortress defense', 'supply raids', 
      'mercenary contracts', 'military doctrine', 'weapon upgrades', 'elite units', 'special corps', 
      'war exhaustion', 'strategic retreat', 'city evacuation', 'prisoner politics', 'veteran trauma', 
      'enemy generals', 'battlefield reputation',
      // Romance & Affection
      'romantic trust', 'slow-burn romance', 'memory romance', 'forbidden romance', 'political romance', 
      'arranged marriage', 'enemies to lovers', 'rivals to lovers', 'protector bond', 'grief to love', 
      'jealousy tracking', 'affection growth', 'confession timing', 'trust rupture', 'trust repair', 
      'romantic sacrifice', 'duty versus love', 'love versus ambition', 'harem harmony', 'harem jealousy', 
      'companion loyalty', 'companion arcs', 'companion growth', 'companion rivalry', 'companion betrayal', 
      'companion trauma', 'companion ambition', 'party chemistry', 'party conflict', 'mentor bond', 
      'disciple growth',
      // Fate & Karmic Bonds
      'karmic bonds', 'soul bonds', 'fate bonds', 'destiny recovery', 'lost fate', 'stolen fate', 
      'fate theft', 'fate repair', 'prophecy tracking', 'chosen one pressure', 'antihero rise', 
      'villain redemption', 'revenge spiral', 'mercy consequences', 'moral debt', 'blood debt', 
      'favor debt', 'life debt', 'oath tracking', 'promise tracking', 'curse tracking', 'blessing systems', 
      'divine contracts', 'spirit contracts', 'found family', 'sworn brotherhood',
      // Exploration & Dungeons
      'map expansion', 'ancient ruins', 'secret realms', 'sect rankings', 'arena rankings', 'tower climbs', 
      'dungeon systems', 'loot economy', 'crafting systems', 'alchemy systems', 'forging systems', 
      'enchantment systems', 'summoning systems', 'monster evolution', 'pet evolution', 'party roles', 
      'raid mechanics', 'boss mechanics', 'player factions', 'NPC memory', 'NPC agendas', 'quest chains', 
      'hidden quests', 'world events', 'tutorial systems', 'safe zones', 'guild ranks',
      // Urban & Modern
      'urban cultivation', 'hidden society', 'corporate clans', 'district control', 'celebrity vessels', 
      'debt curses', 'apartment spirits', 'subway realms', 'convenience spirits', 'hunter rankings', 
      'gate outbreaks', 'tower gates', 'awakened citizens', 'association politics', 'media pressure', 
      'viral reputation', 'idol factions', 'chaebol clans', 'underworld sects', 'modern artifacts', 
      'phone talismans', 'contract rewriting', 'spiritual real estate', 'urban territory', 'revenge climb', 
      'social status growth', 'family pressure',
      // Academy & Training
      'school hierarchy', 'academy rankings', 'exam arcs', 'tournament arcs', 'rival schools', 
      'student factions', 'teacher politics', 'discipline systems', 'training schedules', 'mission boards', 
      'campus secrets', 'forbidden libraries', 'trial grounds',
      // Meta & Continuity
      'emotional continuity', 'long-term consequences', 'recap tracking', 'arc continuity', 'chapter memory', 
      'side plot tracking', 'recurring enemies', 'recurring allies', 'background wars', 'offscreen growth', 
      'offscreen schemes', 'delayed payoffs', 'mystery clues', 'foreshadowing', 'hidden identities', 
      'secret bloodlines', 'sealed memories', 'lost history', 'ancient grudges', 'regional politics', 
      'cultural tension', 'religious pressure', 'mythic history', 'living codex', 'dynamic portraits'
    ];

    const userPrompt = `Given the following novel setup:
Genre/Path: ${genrePath || "Unknown"}
Premise: "${premise}"

Please recommend between 5 and 8 appropriate story tags that PERFECTLY suit this type of story.
You should prioritize selecting tags from this exact list of predefined tags where possible:
${JSON.stringify(PREDEFINED_TAG_POOL, null, 2)}

Only recommend tags that truly match the thematic elements, central mechanics, pacing elements, or character arcs implied by the premise of the story. Do not make up random tags unless they are exceptionally accurate and fit perfectly alongside our established grimoire.

Your response must be a JSON object with this shape:
{
  "suggestedTags": ["tag1", "tag2", ...],
  "reasoning": "A short sentence explaining why these tags resonate with the novel's core."
}`;

    const schema = {
      type: "OBJECT",
      properties: {
        suggestedTags: {
          type: "ARRAY",
          items: { type: "STRING" }
        },
        reasoning: { type: "STRING" }
      },
      required: ["suggestedTags", "reasoning"]
    };

    const data = await routeTextGeneration(
      "storyMaker",
      systemInstruction,
      userPrompt,
      "suggest-tags",
      routingConfig,
      getCustomKeys(req),
      schema
    );

    return res.json({
      suggestedTags: data.suggestedTags || [],
      reasoning: data.reasoning || "Celestial resonance established."
    });
  } catch (error: any) {
    console.error("Error suggesting tags:", error);
    return res.status(500).json({ error: error.message || "Celestial alignment interrupted." });
  }
});

// 3. Steer a finished story arc into a new Direction / Volume
app.post("/api/steer-arc", validateBody(steerArcSchema), async (req, res) => {
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
app.post("/api/generate-card-image", validateBody(generateCardImageSchema), async (req, res) => {
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

// 4.5 Generate Cultivator Portrait from uploaded image and description
app.post("/api/test-image-gen", async (req, res) => {
  try {
    const result = await routeImageGeneration("test", "portrait", { provider: "gemini", model: "gemini-2.5-flash-image" }, getCustomKeys(req));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({error: err.message});
  }
});

app.post("/api/generate-cultivator-portrait", validateBody(generateCultivatorPortraitSchema), async (req, res) => {
  const { image, description, daoRank, daoXp, powerStage, equippedArtifact, routingConfig } = req.body;
  try {
    if (!image) {
      return res.status(400).json({ error: "Missing image parameter for portrait generation" });
    }

    const customKeys = getCustomKeys(req);
    const apiKey = customKeys?.geminiApiKey || process.env.GEMINI_API_KEY;
    let refinedPrompt = "";

    if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "") {
      try {
        let base64Data = image;
        let mimeType = "image/jpeg";
        if (image.includes(";base64,")) {
          const parts = image.split(";base64,");
          mimeType = parts[0].replace("data:", "");
          base64Data = parts[1];
        }

        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });

        const systemInstruction = `You are a mystical portrait artist of the immortal realms.
Your task is to analyze the user's uploaded portrait photo, their custom preferences, and their spiritual progression metrics to forge a stunning, anime/light novel-style "Cultivator Portrait" that is deeply attuned to their achievements.

SPIRITUAL PROGRESSION RULES (Incorporate these elements into the prompt based on the user's details):
- DAO RANK ATTUNEMENT (Dresses, robes, and environmental grandeur):
  * "Mortal Reader" -> Simple, humble coarse linen apprentice garments, a simple wooden hairpin, basic mountain landscape.
  * "Wandering Disciple" -> Light blue and white flowing silk robes, soft radiant blue aura, holding a simple steel cultivator sword or wooden talisman.
  * "Outer Sect Scribe" -> Cyan-tinted scholarly robes, surrounded by drifting scrolls, glowing ink droplets, holding an elegant calligraphy brush.
  * "Inner Sect Scholar" -> Deep emerald-green research silk robes, glowing jade ornaments, floating ancient texts with green spiritual scripture.
  * "Dao Adept" -> Royal violet star robes, crackles of violet lightning or spiritual flame, a crown of celestial quartz.
  * "Spirit Author" -> Imperial gold-threaded robes, a divine brush of pure amber light tracing glowing sigils in the sky, surrounded by mythical qi phantoms.
  * "Heavenly Chronicler" -> Brilliant gold-leaf vestments, a celestial halo behind their head, constellations, gold particle sparks and starry nebulae in the background.
  * "Sage of Branching Paths" -> Shifting translucent prism or rainbow-gradient silk, holding a faceted glass lotus/mirror, standing amidst branching pathways of light and parallel reality portals.
  * "Dao Master" -> Primordial nebulae/void dark robes, a dual yin-yang cosmic matrix spinning in their background, shattering glass-like reality patterns, eyes glowing with pure, unmitigated divine consciousness.

- CULTIVATION POWER STAGE (Aura and visual power level):
  * Reflect the user's current novel power stage "${powerStage || 'None'}" in their energy lines (e.g., if it mentions "Qi Condensation", show delicate visible wisps of Qi; if "Foundation Establishment", show a solid glowing core; if "Nascent Soul", show a mini radiant projection of their soul; if "Core Formation", a spinning golden sphere at the dantian).

- EQUIPPED COSMIC ARTIFACT (To be actively held or floating beside them):
  * If an artifact is equipped (${equippedArtifact ? `"${equippedArtifact.name}": ${equippedArtifact.description} (${equippedArtifact.rarity} rarity)` : 'None'}), you MUST seamlessly paint this artifact into the scene. For example, if it's a sword, they are wielding it; if it's a mirror/gourd/talisman, it is floating near their hand, glowing with power proportional to its rarity.

GENERAL CONSTRAINTS:
1. The prompt MUST retain the user's apparent gender, facial structure, expression, hair style (adapted elegantly to Xianxia style), and overall physical vibe from their uploaded photo, but ascended into an immortal form.
2. The response must be ONLY the raw prompt string for the image generator (no introduction, explanation, or markdown quotes). Keep it under 200 words.`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              },
              {
                text: `Analyze this image, my description: "${description || 'None'}", Dao Rank: "${daoRank || 'Mortal Reader'}" (XP: ${daoXp || 0}), Power Stage: "${powerStage || 'None'}", Equipped Artifact: ${equippedArtifact ? equippedArtifact.name : 'None'}, and write a detailed progression-attuned anime-style image generator prompt.`
              }
            ]
          }],
          config: {
            systemInstruction: systemInstruction,
          }
        });

        refinedPrompt = response.text || "";
      } catch (geminiError: any) {
        console.warn("Gemini vision analysis failed, falling back to description-based prompt:", geminiError);
      }
    }

    // Fallback prompt generation if Gemini is missing or failed
    if (!refinedPrompt) {
      refinedPrompt = `A majestic celestial cultivator matching rank "${daoRank || 'Mortal Reader'}" and power stage "${powerStage || 'None'}", professional anime character portrait, fantasy webnovel style, intricate details, sharp focus, celestial backlighting, clean high contrast colors. User traits: ${description || "mystical eyes, elegant robes, swirling Qi aura, starry background"}${equippedArtifact ? `, holding or floating with ${equippedArtifact.name}` : ''}`;
    }

    // Generate the actual portrait image using Pollinations AI or Gemini Image Gen via routeImageGeneration
    const result = await routeImageGeneration(refinedPrompt, "portrait", routingConfig, customKeys);
    return res.json({ 
      imageUrl: result.imageUrls?.[0], 
      promptUsed: refinedPrompt,
      note: "No personal data, images, or files are stored on our servers. This transformation occurs dynamically in real-time."
    });
  } catch (error: any) {
    console.error("Error generating cultivator portrait:", error);
    return res.status(500).json({ error: error.message || "Celestial alignment interrupted." });
  }
});

// 5. Generate Story-Specific Glossary terms and lore definitions
app.post("/api/generate-custom-glossary", validateBody(generateCustomGlossarySchema), async (req, res) => {
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
app.post("/api/translate-chapter", validateBody(translateChapterSchema), async (req, res) => {
  try {
    const { chapterId, targetLang, englishText, glossaryTerms, routingConfig } = req.body;

    if (!englishText || !targetLang) {
      return res.status(400).json({ error: "Missing required fields: targetLang, englishText" });
    }

    const langMapForDeepL: Record<string, string> = {
      'zh-CN': 'ZH',
      'zh-TW': 'ZH-TW',
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
        const translateOptions: deepl.TranslateTextOptions = {};

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

You must return a JSON object with a single "translatedText" key containing the translated string.
`;
      const systemInstruction = `You are an expert translator specializing in fantasy, wuxia, and xianxia light novels. Keep translations immersive, descriptive, and accurate to the genre. Return ONLY valid JSON.`;
      
      const data = await routeTextGeneration(
        "storyMaker",
        systemInstruction,
        prompt,
        "translate-chapter-fallback",
        routingConfig,
        getCustomKeys(req)
      );
      finalTranslatedText = data.translatedText || data.text || englishText;
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
app.post("/api/generate-audio", validateBody(generateAudioSchema), async (req, res) => {
  try {
    const { text, speakerVoice } = req.body;
    if (!text || !speakerVoice) {
      return res.status(400).json({ error: "Missing required fields: text, speakerVoice" });
    }

    const customKeys = getCustomKeys(req);
    const deepinfraKey = customKeys?.deepinfraApiKey || process.env.DEEPINFRA_API_KEY;
    const openrouterKey = customKeys?.openrouterApiKey || process.env.OPENROUTER_API_KEY;

    let base64Audio = "";

    // 1. Try OpenRouter (if user provides OpenRouter Key)
    if (openrouterKey && openrouterKey !== "MY_OPENROUTER_API_KEY" && openrouterKey.trim() !== "") {
      console.log(`[TTS] Requesting OpenRouter for voice '${speakerVoice}' using Kokoro...`);
      try {
        const response = await fetch("https://openrouter.ai/api/v1/audio/speech", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openrouterKey}`
          },
          body: JSON.stringify({
            model: "hexgrad/kokoro-82m",
            input: text,
            voice: speakerVoice
          })
        });

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          base64Audio = Buffer.from(arrayBuffer).toString("base64");
          console.log("[TTS] OpenRouter TTS generation succeeded!");
        } else {
          const errText = await response.text();
          console.warn(`[TTS] OpenRouter TTS generation failed (status ${response.status}): ${errText}`);
        }
      } catch (orErr) {
        console.error("[TTS] OpenRouter TTS generation threw an error:", orErr);
      }
    }

    // 2. Try DeepInfra (if user provides DeepInfra Key)
    if (!base64Audio && deepinfraKey && deepinfraKey !== "MY_DEEPINFRA_API_KEY" && deepinfraKey.trim() !== "") {
      console.log(`[TTS] Requesting DeepInfra for voice '${speakerVoice}'...`);
      try {
        const response = await fetch("https://api.deepinfra.com/v1/audio/speech", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `bearer ${deepinfraKey}`
          },
          body: JSON.stringify({
            model: "hexgrad/Kokoro-82M",
            input: text,
            voice: speakerVoice
          })
        });

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          base64Audio = Buffer.from(arrayBuffer).toString("base64");
          console.log("[TTS] DeepInfra TTS generation succeeded!");
        } else {
          const errText = await response.text();
          console.warn(`[TTS] DeepInfra TTS generation failed: ${errText}`);
        }
      } catch (diErr) {
        console.error("[TTS] DeepInfra TTS generation threw an error:", diErr);
      }
    }

    // Fallback 1: ylacombe/kokoro-82m Gradio Space
    if (!base64Audio) {
      console.log(`[TTS] Falling back to public Hugging Face Space (ylacombe/kokoro-82m) for voice '${speakerVoice}'...`);
      try {
        const lang = speakerVoice.startsWith("es_") ? "es" : "en";
        const hfResponse = await fetch("https://ylacombe-kokoro-82m.hf.space/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: [
              text,
              speakerVoice,
              1.0, // speed
              lang
            ]
          })
        });

        if (hfResponse.ok) {
          const hfJson: any = await hfResponse.json();
          if (hfJson && hfJson.data && hfJson.data[0]) {
            const audioDataObj = hfJson.data[0];
            if (typeof audioDataObj === "string") {
              if (audioDataObj.startsWith("data:audio")) {
                base64Audio = audioDataObj.split(",")[1];
              }
            } else if (audioDataObj && audioDataObj.data) {
              const b64 = audioDataObj.data;
              base64Audio = b64.includes("base64,") ? b64.split("base64,")[1] : b64;
            } else if (audioDataObj && audioDataObj.url) {
              const fileResp = await fetch(audioDataObj.url);
              if (fileResp.ok) {
                const fileBuf = await fileResp.arrayBuffer();
                base64Audio = Buffer.from(fileBuf).toString("base64");
              }
            }
          }
        } else {
          console.warn(`[TTS] Space ylacombe/kokoro-82m returned status: ${hfResponse.status}`);
        }
      } catch (hfErr) {
        console.error("[TTS] ylacombe/kokoro-82m Space fallback failed:", hfErr);
      }
    }

    // Fallback 2: gokaygokay/Kokoro-82M Gradio Space
    if (!base64Audio) {
      console.log(`[TTS] Falling back to secondary Hugging Face Space (gokaygokay-kokoro-82m)...`);
      try {
        const lang = speakerVoice.startsWith("es_") ? "es" : "en";
        const hfResponse = await fetch("https://gokaygokay-kokoro-82m.hf.space/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: [
              text,
              speakerVoice,
              1.0, // speed
              lang
            ]
          })
        });

        if (hfResponse.ok) {
          const hfJson: any = await hfResponse.json();
          if (hfJson && hfJson.data && hfJson.data[0]) {
            const audioDataObj = hfJson.data[0];
            if (typeof audioDataObj === "string") {
              if (audioDataObj.startsWith("data:audio")) {
                base64Audio = audioDataObj.split(",")[1];
              }
            } else if (audioDataObj && audioDataObj.data) {
              const b64 = audioDataObj.data;
              base64Audio = b64.includes("base64,") ? b64.split("base64,")[1] : b64;
            } else if (audioDataObj && audioDataObj.url) {
              const fileResp = await fetch(audioDataObj.url);
              if (fileResp.ok) {
                const fileBuf = await fileResp.arrayBuffer();
                base64Audio = Buffer.from(fileBuf).toString("base64");
              }
            }
          }
        }
      } catch (hfErr2) {
        console.error("[TTS] gokaygokay-kokoro-82m Space fallback failed:", hfErr2);
      }
    }

    if (!base64Audio) {
      throw new Error("Could not generate audio using DeepInfra or public Kokoro TTS fallbacks.");
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
