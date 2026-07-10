import { extractJsonBlocks } from '../storyEngineHelpers';
import { createWholeWordMatcher } from './continuityMatchers';

// Control language is useful as prompt/UI metadata, but it should not reach ordinary
// reader-facing narration or dialogue. Keep this deliberately phrase-based: mythic
// words such as "fate", "destiny", and "karma" remain valid cultivation prose.
const SURFACE_PROSE_DENYLIST = [
  'enemies to lovers',
  'slow burn',
  'face-slapping',
  'power fantasy',
  'relationship development',
  'romance tension',
  'arc goal',
  'scene intent',
  'pacing directive',
  'story tag',
  'trope',
  'mid',
  'fate pressure',
  'fate survival',
  'hardcore fate',
  'dao master',
  'death flag detected',
  'betrayal check',
  'fate lock',
  'hidden timer',
  'doom deadline',
  'fate deadline',
  'fate scar',
  'timeline scar',
  'destiny shift',
  'fate event',
  'this action shifted destiny',
  'permanently alter the timeline',
];

/**
 * Pull ONLY the prose the reader sees out of the raw NDJSON blocks. World-card /
 * image / system metadata (imageUrl, codexEntryId, entity ids like `char-5slteiy7f`)
 * is dropped so the guard can never mistake it for lore drift.
 */
export const extractProseForContinuity = (rawBlocksStr: string): string => {
  try {
    const blocks = extractJsonBlocks(rawBlocksStr);
    if (Array.isArray(blocks) && blocks.length > 0) {
      const prose = blocks
        .map((b: any) => (typeof b?.text === 'string' ? b.text : ''))
        .filter(Boolean)
        .join('\n\n')
        .trim();
      if (prose.length > 0) return prose;
    }
  } catch {
    /* fall through to raw */
  }
  return rawBlocksStr;
};

/** Finds literal control-language leaks in prose without inspecting block metadata. */
export const findSurfaceProseLeaks = (prose: string): string[] => {
  const proseText = prose || '';
  return SURFACE_PROSE_DENYLIST.filter((phrase) =>
    createWholeWordMatcher(phrase).test(proseText)
  );
};
