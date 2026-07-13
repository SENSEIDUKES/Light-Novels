import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: { currentUser: { uid: 'reader' } as null | { uid: string } },
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn(),
  unsubscribe: vi.fn(),
  runTransaction: vi.fn(),
  transactionGet: vi.fn(),
  transactionSet: vi.fn(),
}));

vi.mock('./firebase', () => ({
  db: {},
  auth: mocks.auth,
  OperationType: {
    LIST: 'list',
    GET: 'get',
    WRITE: 'write',
    DELETE: 'delete',
  },
  handleFirestoreError: (error: unknown) => { throw error; },
}));

vi.mock('firebase/firestore', () => ({
  collection: mocks.collection,
  doc: mocks.doc,
  getDoc: mocks.getDoc,
  getDocs: mocks.getDocs,
  setDoc: mocks.setDoc,
  deleteDoc: mocks.deleteDoc,
  query: mocks.query,
  where: mocks.where,
  onSnapshot: mocks.onSnapshot,
  runTransaction: mocks.runTransaction,
}));

import { FirebaseStorageAdapter } from './firebaseStorage';

describe('FirebaseStorageAdapter sync signaling and deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.currentUser = { uid: 'reader' };
    mocks.collection.mockImplementation((_db, path) => ({ path }));
    mocks.where.mockReturnValue({ ownerFilter: true });
    mocks.query.mockReturnValue({ storiesQuery: true });
    mocks.doc.mockImplementation((...parts) => ({ parts }));
    mocks.onSnapshot.mockReturnValue(mocks.unsubscribe);
    mocks.getDocs.mockResolvedValue({
      forEach: (callback: (value: { ref: { id: string } }) => void) => {
        callback({ ref: { id: 'chapter_1' } });
      },
    });
    mocks.deleteDoc.mockResolvedValue(undefined);
    mocks.setDoc.mockResolvedValue(undefined);
    mocks.transactionGet.mockResolvedValue({
      exists: () => false,
      data: () => undefined,
    });
    mocks.transactionSet.mockReturnValue(undefined);
    mocks.runTransaction.mockImplementation(
      async (
        _db,
        update: (transaction: {
          get: typeof mocks.transactionGet;
          set: typeof mocks.transactionSet;
        }) => Promise<unknown>,
      ) => update({ get: mocks.transactionGet, set: mocks.transactionSet }),
    );
  });

  it('subscribes to the authenticated user story query', () => {
    const adapter = new FirebaseStorageAdapter();
    const onChange = vi.fn();
    const onError = vi.fn();

    const unsubscribe = adapter.subscribeToStories(onChange, onError);

    expect(mocks.where).toHaveBeenCalledWith('userId', '==', 'reader');
    expect(mocks.onSnapshot).toHaveBeenCalledWith(
      { storiesQuery: true },
      expect.any(Function),
      onError,
    );
    const snapshotCallback = mocks.onSnapshot.mock.calls[0][1];
    snapshotCallback({
      docChanges: () => [
        { doc: { id: 'story_1' } },
        { doc: { id: 'story_2' } },
      ],
    });
    expect(onChange).toHaveBeenCalledWith(['story_1', 'story_2']);
    expect(unsubscribe).toBe(mocks.unsubscribe);
  });

  it('ignores a queued story snapshot after the authenticated account changes', () => {
    const adapter = new FirebaseStorageAdapter();
    const onChange = vi.fn();

    adapter.subscribeToStories(onChange, vi.fn());
    const snapshotCallback = mocks.onSnapshot.mock.calls[0][1];
    mocks.auth.currentUser = { uid: 'other-reader' };
    snapshotCallback({
      docChanges: () => [{ doc: { id: 'story_1' } }],
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('adds the captured owner tag to every chapter write', async () => {
    const adapter = new FirebaseStorageAdapter();

    await adapter.saveChapterContent({
      storyId: 'story_1',
      chapterNumber: 1,
      generatedContent: 'Owned prose',
    });

    expect(mocks.setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        storyId: 'story_1',
        chapterNumber: 1,
        userId: 'reader',
      }),
    );
  });

  it('rejects a story write when the transaction sees a newer remote revision', async () => {
    const adapter = new FirebaseStorageAdapter();
    mocks.transactionGet.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ updatedAt: '2026-07-13T12:02:00.000Z' }),
    });

    await expect(
      adapter.saveStoryIfUnchanged(
        {
          id: 'story_1',
          title: 'Stale phone edit',
          genre: 'Fantasy',
          mcName: 'MC',
          customPremise: '',
          createdAt: '2026-07-13T12:00:00.000Z',
          updatedAt: '2026-07-13T12:01:00.000Z',
          currentChapterNumber: 1,
          memory: {
            powerSystem: '',
            characters: [],
            currentPowerStage: '',
            worldRules: [],
            unresolvedPlotThreads: [],
            resolvedPlotThreads: [],
          },
          arcs: [],
        },
        { exists: true, updatedAt: '2026-07-13T12:00:00.000Z' },
      ),
    ).rejects.toMatchObject({ code: 'sync/revision-changed' });
    expect(mocks.transactionSet).not.toHaveBeenCalled();
    expect(mocks.setDoc).not.toHaveBeenCalled();
  });

  it('rejects the retried transaction when a remote write lands after its first read', async () => {
    const adapter = new FirebaseStorageAdapter();
    mocks.transactionGet
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ updatedAt: '2026-07-13T12:00:00.000Z' }),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ updatedAt: '2026-07-13T12:02:00.000Z' }),
      });
    mocks.runTransaction.mockImplementationOnce(async (_db, update) => {
      // Firestore discards the first transaction attempt when another device
      // commits after its read, then invokes the callback again with fresh data.
      await update({ get: mocks.transactionGet, set: mocks.transactionSet });
      return update({ get: mocks.transactionGet, set: mocks.transactionSet });
    });

    await expect(
      adapter.saveStoryIfUnchanged(
        {
          id: 'story_1',
          title: 'Phone edit',
          genre: 'Fantasy',
          mcName: 'MC',
          customPremise: '',
          createdAt: '2026-07-13T12:00:00.000Z',
          updatedAt: '2026-07-13T12:01:00.000Z',
          currentChapterNumber: 1,
          memory: {
            powerSystem: '',
            characters: [],
            currentPowerStage: '',
            worldRules: [],
            unresolvedPlotThreads: [],
            resolvedPlotThreads: [],
          },
          arcs: [],
        },
        { exists: true, updatedAt: '2026-07-13T12:00:00.000Z' },
      ),
    ).rejects.toMatchObject({ code: 'sync/revision-changed' });
    // The first set belongs to the discarded transaction attempt; the retried
    // callback detects the new revision before scheduling another write.
    expect(mocks.transactionSet).toHaveBeenCalledTimes(1);
  });

  it('rejects a same-millisecond overwrite when the cloud revision nonce changed', async () => {
    const adapter = new FirebaseStorageAdapter();
    mocks.transactionGet.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        updatedAt: '2026-07-13T12:00:00.000Z',
        syncRevision: 'tablet-write',
      }),
    });

    await expect(
      adapter.saveStoryIfUnchanged(
        {
          id: 'story_1',
          title: 'Phone edit from the same millisecond',
          genre: 'Fantasy',
          mcName: 'MC',
          customPremise: '',
          createdAt: '2026-07-13T11:00:00.000Z',
          updatedAt: '2026-07-13T12:00:00.000Z',
          currentChapterNumber: 1,
          memory: {
            powerSystem: '',
            characters: [],
            currentPowerStage: '',
            worldRules: [],
            unresolvedPlotThreads: [],
            resolvedPlotThreads: [],
          },
          arcs: [],
        },
        {
          exists: true,
          updatedAt: '2026-07-13T12:00:00.000Z',
          syncRevision: 'phone-snapshot',
        },
      ),
    ).rejects.toMatchObject({ code: 'sync/revision-changed' });
    expect(mocks.transactionSet).not.toHaveBeenCalled();
  });

  it('does not mistake an existing timestamp-free story for an absent document', async () => {
    const adapter = new FirebaseStorageAdapter();
    mocks.transactionGet.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ id: 'legacy_story', userId: 'reader' }),
    });

    await expect(
      adapter.saveStoryIfUnchanged(
        {
          id: 'legacy_story',
          title: 'Local copy',
          genre: 'Fantasy',
          mcName: 'MC',
          customPremise: '',
          createdAt: '2026-07-13T12:00:00.000Z',
          updatedAt: '2026-07-13T12:01:00.000Z',
          currentChapterNumber: 1,
          memory: {
            powerSystem: '',
            characters: [],
            currentPowerStage: '',
            worldRules: [],
            unresolvedPlotThreads: [],
            resolvedPlotThreads: [],
          },
          arcs: [],
        },
        { exists: false, updatedAt: null },
      ),
    ).rejects.toMatchObject({ code: 'sync/revision-changed' });
    expect(mocks.transactionSet).not.toHaveBeenCalled();
  });

  it('rejects a chapter write when another device updated it after the snapshot', async () => {
    const adapter = new FirebaseStorageAdapter();
    mocks.transactionGet.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ updatedAt: '2026-07-13T12:02:00.000Z' }),
    });

    await expect(
      adapter.saveChapterContentIfUnchanged(
        {
          storyId: 'story_1',
          chapterNumber: 1,
          generatedContent: 'Stale phone prose',
          updatedAt: '2026-07-13T12:01:00.000Z',
        },
        { exists: true, updatedAt: '2026-07-13T12:00:00.000Z' },
      ),
    ).rejects.toMatchObject({ code: 'sync/revision-changed' });
    expect(mocks.transactionSet).not.toHaveBeenCalled();
  });

  it('writes a matching story revision transactionally with the captured owner', async () => {
    const adapter = new FirebaseStorageAdapter();
    mocks.transactionGet.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ updatedAt: '2026-07-13T12:00:00.000Z' }),
    });

    await adapter.saveStoryIfUnchanged(
      {
        id: 'story_1',
        title: 'Safe phone edit',
        genre: 'Fantasy',
        mcName: 'MC',
        customPremise: '',
        createdAt: '2026-07-13T12:00:00.000Z',
        updatedAt: '2026-07-13T12:01:00.000Z',
        currentChapterNumber: 1,
        memory: {
          powerSystem: '',
          characters: [],
          currentPowerStage: '',
          worldRules: [],
          unresolvedPlotThreads: [],
          resolvedPlotThreads: [],
        },
        arcs: [],
      },
      { exists: true, updatedAt: '2026-07-13T12:00:00.000Z' },
    );

    expect(mocks.transactionSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        id: 'story_1',
        userId: 'reader',
        deleted: false,
      }),
    );
    expect(mocks.setDoc).not.toHaveBeenCalled();
  });

  it('writes a matching chapter revision transactionally with the captured owner', async () => {
    const adapter = new FirebaseStorageAdapter();
    mocks.transactionGet.mockResolvedValueOnce({
      exists: () => false,
      data: () => undefined,
    });

    await adapter.saveChapterContentIfUnchanged(
      {
        storyId: 'story_1',
        chapterNumber: 1,
        generatedContent: 'Safe phone prose',
        updatedAt: '2026-07-13T12:01:00.000Z',
      },
      { exists: false, updatedAt: null },
    );

    expect(mocks.transactionSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        storyId: 'story_1',
        chapterNumber: 1,
        userId: 'reader',
      }),
    );
  });

  it('replaces a story snapshot so intentionally omitted fields are removed', async () => {
    const adapter = new FirebaseStorageAdapter();
    let stored: Record<string, unknown> = {
      id: 'story_1',
      userId: 'reader',
      updatedAt: '2026-07-13T12:00:00.000Z',
      syncRevision: 'shared-base',
      chapterGenerationBatch: { status: 'generating', nextChapter: 4 },
    };
    mocks.transactionGet.mockImplementation(async () => ({
      exists: () => true,
      data: () => stored,
    }));
    mocks.transactionSet.mockImplementation(
      (_ref, payload: Record<string, unknown>, options?: { merge?: boolean }) => {
        stored = options?.merge ? { ...stored, ...payload } : { ...payload };
      },
    );

    await adapter.saveStoryIfUnchanged(
      {
        id: 'story_1',
        title: 'Completed batch',
        genre: 'Fantasy',
        mcName: 'MC',
        customPremise: '',
        createdAt: '2026-07-13T11:00:00.000Z',
        updatedAt: '2026-07-13T12:01:00.000Z',
        syncRevision: 'completed-write',
        currentChapterNumber: 4,
        memory: {
          powerSystem: '',
          characters: [],
          currentPowerStage: '',
          worldRules: [],
          unresolvedPlotThreads: [],
          resolvedPlotThreads: [],
        },
        arcs: [],
      },
      {
        exists: true,
        updatedAt: '2026-07-13T12:00:00.000Z',
        syncRevision: 'shared-base',
      },
    );

    expect(stored).not.toHaveProperty('chapterGenerationBatch');
    expect(stored).toMatchObject({
      title: 'Completed batch',
      syncRevision: 'completed-write',
      userId: 'reader',
    });
    expect(mocks.transactionSet.mock.calls[0]).toHaveLength(2);
  });

  it('replaces chapter prose so omitted legacy blocks cannot override it', async () => {
    const adapter = new FirebaseStorageAdapter();
    let stored: Record<string, unknown> = {
      storyId: 'story_1',
      chapterNumber: 1,
      userId: 'reader',
      updatedAt: '2026-07-13T12:00:00.000Z',
      syncRevision: 'shared-base',
      blocks: [{ type: 'paragraph', text: 'Old cloud prose' }],
    };
    mocks.transactionGet.mockImplementation(async () => ({
      exists: () => true,
      data: () => stored,
    }));
    mocks.transactionSet.mockImplementation(
      (_ref, payload: Record<string, unknown>, options?: { merge?: boolean }) => {
        stored = options?.merge ? { ...stored, ...payload } : { ...payload };
      },
    );

    await adapter.saveChapterContentIfUnchanged(
      {
        storyId: 'story_1',
        chapterNumber: 1,
        generatedContent: 'Chosen current prose',
        updatedAt: '2026-07-13T12:01:00.000Z',
        syncRevision: 'chosen-write',
      },
      {
        exists: true,
        updatedAt: '2026-07-13T12:00:00.000Z',
        syncRevision: 'shared-base',
      },
    );

    expect(stored).not.toHaveProperty('blocks');
    expect(stored).toMatchObject({
      generatedContent: 'Chosen current prose',
      syncRevision: 'chosen-write',
      userId: 'reader',
    });
    expect(mocks.transactionSet.mock.calls[0]).toHaveLength(2);
  });

  it('aborts a conditional write if the account changes during its transaction read', async () => {
    const adapter = new FirebaseStorageAdapter();
    mocks.transactionGet.mockImplementationOnce(async () => {
      mocks.auth.currentUser = { uid: 'other-reader' };
      return {
        exists: () => false,
        data: () => undefined,
      };
    });

    await expect(
      adapter.saveStoryIfUnchanged(
        {
          id: 'story_1',
          title: 'Wrong-account write',
          genre: 'Fantasy',
          mcName: 'MC',
          customPremise: '',
          createdAt: '2026-07-13T12:00:00.000Z',
          updatedAt: '2026-07-13T12:01:00.000Z',
          currentChapterNumber: 1,
          memory: {
            powerSystem: '',
            characters: [],
            currentPowerStage: '',
            worldRules: [],
            unresolvedPlotThreads: [],
            resolvedPlotThreads: [],
          },
          arcs: [],
        },
        { exists: false, updatedAt: null },
      ),
    ).rejects.toMatchObject({ code: 'auth/account-changed' });
    expect(mocks.transactionSet).not.toHaveBeenCalled();
  });

  it('deletes chapter bodies and replaces the story with a minimal tombstone', async () => {
    const adapter = new FirebaseStorageAdapter();

    await adapter.deleteStory('story_1');

    expect(mocks.deleteDoc).toHaveBeenCalledWith({ id: 'chapter_1' });
    expect(mocks.setDoc).toHaveBeenCalledTimes(1);
    expect(mocks.setDoc).toHaveBeenCalledWith(
      expect.anything(),
      {
        id: 'story_1',
        userId: 'reader',
        deleted: true,
        updatedAt: expect.any(String),
      },
    );
    expect(mocks.setDoc.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.getDocs.mock.invocationCallOrder[0],
    );
  });

  it('keeps the tombstone but aborts chapter cleanup if the account changes during discovery', async () => {
    let resolveChapters!: (value: unknown) => void;
    mocks.getDocs.mockReturnValueOnce(new Promise((resolve) => {
      resolveChapters = resolve;
    }));
    const adapter = new FirebaseStorageAdapter();

    const deletion = adapter.deleteStory('story_1');
    mocks.auth.currentUser = { uid: 'other-reader' };
    resolveChapters({
      forEach: (callback: (value: { ref: { id: string } }) => void) => {
        callback({ ref: { id: 'chapter_1' } });
      },
    });

    await expect(deletion).rejects.toMatchObject({ code: 'auth/account-changed' });
    expect(mocks.deleteDoc).not.toHaveBeenCalled();
    expect(mocks.setDoc).toHaveBeenCalledTimes(1);
    expect(mocks.setDoc.mock.calls[0][1]).toMatchObject({ userId: 'reader', deleted: true });
  });

  it('does not acknowledge deletion if the account changes during chapter removal', async () => {
    let resolveChapterDelete!: () => void;
    mocks.deleteDoc.mockReturnValueOnce(new Promise<void>((resolve) => {
      resolveChapterDelete = resolve;
    }));
    const adapter = new FirebaseStorageAdapter();

    const deletion = adapter.deleteStory('story_1');
    await vi.waitFor(() => expect(mocks.deleteDoc).toHaveBeenCalledTimes(1));
    mocks.auth.currentUser = { uid: 'other-reader' };
    resolveChapterDelete();

    await expect(deletion).rejects.toMatchObject({ code: 'auth/account-changed' });
    expect(mocks.setDoc).toHaveBeenCalledTimes(1);
    expect(mocks.setDoc.mock.calls[0][1]).toMatchObject({ userId: 'reader', deleted: true });
  });

  it('keeps the captured owner and rejects acknowledgement if auth changes during tombstone write', async () => {
    let resolveTombstone!: () => void;
    mocks.setDoc.mockReturnValueOnce(new Promise<void>((resolve) => {
      resolveTombstone = resolve;
    }));
    const adapter = new FirebaseStorageAdapter();

    const deletion = adapter.deleteStory('story_1');
    await vi.waitFor(() => expect(mocks.setDoc).toHaveBeenCalledTimes(1));
    expect(mocks.setDoc.mock.calls[0][1]).toMatchObject({ userId: 'reader' });
    mocks.auth.currentUser = { uid: 'other-reader' };
    resolveTombstone();

    await expect(deletion).rejects.toMatchObject({ code: 'auth/account-changed' });
  });
});
