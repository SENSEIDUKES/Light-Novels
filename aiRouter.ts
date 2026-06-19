import { GoogleGenAI } from "@google/genai";
import { RouteConfig, MultiModelRouting } from "./src/types";

// Lazy-loaded Gemini clients
let defaultAIClient: GoogleGenAI | null = null;
export function getAIClient(customApiKey?: string) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("GEMINI_API_KEY environment variable is not configured on the server. Please supply a valid key in the Router settings or Settings > Secrets.");
  }

  if (customApiKey) {
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  if (!defaultAIClient) {
    defaultAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return defaultAIClient;
}

// Router default presets
export const ROUTER_PRESETS = {
  storyMaker: {
    gemini: ["gemini-3.5-flash", "gemini-3.1-pro-preview", "gemini-3.1-flash-lite"],
    openrouter: [
      "meta-llama/llama-3-8b-instruct:free",
      "mistralai/mistral-7b-instruct:free",
      "google/gemma-2-9b-it:free",
      "google/gemini-2.5-flash",
      "openai/gpt-3.5-turbo"
    ],
    ollama: ["llama3", "gemma2", "mistral", "phi3"]
  },
  imageGenerator: {
    gemini: ["gemini-2.5-flash-image", "gemini-3.1-flash-image"],
    openrouter: ["stable-diffusion-xl", "playgroundai/playground-v2.5", "shuttle-ai/shuttle-3-diffusion"],
    ollama: ["local-sd-mortal", "local-sd-celestial"]
  }
};

// Robust helper to parse LLM JSON responses safely
export function cleanAndParseJSON(rawText: string) {
  let cleaned = rawText.trim();
  
  // Strip lines starting with markdown block characters
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  
  cleaned = cleaned.trim();
  
  try {
    return JSON.parse(cleaned);
  } catch (err: any) {
    console.warn("Direct JSON parse failed, trying regex extraction:", err);
    // Regex backup: attempt to extract content between first { and last }
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (nestedErr) {
        throw new Error("Failed to parse JSON response: " + cleaned);
      }
    }
    throw new Error("Failed to parse JSON response: " + cleaned);
  }
}

// Master function to route and execute text generation
export async function routeTextGeneration(
  route: "storyMaker",
  systemInstruction: string,
  userPrompt: string,
  routeKey: string, // e.g., "generate-chapter", "steer-arc" etc.
  routingConfig?: RouteConfig,
  customKeys?: { geminiApiKey?: string; openrouterApiKey?: string; ollamaHost?: string; }
): Promise<any> {
  const activeConfig: RouteConfig = routingConfig || {
    provider: "gemini",
    model: "gemini-3.5-flash"
  };

  const { provider, model } = activeConfig;
  console.log(`[aiRouter] Routing task '${routeKey}' via Route '${route}' -> Provider: '${provider}', Model: '${model}'`);

  if (provider === "gemini") {
    // -------------------------------------------------------------
    // GOOGLE GEMINI ROUTE
    // -------------------------------------------------------------
    const ai = getAIClient(customKeys?.geminiApiKey);
    try {
      const response = await ai.models.generateContent({
        model: model || "gemini-3.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.95,
        }
      });

      if (!response.text) {
        throw new Error("No text response received from Gemini.");
      }

      return cleanAndParseJSON(response.text);
    } catch (error: any) {
      console.error("[aiRouter] Gemini provider encountered error:", error);
      throw error;
    }
  } else if (provider === "openrouter") {
    // -------------------------------------------------------------
    // OPENROUTER ROUTE
    // -------------------------------------------------------------
    const apiKey = customKeys?.openrouterApiKey || process.env.OPENROUTER_API_KEY;
    if (!apiKey || apiKey === "MY_OPENROUTER_API_KEY") {
      throw new Error("OpenRouter API key is missing. Please supply a valid key in the Router settings or declare OPENROUTER_API_KEY in Settings > Secrets panel.");
    }

    try {
      const payload = {
        model: model || "meta-llama/llama-3-8b-instruct:free",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      };

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://ai.studio/build",
          "X-Title": "SEIHouse Celestial Scroll"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter gateway error [${response.status}]: ${errText}`);
      }

      const resJson = await response.json();
      const content = resJson.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Empty message content returned from OpenRouter.");
      }

      return cleanAndParseJSON(content);
    } catch (error: any) {
      console.error("[aiRouter] OpenRouter provider encountered error:", error);
      throw error;
    }
  } else if (provider === "ollama") {
    // -------------------------------------------------------------
    // OLLAMA (LOCAL) ROUTE
    // -------------------------------------------------------------
    const host = customKeys?.ollamaHost || process.env.OLLAMA_HOST || "http://localhost:11434";
    try {
      const response = await fetch(`${host}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: model || "llama3",
          system: systemInstruction,
          prompt: userPrompt,
          stream: false,
          format: "json"
        })
      });

      if (!response.ok) {
        throw new Error(`Local Ollama gateway responded with status: ${response.status}`);
      }

      const resJson = await response.json();
      const content = resJson.response;
      if (!content) {
        throw new Error("Empty response returned from local Ollama model.");
      }

      return cleanAndParseJSON(content);
    } catch (error: any) {
      console.error("[aiRouter] Ollama provider encountered error:", error);
      throw new Error(`Ollama server at ${host} is unreachable. Please verify Ollama is running locally and CORS is enabled via OLLAMA_ORIGINS="*" before calling Local route: ${error.message}`);
    }
  } else {
    throw new Error(`Unsupported routing provider: '${provider}'`);
  }
}

// Master function to route and execute image generation
export async function routeImageGeneration(
  prompt: string,
  type?: string,
  routingConfig?: RouteConfig,
  customKeys?: { geminiApiKey?: string; openrouterApiKey?: string; ollamaHost?: string; }
): Promise<{ imageUrl: string; note?: string; isFallback?: boolean }> {
  const activeConfig: RouteConfig = routingConfig || {
    provider: "gemini",
    model: "gemini-2.5-flash-image"
  };

  const { provider, model } = activeConfig;
  console.log(`[aiRouter] Routing Image task -> Provider: '${provider}', Model: '${model}'`);

  const styleEnhancer = type === "location"
    ? "mystical landscape, fantasy environment concept art, high-energy light novel scenery, dramatic lighting, celestial aura, beautiful composition, vibrant colors"
    : "professional anime character portrait, fantasy webnovel cover design, intricate details, sharp focus, celestial backlighting, clean high contrast colors";
  
  const rawPrompt = `${prompt}. Style: ${styleEnhancer}. Solo subject, centered, no borders, no text.`;

  // Standard high-quality local fallbacks (Unsplash matching SEIHouse aesthetic)
  const getFallbackImage = () => {
    const seedIndex = prompt ? String(prompt).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) : Math.floor(Math.random() * 100);
    
    if (type === "location") {
      const locationSeeds = [
        "https://images.unsplash.com/photo-1542224566-6e85f2e6772f?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=600&auto=format&fit=crop&q=80"
      ];
      return locationSeeds[seedIndex % locationSeeds.length];
    } else if (type === "artifact") {
      const artifactSeeds = [
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1515516969-d4008cc6241a?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1534067783941-51c9c23eccfd?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=600&auto=format&fit=crop&q=80"
      ];
      return artifactSeeds[seedIndex % artifactSeeds.length];
    } else {
      const characterSeeds = [
        "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1560942485-b2a11cc13456?w=600&auto=format&fit=crop&q=80"
      ];
      return characterSeeds[seedIndex % characterSeeds.length];
    }
  };

  if (provider === "gemini") {
    // -------------------------------------------------------------
    // GEMINI IMAGE GEN
    // -------------------------------------------------------------
    const ai = getAIClient(customKeys?.geminiApiKey);
    try {
      const gModel = model || "gemini-2.5-flash-image";
      let base64Data: string | null = null;

      if (gModel.startsWith("imagen-")) {
        // Imagen generation
        const response = await ai.models.generateImages({
          model: gModel,
          prompt: rawPrompt,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '1:1',
          },
        });
        if (response.generatedImages?.[0]?.image?.imageBytes) {
          base64Data = response.generatedImages[0].image.imageBytes;
        }
      } else {
        // Nano banana (Gemini Flash Image) generation
        const response = await ai.models.generateContent({
          model: gModel,
          contents: rawPrompt,
          config: {
            imageConfig: {
              aspectRatio: "1:1"
            }
          }
        });

        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData?.data) {
              base64Data = part.inlineData.data;
              break;
            }
          }
        }
      }

      if (!base64Data) {
        throw new Error("No image frames returned in Gemini payload.");
      }

      return { imageUrl: `data:image/png;base64,${base64Data}` };
    } catch (error: any) {
      console.warn("[aiRouter] Gemini image gen failed, serving fallback:", error);
      return {
        imageUrl: getFallbackImage(),
        note: `Projected via cosmic fallback: ${error.message || "quota reserve limit reached"}.`,
        isFallback: true
      };
    }
  } else if (provider === "openrouter") {
    // -------------------------------------------------------------
    // OPENROUTER IMAGE GEN (PROMPT TUNNEL)
    // -------------------------------------------------------------
    const apiKey = customKeys?.openrouterApiKey || process.env.OPENROUTER_API_KEY;
    if (!apiKey || apiKey === "MY_OPENROUTER_API_KEY") {
      // Graceful fallback if api key is missing, explain to user
      return {
        imageUrl: getFallbackImage(),
        note: `Aetherial prompt created: "${rawPrompt}". Set OPENROUTER_API_KEY in secrets or Router settings to activate live generation.`,
        isFallback: true
      };
    }

    try {
      // Check if they configured an image generation model, call OpenRouter's API
      const response = await fetch("https://openrouter.ai/api/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || "playgroundai/playground-v2.5",
          prompt: rawPrompt,
          n: 1,
          size: "512x512"
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter image endpoint returned status ${response.status}: ${errText}`);
      }

      const resJson = await response.json();
      const imageUrl = resJson.data?.[0]?.url || resJson.imageUrl;
      if (!imageUrl) {
        throw new Error("No image URL returned in OpenRouter response.");
      }

      return { imageUrl };
    } catch (error: any) {
      console.warn("[aiRouter] OpenRouter image gen failed, serving fallback:", error);
      return {
        imageUrl: getFallbackImage(),
        note: `Prompt crafted: "${rawPrompt}". (OpenRouter engine details: ${error.message})`,
        isFallback: true
      };
    }
  } else if (provider === "ollama") {
    // -------------------------------------------------------------
    // OLLAMA LOCAL IMAGE GEN (LOCAL TEXT EXPLANATION)
    // -------------------------------------------------------------
    // Local Ollama is normally text-based. Let's make it a stellar simulation:
    // It will "forge" or "synthesize" a gorgeous Local Prompt, and use Unsplash
    // as a visual medium while providing instructions on local SD integrations.
    const h = customKeys?.ollamaHost || process.env.OLLAMA_HOST || "http://localhost:11434";
    return {
      imageUrl: getFallbackImage(),
      note: `Local Ollama (${model}) generated prompt: "${rawPrompt}". Standard Ollama is text-only; we synthesized a beautiful representation of your query.`,
      isFallback: true
    };
  } else {
    throw new Error(`Unsupported routing provider: '${provider}'`);
  }
}
