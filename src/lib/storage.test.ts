import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PersistentStorageManager, IndexedDBStorageAdapter, LocalStorageFallbackAdapter } from './storage';
import { StoryWorld, ChapterContent } from '../types';

describe('PersistentStorageManager', () => {
  let manager: PersistentStorageManager;

  beforeEach(() => {
    localStorage.clear();
    manager = new PersistentStorageManager();
    (manager as any).getCurrentUserId = () => 'test-user';
    (manager as any).awaitAccountScope = vi.fn().mockResolvedValue(undefined);
    (manager as any).localAccountScope = 'test-user';
    (manager as any).isCloudAvailable = false;
    const cloudAdapter = (manager as any).cloudAdapter;
    // Keep older behavioral assertions centered on their mocked save methods,
    // while production sync calls the revision-checked counterparts.
    cloudAdapter.getStories = vi.fn().mockResolvedValue([]);
    cloudAdapter.getStory = vi.fn().mockResolvedValue(null);
    cloudAdapter.getChapterContent = vi.fn().mockResolvedValue(null);
    cloudAdapter.saveStoryIfUnchanged = vi.fn((story: StoryWorld) =>
      cloudAdapter.saveStory(story),
    );
    cloudAdapter.saveChapterContentIfUnchanged = vi.fn((content: ChapterContent) =>
      cloudAdapter.saveChapterContent(content),
    );
  });

  afterEach(() => {
    // Remove the global window listeners the manager registers, so instances from one test
    // don't accumulate and pollute the next.
    manager?.dispose?.();
  });

  describe('Storage Adapter Selection & IndexedDB Fallback', () => {
    it('should fallback to LocalStorage if IndexedDB fails to initialize', async () => {
      const originalIndexedDB = window.indexedDB;
      Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true });

      await manager.init();
      
      const adapterName = manager.getActiveAdapterName();
      expect(adapterName).toContain('LocalStorage');

      if (originalIndexedDB) {
        Object.defineProperty(window, 'indexedDB', { value: originalIndexedDB, configurable: true });
      }
    });

    it('preserves existing local stories instead of silently evicting them on quota failure', async () => {
      const adapter = new LocalStorageFallbackAdapter();
      await adapter.init();
      const existing = {
        id: 'keep_me',
        title: 'Existing',
        genre: 'Fantasy',
        mcName: 'MC',
        customPremise: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currentChapterNumber: 1,
        memory: { powerSystem: '', characters: [], currentPowerStage: '', worldRules: [], unresolvedPlotThreads: [], resolvedPlotThreads: [] },
        arcs: [],
      } satisfies StoryWorld;
      await adapter.saveStory(existing);
      const originalPayload = localStorage.getItem('@seihouse/fiction-generator-stories-v2');
      const originalSetItem = Storage.prototype.setItem;
      const quotaSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
        if (key === '@seihouse/fiction-generator-stories-v2') {
          throw new DOMException('Quota exceeded', 'QuotaExceededError');
        }
        return originalSetItem.call(this, key, value);
      });

      try {
        await expect(
          adapter.saveStory({ ...existing, id: 'cannot_fit', title: 'New' }),
        ).rejects.toThrow();
      } finally {
        quotaSpy.mockRestore();
      }

      expect(localStorage.getItem('@seihouse/fiction-generator-stories-v2')).toBe(
        originalPayload,
      );
    });

    it('never strips another story assets while shrinking the incoming quota-heavy story', async () => {
      const adapter = new LocalStorageFallbackAdapter();
      await adapter.init();
      const makeLocalStory = (id: string, imageUrl: string): StoryWorld => ({
        id,
        imageUrl,
        title: id,
        genre: 'Fantasy',
        mcName: 'MC',
        customPremise: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currentChapterNumber: 1,
        memory: { powerSystem: '', characters: [], currentPowerStage: '', worldRules: [], unresolvedPlotThreads: [], resolvedPlotThreads: [] },
        arcs: [],
      });
      await adapter.saveStory(makeLocalStory('unrelated', 'data:image/png;base64,keep'));
      const originalSetItem = Storage.prototype.setItem;
      let storyWriteCount = 0;
      const quotaSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
        if (
          key === '@seihouse/fiction-generator-stories-v2' &&
          storyWriteCount++ === 0
        ) {
          throw new DOMException('Quota exceeded', 'QuotaExceededError');
        }
        return originalSetItem.call(this, key, value);
      });

      try {
        await adapter.saveStory(
          makeLocalStory('incoming', 'data:image/png;base64,strip'),
        );
      } finally {
        quotaSpy.mockRestore();
      }

      await expect(adapter.getStory('unrelated')).resolves.toEqual(
        expect.objectContaining({ imageUrl: 'data:image/png;base64,keep' }),
      );
      await expect(adapter.getStory('incoming')).resolves.toEqual(
        expect.not.objectContaining({ imageUrl: expect.anything() }),
      );
    });
  });

  describe('Chapter content split storage', () => {
    it('should split generated content out of the main story object to save space', async () => {
      await manager.init();
      await (manager as any).localAdapter.setAccountScope?.('test-user');

      const story: StoryWorld = {
        id: 'story_split_test',
        title: 'Test Split',
        genre: 'Fantasy',
        mcName: 'MC',
        customPremise: 'P',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currentChapterNumber: 1,
        memory: { powerSystem: '', characters: [], currentPowerStage: '', worldRules: [], unresolvedPlotThreads: [], resolvedPlotThreads: [] },
        arcs: [
          {
            title: 'Arc 1',
            isCompleted: false,
            chapters: [
              {
                number: 1,
                title: 'Chapter 1',
                premise: 'Premise',
                status: 'unread',
                generatedContent: 'Heavens opened!',
                summary: 'Start',
                _isNewContent: true,
              }
            ]
          }
        ]
      };

      await manager.saveStory(story);

      // Verify the story doesn't have generatedContent in the local list
      const savedStory = await manager.getStory('story_split_test');
      expect(savedStory).toBeDefined();
      expect(savedStory?.arcs[0].chapters[0].generatedContent).toBeUndefined();
      expect(savedStory?.arcs[0].chapters[0].hasContent).toBe(true);
      
      // Verify chapter content is stored separately
      const chapterContent = await manager.getChapterContent('story_split_test', 1);
      expect(chapterContent).toBeDefined();
      expect(chapterContent?.generatedContent).toBe('Heavens opened!');
    });
  });

  describe('Cloud write coalescing & circuit breaker', () => {
    const makeStory = (id: string): StoryWorld => ({
      id, title: 'T', genre: 'Fantasy', mcName: 'MC', customPremise: 'P',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      currentChapterNumber: 1,
      memory: { powerSystem: '', characters: [], currentPowerStage: '', worldRules: [], unresolvedPlotThreads: [], resolvedPlotThreads: [] },
      arcs: [],
    });

    it('coalesces a burst of saves for the same story into a single cloud write', async () => {
      vi.useFakeTimers();
      try {
        const cloudAdapter = (manager as any).cloudAdapter;
        cloudAdapter.saveStory = vi.fn().mockResolvedValue(undefined);
        (manager as any).isCloudAvailable = true;

        // Three rapid saves within the debounce window.
        await manager.saveStory(makeStory('burst_story'));
        await manager.saveStory(makeStory('burst_story'));
        await manager.saveStory(makeStory('burst_story'));

        // Nothing flushed immediately.
        expect(cloudAdapter.saveStory).not.toHaveBeenCalled();

        // After the debounce window, exactly one coalesced cloud write happens.
        await vi.advanceTimersByTimeAsync((manager as any).FLUSH_DEBOUNCE_MS + 10);
        expect(cloudAdapter.saveStory).toHaveBeenCalledTimes(1);
      } finally {
        manager.dispose();
        vi.useRealTimers();
      }
    });

    it('does not acknowledge a newer save that arrives while an upload is in flight', async () => {
      const cloudAdapter = (manager as any).cloudAdapter;
      let releaseFirstUpload!: () => void;
      const firstUpload = new Promise<void>((resolve) => {
        releaseFirstUpload = resolve;
      });
      cloudAdapter.saveStory = vi.fn()
        .mockReturnValueOnce(firstUpload)
        .mockResolvedValue(undefined);
      (manager as any).isCloudAvailable = true;

      await manager.saveStory({ ...makeStory('in_flight'), title: 'First edit' });
      const flushing = (manager as any).flushSyncQueue();
      await vi.waitFor(() => expect(cloudAdapter.saveStory).toHaveBeenCalledTimes(1));

      const laterSave = manager.saveStory({
        ...makeStory('in_flight'),
        title: 'Second edit',
      });
      releaseFirstUpload();
      await Promise.all([flushing, laterSave]);

      expect((manager as any).syncQueue).toEqual([
        expect.objectContaining({
          storyId: 'in_flight',
          generation: 1,
        }),
      ]);

      await (manager as any).flushSyncQueue();
      expect(cloudAdapter.saveStory).toHaveBeenCalledTimes(2);
      expect(cloudAdapter.saveStory.mock.calls[1][0]).toEqual(
        expect.objectContaining({ title: 'Second edit' }),
      );
      expect((manager as any).syncQueue).toEqual([]);
    });

    it('retains the outbox task when the cloud changes between queue read and write', async () => {
      const cloudAdapter = (manager as any).cloudAdapter;
      const earlierCloud = {
        ...makeStory('queue_remote_race'),
        updatedAt: new Date(Date.now() - 60_000).toISOString(),
        syncRevision: 'cloud-before-tablet-edit',
      };
      const revisionChanged = Object.assign(
        new Error('cloud changed after read'),
        { code: 'sync/revision-changed' },
      );
      cloudAdapter.getStory = vi.fn().mockResolvedValue(earlierCloud);
      cloudAdapter.saveStory = vi.fn();
      cloudAdapter.saveStoryIfUnchanged = vi
        .fn()
        .mockRejectedValue(revisionChanged);
      (manager as any).isCloudAvailable = true;

      await manager.saveStory({
        ...earlierCloud,
        title: 'Phone edit',
      });
      await (manager as any).flushSyncQueue();

      expect(cloudAdapter.saveStoryIfUnchanged).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Phone edit' }),
        {
          exists: true,
          updatedAt: earlierCloud.updatedAt,
          syncRevision: earlierCloud.syncRevision,
        },
      );
      expect(cloudAdapter.saveStory).not.toHaveBeenCalled();
      expect((manager as any).syncQueue).toEqual([
        expect.objectContaining({ type: 'story', storyId: earlierCloud.id }),
      ]);
      expect((manager as any).syncRequested).toBe(true);
    });

    it('stamps every saved story so caller-stale timestamps cannot hide a dirty write', async () => {
      const localAdapter = (manager as any).localAdapter;
      const cloudAdapter = (manager as any).cloudAdapter;
      const oldTimestamp = new Date(Date.now() - 60_000).toISOString();
      const cloudStory = {
        ...makeStory('stale_caller_timestamp'),
        updatedAt: oldTimestamp,
      };
      cloudAdapter.getStories = vi.fn().mockResolvedValue([cloudStory]);
      cloudAdapter.saveStory = vi.fn().mockResolvedValue(undefined);
      (manager as any).knownCloudRevisions = {
        'test-user': { [cloudStory.id]: oldTimestamp },
      };
      (manager as any).isCloudAvailable = true;

      await manager.saveStory({
        ...cloudStory,
        lastReadChapter: 2,
        updatedAt: oldTimestamp,
      });

      const saved = await localAdapter.getStory(cloudStory.id);
      expect(new Date(saved.updatedAt).getTime()).toBeGreaterThan(
        new Date(oldTimestamp).getTime(),
      );
      await manager.performSync();
      expect(cloudAdapter.saveStory).toHaveBeenCalledWith(
        expect.objectContaining({ id: cloudStory.id, lastReadChapter: 2 }),
      );
    });

    it('does not queue an identifier-only write when the local story save fails', async () => {
      const localAdapter = (manager as any).localAdapter;
      vi.spyOn(localAdapter, 'saveStory').mockRejectedValueOnce(
        new Error('local quota exhausted'),
      );

      await expect(manager.saveStory(makeStory('not_persisted'))).rejects.toThrow(
        'local quota exhausted',
      );
      expect((manager as any).syncQueue).toEqual([]);
    });

    it('keeps a task queued and retries after a transient sync error (no data loss)', async () => {
      const cloudAdapter = (manager as any).cloudAdapter;
      const transient: any = new Error('backend unavailable');
      transient.code = 'unavailable';
      cloudAdapter.saveStory = vi.fn().mockRejectedValueOnce(transient).mockResolvedValue(undefined);
      (manager as any).isCloudAvailable = true;

      await manager.saveStory(makeStory('flaky'));

      // First flush hits a transient error -> task is kept and its attempt count bumped.
      await (manager as any).flushSyncQueue();
      expect((manager as any).syncQueue.length).toBe(1);
      expect((manager as any).syncQueue[0].attempts).toBe(1);

      // Next flush succeeds -> queue drains.
      await (manager as any).flushSyncQueue();
      expect(cloudAdapter.saveStory).toHaveBeenCalledTimes(2);
      expect((manager as any).syncQueue.length).toBe(0);
    });

    it('retains a task on a permanent error so unsynced work is not lost', async () => {
      const cloudAdapter = (manager as any).cloudAdapter;
      const permanent: any = new Error('missing or insufficient permissions');
      permanent.code = 'permission-denied';
      cloudAdapter.saveStory = vi.fn().mockRejectedValue(permanent);
      (manager as any).isCloudAvailable = true;

      await manager.saveStory(makeStory('forbidden'));
      await (manager as any).flushSyncQueue();

      expect((manager as any).syncQueue).toEqual([
        expect.objectContaining({
          type: 'story',
          storyId: 'forbidden',
          attempts: 1,
        }),
      ]);
    });

    it('treats a corrupted write counter as zero so the breaker still works', () => {
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem('@seihouse/cloud-write-count', JSON.stringify({ date: today, count: 'corrupted' }));
      expect(manager.getCloudWritesToday()).toBe(0);
    });

    it('stops writing to the cloud once the daily budget is exceeded', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const cap = (manager as any).DAILY_WRITE_CAP;
      localStorage.setItem('@seihouse/cloud-write-count', JSON.stringify({ date: today, count: cap }));

      const cloudAdapter = (manager as any).cloudAdapter;
      cloudAdapter.saveStory = vi.fn().mockResolvedValue(undefined);
      (manager as any).isCloudAvailable = true;

      await manager.saveStory(makeStory('over_budget'));
      await (manager as any).flushSyncQueue();

      // Circuit breaker blocked the write; counter did not increase past the cap.
      expect(cloudAdapter.saveStory).not.toHaveBeenCalled();
      expect(manager.getCloudWritesToday()).toBe(cap);
      // Task remains queued so it can sync once the budget resets.
      expect((manager as any).syncQueue.length).toBeGreaterThan(0);
    });
  });

  describe('Firestore sync conflicts', () => {
    const makeStory = (id: string): StoryWorld => ({
      id, title: 'T', genre: 'Fantasy', mcName: 'MC', customPremise: 'P',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      currentChapterNumber: 1,
      memory: { powerSystem: '', characters: [], currentPowerStage: '', worldRules: [], unresolvedPlotThreads: [], resolvedPlotThreads: [] },
      arcs: [],
    });

    it('should set an active conflict and skip sync when significant differences exist', async () => {
      const localAdapter = (manager as any).localAdapter;
      const cloudAdapter = (manager as any).cloudAdapter;

      // Mock cloud adapter methods
      cloudAdapter.getStories = vi.fn();
      cloudAdapter.saveStory = vi.fn();

      // We make cloud available
      (manager as any).isCloudAvailable = true;

      // Conflict Scenario:
      // Local is older than Cloud by > 5 minutes
      const oldTime = Date.now() - 1000 * 60 * 10;
      const newTime = Date.now();

      const localStory: StoryWorld = {
        id: 'conflict_story', title: 'Local Version', genre: '', mcName: '', customPremise: '', createdAt: '', 
        updatedAt: new Date(oldTime).toISOString(), currentChapterNumber: 1, 
        memory: { powerSystem: '', characters: [], currentPowerStage: '', worldRules: [], unresolvedPlotThreads: [], resolvedPlotThreads: [] }, 
        arcs: []
      };

      const cloudStory: StoryWorld = {
        id: 'conflict_story', title: 'Cloud Version', genre: '', mcName: '', customPremise: '', createdAt: '', 
        updatedAt: new Date(newTime).toISOString(), currentChapterNumber: 1, 
        memory: { powerSystem: '', characters: [], currentPowerStage: '', worldRules: [], unresolvedPlotThreads: [], resolvedPlotThreads: [] }, 
        arcs: []
      };

      await localAdapter.saveStory(localStory);
      cloudAdapter.getStories.mockResolvedValue([cloudStory]);

      // Conflicts are dispatched through the registered handler (the app
      // wires this up in initStorage), not by importing the store directly.
      const onConflict = vi.fn();
      manager.onConflict(onConflict);

      await manager.performSync();

      const localStories = await localAdapter.getStories();
      expect(localStories.length).toBe(1);
      expect(localStories[0].title).toBe('Local Version');

      expect(onConflict).toHaveBeenCalledTimes(1);
      const conflict = onConflict.mock.calls[0][0];
      expect(conflict).toBeDefined();
      expect(conflict?.storyId).toBe('conflict_story');
      expect(conflict?.localStory.title).toBe('Local Version');
      expect(conflict?.cloudStory.title).toBe('Cloud Version');
    });

    it('downloads a cloud-only edit after a previous conflict resolution without reopening the modal', async () => {
      const localAdapter = (manager as any).localAdapter;
      const cloudAdapter = (manager as any).cloudAdapter;
      const resolvedAt = new Date(Date.now() - 1000 * 60 * 10).toISOString();
      const localStory = {
        ...makeStory('resolved_story'),
        title: 'Resolved title',
        updatedAt: resolvedAt,
        conflictResolvedAt: resolvedAt,
      };
      const cloudStory = {
        ...localStory,
        userId: 'test-user',
        title: 'Edited on another device',
        updatedAt: new Date().toISOString(),
      };
      await localAdapter.saveStory(localStory);
      cloudAdapter.getStories = vi.fn().mockResolvedValue([cloudStory]);
      (manager as any).isCloudAvailable = true;
      const onConflict = vi.fn();
      manager.onConflict(onConflict);

      await manager.performSync();

      expect(onConflict).not.toHaveBeenCalled();
      await expect(localAdapter.getStory('resolved_story')).resolves.toEqual(cloudStory);
    });

    it('automatically accepts a cloud-only edit from the last known shared revision', async () => {
      const localAdapter = (manager as any).localAdapter;
      const cloudAdapter = (manager as any).cloudAdapter;
      const baseTime = new Date(Date.now() - 1000 * 60 * 20).toISOString();
      const localStory = {
        ...makeStory('remote_only_edit'),
        title: 'Shared title',
        updatedAt: baseTime,
      };
      const cloudStory = {
        ...localStory,
        userId: 'test-user',
        title: 'Changed on the laptop',
        updatedAt: new Date().toISOString(),
      };
      await localAdapter.saveStory(localStory);
      cloudAdapter.getStories = vi.fn().mockResolvedValue([cloudStory]);
      (manager as any).knownCloudRevisions = {
        'test-user': { [localStory.id]: baseTime },
      };
      (manager as any).isCloudAvailable = true;
      const onConflict = vi.fn();
      manager.onConflict(onConflict);

      await manager.performSync();

      expect(onConflict).not.toHaveBeenCalled();
      await expect(localAdapter.getStory(localStory.id)).resolves.toEqual(cloudStory);
    });

    it('preserves a local save that lands while a cloud read is in flight', async () => {
      const localAdapter = (manager as any).localAdapter;
      const cloudAdapter = (manager as any).cloudAdapter;
      const baseTime = new Date(Date.now() - 120_000).toISOString();
      const localStory = {
        ...makeStory('save_during_pull'),
        userId: 'test-user',
        updatedAt: baseTime,
        lastReadChapter: 1,
      };
      const cloudStory = {
        ...localStory,
        updatedAt: new Date(Date.now() - 60_000).toISOString(),
        lastReadChapter: 2,
      };
      let releaseCloudRead!: (stories: StoryWorld[]) => void;
      const cloudRead = new Promise<StoryWorld[]>((resolve) => {
        releaseCloudRead = resolve;
      });
      await localAdapter.saveStory(localStory);
      cloudAdapter.getStories = vi.fn().mockReturnValue(cloudRead);
      cloudAdapter.saveStory = vi.fn().mockResolvedValue(undefined);
      (manager as any).knownCloudRevisions = {
        'test-user': { [localStory.id]: baseTime },
      };
      (manager as any).isCloudAvailable = true;

      const syncing = manager.performSync();
      await vi.waitFor(() => expect(cloudAdapter.getStories).toHaveBeenCalled());
      await manager.saveStory({ ...localStory, lastReadChapter: 3 });
      releaseCloudRead([cloudStory]);
      await syncing;

      await expect(localAdapter.getStory(localStory.id)).resolves.toEqual(
        expect.objectContaining({ lastReadChapter: 3 }),
      );
      expect(cloudAdapter.saveStory).toHaveBeenCalledWith(
        expect.objectContaining({ lastReadChapter: 3 }),
      );
    });

    it('automatically uploads a local-only edit from the last known shared revision', async () => {
      const localAdapter = (manager as any).localAdapter;
      const cloudAdapter = (manager as any).cloudAdapter;
      const baseTime = new Date(Date.now() - 1000 * 60 * 20).toISOString();
      const cloudStory = {
        ...makeStory('local_only_edit'),
        title: 'Shared title',
        updatedAt: baseTime,
      };
      const localStory = {
        ...cloudStory,
        title: 'Changed on the phone',
        updatedAt: new Date().toISOString(),
      };
      await localAdapter.saveStory(localStory);
      cloudAdapter.getStories = vi.fn().mockResolvedValue([cloudStory]);
      cloudAdapter.saveStory = vi.fn().mockResolvedValue(undefined);
      (manager as any).knownCloudRevisions = {
        'test-user': { [localStory.id]: baseTime },
      };
      (manager as any).isCloudAvailable = true;
      const onConflict = vi.fn();
      manager.onConflict(onConflict);

      await manager.performSync();

      expect(onConflict).not.toHaveBeenCalled();
      expect(cloudAdapter.saveStory).toHaveBeenCalledWith(
        expect.objectContaining({
          id: localStory.id,
          title: 'Changed on the phone',
        }),
      );
    });

    it('re-reads and surfaces a conflict when another device wins after the snapshot', async () => {
      const localAdapter = (manager as any).localAdapter;
      const cloudAdapter = (manager as any).cloudAdapter;
      const baseTime = new Date(Date.now() - 120_000).toISOString();
      const initialCloud = {
        ...makeStory('transaction_race'),
        title: 'Shared title',
        updatedAt: baseTime,
        syncRevision: 'shared-base',
      };
      const localStory = {
        ...initialCloud,
        title: 'Phone edit',
        updatedAt: new Date(Date.now() - 60_000).toISOString(),
      };
      const winningCloud = {
        ...initialCloud,
        title: 'Tablet edit',
        updatedAt: new Date().toISOString(),
        syncRevision: 'tablet-won',
      };
      const revisionChanged = Object.assign(
        new Error('cloud changed after snapshot'),
        { code: 'sync/revision-changed' },
      );
      await localAdapter.saveStory(localStory);
      cloudAdapter.getStories = vi
        .fn()
        .mockResolvedValueOnce([initialCloud])
        .mockResolvedValueOnce([winningCloud]);
      cloudAdapter.saveStory = vi.fn();
      cloudAdapter.saveStoryIfUnchanged = vi
        .fn()
        .mockRejectedValueOnce(revisionChanged);
      (manager as any).knownCloudRevisions = {
        'test-user': { [localStory.id]: baseTime },
      };
      (manager as any).isCloudAvailable = true;
      const onConflict = vi.fn();
      manager.onConflict(onConflict);

      await manager.performSync();

      expect(cloudAdapter.getStories).toHaveBeenCalledTimes(2);
      expect(cloudAdapter.saveStoryIfUnchanged).toHaveBeenCalledTimes(1);
      expect(cloudAdapter.saveStory).not.toHaveBeenCalled();
      expect(onConflict).toHaveBeenCalledWith(
        expect.objectContaining({
          storyId: localStory.id,
          localStory: expect.objectContaining({ title: 'Phone edit' }),
          cloudStory: expect.objectContaining({ title: 'Tablet edit' }),
        }),
      );
      await expect(localAdapter.getStory(localStory.id)).resolves.toEqual(
        expect.objectContaining({ title: 'Phone edit' }),
      );
    });

    it('still reports a conflict when both copies changed after the previous resolution', async () => {
      const localAdapter = (manager as any).localAdapter;
      const cloudAdapter = (manager as any).cloudAdapter;
      const resolvedAt = new Date(Date.now() - 1000 * 60 * 10).toISOString();
      const localStory = {
        ...makeStory('diverged_story'),
        title: 'Edited locally',
        updatedAt: new Date(Date.now() - 1000 * 60).toISOString(),
        conflictResolvedAt: resolvedAt,
      };
      const cloudStory = {
        ...localStory,
        title: 'Edited in cloud',
        updatedAt: new Date().toISOString(),
      };
      await localAdapter.saveStory(localStory);
      cloudAdapter.getStories = vi.fn().mockResolvedValue([cloudStory]);
      (manager as any).isCloudAvailable = true;
      const onConflict = vi.fn();
      manager.onConflict(onConflict);

      await manager.performSync();

      expect(onConflict).toHaveBeenCalledTimes(1);
      expect(onConflict).toHaveBeenCalledWith(
        expect.objectContaining({ storyId: 'diverged_story' }),
      );
    });

    it('does not synchronize chapter bodies while their story conflict is unresolved', async () => {
      const localAdapter = (manager as any).localAdapter;
      const cloudAdapter = (manager as any).cloudAdapter;
      const localStory = {
        ...makeStory('blocked_chapters'),
        title: 'Phone edit',
        arcs: [{
          title: 'Arc',
          isCompleted: false,
          chapters: [{ number: 1, title: 'One', premise: '', status: 'read', hasContent: true }],
        }],
      };
      const cloudStory = {
        ...localStory,
        title: 'Laptop edit',
        updatedAt: new Date(Date.now() + 1_000).toISOString(),
      };
      await localAdapter.saveStory(localStory);
      cloudAdapter.getStories = vi.fn().mockResolvedValue([cloudStory]);
      cloudAdapter.getChapterContent = vi.fn();
      (manager as any).isCloudAvailable = true;

      await manager.performSync();

      expect(cloudAdapter.getChapterContent).not.toHaveBeenCalled();
    });

    it('downloads cloud-only stories even when an unrelated local upload fails', async () => {
      const localAdapter = (manager as any).localAdapter;
      const cloudAdapter = (manager as any).cloudAdapter;
      const localOnly = makeStory('local_only');
      const cloudOnly = makeStory('cloud_only');
      await localAdapter.saveStory(localOnly);
      cloudAdapter.getStories = vi.fn().mockResolvedValue([cloudOnly]);
      cloudAdapter.saveStory = vi.fn().mockRejectedValue(new Error('invalid local payload'));
      (manager as any).isCloudAvailable = true;

      await manager.performSync();

      await expect(localAdapter.getStory('cloud_only')).resolves.toEqual(cloudOnly);
      expect(cloudAdapter.saveStory).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'local_only' }),
      );
    });

    it('automatically hydrates cloud chapter content on a new device', async () => {
      const localAdapter = (manager as any).localAdapter;
      const cloudAdapter = (manager as any).cloudAdapter;
      const cloudStory = {
        ...makeStory('chapter_download'),
        arcs: [{
          title: 'Arc',
          isCompleted: false,
          chapters: [{
            number: 1,
            title: 'Chapter 1',
            premise: 'Begin',
            status: 'read',
            hasContent: true,
          }],
        }],
      };
      const cloudChapter: ChapterContent = {
        storyId: cloudStory.id,
        chapterNumber: 1,
        generatedContent: 'Recovered from the shared cloud.',
        updatedAt: new Date().toISOString(),
      };
      cloudAdapter.getStories = vi.fn().mockResolvedValue([cloudStory]);
      cloudAdapter.getChapterContent = vi.fn().mockResolvedValue(cloudChapter);
      (manager as any).isCloudAvailable = true;

      await manager.performSync();

      await expect(
        localAdapter.getChapterContent(cloudStory.id, 1),
      ).resolves.toEqual(cloudChapter);
    });

    it('repairs a cloud-missing chapter from the surviving local copy', async () => {
      const localAdapter = (manager as any).localAdapter;
      const cloudAdapter = (manager as any).cloudAdapter;
      const story = {
        ...makeStory('chapter_upload'),
        arcs: [{
          title: 'Arc',
          isCompleted: false,
          chapters: [{
            number: 1,
            title: 'Chapter 1',
            premise: 'Begin',
            status: 'read',
            hasContent: true,
          }],
        }],
      };
      const localChapter: ChapterContent = {
        storyId: story.id,
        chapterNumber: 1,
        generatedContent: 'Only this device still has me.',
        updatedAt: new Date().toISOString(),
      };
      await localAdapter.saveStory(story);
      await localAdapter.saveChapterContent(localChapter);
      cloudAdapter.getStories = vi.fn().mockResolvedValue([story]);
      cloudAdapter.getStory = vi.fn().mockResolvedValue(story);
      cloudAdapter.getChapterContent = vi.fn().mockResolvedValue(null);
      cloudAdapter.saveChapterContent = vi.fn().mockResolvedValue(undefined);
      cloudAdapter.saveStory = vi.fn().mockResolvedValue(undefined);
      (manager as any).isCloudAvailable = true;

      await manager.performSync();

      expect(cloudAdapter.saveChapterContent).toHaveBeenCalledWith(
        expect.objectContaining(localChapter),
      );
      expect(cloudAdapter.saveStory).toHaveBeenCalledTimes(1);
      expect(cloudAdapter.saveStory.mock.invocationCallOrder[0]).toBeGreaterThan(
        cloudAdapter.saveChapterContent.mock.invocationCallOrder[0],
      );
      expect((manager as any).syncQueue).toEqual([]);
    });

    it('surfaces an actionable conflict for same-timestamp chapter revisions', async () => {
      const localAdapter = (manager as any).localAdapter;
      const cloudAdapter = (manager as any).cloudAdapter;
      const sharedTime = new Date(Date.now() - 10_000).toISOString();
      const story = {
        ...makeStory('chapter_revision_conflict'),
        userId: 'test-user',
        arcs: [{
          title: 'Arc',
          isCompleted: false,
          chapters: [{
            number: 1,
            title: 'One',
            premise: '',
            status: 'read',
            hasContent: true,
          }],
        }],
      };
      const localChapter: ChapterContent = {
        storyId: story.id,
        chapterNumber: 1,
        generatedContent: 'Phone prose',
        updatedAt: sharedTime,
        syncRevision: 'phone-revision',
      };
      const cloudChapter: ChapterContent = {
        ...localChapter,
        generatedContent: 'Tablet prose',
        syncRevision: 'tablet-revision',
      };
      await localAdapter.saveStory(story);
      await localAdapter.saveChapterContent(localChapter);
      (manager as any).enqueueTask({
        type: 'chapter',
        storyId: story.id,
        chapterNumber: 1,
        timestamp: new Date(sharedTime).getTime() + 1,
        userId: 'test-user',
      });
      cloudAdapter.getStories = vi.fn().mockResolvedValue([story]);
      cloudAdapter.getChapterContent = vi.fn().mockResolvedValue(cloudChapter);
      cloudAdapter.saveChapterContent = vi.fn();
      cloudAdapter.saveChapterContentIfUnchanged = vi.fn();
      (manager as any).isCloudAvailable = true;
      const onConflict = vi.fn();
      manager.onConflict(onConflict);

      await manager.performSync();

      expect(onConflict).toHaveBeenCalledWith(
        expect.objectContaining({
          storyId: story.id,
          chapterConflict: expect.objectContaining({
            chapterNumber: 1,
            localContent: expect.objectContaining({ generatedContent: 'Phone prose' }),
            cloudContent: expect.objectContaining({ generatedContent: 'Tablet prose' }),
          }),
        }),
      );
      expect(cloudAdapter.saveChapterContentIfUnchanged).not.toHaveBeenCalled();
      expect((manager as any).syncQueue).toEqual([
        expect.objectContaining({ type: 'chapter', storyId: story.id }),
      ]);
    });

    it('publishes a final story heartbeat after its changed chapter body', async () => {
      const localAdapter = (manager as any).localAdapter;
      const cloudAdapter = (manager as any).cloudAdapter;
      const baseTimestamp = new Date(Date.now() - 60_000).toISOString();
      const story = {
        ...makeStory('chapter_heartbeat'),
        userId: 'test-user',
        updatedAt: baseTimestamp,
        arcs: [{
          title: 'Arc',
          isCompleted: false,
          chapters: [{ number: 1, title: 'One', premise: '', status: 'read', hasContent: true }],
        }],
      };
      await localAdapter.saveStory(story);
      cloudAdapter.getStories = vi.fn().mockResolvedValue([story]);
      cloudAdapter.getChapterContent = vi.fn().mockResolvedValue(null);
      cloudAdapter.saveChapterContent = vi.fn().mockResolvedValue(undefined);
      cloudAdapter.saveStory = vi.fn().mockResolvedValue(undefined);
      (manager as any).knownCloudRevisions = {
        'test-user': { [story.id]: baseTimestamp },
      };
      (manager as any).isCloudAvailable = true;

      await manager.saveChapterContent({
        storyId: story.id,
        chapterNumber: 1,
        generatedContent: 'Written on this device.',
      });
      const heartbeat = await localAdapter.getStory(story.id);
      expect(new Date(heartbeat.updatedAt).getTime()).toBeGreaterThan(
        new Date(baseTimestamp).getTime(),
      );

      await manager.performSync();

      expect(cloudAdapter.saveChapterContent).toHaveBeenCalledTimes(1);
      expect(cloudAdapter.saveStory).toHaveBeenCalledTimes(1);
      const chapterWriteOrder = cloudAdapter.saveChapterContent.mock.invocationCallOrder[0];
      const finalHeartbeatOrder = cloudAdapter.saveStory.mock.invocationCallOrder.at(-1)!;
      expect(finalHeartbeatOrder).toBeGreaterThan(chapterWriteOrder);
    });

    it('publishes a second parent heartbeat after a brand-new chapter body', async () => {
      const cloudAdapter = (manager as any).cloudAdapter;
      let cloudStory: StoryWorld | null = null;
      let cloudChapter: ChapterContent | null = null;
      const writeOrder: string[] = [];
      cloudAdapter.getStories = vi.fn(async () =>
        cloudStory ? [JSON.parse(JSON.stringify(cloudStory))] : [],
      );
      cloudAdapter.getStory = vi.fn(async () =>
        cloudStory ? JSON.parse(JSON.stringify(cloudStory)) : null,
      );
      cloudAdapter.getChapterContent = vi.fn(async () =>
        cloudChapter ? JSON.parse(JSON.stringify(cloudChapter)) : null,
      );
      cloudAdapter.saveStory = vi.fn(async (story: StoryWorld) => {
        cloudStory = JSON.parse(JSON.stringify(story));
        writeOrder.push('story');
      });
      cloudAdapter.saveChapterContent = vi.fn(async (content: ChapterContent) => {
        cloudChapter = JSON.parse(JSON.stringify(content));
        writeOrder.push('chapter');
      });
      (manager as any).isCloudAvailable = true;

      await manager.saveStory({
        ...makeStory('new_story_with_chapter'),
        userId: 'test-user',
        arcs: [{
          title: 'Arc',
          isCompleted: false,
          chapters: [{
            number: 1,
            title: 'One',
            premise: '',
            status: 'read',
            generatedContent: 'The first body must arrive before the signal.',
            _isNewContent: true,
          }],
        }],
      });

      await manager.performSync();

      expect(writeOrder).toEqual(['story', 'chapter', 'story']);
      expect(cloudAdapter.saveStory).toHaveBeenCalledTimes(2);
      const firstParent = cloudAdapter.saveStory.mock.calls[0][0];
      const finalParent = cloudAdapter.saveStory.mock.calls[1][0];
      expect(new Date(finalParent.updatedAt).getTime()).toBeGreaterThan(
        new Date(firstParent.updatedAt).getTime(),
      );
      expect(finalParent.syncRevision).not.toBe(firstParent.syncRevision);
      expect(cloudChapter?.generatedContent).toBe(
        'The first body must arrive before the signal.',
      );
      expect((manager as any).syncQueue).toEqual([]);
    });

    it('does not queue an identifier-only chapter task when local persistence fails', async () => {
      const localAdapter = (manager as any).localAdapter;
      const story = { ...makeStory('chapter_local_failure'), userId: 'test-user' };
      await localAdapter.saveStory(story);
      vi.spyOn(localAdapter, 'saveChapterContent').mockRejectedValueOnce(
        new Error('chapter quota exhausted'),
      );

      await expect(
        manager.saveChapterContent({
          storyId: story.id,
          chapterNumber: 1,
          generatedContent: 'Must remain in the caller.',
        }),
      ).rejects.toThrow('chapter quota exhausted');
      expect((manager as any).syncQueue).toEqual([]);
    });

    it('keeps hasContent intact when cloud chapter recovery fails', async () => {
      const localAdapter = (manager as any).localAdapter;
      const cloudAdapter = (manager as any).cloudAdapter;
      const story = {
        ...makeStory('chapter_retry'),
        arcs: [{
          title: 'Arc',
          isCompleted: false,
          chapters: [{
            number: 1,
            title: 'Chapter 1',
            premise: 'Begin',
            status: 'read',
            hasContent: true,
          }],
        }],
      };
      cloudAdapter.getStories = vi.fn().mockResolvedValue([story]);
      cloudAdapter.getChapterContent = vi.fn().mockRejectedValue(new Error('network unavailable'));
      (manager as any).isCloudAvailable = true;

      await manager.performSync();

      const savedStory = await localAdapter.getStory(story.id);
      expect(savedStory?.arcs[0].chapters[0].hasContent).toBe(true);
    });

    it('propagates a deletion tombstone so a stale device cannot resurrect the story', async () => {
      const localAdapter = (manager as any).localAdapter;
      const cloudAdapter = (manager as any).cloudAdapter;
      const story = {
        ...makeStory('deleted_elsewhere'),
        updatedAt: new Date(Date.now() - 1000 * 60).toISOString(),
      };
      await localAdapter.saveStory(story);
      cloudAdapter.getStories = vi.fn().mockResolvedValue([story]);
      cloudAdapter.saveStory = vi.fn().mockResolvedValue(undefined);
      cloudAdapter.deleteStory = vi.fn().mockResolvedValue(undefined);

      await manager.deleteStory(story.id);
      (manager as any).isCloudAvailable = true;
      await manager.performSync();

      expect(cloudAdapter.deleteStory).toHaveBeenCalledWith(story.id);
      await expect(localAdapter.getStory(story.id)).resolves.toEqual(
        expect.objectContaining({ id: story.id, deleted: true }),
      );
      await expect(manager.getStories()).resolves.toEqual([]);
    });

    it('treats a cloud tombstone as authoritative even if stale local metadata is newer', async () => {
      const localAdapter = (manager as any).localAdapter;
      const cloudAdapter = (manager as any).cloudAdapter;
      const localStory = {
        ...makeStory('deleted_on_tablet'),
        updatedAt: new Date(Date.now() + 60_000).toISOString(),
      };
      const cloudTombstone = {
        ...makeStory(localStory.id),
        deleted: true,
        updatedAt: new Date(Date.now() - 60_000).toISOString(),
      };
      await localAdapter.saveStory(localStory);
      cloudAdapter.getStories = vi.fn().mockResolvedValue([cloudTombstone]);
      cloudAdapter.saveStory = vi.fn();
      (manager as any).isCloudAvailable = true;

      await manager.performSync();

      await expect(localAdapter.getStory(localStory.id)).resolves.toEqual(
        expect.objectContaining({ deleted: true }),
      );
      expect(cloudAdapter.saveStory).not.toHaveBeenCalled();
      await expect(manager.getStories()).resolves.toEqual([]);
    });

    it('cancels stale chapter work and cleans its cache when a cloud tombstone wins', async () => {
      const localAdapter = (manager as any).localAdapter;
      const cloudAdapter = (manager as any).cloudAdapter;
      const story = {
        ...makeStory('delete_beats_pending_chapter'),
        userId: 'test-user',
        arcs: [{
          title: 'Arc',
          isCompleted: false,
          chapters: [{ number: 1, title: 'One', premise: '', status: 'read', hasContent: true }],
        }],
      };
      await localAdapter.saveStory(story);
      await manager.saveChapterContent({
        storyId: story.id,
        chapterNumber: 1,
        generatedContent: 'This stale edit must not return.',
      });
      const cloudTombstone = {
        ...story,
        deleted: true,
        updatedAt: new Date(Date.now() + 60_000).toISOString(),
      };
      cloudAdapter.getStories = vi.fn().mockResolvedValue([cloudTombstone]);
      cloudAdapter.saveChapterContent = vi.fn().mockResolvedValue(undefined);
      cloudAdapter.deleteStory = vi.fn().mockResolvedValue(undefined);
      (manager as any).isCloudAvailable = true;

      await manager.performSync();

      expect(cloudAdapter.saveChapterContent).not.toHaveBeenCalled();
      expect(cloudAdapter.deleteStory).toHaveBeenCalledWith(story.id);
      await expect(localAdapter.getChapterContent(story.id, 1)).resolves.toBeNull();
      expect((manager as any).syncQueue).toEqual([]);
    });

    it('keeps one account from seeing or uploading another account local stories', async () => {
      const cloudAdapter = (manager as any).cloudAdapter;
      let currentUserId = 'account-a';
      (manager as any).getCurrentUserId = () => currentUserId;
      cloudAdapter.getStories = vi.fn().mockResolvedValue([]);
      cloudAdapter.saveStory = vi.fn().mockResolvedValue(undefined);
      (manager as any).isCloudAvailable = true;

      await manager.saveStory(makeStory('account_a_story'));
      currentUserId = 'account-b';
      (manager as any).localAccountScope = 'account-b';

      await expect(manager.getStories()).resolves.toEqual([]);
      await manager.performSync();
      expect(cloudAdapter.saveStory).not.toHaveBeenCalled();
      expect((manager as any).syncQueue).toEqual([
        expect.objectContaining({ userId: 'account-a' }),
      ]);

      currentUserId = 'account-a';
      (manager as any).localAccountScope = 'account-a';
      await manager.performSync();
      expect(cloudAdapter.saveStory).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'account_a_story', userId: 'account-a' }),
      );
    });

    it('aborts a cloud write if the authenticated account changes mid-pass', async () => {
      const localAdapter = (manager as any).localAdapter;
      const cloudAdapter = (manager as any).cloudAdapter;
      let currentUserId = 'account-a';
      (manager as any).getCurrentUserId = () => currentUserId;
      (manager as any).localAccountScope = 'account-a';
      const story = { ...makeStory('switch_during_sync'), userId: 'account-a' };
      await localAdapter.saveStory(story);
      let releaseCloudRead!: (stories: StoryWorld[]) => void;
      cloudAdapter.getStories = vi.fn().mockReturnValue(
        new Promise<StoryWorld[]>((resolve) => {
          releaseCloudRead = resolve;
        }),
      );
      cloudAdapter.saveStory = vi.fn().mockResolvedValue(undefined);
      (manager as any).isCloudAvailable = true;

      const syncing = manager.performSync();
      await vi.waitFor(() => expect(cloudAdapter.getStories).toHaveBeenCalled());
      currentUserId = 'account-b';
      releaseCloudRead([]);
      await syncing;

      expect(cloudAdapter.saveStory).not.toHaveBeenCalled();
    });

    it('keeps the story owner on signed-out chapter and deletion outbox tasks', async () => {
      const localAdapter = (manager as any).localAdapter;
      (manager as any).getCurrentUserId = () => undefined;
      const story = {
        ...makeStory('signed_out_edit'),
        userId: 'account-a',
        arcs: [{
          title: 'Arc',
          isCompleted: false,
          chapters: [{ number: 1, title: 'One', premise: '', status: 'read', hasContent: true }],
        }],
      };
      await localAdapter.saveStory(story);

      await manager.saveChapterContent({
        storyId: story.id,
        chapterNumber: 1,
        generatedContent: 'Edited while signed out',
      });
      expect((manager as any).syncQueue).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'chapter', userId: 'account-a' }),
          expect.objectContaining({ type: 'story', userId: 'account-a' }),
        ]),
      );

      await manager.deleteStory(story.id);
      expect((manager as any).syncQueue).toEqual([
        expect.objectContaining({ type: 'delete_story', userId: 'account-a' }),
      ]);
      await expect(localAdapter.getChapterContent(story.id, 1)).resolves.toBeNull();
    });
  });
});
