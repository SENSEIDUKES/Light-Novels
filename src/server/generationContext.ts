import type { ChapterContract, ContextBlock } from "../types";
import { contextBlocksToLegacyStrings } from "../lib/contextBlocks";
import { assembleContext, BudgetedContext } from "./contextBudgeter";
import {
  formatAbilityLedgerForPrompt,
  rankRelevantEntityCandidates,
  rankRelevantEntities,
  truncateContextIfNeeded,
} from "./helpers";
import {
  EntityKind,
  RenderedEntityCard,
  renderEntityCard,
} from "./entityCards";

export type ContextEngine = "v1" | "v2";

type EntityField = "characters" | "factions" | "locations" | "artifacts";

const ENTITY_FIELDS: Array<[EntityField, EntityKind]> = [
  ["characters", "character"],
  ["factions", "faction"],
  ["locations", "location"],
  ["artifacts", "artifact"],
];

export interface PreparedGenerationContext {
  engine: ContextEngine;
  rawMemoryObj: Record<string, any>;
  memoryJsonStr: string;
  pastSummariesStr: string;
  legacyPastSummaries: string[];
  droppedPastSummariesCount: number;
  budgetedContext?: BudgetedContext;
}

export interface PrepareGenerationContextInput {
  engine: ContextEngine;
  memory: Record<string, any>;
  baseMemory: Record<string, any>;
  blocks: ContextBlock[];
  legacyPastSummaries?: string[];
  fallbackSummary: string;
  threads: string[];
  worldRules: string[];
  pinned: {
    premise: string;
    mcStateCard: string;
  };
  chapterContract?: ChapterContract;
  ranking: {
    mcName: string;
    lastSummary?: string;
    currentContext: string;
    bonusContexts: (string | undefined | null)[];
    anchorText?: string;
  };
  totalBudgetTokens?: number;
}

const rankEntities = (
  input: PrepareGenerationContextInput,
  entities: any[] | undefined,
) => {
  const {
    mcName,
    lastSummary,
    currentContext,
    bonusContexts,
    anchorText,
  } = input.ranking;

  if (input.engine === "v2") {
    return rankRelevantEntities(
      entities,
      mcName,
      lastSummary,
      currentContext,
      bonusContexts,
      8,
      anchorText,
    );
  }

  // Keep the legacy call shape unchanged. In particular, do not pass the
  // anchor argument on v1; anchor-aware forcing is a v2-only behavior.
  return rankRelevantEntities(
    entities,
    mcName,
    lastSummary,
    currentContext,
    bonusContexts,
  );
};

const rankEntityCandidates = (
  input: PrepareGenerationContextInput,
  entities: any[] | undefined,
) => rankRelevantEntityCandidates(
  entities,
  input.ranking.mcName,
  input.ranking.lastSummary,
  input.ranking.currentContext,
  input.ranking.bonusContexts,
  8,
  input.ranking.anchorText,
);

const renderBudgetableCard = (
  entity: any,
  kind: EntityKind,
): RenderedEntityCard & {
  briefText: string;
  briefEstimatedTokens: number;
} => {
  const full = renderEntityCard(entity, kind, "full");
  const brief = renderEntityCard(entity, kind, "brief");
  return {
    ...full,
    briefText: brief.text,
    briefEstimatedTokens: brief.estimatedTokens,
  };
};

export const latestHistoryText = (
  blocks: ContextBlock[],
  kinds: ContextBlock["kind"][] = ["recent-full", "recent-summary"],
) => blocks
  .filter(block => kinds.includes(block.kind))
  .sort((a, b) => (b.chapterNumber ?? -1) - (a.chapterNumber ?? -1))[0]
  ?.text;

export const anchorTextFromBlocks = (blocks: ContextBlock[]) =>
  blocks
    .filter(block => block.kind === "anchor")
    .map(block => block.text)
    .join("\n\n") || undefined;

const formatThreadForPrompt = (thread: unknown) => {
  if (typeof thread === "string") return thread;
  if (thread && typeof thread === "object") {
    const record = thread as Record<string, unknown>;
    if (typeof record.description === "string") return record.description;
    if (typeof record.id === "string") return record.id;
    return JSON.stringify(record);
  }
  return String(thread);
};

export function formatMainCharacterState(input: {
  mcName: string;
  powerSystem?: unknown;
  currentPowerStage?: unknown;
  abilities?: unknown[];
  destinedEnding?: unknown;
  resolvedPlotThreads?: unknown[];
}) {
  const lines = [
    input.mcName ? `Main character: ${input.mcName}` : "",
    input.powerSystem ? `Power system: ${String(input.powerSystem)}` : "",
    input.currentPowerStage
      ? `Current power stage: ${String(input.currentPowerStage)}`
      : "",
    input.destinedEnding ? `Destined ending: ${String(input.destinedEnding)}` : "",
  ];
  const abilityLedger = formatAbilityLedgerForPrompt(input.abilities);
  if (abilityLedger.length > 0) {
    lines.push(
      "Ability ledger:",
      ...abilityLedger.map(ability =>
        typeof ability === "string" ? `- ${ability}` : `- ${JSON.stringify(ability)}`,
      ),
    );
  }
  if (Array.isArray(input.resolvedPlotThreads) && input.resolvedPlotThreads.length > 0) {
    lines.push(
      "Resolved plot threads:",
      ...input.resolvedPlotThreads.map(thread => `- ${formatThreadForPrompt(thread)}`),
    );
  }
  return lines.filter(Boolean).join("\n");
}

export function prepareGenerationContext(
  input: PrepareGenerationContextInput,
): PreparedGenerationContext {
  const legacyPastSummaries = input.legacyPastSummaries
    ?? contextBlocksToLegacyStrings(input.blocks);

  if (input.engine === "v1") {
    const rankedEntities = Object.fromEntries(
      ENTITY_FIELDS.map(([field]) => [
        field,
        rankEntities(input, input.memory[field]),
      ]),
    ) as Record<EntityField, any[]>;
    const rawMemoryObj = {
      ...input.baseMemory,
      ...rankedEntities,
    };
    const {
      memoryJsonStr,
      pastSummariesStr,
      droppedPastSummariesCount,
    } = truncateContextIfNeeded(
      rawMemoryObj,
      legacyPastSummaries,
      80000,
      input.fallbackSummary,
    );

    return {
      engine: "v1",
      rawMemoryObj,
      memoryJsonStr,
      pastSummariesStr,
      legacyPastSummaries,
      droppedPastSummariesCount,
    };
  }

  const entityCards = ENTITY_FIELDS
    .flatMap(([field, kind], kindIndex) =>
      rankEntityCandidates(input, input.memory[field]).map(candidate => ({
        ...candidate,
        kind,
        kindIndex,
      })),
    )
    .sort((a, b) =>
      (b.score - a.score)
      || (b.contextPriority - a.contextPriority)
      || (b.recency - a.recency)
      || (a.kindIndex - b.kindIndex)
      || (a.index - b.index),
    )
    .map(candidate => renderBudgetableCard(candidate.entity, candidate.kind));
  const budgetedContext = assembleContext({
    blocks: input.blocks,
    entityCards,
    threads: input.threads,
    pinned: input.pinned,
    worldRules: input.worldRules,
    chapterContract: input.chapterContract,
    totalBudgetTokens: input.totalBudgetTokens,
  });

  return {
    engine: "v2",
    rawMemoryObj: { ...input.baseMemory },
    memoryJsonStr: budgetedContext.promptSections
      .map(section => section.text)
      .join("\n\n"),
    pastSummariesStr: "",
    legacyPastSummaries,
    droppedPastSummariesCount: 0,
    budgetedContext,
  };
}
