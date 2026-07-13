import { AccountScopedChapterContent, StorageAdapter } from "./types";
import { StoryWorld, ChapterContent } from "../../types";

const timestamp = (value?: string): number => {
  const parsed = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
};

type AccountScope = string | null | undefined;

/**
 * Resilient LocalStorage fallback adapter used when IndexedDB is restricted inside frames
 * or private browsing.
 */
export class LocalStorageFallbackAdapter implements StorageAdapter {
  name = "LocalStorage";
  private storageKey = "@seihouse/fiction-generator-stories-v2";
  private chaptersStorageKey = "@seihouse/fiction-generator-chapters-v2";
  private accountStoragePrefix = "@seihouse/fiction-generator-stories-v3:";
  private accountChaptersStoragePrefix = "@seihouse/fiction-generator-chapters-v3:";
  private ambiguousLegacyChaptersKey = "@seihouse/ambiguous-legacy-chapters-v1";
  /** `undefined` preserves the legacy/local-only all-records view. */
  private accountScope: string | null | undefined;

  setAccountScope(userId: string | null | undefined): void {
    this.accountScope = userId;
  }

  private storiesKeyFor(accountId: string): string {
    return `${this.accountStoragePrefix}${encodeURIComponent(accountId)}`;
  }

  private chaptersKeyFor(accountId: string): string {
    return `${this.accountChaptersStoragePrefix}${encodeURIComponent(accountId)}`;
  }

  private accountIdFromKey(key: string, prefix: string): string | undefined {
    if (!key.startsWith(prefix)) return undefined;
    try {
      return decodeURIComponent(key.slice(prefix.length));
    } catch {
      return undefined;
    }
  }

  private keysWithPrefix(prefix: string): string[] {
    const keys: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(prefix)) keys.push(key);
    }
    return keys;
  }

  private readArray<T>(key: string): T[] {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch (error) {
      console.warn(`Failed to read LocalStorage key ${key}:`, error);
      return [];
    }
  }

  private mergeStories(existing: StoryWorld[], incoming: StoryWorld[]): StoryWorld[] {
    const byId = new Map(existing.map((story) => [story.id, story]));
    for (const story of incoming) {
      const current = byId.get(story.id);
      if (!current || timestamp(story.updatedAt) >= timestamp(current.updatedAt)) {
        byId.set(story.id, story);
      }
    }
    return Array.from(byId.values());
  }

  private mergeChapters(
    existing: ChapterContent[],
    incoming: ChapterContent[],
  ): ChapterContent[] {
    const keyFor = (chapter: ChapterContent) => `${chapter.storyId}\u0000${chapter.chapterNumber}`;
    const byId = new Map(existing.map((chapter) => [keyFor(chapter), chapter]));
    for (const chapter of incoming) {
      const key = keyFor(chapter);
      const current = byId.get(key);
      if (!current || timestamp(chapter.updatedAt) >= timestamp(current.updatedAt)) {
        byId.set(key, chapter);
      }
    }
    return Array.from(byId.values());
  }

  private visibleLegacyStories(scope: AccountScope): StoryWorld[] {
    const stories = this.readArray<StoryWorld>(this.storageKey);
    if (scope === undefined) return stories;
    if (scope === null) return stories.filter((story) => !story.userId);
    return stories.filter(
      (story) => !story.userId || story.userId === scope,
    );
  }

  private legacyChapterKey(storyId: string, chapterNumber: number): string {
    return `${storyId}\u0000${chapterNumber}`;
  }

  private ambiguousLegacyChapterKeys(): Set<string> {
    try {
      return new Set(this.readArray<string>(this.ambiguousLegacyChaptersKey));
    } catch {
      return new Set();
    }
  }

  private forgetAmbiguousLegacyChapters(keys: Iterable<string>): void {
    const ambiguous = this.ambiguousLegacyChapterKeys();
    let changed = false;
    for (const key of keys) changed = ambiguous.delete(key) || changed;
    if (!changed) return;
    if (ambiguous.size === 0) localStorage.removeItem(this.ambiguousLegacyChaptersKey);
    else localStorage.setItem(
      this.ambiguousLegacyChaptersKey,
      JSON.stringify(Array.from(ambiguous)),
    );
  }

  private ownersByStoryId(): Map<string, Set<string | undefined>> {
    const ownersByStoryId = new Map<string, Set<string | undefined>>();
    for (const story of this.getStoriesForScope(undefined)) {
      const owners = ownersByStoryId.get(story.id) ?? new Set<string | undefined>();
      owners.add(story.userId);
      ownersByStoryId.set(story.id, owners);
    }
    return ownersByStoryId;
  }

  private legacyChapterIsVisible(
    chapter: ChapterContent,
    scope: AccountScope,
    ownersByStoryId = this.ownersByStoryId(),
  ): boolean {
    if (scope === undefined) return true;
    if (
      this.ambiguousLegacyChapterKeys().has(
        this.legacyChapterKey(chapter.storyId, chapter.chapterNumber),
      )
    ) {
      return false;
    }
    const owners = ownersByStoryId.get(chapter.storyId) ?? new Set<string | undefined>();
    if (owners.size !== 1) return false;
    const ownerId = Array.from(owners)[0];
    if (scope === null) return !ownerId;
    return !ownerId || ownerId === scope;
  }

  private rememberAmbiguousLegacyChapters(): void {
    const ambiguous = this.ambiguousLegacyChapterKeys();
    const ownersByStoryId = this.ownersByStoryId();
    for (const chapter of this.readArray<ChapterContent>(this.chaptersStorageKey)) {
      if ((ownersByStoryId.get(chapter.storyId)?.size ?? 0) > 1) {
        ambiguous.add(this.legacyChapterKey(chapter.storyId, chapter.chapterNumber));
      }
    }
    if (ambiguous.size > 0) {
      localStorage.setItem(this.ambiguousLegacyChaptersKey, JSON.stringify(Array.from(ambiguous)));
    }
  }

  /** Move old user-owned v2 rows into per-account keys without stranding unowned data. */
  private migrateLegacyOwnedRecords(): void {
    const legacyStories = this.readArray<StoryWorld>(this.storageKey);
    const legacyChapters = this.readArray<ChapterContent>(this.chaptersStorageKey);
    const ownersByStoryId = new Map<string, Set<string | null>>();
    const storiesByOwner = new Map<string, StoryWorld[]>();

    for (const story of this.getStoriesForScope(undefined)) {
      const owners = ownersByStoryId.get(story.id) ?? new Set<string | null>();
      owners.add(story.userId ?? null);
      ownersByStoryId.set(story.id, owners);
    }
    for (const story of legacyStories) {
      if (story.userId) {
        const owned = storiesByOwner.get(story.userId) ?? [];
        owned.push(story);
        storiesByOwner.set(story.userId, owned);
      }
    }

    const migratedStories = new Set<string>();
    const migratedChapters = new Set<string>();
    const accountIds = new Set(storiesByOwner.keys());
    for (const chapter of legacyChapters) {
      const owners = ownersByStoryId.get(chapter.storyId);
      if (owners?.size === 1 && !owners.has(null)) {
        accountIds.add(Array.from(owners)[0] as string);
      }
    }
    for (const accountId of accountIds) {
      const stories = storiesByOwner.get(accountId) ?? [];
      const chapters = legacyChapters.filter((chapter) => {
        const owners = ownersByStoryId.get(chapter.storyId);
        return owners?.size === 1 && owners.has(accountId);
      });
      try {
        if (stories.length > 0) {
          const storiesKey = this.storiesKeyFor(accountId);
          localStorage.setItem(
            storiesKey,
            JSON.stringify(this.mergeStories(this.readArray(storiesKey), stories)),
          );
        }
        if (chapters.length > 0) {
          const chaptersKey = this.chaptersKeyFor(accountId);
          localStorage.setItem(
            chaptersKey,
            JSON.stringify(this.mergeChapters(this.readArray(chaptersKey), chapters)),
          );
        }
        for (const story of stories) migratedStories.add(`${accountId}\u0000${story.id}`);
        for (const chapter of chapters) {
          migratedChapters.add(`${chapter.storyId}\u0000${chapter.chapterNumber}`);
        }
      } catch (error) {
        // Old rows remain intact and the idempotent migration retries next init.
        console.warn(`Failed to namespace LocalStorage records for ${accountId}:`, error);
      }
    }

    if (migratedStories.size > 0) {
      try {
        localStorage.setItem(
          this.storageKey,
          JSON.stringify(
            legacyStories.filter(
              (story) => !story.userId || !migratedStories.has(`${story.userId}\u0000${story.id}`),
            ),
          ),
        );
      } catch (error) {
        // Per-account copies are already durable. Duplicate legacy rows are harmless
        // and are de-duplicated on reads until cleanup succeeds on a later launch.
        console.warn("Failed to clean up namespaced LocalStorage legacy rows:", error);
      }
    }
    if (migratedChapters.size > 0) {
      try {
        localStorage.setItem(
          this.chaptersStorageKey,
          JSON.stringify(
            legacyChapters.filter(
              (chapter) => !migratedChapters.has(`${chapter.storyId}\u0000${chapter.chapterNumber}`),
            ),
          ),
        );
      } catch (error) {
        console.warn("Failed to clean up namespaced LocalStorage legacy chapters:", error);
      }
    }
    this.rememberAmbiguousLegacyChapters();
  }

  async init(): Promise<void> {
    try {
      localStorage.setItem("__test_ls_availability__", "test");
      localStorage.removeItem("__test_ls_availability__");
      this.migrateLegacyOwnedRecords();
    } catch (error) {
      throw new Error("LocalStorage is not available", { cause: error });
    }
  }

  private getStoriesForScope(scope: AccountScope): StoryWorld[] {
    try {
      const candidates: Array<{
        story: StoryWorld;
        scoped: boolean;
        accountId?: string;
      }> = [];
      if (scope === undefined) {
        for (const story of this.readArray<StoryWorld>(this.storageKey)) {
          candidates.push({ story, scoped: false });
        }
        for (const key of this.keysWithPrefix(this.accountStoragePrefix)) {
          const accountId = this.accountIdFromKey(key, this.accountStoragePrefix);
          for (const story of this.readArray<StoryWorld>(key)) {
            candidates.push({
              story: accountId && !story.userId ? { ...story, userId: accountId } : story,
              scoped: true,
              accountId,
            });
          }
        }
      } else {
        for (const story of this.visibleLegacyStories(scope)) {
          candidates.push({ story, scoped: false });
        }
        if (typeof scope === "string") {
          for (const story of this.readArray<StoryWorld>(this.storiesKeyFor(scope))) {
            candidates.push({
              story: story.userId ? story : { ...story, userId: scope },
              scoped: true,
              accountId: scope,
            });
          }
        }
      }

      const byId = new Map<string, {
        story: StoryWorld;
        scoped: boolean;
        accountId?: string;
      }>();
      for (const candidate of candidates) {
        const identity = scope === undefined
          ? `${candidate.accountId ?? candidate.story.userId ?? ""}\u0000${candidate.story.id}`
          : candidate.story.id;
        const existing = byId.get(identity);
        if (
          !existing ||
          (candidate.scoped && !existing.scoped) ||
          (candidate.scoped === existing.scoped &&
            timestamp(candidate.story.updatedAt) > timestamp(existing.story.updatedAt))
        ) {
          byId.set(identity, candidate);
        }
      }
      const stories = Array.from(byId.values(), ({ story }) => story);
      stories.sort((a, b) => timestamp(b.updatedAt) - timestamp(a.updatedAt));
      return stories;
    } catch (error) {
      console.error("LocalStorage fallback read error:", error);
      return [];
    }
  }

  async getStories(): Promise<StoryWorld[]> {
    const scope = this.accountScope;
    return this.getStoriesForScope(scope);
  }

  async getStory(id: string): Promise<StoryWorld | null> {
    const scope = this.accountScope;
    const stories = this.getStoriesForScope(scope);
    return stories.find((story) => story.id === id) || null;
  }

  private stripStoryAssets(story: StoryWorld): StoryWorld {
    const strippedStory = JSON.parse(JSON.stringify(story));
    delete strippedStory.imageUrl;
    delete strippedStory.imageHistory;
    if (strippedStory.memory) {
      strippedStory.memory.characters?.forEach((character: any) => {
        delete character.imageUrl;
        delete character.imageHistory;
      });
      strippedStory.memory.locations?.forEach((location: any) => {
        delete location.imageUrl;
        delete location.imageHistory;
      });
      strippedStory.memory.artifacts?.forEach((artifact: any) => {
        delete artifact.imageUrl;
        delete artifact.imageHistory;
      });
    }
    strippedStory.arcs?.forEach((arc: any) => {
      arc.chapters?.forEach((chapter: any) => {
        if (chapter.assetManifest) delete chapter.assetManifest.heroImage;
      });
    });
    return strippedStory;
  }

  private claimLegacyStory(accountId: string, storyId: string): void {
    const legacyStories = this.readArray<StoryWorld>(this.storageKey);
    const claimable = legacyStories.some(
      (story) =>
        story.id === storyId && (!story.userId || story.userId === accountId),
    );
    if (!claimable) return;

    const hasConflictingOwner = legacyStories.some(
      (story) => story.id === storyId && story.userId && story.userId !== accountId,
    );
    const legacyChapters = this.readArray<ChapterContent>(this.chaptersStorageKey);
    const ownersByStoryId = this.ownersByStoryId();
    try {
      if (!hasConflictingOwner) {
        const chaptersToClaim = legacyChapters.filter(
          (chapter) =>
            chapter.storyId === storyId &&
            this.legacyChapterIsVisible(chapter, accountId, ownersByStoryId),
        );
        if (chaptersToClaim.length > 0) {
          const claimedChapterKeys = new Set(
            chaptersToClaim.map((chapter) =>
              this.legacyChapterKey(chapter.storyId, chapter.chapterNumber),
            ),
          );
          const accountChaptersKey = this.chaptersKeyFor(accountId);
          localStorage.setItem(
            accountChaptersKey,
            JSON.stringify(
              this.mergeChapters(this.readArray(accountChaptersKey), chaptersToClaim),
            ),
          );
          localStorage.setItem(
            this.chaptersStorageKey,
            JSON.stringify(
              legacyChapters.filter(
                (chapter) => !claimedChapterKeys.has(
                  this.legacyChapterKey(chapter.storyId, chapter.chapterNumber),
                ),
              ),
            ),
          );
          this.forgetAmbiguousLegacyChapters(claimedChapterKeys);
        }
      }
      localStorage.setItem(
        this.storageKey,
        JSON.stringify(
          legacyStories.filter(
            (story) =>
              story.id !== storyId ||
              Boolean(story.userId && story.userId !== accountId),
          ),
        ),
      );
    } catch (error) {
      // The scoped copy is already durable; keep the raw duplicate for retry.
      console.warn(`Failed to clean up claimed legacy story ${storyId}:`, error);
    }
  }

  /**
   * Stamp an unowned raw row before writing its scoped copy. If later cleanup
   * fails, another account still cannot observe or claim the reserved row.
   */
  private reserveLegacyClaim(accountId: string, storyId: string): void {
    const legacyStories = this.readArray<StoryWorld>(this.storageKey);
    let changed = false;
    const reserved = legacyStories.map((story) => {
      if (story.id !== storyId || story.userId) return story;
      changed = true;
      return { ...story, userId: accountId };
    });
    if (changed) {
      localStorage.setItem(this.storageKey, JSON.stringify(reserved));
    }
  }

  async saveStory(story: StoryWorld): Promise<void> {
    const scope = this.accountScope;
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
    const savedStory = accountId && !story.userId
      ? { ...story, userId: accountId }
      : story;
    if (accountId) this.reserveLegacyClaim(accountId, story.id);
    const targetKey = accountId ? this.storiesKeyFor(accountId) : this.storageKey;
    const stories = this.readArray<StoryWorld>(targetKey);
    const existingIndex = stories.findIndex((candidate) => candidate.id === story.id);
    if (existingIndex > -1) stories[existingIndex] = savedStory;
    else stories.push(savedStory);

    try {
      localStorage.setItem(targetKey, JSON.stringify(stories));
    } catch (error) {
      console.warn(
        "LocalStorage quota exceeded; stripping images only from the story being saved.",
        error,
      );
      const strippedStory = this.stripStoryAssets(savedStory);
      const fallbackStories = stories.map((existingStory) =>
        existingStory.id === story.id ? strippedStory : existingStory,
      );
      try {
        localStorage.setItem(targetKey, JSON.stringify(fallbackStories));
      } catch (fallbackError) {
        console.error("Even stripped stories exceeded local storage quota.", fallbackError);
        // The previous LocalStorage value is still intact when setItem fails.
        throw fallbackError;
      }
    }

    if (accountId) {
      this.claimLegacyStory(accountId, story.id);
      this.rememberAmbiguousLegacyChapters();
    }
  }

  async deleteStory(id: string): Promise<void> {
    const scope = this.accountScope;
    try {
      const selectedOwner = scope === undefined
        ? this.getStoriesForScope(scope).find((story) => story.id === id)?.userId
        : undefined;
      const storyKeys = scope === undefined
        ? selectedOwner
          ? [this.storiesKeyFor(selectedOwner), this.storageKey]
          : [this.storageKey]
        : scope === null
          ? [this.storageKey]
          : [this.storiesKeyFor(scope), this.storageKey];
      const chapterKeys = scope === undefined
        ? selectedOwner
          ? [this.chaptersKeyFor(selectedOwner), this.chaptersStorageKey]
          : [this.chaptersStorageKey]
        : scope === null
          ? [this.chaptersStorageKey]
          : [this.chaptersKeyFor(scope), this.chaptersStorageKey];

      const legacyDeletionScope = scope === undefined
        ? selectedOwner ?? null
        : scope;
      const ownersByStoryId = this.ownersByStoryId();
      const visibleLegacyChapterKeys = new Set(
        this.readArray<ChapterContent>(this.chaptersStorageKey)
          .filter(
            (chapter) =>
              chapter.storyId === id &&
              this.legacyChapterIsVisible(chapter, legacyDeletionScope, ownersByStoryId),
          )
          .map((chapter) => this.legacyChapterKey(chapter.storyId, chapter.chapterNumber)),
      );

      for (const key of storyKeys) {
        const stories = this.readArray<StoryWorld>(key);
        const filtered = stories.filter((story) => {
          if (story.id !== id) return true;
          if (key !== this.storageKey) return false;
          if (scope === undefined) return story.userId !== selectedOwner;
          if (scope === null) return Boolean(story.userId);
          return Boolean(story.userId && story.userId !== scope);
        });
        localStorage.setItem(key, JSON.stringify(filtered));
      }
      for (const key of chapterKeys) {
        const chapters = this.readArray<ChapterContent>(key);
        localStorage.setItem(
          key,
          JSON.stringify(
            chapters.filter(
              (chapter) =>
                chapter.storyId !== id ||
                (key === this.chaptersStorageKey &&
                  !visibleLegacyChapterKeys.has(
                    this.legacyChapterKey(chapter.storyId, chapter.chapterNumber),
                  )),
            ),
          ),
        );
      }
      this.forgetAmbiguousLegacyChapters(visibleLegacyChapterKeys);
    } catch (error) {
      console.error("LocalStorage fallback delete error:", error);
    }
  }

  async clearAll(): Promise<void> {
    const scope = this.accountScope;
    if (scope === undefined) {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(this.chaptersStorageKey);
      localStorage.removeItem(this.ambiguousLegacyChaptersKey);
      for (const key of this.keysWithPrefix(this.accountStoragePrefix)) {
        localStorage.removeItem(key);
      }
      for (const key of this.keysWithPrefix(this.accountChaptersStoragePrefix)) {
        localStorage.removeItem(key);
      }
      return;
    }

    const legacyChapters = this.readArray<ChapterContent>(this.chaptersStorageKey);
    const ownersByStoryId = this.ownersByStoryId();
    const visibleLegacyChapterKeys = new Set(
      legacyChapters
        .filter((chapter) => this.legacyChapterIsVisible(chapter, scope, ownersByStoryId))
        .map((chapter) => this.legacyChapterKey(chapter.storyId, chapter.chapterNumber)),
    );
    const legacyStories = this.readArray<StoryWorld>(this.storageKey);
    localStorage.setItem(
      this.storageKey,
      JSON.stringify(
        legacyStories.filter((story) => {
          if (scope === null) return Boolean(story.userId);
          return Boolean(story.userId && story.userId !== scope);
        }),
      ),
    );
    this.forgetAmbiguousLegacyChapters(visibleLegacyChapterKeys);
    localStorage.setItem(
      this.chaptersStorageKey,
      JSON.stringify(
        legacyChapters.filter(
          (chapter) => !visibleLegacyChapterKeys.has(
            this.legacyChapterKey(chapter.storyId, chapter.chapterNumber),
          ),
        ),
      ),
    );
    if (typeof scope === "string") {
      localStorage.removeItem(this.storiesKeyFor(scope));
      localStorage.removeItem(this.chaptersKeyFor(scope));
    }
  }

  async getAudioBlob(_url: string): Promise<Blob | null> {
    return null;
  }

  async saveAudioBlob(_url: string, _blob: Blob): Promise<void> {}

  async getChapterContent(
    storyId: string,
    chapterNumber: number,
  ): Promise<ChapterContent | null> {
    const scope = this.accountScope;
    try {
      if (typeof scope === "string") {
        const scoped = this.readArray<ChapterContent>(
          this.chaptersKeyFor(scope),
        ).find(
          (chapter) =>
            chapter.storyId === storyId && chapter.chapterNumber === chapterNumber,
        );
        if (scoped) return scoped;
      }

      if (scope === undefined) {
        const selectedStory = this.getStoriesForScope(scope).find(
          (story) => story.id === storyId,
        );
        if (selectedStory?.userId) {
          const selected = this.readArray<ChapterContent>(
            this.chaptersKeyFor(selectedStory.userId),
          ).find(
            (chapter) =>
              chapter.storyId === storyId && chapter.chapterNumber === chapterNumber,
          );
          if (selected) return selected;
        }
      }

      const legacy = this.readArray<ChapterContent>(this.chaptersStorageKey).find(
        (chapter) =>
          chapter.storyId === storyId &&
          chapter.chapterNumber === chapterNumber &&
          this.legacyChapterIsVisible(chapter, scope),
      );
      if (legacy) return legacy;
      if (scope !== undefined) return null;

      const candidates = this.keysWithPrefix(this.accountChaptersStoragePrefix)
        .flatMap((key) => this.readArray<ChapterContent>(key))
        .filter(
          (chapter) =>
            chapter.storyId === storyId && chapter.chapterNumber === chapterNumber,
        )
        .sort((a, b) => timestamp(b.updatedAt) - timestamp(a.updatedAt));
      return candidates[0] ?? null;
    } catch (error) {
      console.error("LocalStorage fallback read error:", error);
      return null;
    }
  }

  async saveChapterContent(content: ChapterContent): Promise<void> {
    const scope = this.accountScope;
    try {
      let accountId = typeof scope === "string" ? scope : undefined;
      if (scope === undefined) {
        accountId = this.getStoriesForScope(scope).find(
          (story) => story.id === content.storyId,
        )?.userId;
      }
      const targetKey = accountId
        ? this.chaptersKeyFor(accountId)
        : this.chaptersStorageKey;
      const chapters = this.readArray<ChapterContent>(targetKey);
      const existingIndex = chapters.findIndex(
        (chapter) =>
          chapter.storyId === content.storyId &&
          chapter.chapterNumber === content.chapterNumber,
      );
      if (existingIndex > -1) chapters[existingIndex] = content;
      else chapters.push(content);

      localStorage.setItem(targetKey, JSON.stringify(chapters));
      if (accountId) {
        const legacyParent = this.readArray<StoryWorld>(this.storageKey).find(
          (story) =>
            story.id === content.storyId &&
            (!story.userId || story.userId === accountId),
        );
        if (legacyParent) {
          const legacyChapters = this.readArray<ChapterContent>(this.chaptersStorageKey);
          const ownersByStoryId = this.ownersByStoryId();
          localStorage.setItem(
            this.chaptersStorageKey,
            JSON.stringify(
              legacyChapters.filter(
                (chapter) =>
                  chapter.storyId !== content.storyId ||
                  chapter.chapterNumber !== content.chapterNumber ||
                  !this.legacyChapterIsVisible(chapter, accountId, ownersByStoryId),
              ),
            ),
          );
        }
      }
    } catch (error) {
      console.error("LocalStorage save error:", error);
      throw error;
    }
  }

  async getAllChapterContents(): Promise<AccountScopedChapterContent[]> {
    const stories = this.getStoriesForScope(undefined);
    const ownersByStoryId = new Map<string, Set<string | undefined>>();
    for (const story of stories) {
      const owners = ownersByStoryId.get(story.id) ?? new Set<string | undefined>();
      owners.add(story.userId);
      ownersByStoryId.set(story.id, owners);
    }

    const byOwnerAndChapter = new Map<string, AccountScopedChapterContent>();
    const addChapter = (content: ChapterContent, explicitOwner?: string) => {
      const possibleOwners = ownersByStoryId.get(content.storyId);
      const inferredOwner = possibleOwners?.size === 1
        ? Array.from(possibleOwners)[0]
        : undefined;
      const userId = explicitOwner ?? inferredOwner;
      const key = `${userId ?? ""}\u0000${content.storyId}\u0000${content.chapterNumber}`;
      const existing = byOwnerAndChapter.get(key);
      if (
        !existing ||
        timestamp(content.updatedAt) >= timestamp(existing.content.updatedAt)
      ) {
        byOwnerAndChapter.set(key, { userId, content });
      }
    };

    for (const chapter of this.readArray<ChapterContent>(this.chaptersStorageKey)) {
      const ambiguousOwner = this.ambiguousLegacyChapterKeys().has(
        this.legacyChapterKey(chapter.storyId, chapter.chapterNumber),
      ) || (ownersByStoryId.get(chapter.storyId)?.size ?? 0) > 1;
      if (ambiguousOwner) {
        const key = `ambiguous\u0000${chapter.storyId}\u0000${chapter.chapterNumber}`;
        byOwnerAndChapter.set(key, { content: chapter, ambiguousOwner: true });
      } else {
        addChapter(chapter);
      }
    }
    for (const key of this.keysWithPrefix(this.accountChaptersStoragePrefix)) {
      const accountId = this.accountIdFromKey(key, this.accountChaptersStoragePrefix);
      for (const chapter of this.readArray<ChapterContent>(key)) {
        addChapter(chapter, accountId);
      }
    }
    return Array.from(byOwnerAndChapter.values());
  }
}
