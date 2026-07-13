import { AccountScopedChapterContent, StorageAdapter } from "./types";
import { StoryWorld, ChapterContent } from "../../types";

export class InMemoryFallbackAdapter implements StorageAdapter {
    name = 'InMemory';
    private stories: StoryWorld[] = [];
    private chapters: Array<{ accountId?: string; content: ChapterContent }> = [];
    private audioBlobs: Map<string, Blob> = new Map();
    /** `undefined` preserves the legacy/local-only all-records view. */
    private accountScope: string | null | undefined;

    setAccountScope(userId: string | null | undefined): void {
        this.accountScope = userId;
    }

    private storyIsVisible(story: StoryWorld, scope: string | null | undefined): boolean {
        if (scope === undefined) return true;
        if (scope === null) return !story.userId;
        return !story.userId || story.userId === scope;
    }

    async init(): Promise<void> {
        return Promise.resolve();
    }

    async getStories(): Promise<StoryWorld[]> {
        const scope = this.accountScope;
        if (scope === undefined) {
          const byOwnerAndId = new Map<string, StoryWorld>();
          for (const story of this.stories) {
            const key = `${story.userId ?? ""}\u0000${story.id}`;
            const existing = byOwnerAndId.get(key);
            if (!existing || new Date(story.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
              byOwnerAndId.set(key, story);
            }
          }
          return Array.from(byOwnerAndId.values()).sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          );
        }
        const byId = new Map<string, StoryWorld>();
        for (const story of this.stories.filter((candidate) => this.storyIsVisible(candidate, scope))) {
          const existing = byId.get(story.id);
          if (
            !existing ||
            (typeof scope === "string" && story.userId === scope && existing.userId !== scope) ||
            new Date(story.updatedAt).getTime() > new Date(existing.updatedAt).getTime()
          ) {
            byId.set(story.id, story);
          }
        }
        return Array.from(byId.values()).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    async getStory(id: string): Promise<StoryWorld | null> {
        const scope = this.accountScope;
        const candidates = this.stories.filter(
          (story) => story.id === id && this.storyIsVisible(story, scope),
        );
        if (typeof scope === "string") {
          const scoped = candidates.find((story) => story.userId === scope);
          if (scoped) return scoped;
        }
        candidates.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
        return candidates[0] || null;
    }

    async saveStory(story: StoryWorld): Promise<void> {
        const scope = this.accountScope;
        if (typeof scope === "string" && story.userId && story.userId !== scope) {
          throw new Error("Cannot save a story outside the active account scope");
        }
        const accountId = story.userId ?? (typeof scope === "string" ? scope : undefined);
        const savedStory = accountId && !story.userId ? { ...story, userId: accountId } : story;
        const claimedLegacy = Boolean(
          accountId && this.stories.some(
            (candidate) => candidate.id === story.id && !candidate.userId,
          ),
        );
        const existingIndex = this.stories.findIndex(
          (candidate) => candidate.id === story.id && candidate.userId === accountId,
        );
        if (existingIndex > -1) {
          this.stories[existingIndex] = savedStory;
        } else {
          this.stories.push(savedStory);
        }
        if (accountId && claimedLegacy) {
          this.stories = this.stories.filter(
            (candidate) =>
              candidate.id !== story.id || Boolean(candidate.userId),
          );
          for (const chapter of this.chapters) {
            if (!chapter.accountId && chapter.content.storyId === story.id) {
              chapter.accountId = accountId;
            }
          }
        }
    }

    async deleteStory(id: string): Promise<void> {
        const scope = this.accountScope;
        const selectedOwner = scope === undefined
          ? this.stories
              .filter((story) => story.id === id)
              .sort(
                (a, b) =>
                  new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
              )[0]?.userId
          : undefined;
        this.stories = this.stories.filter(
          (story) =>
            story.id !== id ||
            (scope === undefined
              ? story.userId !== selectedOwner
              : !this.storyIsVisible(story, scope)),
        );
        this.chapters = this.chapters.filter((chapter) => {
          if (chapter.content.storyId !== id) return true;
          if (scope === undefined) return chapter.accountId !== selectedOwner;
          if (scope === null) return Boolean(chapter.accountId);
          return Boolean(chapter.accountId && chapter.accountId !== scope);
        });
    }

    async clearAll(): Promise<void> {
        const scope = this.accountScope;
        if (scope === undefined) {
          this.stories = [];
          this.chapters = [];
          this.audioBlobs.clear();
          return;
        }
        this.stories = this.stories.filter(
          (story) => !this.storyIsVisible(story, scope),
        );
        this.chapters = this.chapters.filter((chapter) => {
          if (scope === null) return Boolean(chapter.accountId);
          return Boolean(chapter.accountId && chapter.accountId !== scope);
        });
    }

    async getAudioBlob(url: string): Promise<Blob | null> {
        return this.audioBlobs.get(url) || null;
    }

    async saveAudioBlob(url: string, blob: Blob): Promise<void> {
        this.audioBlobs.set(url, blob);
    }

    async getChapterContent(storyId: string, chapterNumber: number): Promise<ChapterContent | null> {
        const scope = this.accountScope;
        const selectedOwner = scope === undefined
          ? this.stories
              .filter((story) => story.id === storyId)
              .sort(
                (a, b) =>
                  new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
              )[0]?.userId
          : undefined;
        const candidates = this.chapters.filter(
          (chapter) =>
            chapter.content.storyId === storyId &&
            chapter.content.chapterNumber === chapterNumber &&
            (scope === undefined
              ? chapter.accountId === selectedOwner
              :
              (chapter.accountId
                ? typeof scope === "string" && chapter.accountId === scope
                : this.stories.some(
                    (story) => story.id === storyId && !story.userId,
                  ))),
        );
        if (typeof scope === "string") {
          const scoped = candidates.find((chapter) => chapter.accountId === scope);
          if (scoped) return scoped.content;
        }
        return candidates[0]?.content || null;
    }

    async saveChapterContent(content: ChapterContent): Promise<void> {
        const scope = this.accountScope;
        let accountId = typeof scope === "string" ? scope : undefined;
      if (scope === undefined) {
          accountId = this.stories
            .filter((story) => story.id === content.storyId)
            .sort(
              (a, b) =>
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
            )[0]?.userId;
      }
        const existingIndex = this.chapters.findIndex(
          (chapter) =>
            chapter.accountId === accountId &&
            chapter.content.storyId === content.storyId &&
            chapter.content.chapterNumber === content.chapterNumber,
        );
        if (existingIndex > -1) {
          this.chapters[existingIndex] = { accountId, content };
        } else {
          this.chapters.push({ accountId, content });
        }
    }

    async getAllChapterContents(): Promise<AccountScopedChapterContent[]> {
        return this.chapters.map(({ accountId: userId, content }) => ({
          userId,
          content,
        }));
    }
}
