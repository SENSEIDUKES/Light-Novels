import express from "express";

import * as deepl from 'deepl-node';
let translator: deepl.Translator | null = null;
const DEEPL_AUTH_KEY = process.env.DEEPL_AUTH_KEY;
if (DEEPL_AUTH_KEY) {
  translator = new deepl.Translator(DEEPL_AUTH_KEY);
}

import path from "path";






import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { z } from "zod";
import pinoHttp from "pino-http";
import { logger } from "../logger";
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
export const codexRouter = express.Router();
codexRouter.post("/api/dao-insight", validateBody(daoInsightSchema), async (req, res) => {
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
    const { cleanAndParseJSON } = await import("../../aiRouter");
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
codexRouter.post("/api/suggest-tags", validateBody(suggestTagsSchema), async (req, res) => {
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
codexRouter.post("/api/generate-custom-glossary", validateBody(generateCustomGlossarySchema), async (req, res) => {
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
codexRouter.post("/api/translate-chapter", validateBody(translateChapterSchema), async (req, res) => {
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

// Helper to extract custom API credentials/configurations
function getCustomKeys(req: any) {
  return {
    geminiApiKey: (req.header("x-gemini-key") as string) || undefined,
    openrouterApiKey: (req.header("x-openrouter-key") as string) || undefined,
    ollamaHost: (req.header("x-ollama-host") as string) || undefined,
    deepinfraApiKey: (req.header("x-deepinfra-key") as string) || undefined,
  };
}

