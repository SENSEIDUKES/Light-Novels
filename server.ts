import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { routeTextGeneration, routeImageGeneration, routeTextGenerationStream, ROUTER_PRESETS } from "./aiRouter";

import * as deepl from "deepl-node";

dotenv.config();

// DeepL Setup
let translator: deepl.Translator | null = null;
const DEEPL_AUTH_KEY = process.env.DEEPL_AUTH_KEY;
if (DEEPL_AUTH_KEY) {
  translator = new deepl.Translator(DEEPL_AUTH_KEY);
}

function validateEnvironmentOnStartup() {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  
  console.log("\n==================================================");
  console.log("   S E I H O U S E   A P I   V A L I D A T I O N  ");
  console.log("==================================================");
  
  let valid = true;
  if (!geminiKey) {
    console.warn("⚠️  [Server Alert] GEMINI_API_KEY environment variable is missing.");
    valid = false;
  } else if (geminiKey === "MY_GEMINI_API_KEY" || geminiKey.trim() === "") {
    console.warn("⚠️  [Server Alert] GEMINI_API_KEY is currently set to an empty/placeholder value.");
    valid = false;
  } else {
    console.log("✅ [Server] GEMINI_API_KEY environment variable is detected and ready.");
  }

  if (!openrouterKey) {
    console.log("ℹ️  [Server] OPENROUTER_API_KEY is not defined. (Custom front-end headers or fallback Ollama still functions)");
  } else if (openrouterKey === "MY_OPENROUTER_API_KEY" || openrouterKey.trim() === "") {
    console.log("ℹ️  [Server] OPENROUTER_API_KEY is set to a placeholder.");
  } else {
    console.log("✅ [Server] OPENROUTER_API_KEY environment variable is detected.");
  }
  
  if (!valid) {
    console.warn("\n⚠️  [Server Status] RUNNING IN TEMPORARY 'KEYS-PENDING' STATUS.");
    console.warn("    To activate default server-side generation, configure your credentials");
    console.warn("    in Settings > Secrets panel OR enter overriding keys in the application's configuration UI.");
  } else {
    console.log("\n🟢 [Server Status] CORE GENERATION ENGINE ACTIVE AND SECURED.");
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
const PORT = 3000;

// Increase payload sizes
app.use(express.json({ limit: "20mb" }));

function ensureString(val: any): string {
  if (val === undefined || val === null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    if (Array.isArray(val)) {
      return val.map(item => typeof item === "object" ? JSON.stringify(item) : String(item)).join("\n");
    }
    // Convert object to a nice readable string
    return Object.entries(val)
      .map(([k, v]) => {
        const formattedKey = k.replace(/([A-Z])/g, " $1").trim().replace(/^\w/, c => c.toUpperCase());
        const formattedVal = typeof v === "object" ? JSON.stringify(v) : String(v);
        return `${formattedKey}: ${formattedVal}`;
      })
      .join("\n");
  }
  return String(val);
}

function cleanBlueprint(bp: any): any {
  if (!bp || typeof bp !== "object") return bp;
  
  const stringFields = [
    "title", "logline", "worldOverview", "startingLocation", 
    "societyStructure", "powerSystemOutline", "mcProfile", 
    "firstArcPromise", "tropeRules", "styleBible"
  ];
  const arrayFields = [
    "majorFactions", "initialCharacters", "majorMysteries", "unresolvedPlotThreads"
  ];

  const cleaned: any = {};
  
  for (const field of stringFields) {
    if (field in bp) {
      cleaned[field] = ensureString(bp[field]);
    } else {
      cleaned[field] = "";
    }
  }

  for (const field of arrayFields) {
    if (field in bp) {
      if (Array.isArray(bp[field])) {
        cleaned[field] = bp[field].map((item: any) => ensureString(item));
      } else {
        cleaned[field] = [ensureString(bp[field])];
      }
    } else {
      cleaned[field] = [];
    }
  }

  return cleaned;
}

function cleanInitialArc(arc: any): any {
  if (!arc || typeof arc !== "object") return arc;
  const cleaned: any = { ...arc };
  
  if ("title" in cleaned) cleaned.title = ensureString(cleaned.title);
  if ("powerSystem" in cleaned) cleaned.powerSystem = ensureString(cleaned.powerSystem);
  if ("currentPowerStage" in cleaned) cleaned.currentPowerStage = ensureString(cleaned.currentPowerStage);
  
  if ("worldRules" in cleaned) {
    if (Array.isArray(cleaned.worldRules)) {
      cleaned.worldRules = cleaned.worldRules.map((item: any) => ensureString(item));
    } else {
      cleaned.worldRules = [ensureString(cleaned.worldRules)];
    }
  }
  
  if ("unresolvedPlotThreads" in cleaned) {
    if (Array.isArray(cleaned.unresolvedPlotThreads)) {
      cleaned.unresolvedPlotThreads = cleaned.unresolvedPlotThreads.map((item: any) => ensureString(item));
    } else {
      cleaned.unresolvedPlotThreads = [ensureString(cleaned.unresolvedPlotThreads)];
    }
  }

  if ("characters" in cleaned && Array.isArray(cleaned.characters)) {
    cleaned.characters = cleaned.characters.map((c: any) => {
      if (!c || typeof c !== "object") return c;
      const cleanChar = { ...c };
      if ("name" in cleanChar) cleanChar.name = ensureString(cleanChar.name);
      if ("role" in cleanChar) cleanChar.role = ensureString(cleanChar.role);
      if ("description" in cleanChar) cleanChar.description = ensureString(cleanChar.description);
      if ("relationshipToMC" in cleanChar) cleanChar.relationshipToMC = ensureString(cleanChar.relationshipToMC);
      if ("status" in cleanChar) cleanChar.status = ensureString(cleanChar.status);
      return cleanChar;
    });
  }

  if ("chapters" in cleaned && Array.isArray(cleaned.chapters)) {
    cleaned.chapters = cleaned.chapters.map((c: any) => {
      if (!c || typeof c !== "object") return c;
      return {
        number: Number(c.number) || 0,
        title: ensureString(c.title),
        premise: ensureString(c.premise)
      };
    });
  }

  return cleaned;
}

function cleanSteerArc(resp: any): any {
  if (!resp || typeof resp !== "object") return resp;
  const cleaned: any = { ...resp };
  
  if ("title" in cleaned) cleaned.title = ensureString(cleaned.title);
  
  if ("chapters" in cleaned && Array.isArray(cleaned.chapters)) {
    cleaned.chapters = cleaned.chapters.map((c: any) => {
      if (!c || typeof c !== "object") return c;
      return {
        number: Number(c.number) || 0,
        title: ensureString(c.title),
        premise: ensureString(c.premise)
      };
    });
  }

  if ("newCharacters" in cleaned && Array.isArray(cleaned.newCharacters)) {
    cleaned.newCharacters = cleaned.newCharacters.map((c: any) => {
      if (!c || typeof c !== "object") return c;
      const cleanChar = { ...c };
      if ("name" in cleanChar) cleanChar.name = ensureString(cleanChar.name);
      if ("role" in cleanChar) cleanChar.role = ensureString(cleanChar.role);
      if ("description" in cleanChar) cleanChar.description = ensureString(cleanChar.description);
      if ("relationshipToMC" in cleanChar) cleanChar.relationshipToMC = ensureString(cleanChar.relationshipToMC);
      if ("status" in cleanChar) cleanChar.status = ensureString(cleanChar.status);
      return cleanChar;
    });
  }

  if ("newUnresolvedPlotThreads" in cleaned && Array.isArray(cleaned.newUnresolvedPlotThreads)) {
    cleaned.newUnresolvedPlotThreads = cleaned.newUnresolvedPlotThreads.map((i: any) => ensureString(i));
  }

  return cleaned;
}

function cleanChapterResponse(resp: any): any {
  if (!resp || typeof resp !== "object") return resp;
  const cleaned = { ...resp };
  if ("chapterText" in cleaned) cleaned.chapterText = ensureString(cleaned.chapterText);
  if ("summary" in cleaned) cleaned.summary = ensureString(cleaned.summary);
  if ("statsChangeMessage" in cleaned) cleaned.statsChangeMessage = ensureString(cleaned.statsChangeMessage);
  
  if (cleaned.memoryUpdates && typeof cleaned.memoryUpdates === "object") {
    const mu = cleaned.memoryUpdates;
    if ("currentPowerStage" in mu) mu.currentPowerStage = ensureString(mu.currentPowerStage);
    
    // Arrays of strings
    const stringArrayFields = ["newUnresolvedPlotThreads", "resolvedPlotThreads", "newMCAbilities"];
    stringArrayFields.forEach(field => {
      if (field in mu && Array.isArray(mu[field])) {
        mu[field] = mu[field].map((i: any) => ensureString(i));
      }
    });

    // Arrays of objects
    const objArrayFields = ["newCharacters", "characterStatusUpdates", "newFactions", "factionUpdates", "newLocations", "locationUpdates", "newArtifacts", "artifactUpdates"];
    objArrayFields.forEach(field => {
      if (field in mu && Array.isArray(mu[field])) {
        mu[field] = mu[field].filter((i: any) => i && typeof i === "object");
      }
    });
  }
  return cleaned;
}

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
            "gemini-2.5-flash",
            "gemini-2.5-pro",
            "gemini-2.0-flash",
            "gemini-2.0-flash-lite",
            "gemini-2.0-pro-exp",
            "gemini-2.0-flash-thinking-exp",
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-1.5-flash-8b",
            "gemini-1.0-pro",
            "gemini-3.5-flash",
            "gemini-3.1-pro-preview",
            "gemini-3.1-flash-lite"
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

    const systemInstruction = `You are a legendary grandmaster editor and creator specializing in Chinese Web Novels (Xianxia, Xuanhuan, Cultivation, LitRPG, and System novels). 
Your task is to take a Story Seed Intake and generate a comprehensive World Blueprint / Story Bible.
You must output strictly raw JSON matching the requested structure.
If the intake leaves certain fields blank or sparse, smartly extrapolate them using standard light novel tropes and logic.`;

    const userPrompt = `Story Seed Intake Data:
${JSON.stringify(intake, null, 2)}

Based on the provided intake, generate the World Blueprint.
Return a JSON object strictly following this structure:
{
  "title": "Novel Title",
  "logline": "A punchy one-sentence summary",
  "worldOverview": "Deep dive into the world setting and history...",
  "startingLocation": "Where the story begins",
  "societyStructure": "Hierarchy, sects, royal families etc.",
  "powerSystemOutline": "Detailed hierarchy of power levels and concepts",
  "mcProfile": "Name, personality, flaws, cheats, alignments",
  "majorFactions": ["Faction 1", "Faction 2"],
  "initialCharacters": ["Char 1 description", "Char 2 description"],
  "majorMysteries": ["Mystery 1", "Mystery 2"],
  "firstArcPromise": "What readers can expect in the first 10 chapters",
  "tropeRules": "Specific tropes to include or avoid",
  "styleBible": "Tone, themes, and stylistic notes",
  "unresolvedPlotThreads": ["Plot 1", "Plot 2"]
}
Do not add any text before or after the JSON.`;

    const data = await routeTextGeneration(
      "storyMaker",
      systemInstruction,
      userPrompt,
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

    const systemInstruction = `You are a legendary grandmaster editor and creative author specializing in Chinese Web Novels (Xianxia, Xuanhuan, Cultivation, LitRPG, and System novels). 
Your task is to craft high-energy initial serialized story structures. 
You must output strictly raw JSON matching the requested structure. Keep descriptions immersive, keeping true to the tropes of light novels — level progressions, face-slapping, arrogant young masters, mysterious elders, rare medicinal pills, jade treasures, ancient inheritances, or glowing holographic LitRPG system status screens.`;

    const userPrompt = `Create a brand new Chinese Light Novel inspired Story Arc (comprising exactly ${count} chapters) based on the following authenticated World Blueprint:

World Blueprint:
${JSON.stringify(blueprint, null, 2)}

You must return a JSON object with the following fields:
{
  "title": "A grand, poetic Volume / Arc title (e.g. 'Volume 1: Awakening the Sky-Shattering Cauldron')",
  "powerSystem": "A concise paragraph outlining the cultivation ranks/tiers in this universe, extracted from the outline: ${JSON.stringify(blueprint.powerSystemOutline)}",
  "currentPowerStage": "The lowest starting level for the MC, matching the blueprint.",
  "worldRules": [
    "At least 4 crucial rules of this savage cultivator world based on the blueprint"
  ],
  "characters": [
    {
      "name": "Full name",
      "role": "e.g., Sarcastic Master, Arrogant Young Master, Poisonous Step-Brother, Loyal Clan Sister",
      "description": "Short vivid description",
      "relationshipToMC": "e.g., Secret Mentor, Bitter Enemy, childhood friend",
      "status": "alive"
    }
  ],
  "unresolvedPlotThreads": ${JSON.stringify(blueprint.unresolvedPlotThreads || [])},
  "chapters": [
    // Create exactly ${count} chapters. The indices must range from 1 to ${count}.
    {
      "number": 1,
      "title": "A dramatic title matching the blueprint's start",
      "premise": "A brief, exciting operational goal/premise for this chapter"
    }
    // ... complete up to chapter ${count}
  ]
}

Ensure the story pacing is structured so that key breakthroughs happen periodically, and major climaxes occur near chapters 5 and 10! Use creative Chinese light novel tropes. Maintain the SEIHouse aesthetic where artistic cultivation and poetic/profound elements play a significant role. Do not add any text before or after the JSON.`;

    const data = await routeTextGeneration(
      "storyMaker",
      systemInstruction,
      userPrompt,
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

    const systemInstruction = `You are an elite fantasy web-novel author specializing in Chinese light novels (Wuxia, Xianxia, Xuanhuan, Divine Systems). 
Your writing must be highly descriptive, immersive, and emotionally impactful, utilizing the "Reading/archive" font tone. Write using rich metaphors, profound dialogue, high cultivation chants, and grand scene setting. 
Ensure the chapter contains rich elements of Chinese Light Novels: face-slapping of arrogant bullies, grand descriptions of celestial arrays, internal alchemy processes, power stats, or spiritual qi tempests.

CRITICAL ANTI-DRIFT MANDATE (COHERENCE PROTOCOL):
1. STABILITY OF THE VOID: You must NEVER contradict, neglect, or rewrite any facts established in the current story memory (MC power stage, living/dead characters, world rules, unresolved threads) or previous summaries. The current story memory and past summaries are absolute cosmic law.
2. CONTINUITY LOCK: Acknowledge the immediate climax, physical position, or conversation from the LAST paragraph of the previous chapter summary in PAST SUMMARY CONTEXT. There can be zero unexplained timeskips, spatial transitions, or sudden narrative jumps.
3. CHARACTER ACCORD: Never create a new character that conflicts with or duplicates the name of an existing one. If a character from the 'Living/Met Characters' list appears, treat them as fully known to the MC and the reader. DO NOT re-introduce them or describe them as a stranger. Respect historical character relationships and status.
4. SEQUENTIAL ASCENSION: If the character advances in their cultivation rank, it must crawl logically from the current stage to the next sequential stage defined in the Power System ranks; skipping ranks is forbidden.
5. CLEAN MEMORY SECTIONS: List true logical deltas (introducing actual newly met characters with distinct names, moving unresolved plot threads to resolved only if they are fully completed in the text, and changing statuses on existing characters based on the physical events in this chapter).

OUTPUT FORMAT TARGET:
You MUST output the response in two distinct parts:
First, output the chapter text structured as NDJSON (Newline Delimited JSON). Start it with ---CHAPTER_BLOCKS--- on a new line. Each paragraph of your chapter should be a single JSON object on one line containing an "id" (unique string), "type" (usually "paragraph"), "text" (the paragraph content), and optional "metadata" for audio narrative cues.
You can include a "beastEvent" object inside the block "metadata" when encountering significant beast moments (reveals, major strikes, deaths, power surges). A beastEvent needs a "type" ("reveal", "power-up", "technique", "injury", "turning-point", "death", "breakthrough") and a "profile" (containing size, bodyType, element, movement, intelligence, threatTier, signatureSound matching the predefined schema). Use this sparingly and only on significant narrative beats.

Second, output the metadata. Start it with ---JSON_META--- on a new line, followed strictly by a valid JSON object matching the metadata schema.

Example:
---CHAPTER_BLOCKS---
{"id": "c1-p1", "type": "paragraph", "text": "Rain crawled down the black stones as Kael climbed higher into the mountain pass...", "metadata": {"sceneType": "travel", "environment": ["mountain", "rain", "night"], "motion": "walking", "emotion": "determined", "intensity": 0.35, "tension": 0.25, "danger": 0.15, "mysticism": 0.4, "audioSignature": "rainy-mountain-walk"}}
{"id": "c1-p2", "type": "paragraph", "text": "Suddenly, the sky tore open. The Thunder Roc emerged, completely blotting out the moon.", "metadata": {"tension": 0.9, "beastEvent": {"type": "reveal", "profile": {"size": "giant", "bodyType": "bird", "element": "lightning", "movement": "flying", "intelligence": "ancient", "threatTier": "mythic", "signatureSound": "screech"}}}}
{"id": "c1-p3", "type": "paragraph", "text": "He looked back at the valley below."}
---JSON_META---
{
  "summary": "...",
  "statsChangeMessage": "None",
  "memoryUpdates": { ... }
}`;

    const userPrompt = `Write the full chapter text for Chapter ${currentChapter.number}: "${currentChapter.title}".
Goal of this chapter: ${currentChapter.premise}

STORY BACKGROUND DETAILS:
- Main Character: ${mcName}
- Genre/Style: ${genre}
- Core Premise: ${customPremise}

CURRENT STORY MEMORY (Ensure complete consistency with these):
- Power System: ${memory.powerSystem}
- MC Current Level: ${memory.currentPowerStage}
- World Rules: ${JSON.stringify(memory.worldRules)}
- Living/Met Characters (THESE CHARACTERS ARE ALREADY KNOWN TO THE READER. NEVER treat them as strangers or re-introduce them!): ${JSON.stringify(memory.characters)}
- Unresolved Plots: ${JSON.stringify(memory.unresolvedPlotThreads)}

PAST SUMMARY CONTEXT (What happened in previous chapters to prevent plot holes):
${pastSummaries && pastSummaries.length > 0 ? pastSummaries.join("\n") : "This is the very first chapter of the story arc! Set the scene dramatically."}

CHAPTER LENGTH & PACING DIRECTIVES:
- Default Target Length: 2,200 words.
- Allowed Range: 1,800 to 2,600 words.
- Absolute Minimum: 1,500 words.
- Avoid rambling or overly repetitive internal monologues. Instead, natively reach the word count through dynamic dialogue, deeply immersive sensory descriptions, engaging combat choreography, detailed cultivation revelations, and world-building that advances the plot.

Write a fully fleshed-out chapter following the length directives. Split it into multiple beautiful paragraphs with plenty of dialogue, combat choreography or cultivation breakthroughs where descriptive details make it feel real. 
If the novel is a "System" or "LitRPG" style, include a beautiful neon/cybernetic Cultivation System panel in the story text (formatted cleanly using mono-spaced block grids or brackets like: [System Alert: Qi +100!]).

The JSON metadata part must contain:
{
  "summary": "A 2-sentence highly concise summary of what transpired in this chapter to store in our historical archive.",
  "statsChangeMessage": "A short status upgrade notification (e.g. '[System Breakthrough: Qi Condensation Rank 2 reached. Meridians purified!]', or 'None')",
  "memoryUpdates": {
    "currentPowerStage": "Updated MC power level if they broke through, otherwise the same as before.",
    "newCharacters": [
      {
        "name": "Full name of any secondary character introduced/met",
        "role": "e.g., Arrogant Disciple, Tavern Owner, Rogue Cultivator",
        "description": "Quick description",
        "relationshipToMC": "e.g., Neutral, Ally, Hateful",
        "status": "alive",
        "powerLevel": "e.g., Qi Condensation Tier 9, Core Formation, or unknown",
        "abilities": ["Optional array of known unique techniques/skills"],
        "faction": "Optional. Name of the faction they associate with"
      }
    ],
    "characterStatusUpdates": [
      {
        "name": "Character Name",
        "newStatus": "deceased/alive/unknown/ascended",
        "newRelationship": "Updated attitude toward MC if it changed, otherwise same",
        "newPowerLevel": "Optional. Updated power of the character if they progressed",
        "newAbilities": ["Optional. Any new techniques they revealed/gained in this chapter"],
        "descriptionAppend": "Optional. New facts or secrets revealed about them to append to their codex entry"
      }
    ],
    "newUnresolvedPlotThreads": [
      "Any new mysteries or immediate promises/goals that started in this chapter"
    ],
    "resolvedPlotThreads": [
      "The exact string of any unresolved plot thread that was successfully closed or completed in this chapter. Each list entry must be a strict exact match of an existing unresolved plot thread."
    ],
    "newFactions": [
      {
        "name": "Name of newly introduced faction, sect, or school",
        "description": "Short explanation of their standing & beliefs",
        "alignment": "Righteous / Demonic / Neutral / Mysterious",
        "headquarters": "Primary location or temple",
        "status": "Active / Destroyed / Fractured"
      }
    ],
    "factionUpdates": [
      {
        "name": "Faction Name",
        "statusOverride": "Optional. If their status changed (e.g. Destroyed)",
        "descriptionAppend": "Optional. New secrets/history revealed about the sect"
      }
    ],
    "newLocations": [
      {
        "name": "Name of newly introduced area, realm, pavilion, or planet",
        "description": "Atmosphere and key landmarks",
        "realm": "The broader realm (e.g. Mortal Realm, Celestial Domain)",
        "safetyLevel": "Safe / Dangerous / Lethal"
      }
    ],
    "locationUpdates": [
      {
        "name": "Location Name",
        "safetyLevelOverride": "Optional. If safety changed",
        "descriptionAppend": "Optional. New geographic secrets revealed"
      }
    ],
    "newArtifacts": [
      {
        "name": "Name of the magical treasure, pill, array, or weapon",
        "description": "Magical properties and size/appearance",
        "tier": "Mortal / Earth / Heaven / Primordial",
        "currentOwner": "Who holds this artifact now (e.g. MC, Elder Zhao)"
      }
    ],
    "artifactUpdates": [
      {
        "name": "Artifact Name",
        "newOwner": "Optional. If the artifact changed hands",
        "descriptionAppend": "Optional. New hidden powers or lore revealed about the artifact"
      }
    ],
    "newMCAbilities": [
      "Any newly mastered skill, spell, fist technique, or sword form learned by the MC"
    ]
  }
}

Do not add any text before or after the requested format sections.`;

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

    const systemInstruction = `You are an elite fantasy web-novel author specializing in Chinese light novels (Wuxia, Xianxia, Xuanhuan, Divine Systems). 
Your writing must be highly descriptive, immersive, and emotionally impactful, utilizing the "Reading/archive" font tone. Write using rich metaphors, profound dialogue, high cultivation chants, and grand scene setting. 
Ensure the chapter contains rich elements of Chinese Light Novels: face-slapping of arrogant bullies, grand descriptions of celestial arrays, internal alchemy processes, power stats, or spiritual qi tempests.

CRITICAL ANTI-DRIFT MANDATE (COHERENCE PROTOCOL):
1. STABILITY OF THE VOID: You must NEVER contradict, neglect, or rewrite any facts established in the current story memory (MC power stage, living/dead characters, world rules, unresolved threads) or previous summaries. The current story memory and past summaries are absolute cosmic law.
2. CONTINUITY LOCK: Acknowledge the immediate climax, physical position, or conversation from the LAST paragraph of the previous chapter summary in PAST SUMMARY CONTEXT. There can be zero unexplained timeskips, spatial transitions, or sudden narrative jumps.
3. CHARACTER ACCORD: Never create a new character that conflicts with or duplicates the name of an existing one. If a character from the 'Living/Met Characters' list appears, treat them as fully known to the MC and the reader. DO NOT re-introduce them or describe them as a stranger. Respect historical character relationships and status.
4. SEQUENTIAL ASCENSION: If the character advances in their cultivation rank, it must crawl logically from the current stage to the next sequential stage defined in the Power System ranks; skipping ranks is forbidden.
5. CLEAN MEMORY SECTIONS: The "memoryUpdates" field must contain true logical deltas (introducing actual newly met characters with distinct names, moving unresolved plot threads to resolved only if they are fully completed in the text, and changing statuses on existing characters based on the physical events in this chapter).

Output strictly JSON matching the specified format.`;

    const userPrompt = `Write the full chapter text for Chapter ${currentChapter.number}: "${currentChapter.title}".
Goal of this chapter: ${currentChapter.premise}

STORY BACKGROUND DETAILS:
- Main Character: ${mcName}
- Genre/Style: ${genre}
- Core Premise: ${customPremise}

CURRENT STORY MEMORY (Ensure complete consistency with these):
- Power System: ${memory.powerSystem}
- MC Current Level: ${memory.currentPowerStage}
- World Rules: ${JSON.stringify(memory.worldRules)}
- Living/Met Characters (THESE CHARACTERS ARE ALREADY KNOWN TO THE READER. NEVER treat them as strangers or re-introduce them!): ${JSON.stringify(memory.characters)}
- Unresolved Plots: ${JSON.stringify(memory.unresolvedPlotThreads)}

PAST SUMMARY CONTEXT (What happened in previous chapters to prevent plot holes):
${pastSummaries && pastSummaries.length > 0 ? pastSummaries.join("\n") : "This is the very first chapter of the story arc! Set the scene dramatically."}

CHAPTER LENGTH & PACING DIRECTIVES:
- Default Target Length: 2,200 words.
- Allowed Range: 1,800 to 2,600 words.
- Absolute Minimum: 1,500 words.
- Avoid rambling or overly repetitive internal monologues. Instead, natively reach the word count through dynamic dialogue, deeply immersive sensory descriptions, engaging combat choreography, detailed cultivation revelations, and world-building that advances the plot.

Write a fully fleshed-out chapter following the length directives. Split it into multiple beautiful paragraphs with plenty of dialogue, combat choreography or cultivation breakthroughs where descriptive details make it feel real. 
If the novel is a "System" or "LitRPG" style, include a beautiful neon/cybernetic Cultivation System panel in the story text (formatted cleanly using mono-spaced block grids or brackets like: [System Alert: Qi +100!]).

Also, analyze the events of this chapter and provide list updates/modifications to the permanent story memory so we can track newly met characters, dead characters, relationship updates, unresolved issues, or potential MC advancement.

Also allow narrative cue payloads to carry normalized story metadata such as intensity, tension, powerShift, emotion, danger, mysticism, element, and relationshipShift. Do not directly convert this data into complex Web Audio synthesis yet. For now, AtmosphericAudio may use these values only for simple placeholder behavior such as choosing a sound, adjusting volume slightly, or selecting a basic ambience. Keep the structured payloads clean so SAP can later interpret them as part of a proper meaning-to-score audio system.

You must return a JSON object with the following fields:
{
  "chapterText": "The fully formatted narrative text of the chapter. Use double newlines for paragraph breaks so the reader displays it beautifully.",
  "summary": "A 2-sentence highly concise summary of what transpired in this chapter to store in our historical archive.",
  "statsChangeMessage": "A short status upgrade notification (e.g. '[System Breakthrough: Qi Condensation Rank 2 reached. Meridians purified!]', or 'None')",
  "cuePayload": {
    "intensity": 0.8,
    "tension": 0.5,
    "powerShift": 1,
    "emotion": "awe",
    "danger": 0.2,
    "mysticism": 0.9,
    "element": "void",
    "relationshipShift": 0,
    "signature": "celestial_chime",
    "beastEvent": {
      "type": "reveal",
      "profile": {
        "size": "giant",
        "bodyType": "dragon",
        "element": "lightning",
        "movement": "flying",
        "intelligence": "divine",
        "threatTier": "mythic",
        "signatureSound": "roar"
      }
    }
  },
  "memoryUpdates": {
    "currentPowerStage": "Updated MC power level if they broke through, otherwise the same as before.",
    "newCharacters": [
      {
        "name": "Full name of any secondary character introduced/met",
        "role": "e.g., Arrogant Disciple, Tavern Owner, Rogue Cultivator",
        "description": "Quick description",
        "relationshipToMC": "e.g., Neutral, Ally, Hateful",
        "status": "alive",
        "powerLevel": "e.g., Qi Condensation Tier 9, Core Formation, or unknown",
        "abilities": ["Optional array of known unique techniques/skills"],
        "faction": "Optional. Name of the faction they associate with"
      }
    ],
    "characterStatusUpdates": [
      {
        "name": "Character Name",
        "newStatus": "deceased/alive/unknown/ascended",
        "newRelationship": "Updated attitude toward MC if it changed, otherwise same",
        "newPowerLevel": "Optional. Updated power of the character if they progressed",
        "newAbilities": ["Optional. Any new techniques they revealed/gained in this chapter"],
        "descriptionAppend": "Optional. New facts or secrets revealed about them to append to their codex entry"
      }
    ],
    "newUnresolvedPlotThreads": [
      "Any new mysteries or immediate promises/goals that started in this chapter"
    ],
    "resolvedPlotThreads": [
      "The exact string of any unresolved plot thread that was successfully closed or completed in this chapter. Each list entry must be a strict exact match of an existing unresolved plot thread."
    ],
    "newFactions": [
      {
        "name": "Name of newly introduced faction, sect, or school",
        "description": "Short explanation of their standing & beliefs",
        "alignment": "Righteous / Demonic / Neutral / Mysterious",
        "headquarters": "Primary location or temple",
        "status": "Active / Destroyed / Fractured"
      }
    ],
    "factionUpdates": [
      {
        "name": "Faction Name",
        "statusOverride": "Optional. If their status changed (e.g. Destroyed)",
        "descriptionAppend": "Optional. New secrets/history revealed about the sect"
      }
    ],
    "newLocations": [
      {
        "name": "Name of newly introduced area, realm, pavilion, or planet",
        "description": "Atmosphere and key landmarks",
        "realm": "The broader realm (e.g. Mortal Realm, Celestial Domain)",
        "safetyLevel": "Safe / Dangerous / Lethal"
      }
    ],
    "locationUpdates": [
      {
        "name": "Location Name",
        "safetyLevelOverride": "Optional. If safety changed",
        "descriptionAppend": "Optional. New geographic secrets revealed"
      }
    ],
    "newArtifacts": [
      {
        "name": "Name of the magical treasure, pill, array, or weapon",
        "description": "Magical properties and size/appearance",
        "tier": "Mortal / Earth / Heaven / Primordial",
        "currentOwner": "Who holds this artifact now (e.g. MC, Elder Zhao)"
      }
    ],
    "artifactUpdates": [
      {
        "name": "Artifact Name",
        "newOwner": "Optional. If the artifact changed hands",
        "descriptionAppend": "Optional. New hidden powers or lore revealed about the artifact"
      }
    ],
    "newMCAbilities": [
      "Any newly mastered skill, spell, fist technique, or sword form learned by the MC"
    ]
  }
}

Do not add any text before or after the JSON.`;

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

    const systemInstruction = `You are a visionary series consultant and master of fate for bestselling serialized Chinese web-novels. 
Your task is to analyze the current state of a light novel's lore, characters, power levels, and history, and generate 4 to 6 highly creative and compelling next-step plot direction options for the upcoming Volume/Arc. 
You must output strictly raw JSON matching the requested structure. Keep proposals immersive, keeping true to the tropes of light novels — level progressions, face-slapping, double cultivation, or glowing system holographic screens.`;

    const userPrompt = `Analyze the current state of the light novel and write exactly 4 to 6 potential sequential plot directions.

STORY PROGRESS DETAILS:
- MC Name: ${mcName}
- Genre/Style: ${genre}
- Core Premise: ${customPremise}

CURRENT STORY MEMORY (You must ensure deep lore continuity with these):
- MC Current Level: ${memory.currentPowerStage}
- Power System: ${memory.powerSystem}
- Living Characters: ${JSON.stringify(memory.characters)}
- Unresolved Plots: ${JSON.stringify(memory.unresolvedPlotThreads)}
- World Rules: ${JSON.stringify(memory.worldRules)}

CHRONOLOGY / PAST STORY CONTEXT SUMMARY:
${pastSummaries && pastSummaries.length > 0 ? pastSummaries.join("\n") : "Starting fresh in the immortal matrix."}

Create exactly 4 to 6 potential direction options. Each option must have:
1. "title": A poetic, high-energy light novel style volume/arc title (e.g., 'Return of the Frost King', 'Unveiled System: The Golden Meridian Chamber', 'Ascension to the Obsidian Hellfire Planet').
2. "directionType": Must be exactly one of: 'action' | 'darker' | 'romance' | 'twist' | 'new location' | 'continue'.
3. "description": A short, intriguing 1-2 sentence overview/hint of what might happen, referencing existing characters/rules/factions where applicable to maintain deep lore coherence (e.g., '${mcName} must venture into the Frost Forest using the newly mastered pills, but discovers that the Phoenix Sect has set up a demonic blockade.').

Return strictly a JSON object with this shape:
{
  "directions": [
    {
      "title": "Title of this Direction",
      "directionType": "one of the type strings",
      "description": "Vivid light novel plot preview"
    }
  ]
}

Do not add any text before or after the JSON.`;

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

    const systemInstruction = `You are a visionary series consultant and lead author for bestselling serialized Chinese web-novels. 
Your task is to take a completed story volume, process the steering direction chosen by the reader, and outline a brand new high-stakes sequel story arc (exactly ${count} chapters, continuing the chapter numbering sequence).

CRITICAL COHERENCE ENFORCEMENT:
1. CONSTANT COMPATIBILITY: The sequel MUST fully respect all rules, existing living characters, and power structures defined in the CURRENT COMPREHENSIVE STORY MEMORY. Do not erase, forget, or contradict pre-existing lore.
2. STABILIZED KARMA CHAIN: The sequel must actively address unresolved plot threads inherited from previous volumes. Incorporating them builds a satisfying narrative growth.
3. ORGANIC INITIATION: The first chapters of the sequel should pick up seamlessly from where the final summarised chapter ended, explaining any transition, voyage, or core shift smoothly.

Output strictly raw JSON matching the requested structure.`;

    const startNum = (parseInt(currentArcCount) || 10) + 1;

    const userPrompt = `Create a brand new 10-chapter sequel story arc continuing from chapter ${startNum} for:
Main Character: ${mcName}
Genre Category: ${genre}
Original Premise: ${customPremise}

STEERING SELECTION FOR THIS NEW ARC:
- Direction: "${steerDirection.toUpperCase()}" 
${userCustomDirections ? `- User Specific Guidance: "${userCustomDirections}"` : ""}

CURRENT COMPREHENSIVE STORY MEMORY:
- MC Cultivation Stage: ${memory.currentPowerStage}
- Power System Rules: ${memory.powerSystem}
- Living Characters (THESE CHARACTERS ARE ALREADY KNOWN. DO NOT Treat them as strangers in the new chapter premises!): ${JSON.stringify(memory.characters)}
- Unresolved Plots from previous arcs: ${JSON.stringify(memory.unresolvedPlotThreads)}
- Resolved Plots: ${JSON.stringify(memory.resolvedPlotThreads)}

BRIEF CHRONOLOGY OF PREVIOUS CHAPTERS:
${pastSummaries && pastSummaries.length > 0 ? pastSummaries.join("\n") : "No previous record. Use your creativity to extend smoothly."}

You must return a JSON object containing the new sequential chapter lists (Chapters ${startNum} to ${startNum + count - 1}), introducing dramatic twists, new realms, or romantic complications based on the chosen steer direction.

JSON fields required:
{
  "title": "A grand, poetic sequel Arc title (e.g. 'Volume 2: Descent into the Nine Netherworlds')",
  "chapters": [
    // Must generate exactly ${count} chapters!
    {
      "number": ${startNum},
      "title": "A dramatic title matching the new direction",
      "premise": "Exciting premises showing how the MC starts tackling the new location, fight or twist"
    }
    // ... up to Chapter ${startNum + count - 1}
  ],
  "newCharacters": [
    {
      "name": "Name of any newly conceptualized secondary character introduced in this arc's vision",
      "role": "Mentors/allies/rivals",
      "description": "Short description",
      "relationshipToMC": "Neutral/Ally/Enemy",
      "status": "alive"
    }
  ],
  "newUnresolvedPlotThreads": [
    "New overriding mysteries or major challenges introduced by this direction/shift (at least 2)"
  ]
}

Make sure the tone perfectly incorporates the selected direction (e.g., if "darker", the plot includes demonic techniques, betrayals, and extreme cold cultivator mentalities; if "romance", dynamic emotional bonds, double cultivation sects, or tragic sacrifices; if "twist", key allies being revealed as secret masterminds or the system having dark origins). Keep descriptions profound. Do not add any text before or after the JSON.`;

    const data = await routeTextGeneration(
      "storyMaker",
      systemInstruction,
      userPrompt,
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
    return res.json(result);
  } catch (error: any) {
    console.error("Error generating card image:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 5. Generate Story-Specific Glossary terms and lore definitions
app.post("/api/generate-custom-glossary", async (req, res) => {
  const { storyTitle, mcName, genre, customPremise, characterNames, factionNames, routingConfig } = req.body;
  try {
    const systemInstruction = "You are a keeper of light novel archives and deep scholar of cultivation universes. Return strictly JSON matching the requested structure. Create 4 to 6 incredibly unique and immersive terms matching the active story logic, summarizing magical items, ancient herbs, high arrays, secret cultivation stances, or spatial techniques referenced in current premise bounds.";

    const promptText = `Analyze this active Chinese Web Novel and extract 4 to 6 immersive, story-specific glossary terms:
- Story Title: ${storyTitle}
- MC Cultivator: ${mcName}
- Genre Path: ${genre}
- Novel Core Premise: ${customPremise}
- Key Characters: ${JSON.stringify(characterNames || [])}
- Sects/Factions: ${JSON.stringify(factionNames || [])}

Create customized concepts (secret manuals, spiritual techniques, spatial anomalies, epic arrays, special items) that would fit in Han Feng's or equivalent MC's current world.
Return strictly a JSON object with this shape:
{
  "terms": [
    {
      "term": "Term name (e.g., Nine Suns Meridians Purification, Spiritfrost pill)",
      "category": "Technique / Spell / Item / Location / Concept",
      "definition": "Vivid light novel explanation in 1-2 profound sentences, weaving in the story details where applicable"
    }
  ]
}
Do not add any markup before or after the JSON.`;

    const data = await routeTextGeneration(
      "storyMaker",
      systemInstruction,
      promptText,
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
    const { chapterId, targetLang, englishText, glossaryId, routingConfig } = req.body;

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

    try {
      if (translator) {
        const deeplLangCode = langMapForDeepL[targetLang] || targetLang.toUpperCase();
        const result = await translator.translateText(englishText, null, deeplLangCode as deepl.TargetLanguageCode);
        finalTranslatedText = Array.isArray(result) ? result[0].text : result.text;
      }
    } catch (deeplError) {
      console.warn("DeepL translation failed or not supported for this language. Falling back to Gemini...");
    }

    if (!finalTranslatedText) {
      // Fallback to Gemini
      const prompt = `Translate the following chapter text into the language with language code '${targetLang}'.
Maintain the literary style, formatting, system tags (e.g., [SFX:...]), and keep paragraph breaks intact.

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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
