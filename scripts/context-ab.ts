import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { Chapter, ContextBlock, Story, StoryBlock } from "../src/types";
import { contextBlocksToLegacyStrings } from "../src/lib/contextBlocks";
import {
  anchorTextFromBlocks,
  formatMainCharacterState,
  latestHistoryText,
  prepareGenerationContext,
} from "../src/server/generationContext";
import { formatAbilityLedgerForPrompt } from "../src/server/helpers";
import {
  buildContextManifest,
  buildContextManifestFromOutcomes,
} from "../src/server/contextManifest";
import { PROMPTS } from "../src/server/prompts";

type ExportedChapter = Chapter & {
  generatedContent?: string;
  archivedBlocks?: StoryBlock[];
  episodicSummary?: string;
};

const safeString = (value: unknown, max: number) => {
  const text = typeof value === "string" ? value : value == null ? "" : String(value);
  return text.length > max ? `${text.slice(0, max)}...` : text;
};

const proseBlocks = (chapter: ExportedChapter) => {
  const source = chapter.blocks?.length
    ? chapter.blocks
    : chapter.archivedBlocks?.length
      ? chapter.archivedBlocks
      : [];
  const blocks = source
    .filter(block => block.type !== "system" && !block.system && !block.worldCard)
    .map(block => block.text?.trim())
    .filter((text): text is string => Boolean(text));
  if (blocks.length > 0) return blocks;
  return (chapter.generatedContent || "")
    .split(/\n{2,}/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean);
};

const chapterSummary = (chapter: ExportedChapter) =>
  chapter.episodicSummary || chapter.summary || "No past summary";

const fullChapterBlock = (chapter: ExportedChapter): ContextBlock => {
  const summaryText = chapter.episodicSummary || chapter.summary;
  if (chapter.archivedBlocks?.length) {
    return {
      kind: "recent-full",
      chapterNumber: chapter.number,
      text: `Chapter ${chapter.number} (ARCHIVED BLOCKS):\n${chapter.archivedBlocks.map(block => block.text).join("\n")}`,
      summaryText,
    };
  }
  if (chapter.generatedContent) {
    return {
      kind: "recent-full",
      chapterNumber: chapter.number,
      text: `Chapter ${chapter.number}:\n${chapter.generatedContent}`,
      summaryText,
    };
  }
  const blocks = proseBlocks(chapter);
  if (blocks.length > 0) {
    return {
      kind: "recent-full",
      chapterNumber: chapter.number,
      text: `Chapter ${chapter.number}:\n${blocks.join("\n\n")}`,
      summaryText,
    };
  }
  return {
    kind: "recent-summary",
    chapterNumber: chapter.number,
    text: `Chapter ${chapter.number} Summary: ${chapterSummary(chapter)}`,
  };
};

export function buildOfflineContextBlocks(
  story: Story,
  targetChapterNumber: number,
  engine: "v1" | "v2",
): ContextBlock[] {
  const pastChapters = story.arcs
    .flatMap(arc => arc.chapters as ExportedChapter[])
    .filter(chapter => chapter.number < targetChapterNumber)
    .sort((a, b) => a.number - b.number);
  const recent = pastChapters.slice(-3);
  const blocks: ContextBlock[] = story.arcs.flatMap(arc => {
    const hasPastChapter = arc.chapters.some(
      chapter => chapter.number < targetChapterNumber,
    );
    const extendsIntoTargetOrFuture = arc.chapters.some(
      chapter => chapter.number >= targetChapterNumber,
    );
    if (!hasPastChapter || extendsIntoTargetOrFuture) return [];
    const episodic = arc.episodicSummaries?.length
      ? `\nEpisodic Log: ${arc.episodicSummaries.join(" | ")}`
      : "";
    return [{
      kind: "arc-summary" as const,
      text: `Volume '${arc.title}' Summary: ${arc.summary || "Summary pending"}${episodic}`,
    }];
  });

  recent.forEach((chapter, index) => {
    if (engine === "v1" || index === recent.length - 1) {
      blocks.push(fullChapterBlock(chapter));
      return;
    }
    if (index === recent.length - 2) {
      const narrative = proseBlocks(chapter);
      const narrativeLength = narrative.join("\n\n").length;
      if (narrativeLength > 8000 && chapter.episodicSummary) {
        blocks.push({
          kind: "recent-summary",
          chapterNumber: chapter.number,
          text: `Chapter ${chapter.number} Summary:\n${chapter.episodicSummary}`,
        });
        return;
      }
      if (narrative.length > 0) {
        const keep = Math.max(1, Math.ceil(narrative.length * 0.4));
        blocks.push({
          kind: "recent-full",
          chapterNumber: chapter.number,
          text: `Chapter ${chapter.number}:\n${narrative.slice(-keep).join("\n\n")}`,
          summaryText: chapter.episodicSummary || chapter.summary,
        });
        return;
      }
    }
    blocks.push({
      kind: "recent-summary",
      chapterNumber: chapter.number,
      text: `Chapter ${chapter.number} Summary: ${chapterSummary(chapter)}`,
    });
  });

  const previous = pastChapters[pastChapters.length - 1];
  if (previous) {
    const anchor = proseBlocks(previous).slice(-4);
    if (anchor.length > 0) {
      blocks.push({
        kind: "anchor",
        chapterNumber: previous.number,
        text: anchor.join("\n\n"),
      });
    }
  }

  return blocks;
}

const formatThreads = (threads: any[], currentChapterNumber: number) => {
  let selected = Array.isArray(threads) ? threads : [];
  if (selected.length > 30) {
    selected = [...selected.slice(0, 10), ...selected.slice(-20)];
  }
  return selected.map(thread => {
    if (typeof thread === "string") return thread;
    if (thread?.description) {
      if (
        typeof thread.originChapter === "number"
        && currentChapterNumber > thread.originChapter
      ) {
        const age = currentChapterNumber - thread.originChapter;
        return `${thread.description} (Thread open for ${age} chapter${age === 1 ? "" : "s"} — pay it off or deepen it!)`;
      }
      return String(thread.description);
    }
    return String(thread);
  });
};

const existedByChapter = (entry: any, targetChapterNumber: number) => {
  if (!entry || typeof entry !== "object") return true;
  const firstKnownChapter = [
    entry.firstAppeared,
    entry.acquiredChapter,
    entry.provenance?.sourceChapterNumber,
  ].find(value => typeof value === "number" && Number.isFinite(value));
  return firstKnownChapter === undefined || firstKnownChapter < targetChapterNumber;
};

export function memorySnapshotForChapter(
  memory: Story["memory"],
  targetChapterNumber: number,
): Story["memory"] {
  const filterEntries = (entries: any) =>
    Array.isArray(entries)
      ? entries.filter(entry => existedByChapter(entry, targetChapterNumber))
      : entries;
  const filterThreads = (threads: any) =>
    Array.isArray(threads)
      ? threads.filter(thread =>
          !thread
          || typeof thread !== "object"
          || typeof thread.originChapter !== "number"
          || thread.originChapter < targetChapterNumber,
        )
      : threads;

  return {
    ...memory,
    abilities: filterEntries(memory.abilities),
    characters: filterEntries(memory.characters),
    factions: filterEntries(memory.factions),
    locations: filterEntries(memory.locations),
    artifacts: filterEntries(memory.artifacts),
    unresolvedPlotThreads: filterThreads(memory.unresolvedPlotThreads),
    resolvedPlotThreads: filterThreads(memory.resolvedPlotThreads),
  };
}

export function buildContextAbArtifacts(
  story: Story,
  targetChapterNumber: number,
) {
  const targetChapter = story.arcs
    .flatMap(arc => arc.chapters)
    .find(chapter => chapter.number === targetChapterNumber);
  if (!targetChapter) {
    throw new Error(`Chapter ${targetChapterNumber} was not found in the story export.`);
  }
  const memory = memorySnapshotForChapter(story.memory, targetChapterNumber);
  const formattedThreads = formatThreads(
    memory.unresolvedPlotThreads || [],
    targetChapterNumber,
  );
  const baseMemory = {
    powerSystem: safeString(memory.powerSystem, 4000),
    currentPowerStage: safeString(memory.currentPowerStage, 1000),
    worldRules: Array.isArray(memory.worldRules)
      ? memory.worldRules.slice(0, 20).map(rule => safeString(rule, 1000))
      : safeString(memory.worldRules, 4000),
    abilities: formatAbilityLedgerForPrompt(memory.abilities),
    unresolvedPlotThreads: formattedThreads,
  };
  const systemInstruction = PROMPTS.chapter.system;

  const buildEngine = (engine: "v1" | "v2") => {
    const blocks = buildOfflineContextBlocks(story, targetChapterNumber, engine);
    const legacyPastSummaries = contextBlocksToLegacyStrings(blocks);
    const lastSummary = engine === "v2"
      ? latestHistoryText(blocks)
      : legacyPastSummaries[legacyPastSummaries.length - 1];
    const prepared = prepareGenerationContext({
      engine,
      memory,
      baseMemory,
      blocks,
      legacyPastSummaries,
      fallbackSummary: "This is the very first chapter of the story arc! Set the scene dramatically.",
      threads: formattedThreads,
      worldRules: Array.isArray(baseMemory.worldRules)
        ? baseMemory.worldRules.map(String)
        : baseMemory.worldRules
          ? [String(baseMemory.worldRules)]
          : [],
      pinned: {
        premise: [
          `Chapter ${targetChapterNumber}: ${targetChapter.title || ""}`,
          `Goal: ${targetChapter.premise || ""}`,
          story.genre ? `Genre/style: ${story.genre}` : "",
          story.customPremise ? `Core premise: ${story.customPremise}` : "",
        ].filter(Boolean).join("\n"),
        mcStateCard: formatMainCharacterState({
          mcName: story.mcName,
          powerSystem: baseMemory.powerSystem,
          currentPowerStage: baseMemory.currentPowerStage,
          abilities: memory.abilities,
        }),
      },
      ranking: {
        mcName: story.mcName,
        lastSummary,
        currentContext: targetChapter.premise || "",
        bonusContexts: [
          memory.unresolvedPlotThreads?.join(" "),
          story.customPremise,
        ],
        anchorText: anchorTextFromBlocks(blocks),
      },
    });
    const prompt = PROMPTS.chapter.userPrompt(
      targetChapterNumber,
      targetChapter.title,
      targetChapter.premise,
      story.mcName,
      story.genre,
      story.customPremise,
      prepared.memoryJsonStr,
      prepared.pastSummariesStr,
      true,
      story.blueprint?.styleBible,
      story.blueprint?.tropeRules,
      story.intake?.storyTags,
      engine,
    );
    const manifest = prepared.budgetedContext
      ? buildContextManifestFromOutcomes({
          route: "generate-chapter-stream",
          chapterNumber: targetChapterNumber,
          systemInstruction,
          finalUserPrompt: prompt,
          outcomes: prepared.budgetedContext.outcomes,
          memoryAndHistoryBudgetTokens:
            prepared.budgetedContext.totalBudgetTokens,
        })
      : buildContextManifest({
          engine: "v1",
          route: "generate-chapter-stream",
          chapterNumber: targetChapterNumber,
          chapterTitle: targetChapter.title,
          chapterPremise: targetChapter.premise,
          mcName: story.mcName,
          genre: story.genre,
          customPremise: story.customPremise,
          systemInstruction,
          finalUserPrompt: prompt,
          rawMemory: prepared.rawMemoryObj,
          sourceMemory: memory,
          memoryJsonStr: prepared.memoryJsonStr,
          pastSummariesStr: prepared.pastSummariesStr,
          pastSummaries: prepared.legacyPastSummaries,
          droppedPastSummariesCount: prepared.droppedPastSummariesCount,
          styleBible: story.blueprint?.styleBible,
          tropeRules: story.blueprint?.tropeRules,
          storyTags: story.intake?.storyTags,
        });

    return { prompt, manifest };
  };

  return {
    v1: buildEngine("v1"),
    v2: buildEngine("v2"),
    note: "Offline RAG is intentionally disabled because the export has no query embedding. Entries and threads with chapter metadata are filtered to the target chapter, and the unversioned in-progress arc summary is omitted to avoid future leakage; other unversioned memory fields still reflect the export's current snapshot. Route-added glossary, pacing, and fate appendices are omitted because they are identical between the two engine variants.",
  };
}

const slugify = (value: string) =>
  value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  || "story";

async function main() {
  const [storyPath, chapterArg] = process.argv.slice(2);
  const chapterNumber = Number(chapterArg);
  if (!storyPath || !Number.isInteger(chapterNumber) || chapterNumber <= 0) {
    throw new Error(
      "Usage: npx tsx scripts/context-ab.ts <story-export.json> <chapter-number>",
    );
  }

  const absoluteStoryPath = path.resolve(storyPath);
  const parsed = JSON.parse(await readFile(absoluteStoryPath, "utf8"));
  const story = (parsed.story || parsed) as Story;
  const artifacts = buildContextAbArtifacts(story, chapterNumber);
  const outputDirectory = path.resolve("scratch");
  await mkdir(outputDirectory, { recursive: true });
  const baseName = `${slugify(story.title)}-chapter-${chapterNumber}`;
  await Promise.all([
    writeFile(
      path.join(outputDirectory, `${baseName}-v1-prompt.txt`),
      artifacts.v1.prompt,
      "utf8",
    ),
    writeFile(
      path.join(outputDirectory, `${baseName}-v2-prompt.txt`),
      artifacts.v2.prompt,
      "utf8",
    ),
    writeFile(
      path.join(outputDirectory, `${baseName}-v1-manifest.json`),
      JSON.stringify(artifacts.v1.manifest, null, 2),
      "utf8",
    ),
    writeFile(
      path.join(outputDirectory, `${baseName}-v2-manifest.json`),
      JSON.stringify(artifacts.v2.manifest, null, 2),
      "utf8",
    ),
  ]);
  console.warn(artifacts.note);
  console.log(`Wrote Context Engine A/B artifacts to ${outputDirectory}`);
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
