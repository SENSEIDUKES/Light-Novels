import { AccountScopedChapterContent, StorageAdapter } from "./types";
import { StoryWorld, ChapterContent } from "../../types";

const ACCOUNT_KEY_PREFIX = "@seihouse/account/";

type StoredStory = StoryWorld & {
    __storageAccountId?: string;
    __storageOriginalId?: string;
};

type StoredChapter = ChapterContent & {
    __storageAccountId?: string;
    __storageOriginalStoryId?: string;
    __storageAmbiguousOwner?: boolean;
};

const scopedKey = (accountId: string, recordId: string): string =>
    `${ACCOUNT_KEY_PREFIX}${encodeURIComponent(accountId)}/${encodeURIComponent(recordId)}`;

const timestamp = (value?: string): number => {
    const parsed = value ? new Date(value).getTime() : Number.NaN;
    return Number.isFinite(parsed) ? parsed : 0;
};

type AccountScope = string | null | undefined;

/**
 * Robust, client-side IndexedDB Storage Adapter.
 * Ideal for storing structured story objects offline.
 */
export class IndexedDBStorageAdapter implements StorageAdapter {
    name = 'IndexedDB';
    private dbName = 'seihouse_story_world_db';
    private storeName = 'stories';
    private chaptersStoreName = 'chapter_contents';
    private audioStoreName = 'audio_cache';
    private version = 3;
    private db: IDBDatabase | null = null;
    /** `undefined` preserves the legacy/local-only all-records view. */
    private accountScope: string | null | undefined;

    setAccountScope(userId: string | null | undefined): void {
        this.accountScope = userId;
    }

    private encodeStory(story: StoryWorld, accountId?: string): StoredStory {
        const copy = { ...story } as StoredStory;
        delete copy.__storageAccountId;
        delete copy.__storageOriginalId;
        if (!accountId) return copy;
        return {
          ...copy,
          userId: copy.userId ?? accountId,
          id: scopedKey(accountId, story.id),
          __storageAccountId: accountId,
          __storageOriginalId: story.id,
        };
    }

    private decodeStory(story: StoredStory): StoryWorld {
        const copy = { ...story } as StoredStory;
        if (copy.__storageOriginalId) copy.id = copy.__storageOriginalId;
        delete copy.__storageAccountId;
        delete copy.__storageOriginalId;
        return copy;
    }

    private encodeChapter(content: ChapterContent, accountId?: string): StoredChapter {
        const copy = { ...content } as StoredChapter;
        delete copy.__storageAccountId;
        delete copy.__storageOriginalStoryId;
        delete copy.__storageAmbiguousOwner;
        if (!accountId) return copy;
        return {
          ...copy,
          storyId: scopedKey(accountId, content.storyId),
          __storageAccountId: accountId,
          __storageOriginalStoryId: content.storyId,
        };
    }

    private decodeChapter(content: StoredChapter): ChapterContent {
        const copy = { ...content } as StoredChapter;
        if (copy.__storageOriginalStoryId) {
          copy.storyId = copy.__storageOriginalStoryId;
        }
        delete copy.__storageAccountId;
        delete copy.__storageOriginalStoryId;
        delete copy.__storageAmbiguousOwner;
        return copy;
    }

    private storyIsVisible(story: StoredStory, scope: AccountScope): boolean {
        const ownerId = story.__storageAccountId ?? story.userId;
        if (scope === undefined) return true;
        if (scope === null) return !ownerId;
        return !ownerId || ownerId === scope;
    }

    private legacyChapterIsVisible(
      chapter: StoredChapter,
      scope: AccountScope,
      stories: StoredStory[],
    ): boolean {
        if (scope === undefined) return true;
        if (chapter.__storageAmbiguousOwner) return false;
        const owners = new Set<string | undefined>();
        for (const storedStory of stories) {
          const story = this.decodeStory(storedStory);
          if (story.id !== chapter.storyId) continue;
          owners.add(storedStory.__storageAccountId ?? story.userId);
        }
        if (owners.size !== 1) return false;
        const ownerId = Array.from(owners)[0];
        if (scope === null) return !ownerId;
        return !ownerId || ownerId === scope;
    }

    private async readAll<T>(storeName: string): Promise<T[]> {
        const db = this.db;
        if (!db) return [];
        return new Promise((resolve, reject) => {
          const request = db.transaction(storeName, "readonly").objectStore(storeName).getAll();
          request.onsuccess = () => resolve(request.result as T[]);
          request.onerror = () => reject(request.error);
        });
    }

    /**
     * Version-3 databases used raw story ids as primary keys. Move owned rows
     * to composite keys in place. Unowned rows stay raw so the first signed-in
     * account can still see and claim them.
     */
    private async migrateLegacyOwnedRecords(): Promise<void> {
        if (!this.db) return;
        const stories = await this.readAll<StoredStory>(this.storeName);
        const chapters = await this.readAll<StoredChapter>(this.chaptersStoreName);
        const legacyOwnedStories = stories.filter(
          (story) => !story.__storageOriginalId && Boolean(story.userId),
        );

        const ownersByStoryId = new Map<string, Set<string | null>>();
        for (const storedStory of stories) {
          const story = this.decodeStory(storedStory);
          const owners = ownersByStoryId.get(story.id) ?? new Set<string | null>();
          owners.add(storedStory.__storageAccountId ?? story.userId ?? null);
          ownersByStoryId.set(story.id, owners);
        }

        const legacyChaptersToMove = chapters.flatMap((chapter) => {
          if (chapter.__storageOriginalStoryId) return [];
          const owners = ownersByStoryId.get(chapter.storyId);
          if (!owners || owners.size !== 1 || owners.has(null)) return [];
          return [{ chapter, accountId: Array.from(owners)[0] as string }];
        });
        const ambiguousLegacyChapters = chapters.filter((chapter) => {
          if (chapter.__storageOriginalStoryId || chapter.__storageAmbiguousOwner) return false;
          const owners = ownersByStoryId.get(chapter.storyId);
          return !owners || owners.size !== 1;
        });
        if (
          legacyOwnedStories.length === 0 &&
          legacyChaptersToMove.length === 0 &&
          ambiguousLegacyChapters.length === 0
        ) return;

        await new Promise<void>((resolve, reject) => {
          const transaction = this.db!.transaction(
            [this.storeName, this.chaptersStoreName],
            "readwrite",
          );
          const storiesStore = transaction.objectStore(this.storeName);
          const chaptersStore = transaction.objectStore(this.chaptersStoreName);
          for (const story of legacyOwnedStories) {
            const encoded = this.encodeStory(this.decodeStory(story), story.userId);
            const existing = stories.find((candidate) => candidate.id === encoded.id);
            if (
              !existing ||
              timestamp(story.updatedAt) > timestamp(existing.updatedAt)
            ) {
              storiesStore.put(encoded);
            }
            storiesStore.delete(story.id);
          }
          for (const { chapter, accountId } of legacyChaptersToMove) {
            const encoded = this.encodeChapter(this.decodeChapter(chapter), accountId);
            const existing = chapters.find(
              (candidate) =>
                candidate.storyId === encoded.storyId &&
                candidate.chapterNumber === encoded.chapterNumber,
            );
            if (
              !existing ||
              timestamp(chapter.updatedAt) > timestamp(existing.updatedAt)
            ) {
              chaptersStore.put(encoded);
            }
            chaptersStore.delete([chapter.storyId, chapter.chapterNumber]);
          }
          for (const chapter of ambiguousLegacyChapters) {
            chaptersStore.put({ ...chapter, __storageAmbiguousOwner: true });
          }
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        });
    }

    init(): Promise<void> {
        return new Promise((resolve, reject) => {
          if (typeof window === 'undefined' || !window.indexedDB) {
            reject(new Error('IndexedDB is not supported in this environment.'));
            return;
          }

          try {
            const request = window.indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
              console.error('Failed to open IndexedDB:', request.error);
              reject(request.error);
            };

            request.onsuccess = () => {
              this.db = request.result;
              void this.migrateLegacyOwnedRecords()
                .catch((error) => {
                  // Migration is idempotent and will retry next initialization.
                  console.warn("Failed to namespace legacy IndexedDB records:", error);
                })
                .then(resolve);
            };

            request.onupgradeneeded = () => {
              const db = request.result;
              if (!db.objectStoreNames.contains(this.storeName)) {
                db.createObjectStore(this.storeName, { keyPath: 'id' });
              }
              if (!db.objectStoreNames.contains(this.chaptersStoreName)) {
                // Complex key path for identifying unique chapter contents
                db.createObjectStore(this.chaptersStoreName, { keyPath: ['storyId', 'chapterNumber'] });
              }
              if (!db.objectStoreNames.contains(this.audioStoreName)) {
                db.createObjectStore(this.audioStoreName, { keyPath: 'url' });
              }
            };
          } catch (err) {
            console.warn('Synchronous error during IndexedDB open (possibly sandboxed):', err);
            reject(err);
          }
        });
    }

    private getDB(): Promise<IDBDatabase> {
        if (this.db) return Promise.resolve(this.db);
        return this.init().then(() => this.db!);
    }

    async getStories(): Promise<StoryWorld[]> {
        const scope = this.accountScope;
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(this.storeName, 'readonly');
          const store = transaction.objectStore(this.storeName);
          const request = store.getAll();

          request.onsuccess = () => {
            // Sort descending by updatedAt
            const storedStories = request.result as StoredStory[];
            const byId = new Map<string, { story: StoryWorld; scoped: boolean }>();
            for (const storedStory of storedStories) {
              if (!this.storyIsVisible(storedStory, scope)) continue;
              const story = this.decodeStory(storedStory);
              const isExactScope = Boolean(
                scope && storedStory.__storageAccountId === scope,
              );
              const identity = scope === undefined
                ? `${storedStory.__storageAccountId ?? story.userId ?? ""}\u0000${story.id}`
                : story.id;
              const existing = byId.get(identity);
              if (
                !existing ||
                (isExactScope && !existing.scoped) ||
                (isExactScope === existing.scoped && timestamp(story.updatedAt) > timestamp(existing.story.updatedAt))
              ) {
                byId.set(identity, { story, scoped: isExactScope });
              }
            }
            const stories = Array.from(byId.values(), ({ story }) => story);
            stories.sort((a, b) => timestamp(b.updatedAt) - timestamp(a.updatedAt));
            resolve(stories);
          };

          request.onerror = () => {
            reject(request.error);
          };
        });
    }

    private async getStoryForScope(
      id: string,
      scope: AccountScope,
      db: IDBDatabase,
    ): Promise<StoryWorld | null> {
        if (typeof scope === "string") {
          const scoped = await new Promise<StoredStory | null>((resolve, reject) => {
            const transaction = db.transaction(this.storeName, "readonly");
            const request = transaction.objectStore(this.storeName).get(scopedKey(scope, id));
            request.onsuccess = () => resolve((request.result as StoredStory) || null);
            request.onerror = () => reject(request.error);
          });
          if (scoped) return this.decodeStory(scoped);
        }

        const legacy = await new Promise<StoredStory | null>((resolve, reject) => {
          const transaction = db.transaction(this.storeName, 'readonly');
          const store = transaction.objectStore(this.storeName);
          const request = store.get(id);

          request.onsuccess = () => {
            resolve((request.result as StoredStory) || null);
          };

          request.onerror = () => {
            reject(request.error);
          };
        });
        if (scope !== undefined) {
          return legacy && this.storyIsVisible(legacy, scope)
            ? this.decodeStory(legacy)
            : null;
        }

        const candidates = (await this.readAll<StoredStory>(this.storeName))
          .filter((story) => this.decodeStory(story).id === id)
          .map((story) => this.decodeStory(story))
          .sort((a, b) => timestamp(b.updatedAt) - timestamp(a.updatedAt));
        return candidates[0] ?? null;
    }

    async getStory(id: string): Promise<StoryWorld | null> {
        const scope = this.accountScope;
        const db = await this.getDB();
        return this.getStoryForScope(id, scope, db);
    }

    async saveStory(story: StoryWorld): Promise<void> {
        const scope = this.accountScope;
        const db = await this.getDB();
        if (
          typeof scope === "string" &&
          story.userId &&
          story.userId !== scope
        ) {
          throw new Error("Cannot save a story outside the active account scope");
        }
        const accountId = story.userId ?? (
          typeof scope === "string" ? scope : undefined
        );
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(
            [this.storeName, this.chaptersStoreName],
            "readwrite",
          );
          const store = transaction.objectStore(this.storeName);
          const chaptersStore = transaction.objectStore(this.chaptersStoreName);
          const legacyRequest = store.get(story.id);
          const storiesRequest = store.getAll();
          const chaptersRequest = chaptersStore.getAll();
          let ready = 0;
          const applyWrite = () => {
            ready += 1;
            if (ready !== 3) return;
            const legacyStory = legacyRequest.result as StoredStory | undefined;
            const allStories = storiesRequest.result as StoredStory[];
            const allChapters = chaptersRequest.result as StoredChapter[];
            const claimLegacy = Boolean(
              accountId &&
              legacyStory &&
              (!legacyStory.userId || legacyStory.userId === accountId),
            );

            store.put(this.encodeStory(story, accountId));
            if (!claimLegacy) return;
            store.delete(story.id);
            for (const chapter of allChapters) {
              if (chapter.__storageOriginalStoryId || chapter.storyId !== story.id) continue;
              if (this.legacyChapterIsVisible(chapter, accountId, allStories)) {
                chaptersStore.put(
                  this.encodeChapter(this.decodeChapter(chapter), accountId),
                );
                chaptersStore.delete([chapter.storyId, chapter.chapterNumber]);
              } else {
                chaptersStore.put({ ...chapter, __storageAmbiguousOwner: true });
              }
            }
          };
          legacyRequest.onsuccess = applyWrite;
          storiesRequest.onsuccess = applyWrite;
          chaptersRequest.onsuccess = applyWrite;
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        });
    }

    async deleteStory(id: string): Promise<void> {
        const scope = this.accountScope;
        const db = await this.getDB();
        const stories = await this.readAll<StoredStory>(this.storeName);
        const chapters = await this.readAll<StoredChapter>(this.chaptersStoreName);
        const selectedOwner = scope === undefined
          ? stories
              .filter((story) => this.decodeStory(story).id === id)
              .sort(
                (a, b) =>
                  timestamp(this.decodeStory(b).updatedAt) -
                  timestamp(this.decodeStory(a).updatedAt),
              )[0]?.__storageAccountId ??
            stories
              .filter((story) => this.decodeStory(story).id === id)
              .sort(
                (a, b) =>
                  timestamp(this.decodeStory(b).updatedAt) -
                  timestamp(this.decodeStory(a).updatedAt),
              )[0]?.userId
          : undefined;
        const storyKeys = stories.flatMap((story) => {
          const decoded = this.decodeStory(story);
          if (decoded.id !== id) return [];
          const ownerId = story.__storageAccountId ?? story.userId;
          if (scope === undefined) {
            return ownerId === selectedOwner ? [story.id] : [];
          }
          if (scope === null) return ownerId ? [] : [story.id];
          return !ownerId || ownerId === scope ? [story.id] : [];
        });
        const chapterKeys = chapters.flatMap((chapter) => {
          const decoded = this.decodeChapter(chapter);
          if (decoded.storyId !== id) return [];
          const ownerId = chapter.__storageAccountId;
          if (scope === undefined) {
            return ownerId === selectedOwner
              ? [[chapter.storyId, chapter.chapterNumber] as [string, number]]
              : [];
          }
          if (!ownerId && !this.legacyChapterIsVisible(chapter, scope, stories)) return [];
          if (scope === null) return ownerId ? [] : [[chapter.storyId, chapter.chapterNumber] as [string, number]];
          return !ownerId || ownerId === scope
            ? [[chapter.storyId, chapter.chapterNumber] as [string, number]]
            : [];
        });
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([this.storeName, this.chaptersStoreName], 'readwrite');
          const store = transaction.objectStore(this.storeName);
          const chaptersStore = transaction.objectStore(this.chaptersStoreName);
          for (const key of storyKeys) store.delete(key);
          for (const key of chapterKeys) chaptersStore.delete(key);

          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        });
    }

    async clearAll(): Promise<void> {
        const scope = this.accountScope;
        const db = await this.getDB();
        if (scope === undefined) return new Promise((resolve, reject) => {
          const transaction = db.transaction([this.storeName, this.chaptersStoreName], 'readwrite');
          transaction.objectStore(this.storeName).clear();
          transaction.objectStore(this.chaptersStoreName).clear();

          transaction.oncomplete = () => {
            resolve();
          };

          transaction.onerror = () => {
            reject(transaction.error);
          };
        });

        const stories = await this.readAll<StoredStory>(this.storeName);
        const chapters = await this.readAll<StoredChapter>(this.chaptersStoreName);
        const storyKeys = stories
          .filter((story) => this.storyIsVisible(story, scope))
          .map((story) => story.id);
        const chapterKeys = chapters.flatMap((chapter) => {
          const ownerId = chapter.__storageAccountId;
          const decoded = this.decodeChapter(chapter);
          const visible = ownerId
            ? typeof scope === "string" && ownerId === scope
            : this.legacyChapterIsVisible(chapter, scope, stories);
          return visible
            ? [[chapter.storyId, chapter.chapterNumber] as [string, number]]
            : [];
        });
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(
            [this.storeName, this.chaptersStoreName],
            "readwrite",
          );
          const storiesStore = transaction.objectStore(this.storeName);
          const chaptersStore = transaction.objectStore(this.chaptersStoreName);
          for (const key of storyKeys) storiesStore.delete(key);
          for (const key of chapterKeys) chaptersStore.delete(key);
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        });
    }

    async getChapterContent(storyId: string, chapterNumber: number): Promise<ChapterContent | null> {
        const scope = this.accountScope;
        const db = await this.getDB();
        if (typeof scope === "string") {
          const scoped = await new Promise<StoredChapter | null>((resolve, reject) => {
            const request = db.transaction(this.chaptersStoreName, "readonly")
              .objectStore(this.chaptersStoreName)
              .get([scopedKey(scope, storyId), chapterNumber]);
            request.onsuccess = () => resolve((request.result as StoredChapter) || null);
            request.onerror = () => reject(request.error);
          });
          if (scoped) return this.decodeChapter(scoped);
        }

        if (scope === undefined) {
          const selectedStory = await this.getStoryForScope(storyId, scope, db);
          if (selectedStory?.userId) {
            const selected = await new Promise<StoredChapter | null>((resolve, reject) => {
              const request = db.transaction(this.chaptersStoreName, "readonly")
                .objectStore(this.chaptersStoreName)
                .get([scopedKey(selectedStory.userId!, storyId), chapterNumber]);
              request.onsuccess = () => resolve((request.result as StoredChapter) || null);
              request.onerror = () => reject(request.error);
            });
            if (selected) return this.decodeChapter(selected);
          }
        }

        if (scope !== undefined) {
          const parent = await this.getStoryForScope(storyId, scope, db);
          if (!parent) return null;
        }
        const stories = scope === undefined
          ? []
          : await this.readAll<StoredStory>(this.storeName);
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(this.chaptersStoreName, 'readonly');
          const store = transaction.objectStore(this.chaptersStoreName);
          const request = store.get([storyId, chapterNumber]);

          request.onsuccess = () => {
            const chapter = request.result as StoredChapter | undefined;
            resolve(
              chapter && this.legacyChapterIsVisible(chapter, scope, stories)
                ? this.decodeChapter(chapter)
                : null,
            );
          };
          
          request.onerror = () => reject(request.error);
        });
    }

    async saveChapterContent(content: ChapterContent): Promise<void> {
        const scope = this.accountScope;
        const db = await this.getDB();
        let accountId = typeof scope === "string" ? scope : undefined;
        if (scope === undefined) {
          accountId = (await this.getStoryForScope(content.storyId, scope, db))?.userId;
        }
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(this.chaptersStoreName, 'readwrite');
          const store = transaction.objectStore(this.chaptersStoreName);
          store.put(this.encodeChapter(content, accountId));
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        });
    }

    async getAllChapterContents(): Promise<AccountScopedChapterContent[]> {
        const db = await this.getDB();
        const [stories, chapters] = await Promise.all([
          this.readAll<StoredStory>(this.storeName),
          this.readAll<StoredChapter>(this.chaptersStoreName),
        ]);
        const ownersByStoryId = new Map<string, Set<string | undefined>>();
        for (const storedStory of stories) {
          const story = this.decodeStory(storedStory);
          const owners = ownersByStoryId.get(story.id) ?? new Set<string | undefined>();
          owners.add(storedStory.__storageAccountId ?? story.userId);
          ownersByStoryId.set(story.id, owners);
        }

        const byOwnerAndChapter = new Map<string, AccountScopedChapterContent>();
        for (const storedChapter of chapters) {
          const content = this.decodeChapter(storedChapter);
          const possibleOwners = ownersByStoryId.get(content.storyId);
          const inferredOwner = possibleOwners?.size === 1
            ? Array.from(possibleOwners)[0]
            : undefined;
          const userId = storedChapter.__storageAccountId ?? inferredOwner;
          const key = `${userId ?? ""}\u0000${content.storyId}\u0000${content.chapterNumber}`;
          const existing = byOwnerAndChapter.get(key);
          if (
            !existing ||
            timestamp(content.updatedAt) >= timestamp(existing.content.updatedAt)
          ) {
            byOwnerAndChapter.set(key, {
              userId,
              content,
              ambiguousOwner: storedChapter.__storageAmbiguousOwner || possibleOwners?.size !== 1,
            });
          }
        }
        return Array.from(byOwnerAndChapter.values());
    }

    async getAudioBlob(url: string): Promise<Blob | null> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(this.audioStoreName, 'readonly');
          const store = transaction.objectStore(this.audioStoreName);
          const request = store.get(url);

          request.onsuccess = () => {
            resolve(request.result ? request.result.blob : null);
          };
          
          request.onerror = () => reject(request.error);
        });
    }

    async saveAudioBlob(url: string, blob: Blob): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(this.audioStoreName, 'readwrite');
          const store = transaction.objectStore(this.audioStoreName);
          const request = store.put({ url, blob });

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
    }
}
