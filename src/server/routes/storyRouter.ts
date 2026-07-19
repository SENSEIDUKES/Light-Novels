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
  generateAudioSchema,
  pastSummariesSchema,
} from "../schemas";
import { routeTextGeneration, routeImageGeneration, routeTextGenerationStream, ROUTER_PRESETS } from "../../aiRouter";
import { ensureString, cleanBlueprint, cleanInitialArc, cleanSteerArc, cleanChapterResponse, filterRelevantEntities, formatAbilityLedgerForPrompt } from "../helpers";
import { retrieveGlossaryEntries, formatGlossaryForPrompt } from "../../lib/glossary";
import { PROMPTS } from "../prompts";
import {
  buildContextManifest,
  buildContextManifestFromOutcomes,
  contextManifestLogPayload,
} from "../contextManifest";
import {
  ACTIVE_CONTEXT_ENGINE,
  contextBlocksToLegacyStrings,
} from "../../lib/contextBlocks";
import {
  anchorTextFromBlocks,
  ContextEngine,
  formatMainCharacterState,
  latestHistoryText,
  prepareGenerationContext,
} from "../generationContext";
import { logger } from "../logger";
export const storyRouter = express.Router();

const normalizeContextEngine = (_value: unknown): ContextEngine =>
  ACTIVE_CONTEXT_ENGINE;

const normalizeRequestHistory = (
  value: unknown,
  engine: ContextEngine,
) => {
  const rawHistory = Array.isArray(value) ? value : [];
  const blocks = pastSummariesSchema.parse(rawHistory);
  const legacyPastSummaries = engine === "v1"
    && rawHistory.every(item => typeof item === "string")
    ? rawHistory as string[]
    : contextBlocksToLegacyStrings(blocks);
  return { blocks, legacyPastSummaries };
};

const lastSummaryForRanking = (
  engine: ContextEngine,
  blocks: ReturnType<typeof pastSummariesSchema.parse>,
  legacyPastSummaries: string[],
) => engine === "v2"
  ? latestHistoryText(blocks)
  : legacyPastSummaries[legacyPastSummaries.length - 1];

const promptThreadText = (thread: any) => {
  if (typeof thread === "string") return thread;
  if (thread?.description) return String(thread.description);
  return String(thread);
};

const buildIntakeGlossarySourceText = (intake: any) =>
  [
    intake.genrePath,
    intake.corePremise,
    intake.desiredPlotDirection,
    intake.startingPowerConcept,
    intake.powerFlavor,
    intake.powerPace,
    intake.knownRanks,
    intake.uniquePath,
    intake.mustIncludeElements,
    intake.thingsToAvoid,
    intake.storyTags?.join(" "),
  ].filter(Boolean).join(" ");

const initialArcResponseSchema = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    powerSystem: { type: "STRING" },
    currentPowerStage: { type: "STRING" },
    worldRules: { type: "ARRAY", items: { type: "STRING" } },
    characters: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          role: { type: "STRING" },
          description: { type: "STRING" },
          relationshipToMC: { type: "STRING" },
          status: { type: "STRING" }
        },
        required: ["name", "role", "description", "relationshipToMC", "status"]
      }
    },
    unresolvedPlotThreads: { type: "ARRAY", items: { type: "STRING" } },
    chapters: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          number: { type: "NUMBER" },
          title: { type: "STRING" },
          premise: { type: "STRING" }
        },
        required: ["number", "title", "premise"]
      }
    }
  },
  required: ["title", "powerSystem", "currentPowerStage", "worldRules", "characters", "unresolvedPlotThreads", "chapters"]
};

storyRouter.post("/api/generate-blueprint", validateBody(generateBlueprintSchema), async (req, res) => {
  try {
    const { intake, routingConfig } = req.body;
    
    if (!intake) {
      return res.status(400).json({ error: "Missing required fields: intake" });
    }

    const glossaryEntries = retrieveGlossaryEntries({
      genreTags: intake.genrePath ? [intake.genrePath as any] : [],
      sourceText: buildIntakeGlossarySourceText(intake),
      usageMode: 'generation'
    });
    const glossaryRules = formatGlossaryForPrompt(glossaryEntries, 10);
    const systemPrompt = PROMPTS.blueprint.system + (glossaryRules ? `\n${glossaryRules}` : "");

    const data = await routeTextGeneration(
      "storyMaker",
      systemPrompt,
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

    const glossaryEntries = retrieveGlossaryEntries({
      genreTags: intake.genrePath ? [intake.genrePath as any] : [],
      sourceText: [
        buildIntakeGlossarySourceText(intake),
        blueprint.powerSystemOutline,
        blueprint.tropeRules,
        blueprint.styleBible,
        blueprint.firstArcPromise,
      ].filter(Boolean).join(" "),
      usageMode: 'generation'
    });
    const glossaryRules = formatGlossaryForPrompt(glossaryEntries, 10);
    const systemPrompt = PROMPTS.initialArc.system + (glossaryRules ? `\n${glossaryRules}` : "");

    const data = await routeTextGeneration(
      "storyMaker",
      systemPrompt,
      PROMPTS.initialArc.userPrompt(
        JSON.stringify(blueprint, null, 2),
        blueprint.unresolvedPlotThreads || [],
        count
      ),
      "generate-initial-arc",
      routingConfig,
      getCustomKeys(req),
      initialArcResponseSchema
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
      storyTags,
      contextEngine: requestedContextEngine,
    } = req.body;
    const contextEngine = normalizeContextEngine(requestedContextEngine);
    const {
      blocks: contextBlocks,
      legacyPastSummaries,
    } = normalizeRequestHistory(pastSummaries, contextEngine);

    const activeFatePressure = fatePressure || (hardcoreFateMode ? 'Hardcore' : 'Balanced');

    if (!mcName || !currentChapter || !memory) {
      return res.status(400).json({ error: "Missing required fields for chapter generation" });
    }

    const lastSummary = lastSummaryForRanking(
      contextEngine,
      contextBlocks,
      legacyPastSummaries,
    );

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

    const baseMemory = {
      powerSystem: safeStr(memory.powerSystem, 4000),
      currentPowerStage: safeStr(memory.currentPowerStage, 1000),
      worldRules: Array.isArray(memory.worldRules) ? memory.worldRules.slice(0, 20).map(r => safeStr(r, 1000)) : safeStr(memory.worldRules, 4000),
      abilities: formatAbilityLedgerForPrompt(memory.abilities),
      unresolvedPlotThreads: formattedThreads,
    };
    const preparedContext = prepareGenerationContext({
      engine: contextEngine,
      memory,
      baseMemory,
      blocks: contextBlocks,
      legacyPastSummaries,
      fallbackSummary: "This is the very first chapter of the story arc! Set the scene dramatically.",
      threads: formattedThreads,
      worldRules: Array.isArray(baseMemory.worldRules)
        ? baseMemory.worldRules.map(rule => String(rule))
        : baseMemory.worldRules
          ? [String(baseMemory.worldRules)]
          : [],
      pinned: {
        premise: [
          `Chapter ${currentChapterNum}: ${currentChapter.title || ""}`,
          `Goal: ${currentChapter.premise || ""}`,
          genre ? `Genre/style: ${genre}` : "",
          customPremise ? `Core premise: ${customPremise}` : "",
        ].filter(Boolean).join("\n"),
        mcStateCard: formatMainCharacterState({
          mcName,
          powerSystem: baseMemory.powerSystem,
          currentPowerStage: baseMemory.currentPowerStage,
          abilities: memory.abilities,
        }),
      },
      ranking: {
        mcName,
        lastSummary,
        currentContext: currentChapter.premise || "",
        bonusContexts: [memory.unresolvedPlotThreads?.join(" "), customPremise],
        anchorText: anchorTextFromBlocks(contextBlocks),
      },
    });
    const {
      rawMemoryObj,
      memoryJsonStr,
      pastSummariesStr,
      droppedPastSummariesCount,
    } = preparedContext;

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
      storyTags,
      contextEngine,
    );

    const glossaryEntries = retrieveGlossaryEntries({
      genreTags: genre ? [genre as any] : [],
      sourceText: [currentChapter.title, currentChapter.premise, customPremise, memory.powerSystem, memory.currentPowerStage, memory.worldRules, lastSummary].join(" "),
      usageMode: 'generation'
    });
    const glossaryRules = formatGlossaryForPrompt(glossaryEntries, 8);

    let finalUserPrompt = userPrompt;
    if (glossaryRules) {
      finalUserPrompt = glossaryRules + "\n\n" + finalUserPrompt;
    }
    
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
- Show positive milestones and lucky events through natural story action. When a milestone genuinely earns visible Celestial Library UI treatment (any genre — frequent in System/LitRPG stories, selective elsewhere), render it in this response's visible system-panel format described in the system instructions; never put a bracketed alert inside paragraph or dialogue text.
=========================================`;
    } else if (activeFatePressure === 'Balanced') {
      finalUserPrompt += `
      
=========================================
FATE PRESSURE: BALANCED
=========================================
The story is operating under BALANCED fate pressure.
- Deliver standard webnovel stakes: normal progression setbacks, rival friction, and challenging but fully surmountable conflicts.
- Ensure setbacks feel organic and serve to build tension before the next breakthrough or training arc.
- Show new pressure, rivals, and consequences through natural story action. When a consequence genuinely earns visible Celestial Library UI treatment (any genre — frequent in System/LitRPG stories, selective elsewhere), render it in this response's visible system-panel format described in the system instructions; never put a bracketed alert inside paragraph or dialogue text.
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
Death Flag, Betrayal Check, Fate Lock, Destiny Shift, Hidden Timer, and similar Fate labels are UI/control concepts, not normal prose. When a Fate event warrants a visible alert (any genre), render it in this response's visible system-panel format described in the system instructions, styled to the world; keep the surrounding narration natural — prose carries consequences, omens, pressure, and character choices. Never write a bracketed Fate alert inside paragraph or dialogue text.

1. Death risk: Place an important companion, mentor, or loved one at risk of death. Make their vulnerability clear through their vulnerability and the characters' response.
2. Betrayal pressure: Introduce clues or actions indicating a trusted ally might be secretly plotting, compromised, or forced to turn against the MC.
3. Calamity: Force a sudden macro-level crisis: a plague, a massive crop failure, an approaching army, a demonic rift, or an ancient curse that threatens the setting.
4. Moral choice: Force a high-stakes compromise or forced tradeoff where saving one thing means losing another.
5. Karma backlash: Cause past selfish or risky choices to return with heavy, complex consequences.
6. Rival ascension: Show an enemy gaining massive power, authority, or finding their own legendary cheat because they were left unchecked.
7. World fracture: Introduce a major, irreversible change in the laws of nature, sect structures, or the continent's geography.
8. Resource crisis: Put the MC's organization or faction under absolute physical stress (no food, depleted spiritual qi vein, empty treasury, or ruined defenses).
9. Deadline pressure: Establish a concrete approaching danger, such as poison reaching a heart or an invading sect approaching.
10. Irreversible loss: Seal a narrative branch so a past choice or loss has permanent consequences.
 
=========================================
FATE EVENT FREQUENCY DIRECTIVE (1-3 PER ARC):
To maintain proper narrative pacing, follow the Min/Max Rule for Fate Events:
- MINIMUM: At least 1 major Hardcore Fate Event should occur per story arc to ensure real stakes and character growth.
- MAXIMUM: Do NOT exceed 3 major Hardcore Fate Events in a single arc. If an arc is already oversaturated with crises, focus on the dramatic fallout, recovery, or training rather than piling on new unrelated disasters.
If a major event just occurred in the previous chapter, allow the characters time to react and breathe before triggering another!
=========================================

=========================================
TIMING & PLACEMENT DIRECTIVE FOR SYSTEM ALERTS:
When a Fate event genuinely needs visible UI treatment (any genre), place its standalone system panel — using this response's visible system-panel format described in the system instructions — at the end of the chapter or an active turning point. Never place a bracketed Fate alert inside normal paragraph or dialogue text. When no panel is warranted, build the cliffhanger through narrative consequences instead.
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

    const contextManifest = preparedContext.budgetedContext
      ? buildContextManifestFromOutcomes({
          route: "generate-chapter-stream",
          chapterNumber: currentChapterNum,
          systemInstruction,
          finalUserPrompt,
          outcomes: preparedContext.budgetedContext.outcomes,
          memoryAndHistoryBudgetTokens:
            preparedContext.budgetedContext.totalBudgetTokens,
        })
      : buildContextManifest({
          engine: "v1",
          route: "generate-chapter-stream",
          chapterNumber: currentChapterNum,
          chapterTitle: currentChapter.title,
          chapterPremise: currentChapter.premise,
          mcName,
          genre,
          customPremise,
          systemInstruction,
          finalUserPrompt,
          rawMemory: rawMemoryObj,
          sourceMemory: memory,
          memoryJsonStr,
          pastSummariesStr,
          pastSummaries: preparedContext.legacyPastSummaries,
          droppedPastSummariesCount,
          styleBible,
          tropeRules,
          storyTags,
          glossaryRules,
          pacingDirective,
          fatePressure: activeFatePressure,
        });
    logger.info(
      { event: "chapter_context_manifest", contextManifest: contextManifestLogPayload(contextManifest) },
      `Chapter ${currentChapterNum} context manifest`,
    );

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(`data: ${JSON.stringify({ contextManifest })}\n\n`);

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
      storyTags,
      contextEngine: requestedContextEngine,
    } = req.body;
    const contextEngine = normalizeContextEngine(requestedContextEngine);
    const {
      blocks: contextBlocks,
      legacyPastSummaries,
    } = normalizeRequestHistory(pastSummaries, contextEngine);

    const activeFatePressure = fatePressure || (hardcoreFateMode ? 'Hardcore' : 'Balanced');

    if (!mcName || !currentChapter || !memory) {
      return res.status(400).json({ error: "Missing required fields for chapter generation" });
    }

    const lastSummary = lastSummaryForRanking(
      contextEngine,
      contextBlocks,
      legacyPastSummaries,
    );

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

    const baseMemory = {
      powerSystem: safeStr(memory.powerSystem, 4000),
      currentPowerStage: safeStr(memory.currentPowerStage, 1000),
      worldRules: Array.isArray(memory.worldRules) ? memory.worldRules.slice(0, 20).map(r => safeStr(r, 1000)) : safeStr(memory.worldRules, 4000),
      abilities: formatAbilityLedgerForPrompt(memory.abilities),
      unresolvedPlotThreads: formattedThreads,
    };
    const preparedContext = prepareGenerationContext({
      engine: contextEngine,
      memory,
      baseMemory,
      blocks: contextBlocks,
      legacyPastSummaries,
      fallbackSummary: "This is the very first chapter of the story arc! Set the scene dramatically.",
      threads: formattedThreads,
      worldRules: Array.isArray(baseMemory.worldRules)
        ? baseMemory.worldRules.map(rule => String(rule))
        : baseMemory.worldRules
          ? [String(baseMemory.worldRules)]
          : [],
      pinned: {
        premise: [
          `Chapter ${currentChapterNum}: ${currentChapter.title || ""}`,
          `Goal: ${currentChapter.premise || ""}`,
          genre ? `Genre/style: ${genre}` : "",
          customPremise ? `Core premise: ${customPremise}` : "",
        ].filter(Boolean).join("\n"),
        mcStateCard: formatMainCharacterState({
          mcName,
          powerSystem: baseMemory.powerSystem,
          currentPowerStage: baseMemory.currentPowerStage,
          abilities: memory.abilities,
        }),
      },
      ranking: {
        mcName,
        lastSummary,
        currentContext: currentChapter.premise || "",
        bonusContexts: [memory.unresolvedPlotThreads?.join(" "), customPremise],
        anchorText: anchorTextFromBlocks(contextBlocks),
      },
    });
    const {
      rawMemoryObj,
      memoryJsonStr,
      pastSummariesStr,
      droppedPastSummariesCount,
    } = preparedContext;

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
      storyTags,
      contextEngine,
    );

    const glossaryEntries = retrieveGlossaryEntries({
      genreTags: genre ? [genre as any] : [],
      sourceText: [currentChapter.title, currentChapter.premise, customPremise, memory.powerSystem, memory.currentPowerStage, memory.worldRules, lastSummary].join(" "),
      usageMode: 'generation'
    });
    const glossaryRules = formatGlossaryForPrompt(glossaryEntries, 8);

    let finalUserPrompt = userPrompt;
    if (glossaryRules) {
      finalUserPrompt = glossaryRules + "\n\n" + finalUserPrompt;
    }

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
- Show positive milestones and lucky events through natural story action. When a milestone genuinely earns visible Celestial Library UI treatment (any genre — frequent in System/LitRPG stories, selective elsewhere), render it in this response's visible system-panel format described in the system instructions; never put a bracketed alert inside paragraph or dialogue text.
=========================================`;
    } else if (activeFatePressure === 'Balanced') {
      finalUserPrompt += `
      
=========================================
FATE PRESSURE: BALANCED
=========================================
The story is operating under BALANCED fate pressure.
- Deliver standard webnovel stakes: normal progression setbacks, rival friction, and challenging but fully surmountable conflicts.
- Ensure setbacks feel organic and serve to build tension before the next breakthrough or training arc.
- Show new pressure, rivals, and consequences through natural story action. When a consequence genuinely earns visible Celestial Library UI treatment (any genre — frequent in System/LitRPG stories, selective elsewhere), render it in this response's visible system-panel format described in the system instructions; never put a bracketed alert inside paragraph or dialogue text.
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
Death Flag, Betrayal Check, Fate Lock, Destiny Shift, Hidden Timer, and similar Fate labels are UI/control concepts, not normal prose. When a Fate event warrants a visible alert (any genre), render it in this response's visible system-panel format described in the system instructions, styled to the world; keep the surrounding narration natural — prose carries consequences, omens, pressure, and character choices. Never write a bracketed Fate alert inside paragraph or dialogue text.

1. Death risk: Place an important companion, mentor, or loved one at risk of death. Make their vulnerability clear through their vulnerability and the characters' response.
2. Betrayal pressure: Introduce clues or actions indicating a trusted ally might be secretly plotting, compromised, or forced to turn against the MC.
3. Calamity: Force a sudden macro-level crisis: a plague, a massive crop failure, an approaching army, a demonic rift, or an ancient curse that threatens the setting.
4. Moral choice: Force a high-stakes compromise or forced tradeoff where saving one thing means losing another.
5. Karma backlash: Cause past selfish or risky choices to return with heavy, complex consequences.
6. Rival ascension: Show an enemy gaining massive power, authority, or finding their own legendary cheat because they were left unchecked.
7. World fracture: Introduce a major, irreversible change in the laws of nature, sect structures, or the continent's geography.
8. Resource crisis: Put the MC's organization or faction under absolute physical stress (no food, depleted spiritual qi vein, empty treasury, or ruined defenses).
9. Deadline pressure: Establish a concrete approaching danger, such as poison reaching a heart or an invading sect approaching.
10. Irreversible loss: Seal a narrative branch so a past choice or loss has permanent consequences.
 
=========================================
FATE EVENT FREQUENCY DIRECTIVE (1-3 PER ARC):
To maintain proper narrative pacing, follow the Min/Max Rule for Fate Events:
- MINIMUM: At least 1 major Hardcore Fate Event should occur per story arc to ensure real stakes and character growth.
- MAXIMUM: Do NOT exceed 3 major Hardcore Fate Events in a single arc. If an arc is already oversaturated with crises, focus on the dramatic fallout, recovery, or training rather than piling on new unrelated disasters.
If a major event just occurred in the previous chapter, allow the characters time to react and breathe before triggering another!
=========================================

=========================================
TIMING & PLACEMENT DIRECTIVE FOR SYSTEM ALERTS:
When a Fate event genuinely needs visible UI treatment (any genre), place its standalone system panel — using this response's visible system-panel format described in the system instructions — at the end of the chapter or an active turning point. Never place a bracketed Fate alert inside normal paragraph or dialogue text. When no panel is warranted, build the cliffhanger through narrative consequences instead.
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

    const contextManifest = preparedContext.budgetedContext
      ? buildContextManifestFromOutcomes({
          route: "generate-chapter",
          chapterNumber: currentChapterNum,
          systemInstruction,
          finalUserPrompt,
          outcomes: preparedContext.budgetedContext.outcomes,
          memoryAndHistoryBudgetTokens:
            preparedContext.budgetedContext.totalBudgetTokens,
        })
      : buildContextManifest({
          engine: "v1",
          route: "generate-chapter",
          chapterNumber: currentChapterNum,
          chapterTitle: currentChapter.title,
          chapterPremise: currentChapter.premise,
          mcName,
          genre,
          customPremise,
          systemInstruction,
          finalUserPrompt,
          rawMemory: rawMemoryObj,
          sourceMemory: memory,
          memoryJsonStr,
          pastSummariesStr,
          pastSummaries: preparedContext.legacyPastSummaries,
          droppedPastSummariesCount,
          styleBible,
          tropeRules,
          storyTags,
          glossaryRules,
          pacingDirective,
          fatePressure: activeFatePressure,
        });
    logger.info(
      { event: "chapter_context_manifest", contextManifest: contextManifestLogPayload(contextManifest) },
      `Chapter ${currentChapterNum} context manifest`,
    );

    const data = await routeTextGeneration(
      "storyMaker",
      systemInstruction,
      finalUserPrompt,
      "generate-chapter",
      routingConfig,
      getCustomKeys(req)
    );
    return res.json({
      ...cleanChapterResponse(data),
      contextManifest,
    });
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
    estimatedArcs,
    contextEngine: requestedContextEngine,
  } = req.body;

  try {
    if (!mcName || !memory) {
      return res.status(400).json({ error: "Missing required fields for directions generation" });
    }

    const contextEngine = normalizeContextEngine(requestedContextEngine);
    const {
      blocks: contextBlocks,
      legacyPastSummaries,
    } = normalizeRequestHistory(pastSummaries, contextEngine);
    const lastSummary = lastSummaryForRanking(
      contextEngine,
      contextBlocks,
      legacyPastSummaries,
    );
    const baseMemory = {
      powerSystem: memory.powerSystem,
      currentPowerStage: memory.currentPowerStage,
      worldRules: memory.worldRules,
      destinedEnding: destinedEnding || memory.destinedEnding || undefined,
      unresolvedPlotThreads: memory.unresolvedPlotThreads,
    };
    const preparedContext = prepareGenerationContext({
      engine: contextEngine,
      memory,
      baseMemory,
      blocks: contextBlocks,
      legacyPastSummaries,
      fallbackSummary: "Starting fresh in the immortal matrix.",
      threads: Array.isArray(memory.unresolvedPlotThreads)
        ? memory.unresolvedPlotThreads.map(promptThreadText)
        : [],
      worldRules: Array.isArray(memory.worldRules)
        ? memory.worldRules.map((rule: unknown) => String(rule))
        : memory.worldRules
          ? [String(memory.worldRules)]
          : [],
      pinned: {
        premise: [
          customPremise ? `Core premise: ${customPremise}` : "",
          genre ? `Genre/style: ${genre}` : "",
          `Plan the immediate next arc after arc ${currentArcCount || 1}.`,
          estimatedArcs ? `Estimated total arcs: ${estimatedArcs}` : "",
        ].filter(Boolean).join("\n"),
        mcStateCard: formatMainCharacterState({
          mcName,
          powerSystem: memory.powerSystem,
          currentPowerStage: memory.currentPowerStage,
          destinedEnding: destinedEnding || memory.destinedEnding,
        }),
      },
      ranking: {
        mcName,
        lastSummary,
        currentContext: "",
        bonusContexts: [memory.unresolvedPlotThreads?.join(" "), customPremise],
        anchorText: anchorTextFromBlocks(contextBlocks),
      },
    });
    const { memoryJsonStr, pastSummariesStr } = preparedContext;

    const systemInstruction = PROMPTS.directions.system;
    const userPrompt = PROMPTS.directions.userPrompt(
      mcName,
      genre,
      customPremise,
      memoryJsonStr,
      pastSummariesStr,
      destinedEnding || memory.destinedEnding,
      currentArcCount,
      estimatedArcs,
      contextEngine,
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
      routingConfig,
      contextEngine: requestedContextEngine,
    } = req.body;

    if (!mcName || !memory || !steerDirection) {
      return res.status(400).json({ error: "Missing required steering fields" });
    }

    const count = 10; // Generate next 10 chapters max to maintain excellent quality and prevent drift
    const startNum = (parseInt(currentArcCount) || 10) + 1;

    const contextEngine = normalizeContextEngine(requestedContextEngine);
    const {
      blocks: contextBlocks,
      legacyPastSummaries,
    } = normalizeRequestHistory(pastSummaries, contextEngine);
    const lastSummary = lastSummaryForRanking(
      contextEngine,
      contextBlocks,
      legacyPastSummaries,
    );
    const baseMemory = {
      currentPowerStage: memory.currentPowerStage,
      powerSystem: memory.powerSystem,
      unresolvedPlotThreads: memory.unresolvedPlotThreads,
      resolvedPlotThreads: memory.resolvedPlotThreads,
    };
    const preparedContext = prepareGenerationContext({
      engine: contextEngine,
      memory,
      baseMemory,
      blocks: contextBlocks,
      legacyPastSummaries,
      fallbackSummary: "No previous record. Use your creativity to extend smoothly.",
      threads: Array.isArray(memory.unresolvedPlotThreads)
        ? memory.unresolvedPlotThreads.map(promptThreadText)
        : [],
      worldRules: [],
      pinned: {
        premise: [
          customPremise ? `Core premise: ${customPremise}` : "",
          genre ? `Genre/style: ${genre}` : "",
          `Next chapter number: ${startNum}`,
          `Steering direction: ${steerDirection}`,
          userCustomDirections ? `Author guidance: ${userCustomDirections}` : "",
        ].filter(Boolean).join("\n"),
        mcStateCard: formatMainCharacterState({
          mcName,
          powerSystem: memory.powerSystem,
          currentPowerStage: memory.currentPowerStage,
          resolvedPlotThreads: memory.resolvedPlotThreads,
        }),
      },
      ranking: {
        mcName,
        lastSummary,
        currentContext: steerDirection,
        bonusContexts: [
          userCustomDirections,
          memory.unresolvedPlotThreads?.join(" "),
          customPremise,
        ],
        anchorText: anchorTextFromBlocks(contextBlocks),
      },
    });
    const { memoryJsonStr, pastSummariesStr } = preparedContext;

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
        count,
        contextEngine,
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

