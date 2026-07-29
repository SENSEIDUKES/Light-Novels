import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  GENERATED_CHAPTER_SQL_PREDICATE,
  countHydratedChapters,
  isGeneratedChapter,
  resolveChapterCounts,
  withRefreshedChapterCounts,
} from './chapterCounts';
import type { Chapter, StoryWorld } from '../types';

const chapter = (number: number, overrides: Partial<Chapter> = {}): Chapter => ({
  number,
  title: `Chapter ${number}`,
  premise: '',
  status: 'unread',
  ...overrides,
});

function story(overrides: Partial<StoryWorld> = {}): StoryWorld {
  return {
    id: 'story-1',
    title: 'Ledger',
    genre: 'Cultivation',
    mcName: 'Lin',
    customPremise: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    currentChapterNumber: 1,
    memory: {
      powerSystem: '',
      currentPowerStage: '',
      worldRules: [],
      characters: [],
      unresolvedPlotThreads: [],
      resolvedPlotThreads: [],
    },
    arcs: [],
    ...overrides,
  };
}

const arcOf = (chapters: StoryWorld['arcs'][number]['chapters']) => [
  { title: 'Act I', isCompleted: false, chapters },
];

describe('isGeneratedChapter', () => {
  it('accepts the durable marker and either hydrated body shape', () => {
    expect(isGeneratedChapter(chapter(1, { hasContent: true }))).toBe(true);
    expect(isGeneratedChapter(chapter(1, { generatedContent: 'prose' }))).toBe(true);
    expect(isGeneratedChapter(chapter(1, {
      blocks: [{ id: 'b1', type: 'narration', text: 'prose' }],
    }))).toBe(true);
  });

  it('rejects a scaffold that only claims to have been read', () => {
    expect(isGeneratedChapter(chapter(1, { status: 'read' }))).toBe(false);
    expect(isGeneratedChapter(chapter(1, { blocks: [] }))).toBe(false);
    expect(isGeneratedChapter(undefined)).toBe(false);
  });
});

describe('countHydratedChapters', () => {
  it('tallies chapters across arcs', () => {
    expect(countHydratedChapters(story({
      arcs: [
        { title: 'I', isCompleted: false, chapters: [
          chapter(1, { hasContent: true }),
          chapter(2),
        ] },
        { title: 'II', isCompleted: false, chapters: [chapter(3, { hasContent: true })] },
      ],
    }))).toEqual({ totalChapterCount: 3, generatedChapterCount: 2 });
  });

  /**
   * A catalog summary carries no arcs. Reporting 0/0 for it would be a
   * fabricated answer — "not loaded" is not "no chapters".
   */
  it('reports nothing for a story whose arcs are not hydrated', () => {
    expect(countHydratedChapters(story({ arcs: [] }))).toBeNull();
    expect(countHydratedChapters(null)).toBeNull();
  });
});

describe('resolveChapterCounts', () => {
  it('falls back to the persisted catalog tallies when arcs are absent', () => {
    expect(resolveChapterCounts(story({
      arcs: [],
      totalChapterCount: 10,
      generatedChapterCount: 1,
    }))).toEqual({ totalChapterCount: 10, generatedChapterCount: 1 });
  });

  it('prefers hydrated arcs over a stale persisted tally', () => {
    expect(resolveChapterCounts(story({
      arcs: arcOf([chapter(1, { hasContent: true }), chapter(2, { hasContent: true })]),
      totalChapterCount: 2,
      generatedChapterCount: 1,
    }))).toEqual({ totalChapterCount: 2, generatedChapterCount: 2 });
  });

  it('reports nothing rather than inventing a count', () => {
    expect(resolveChapterCounts(story())).toBeNull();
    expect(resolveChapterCounts(story({ totalChapterCount: 10 }))).toBeNull();
  });
});

describe('withRefreshedChapterCounts', () => {
  it('restamps a hydrated story so a just-generated chapter counts immediately', () => {
    const refreshed = withRefreshedChapterCounts(story({
      arcs: arcOf([chapter(1, { hasContent: true }), chapter(2)]),
      totalChapterCount: 2,
      generatedChapterCount: 0,
    }));
    expect(refreshed.generatedChapterCount).toBe(1);
  });

  it('leaves a catalog summary and its server tallies untouched', () => {
    const summary = story({ arcs: [], totalChapterCount: 10, generatedChapterCount: 1 });
    expect(withRefreshedChapterCounts(summary)).toBe(summary);
  });
});

/**
 * The Hub's tally comes from SQL and an opened story's from the hydrated graph.
 * They must ask the same question, or a card and the story behind it disagree.
 */
describe('the catalog tally predicate', () => {
  it('is the literal the connector query actually runs', () => {
    const connector = readFileSync('dataconnect/connector/queries.gql', 'utf8');
    expect(connector).toContain(GENERATED_CHAPTER_SQL_PREDICATE);
  });

  it('tests for a chapter body row, never for scaffold state', () => {
    expect(GENERATED_CHAPTER_SQL_PREDICATE).toContain('chapter_content');
    expect(GENERATED_CHAPTER_SQL_PREDICATE).not.toContain('status');
    expect(GENERATED_CHAPTER_SQL_PREDICATE).not.toContain('summary');
  });
});
