import { StoryWorld, WorldBlueprint, StoryArc, ChapterContent } from '../types';

export function filterRelevantEntities(entities: any[] | undefined, ...contexts: (string|undefined|null)[]) {
  if (!entities || !Array.isArray(entities)) return [];
  
  const contextText = contexts.filter(Boolean).join(" ").toLowerCase();
  const STOP_WORDS = new Set(["the", "and", "for", "with", "from", "that", "this", "they", "them", "their", "his", "hers", "there", "what", "where", "when", "why", "how", "then"]);
  
  return entities.filter(entity => {
    if (!entity.name) return true;
    
    // Always include the entity if it's explicitly marked evolutionReady (means it changed recently)
    if (entity.evolutionReady) return true;

    const nameStr = entity.name.toLowerCase();
    
    // Exact full name match
    if (contextText.includes(nameStr)) return true;
    
    // Partial word match (useful for titles or multi-word names like "Elder Zhao")
    const tokens = nameStr.split(/\s+/);
    for (const token of tokens) {
      if (token.length > 3 && !STOP_WORDS.has(token)) {
         if (contextText.includes(token)) return true;
      }
    }
    
    return false;
  });
}

/**
 * Validates and converts any arbitrary value safely to a string.
 */
export function ensureString(val: unknown): string {
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

/**
 * Sanitizes and cleanses a database World Blueprint response schema.
 */
export function cleanBlueprint(bp: Record<string, unknown> | null | undefined): WorldBlueprint {
  const cleaned = {} as WorldBlueprint;
  if (!bp) return cleaned;

  const stringFields: Array<keyof WorldBlueprint> = [
    "title", "logline", "worldOverview", "startingLocation", 
    "societyStructure", "powerSystemOutline", "mcProfile", 
    "firstArcPromise", "tropeRules", "styleBible"
  ];
  
  const arrayFields: Array<keyof WorldBlueprint> = [
    "majorFactions", "initialCharacters", "majorMysteries", "unresolvedPlotThreads"
  ];

  for (const field of stringFields) {
    if (field in bp) {
      (cleaned as any)[field] = ensureString(bp[field as string]);
    } else {
      (cleaned as any)[field] = "";
    }
  }

  for (const field of arrayFields) {
    if (field in bp) {
      const val = bp[field as string];
      if (Array.isArray(val)) {
        (cleaned as any)[field] = val.map((item: unknown) => ensureString(item));
      } else {
        (cleaned as any)[field] = [ensureString(val)];
      }
    } else {
      (cleaned as any)[field] = [];
    }
  }

  return cleaned;
}

/**
 * Clean and validate a newly generated story arc.
 */
export function cleanInitialArc(arc: Record<string, unknown> | null | undefined): Record<string, any> {
  if (!arc) return {};
  const cleaned: Record<string, any> = { ...arc };
  
  if ("title" in cleaned) cleaned.title = ensureString(cleaned.title);
  if ("powerSystem" in cleaned) cleaned.powerSystem = ensureString(cleaned.powerSystem);
  if ("currentPowerStage" in cleaned) cleaned.currentPowerStage = ensureString(cleaned.currentPowerStage);
  
  if ("worldRules" in cleaned) {
    if (Array.isArray(cleaned.worldRules)) {
      cleaned.worldRules = cleaned.worldRules.map((item: unknown) => ensureString(item));
    } else {
      cleaned.worldRules = [ensureString(cleaned.worldRules)];
    }
  }
  
  if ("unresolvedPlotThreads" in cleaned) {
    if (Array.isArray(cleaned.unresolvedPlotThreads)) {
      cleaned.unresolvedPlotThreads = cleaned.unresolvedPlotThreads.map((item: unknown) => ensureString(item));
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

/**
 * Clean and validate story direction steering guidance responses.
 */
export function cleanSteerArc(resp: Record<string, unknown> | null | undefined): Record<string, any> {
  if (!resp) return {};
  const cleaned: Record<string, any> = { ...resp };
  
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
    cleaned.newUnresolvedPlotThreads = cleaned.newUnresolvedPlotThreads.map((i: unknown) => ensureString(i));
  }

  return cleaned;
}

/**
 * Clean the generated response of chapter text and memory deltas.
 */
export function cleanChapterResponse(resp: Record<string, unknown> | null | undefined): Record<string, any> {
  if (!resp) return {};
  const cleaned: Record<string, any> = { ...resp };
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
        mu[field] = mu[field].map((i: unknown) => ensureString(i));
      }
    });

    // Arrays of objects
    const objArrayFields = ["newCharacters", "characterStatusUpdates", "newFactions", "factionUpdates", "newLocations", "locationUpdates", "newArtifacts", "artifactUpdates"];
    objArrayFields.forEach(field => {
      if (field in mu && Array.isArray(mu[field])) {
        mu[field] = mu[field].filter((i: unknown) => i && typeof i === "object");
      }
    });
  }
  return cleaned;
}
