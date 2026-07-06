import { describe, it, expect } from 'vitest';
import {
  classifyDialogueSlot,
  buildSpeechChunks,
  pickDefaultSideVoice,
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
