import { StoryBlockMetadata } from '../../types';

/**
 * Average words-per-second for the browser's default English TTS voice at
 * speechRate = 1.0.  The formula used elsewhere is:
 *   estimatedDurationMs = (wordCount / (speechRate * TTS_WORDS_PER_SECOND_AT_RATE_1)) * 1000
 *
 * At rate 1.0 this gives ~162 WPM, which matches Chrome's default "Google US
 * English" voice measured empirically.  If your default voice runs
 * significantly faster or slower, adjust this constant accordingly.
 */
export const TTS_WORDS_PER_SECOND_AT_RATE_1 = 2.7;

// Web Speech (browser TTS) three-voice cast: the narrator reads prose, the
// MC voice reads the protagonist's dialogue, and the side voice covers
// everyone else the MC talks to — love interests, rivals, opponents.
export type VoiceSlot = 'narrator' | 'mc' | 'side';

export interface SpeechChunk {
  text: string;
  isDialogue: boolean;
  slot: VoiceSlot;
  paragraphIndex?: number;
}

export interface SpeakerMeta {
  mode?: string;
  speakerName?: string;
  speakerRole?: string;
}

const MC_ROLE_PATTERN = /(main_character|main character|main male|main female|protagonist|hero\b|mc\b)/i;

// Decide which cast slot speaks a dialogue chunk. Dialogue with no speaker
// metadata keeps the historical behavior (the MC/dialogue voice) so plain
// text chapters and translations sound exactly like they did before.
export function classifyDialogueSlot(meta?: SpeakerMeta): VoiceSlot {
  const role = meta?.speakerRole?.trim();
  if (!role) return 'mc';
  return MC_ROLE_PATTERN.test(role) ? 'mc' : 'side';
}

const FEMALE_VOICE_PATTERN = /(female|samantha|zira|victoria|karen|moira|tessa|fiona|serena|allison|ava|susan|kate)/i;

// Pick a sensible default for the side-character slot: a voice distinct
// from the narrator and MC voices, preferring female-sounding ones since
// the most common side speaker opposite a male MC is the female lead.
export function pickDefaultSideVoice(
  voices: SpeechSynthesisVoice[],
  narratorURI: string,
  dialogueURI: string
): SpeechSynthesisVoice | undefined {
  const distinct = voices.filter(
    (v) => v.voiceURI !== narratorURI && v.voiceURI !== dialogueURI
  );
  return (
    distinct.find((v) => v.lang.includes('en') && FEMALE_VOICE_PATTERN.test(v.name)) ||
    distinct.find((v) => FEMALE_VOICE_PATTERN.test(v.name)) ||
    distinct.find((v) => v.lang.includes('en')) ||
    distinct[0] ||
    voices[0]
  );
}

/**
 * Safety limits for a single speech chunk. Some speech engines silently drop
 * or garble very long utterances, and the cinematic scroll timeline corrects
 * itself at chunk boundaries — so chunks are bounded by both character count
 * and estimated spoken duration. Initial tuning values, not permanent truths.
 */
export const MAX_CHUNK_CHARACTERS = 180;
export const MAX_ESTIMATED_CHUNK_MS = 8_000;

/** Estimated spoken duration (ms) of `text` at speechRate = 1. */
export function estimateChunkDurationMs(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return (words / TTS_WORDS_PER_SECOND_AT_RATE_1) * 1000;
}

const exceedsLimits = (text: string): boolean =>
  text.length > MAX_CHUNK_CHARACTERS ||
  estimateChunkDurationMs(text) > MAX_ESTIMATED_CHUNK_MS;

/**
 * Split `text` at grapheme-cluster boundaries so surrogate pairs, emoji, and
 * combining sequences are never broken. Used as the last-resort split for
 * non-space-delimited languages.
 */
function splitGraphemeSafe(text: string, maxLength: number): string[] {
  const pieces: string[] = [];
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    let current = '';
    for (const { segment } of segmenter.segment(text)) {
      if (current.length + segment.length > maxLength && current) {
        pieces.push(current);
        current = '';
      }
      current += segment;
    }
    if (current) pieces.push(current);
    return pieces;
  }
  // Fallback: split on code points (never inside a surrogate pair).
  const codePoints = Array.from(text);
  let current = '';
  for (const cp of codePoints) {
    if (current.length + cp.length > maxLength && current) {
      pieces.push(current);
      current = '';
    }
    current += cp;
  }
  if (current) pieces.push(current);
  return pieces;
}

/**
 * Enforce chunk limits on a single sentence-ish piece of text:
 * 1. split at clause punctuation, 2. then at whitespace,
 * 3. then at grapheme-safe boundaries for non-space-delimited text.
 */
export function boundChunkText(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (!exceedsLimits(trimmed)) return [trimmed];

  // 1. Clause punctuation (Western + CJK commas/semicolons/dashes). The
  // second alternative matches leading punctuation runs so text that starts
  // with a delimiter is not silently discarded.
  const clauses =
    trimmed.match(/[^,;:、，；：—–]+[,;:、，；：—–]*|[,;:、，；：—–]+/g) || [trimmed];
  const out: string[] = [];
  let buffer = '';
  const flush = () => {
    if (buffer.trim()) out.push(buffer.trim());
    buffer = '';
  };
  const pushBounded = (piece: string) => {
    if (!exceedsLimits(piece)) {
      out.push(piece.trim());
      return;
    }
    // 2. Whitespace.
    const words = piece.split(/(\s+)/);
    if (words.length > 1) {
      let acc = '';
      for (const word of words) {
        if (acc && exceedsLimits(acc + word)) {
          out.push(acc.trim());
          acc = '';
        }
        acc += word;
      }
      if (acc.trim()) {
        // A single overlong "word" (e.g. CJK run) may remain.
        if (exceedsLimits(acc.trim())) {
          out.push(...splitGraphemeSafe(acc.trim(), MAX_CHUNK_CHARACTERS));
        } else {
          out.push(acc.trim());
        }
      }
      return;
    }
    // 3. Grapheme-safe boundaries (non-space-delimited languages).
    out.push(...splitGraphemeSafe(piece.trim(), MAX_CHUNK_CHARACTERS));
  };

  for (const clause of clauses) {
    if (buffer && exceedsLimits(buffer + clause)) {
      flush();
    }
    if (exceedsLimits(clause)) {
      flush();
      pushBounded(clause);
    } else {
      buffer += clause;
    }
  }
  flush();
  return out.filter((piece) => piece.length > 0);
}

// Split cleaned paragraph prose into speakable chunks, attributing each
// quoted span to a cast slot via the paragraph's speaker metadata. Every
// chunk retains its source paragraph identity and respects the character
// and estimated-duration safety limits.
export function buildSpeechChunks(
  paragraphs: { text: string; metadata?: SpeakerMeta | StoryBlockMetadata }[]
): SpeechChunk[] {
  const chunks: SpeechChunk[] = [];

  paragraphs.forEach((paragraph, index) => {
    const text = paragraph.text;
    if (!text || !text.trim()) return;

    const dialogueSlot = classifyDialogueSlot(paragraph.metadata);

    const rawParts = text.split(/(["“「][^"”」]+["”」])/g);
    rawParts.forEach((part) => {
      if (!part.trim()) return;
      const isDialogue = /^["“「]/.test(part);
      const sentences = part.match(/[^.!?。！？\n]+[.!?。！？\n]*/g) || [part];
      sentences.forEach((sentence) => {
        for (const bounded of boundChunkText(sentence)) {
          chunks.push({
            text: bounded,
            isDialogue,
            slot: isDialogue ? dialogueSlot : 'narrator',
            paragraphIndex: index,
          });
        }
      });
    });
  });

  return chunks;
}
