import { StateCreator } from 'zustand';
import { Story, Chapter, ChapterContent, DraftRecoverySession, AppUser, StoryUpdateOptions } from '../types';
import { storyStorage } from '../lib/storage';
import { AppState } from './useAppStore';
import { auth, LOCAL_ONLY_MODE } from '../lib/firebase';
import { secureStorage } from '../lib/encryption';
import { mergeStories } from '../lib/merge';
import { ensureStoryPersistenceIdentities } from '../lib/persistence';
import { normalizeStoryImageOwnership } from '../lib/media/imageOwnership';
import { hasDemoMatrixIdPrefix, hasHubStoryIdPrefix } from '../lib/hubStories';

const STORAGE_KEY = '@seihouse/fiction-generator-stories-v2';
let storageInitVersion = 0;
const isObsoleteDefaultStory = (story: Story): boolean => {
  // Deliberately the prefix form, not `isHubStory`: this selects rows for
  // deletion, so it must never widen to reader-authored worlds.
  if (!hasHubStoryIdPrefix(story) || story.isEdited || story.currentChapterNumber > 1) return false;
  if ((story.lastReadChapter ?? 0) > 0 || (story.bookmarks?.length ?? 0) > 0) return false;
  return !story.arcs.some(arc => arc.chapters.some(chapter =>
    chapter.hasContent ||
    Boolean(chapter.generatedContent) ||
    chapter.status === 'read',
  ));
};

const nextResolutionCheckpoint = (...timestamps: Array<string | undefined>): string => {
  const latest = timestamps.reduce((maximum, timestamp) => {
    const parsed = timestamp ? new Date(timestamp).getTime() : Number.NaN;
    return Number.isFinite(parsed) ? Math.max(maximum, parsed) : maximum;
  }, Date.now());
  return new Date(latest + 1).toISOString();
};

export interface StorySlice {
  stories: Story[];
  activeStoryId: string | null;
  storyToDelete: string | null;
  draftRecoverySession: DraftRecoverySession | null;
  appError: string | null;
  storageType: string;
  lastSavedTime: Date | null;

  setStories: (stories: Story[]) => void;
  setActiveStoryId: (id: string | null) => void;
  /** Replace a catalog summary with the full story graph before it is read. */
  hydrateStory: (storyId: string) => Promise<void>;
  setStoryToDelete: (id: string | null) => void;
  setDraftRecoverySession: (session: DraftRecoverySession | null) => void;
  setAppError: (error: string | null) => void;
  setStorageType: (type: string) => void;
  setLastSavedTime: (time: Date | null) => void;

  /**
   * Persist a new stories array, or the result of applying `updated` to
   * whatever stories array is current once this call reaches the front of
   * the save queue.
   *
   * The functional form is what makes `updateStory`/`updateChapter` safe
   * under concurrent callers: it defers reading `stories` until this call's
   * turn, so it always computes its patch against the fully-committed
   * result of every save already queued ahead of it, never a stale snapshot
   * taken before those saves landed.
   */
  saveStories: (updated: Story[] | ((current: Story[]) => Story[])) => Promise<void>;
  /**
   * The authoritative way to patch a story. Marks `isEdited` by default
   * (matching every existing caller); pass `markEdited: false` for mutations
   * — like a manual memory edit — that should not count as the reader having
   * edited the story. Pass `touchUpdatedAt: true` to stamp `updatedAt` with
   * the current time; omitted updates never get one for free.
   */
  updateStory: (
    storyId: string,
    updates: Partial<Story> | ((current: Story) => Partial<Story>),
    options?: StoryUpdateOptions,
  ) => Promise<void>;
  /**
   * The authoritative way to patch one chapter. `updates` may be a fixed
   * patch, or a function of the chapter's value *at the moment this call is
   * actually applied* — the only safe way to compute a value (like a status
   * toggle) that depends on the chapter's current state, since two rapid
   * calls are serialized through `saveStories` and each sees the previous
   * call's committed result rather than racing on the same stale read.
   * Stamps the story's `updatedAt` whenever `storyId` matches, independent
   * of whether `chapterNumber` did.
   */
  updateChapter: (
    storyId: string,
    chapterNumber: number,
    updates: Partial<Chapter> | ((chapter: Chapter) => Partial<Chapter>),
  ) => Promise<void>;
  confirmDeleteStory: () => void;
  cancelDeleteStory: () => void;
  handleExportLibrary: () => Promise<void>;
  handleImportLibrary: (e: any) => void;
  initStorage: () => Promise<void>;
  migrateOrDiscardDemoStories: (user: AppUser | null) => Promise<void>;
  activeConflict: StorySyncConflict | null;
  setActiveConflict: (conflict: StorySyncConflict | null) => void;
  resolveConflict: (resolution: 'local' | 'cloud' | 'merge') => Promise<void>;
}

export interface StorySyncConflict {
  storyId: string;
  localStory: Story;
  cloudStory: Story;
  chapterConflict?: {
    chapterNumber: number;
    localContent: ChapterContent;
    cloudContent: ChapterContent;
  };
}

export const createStorySlice: StateCreator<AppState, [], [], StorySlice> = (set, get) => {
  // saveStories() must not let two calls interleave: each call snapshots
  // `get().stories`, does async storage work, then commits the result back
  // to state. Without serialization, a second call can snapshot state
  // before the first call's commit lands, silently losing the first
  // call's changes (or interleaving storyStorage's single shared
  // transaction). Every call is chained onto this tail so call N only
  // starts once call N-1 has fully settled, success or failure.
  let saveQueueTail: Promise<void> = Promise.resolve();

  const performSaveStories = async (
    updated: Story[],
    expectedUid: string | undefined,
  ): Promise<void> => {
    if (!LOCAL_ONLY_MODE) {
      const foreignStory = updated.find(
        story => story.userId && story.userId !== expectedUid,
      );
      if (foreignStory) {
        throw new Error(
          `Cannot publish story ${foreignStory.id} while a different account is active`,
        );
      }
    }
    const currentStories = get().stories;
    const activeId = get().activeStoryId;
    const markedStories = updated.map(inputStory => {
      const s = normalizeStoryImageOwnership(
        ensureStoryPersistenceIdentities(inputStory),
      );
      if (hasDemoMatrixIdPrefix(s) && s.id === activeId) {
        return { ...s, isEdited: true };
      }
      return s;
    });

    // Find which stories actually changed to avoid massive redundant writes
    const changedStories = markedStories.filter(newStory => {
       const oldStory = currentStories.find(s => s.id === newStory.id);
       if (!oldStory) return true;
       return JSON.stringify(oldStory) !== JSON.stringify(newStory);
    });

    if (changedStories.length === 0) {
      set({ stories: markedStories }); // update state just in case reference changed
      return;
    }

    const toSave = changedStories;

    // Generation status (chapter.hasContent, "generated" flags, etc.) lives on
    // `markedStories` and must not become visible to the reader/Living Codex
    // until it is durably written — commit to state only after the storage
    // transaction succeeds, not optimistically beforehand.
    try {
      storyStorage.startTransaction();
      // Do not roll back while another concurrent write is still using this
      // transaction. Promise.all rejects on the first failure, while the
      // remaining writes continue in the background.
      const results = await Promise.allSettled(
        toSave.map(s => storyStorage.saveStory(s)),
      );
      const failedSave = results.find(
        (result): result is PromiseRejectedResult => result.status === 'rejected',
      );
      if (failedSave) {
        throw failedSave.reason;
      }
      await storyStorage.commitTransaction();
      if (!LOCAL_ONLY_MODE && auth.currentUser?.uid !== expectedUid) {
        set({ stories: [], activeStoryId: null });
        throw new Error('Active account changed while saving the story library');
      }
      set({ stories: markedStories, lastSavedTime: new Date() });
    } catch (e) {
      storyStorage.rollbackTransaction();
      if (!LOCAL_ONLY_MODE && auth.currentUser?.uid !== expectedUid) {
        set({ stories: [], activeStoryId: null });
        throw e;
      }
      console.error("Celestial local disk write breached:", e);
      // The raw localStorage backstop below is only ever read back in
      // device-only mode (initializeApp's fallback). In cloud mode it must
      // never run: STORAGE_KEY is the legacy *unowned* store, so writing the
      // signed-in account's library there would let the adapter migration
      // resurrect stale copies and let a different account later claim them.
      // The durable outbox is the cloud-mode safety net.
      if (!LOCAL_ONLY_MODE) throw e;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(markedStories));
      } catch (storageError) {
        console.warn("Standard storage cache quota exceeded:", storageError);
        // Attempt a stripped version to save minimal data
        try {
          const stripped = markedStories.map(s => {
            const copy = JSON.parse(JSON.stringify(s));
            const stripHistoryUrls = (history: unknown) => {
              if (!Array.isArray(history)) return history;
              return history.map((image) => {
                if (!image || typeof image !== 'object') return image;
                const { imageUrl: _imageUrl, ...strippedImage } = image;
                return strippedImage;
              });
            };
            delete copy.imageUrl;
            copy.imageHistory = stripHistoryUrls(copy.imageHistory);
            if (copy.memory) {
              if (copy.memory.characters) copy.memory.characters.forEach((c: any) => {
                delete c.imageUrl;
                c.imageHistory = stripHistoryUrls(c.imageHistory);
              });
              if (copy.memory.locations) copy.memory.locations.forEach((l: any) => {
                delete l.imageUrl;
                l.imageHistory = stripHistoryUrls(l.imageHistory);
              });
              if (copy.memory.artifacts) copy.memory.artifacts.forEach((a: any) => {
                delete a.imageUrl;
                a.imageHistory = stripHistoryUrls(a.imageHistory);
              });
              if (copy.memory.factions) copy.memory.factions.forEach((f: any) => {
                delete f.imageUrl;
                f.imageHistory = stripHistoryUrls(f.imageHistory);
              });
            }
            if (copy.arcs) {
              copy.arcs.forEach((arc: any) => {
                if (arc.chapters) {
                  arc.chapters.forEach((ch: any) => {
                    if (ch.assetManifest) delete ch.assetManifest.heroImage;
                    ch.imageHistory = stripHistoryUrls(ch.imageHistory);
                  });
                }
              });
            }
            return copy;
          });
          localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped));
        } catch (stripError) {
           console.error("Even stripped stories exceeded quota.", stripError);
        }
      }
      // The local-storage copy above is a data-loss backstop only, not a
      // success path: callers (chapter generation, blueprint/seed saves,
      // image jobs) must see this failure so they don't report content as
      // generated when it was never durably persisted.
      throw e;
    }
  };

  return {
  stories: [],
  activeStoryId: null,
  storyToDelete: null,
  draftRecoverySession: null,
  appError: null,
  storageType: 'Initializing...',
  lastSavedTime: null,

  setStories: (stories) => set({
    stories: stories.map(normalizeStoryImageOwnership),
  }),
  setActiveStoryId: (id) => {
    // A half-streamed chapter belongs to the story that was active when the
    // run started. `streamingChapter` is keyed only by chapter number, so
    // carrying it across a story change would let story A's partial prose
    // render inside story B's reader wherever the numbers happen to collide.
    // Re-selecting the story that is already active is not a change and must
    // leave a live run's payload alone.
    if (id !== get().activeStoryId) get().resetGenerationRuntime();
    set({ activeStoryId: id });
    if (id) void get().hydrateStory(id);
  },

  /**
   * Upgrade a catalog summary to the full story before it is read.
   *
   * listStories() returns compact summaries — no arcs, no Codex entities — and
   * nothing else in the UI ever asked for the full record, so a story restored
   * on a new device stayed empty: no chapters, no codex, no highlighting. The
   * storage manager already fetches and caches the full graph on demand; this
   * is the caller it was missing.
   */
  hydrateStory: async (storyId: string) => {
    const existing = get().stories.find(story => story.id === storyId);
    if (!existing || existing.persistenceHydration !== 'summary') return;
    const expectedUid = auth.currentUser?.uid;
    try {
      const hydrated = await storyStorage.getStory(storyId);
      if (!hydrated || hydrated.persistenceHydration === 'summary') return;
      if (!LOCAL_ONLY_MODE && auth.currentUser?.uid !== expectedUid) return;
      set({
        // Re-check the hydration state inside the map, not before the await: a
        // completed generation or a background sync may have replaced the
        // summary while this read was in flight, and that copy is newer than
        // the one being applied here.
        stories: get().stories.map(story =>
          story.id === storyId && story.persistenceHydration === 'summary'
            ? normalizeStoryImageOwnership({ ...story, ...hydrated })
            : story,
        ),
      });
    } catch (error) {
      // The summary still renders; hydration retries the next time it is opened.
      console.error('Failed to hydrate the full story record:', error);
    }
  },
  setStoryToDelete: (id) => set({ storyToDelete: id }),
  setDraftRecoverySession: (session) => set({ draftRecoverySession: session }),
  setAppError: (appError) => set({ appError }),
  setStorageType: (storageType) => set({ storageType }),
  setLastSavedTime: (lastSavedTime) => set({ lastSavedTime }),
  activeConflict: null,
  setActiveConflict: (activeConflict) => {
    if (activeConflict && !LOCAL_ONLY_MODE) {
      const currentUid = auth.currentUser?.uid;
      const owners = [
        activeConflict.localStory.userId,
        activeConflict.cloudStory.userId,
      ].filter((owner): owner is string => Boolean(owner));
      if (owners.some((owner) => owner !== currentUid)) return;
    }
    set({ activeConflict });
  },
  resolveConflict: async (resolution: 'local' | 'cloud' | 'merge') => {
    const conflict = get().activeConflict;
    if (!conflict) return;
    const expectedUid = auth.currentUser?.uid;
    const accountIsCurrent = () =>
      LOCAL_ONLY_MODE || auth.currentUser?.uid === expectedUid;

    if (!LOCAL_ONLY_MODE) {
      const owners = [
        conflict.localStory.userId,
        conflict.cloudStory.userId,
      ].filter((owner): owner is string => Boolean(owner));
      if (owners.some((owner) => owner !== expectedUid)) {
        set({ activeConflict: null });
        return;
      }
    }

    const { storyId, localStory, cloudStory } = conflict;
    const { setStories } = get();

    try {
      // Clear the active conflict first to avoid re-triggering the check
      set({ activeConflict: null });

      if (conflict.chapterConflict) {
        if (resolution === 'merge') {
          throw new Error('Chapter prose cannot be merged automatically; choose local or cloud');
        }
        const chosenContent = resolution === 'cloud'
          ? conflict.chapterConflict.cloudContent
          : conflict.chapterConflict.localContent;
        const resolutionCheckpoint = nextResolutionCheckpoint(
          conflict.chapterConflict.localContent.updatedAt,
          conflict.chapterConflict.cloudContent.updatedAt,
        );
        await storyStorage.saveChapterContent({
          ...chosenContent,
          updatedAt: resolutionCheckpoint,
        });
      } else {
        const resolutionCheckpoint = nextResolutionCheckpoint(
          localStory.updatedAt,
          cloudStory.updatedAt,
        );
        let resolvedStory: Story;
        if (resolution === 'local') {
          resolvedStory = {
            ...localStory,
            updatedAt: resolutionCheckpoint,
            conflictResolvedAt: resolutionCheckpoint,
          };
        } else if (resolution === 'cloud') {
          resolvedStory = {
            ...cloudStory,
            updatedAt: resolutionCheckpoint,
            conflictResolvedAt: resolutionCheckpoint,
          };
        } else {
          // Use smart merge helper
          resolvedStory = mergeStories(localStory, cloudStory);
          resolvedStory.updatedAt = resolutionCheckpoint;
          resolvedStory.conflictResolvedAt = resolutionCheckpoint;
        }
        await storyStorage.saveStory(resolvedStory);
      }
      // The chosen record is already in the durable outbox. Seal only that
      // queued work; resolving one conflict must not audit the whole library.
      await storyStorage.performSync({ catalog: false, deep: false });

    } catch (err: any) {
      console.error("Failed to resolve sync conflict:", err);
      if (!accountIsCurrent()) return;
      // The selected version was not persisted, so keep the conflict actionable.
      set({
        activeConflict: conflict,
        appError: "Failed to resolve sync conflict: " + err.message,
      });
      return;
    }

    try {
      if (!accountIsCurrent()) return;
      // Refreshing the library is separate from persistence. If this read fails,
      // the conflict is still resolved and must not be shown again.
      const freshStories = await storyStorage.getStories();
      if (!accountIsCurrent()) return;
      setStories(freshStories);
    } catch (err: any) {
      console.error("Sync conflict resolved, but failed to refresh stories:", err);
      if (!accountIsCurrent()) return;
      set({
        appError: "Sync conflict resolved, but failed to refresh stories: " + err.message,
      });
    }
  },

  saveStories: (updated: Story[] | ((current: Story[]) => Story[])) => {
    const queuedUid = auth.currentUser?.uid;
    // Resolve a functional `updated` only once this call reaches the front
    // of the queue, not when it is enqueued — see the interface doc comment.
    const run = () => {
      // The deferred updater closes over the initiating operation's payload,
      // but reads the story library only when its queue turn begins. If the
      // account changed while it was waiting, evaluating that updater against
      // the new account's same-id story would let the stale payload inherit
      // the new story's owner and pass the foreign-story check below.
      if (!LOCAL_ONLY_MODE && auth.currentUser?.uid !== queuedUid) {
        throw new Error('Active account changed before the queued story save began');
      }
      return performSaveStories(
        typeof updated === 'function' ? updated(get().stories) : updated,
        queuedUid,
      );
    };
    // Chain onto the tail unconditionally (via .then(onFulfilled, onRejected))
    // so a prior failure never blocks later saves from running.
    const result = saveQueueTail.then(run, run);
    // The queue's own continuation must never reject, or every subsequent
    // queued save would be skipped; callers still get the real outcome
    // through `result`, returned below.
    saveQueueTail = result.then(() => undefined, () => undefined);
    return result;
  },

  updateStory: (
    storyId: string,
    updates: Partial<Story> | ((current: Story) => Partial<Story>),
    options?: StoryUpdateOptions,
  ) => {
    const markEdited = options?.markEdited !== false;
    const touchUpdatedAt = options?.touchUpdatedAt === true;
    return get().saveStories((current) => current.map(s => {
      if (s.id !== storyId) return s;
      const patch = typeof updates === 'function' ? updates(s) : updates;
      return {
        ...s,
        ...patch,
        ...(markEdited ? { isEdited: true } : {}),
        ...(touchUpdatedAt ? { updatedAt: new Date().toISOString() } : {}),
      };
    }));
  },

  updateChapter: (
    storyId: string,
    chapterNumber: number,
    updates: Partial<Chapter> | ((chapter: Chapter) => Partial<Chapter>),
  ) => get().saveStories((current) => current.map(s => {
    if (s.id !== storyId) return s;
    return {
      ...s,
      arcs: s.arcs.map(a => {
        const hasChapter = a.chapters.some(c => c.number === chapterNumber);
        if (!hasChapter) return a;
        return {
          ...a,
          chapters: a.chapters.map(c => {
            if (c.number !== chapterNumber) return c;
            const patch = typeof updates === 'function' ? updates(c) : updates;
            return { ...c, ...patch };
          })
        };
      }),
      // Matches the pre-refactor handleToggleRead: the story is stamped
      // whenever it is this mutation's target, regardless of whether
      // chapterNumber matched an actual chapter.
      updatedAt: new Date().toISOString(),
    };
  })),

  handleExportLibrary: async () => {
    const { stories, setAppError } = get();
    try {
      const exportLibrary = [];

      const fetchFunctions: (() => Promise<{ storyId: string; chapterNumber: number; content: any }>)[] = [];
      const storiesToExport = stories.map(s => JSON.parse(JSON.stringify(s)));

      for (const exportData of storiesToExport) {
        if (exportData.arcs) {
          for (const arc of exportData.arcs) {
            for (const chapter of arc.chapters) {
              if (chapter.hasContent && (!chapter.generatedContent && (!chapter.blocks || chapter.blocks.length === 0))) {
                 fetchFunctions.push(
                   () => storyStorage.getChapterContent(exportData.id, chapter.number)
                     .then(content => ({ storyId: exportData.id, chapterNumber: chapter.number, content }))
                 );
              }
            }
          }
        }
      }

      // Batch fetches to avoid transaction limits and memory spikes on large libraries
      const contents = [];
      const BATCH_SIZE = 10;
      for (let i = 0; i < fetchFunctions.length; i += BATCH_SIZE) {
        const batch = fetchFunctions.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map(fn => fn()));
        contents.push(...results);
      }

      for (const exportData of storiesToExport) {
        if (exportData.arcs) {
          for (const arc of exportData.arcs) {
            for (const chapter of arc.chapters) {
               const hydratedContent = contents.find(c => c.storyId === exportData.id && c.chapterNumber === chapter.number);
               if (hydratedContent && hydratedContent.content) {
                 const content = hydratedContent.content;
                 chapter.generatedContent = content.generatedContent;
                 chapter.blocks = content.blocks;
                 chapter.summary = content.summary;
                 chapter.statsChangeMessage = content.statsChangeMessage;
                 chapter.cuePayload = content.cuePayload;
                 chapter.contextManifest = content.contextManifest;
               }
            }
          }
        }
        exportLibrary.push(exportData);
      }

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportLibrary, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `seihouse_story_library_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err: any) {
      setAppError("Failed to package the library matrix: " + err.message);
    }
  },

  handleImportLibrary: (e: any) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const fileReader = new FileReader();
    fileReader.onload = async (event) => {
      const { stories, saveStories, setAppError } = get();
      try {
        const fileContent = event.target?.result as string;
        const parsedData = JSON.parse(fileContent);

        let mergedList = [...stories];
        let importSuccessCount = 0;

        const mergeSingleStory = (storyObj: any) => {
          if (!storyObj || !storyObj.id || !storyObj.title || !storyObj.memory) {
            throw new Error(`The provided package does not comply with the StoryWorld structural framework.`);
          }
          if (storyObj.arcs) {
             storyObj.arcs.forEach((arc: any) => {
               arc.chapters.forEach((ch: any) => {
                 if (ch.generatedContent || (ch.blocks && ch.blocks.length > 0)) {
                    ch._isNewContent = true;
                 }
               });
             });
          }
          
          const existingIdx = mergedList.findIndex(s => s.id === storyObj.id);
          if (existingIdx > -1) {
            mergedList[existingIdx] = storyObj;
          } else {
            mergedList = [storyObj, ...mergedList];
          }
          importSuccessCount++;
        };

        if (Array.isArray(parsedData)) {
          parsedData.forEach(story => mergeSingleStory(story));
        } else {
          mergeSingleStory(parsedData);
        }

        await saveStories(mergedList);
        console.log(`Successfully synchronized ${importSuccessCount} Story World memories into your local database!`);
        e.target.value = '';
      } catch (err: any) {
        setAppError("The import portal cracked. Validation failed: " + err.message);
      }
    };
    fileReader.readAsText(fileList[0]);
  },

  confirmDeleteStory: () => {
    const { storyToDelete, stories, saveStories, activeStoryId, setActiveStoryId, setCurrentScreen, setStoryToDelete } = get();
    if (storyToDelete) {
      storyStorage.deleteStory(storyToDelete).catch(console.error);
      const updated = stories.filter(s => s.id !== storyToDelete);
      saveStories(updated).catch(console.error);
      if (activeStoryId === storyToDelete) {
        setActiveStoryId(null);
        setCurrentScreen('home');
      }
      setStoryToDelete(null);
    }
  },

  cancelDeleteStory: () => set({ storyToDelete: null }),

  initStorage: async () => {
    const initVersion = ++storageInitVersion;
    const expectedUid = auth.currentUser?.uid;
    const initIsCurrent = () =>
      initVersion === storageInitVersion &&
      (LOCAL_ONLY_MODE || auth.currentUser?.uid === expectedUid);

    storyStorage.onConflict((conflict) => get().setActiveConflict(conflict));
    try {
      await storyStorage.init();
      if (!initIsCurrent()) return;
      set({ storageType: storyStorage.getActiveAdapterName() });
      
      const [gemini, openrouter, ollama, deepinfra] = await Promise.all([
        secureStorage.getItem('@seihouse/api-key-gemini'),
        secureStorage.getItem('@seihouse/api-key-openrouter'),
        secureStorage.getItem('@seihouse/api-key-ollama-host'),
        secureStorage.getItem('@seihouse/api-key-deepinfra'),
      ]);
      if (!initIsCurrent()) return;
      set({
        localGeminiKey: gemini || '',
        localOpenrouterKey: openrouter || '',
        localOllamaHost: ollama || '',
        localDeepinfraKey: deepinfra || ''
      });

      let loaded = await storyStorage.getStories();
      if (!initIsCurrent()) return;
      const obsoleteDefaults = loaded.filter(isObsoleteDefaultStory);
      if (obsoleteDefaults.length > 0) {
        storyStorage.startTransaction();
        try {
          for (const story of obsoleteDefaults) {
            await storyStorage.deleteStory(story.id);
            if (!initIsCurrent()) {
              storyStorage.rollbackTransaction();
              return;
            }
          }
          await storyStorage.commitTransaction();
          if (!initIsCurrent()) return;
        } catch (err) {
          storyStorage.rollbackTransaction();
          console.error("Failed to remove obsolete default stories during init", err);
          if (!initIsCurrent()) return;
        }
      }
      loaded = loaded.filter(story => !isObsoleteDefaultStory(story));
      if (!initIsCurrent()) return;
      set({ stories: loaded.map(normalizeStoryImageOwnership) });
    } catch (e) {
      console.error("Persistent story memory failed to initialize, reverting to local fallback:", e);
      if (!initIsCurrent()) return;
      set({ storageType: 'LocalStorage (Fallback)' });
      if (!LOCAL_ONLY_MODE) {
        // The storage manager already applies account-scoped fallbacks. Reading
        // the old global key here would bypass that boundary and could render a
        // previous account's library during an auth transition.
        set({ stories: [] });
        return;
      }
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          set({ stories: (JSON.parse(saved) as Story[]).map(normalizeStoryImageOwnership) });
        } else {
          set({ stories: [] });
        }
      } catch {
        set({ stories: [] });
      }
    }
  },

  migrateOrDiscardDemoStories: async (user: AppUser | null) => {
    if (!user) return;
    const { stories, activeStoryId, setActiveStoryId, setCurrentScreen } = get();
    const obsoleteDefaults = stories.filter(isObsoleteDefaultStory);
    if (obsoleteDefaults.length === 0) return;
    const obsoleteIds = new Set(obsoleteDefaults.map(story => story.id));
    const updatedStories = stories.filter(story => !obsoleteIds.has(story.id));
    storyStorage.startTransaction();
    try {
      for (const story of obsoleteDefaults) {
        await storyStorage.deleteStory(story.id);
      }
      if (activeStoryId && obsoleteIds.has(activeStoryId)) {
        setActiveStoryId(null);
        setCurrentScreen('home');
      }
      await storyStorage.commitTransaction();
      set({ stories: updatedStories });
    } catch (e) {
      storyStorage.rollbackTransaction();
      console.error("Obsolete default story cleanup failed:", e);
    }
  }
  };
};
