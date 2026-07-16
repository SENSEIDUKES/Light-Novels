import {
  ContextManifest,
  ContextManifestSection,
  ContextManifestSectionKey,
} from "../types";
import { estimateTokens } from "./helpers";
import type { SectionOutcome } from "./contextBudgeter";

const SECTION_LABELS: Record<ContextManifestSectionKey, string> = {
  pinnedRules: "Pinned rules",
  premise: "Premise",
  anchor: "Anchor",
  recentChapters: "Recent chapters",
  entityCards: "Entity cards",
  threads: "Threads",
  rag: "RAG",
  arcSummaries: "Arc summaries",
};

const OUTCOME_SECTION_ORDER: ContextManifestSectionKey[] = [
  "pinnedRules",
  "premise",
  "anchor",
  "recentChapters",
  "entityCards",
  "threads",
  "rag",
  "arcSummaries",
];

type HistorySectionKey = "anchor" | "recentChapters" | "rag" | "arcSummaries";

type ClassifiedHistoryBlock = {
  key: HistorySectionKey;
  text: string;
  items: string[];
};

interface BuildContextManifestInput {
  engine?: ContextManifest["engine"];
  route: ContextManifest["route"];
  chapterNumber: number;
  chapterTitle?: string;
  chapterPremise?: string;
  mcName?: string;
  genre?: string;
  customPremise?: string;
  systemInstruction: string;
  finalUserPrompt: string;
  rawMemory: Record<string, any>;
  sourceMemory: Record<string, any>;
  memoryJsonStr?: string;
  pastSummariesStr?: string;
  pastSummaries?: string[];
  droppedPastSummariesCount: number;
  styleBible?: string;
  tropeRules?: string;
  storyTags?: string[];
  glossaryRules?: string;
  pacingDirective?: string;
  fatePressure?: string;
  memoryAndHistoryBudgetTokens?: number;
}

interface BuildContextManifestFromOutcomesInput {
  route: ContextManifest["route"];
  chapterNumber: number;
  systemInstruction: string;
  finalUserPrompt: string;
  outcomes: SectionOutcome[];
  memoryAndHistoryBudgetTokens?: number;
}

const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

const extractChapterItems = (text: string) => {
  const headerLine = text.split("\n", 1)[0];
  const match = headerLine.match(/Chapter\s+(\d+)/i);
  return match ? [`Chapter ${match[1]}`] : [];
};

const extractArcItems = (text: string) => unique(
  text.split("\n").flatMap(line => {
    const match = line.match(/^Volume\s+'([^']+)'\s+Summary:/i);
    return match ? [match[1]] : [];
  }),
);

export function classifyHistoryBlocks(blocks: string[]): ClassifiedHistoryBlock[] {
  let activeKey: HistorySectionKey = "recentChapters";

  return blocks.map(text => {
    if (text.includes("IMMEDIATE CONTINUATION ANCHOR")) {
      activeKey = "anchor";
    } else if (text.includes("COARSE HISTORY (ARC SUMMARIES)")) {
      activeKey = "arcSummaries";
    } else if (text.includes("RECOVERED RELEVANT MEMORIES")) {
      activeKey = "rag";
    } else if (text.includes("SLIDING WINDOW OF RECENT NARRATIVE")) {
      activeKey = "recentChapters";
    }

    const items = activeKey === "arcSummaries"
      ? extractArcItems(text)
      : extractChapterItems(text);

    return { key: activeKey, text, items };
  });
}

const getEntityLabel = (entity: any, type: string) => {
  const name = typeof entity === "string"
    ? entity
    : entity?.name || entity?.title || entity?.id;
  return name ? `${type}: ${String(name)}` : "";
};

const getThreadLabel = (thread: any) => {
  const label = typeof thread === "string"
    ? thread
    : String(thread?.description || thread?.id || "");
  return label.length > 180 ? `${label.slice(0, 177)}...` : label;
};

const normalizeThreadIdentity = (item: string) => {
  const normalized = item.toLocaleLowerCase();
  const marker = " (thread open for ";
  const annotationStart = normalized.lastIndexOf(marker);
  if (annotationStart < 0) return normalized;

  const annotation = normalized.slice(annotationStart + marker.length);
  const chapterIndex = annotation.indexOf(" chapter");
  if (chapterIndex <= 0) return normalized;

  const age = annotation.slice(0, chapterIndex);
  for (const character of age) {
    if (character < "0" || character > "9") return normalized;
  }

  const expectedEnding = `${age} chapter${age === "1" ? "" : "s"} — pay it off or deepen it!)`;
  return annotation === expectedEnding
    ? normalized.slice(0, annotationStart)
    : normalized;
};

const makeSection = (
  key: ContextManifestSectionKey,
  estimatedTokens: number,
  includedItems: string[],
  availableItems: string[] = includedItems,
  normalizeIdentity: (item: string) => string = item => item.toLocaleLowerCase(),
  omissionReason?: ContextManifestSection["omissionReason"],
): ContextManifestSection => {
  const normalizedIncluded = unique(includedItems);
  const normalizedAvailable = unique(availableItems);
  const includedSet = new Set(normalizedIncluded.map(normalizeIdentity));
  const omittedItems = normalizedAvailable.filter(
    item => !includedSet.has(normalizeIdentity(item)),
  );

  return {
    key,
    label: SECTION_LABELS[key],
    estimatedTokens,
    includedItemCount: normalizedIncluded.length,
    availableItemCount: normalizedAvailable.length,
    includedItems: normalizedIncluded,
    omittedItems,
    truncated: omittedItems.length > 0,
    omissionReason: omittedItems.length > 0 ? omissionReason : undefined,
  };
};

const historySection = (
  key: HistorySectionKey,
  allBlocks: ClassifiedHistoryBlock[],
  includedBlocks: ClassifiedHistoryBlock[],
) => {
  const allForSection = allBlocks.filter(block => block.key === key);
  const includedForSection = includedBlocks.filter(block => block.key === key);
  const text = includedForSection.map(block => block.text).join("\n");
  return makeSection(
    key,
    estimateTokens(text),
    includedForSection.flatMap(block => block.items),
    allForSection.flatMap(block => block.items),
    item => item.toLocaleLowerCase(),
    "token_budget",
  );
};

export function buildContextManifest(input: BuildContextManifestInput): ContextManifest {
  const classifiedHistory = classifyHistoryBlocks(input.pastSummaries || []);
  const includedHistory = classifiedHistory.slice(input.droppedPastSummariesCount);

  const entityFields = [
    ["characters", "Character"],
    ["factions", "Faction"],
    ["locations", "Location"],
    ["artifacts", "Artifact"],
  ] as const;
  const includedEntityItems = entityFields.flatMap(([field, label]) =>
    (Array.isArray(input.rawMemory[field]) ? input.rawMemory[field] : [])
      .map((entity: any) => getEntityLabel(entity, label)),
  );
  const availableEntityItems = entityFields.flatMap(([field, label]) =>
    (Array.isArray(input.sourceMemory[field]) ? input.sourceMemory[field] : [])
      .map((entity: any) => getEntityLabel(entity, label)),
  );
  const entityText = JSON.stringify(
    Object.fromEntries(
      entityFields.map(([field]) => [field, input.rawMemory[field] || []]),
    ),
    null,
    2,
  );

  const includedThreads = Array.isArray(input.rawMemory.unresolvedPlotThreads)
    ? input.rawMemory.unresolvedPlotThreads.map(getThreadLabel)
    : [];
  const availableThreads = Array.isArray(input.sourceMemory.unresolvedPlotThreads)
    ? input.sourceMemory.unresolvedPlotThreads.map(getThreadLabel)
    : [];
  const threadsText = JSON.stringify(
    { unresolvedPlotThreads: input.rawMemory.unresolvedPlotThreads || [] },
    null,
    2,
  );

  const premiseItems = unique([
    input.chapterTitle ? `Chapter ${input.chapterNumber}: ${input.chapterTitle}` : `Chapter ${input.chapterNumber}`,
    input.chapterPremise ? "Chapter premise" : "",
    input.customPremise ? "Core premise" : "",
    input.mcName ? "Main character" : "",
    input.genre ? "Genre" : "",
  ]);
  const premiseText = [
    input.chapterTitle,
    input.chapterPremise,
    input.customPremise,
    input.mcName,
    input.genre,
  ].filter(Boolean).join("\n");

  const pinnedItems = unique([
    "System rules",
    "Chapter and output contract",
    input.rawMemory.powerSystem ? "Power system" : "",
    input.rawMemory.currentPowerStage ? "Current power stage" : "",
    Array.isArray(input.rawMemory.worldRules) && input.rawMemory.worldRules.length > 0
      ? `World rules (${input.rawMemory.worldRules.length})`
      : "",
    Array.isArray(input.rawMemory.abilities) && input.rawMemory.abilities.length > 0
      ? `Ability ledger (${input.rawMemory.abilities.length})`
      : "",
    input.styleBible ? "Style bible" : "",
    input.tropeRules ? "Trope rules" : "",
    input.storyTags?.length ? `Story tags (${input.storyTags.length})` : "",
    input.glossaryRules ? "Glossary rules" : "",
    input.pacingDirective ? "Pacing directive" : "",
    input.fatePressure ? `Fate pressure: ${input.fatePressure}` : "",
    (!input.pastSummaries || input.pastSummaries.length === 0) && input.pastSummariesStr
      ? "First chapter fallback context"
      : "",
  ]);

  const variableSections: ContextManifestSection[] = [
    makeSection("premise", estimateTokens(premiseText), premiseItems),
    historySection("anchor", classifiedHistory, includedHistory),
    historySection("recentChapters", classifiedHistory, includedHistory),
    makeSection(
      "entityCards",
      estimateTokens(entityText),
      includedEntityItems,
      availableEntityItems,
      item => item.toLocaleLowerCase(),
      "relevance_or_cap",
    ),
    makeSection(
      "threads",
      estimateTokens(threadsText),
      includedThreads,
      availableThreads,
      normalizeThreadIdentity,
      "selection_or_token_budget",
    ),
    historySection("rag", classifiedHistory, includedHistory),
    historySection("arcSummaries", classifiedHistory, includedHistory),
  ];

  const promptEstimatedTokens =
    estimateTokens(input.systemInstruction) + estimateTokens(input.finalUserPrompt);
  const variableTokens = variableSections.reduce(
    (total, section) => total + section.estimatedTokens,
    0,
  );
  const pinnedSection = makeSection(
    "pinnedRules",
    Math.max(0, promptEstimatedTokens - variableTokens),
    pinnedItems,
  );
  const sourceWorldRuleCount = Array.isArray(input.sourceMemory.worldRules)
    ? input.sourceMemory.worldRules.length
    : 0;
  const includedWorldRuleCount = Array.isArray(input.rawMemory.worldRules)
    ? input.rawMemory.worldRules.length
    : 0;
  const sourceAbilityCount = Array.isArray(input.sourceMemory.abilities)
    ? input.sourceMemory.abilities.length
    : 0;
  const includedAbilityCount = Array.isArray(input.rawMemory.abilities)
    ? input.rawMemory.abilities.length
    : 0;
  const omittedWorldRules = Math.max(0, sourceWorldRuleCount - includedWorldRuleCount);
  const omittedAbilities = Math.max(0, sourceAbilityCount - includedAbilityCount);
  if (omittedWorldRules > 0) {
    pinnedSection.omittedItems.push(`World rules omitted (${omittedWorldRules})`);
  }
  if (omittedAbilities > 0) {
    pinnedSection.omittedItems.push(`Abilities omitted (${omittedAbilities})`);
  }
  if (omittedWorldRules + omittedAbilities > 0) {
    pinnedSection.availableItemCount += omittedWorldRules + omittedAbilities;
    pinnedSection.truncated = true;
    pinnedSection.omissionReason = "selection_or_token_budget";
  }
  const sections = [pinnedSection, ...variableSections];
  const memoryAndHistoryBudgetTokens = input.memoryAndHistoryBudgetTokens || 80000;
  const memoryAndHistoryEstimatedTokens =
    estimateTokens(input.memoryJsonStr || JSON.stringify(input.rawMemory, null, 2)) +
    estimateTokens(input.pastSummariesStr || includedHistory.map(block => block.text).join("\n"));

  return {
    version: 1,
    engine: input.engine || "v1",
    route: input.route,
    generatedAt: new Date().toISOString(),
    chapterNumber: input.chapterNumber,
    totalEstimatedTokens: sections.reduce(
      (total, section) => total + section.estimatedTokens,
      0,
    ),
    providerInputEstimatedTokens: promptEstimatedTokens,
    memoryAndHistoryBudgetTokens,
    memoryAndHistoryEstimatedTokens,
    memoryAndHistoryBudgetExceeded: memoryAndHistoryEstimatedTokens > memoryAndHistoryBudgetTokens,
    providerInputTruncated:
      input.systemInstruction.length > 100000 || input.finalUserPrompt.length > 700000,
    sections,
  };
}

export function buildContextManifestFromOutcomes(
  input: BuildContextManifestFromOutcomesInput,
): ContextManifest {
  const outcomeByKey = new Map(
    input.outcomes.map(outcome => [outcome.key, outcome]),
  );
  const sections = OUTCOME_SECTION_ORDER.map(key => {
    const outcome = outcomeByKey.get(key);
    const includedItems = unique(outcome?.includedItems || []);
    const demotedItems = unique(outcome?.demotedItems || []);
    const omittedItems = unique(outcome?.omittedItems || []);

    return {
      key,
      label: SECTION_LABELS[key],
      estimatedTokens: outcome?.estimatedTokens || 0,
      includedItemCount: includedItems.length,
      availableItemCount: includedItems.length + omittedItems.length,
      includedItems,
      demotedItems,
      omittedItems,
      protectedOverflowTokens: outcome?.protectedOverflowTokens || undefined,
      truncated: demotedItems.length > 0 || omittedItems.length > 0,
      omissionReason: outcome?.omissionReason,
    } satisfies ContextManifestSection;
  });
  const memoryAndHistoryEstimatedTokens = sections.reduce(
    (total, section) => total + section.estimatedTokens,
    0,
  );
  const memoryAndHistoryBudgetTokens = input.memoryAndHistoryBudgetTokens || 24000;
  const providerInputEstimatedTokens =
    estimateTokens(input.systemInstruction) + estimateTokens(input.finalUserPrompt);

  return {
    version: 1,
    engine: "v2",
    route: input.route,
    generatedAt: new Date().toISOString(),
    chapterNumber: input.chapterNumber,
    totalEstimatedTokens: memoryAndHistoryEstimatedTokens,
    providerInputEstimatedTokens,
    memoryAndHistoryBudgetTokens,
    memoryAndHistoryEstimatedTokens,
    memoryAndHistoryBudgetExceeded:
      memoryAndHistoryEstimatedTokens > memoryAndHistoryBudgetTokens,
    providerInputTruncated:
      input.systemInstruction.length > 100000 || input.finalUserPrompt.length > 700000,
    sections,
  };
}

export function contextManifestLogPayload(manifest: ContextManifest) {
  return {
    engine: manifest.engine || "v1",
    route: manifest.route,
    chapterNumber: manifest.chapterNumber,
    totalEstimatedTokens: manifest.totalEstimatedTokens,
    providerInputEstimatedTokens:
      manifest.providerInputEstimatedTokens ?? manifest.totalEstimatedTokens,
    memoryAndHistoryBudgetTokens: manifest.memoryAndHistoryBudgetTokens,
    memoryAndHistoryEstimatedTokens: manifest.memoryAndHistoryEstimatedTokens,
    memoryAndHistoryBudgetExceeded: manifest.memoryAndHistoryBudgetExceeded,
    providerInputTruncated: manifest.providerInputTruncated,
    sections: manifest.sections.map(section => ({
      key: section.key,
      estimatedTokens: section.estimatedTokens,
      includedItemCount: section.includedItemCount,
      availableItemCount: section.availableItemCount,
      truncated: section.truncated,
      protectedOverflowTokens: section.protectedOverflowTokens,
    })),
  };
}
