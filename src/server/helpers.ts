import { StoryWorld, WorldBlueprint, StoryArc, ChapterContent } from '../types';
import {
  normalizeCodexAliases,
  normalizeCodexSurface,
  stripAuthorControlledCodexFields,
  stripLegacyCodexContextFields,
} from '../lib/codexContext';

const truncatePromptField = (value: unknown, maxLength: number): unknown =>
  typeof value === 'string' && value.length > maxLength
    ? `${value.substring(0, maxLength)}...`
    : value;

const surfaceAppearsInText = (surface: string, text: string): boolean => {
  const needle = normalizeCodexSurface(surface);
  const haystack = normalizeCodexSurface(text);
  if (!needle || !haystack) return false;

  let fromIndex = 0;
  while (fromIndex <= haystack.length - needle.length) {
    const matchIndex = haystack.indexOf(needle, fromIndex);
    if (matchIndex === -1) return false;

    const before = matchIndex > 0 ? haystack[matchIndex - 1] : '';
    const afterIndex = matchIndex + needle.length;
    const after = afterIndex < haystack.length ? haystack[afterIndex] : '';
    const wordCharacter = /[\p{L}\p{N}_]/u;
    const startsOnBoundary = !before || !wordCharacter.test(before) || !wordCharacter.test(needle[0]);
    const endsOnBoundary = !after || !wordCharacter.test(after) || !wordCharacter.test(needle[needle.length - 1]);

    if (startsOnBoundary && endsOnBoundary) return true;
    fromIndex = matchIndex + 1;
  }

  return false;
};

const buildDeterministicAliasLists = (
  entities: Array<Record<string, unknown>>,
): string[][] => {
  const canonicalOwners = new Map<string, Set<number>>();
  const aliasOwners = new Map<string, Set<number>>();

  entities.forEach((entity, index) => {
    const canonicalKey = normalizeCodexSurface(entity.name);
    if (canonicalKey) {
      const owners = canonicalOwners.get(canonicalKey) || new Set<number>();
      owners.add(index);
      canonicalOwners.set(canonicalKey, owners);
    }

    normalizeCodexAliases(entity.aliases, typeof entity.name === 'string' ? entity.name : undefined)
      .forEach(alias => {
        const key = normalizeCodexSurface(alias);
        const owners = aliasOwners.get(key) || new Set<number>();
        owners.add(index);
        aliasOwners.set(key, owners);
      });
  });

  return entities.map((entity, index) =>
    normalizeCodexAliases(entity.aliases, typeof entity.name === 'string' ? entity.name : undefined)
      .filter(alias => {
        const key = normalizeCodexSurface(alias);
        const aliasOwnerSet = aliasOwners.get(key);
        const canonicalOwnerSet = canonicalOwners.get(key);
        const collidesWithAnotherCanonical = canonicalOwnerSet
          ? [...canonicalOwnerSet].some(ownerIndex => ownerIndex !== index)
          : false;
        return aliasOwnerSet?.size === 1 && !collidesWithAnotherCanonical;
      }),
  );
};

const renderEntityForContext = (
  entity: Record<string, unknown>,
  deterministicAliases: string[],
): Record<string, unknown> => {
  const trustedEntity = stripLegacyCodexContextFields(entity);
  const authorContextNote = typeof entity.authorContextNote === 'string'
    ? entity.authorContextNote.trim()
    : '';
  const abilities = Array.isArray(trustedEntity.abilities)
    ? formatAbilityLedgerForPrompt(trustedEntity.abilities)
    : trustedEntity.abilities;

  return Object.fromEntries(Object.entries({
    ...trustedEntity,
    aliases: deterministicAliases.length > 0 ? deterministicAliases : undefined,
    authorContextNote: authorContextNote || undefined,
    abilities,
  }).filter(([, value]) => value !== undefined));
};

/**
 * Keep the chapter prompt's MC ability ledger useful without allowing accumulated
 * Codex metadata or oversized descriptions to consume the context window.
 * Abilities are appended as they are acquired, so the newest records are retained.
 */
export function formatAbilityLedgerForPrompt(abilities: unknown): unknown[] {
  if (!Array.isArray(abilities)) return [];

  const validAbilities = abilities
    .filter((ability) => typeof ability === 'string' || (ability !== null && typeof ability === 'object'));
  const indexedAbilities = validAbilities.map((ability, index) => ({ ability, index }));
  const pinnedAbilities = indexedAbilities.filter(({ ability }) =>
    typeof ability === 'object'
      && (ability as Record<string, any>).provenance?.isUserPinned === true
  );
  const remainingSlots = Math.max(0, 30 - pinnedAbilities.length);
  const selectedAbilities = [
    ...pinnedAbilities,
    ...indexedAbilities
      .filter(({ ability }) => !(
        typeof ability === 'object'
        && (ability as Record<string, any>).provenance?.isUserPinned === true
      ))
      .sort((a, b) => {
        const aPriority = typeof (a.ability as any)?.contextPriority === 'number'
          && Number.isFinite((a.ability as any).contextPriority)
          ? (a.ability as any).contextPriority
          : 0;
        const bPriority = typeof (b.ability as any)?.contextPriority === 'number'
          && Number.isFinite((b.ability as any).contextPriority)
          ? (b.ability as any).contextPriority
          : 0;
        return (bPriority - aPriority) || (b.index - a.index);
      })
      .slice(0, remainingSlots)
  ]
    .sort((a, b) => a.index - b.index);

  // Collision ownership must include the full ledger, not only the entries that
  // survive the prompt cap. Otherwise an omitted canonical name or alias could
  // make an included alias look unique.
  const deterministicAliases = buildDeterministicAliasLists(
    indexedAbilities.map(({ ability }) => (
      typeof ability === 'string'
        ? { name: ability }
        : ability as Record<string, unknown>
    )),
  );

  return selectedAbilities.map(({ ability, index }) => {
      if (typeof ability === 'string') return truncatePromptField(ability, 1000);

      const record = ability as Record<string, unknown>;
      const authorContextNote = typeof record.authorContextNote === 'string'
        ? record.authorContextNote.trim()
        : '';
      const aliases = deterministicAliases[index] || [];
      const provenance = record.provenance && typeof record.provenance === 'object'
        ? record.provenance as Record<string, unknown>
        : undefined;
      const promptProvenance = provenance
        ? Object.fromEntries(Object.entries({
          lastMentionedChapter: provenance.lastMentionedChapter,
          isUserPinned: provenance.isUserPinned === true ? true : undefined,
        }).filter(([, value]) => value !== undefined))
        : undefined;
      const promptFields: Record<string, unknown> = {
        name: truncatePromptField(record.name, 200),
        aliases: aliases.length > 0 ? aliases : undefined,
        contextPriority: typeof record.contextPriority === 'number' && Number.isFinite(record.contextPriority)
          ? record.contextPriority
          : undefined,
        authorContextNote: authorContextNote
          ? truncatePromptField(authorContextNote, 1000)
          : undefined,
        provenance: promptProvenance && Object.keys(promptProvenance).length > 0
          ? promptProvenance
          : undefined,
        description: truncatePromptField(record.description, 1000),
        source: truncatePromptField(record.source, 500),
        acquiredChapter: record.acquiredChapter,
        acquisitionMethod: truncatePromptField(record.acquisitionMethod, 500),
        cost: truncatePromptField(record.cost, 500),
        limits: truncatePromptField(record.limits, 500),
        masteryLevel: truncatePromptField(record.masteryLevel, 200),
        lastUsedChapter: record.lastUsedChapter,
        canonStatus: truncatePromptField(record.canonStatus, 100)
      };

      return Object.fromEntries(
        Object.entries(promptFields).filter(([, value]) => value !== undefined)
      );
    });
}

export interface RankedRelevantEntity {
  entity: Record<string, unknown>;
  score: number;
  isForced: boolean;
  contextPriority: number;
  recency: number;
  index: number;
}

export function rankRelevantEntityCandidates(
  entities: any[] | undefined,
  mcName: string,
  lastChapterSummary: string | undefined,
  currentContext: string,
  bonusContexts: (string | undefined | null)[],
  maxFeatures: number = 8,
  anchorText?: string,
): RankedRelevantEntity[] {
  if (!entities || !Array.isArray(entities)) return [];

  const STOP_WORDS = new Set(["the", "and", "for", "with", "from", "that", "this", "they", "them", "their", "his", "hers", "there", "what", "where", "when", "why", "how", "then"]);

  const tokenize = (txt: string) => (txt || "").toLowerCase().split(/\W+/).filter(w => w.length > 3 && !STOP_WORDS.has(w));
  
  const premiseText = (currentContext || "").toLowerCase();
  const lastSummaryText = (lastChapterSummary || "").toLowerCase();
  const bonusText = bonusContexts.filter(Boolean).join(" ").toLowerCase();
  const anchorContextText = (anchorText || "").toLowerCase();

  const premiseTokens = tokenize(premiseText);
  const lastSummaryTokens = tokenize(lastSummaryText);
  const bonusTokens = tokenize(bonusText);
  const anchorTokens = tokenize(anchorContextText);

  const entityRecords = entities.map(entity => (
    entity && typeof entity === 'object' ? entity as Record<string, any> : {}
  ));
  const deterministicAliases = buildDeterministicAliasLists(entityRecords);

  const scoredEntities = entities.map((entity, index) => {
    let score = 0;
    let isForced = false;
    const contextPriority = typeof entity?.contextPriority === 'number'
      && Number.isFinite(entity.contextPriority)
      ? entity.contextPriority
      : 0;
    const canonicalName = typeof entity?.name === 'string' ? entity.name.trim() : '';
    const aliases = deterministicAliases[index] || [];
    const canonicalKey = normalizeCodexSurface(canonicalName);
    const aliasKeys = aliases.map(normalizeCodexSurface);
    const mcNameKey = normalizeCodexSurface(mcName);
    const provenance = entity?.provenance && typeof entity.provenance === 'object'
      ? entity.provenance
      : undefined;
    const recency = [
      provenance?.lastMentionedChapter,
      entity?.lastMajorInvolvement,
      entity?.firstAppeared,
    ].find(value => typeof value === 'number' && Number.isFinite(value)) || 0;

    if (provenance?.isUserPinned === true) {
      isForced = true;
      score = 900;
    }

    if (!canonicalName) {
      return { entity, aliases, score, isForced, contextPriority, recency, index };
    }

    // Always include the MC. Alias identity is exact; the canonical-name fallback
    // retains the legacy short/full-name behavior for old stories.
    if (mcNameKey && (
      canonicalKey === mcNameKey
      || aliasKeys.includes(mcNameKey)
      || canonicalKey.includes(mcNameKey)
      || mcNameKey.includes(canonicalKey)
    )) {
       isForced = true;
       score = Math.max(score, 1000);
    }
    
    const mentionedInLastSummary = surfaceAppearsInText(canonicalName, lastSummaryText)
      || aliases.some(alias => surfaceAppearsInText(alias, lastSummaryText));
    if (mentionedInLastSummary) {
       isForced = true;
       score = Math.max(score, 500);
    }

    const mentionedInAnchor = surfaceAppearsInText(canonicalName, anchorContextText)
      || aliases.some(alias => surfaceAppearsInText(alias, anchorContextText));
    if (mentionedInAnchor) {
       isForced = true;
       score = Math.max(score, 600);
    }

    if (entity.evolutionReady) {
       isForced = true;
       score = Math.max(score, 500);
    }

    if (!isForced) {
      const premiseIdentityMatch = surfaceAppearsInText(canonicalName, premiseText)
        || aliases.some(alias => surfaceAppearsInText(alias, premiseText));
      if (premiseIdentityMatch) {
         score += 100;
      }
      
      const bonusIdentityMatch = surfaceAppearsInText(canonicalName, bonusText)
        || aliases.some(alias => surfaceAppearsInText(alias, bonusText));
      if (bonusIdentityMatch) {
         score += 50;
      }

      // Only canonical-name tokens receive legacy partial-match weight. Aliases are
      // deterministic full surface forms and are never fuzzy/token matched.
      const nameTokens = tokenize(canonicalName);
      const entityText = [
        canonicalName,
        entity.description,
        entity.role,
        entity.abilityDescription,
        entity.currentRelevance,
        entity.toneMemory,
        Array.isArray(entity.unresolvedThreads) ? entity.unresolvedThreads.join(' ') : '',
        entity.arcAccumulation,
        entity.authorContextNote,
      ].filter(Boolean).join(' ');
      const entityTokens = tokenize(entityText);
      const entitySet = new Set(entityTokens);
      
      for (const pt of premiseTokens) {
        if (nameTokens.includes(pt)) score += 10;
        else if (entitySet.has(pt)) score += 2;
      }
      for (const at of anchorTokens) {
        if (nameTokens.includes(at)) score += 20;
        else if (entitySet.has(at)) score += 4;
      }
      for (const st of lastSummaryTokens) {
        if (nameTokens.includes(st)) score += 5;
        else if (entitySet.has(st)) score += 1;
      }
      for (const bt of bonusTokens) {
         if (nameTokens.includes(bt)) score += 2;
         else if (entitySet.has(bt)) score += 1;
      }
    }

    return { entity, aliases, score, isForced, contextPriority, recency, index };
  });

  const compareRank = (
    a: { score: number; contextPriority: number; recency: number; index: number },
    b: { score: number; contextPriority: number; recency: number; index: number }
  ) => (b.score - a.score)
    || (b.contextPriority - a.contextPriority)
    || (b.recency - a.recency)
    || (a.index - b.index);

  // The cap cannot evict forced entries, even when the forced set alone exceeds it.
  const forced = scoredEntities.filter(e => e.isForced).sort(compareRank);
  const remainingSlots = Math.max(0, Math.floor(maxFeatures) - forced.length);
  const ranked = [
    ...forced,
    ...scoredEntities.filter(e => !e.isForced && e.score > 0).sort(compareRank).slice(0, remainingSlots)
  ].sort(compareRank);

  return ranked.map(e => ({
    entity: renderEntityForContext(e.entity, e.aliases),
    score: e.score,
    isForced: e.isForced,
    contextPriority: e.contextPriority,
    recency: e.recency,
    index: e.index,
  }));
}

export function rankRelevantEntities(
  entities: any[] | undefined,
  mcName: string,
  lastChapterSummary: string | undefined,
  currentContext: string,
  bonusContexts: (string | undefined | null)[],
  maxFeatures: number = 8,
  anchorText?: string,
) {
  return rankRelevantEntityCandidates(
    entities,
    mcName,
    lastChapterSummary,
    currentContext,
    bonusContexts,
    maxFeatures,
    anchorText,
  ).map(candidate => candidate.entity);
}

export function filterRelevantEntities(entities: any[] | undefined, ...contexts: (string|undefined|null)[]) {
  if (!entities || !Array.isArray(entities)) return [];
  
  const contextText = contexts.filter(Boolean).join(" ");
  const contextKey = normalizeCodexSurface(contextText);
  const STOP_WORDS = new Set(["the", "and", "for", "with", "from", "that", "this", "they", "them", "their", "his", "hers", "there", "what", "where", "when", "why", "how", "then"]);

  const entityRecords = entities.map(entity => (
    entity && typeof entity === 'object' ? entity as Record<string, unknown> : {}
  ));
  const deterministicAliases = buildDeterministicAliasLists(entityRecords);

  return entities.filter((entity, index) => {
    if (entity?.provenance?.isUserPinned === true) return true;
    if (!entity.name) return true;
    
    // Always include the entity if it's explicitly marked evolutionReady (means it changed recently)
    if (entity.evolutionReady) return true;

    if (surfaceAppearsInText(entity.name, contextText)) return true;
    if ((deterministicAliases[index] || []).some(alias => surfaceAppearsInText(alias, contextText))) {
      return true;
    }
    
    // Retain partial canonical-name matching for legacy entries. Aliases never use it.
    const tokens = normalizeCodexSurface(entity.name).split(/\s+/);
    for (const token of tokens) {
      if (token.length > 3 && !STOP_WORDS.has(token)) {
         if (contextKey.includes(token)) return true;
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

  if ('destinedEnding' in bp && bp.destinedEnding !== undefined && bp.destinedEnding !== null) {
    cleaned.destinedEnding = ensureString(bp.destinedEnding);
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

  if ('estimatedArcs' in bp && typeof bp.estimatedArcs === 'number') {
    cleaned.estimatedArcs = bp.estimatedArcs;
  } else {
    cleaned.estimatedArcs = 5;
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
      const cleanChar = stripAuthorControlledCodexFields(c);
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
      const cleanChar = stripAuthorControlledCodexFields(c);
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
    const stringArrayFields = ["newUnresolvedPlotThreads", "resolvedPlotThreads", "powerSystemViolationFlags"];
    stringArrayFields.forEach(field => {
      if (field in mu && Array.isArray(mu[field])) {
        mu[field] = mu[field].map((i: unknown) => ensureString(i));
      }
    });

    // Arrays of objects
    const objArrayFields = ["newCharacters", "characterStatusUpdates", "relationshipUpdates", "newFactions", "factionUpdates", "newLocations", "locationUpdates", "newArtifacts", "artifactUpdates", "newMCAbilities", "mcAbilityUpdates"];
    objArrayFields.forEach(field => {
      if (field in mu && Array.isArray(mu[field])) {
        mu[field] = mu[field]
          .filter((i: unknown) => i && typeof i === "object")
          .map((i: Record<string, unknown>) => stripAuthorControlledCodexFields(i));
      }
    });
  }
  return cleaned;
}

export function estimateTokens(text: string): number {
  return Math.ceil((text || "").length / 4);
}

export function truncateContextIfNeeded(
  memoryObj: any,
  pastSummaries: string[] | undefined,
  maxTokens: number = 80000,
  fallbackSummary: string = "This is the very first chapter of the story arc! Set the scene dramatically."
): {
  memoryJsonStr: string;
  pastSummariesStr: string;
  includedPastSummaries: string[];
  droppedPastSummariesCount: number;
} {
  const workingSummaries = pastSummaries ? [...pastSummaries] : [];
  const originalSummaryCount = workingSummaries.length;
  let memoryStr = JSON.stringify(memoryObj, null, 2);
  let summariesStr = workingSummaries.length > 0 
    ? workingSummaries.join("\n") 
    : fallbackSummary;
  
  let currentTokens = estimateTokens(memoryStr) + estimateTokens(summariesStr);

  if (currentTokens > maxTokens) {
    while (workingSummaries.length > 5 && currentTokens > maxTokens) {
      workingSummaries.shift();
      summariesStr = workingSummaries.length > 0 
        ? workingSummaries.join("\n") 
        : fallbackSummary;
      currentTokens = estimateTokens(memoryStr) + estimateTokens(summariesStr);
    }

    if (currentTokens > maxTokens && memoryObj.unresolvedPlotThreads && Array.isArray(memoryObj.unresolvedPlotThreads)) {
      while (memoryObj.unresolvedPlotThreads.length > 3 && currentTokens > maxTokens) {
        memoryObj.unresolvedPlotThreads.pop();
        memoryStr = JSON.stringify(memoryObj, null, 2);
        currentTokens = estimateTokens(memoryStr) + estimateTokens(summariesStr);
      }
    }
  }

  return {
    memoryJsonStr: memoryStr,
    pastSummariesStr: summariesStr,
    includedPastSummaries: workingSummaries,
    droppedPastSummariesCount: originalSummaryCount - workingSummaries.length,
  };
}

/**
 * Validates if a provided host is a safe Ollama host.
 * Only allows localhost, 127.0.0.1, or hosts matching the OLLAMA_HOST env var.
 */
export function isValidOllamaHost(host: string): boolean {
  if (!host) return true; // Fallback to default is handled in the router

  try {
    const url = new URL(host);
    const hostname = url.hostname.toLowerCase();
    const port = url.port || (url.protocol === "https:" ? "443" : "80");

    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";

    // If OLLAMA_HOST is defined in the environment, enforce matching both hostname and port.
    // This prevents port-scanning SSRF on the whitelisted host and blocks localhost bypasses.
    if (process.env.OLLAMA_HOST) {
      try {
        const envUrl = new URL(process.env.OLLAMA_HOST);
        const envHostname = envUrl.hostname.toLowerCase();
        const envPort = envUrl.port || (envUrl.protocol === "https:" ? "443" : "80");

        const isEnvLocalhost = envHostname === "localhost" || envHostname === "127.0.0.1" || envHostname === "[::1]";

        // If the environment host is localhost, allow other localhost representations on the same port
        if (isEnvLocalhost && isLocalhost) {
          return port === envPort;
        }

        return hostname === envHostname && port === envPort;
      } catch {
        // If OLLAMA_HOST is not a valid URL, fallback to exact string comparison
        return host === process.env.OLLAMA_HOST;
      }
    }

    // If OLLAMA_HOST is not set, only allow localhost on the default Ollama port (11434)
    return isLocalhost && port === "11434";
  } catch {
    // If it's not a valid URL, it's not a safe host string
    return false;
  }
}
