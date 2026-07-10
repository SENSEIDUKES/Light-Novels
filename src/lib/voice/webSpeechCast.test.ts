import { describe, it, expect } from 'vitest';
import {
  classifyDialogueSlot,
  buildSpeechChunks,
  pickDefaultSideVoice,
  boundChunkText,
  MAX_CHUNK_CHARACTERS,
} from './webSpeechCast';

const makeVoice = (name: string, lang = 'en-US', voiceURI = name): SpeechSynthesisVoice =>
  ({ name, lang, voiceURI, default: false, localService: true } as SpeechSynthesisVoice);

describe('classifyDialogueSlot', () => {
  it('routes the protagonist to the mc slot', () => {
    expect(classifyDialogueSlot({ speakerRole: 'main_character' })).toBe('mc');
    expect(classifyDialogueSlot({ speakerRole: 'hero' })).toBe('mc');
    expect(classifyDialogueSlot({ speakerRole: 'Main Character' })).toBe('mc');
  });

  it('routes every other named role to the side slot', () => {
    expect(classifyDialogueSlot({ speakerRole: 'villain' })).toBe('side');
    expect(classifyDialogueSlot({ speakerRole: 'female lead' })).toBe('side');
    expect(classifyDialogueSlot({ speakerRole: 'face_slap' })).toBe('side');
    expect(classifyDialogueSlot({ speakerRole: 'rival' })).toBe('side');
  });

  it('keeps legacy behavior (mc slot) when speaker metadata is missing', () => {
    expect(classifyDialogueSlot(undefined)).toBe('mc');
    expect(classifyDialogueSlot({})).toBe('mc');
    expect(classifyDialogueSlot({ speakerRole: '' })).toBe('mc');
  });
});

describe('buildSpeechChunks', () => {
  it('attributes prose to the narrator and quotes to the block speaker', () => {
    const chunks = buildSpeechChunks([
      {
        text: '"Who dares disturb my slumber?" Overseer Chen bellowed.',
        metadata: { mode: 'dialogue', speakerName: 'Overseer Chen', speakerRole: 'villain' },
      },
    ]);

    const quote = chunks.find((c) => c.isDialogue);
    const prose = chunks.find((c) => !c.isDialogue);
    expect(quote?.slot).toBe('side');
    expect(prose?.slot).toBe('narrator');
  });

  it('gives the mc slot to protagonist dialogue', () => {
    const chunks = buildSpeechChunks([
      {
        text: '"I will not fall here," Li Wei said.',
        metadata: { mode: 'dialogue', speakerName: 'Li Wei', speakerRole: 'main_character' },
      },
    ]);
    expect(chunks.find((c) => c.isDialogue)?.slot).toBe('mc');
  });

  it('falls back to two-voice behavior for paragraphs without metadata', () => {
    const chunks = buildSpeechChunks([
      { text: 'The wind howled. "Stay close," she whispered.' },
    ]);
    expect(chunks.find((c) => !c.isDialogue)?.slot).toBe('narrator');
    expect(chunks.find((c) => c.isDialogue)?.slot).toBe('mc');
  });

  it('handles CJK-style quote marks', () => {
    const chunks = buildSpeechChunks([
      { text: '「退け！」 the rival snapped.', metadata: { speakerRole: 'rival' } },
    ]);
    expect(chunks.find((c) => c.isDialogue)?.slot).toBe('side');
  });

  it('skips empty paragraphs and preserves paragraph indices', () => {
    const chunks = buildSpeechChunks([
      { text: '' },
      { text: 'A quiet valley.' },
    ]);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].paragraphIndex).toBe(1);
  });
});

describe('pickDefaultSideVoice', () => {
  it('prefers a female-sounding English voice distinct from the other two slots', () => {
    const voices = [
      makeVoice('Daniel'),
      makeVoice('Rishi'),
      makeVoice('Samantha'),
      makeVoice('Alex'),
    ];
    expect(pickDefaultSideVoice(voices, 'Daniel', 'Rishi')?.name).toBe('Samantha');
  });

  it('never returns the narrator or dialogue voice when alternatives exist', () => {
    const voices = [makeVoice('Daniel'), makeVoice('Rishi'), makeVoice('Alex')];
    expect(pickDefaultSideVoice(voices, 'Daniel', 'Rishi')?.name).toBe('Alex');
  });

  it('falls back to any available voice when the list is tiny', () => {
    const voices = [makeVoice('Daniel')];
    expect(pickDefaultSideVoice(voices, 'Daniel', 'Daniel')?.name).toBe('Daniel');
  });
});

describe('bounded speech chunks', () => {
  it('leaves short sentences untouched', () => {
    expect(boundChunkText('A short sentence.')).toEqual(['A short sentence.']);
  });

  it('splits an overlong sentence at clause punctuation first', () => {
    const clause = 'the heavens split apart with thunder and light';
    const long = Array(6).fill(clause).join(', ') + '.';
    const pieces = boundChunkText(long);
    expect(pieces.length).toBeGreaterThan(1);
    for (const piece of pieces) {
      expect(piece.length).toBeLessThanOrEqual(MAX_CHUNK_CHARACTERS);
    }
    // No content is lost.
    expect(pieces.join(' ').replace(/\s+/g, '')).toBe(long.replace(/\s+/g, ''));
  });

  it('falls back to whitespace splitting without clause punctuation', () => {
    const long = Array(60).fill('word').join(' ');
    const pieces = boundChunkText(long);
    expect(pieces.length).toBeGreaterThan(1);
    for (const piece of pieces) {
      expect(piece.length).toBeLessThanOrEqual(MAX_CHUNK_CHARACTERS);
    }
  });

  it('splits non-space-delimited text at grapheme-safe boundaries', () => {
    const cjk = '天地玄黃宇宙洪荒'.repeat(40); // 320 chars, no spaces/punctuation
    const pieces = boundChunkText(cjk);
    expect(pieces.length).toBeGreaterThan(1);
    expect(pieces.join('')).toBe(cjk);
    for (const piece of pieces) {
      expect(piece.length).toBeLessThanOrEqual(MAX_CHUNK_CHARACTERS);
    }
  });

  it('never splits surrogate pairs or emoji clusters', () => {
    const emoji = '🐉🔥👨‍👩‍👧‍👦✨'.repeat(40);
    const pieces = boundChunkText(emoji);
    expect(pieces.join('')).toBe(emoji);
    for (const piece of pieces) {
      // A broken surrogate pair would produce a lone surrogate code unit.
      expect(/[\uD800-\uDBFF]$/.test(piece)).toBe(false);
      expect(/^[\uDC00-\uDFFF]/.test(piece)).toBe(false);
    }
  });

  it('buildSpeechChunks keeps every bounded chunk within limits and preserves paragraph identity', () => {
    const longParagraph =
      Array(20)
        .fill('The sect elders whispered among themselves about the boy who refused to kneel')
        .join(', and ') + '.';
    const chunks = buildSpeechChunks([{ text: 'Intro.' }, { text: longParagraph }]);
    expect(chunks.length).toBeGreaterThan(2);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(MAX_CHUNK_CHARACTERS);
    }
    expect(chunks[0].paragraphIndex).toBe(0);
    for (const chunk of chunks.slice(1)) {
      expect(chunk.paragraphIndex).toBe(1);
    }
  });

  it('mixed dialogue and prose keeps slots after bounding', () => {
    const longQuote = '"' + Array(50).fill('I will rise').join(', ') + '"';
    const chunks = buildSpeechChunks([
      { text: `${longQuote} he vowed.`, metadata: { speakerRole: 'protagonist' } },
    ]);
    const dialogue = chunks.filter((c) => c.isDialogue);
    const prose = chunks.filter((c) => !c.isDialogue);
    expect(dialogue.length).toBeGreaterThan(1);
    expect(dialogue.every((c) => c.slot === 'mc')).toBe(true);
    expect(prose.every((c) => c.slot === 'narrator')).toBe(true);
  });
});
