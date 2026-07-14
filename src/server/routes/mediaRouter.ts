import { logger } from "../logger";
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
export const mediaRouter = express.Router();
mediaRouter.post("/api/generate-card-image", validateBody(generateCardImageSchema), async (req, res) => {
  const { prompt, type, routingConfig } = req.body;
  try {
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt parameter for image generation" });
    }
    const result = await routeImageGeneration(prompt, type, routingConfig, getCustomKeys(req));
    // Provide backwards compatible property and new array
    return res.json({ ...result, imageUrl: result.imageUrls?.[0] });
  } catch (error: any) {
    logger.error({ err: error }, "Error generating card image");
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});
mediaRouter.post("/api/test-image-gen", async (req, res) => {
  try {
    const result = await routeImageGeneration("test", "portrait", { provider: "gemini", model: "gemini-3.1-flash-lite-image" }, getCustomKeys(req));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({error: err.message});
  }
});
export const generateCultivatorPortrait = async (req: express.Request, res: express.Response) => {
  const { image, description, daoRank, daoXp, powerStage, equippedArtifact, routingConfig } = req.body;
  try {
    const customKeys = getCustomKeys(req);
    const apiKey = customKeys?.geminiApiKey || process.env.GEMINI_API_KEY;
    let refinedPrompt = "";

    if (image && apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "") {
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
        logger.warn({ err: geminiError }, "Gemini vision analysis failed, falling back to description-based prompt");
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
      note: "Source and reference images are not retained by this endpoint. An accepted generated portrait may be saved to your signed-in account by the client."
    });
  } catch (error: any) {
    logger.error({ err: error }, "Error generating cultivator portrait");
    return res.status(500).json({ error: error.message || "Celestial alignment interrupted." });
  }
};
mediaRouter.post("/api/generate-cultivator-portrait", validateBody(generateCultivatorPortraitSchema), generateCultivatorPortrait);
mediaRouter.post("/api/generate-audio", validateBody(generateAudioSchema), async (req, res) => {
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
      logger.info(`[TTS] Requesting OpenRouter for voice '${speakerVoice}' using Kokoro...`);
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
          logger.info("[TTS] OpenRouter TTS generation succeeded!");
        } else {
          const errText = await response.text();
          logger.warn(`[TTS] OpenRouter TTS generation failed (status ${response.status}): ${errText}`);
        }
      } catch (orErr) {
        logger.error({ err: orErr }, "[TTS] OpenRouter TTS generation threw an error");
      }
    }

    // 2. Try DeepInfra (if user provides DeepInfra Key)
    if (!base64Audio && deepinfraKey && deepinfraKey !== "MY_DEEPINFRA_API_KEY" && deepinfraKey.trim() !== "") {
      logger.info(`[TTS] Requesting DeepInfra for voice '${speakerVoice}'...`);
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
          logger.info("[TTS] DeepInfra TTS generation succeeded!");
        } else {
          const errText = await response.text();
          logger.warn(`[TTS] DeepInfra TTS generation failed: ${errText}`);
        }
      } catch (diErr) {
        logger.error({ err: diErr }, "[TTS] DeepInfra TTS generation threw an error");
      }
    }

    // Fallback 1: ylacombe/kokoro-82m Gradio Space
    if (!base64Audio) {
      logger.info(`[TTS] Falling back to public Hugging Face Space (ylacombe/kokoro-82m) for voice '${speakerVoice}'...`);
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
          logger.warn(`[TTS] Space ylacombe/kokoro-82m returned status: ${hfResponse.status}`);
        }
      } catch (hfErr) {
        logger.error({ err: hfErr }, "[TTS] ylacombe/kokoro-82m Space fallback failed");
      }
    }

    // Fallback 2: gokaygokay/Kokoro-82M Gradio Space
    if (!base64Audio) {
      logger.info(`[TTS] Falling back to secondary Hugging Face Space (gokaygokay-kokoro-82m)...`);
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
        logger.error({ err: hfErr2 }, "[TTS] gokaygokay-kokoro-82m Space fallback failed");
      }
    }

    if (!base64Audio) {
      throw new Error("Could not generate audio using DeepInfra or public Kokoro TTS fallbacks.");
    }

    return res.json({ base64Audio });
  } catch (error: any) {
    logger.error({ err: error }, "Error generating audio");
    return res.status(500).json({ error: error.message || "Failed to generate audio" });
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

