import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { routeTextGeneration, routeImageGeneration, ROUTER_PRESETS } from "./aiRouter";

dotenv.config();

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

// ==========================================
// API ROUTES
// ==========================================

// 0. Get available router presets
app.get("/api/router-presets", (req, res) => {
  res.json(ROUTER_PRESETS);
});

// 1. Initial story arc generation
app.post("/api/generate-initial-arc", async (req, res) => {
  try {
    const { mcName, genre, customPremise, chapterCount, routingConfig } = req.body;
    
    if (!mcName || !genre || !customPremise) {
      return res.status(400).json({ error: "Missing required fields: mcName, genre, customPremise" });
    }

    const count = Math.min(parseInt(chapterCount) || 10, 10);

    const systemInstruction = `You are a legendary grandmaster editor and creative author specializing in Chinese Web Novels (Xianxia, Xuanhuan, Cultivation, LitRPG, and System novels). 
Your task is to craft high-energy initial serialized story structures. 
You must output strictly raw JSON matching the requested structure. Keep descriptions immersive, keeping true to the tropes of light novels — level progressions, face-slapping, arrogant young masters, mysterious elders, rare medicinal pills, jade treasures, ancient inheritances, or glowing holographic LitRPG system status screens.`;

    const userPrompt = `Create a brand new Chinese Light Novel inspired Story Arc (comprising exactly ${count} chapters) for:
Main Character Name: ${mcName}
Genre Category: ${genre}
Core Premise / Secret Catalyst: ${customPremise}

You must return a JSON object with the following fields:
{
  "title": "A grand, poetic Volume / Arc title (e.g. 'Volume 1: Awakening the Sky-Shattering Cauldron')",
  "powerSystem": "A concise paragraph outlining the cultivation ranks/tiers in this universe (e.g., Qi Condensation, Foundation Establishment, Core Formation, Nascent Soul, Soul Transformation)",
  "currentPowerStage": "The lowest starting level for the MC (e.g., 'Mortal', 'Qi Condensation Tier 1 (Crippled Meridians)', 'F-Rank Human')",
  "worldRules": [
    "At least 4 crucial rules of this savage cultivator world (e.g., 'Strength is absolute; the weak have no human rights.', 'The Law of the Jungle applies: treasures belong to those with the fist to hold them.')"
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
  "unresolvedPlotThreads": [
    "At least 3 initial mysteries or goals (e.g., 'Discover who poisoned the MC's spiritual root', 'Unlock the second tier of the supreme jade pendant', 'Avenge the mockery at the clan tournament')"
  ],
  "chapters": [
    // Create exactly ${count} chapters. The indices must range from 1 to ${count}.
    {
      "number": 1,
      "title": "A dramatic title (e.g. 'Meridians Destroyed, A Mockery in the Main Hall')",
      "premise": "A brief, exciting operational goal/premise for this chapter (e.g., MC's fiancé breaks off the engagement; MC accidentally drops blood on the rusty ring, awakening a primordial saint master.)"
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
    return res.json(data);
  } catch (error: any) {
    console.error("Error generating initial arc:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
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
3. CHARACTER ACCORD: Never create a new character that conflicts with or duplicates the name of an existing one. Respect historical character relationships and status.
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
- Living/Met Characters: ${JSON.stringify(memory.characters)}
- Unresolved Plots: ${JSON.stringify(memory.unresolvedPlotThreads)}

PAST SUMMARY CONTEXT (What happened in previous chapters to prevent plot holes):
${pastSummaries && pastSummaries.length > 0 ? pastSummaries.join("\n") : "This is the very first chapter of the story arc! Set the scene dramatically."}

Write a fully fleshed-out chapter of approximately 800 to 1400 words. Split it into multiple beautiful paragraphs with plenty of dialogue, combat choreography or cultivation breakthroughs where descriptive details make it feel real. 
If the novel is a "System" or "LitRPG" style, include a beautiful neon/cybernetic Cultivation System panel in the story text (formatted cleanly using mono-spaced block grids or brackets like: [System Alert: Qi +100!]).

Also, analyze the events of this chapter and provide list updates/modifications to the permanent story memory so we can track newly met characters, dead characters, relationship updates, unresolved issues, or potential MC advancement.

You must return a JSON object with the following fields:
{
  "chapterText": "The fully formatted narrative text of the chapter. Use double newlines for paragraph breaks so the reader displays it beautifully.",
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
        "newAbilities": ["Optional. Any new techniques they revealed/gained in this chapter"]
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
    "newLocations": [
      {
        "name": "Name of newly introduced area, realm, pavilion, or planet",
        "description": "Atmosphere and key landmarks",
        "realm": "The broader realm (e.g. Mortal Realm, Celestial Domain)",
        "safetyLevel": "Safe / Dangerous / Lethal"
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
    return res.json(data);
  } catch (error: any) {
    console.error("Error generating chapter:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
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
- Living Characters: ${JSON.stringify(memory.characters)}
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
    return res.json(data);
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


// ==========================================
// VITE CLIENT DEV SERVER INTEGRATION
// ==========================================

async function startServer() {
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
