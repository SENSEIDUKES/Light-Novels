import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStoryEngine } from './useStoryEngine';
import { useAppStore } from '../store/useAppStore';
import { storyStorage } from '../lib/storage';
import { auth } from '../lib/firebase';

// The store's real saveStories/updateStory/updateChapter are exercised end
// to end here (only the durable-storage boundary is mocked) — that is the
// only way to prove the hook actually delegates to them, rather than to a
// mock that would happily accept a hand-reconstructed array too.
vi.mock('../lib/storage', () => ({
  storyStorage: {
    startTransaction: vi.fn(),
    commitTransaction: vi.fn().mockResolvedValue(true),
    rollbackTransaction: vi.fn(),
    saveStory: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../lib/firebase', () => ({
  auth: { currentUser: null },
  LOCAL_ONLY_MODE: true,
}));

vi.mock('../lib/encryption', () => ({
  secureStorage: { getItem: vi.fn() },
}));

vi.mock('./useChapterGeneration', () => ({
  useChapterGeneration: () => ({ handleGenerateChapter: vi.fn(), handleGenerateNextFiveChapters: vi.fn() })
}));
vi.mock('./useArcSteering', () => ({
  useArcSteering: () => ({ handleSteerArc: vi.fn(), handleAlterFate: vi.fn() })
}));
vi.mock('./useStoryGeneration', () => ({
  useStoryGeneration: () => ({ handleGenerateBlueprint: vi.fn(), handleStartStory: vi.fn() })
}));
vi.mock('./useVisualAssets', () => ({
  useVisualAssets: () => ({ handleGenerateCover: vi.fn(), handleApplyCover: vi.fn(), handleSelectCover: vi.fn() })
}));
vi.mock('./useChapterSealing', () => ({
  useChapterSealing: () => ({ handleCheckConsistency: vi.fn(), handleSealChapter: vi.fn() })
}));
vi.mock('../lib/qi', () => ({
  awardQi: vi.fn()
}));

const makeStories = (): any[] => [
  {
    id: 'story1',
    persistenceId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    memory: {},
    arcs: [
      {
        title: 'Arc 1',
        chapters: [
          { number: 1, status: 'unread' },
          { number: 2, status: 'read' },
        ]
      }
    ]
  }
];

describe('useStoryEngine', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    (auth as any).currentUser = null;
    vi.mocked(storyStorage.saveStory).mockResolvedValue(undefined);
    // Settle every fixture story into its stable saved shape before each
    // test, so a test's own save is the only one that shows up as
    // "changed" — see the equivalent comment in useAppStore.test.ts for why
    // an unsaved fixture's first save is not representative on its own.
    useAppStore.getState().setStories(makeStories());
    await useAppStore.getState().saveStories(useAppStore.getState().stories);
    useAppStore.getState().setActiveStoryId('story1');
    vi.mocked(storyStorage.saveStory).mockClear();
  });

  it('handleUpdateMemoryManual updates memory via the store\'s updateStory, without marking the story edited', async () => {
    const { result } = renderHook(() => useStoryEngine());

    await act(async () => {
      await result.current.handleUpdateMemoryManual({ powerSystem: 'Test' } as any);
    });

    const updated = useAppStore.getState().stories[0];
    expect(updated.memory.powerSystem).toBe('Test');
    // handleUpdateMemoryManual never marked the story edited pre-refactor;
    // updateStory's markEdited:false option preserves that.
    expect(updated.isEdited).toBeFalsy();
    expect(updated.updatedAt).toEqual(expect.any(String));
    expect(storyStorage.saveStory).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'story1' }),
    );
  });

  it('handleUpdateMemoryManual does nothing when there is no active story', async () => {
    useAppStore.getState().setActiveStoryId(null);
    const { result } = renderHook(() => useStoryEngine());

    await act(async () => {
      await result.current.handleUpdateMemoryManual({ powerSystem: 'Test' } as any);
    });

    expect(storyStorage.saveStory).not.toHaveBeenCalled();
  });

  describe('handleUpdateStoryDirect', () => {
    it('writes through the store and preserves its metadata behavior', async () => {
      const { result } = renderHook(() => useStoryEngine());

      await act(async () => {
        await result.current.handleUpdateStoryDirect({ id: 'story1', title: 'New Title' } as any);
      });

      const updated = useAppStore.getState().stories[0];
      expect(updated.title).toBe('New Title');
      // Pre-refactor this handler stamped updatedAt and never set isEdited.
      expect(updated.updatedAt).toEqual(expect.any(String));
      expect(updated.isEdited).toBeFalsy();
      expect(storyStorage.saveStory).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'story1', title: 'New Title' }),
      );
    });

    it('targets the passed story id, not the active story', async () => {
      const secondStory = {
        id: 'story2',
        persistenceId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        title: 'Second',
        memory: {},
        arcs: [{ title: 'Arc 1', chapters: [{ number: 1, status: 'unread' }] }],
      };
      useAppStore.getState().setStories([...useAppStore.getState().stories, secondStory as any]);
      await useAppStore.getState().saveStories(useAppStore.getState().stories);
      vi.mocked(storyStorage.saveStory).mockClear();
      // story1 stays active throughout.
      expect(useAppStore.getState().activeStoryId).toBe('story1');

      const { result } = renderHook(() => useStoryEngine());
      await act(async () => {
        await result.current.handleUpdateStoryDirect({ id: 'story2', title: 'Renamed Second' } as any);
      });

      expect(useAppStore.getState().stories.find(s => s.id === 'story2')?.title).toBe('Renamed Second');
      expect(storyStorage.saveStory).toHaveBeenCalledTimes(1);
      expect(storyStorage.saveStory).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'story2' }),
      );
    });

    it('leaves unrelated stories unchanged', async () => {
      const secondStory = {
        id: 'story2',
        persistenceId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        title: 'Second',
        memory: {},
        arcs: [{ title: 'Arc 1', chapters: [{ number: 1, status: 'unread' }] }],
      };
      useAppStore.getState().setStories([...useAppStore.getState().stories, secondStory as any]);
      await useAppStore.getState().saveStories(useAppStore.getState().stories);
      vi.mocked(storyStorage.saveStory).mockClear();

      const { result } = renderHook(() => useStoryEngine());
      await act(async () => {
        await result.current.handleUpdateStoryDirect({ id: 'story1', title: 'New Title' } as any);
      });

      const untouched = useAppStore.getState().stories.find(s => s.id === 'story2');
      expect(untouched?.title).toBe('Second');
      expect(untouched?.arcs[0].chapters[0].status).toBe('unread');
      expect(storyStorage.saveStory).toHaveBeenCalledTimes(1);
    });

    it('does not drop a field written concurrently by an earlier queued save', async () => {
      // The old implementation swapped the caller's whole object into the
      // array, so any field committed between the caller's read and its save
      // was lost. Going through updateStory spreads the patch over the copy
      // that is current at the front of the queue instead.
      const { result } = renderHook(() => useStoryEngine());

      let releaseFirstWrite!: () => void;
      vi.mocked(storyStorage.saveStory).mockImplementationOnce(async () => {
        await new Promise<void>((resolve) => { releaseFirstWrite = resolve; });
      });

      const both = act(async () => {
        await Promise.all([
          // Queued first: sets a field the second caller never saw.
          useAppStore.getState().updateStory('story1', { genre: 'Xianxia' } as any, { markEdited: false }),
          result.current.handleUpdateStoryDirect({ id: 'story1', title: 'New Title' } as any),
        ]);
      });

      await Promise.resolve();
      await Promise.resolve();
      releaseFirstWrite();
      await both;

      const updated = useAppStore.getState().stories[0];
      expect(updated.title).toBe('New Title');
      expect(updated.genre).toBe('Xianxia');
    });

    it('does not corrupt in-memory state on a failed save, and does not block later writes', async () => {
      const { result } = renderHook(() => useStoryEngine());
      const before = useAppStore.getState().stories[0];

      vi.mocked(storyStorage.saveStory).mockRejectedValueOnce(new Error('disk full'));

      let caughtError: unknown;
      await act(async () => {
        try {
          await result.current.handleUpdateStoryDirect({ id: 'story1', title: 'Doomed' } as any);
        } catch (err) {
          caughtError = err;
        }
      });

      expect((caughtError as Error)?.message).toBe('disk full');
      // The rejected write must not have been committed to state.
      expect(useAppStore.getState().stories[0]).toEqual(before);

      // A subsequent write still goes through — the queue recovered.
      await act(async () => {
        await result.current.handleUpdateStoryDirect({ id: 'story1', title: 'Recovered' } as any);
      });

      expect(useAppStore.getState().stories[0].title).toBe('Recovered');
    });
  });

  it('handleToggleRead toggles unread to read, awards qi once, and stamps updatedAt', async () => {
    const { result } = renderHook(() => useStoryEngine());
    const { awardQi } = await import('../lib/qi');

    await act(async () => {
      await result.current.handleToggleRead(1);
    });

    const updated = useAppStore.getState().stories[0];
    expect(updated.arcs[0].chapters[0].status).toBe('read');
    expect(updated.updatedAt).toEqual(expect.any(String));
    // handleToggleRead never marked the story edited pre-refactor either.
    expect(updated.isEdited).toBeFalsy();
    expect(awardQi).toHaveBeenCalledTimes(1);
    expect(awardQi).toHaveBeenCalledWith('chapter_finished');
  });

  it('handleToggleRead toggles read to unread without awarding qi', async () => {
    const { result } = renderHook(() => useStoryEngine());
    const { awardQi } = await import('../lib/qi');

    await act(async () => {
      await result.current.handleToggleRead(2);
    });

    const updated = useAppStore.getState().stories[0];
    expect(updated.arcs[0].chapters[1].status).toBe('unread');
    expect(awardQi).not.toHaveBeenCalled();
  });

  it('handleToggleRead does nothing when there is no active story', async () => {
    useAppStore.getState().setActiveStoryId(null);
    const { result } = renderHook(() => useStoryEngine());
    const { awardQi } = await import('../lib/qi');

    await act(async () => {
      await result.current.handleToggleRead(1);
    });

    expect(storyStorage.saveStory).not.toHaveBeenCalled();
    expect(awardQi).not.toHaveBeenCalled();
  });

  it('handleToggleRead leaves an unrelated story and chapter unchanged', async () => {
    const secondStory = {
      id: 'story2',
      persistenceId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      memory: {},
      arcs: [{ title: 'Arc 1', chapters: [{ number: 1, status: 'unread' }] }],
    };
    useAppStore.getState().setStories([...useAppStore.getState().stories, secondStory as any]);
    await useAppStore.getState().saveStories(useAppStore.getState().stories);
    vi.mocked(storyStorage.saveStory).mockClear();

    const { result } = renderHook(() => useStoryEngine());
    await act(async () => {
      await result.current.handleToggleRead(1);
    });

    // Only the active story (story1) was written.
    expect(storyStorage.saveStory).toHaveBeenCalledTimes(1);
    expect(storyStorage.saveStory).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'story1' }),
    );
    const untouched = useAppStore.getState().stories.find(s => s.id === 'story2');
    expect(untouched?.arcs[0].chapters[0].status).toBe('unread');
    // The other chapter of the same story is also untouched.
    expect(useAppStore.getState().stories[0].arcs[0].chapters[1].status).toBe('read');
  });

  it('rapid concurrent toggles cannot award Qi twice', async () => {
    const { result } = renderHook(() => useStoryEngine());
    const { awardQi } = await import('../lib/qi');

    // Delay the first durable write so both calls are genuinely in flight
    // together, the same way two fast clicks would overlap in the browser.
    let releaseFirstWrite!: () => void;
    vi.mocked(storyStorage.saveStory).mockImplementationOnce(async () => {
      await new Promise<void>((resolve) => { releaseFirstWrite = resolve; });
    });

    // Both calls share a single act() scope: React's act() is not meant to
    // be entered twice concurrently, and doing so left later tests in this
    // file with a stale `result.current` even though this test itself
    // passed in isolation.
    const both = act(async () => {
      await Promise.all([
        result.current.handleToggleRead(1),
        result.current.handleToggleRead(1),
      ]);
    });

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    releaseFirstWrite();
    await both;

    // The second call is evaluated against the first call's committed
    // result (via updateChapter's serialization), not a stale pre-toggle
    // read, so the two toggles compose instead of double-awarding: one
    // flips unread -> read (awarding), the other read -> unread (not).
    expect(awardQi).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().stories[0].arcs[0].chapters[0].status).toBe('unread');
    expect(storyStorage.saveStory).toHaveBeenCalledTimes(2);
  });

  it('does not award Qi when the save fails, and does not block a later toggle', async () => {
    const { result } = renderHook(() => useStoryEngine());
    const { awardQi } = await import('../lib/qi');

    vi.mocked(storyStorage.saveStory).mockRejectedValueOnce(new Error('disk full'));

    // Catch inside the act() callback rather than asserting on a rejected
    // act() promise directly — letting act()'s own promise reject leaves
    // `result` in an unusable state for the rest of this test.
    let caughtError: unknown;
    await act(async () => {
      try {
        await result.current.handleToggleRead(1);
      } catch (err) {
        caughtError = err;
      }
    });

    expect((caughtError as Error)?.message).toBe('disk full');
    expect(awardQi).not.toHaveBeenCalled();
    expect(useAppStore.getState().stories[0].arcs[0].chapters[0].status).toBe('unread');

    // The failed call must not have left the save queue stuck.
    await act(async () => {
      await result.current.handleToggleRead(1);
    });

    expect(awardQi).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().stories[0].arcs[0].chapters[0].status).toBe('read');
  });

  it('returns all required handlers', () => {
    const { result } = renderHook(() => useStoryEngine());
    expect(typeof result.current.handleGenerateChapter).toBe('function');
    expect(typeof result.current.handleSteerArc).toBe('function');
    expect(typeof result.current.handleAlterFate).toBe('function');
    expect(typeof result.current.handleGenerateBlueprint).toBe('function');
    expect(typeof result.current.handleStartStory).toBe('function');
    expect(typeof result.current.handleGenerateCover).toBe('function');
    expect(typeof result.current.handleApplyCover).toBe('function');
    expect(typeof result.current.handleCheckConsistency).toBe('function');
    expect(typeof result.current.handleSealChapter).toBe('function');
  });
});
