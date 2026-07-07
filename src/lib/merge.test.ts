import { describe, it, expect } from 'vitest';
import { mergeStories } from './merge';
import { StoryWorld, Chapter } from '../types';

const defaultMemory = {
  powerSystem: 'Magic',
  currentPowerStage: 'Beginner',
  worldRules: [],
  characters: [],
  unresolvedPlotThreads: [],
  resolvedPlotThreads: [],
};

const createMockStory = (overrides: Partial<StoryWorld> = {}): StoryWorld => ({
  id: 'test-id',
  title: 'Test Story',
  genre: 'Fantasy',
  mcName: 'Hero',
  customPremise: 'A test story',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  memory: { ...defaultMemory },
  arcs: [],
  currentChapterNumber: 1,
  ...overrides
});

describe('mergeStories', () => {
  it('prefers the newer story as the base and updates updatedAt', () => {
    const local = createMockStory({ updatedAt: '2023-01-02T00:00:00Z', title: 'Local Title' });
    const cloud = createMockStory({ updatedAt: '2023-01-01T00:00:00Z', title: 'Cloud Title' });

    const merged = mergeStories(local, cloud);
    expect(merged.title).toBe('Local Title');
    expect(new Date(merged.updatedAt).getTime()).toBeGreaterThan(new Date(local.updatedAt).getTime());
  });

  it('merges basic properties from older if newer is missing them', () => {
    const local = createMockStory({ updatedAt: '2023-01-02T00:00:00Z', title: '' });
    const cloud = createMockStory({ updatedAt: '2023-01-01T00:00:00Z', title: 'Cloud Title' });

    const merged = mergeStories(local, cloud);
    expect(merged.title).toBe('Cloud Title');
  });

  it('unions memory characters by id', () => {
    const local = createMockStory({
      updatedAt: '2023-01-02T00:00:00Z',
      memory: {
        ...defaultMemory,
        characters: [{ id: 'char-1', name: 'Char 1 New' } as any]
      }
    });
    const cloud = createMockStory({
      updatedAt: '2023-01-01T00:00:00Z',
      memory: {
        ...defaultMemory,
        characters: [
          { id: 'char-2', name: 'Char 2' } as any,
          { id: 'char-1', name: 'Char 1 Old' } as any
        ]
      }
    });

    const merged = mergeStories(local, cloud);
    expect(merged.memory.characters).toHaveLength(2);
    const char1 = merged.memory.characters.find(c => c.id === 'char-1');
    expect(char1?.name).toBe('Char 1 New');
  });

  it('merges plot threads correctly (strings and objects)', () => {
    const local = createMockStory({
      memory: {
        ...defaultMemory,
        unresolvedPlotThreads: ['Thread 1', { id: 't2', description: 'Thread 2' } as any]
      }
    });
    const cloud = createMockStory({
      memory: {
        ...defaultMemory,
        unresolvedPlotThreads: ['Thread 1', 'Thread 3']
      }
    });

    const merged = mergeStories(local, cloud);
    expect(merged.memory.unresolvedPlotThreads).toHaveLength(3);
    // Since we use resolveThreadId which uses description if id is missing
    const descriptions = merged.memory.unresolvedPlotThreads.map(t => typeof t === 'string' ? t : t.description);
    expect(descriptions).toContain('Thread 1');
    expect(descriptions).toContain('Thread 2');
    expect(descriptions).toContain('Thread 3');
  });

  it('merges arcs and chapters correctly by picking best content', () => {
    const localChapter: Chapter = { number: 1, title: 'Ch 1 Local', premise: '', status: 'read', hasContent: true, generatedContent: 'Short' };
    const cloudChapter: Chapter = { number: 1, title: 'Ch 1 Cloud', premise: '', status: 'read', hasContent: true, generatedContent: 'Longer Content' };

    const local: StoryWorld = createMockStory({
      arcs: [{ title: 'Arc 1', chapters: [localChapter], isCompleted: false }]
    });
    const cloud: StoryWorld = createMockStory({
      arcs: [{ title: 'Arc 1', chapters: [cloudChapter], isCompleted: false }]
    });

    const merged = mergeStories(local, cloud);
    expect(merged.arcs[0].chapters[0].generatedContent).toBe('Longer Content');
  });

  it('prefers sealed chapters when merging chapters', () => {
    const localChapter: Chapter = { number: 1, title: 'Ch 1', premise: '', status: 'read', sealedAt: 100, generatedContent: 'C1' };
    const cloudChapter: Chapter = { number: 1, title: 'Ch 1', premise: '', status: 'read', sealedAt: 200, generatedContent: 'C2' };

    const local = createMockStory({ arcs: [{ title: 'A1', chapters: [localChapter], isCompleted: false }] });
    const cloud = createMockStory({ arcs: [{ title: 'A1', chapters: [cloudChapter], isCompleted: false }] });

    const merged = mergeStories(local, cloud);
    expect(merged.arcs[0].chapters[0].sealedAt).toBe(200);
    expect(merged.arcs[0].chapters[0].generatedContent).toBe('C2');
  });

  it('merges bookmarks, relationships, and karma nodes by id', () => {
    const local = createMockStory({
      bookmarks: [{ id: 'b1', chapterNumber: 1, paragraphIndex: 0, paragraphExcerpt: 'Ex', createdAt: 'now' }],
      relationships: [{ id: 'r1', sourceCharId: 's', sourceCharName: 'sn', targetCharId: 't', targetCharName: 'tn', affinity: 10, description: 'd', updatedAt: 'now' }]
    });
    const cloud = createMockStory({
      bookmarks: [{ id: 'b2', chapterNumber: 2, paragraphIndex: 0, paragraphExcerpt: 'Ex2', createdAt: 'now' }],
      karmaNodes: [{ id: 'k1', sourceId: 's', sourceName: 'sn', targetId: 't', targetName: 'tn', description: 'd', severity: 'Minor', type: 'Debt', status: 'active', createdAt: 'now' }]
    });

    const merged = mergeStories(local, cloud);
    expect(merged.bookmarks).toHaveLength(2);
    expect(merged.relationships).toHaveLength(1);
    expect(merged.karmaNodes).toHaveLength(1);
  });
});
