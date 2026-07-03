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
import { ensureString, cleanBlueprint, cleanInitialArc, cleanSteerArc, cleanChapterResponse, filterRelevantEntities, rankRelevantEntities, truncateContextIfNeeded } from "../helpers";
import { PROMPTS } from "../prompts";
export const storyRouter = express.Router();
storyRouter.post("/api/generate-blueprint", validateBody(generateBlueprintSchema), async (req, res) => {
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
storyRouter.post("/api/generate-initial-arc", validateBody(generateInitialArcSchema), async (req, res) => {
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
storyRouter.post("/api/generate-chapter-stream", validateBody(chapterGenerationSchema), async (req, res) => {
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

    const rawMemoryObj = {
      powerSystem: safeStr(memory.powerSystem, 4000),
      currentPowerStage: safeStr(memory.currentPowerStage, 1000),
      worldRules: Array.isArray(memory.worldRules) ? memory.worldRules.slice(0, 20).map(r => safeStr(r, 1000)) : safeStr(memory.worldRules, 4000),
      unresolvedPlotThreads: formattedThreads,
      characters: rankRelevantEntities(memory.characters, mcName, lastSummary, currentChapter.premise, [memory.unresolvedPlotThreads?.join(" "), customPremise]),
      factions: rankRelevantEntities(memory.factions, mcName, lastSummary, currentChapter.premise, [memory.unresolvedPlotThreads?.join(" "), customPremise]),
      locations: rankRelevantEntities(memory.locations, mcName, lastSummary, currentChapter.premise, [memory.unresolvedPlotThreads?.join(" "), customPremise]),
      artifacts: rankRelevantEntities(memory.artifacts, mcName, lastSummary, currentChapter.premise, [memory.unresolvedPlotThreads?.join(" "), customPremise])
    };

    const { memoryJsonStr, pastSummariesStr } = truncateContextIfNeeded(rawMemoryObj, pastSummaries, 80000, "This is the very first chapter of the story arc! Set the scene dramatically.");

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
storyRouter.post("/api/generate-chapter", validateBody(chapterGenerationSchema), async (req, res) => {
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

    const rawMemoryObj = {
      powerSystem: safeStr(memory.powerSystem, 4000),
      currentPowerStage: safeStr(memory.currentPowerStage, 1000),
      worldRules: Array.isArray(memory.worldRules) ? memory.worldRules.slice(0, 20).map(r => safeStr(r, 1000)) : safeStr(memory.worldRules, 4000),
      unresolvedPlotThreads: formattedThreads,
      characters: rankRelevantEntities(memory.characters, mcName, lastSummary, currentChapter.premise, [memory.unresolvedPlotThreads?.join(" "), customPremise]),
      factions: rankRelevantEntities(memory.factions, mcName, lastSummary, currentChapter.premise, [memory.unresolvedPlotThreads?.join(" "), customPremise]),
      locations: rankRelevantEntities(memory.locations, mcName, lastSummary, currentChapter.premise, [memory.unresolvedPlotThreads?.join(" "), customPremise]),
      artifacts: rankRelevantEntities(memory.artifacts, mcName, lastSummary, currentChapter.premise, [memory.unresolvedPlotThreads?.join(" "), customPremise])
    };

    const { memoryJsonStr, pastSummariesStr } = truncateContextIfNeeded(rawMemoryObj, pastSummaries, 80000, "This is the very first chapter of the story arc! Set the scene dramatically.");

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
storyRouter.post("/api/extract-chapter-metadata", validateBody(extractMetadataSchema), async (req, res) => {
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
storyRouter.post("/api/repair-chapter-stream", validateBody(repairChapterSchema), async (req, res) => {
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
storyRouter.post("/api/check-consistency", validateBody(checkConsistencySchema), async (req, res) => {
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
        },
        silentLogs: {
          type: "ARRAY",
          items: { type: "STRING" }
        }
      },
      required: ["warnings", "silentLogs"]
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

    return res.json({ warnings: data.warnings || [], silentLogs: data.silentLogs || [] });
  } catch (error: any) {
    console.error("Error in consistency guard:", error);
    return res.status(500).json({ error: error.message || "Consistency check failed" });
  }
});
storyRouter.post("/api/generate-next-directions", validateBody(generateNextDirectionsSchema), async (req, res) => {
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

    const lastSummary = pastSummaries && pastSummaries.length > 0 ? pastSummaries[pastSummaries.length - 1] : undefined;

    const rawMemoryObj = {
      powerSystem: memory.powerSystem,
      currentPowerStage: memory.currentPowerStage,
      worldRules: memory.worldRules,
      destinedEnding: destinedEnding || memory.destinedEnding || undefined,
      unresolvedPlotThreads: memory.unresolvedPlotThreads,
      characters: rankRelevantEntities(memory.characters, mcName, lastSummary, "", [memory.unresolvedPlotThreads?.join(" "), customPremise]),
      factions: rankRelevantEntities(memory.factions, mcName, lastSummary, "", [memory.unresolvedPlotThreads?.join(" "), customPremise]),
      locations: rankRelevantEntities(memory.locations, mcName, lastSummary, "", [memory.unresolvedPlotThreads?.join(" "), customPremise]),
      artifacts: rankRelevantEntities(memory.artifacts, mcName, lastSummary, "", [memory.unresolvedPlotThreads?.join(" "), customPremise]),
    };

    const { memoryJsonStr, pastSummariesStr } = truncateContextIfNeeded(rawMemoryObj, pastSummaries, 80000, "Starting fresh in the immortal matrix.");

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
storyRouter.post("/api/steer-arc", validateBody(steerArcSchema), async (req, res) => {
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

    const lastSummary = pastSummaries && pastSummaries.length > 0 ? pastSummaries[pastSummaries.length - 1] : undefined;

    const rawMemoryObj = {
      currentPowerStage: memory.currentPowerStage,
      powerSystem: memory.powerSystem,
      unresolvedPlotThreads: memory.unresolvedPlotThreads,
      resolvedPlotThreads: memory.resolvedPlotThreads,
      characters: rankRelevantEntities(memory.characters, mcName, lastSummary, steerDirection, [userCustomDirections, memory.unresolvedPlotThreads?.join(" "), customPremise]),
      factions: rankRelevantEntities(memory.factions, mcName, lastSummary, steerDirection, [userCustomDirections, memory.unresolvedPlotThreads?.join(" "), customPremise]),
      locations: rankRelevantEntities(memory.locations, mcName, lastSummary, steerDirection, [userCustomDirections, memory.unresolvedPlotThreads?.join(" "), customPremise]),
      artifacts: rankRelevantEntities(memory.artifacts, mcName, lastSummary, steerDirection, [userCustomDirections, memory.unresolvedPlotThreads?.join(" "), customPremise])
    };

    const { memoryJsonStr, pastSummariesStr } = truncateContextIfNeeded(rawMemoryObj, pastSummaries, 80000, "No previous record. Use your creativity to extend smoothly.");

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

// Helper to extract custom API credentials/configurations
function getCustomKeys(req: any) {
  return {
    geminiApiKey: (req.header("x-gemini-key") as string) || undefined,
    openrouterApiKey: (req.header("x-openrouter-key") as string) || undefined,
    ollamaHost: (req.header("x-ollama-host") as string) || undefined,
    deepinfraApiKey: (req.header("x-deepinfra-key") as string) || undefined,
  };
}

