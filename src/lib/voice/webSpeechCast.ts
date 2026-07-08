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

// Split cleaned paragraph prose into speakable chunks, attributing each
// quoted span to a cast slot via the paragraph's speaker metadata.
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
      const subChunks = part.match(/[^.!?\n]+[.!?\n]*/g) || [part];
      subChunks.forEach((sub) => {
        if (sub.trim()) {
          chunks.push({
            text: sub.trim(),
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
