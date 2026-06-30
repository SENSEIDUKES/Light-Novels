import { retrieveRelevantContext } from '../../lib/rag';
import { Story, Chapter } from '../../types';

export const buildChapterContext = async (
  activeStory: Story,
  targetChapter: Chapter,
  apiHeaders: any
) => {
  const pastSummaries = await retrieveRelevantContext(
    targetChapter.premise || activeStory.customPremise || '',
    targetChapter.number,
    activeStory,
    apiHeaders,
    5
  );

  // Intelligent Tension Meter logic
  const recentChapters = activeStory.arcs
    .flatMap(a => a.chapters)
    .filter(c => c.number < targetChapter.number && c.hasContent)
    .sort((a, b) => b.number - a.number)
    .slice(0, 5); // analyze up to the last 5 chapters
    
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
  }
  
  return { pastSummaries, pacingDirective };
};
