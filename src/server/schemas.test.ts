import { describe, it, expect, vi } from 'vitest';
import {
  chapterGenerationSchema,
  embedSchema,
  generateNextDirectionsSchema,
  pastSummariesSchema,
  steerArcSchema,
  storyMemorySchema,
  validateBody,
} from './schemas';
import { z } from 'zod';

const minimalMemory = {
  powerSystem: '',
  currentPowerStage: '',
  worldRules: [],
  unresolvedPlotThreads: [],
  resolvedPlotThreads: [],
  characters: [],
};

describe('schemas validation middleware', () => {
  it('accepts the approved Codex context fields and nested user pin', () => {
    const parsed = storyMemorySchema.parse({
      powerSystem: '',
      currentPowerStage: '',
      worldRules: [],
      unresolvedPlotThreads: [],
      resolvedPlotThreads: [],
      characters: [{
        id: 'char-1',
        name: 'Mei Lian',
        role: 'Mentor',
        description: '',
        relationshipToMC: 'Ally',
        status: 'alive',
        aliases: ['Sister Mei'],
        contextPriority: 8,
        authorContextNote: 'Never betrays the protagonist.',
        provenance: { lastMentionedChapter: 4, isUserPinned: true },
      }],
    });

    expect(parsed.characters[0]).toMatchObject({
      aliases: ['Sister Mei'],
      contextPriority: 8,
      authorContextNote: 'Never betrays the protagonist.',
      provenance: { lastMentionedChapter: 4, isUserPinned: true },
    });
    expect(parsed.characters[0]).not.toHaveProperty('pinned');
  });

  it('rejects invalid approved Codex context field types', () => {
    expect(() => storyMemorySchema.parse({
      powerSystem: '',
      currentPowerStage: '',
      worldRules: [],
      unresolvedPlotThreads: [],
      resolvedPlotThreads: [],
      characters: [{
        id: 'char-1',
        name: 'Mei Lian',
        role: 'Mentor',
        description: '',
        relationshipToMC: 'Ally',
        status: 'alive',
        aliases: 'Sister Mei',
      }],
    })).toThrow();
  });

  it('classifies legacy string history and removes section-marker headers', () => {
    expect(pastSummariesSchema.parse([
      "--- COARSE HISTORY (ARC SUMMARIES) ---\nVolume 'One' Summary: Dawn",
      '--- RECOVERED RELEVANT MEMORIES (OLDER CHAPTERS) ---',
      'Chapter 2: A recovered beat',
      '--- SLIDING WINDOW OF RECENT NARRATIVE BLOCKS/DIALOGUE ---',
      'Chapter 3 Summary: A bridge',
      'Chapter 4:\nFull recent prose',
      '--- IMMEDIATE CONTINUATION ANCHOR (FINAL MOMENTS OF CHAPTER 4) ---\nThe final line.',
    ])).toEqual([
      {
        kind: 'arc-summary',
        chapterNumber: undefined,
        text: "Volume 'One' Summary: Dawn",
      },
      {
        kind: 'rag',
        chapterNumber: 2,
        text: 'Chapter 2: A recovered beat',
      },
      {
        kind: 'recent-summary',
        chapterNumber: 3,
        text: 'Chapter 3 Summary: A bridge',
      },
      {
        kind: 'recent-full',
        chapterNumber: 4,
        text: 'Chapter 4:\nFull recent prose',
      },
      {
        kind: 'anchor',
        chapterNumber: 4,
        text: 'The final line.',
      },
    ]);
  });

  it('defaults unmarked legacy strings to recent summaries', () => {
    expect(pastSummariesSchema.parse(['A queued legacy summary.'])).toEqual([
      { kind: 'recent-summary', chapterNumber: undefined, text: 'A queued legacy summary.' },
    ]);
  });

  it.each([
    [
      'chapter generation',
      chapterGenerationSchema,
      { mcName: 'Lin', memory: minimalMemory, currentChapter: { number: 2 } },
    ],
    [
      'next directions',
      generateNextDirectionsSchema,
      { mcName: 'Lin', memory: minimalMemory },
    ],
    [
      'arc steering',
      steerArcSchema,
      { mcName: 'Lin', memory: minimalMemory, steerDirection: 'continue' },
    ],
  ])('accepts typed and legacy history in the %s schema', (_name, schema, basePayload) => {
    const typed = schema.parse({
      ...basePayload,
      contextEngine: 'v2',
      pastSummaries: [
        { kind: 'recent-full', chapterNumber: 4, text: 'Chapter 4:\nFull prose' },
        { kind: 'anchor', chapterNumber: 4, text: 'The final line.' },
      ],
    });
    expect(typed.pastSummaries).toEqual([
      { kind: 'recent-full', chapterNumber: 4, text: 'Chapter 4:\nFull prose' },
      { kind: 'anchor', chapterNumber: 4, text: 'The final line.' },
    ]);
    expect(typed.contextEngine).toBe('v2');

    const legacy = schema.parse({
      ...basePayload,
      pastSummaries: ['Chapter 4 Summary: A queued retry.'],
    });
    expect(legacy.pastSummaries).toEqual([
      { kind: 'recent-summary', chapterNumber: 4, text: 'Chapter 4 Summary: A queued retry.' },
    ]);
    expect(() => schema.parse({
      ...basePayload,
      contextEngine: 'v3',
    })).toThrow();
  });

  it('calls next() if validation passes', () => {
    const middleware = validateBody(embedSchema);
    const req = { body: { text: 'hello' } } as any;
    const res = {} as any;
    const next = vi.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('returns 400 with error details if validation fails', () => {
    const middleware = validateBody(embedSchema);
    const req = { body: { text: 123 } } as any; // Invalid type
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as any;
    const next = vi.fn();

    middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('Invalid request payload')
      })
    );
  });
});
