import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from './useAppStore';
import { createGenerationSlice } from './useGenerationStore';
import { createUISlice } from './useUIStore';
import { applyStreamingChapter } from '../lib/chapterViews';
import { storyStorage } from '../lib/storage';
import type { Chapter, Story, StoryBlock } from '../types';

vi.mock('../lib/storage', () => ({
  storyStorage: {
    init: vi.fn(),
    onConflict: vi.fn(),
    getActiveAdapterName: vi.fn(),
    getStories: vi.fn(),
    saveStory: vi.fn(),
    deleteStory: vi.fn().mockResolvedValue(true),
    getStory: vi.fn(),
    getChapterContent: vi.fn(),
    saveChapterContent: vi.fn(),
    performSync: vi.fn(),
    startTransaction: vi.fn(),
    commitTransaction: vi.fn().mockResolvedValue(true),
    rollbackTransaction: vi.fn(),
  },
}));

vi.mock('../lib/encryption', () => ({
  secureStorage: { getItem: vi.fn() },
}));

vi.mock('../lib/firebase', () => ({
  auth: { currentUser: null, onAuthStateChanged: vi.fn() },
  LOCAL_ONLY_MODE: true,
}));

const block = (text: string): StoryBlock => ({ type: 'prose', text } as unknown as StoryBlock);

const makeStory = (id: string): Story => ({
  id,
  title: `Story ${id}`,
  genre: 'Xianxia',
  arcs: [
    {
      title: 'Arc I',
      chapters: [
        { number: 1, title: 'One', premise: 'p1', status: 'generating' },
        { number: 2, title: 'Two', premise: 'p2', status: 'locked' },
      ] as Chapter[],
    },
  ],
  memory: { characters: [], unresolvedPlotThreads: [] },
  currentChapterNumber: 1,
  updatedAt: '2026-01-01T00:00:00.000Z',
} as unknown as Story);

/** Every field this slice owns, so a later addition has to update the test too. */
const GENERATION_RUNTIME_FIELDS = ['streamingChapter'] as const;

describe('GenerationSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storyStorage.saveStory).mockResolvedValue(undefined);
    vi.mocked(storyStorage.getStories).mockResolvedValue([]);
    useAppStore.getState().setStories([]);
    useAppStore.setState({ activeStoryId: null });
    useAppStore.getState().resetGenerationRuntime();
  });

  describe('ownership', () => {
    it('is no longer declared by UISlice', () => {
      const uiSlice = createUISlice(vi.fn(), vi.fn(), {} as never);
      const uiKeys = Object.keys(uiSlice);

      expect(uiKeys).not.toContain('streamingChapter');
      expect(uiKeys).not.toContain('setStreamingChapter');
    });

    it('declares the live-generation runtime fields itself', () => {
      const generationSlice = createGenerationSlice(vi.fn(), vi.fn(), {} as never);
      const generationKeys = Object.keys(generationSlice);

      for (const field of GENERATION_RUNTIME_FIELDS) {
        expect(generationKeys).toContain(field);
      }
      expect(generationKeys).toContain('setStreamingChapter');
      expect(generationKeys).toContain('resetGenerationRuntime');
    });

    it('stays selectable from the composed store, so consumers are unchanged', () => {
      const selected = useAppStore.getState().streamingChapter;
      expect(selected).toBeNull();
      expect(typeof useAppStore.getState().setStreamingChapter).toBe('function');
    });
  });

  describe('stream lifecycle', () => {
    it('starts with no chapter streaming', () => {
      expect(useAppStore.getState().streamingChapter).toBeNull();
    });

    it('publishes the first partial payload when a stream starts', () => {
      useAppStore.getState().setStreamingChapter({
        number: 1,
        content: 'The pagoda door',
        blocks: [block('The pagoda door')],
      });

      expect(useAppStore.getState().streamingChapter).toEqual({
        number: 1,
        content: 'The pagoda door',
        blocks: [block('The pagoda door')],
      });
    });

    it('accumulates incremental updates as the stream advances', () => {
      const { setStreamingChapter } = useAppStore.getState();

      setStreamingChapter({ number: 1, content: 'A', blocks: [block('A')] });
      setStreamingChapter({ number: 1, content: 'A B', blocks: [block('A'), block('B')] });
      setStreamingChapter({
        number: 1,
        content: 'A B C',
        blocks: [block('A'), block('B'), block('C')],
      });

      const streaming = useAppStore.getState().streamingChapter;
      expect(streaming?.content).toBe('A B C');
      expect(streaming?.blocks).toHaveLength(3);
    });

    it('replaces — never merges — the payload for the same chapter', () => {
      const { setStreamingChapter } = useAppStore.getState();

      setStreamingChapter({ number: 1, content: 'first pass', blocks: [block('first pass')] });
      setStreamingChapter({ number: 1, content: 'repaired pass' });

      const streaming = useAppStore.getState().streamingChapter;
      expect(streaming).toEqual({ number: 1, content: 'repaired pass' });
      // The stale blocks from the previous payload must not survive the swap.
      expect(streaming?.blocks).toBeUndefined();
    });

    it('replaces the payload when the stream moves to the next chapter of a batch', () => {
      const { setStreamingChapter } = useAppStore.getState();

      setStreamingChapter({ number: 1, content: 'chapter one' });
      setStreamingChapter({ number: 2, content: 'chapter two' });

      expect(useAppStore.getState().streamingChapter).toEqual({ number: 2, content: 'chapter two' });
    });

    it('clears on completion', () => {
      const { setStreamingChapter } = useAppStore.getState();
      setStreamingChapter({ number: 1, content: 'finished prose' });

      // What `useChapterGeneration`'s `finally` block does once a run settles.
      setStreamingChapter(null);

      expect(useAppStore.getState().streamingChapter).toBeNull();
    });

    it('clears on failure or cancellation', () => {
      const { setStreamingChapter } = useAppStore.getState();
      setStreamingChapter({ number: 1, content: 'half a chapter' });

      setStreamingChapter(null);

      expect(useAppStore.getState().streamingChapter).toBeNull();
    });

    it('drops every runtime field through resetGenerationRuntime', () => {
      useAppStore.getState().setStreamingChapter({ number: 1, content: 'half a chapter' });

      useAppStore.getState().resetGenerationRuntime();

      const state = useAppStore.getState() as unknown as Record<string, unknown>;
      for (const field of GENERATION_RUNTIME_FIELDS) {
        expect(state[field]).toBeNull();
      }
    });
  });

  describe('scope boundaries', () => {
    it('drops an in-flight payload when the reader switches to another story', () => {
      const { setStories, setActiveStoryId, setStreamingChapter } = useAppStore.getState();
      setStories([makeStory('story-a'), makeStory('story-b')]);
      setActiveStoryId('story-a');
      setStreamingChapter({ number: 1, content: "story A's half-written chapter" });

      setActiveStoryId('story-b');

      // Chapter 1 exists in both stories; without the reset, story A's prose
      // would render inside story B's reader.
      expect(useAppStore.getState().streamingChapter).toBeNull();
    });

    it('keeps the live payload when the already-active story is re-selected', () => {
      const { setStories, setActiveStoryId, setStreamingChapter } = useAppStore.getState();
      setStories([makeStory('story-a')]);
      setActiveStoryId('story-a');
      setStreamingChapter({ number: 1, content: 'still streaming' });

      setActiveStoryId('story-a');

      expect(useAppStore.getState().streamingChapter).toEqual({
        number: 1,
        content: 'still streaming',
      });
    });

    it('clears on the account transition, which deselects the active story', () => {
      // The `onAuthStateChanged` handler in App.tsx runs `setActiveStoryId(null)`
      // followed by `resetGenerationRuntime()`; both paths must clear.
      const { setStories, setActiveStoryId, setStreamingChapter } = useAppStore.getState();
      setStories([makeStory('story-a')]);
      setActiveStoryId('story-a');
      setStreamingChapter({ number: 1, content: "the outgoing account's prose" });

      setActiveStoryId(null);
      expect(useAppStore.getState().streamingChapter).toBeNull();

      // ...and again for an account transition that begins with nothing open.
      setStreamingChapter({ number: 1, content: 'orphaned run' });
      useAppStore.getState().resetGenerationRuntime();
      expect(useAppStore.getState().streamingChapter).toBeNull();
    });
  });

  describe('persistence', () => {
    it('never writes runtime generation state into a durable story record', async () => {
      const { setStories, setStreamingChapter, saveStories } = useAppStore.getState();
      const story = makeStory('story-a');
      setStories([story]);
      setStreamingChapter({
        number: 1,
        content: 'half-written prose that must never be persisted',
        blocks: [block('half-written prose that must never be persisted')],
      });

      await saveStories([story]);

      expect(storyStorage.saveStory).toHaveBeenCalled();
      const persisted = vi.mocked(storyStorage.saveStory).mock.calls[0][0];
      const serialized = JSON.stringify(persisted);
      expect(serialized).not.toContain('streamingChapter');
      expect(serialized).not.toContain('half-written prose that must never be persisted');

      // Persisting the library must not disturb the run still in flight.
      expect(useAppStore.getState().streamingChapter?.number).toBe(1);
    });

    it('is not carried by any persisted preference surface', () => {
      // The store composes no `persist` middleware, so the only way runtime
      // state could be written as a preference is by being declared inside the
      // preference-owning slice. It is not.
      const uiSlice = createUISlice(vi.fn(), vi.fn(), {} as never) as unknown as Record<string, unknown>;
      for (const field of GENERATION_RUNTIME_FIELDS) {
        expect(uiSlice).not.toHaveProperty(field);
      }
    });
  });

  describe('reader adaptation', () => {
    it('still produces the correct reader-facing chapter from the slice payload', () => {
      const chapter = makeStory('story-a').arcs[0].chapters[0];
      useAppStore.getState().setStreamingChapter({
        number: 1,
        content: 'Li Wei stepped through',
        blocks: [block('Li Wei stepped through')],
      });

      // Exactly what `ReaderScreen.buildReaderChapters` does with the selector.
      const reader = applyStreamingChapter(chapter, useAppStore.getState().streamingChapter);

      expect(reader.generatedContent).toBe('Li Wei stepped through');
      expect(reader.blocks).toHaveLength(1);
    });

    it('leaves other chapters untouched while one is streaming', () => {
      const [first, second] = makeStory('story-a').arcs[0].chapters;
      useAppStore.getState().setStreamingChapter({ number: 1, content: 'only chapter one' });
      const streaming = useAppStore.getState().streamingChapter;

      expect(applyStreamingChapter(first, streaming).generatedContent).toBe('only chapter one');
      expect(applyStreamingChapter(second, streaming).generatedContent).toBeUndefined();
    });

    it('falls back to the stored chapter once the stream is cleared', () => {
      const chapter = makeStory('story-a').arcs[0].chapters[0];
      useAppStore.getState().setStreamingChapter({ number: 1, content: 'partial' });
      useAppStore.getState().setStreamingChapter(null);

      const reader = applyStreamingChapter(chapter, useAppStore.getState().streamingChapter);
      expect(reader.generatedContent).toBeUndefined();
    });
  });
});
