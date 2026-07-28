import { describe, expect, it } from 'vitest';
import {
  MAX_MOMENTOUS_CHAPTERS_PER_ARC,
  MOMENTOUS_ARC_FINALE_MIN_CHAPTERS,
  MOMENTOUS_EVENT_TYPES,
  MOMENTOUS_SCORE_THRESHOLD,
  MOMENTOUS_SCORE_WEIGHTS,
  assessMomentousChapter,
  scoreMomentousChapter,
  toMomentousChapterSignals,
  type MomentousArcPosition,
  type MomentousChapterSignals,
  type MomentousReason,
} from './chapterMomentousness';

const NO_POSITION: MomentousArcPosition = { isArcFinal: false, arcChapterCount: 0 };

/** Builds a single-chapter arc, which is too short to earn the finale prior. */
const soloArc = (chapter: MomentousChapterSignals) => ({ chapters: [chapter] });

/** Cheapest way to reach an exact score: mysticism is weighted 1. */
const chapterScoring = (number: number, score: number): MomentousChapterSignals => ({
  number,
  chapterCue: { mysticism: score },
});

describe('scoreMomentousChapter', () => {
  describe('individual signals', () => {
    const cases: {
      name: string;
      chapter: MomentousChapterSignals;
      position?: MomentousArcPosition;
      score: number;
      reasons: MomentousReason[];
    }[] = [
      {
        name: 'arc finale in an arc long enough to have a structural climax',
        chapter: {},
        position: { isArcFinal: true, arcChapterCount: MOMENTOUS_ARC_FINALE_MIN_CHAPTERS },
        score: 15,
        reasons: [{ signal: 'arc-finale', points: 15 }],
      },
      {
        name: 'arc finale of an arc below the minimum length',
        chapter: {},
        position: { isArcFinal: true, arcChapterCount: MOMENTOUS_ARC_FINALE_MIN_CHAPTERS - 1 },
        score: 0,
        reasons: [],
      },
      {
        name: 'non-final chapter of a long arc',
        chapter: {},
        position: { isArcFinal: false, arcChapterCount: 12 },
        score: 0,
        reasons: [],
      },
      {
        name: 'cue power shift, weighted 2',
        chapter: { chapterCue: { powerShift: 3 } },
        score: 6,
        reasons: [{ signal: 'cue-power-shift', points: 6 }],
      },
      {
        name: 'cue danger, weighted 1.5',
        chapter: { chapterCue: { danger: 4 } },
        score: 6,
        reasons: [{ signal: 'cue-danger', points: 6 }],
      },
      {
        name: 'cue mysticism, weighted 1',
        chapter: { chapterCue: { mysticism: 5 } },
        score: 5,
        reasons: [{ signal: 'cue-mysticism', points: 5 }],
      },
      {
        name: 'momentous beast event',
        chapter: { chapterCue: { beastEvent: { type: 'breakthrough' } } },
        score: 10,
        reasons: [{ signal: 'cue-beast-event', points: 10, detail: 'breakthrough' }],
      },
      {
        name: 'beast event outside the momentous list',
        chapter: { chapterCue: { beastEvent: { type: 'reveal' } } },
        score: 0,
        reasons: [],
      },
      {
        name: 'momentous block system prompt',
        chapter: { blocks: [{ system: { promptType: 'romance' } }] },
        score: 8,
        reasons: [{ signal: 'block-system-prompt', points: 8, detail: 'romance', blockIndex: 0 }],
      },
      {
        name: 'block system prompt outside the momentous list',
        chapter: { blocks: [{ system: { promptType: 'warning' } }] },
        score: 0,
        reasons: [],
      },
      {
        name: 'block metadata danger, weighted 1',
        chapter: { blocks: [{ metadata: { danger: 0.8 } }] },
        score: 0.8,
        reasons: [{ signal: 'block-danger', points: 0.8, blockIndex: 0 }],
      },
      {
        name: 'block metadata intensity, weighted 1',
        chapter: { blocks: [{ metadata: { intensity: 0.6 } }] },
        score: 0.6,
        reasons: [{ signal: 'block-intensity', points: 0.6, blockIndex: 0 }],
      },
      {
        name: 'block metadata tension, weighted 1',
        chapter: { blocks: [{ metadata: { tension: 0.4 } }] },
        score: 0.4,
        reasons: [{ signal: 'block-tension', points: 0.4, blockIndex: 0 }],
      },
    ];

    it.each(cases)('scores $name', ({ chapter, position, score, reasons }) => {
      const result = scoreMomentousChapter(chapter, position ?? NO_POSITION);
      expect(result.score).toBeCloseTo(score, 10);
      expect(result.reasons).toEqual(reasons);
    });
  });

  describe('absent and empty inputs', () => {
    const emptyCases: { name: string; chapter: MomentousChapterSignals | null | undefined }[] = [
      { name: 'an absent chapter', chapter: undefined },
      { name: 'a null chapter', chapter: null },
      { name: 'a chapter with no signals at all', chapter: {} },
      { name: 'an absent cue', chapter: { number: 1, blocks: [] } },
      { name: 'a null cue', chapter: { number: 1, chapterCue: null } },
      { name: 'a cue with no scored fields', chapter: { chapterCue: { beastEvent: undefined } } },
      { name: 'absent blocks', chapter: { number: 1, chapterCue: {} } },
      { name: 'null blocks', chapter: { number: 1, blocks: null } },
      { name: 'an empty block list', chapter: { number: 1, blocks: [] } },
      { name: 'blocks carrying no scored fields', chapter: { blocks: [{}, { metadata: {} }] } },
      { name: 'a null block system', chapter: { blocks: [{ system: null }] } },
      { name: 'null block metadata', chapter: { blocks: [{ metadata: null }] } },
    ];

    it.each(emptyCases)('returns an empty score for $name', ({ chapter }) => {
      expect(scoreMomentousChapter(chapter, NO_POSITION)).toEqual({ score: 0, reasons: [] });
    });

    // The falsy guard means a zeroed signal is "no signal", not zero points, so
    // it never shows up as a reason. This is the pipeline's existing behaviour.
    it('treats zeroed signals as absent rather than as zero-point contributions', () => {
      const result = scoreMomentousChapter(
        {
          chapterCue: { powerShift: 0, danger: 0, mysticism: 0 },
          blocks: [{ metadata: { danger: 0, intensity: 0, tension: 0 } }],
        },
        NO_POSITION,
      );

      expect(result).toEqual({ score: 0, reasons: [] });
    });
  });

  describe('event name matching', () => {
    it.each(MOMENTOUS_EVENT_TYPES)('scores %s as a momentous block prompt type', eventType => {
      const result = scoreMomentousChapter({ blocks: [{ system: { promptType: eventType } }] }, NO_POSITION);
      expect(result.score).toBe(MOMENTOUS_SCORE_WEIGHTS.blockSystemPrompt);
    });

    it.each(MOMENTOUS_EVENT_TYPES)('scores %s as a momentous beast event', eventType => {
      const result = scoreMomentousChapter({ chapterCue: { beastEvent: { type: eventType } } }, NO_POSITION);
      expect(result.score).toBe(MOMENTOUS_SCORE_WEIGHTS.cueBeastEvent);
    });

    // The declared SystemEvent.promptType union and the momentous list only
    // partially overlap. Pinning the full union documents exactly which prompt
    // types a generated block can actually score with today; widening the
    // overlap is a scoring change and must update this list deliberately.
    const declaredPromptTypes = [
      'neutral',
      'codex_update',
      'friendly_scan',
      'enemy_scan',
      'warning',
      'critical_danger',
      'progression',
      'breakthrough',
      'reward',
      'romance',
      'karmic_bond',
      'mystery',
      'fate_event',
      'corruption',
      'death_event',
      'quest_update',
      'choice_consequence',
      'system_error',
    ] as const;

    it.each(declaredPromptTypes)('resolves the declared prompt type %s consistently', promptType => {
      const expected = (MOMENTOUS_EVENT_TYPES as readonly string[]).includes(promptType)
        ? MOMENTOUS_SCORE_WEIGHTS.blockSystemPrompt
        : 0;

      expect(scoreMomentousChapter({ blocks: [{ system: { promptType } }] }, NO_POSITION).score).toBe(expected);
    });

    it('scores only breakthrough and romance out of the declared prompt-type union', () => {
      const scoring = declaredPromptTypes.filter(
        promptType => scoreMomentousChapter({ blocks: [{ system: { promptType } }] }, NO_POSITION).score > 0,
      );

      expect(scoring).toEqual(['breakthrough', 'romance']);
    });
  });

  describe('block metadata accumulation', () => {
    it('scores every metadata field of every block', () => {
      const result = scoreMomentousChapter(
        {
          blocks: [
            { metadata: { danger: 1, intensity: 2, tension: 3 } },
            { metadata: { danger: 4 } },
            { system: { promptType: 'ascension' }, metadata: { tension: 5 } },
          ],
        },
        NO_POSITION,
      );

      expect(result.score).toBe(1 + 2 + 3 + 4 + 8 + 5);
      expect(result.reasons).toEqual([
        { signal: 'block-danger', points: 1, blockIndex: 0 },
        { signal: 'block-intensity', points: 2, blockIndex: 0 },
        { signal: 'block-tension', points: 3, blockIndex: 0 },
        { signal: 'block-danger', points: 4, blockIndex: 1 },
        { signal: 'block-system-prompt', points: 8, detail: 'ascension', blockIndex: 2 },
        { signal: 'block-tension', points: 5, blockIndex: 2 },
      ]);
    });
  });

  describe('malformed and legacy input', () => {
    const malformedBlockCases: { name: string; blocks: unknown }[] = [
      { name: 'a null block', blocks: [null] },
      { name: 'an undefined block', blocks: [undefined] },
      { name: 'a primitive block', blocks: ['breakthrough', 7, true] },
      { name: 'a string metadata payload', blocks: [{ metadata: 'critical' }] },
      { name: 'a string system payload', blocks: [{ system: 'breakthrough' }] },
      { name: 'a non-array block collection', blocks: { 0: { metadata: { danger: 5 } } } },
      { name: 'a string block collection', blocks: 'breakthrough' },
    ];

    it.each(malformedBlockCases)('survives $name without throwing or scoring', ({ blocks }) => {
      const chapter = { number: 1, blocks } as unknown as MomentousChapterSignals;
      expect(() => scoreMomentousChapter(chapter, NO_POSITION)).not.toThrow();
      expect(scoreMomentousChapter(chapter, NO_POSITION)).toEqual({ score: 0, reasons: [] });
    });

    it('still scores well-formed blocks alongside malformed neighbours', () => {
      const chapter = {
        blocks: [null, { metadata: { danger: 3 } }, 'junk', { system: { promptType: 'betrayal' } }],
      } as unknown as MomentousChapterSignals;

      expect(scoreMomentousChapter(chapter, NO_POSITION)).toEqual({
        score: 11,
        reasons: [
          { signal: 'block-danger', points: 3, blockIndex: 1 },
          { signal: 'block-system-prompt', points: 8, detail: 'betrayal', blockIndex: 3 },
        ],
      });
    });

    // Legacy documents can hold these signals as strings. Cue signals were
    // already multiplied inline, so they coerce exactly as before; block
    // metadata used a bare `+=` inline and concatenated instead, which this
    // module normalizes to numeric addition.
    it('coerces numeric legacy strings numerically on every signal', () => {
      const chapter = {
        chapterCue: { powerShift: '3', danger: '4', mysticism: '5' },
        blocks: [{ metadata: { danger: '2' } }],
      } as unknown as MomentousChapterSignals;

      expect(scoreMomentousChapter(chapter, NO_POSITION)).toEqual({
        score: 19,
        reasons: [
          { signal: 'cue-power-shift', points: 6 },
          { signal: 'cue-danger', points: 6 },
          { signal: 'cue-mysticism', points: 5 },
          { signal: 'block-danger', points: 2, blockIndex: 0 },
        ],
      });
    });

    // A truthy non-numeric value poisons the score with NaN, which then fails
    // the threshold comparison and suppresses the chapter. Pinned deliberately:
    // repairing it would change which chapters the Reader treats as momentous.
    it.each([
      { name: 'cue power shift', chapterCue: { powerShift: 'massive' } },
      { name: 'cue danger', chapterCue: { danger: 'high' } },
      { name: 'cue mysticism', chapterCue: { mysticism: 'deep' } },
    ])('propagates NaN for a non-numeric $name', ({ chapterCue }) => {
      const chapter = { chapterCue } as unknown as MomentousChapterSignals;
      const result = scoreMomentousChapter(chapter, NO_POSITION);

      expect(Number.isNaN(result.score)).toBe(true);
      expect(result.reasons).toHaveLength(1);
      expect(Number.isNaN(result.reasons[0].points)).toBe(true);
    });

    // The inline implementation added block metadata with a bare `+=`, so a
    // truthy non-number concatenated into the running score. Normalizing that
    // to numeric addition is the single intentional behaviour change in the
    // extraction, and it can only fire on data violating the NUMBER schema.
    it.each([
      { name: 'a numeric string', value: '2', points: 2 },
      { name: 'an empty array', value: [], points: 0 },
      { name: 'a boolean', value: true, points: 1 },
    ])('normalizes block metadata holding $name to numeric addition', ({ value, points }) => {
      const chapter = {
        chapterCue: { mysticism: 5 },
        blocks: [{ metadata: { danger: value } }],
      } as unknown as MomentousChapterSignals;

      expect(scoreMomentousChapter(chapter, NO_POSITION).score).toBe(5 + points);
    });

    it('keeps a concatenation-prone block value from inflating the score into a peak', () => {
      const arc = {
        chapters: [
          {
            number: 1,
            chapterCue: { mysticism: 5 },
            blocks: [{ metadata: { danger: '2' } }],
          } as unknown as MomentousChapterSignals,
          chapterScoring(2, 30),
        ],
      };

      // Inline, chapter 1 scored the string '52' and outranked chapter 2.
      expect(assessMomentousChapter(arc, 1)).toMatchObject({ isMomentous: false, score: 7 });
      expect(assessMomentousChapter(arc, 2).isMomentous).toBe(true);
    });

    it('suppresses a chapter whose non-numeric signal poisons the score', () => {
      const chapter = {
        number: 1,
        // Without the NaN this chapter would clear the threshold on mysticism alone.
        chapterCue: { mysticism: 40, danger: 'lethal' },
      } as unknown as MomentousChapterSignals;

      expect(assessMomentousChapter(soloArc(chapter), 1).isMomentous).toBe(false);
    });
  });

  describe('reason reporting', () => {
    it('reports reasons whose points sum to the score', () => {
      const result = scoreMomentousChapter(
        {
          chapterCue: {
            powerShift: 2,
            danger: 2,
            mysticism: 3,
            beastEvent: { type: 'ascension' },
          },
          blocks: [
            { system: { promptType: 'first_kiss' }, metadata: { danger: 1, intensity: 2 } },
            { metadata: { tension: 4 } },
          ],
        },
        { isArcFinal: true, arcChapterCount: 6 },
      );

      const summed = result.reasons.reduce((total, reason) => total + reason.points, 0);
      expect(summed).toBeCloseTo(result.score, 10);
      expect(result.score).toBe(15 + 4 + 3 + 3 + 10 + 8 + 1 + 2 + 4);
      expect(result.reasons.map(reason => reason.signal)).toEqual([
        'arc-finale',
        'cue-power-shift',
        'cue-danger',
        'cue-mysticism',
        'cue-beast-event',
        'block-system-prompt',
        'block-danger',
        'block-intensity',
        'block-tension',
      ]);
    });

    it('names the matched event for both name-matched signals', () => {
      const result = scoreMomentousChapter(
        {
          chapterCue: { beastEvent: { type: 'turning-point' } },
          blocks: [{}, { system: { promptType: 'calamity' } }],
        },
        NO_POSITION,
      );

      expect(result.reasons).toEqual([
        { signal: 'cue-beast-event', points: 10, detail: 'turning-point' },
        { signal: 'block-system-prompt', points: 8, detail: 'calamity', blockIndex: 1 },
      ]);
    });
  });
});

describe('assessMomentousChapter', () => {
  describe('threshold', () => {
    const thresholdCases: {
      name: string;
      cue: Record<string, unknown>;
      score: number;
      isMomentous: boolean;
    }[] = [
      {
        name: 'exactly at the threshold',
        cue: { mysticism: MOMENTOUS_SCORE_THRESHOLD },
        score: MOMENTOUS_SCORE_THRESHOLD,
        isMomentous: true,
      },
      {
        name: 'one point below the threshold',
        cue: { mysticism: MOMENTOUS_SCORE_THRESHOLD - 1 },
        score: MOMENTOUS_SCORE_THRESHOLD - 1,
        isMomentous: false,
      },
      {
        name: 'one point above the threshold',
        cue: { mysticism: MOMENTOUS_SCORE_THRESHOLD + 1 },
        score: MOMENTOUS_SCORE_THRESHOLD + 1,
        isMomentous: true,
      },
      {
        name: 'a power-shift-heavy chapter above the threshold',
        cue: { powerShift: 9 },
        score: 18,
        isMomentous: true,
      },
      {
        name: 'a power-shift-heavy chapter below the threshold',
        cue: { powerShift: 7 },
        score: 14,
        isMomentous: false,
      },
      {
        name: 'a danger-heavy chapter exactly at the threshold',
        cue: { danger: 10 },
        score: 15,
        isMomentous: true,
      },
      {
        name: 'a danger-heavy chapter below the threshold',
        cue: { danger: 9 },
        score: 13.5,
        isMomentous: false,
      },
      {
        name: 'a mysticism-heavy chapter above the threshold',
        cue: { mysticism: 22 },
        score: 22,
        isMomentous: true,
      },
      {
        name: 'a mysticism-heavy chapter below the threshold',
        cue: { mysticism: 9 },
        score: 9,
        isMomentous: false,
      },
      {
        name: 'a combination below the threshold',
        cue: { powerShift: 3, mysticism: 5 },
        score: 11,
        isMomentous: false,
      },
      {
        name: 'a combination above the threshold',
        cue: { powerShift: 3, danger: 4, mysticism: 4 },
        score: 16,
        isMomentous: true,
      },
      {
        name: 'a combination landing exactly on the threshold',
        cue: { powerShift: 4, danger: 2, mysticism: 4 },
        score: 15,
        isMomentous: true,
      },
    ];

    it.each(thresholdCases)('resolves $name', ({ cue, score, isMomentous }) => {
      const assessment = assessMomentousChapter(soloArc({ number: 4, chapterCue: cue }), 4);

      expect(assessment.score).toBeCloseTo(score, 10);
      expect(assessment.isMomentous).toBe(isMomentous);
    });

    it('clears the threshold on a beast event plus block signals alone', () => {
      const assessment = assessMomentousChapter(
        soloArc({
          number: 2,
          chapterCue: { beastEvent: { type: 'evolution' } },
          blocks: [{ metadata: { danger: 3, intensity: 2 } }],
        }),
        2,
      );

      expect(assessment.score).toBe(15);
      expect(assessment.isMomentous).toBe(true);
    });
  });

  describe('arc ranking', () => {
    it('promotes at most the configured number of peaks per arc', () => {
      const arc = {
        chapters: [
          chapterScoring(1, 100),
          chapterScoring(2, 90),
          chapterScoring(3, 80),
          chapterScoring(4, 70),
          chapterScoring(5, 1),
        ],
      };

      const momentous = arc.chapters
        .map(chapter => chapter.number as number)
        .filter(number => assessMomentousChapter(arc, number).isMomentous);

      expect(momentous).toEqual([1, 2, 3]);
      expect(momentous).toHaveLength(MAX_MOMENTOUS_CHAPTERS_PER_ARC);
      // Chapter 4 clears the threshold but is ranked out of the peak slots.
      expect(assessMomentousChapter(arc, 4)).toMatchObject({ isMomentous: false, score: 70 });
    });

    it('gives the arc finale its structural prior once the arc is long enough', () => {
      const longArc = {
        chapters: [
          chapterScoring(1, 20),
          chapterScoring(2, 20),
          chapterScoring(3, 20),
          chapterScoring(4, 20),
        ],
      };

      // The finale outranks its equally scored siblings, and ties below it keep
      // arc order, so the last non-peak chapter is the latest tied one.
      expect(assessMomentousChapter(longArc, 4)).toMatchObject({ isMomentous: true, score: 35 });
      expect(assessMomentousChapter(longArc, 1).isMomentous).toBe(true);
      expect(assessMomentousChapter(longArc, 2).isMomentous).toBe(true);
      expect(assessMomentousChapter(longArc, 3).isMomentous).toBe(false);

      const shortArc = { chapters: [chapterScoring(1, 20), chapterScoring(2, 20), chapterScoring(3, 20)] };
      expect(assessMomentousChapter(shortArc, 3)).toMatchObject({ isMomentous: true, score: 20 });
    });

    it('can promote a finale that would otherwise miss the threshold', () => {
      const arc = {
        chapters: [chapterScoring(1, 1), chapterScoring(2, 1), chapterScoring(3, 1), chapterScoring(4, 1)],
      };

      expect(assessMomentousChapter(arc, 4)).toMatchObject({ isMomentous: true, score: 16 });
      expect(assessMomentousChapter(arc, 1).isMomentous).toBe(false);
    });
  });

  describe('missing context', () => {
    const missingCases: { name: string; arc: unknown; chapterNumber: number | null | undefined }[] = [
      { name: 'a null arc', arc: null, chapterNumber: 1 },
      { name: 'an undefined arc', arc: undefined, chapterNumber: 1 },
      { name: 'an arc with no chapters', arc: { chapters: [] }, chapterNumber: 1 },
      { name: 'an arc with a null chapter list', arc: { chapters: null }, chapterNumber: 1 },
      { name: 'a non-array chapter list', arc: { chapters: { 0: chapterScoring(1, 99) } }, chapterNumber: 1 },
      { name: 'an absent chapter number', arc: soloArc(chapterScoring(1, 99)), chapterNumber: null },
      { name: 'an undefined chapter number', arc: soloArc(chapterScoring(1, 99)), chapterNumber: undefined },
    ];

    it.each(missingCases)('is not momentous for $name', ({ arc, chapterNumber }) => {
      expect(
        assessMomentousChapter(arc as never, chapterNumber),
      ).toEqual({ isMomentous: false, score: 0, reasons: [] });
    });

    it('reports an empty score for a chapter outside the arc', () => {
      const arc = { chapters: [chapterScoring(1, 99), chapterScoring(2, 99)] };
      expect(assessMomentousChapter(arc, 7)).toEqual({ isMomentous: false, score: 0, reasons: [] });
    });

    it('tolerates null chapters inside an arc', () => {
      const arc = { chapters: [null, chapterScoring(2, 40), undefined] } as never;
      expect(assessMomentousChapter(arc, 2)).toMatchObject({ isMomentous: true, score: 40 });
    });

    // An unnumbered final chapter must not make every other unnumbered chapter
    // an arc finale, or the prior gets handed out repeatedly and the bogus rows
    // crowd a real chapter out of the peak slots.
    it('withholds the finale prior when the final chapter carries no number', () => {
      const arc = {
        chapters: [
          chapterScoring(1, MOMENTOUS_SCORE_THRESHOLD),
          { chapterCue: { mysticism: 1 } },
          { chapterCue: { mysticism: 1 } },
          { chapterCue: { mysticism: 1 } },
        ],
      };

      expect(assessMomentousChapter(arc, 1)).toMatchObject({
        isMomentous: true,
        score: MOMENTOUS_SCORE_THRESHOLD,
      });
      expect(
        arc.chapters.filter(chapter => scoreMomentousChapter(chapter, {
          isArcFinal: true,
          arcChapterCount: arc.chapters.length,
        }).score >= MOMENTOUS_SCORE_THRESHOLD),
      ).toHaveLength(4);
    });

    it.each([
      { name: 'a null final chapter', last: null },
      { name: 'a final chapter with a null number', last: { number: null } },
      { name: 'a final chapter with a non-numeric number', last: { number: '4' } },
    ])('withholds the finale prior for $name', ({ last }) => {
      const arc = {
        chapters: [chapterScoring(1, 1), chapterScoring(2, 1), chapterScoring(3, 1), last],
      } as never;

      // No chapter reaches the threshold, so nothing received the 15-point prior.
      expect(assessMomentousChapter(arc, 1)).toMatchObject({ isMomentous: false, score: 1 });
      expect(assessMomentousChapter(arc, 2).isMomentous).toBe(false);
      expect(assessMomentousChapter(arc, 3).isMomentous).toBe(false);
    });

    it('still gives the finale prior when the final chapter is properly numbered', () => {
      const arc = {
        chapters: [chapterScoring(1, 1), chapterScoring(2, 1), chapterScoring(3, 1), chapterScoring(4, 1)],
      };

      expect(assessMomentousChapter(arc, 4)).toMatchObject({ isMomentous: true, score: 16 });
    });
  });

  describe('purity', () => {
    const richArc = () => ({
      chapters: [
        {
          number: 1,
          chapterCue: { powerShift: 4, danger: 3, mysticism: 2, beastEvent: { type: 'conquest' } },
          blocks: [{ system: { promptType: 'breakthrough' }, metadata: { danger: 1, intensity: 2, tension: 3 } }],
        },
        chapterScoring(2, 30),
        chapterScoring(3, 5),
        chapterScoring(4, 25),
      ],
    });

    it('does not mutate its input', () => {
      const arc = richArc();
      const snapshot = JSON.parse(JSON.stringify(arc));

      assessMomentousChapter(arc, 1);
      assessMomentousChapter(arc, 4);

      expect(arc).toEqual(snapshot);
    });

    it('does not mutate a deeply frozen input', () => {
      const deepFreeze = <T>(value: T): T => {
        if (value && typeof value === 'object') Object.values(value).forEach(deepFreeze);
        return Object.freeze(value);
      };
      const arc = deepFreeze(richArc());

      expect(() => assessMomentousChapter(arc, 1)).not.toThrow();
      expect(assessMomentousChapter(arc, 1).isMomentous).toBe(true);
    });

    it('is deterministic across repeated assessment', () => {
      const arc = richArc();
      const runs = Array.from({ length: 5 }, () => assessMomentousChapter(arc, 1));

      runs.forEach(run => expect(run).toEqual(runs[0]));
      expect(assessMomentousChapter(richArc(), 1)).toEqual(runs[0]);
    });

    it('returns an independent result object on every call', () => {
      const arc = richArc();
      const first = assessMomentousChapter(arc, 1);
      const second = assessMomentousChapter(arc, 1);

      expect(first).not.toBe(second);
      expect(first.reasons).not.toBe(second.reasons);

      first.reasons.push({ signal: 'arc-finale', points: 999 });
      expect(assessMomentousChapter(arc, 1).reasons).toEqual(second.reasons);
    });
  });
});

describe('toMomentousChapterSignals', () => {
  it('maps the persisted chapter shape onto the contract', () => {
    const blocks = [{ system: { promptType: 'breakthrough' }, metadata: { danger: 2 } }];

    expect(
      toMomentousChapterSignals({ number: 3, cuePayload: { powerShift: 1 }, blocks }),
    ).toEqual({ number: 3, chapterCue: { powerShift: 1 }, blocks });
  });

  it('maps absent chapters and absent fields without throwing', () => {
    expect(toMomentousChapterSignals(undefined)).toEqual({
      number: undefined,
      chapterCue: undefined,
      blocks: undefined,
    });
    expect(toMomentousChapterSignals({ number: 9 })).toMatchObject({ number: 9 });
  });

  it('feeds the arc assessment directly', () => {
    const persisted = [
      { number: 1, cuePayload: { mysticism: 40 } },
      { number: 2, cuePayload: { mysticism: 2 } },
    ];

    const arc = { chapters: persisted.map(toMomentousChapterSignals) };
    expect(assessMomentousChapter(arc, 1).isMomentous).toBe(true);
    expect(assessMomentousChapter(arc, 2).isMomentous).toBe(false);
  });
});
