import { retrieveRelevantContext } from '../../lib/rag';
import { ACTIVE_CONTEXT_ENGINE, CONTEXT_CHAR_LIMITS } from '../../lib/contextBlocks';
import { storyStorage } from '../../lib/storage';
import { Story, Chapter, ChapterContent, StoryBlock } from '../../types';

const progressionSignalPattern = /\b(breakthroughs?|levels?|ranks?|rewards?|skills?|abilit(y|ies)|powers?)\b/i;
const progressionSummaryPattern = /\b(breakthroughs?|advanced|new abilit(y|ies)|treasures?|rewards?|cultivation gains?|realms?|ranks?|level-ups?)\b/i;
const worldBreatherSignalPattern = /\b(markets?|villages?|festivals?|customs?|rumors?|aftermaths?|recover(y|ies)|relationships?|conversations?|daily life|sect routines?|travels?|foods?|politics|explor(e|es|ing|ed))\b/i;

const CONTINUATION_ANCHOR_BLOCK_COUNT = 4;

/**
 * Pulls the final few reader-facing prose blocks of a chapter so the next
 * chapter can anchor its opening to the exact moment the reader left off.
 */
const extractFinalProseBlocks = (content: ChapterContent, count: number): string[] => {
  const sourceBlocks: StoryBlock[] =
    (content.blocks && content.blocks.length > 0 ? content.blocks : content.archivedBlocks) || [];
  const proseBlocks = sourceBlocks.filter(b => b.type !== 'system' && !b.system && !b.worldCard && b.text && b.text.trim());
  if (proseBlocks.length > 0) {
    return proseBlocks.slice(-count).map(b => b.text.trim());
  }
  if (content.generatedContent) {
    const paragraphs = content.generatedContent.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
    return paragraphs.slice(-count);
  }
  return [];
};

const powerRushDirective = "NARRATIVE PULSE MANDATE: Recent chapters have accelerated progression too quickly. Do not force new realm/rank/level breakthroughs unless the current chapter premise explicitly requires one. Avoid major new treasures, cheats, system rewards, or combat abilities. Focus instead on lived-in world texture, consequences, relationships, faction reactions, customs, marketplace rumors, recovery, or minor side characters. End with a soft narrative hook, unresolved emotion, rumor, clue, or social consequence instead of a major power reward.";

export const buildChapterContext = async (
  activeStory: Story,
  targetChapter: Chapter,
  apiHeaders: any
) => {
  const contextEngine = ACTIVE_CONTEXT_ENGINE;
  const pastSummaries = await retrieveRelevantContext(
    targetChapter.premise || activeStory.customPremise || '',
    targetChapter.number,
    activeStory,
    apiHeaders,
    5,
    CONTEXT_CHAR_LIMITS[contextEngine],
    3,
    contextEngine,
  );

  // Intelligent Tension Meter logic
  const recentChapters = activeStory.arcs
    .flatMap(a => a.chapters)
    .filter(c => c.number < targetChapter.number && c.hasContent)
    .sort((a, b) => b.number - a.number)
    .slice(0, 5); // analyze up to the last 5 chapters

  // Immediate continuation anchor: surface the final prose blocks of the
  // previous chapter so the model resumes from the exact last scene instead
  // of re-establishing the premise. Appended last so context truncation
  // (which drops from the front) never removes it.
  const previousChapter = recentChapters[0];
  if (previousChapter) {
    try {
      const prevContent = await storyStorage.getChapterContent(activeStory.id, previousChapter.number);
      if (prevContent) {
        const finalBlocks = extractFinalProseBlocks(prevContent, CONTINUATION_ANCHOR_BLOCK_COUNT);
        if (finalBlocks.length > 0) {
          pastSummaries.push({
            kind: 'anchor',
            chapterNumber: previousChapter.number,
            text: finalBlocks.join('\n\n'),
          });
        }
      }
    } catch (e) {
      console.warn(`Could not build continuation anchor from chapter ${previousChapter.number}`, e);
    }
  }

  let pacingDirective = '';
  if (recentChapters.length > 0) {
    let accumulatedTension = 0;
    recentChapters.forEach((c, index) => {
      const tension = c.cuePayload?.tension ?? 5;
      const danger = c.cuePayload?.danger ?? 5;
      const combined = (tension + danger) / 2;
      
      // Exponential decay weight: more recent chapters have higher impact
      const weight = Math.pow(0.8, index);
      accumulatedTension += combined * weight;
    });

    const maxPossibleTension = 10 * ((1 - Math.pow(0.8, recentChapters.length)) / (1 - 0.8));
    const normalizedFatigue = (accumulatedTension / maxPossibleTension) * 10;

    if (normalizedFatigue >= 8.5) {
      pacingDirective = "CRITICAL PACING MANDATE: Tension fatigue is extremely high. You MUST pivot into a 'breathing room' chapter. Focus on downtime: pill refinement, recovering, sect politics, marketplace shopping, or deepening relationships. DO NOT introduce major combat or deadly threats.";
    } else if (normalizedFatigue >= 7.0) {
      pacingDirective = "PACING SUGGESTION: Tension has been high recently. Consider naturally transitioning into a lower-stakes scenario soon, allowing characters to process recent events, sort loot, or cultivate quietly before the next major conflict.";
    } else if (normalizedFatigue <= 3.5) {
      pacingDirective = "PACING SUGGESTION: The story has been peaceful for a while. To prevent stagnation, it is time to introduce a new inciting incident, unexpected danger, or rising tension to keep the reader engaged.";
    }

    let progressionSignals = 0;
    let worldBreatherSignals = 0;

    recentChapters.forEach(c => {
      let hasProgression = false;

      if ((c.cuePayload?.powerShift ?? 0) > 0) {
        hasProgression = true;
      }

      if (progressionSignalPattern.test(c.statsChangeMessage || '')) {
        hasProgression = true;
      }

      const summaryPremiseText = `${c.summary || ''} ${c.premise || ''}`;
      if (progressionSummaryPattern.test(summaryPremiseText)) {
        hasProgression = true;
      }

      if (hasProgression) {
        progressionSignals += 1;
      }

      if (worldBreatherSignalPattern.test(summaryPremiseText)) {
        worldBreatherSignals += 1;
      }
    });

    if (progressionSignals >= 3 && worldBreatherSignals <= 1) {
      pacingDirective = pacingDirective
        ? `${pacingDirective} ${powerRushDirective}`
        : powerRushDirective;
    }
  }
  
  return { pastSummaries, pacingDirective };
};
