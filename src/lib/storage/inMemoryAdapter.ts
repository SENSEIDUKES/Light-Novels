import { StorageAdapter } from "./types";
import { StoryWorld, ChapterContent } from "../../types";

export class InMemoryFallbackAdapter implements StorageAdapter {
    name = 'InMemory';
    private stories: StoryWorld[] = [];
    private chapters: ChapterContent[] = [];
    private audioBlobs: Map<string, Blob> = new Map();

    async init(): Promise<void> {
        return Promise.resolve();
    }

    async getStories(): Promise<StoryWorld[]> {
        return [...this.stories].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    async getStory(id: string): Promise<StoryWorld | null> {
        return this.stories.find((s) => s.id === id) || null;
    }

    async saveStory(story: StoryWorld): Promise<void> {
        const existingIndex = this.stories.findIndex((s) => s.id === story.id);
        if (existingIndex > -1) {
          this.stories[existingIndex] = story;
        } else {
          this.stories.push(story);
        }
    }

    async deleteStory(id: string): Promise<void> {
        this.stories = this.stories.filter((s) => s.id !== id);
    }

    async clearAll(): Promise<void> {
        this.stories = [];
        this.chapters = [];
        this.audioBlobs.clear();
    }

    async getAudioBlob(url: string): Promise<Blob | null> {
        return this.audioBlobs.get(url) || null;
    }

    async saveAudioBlob(url: string, blob: Blob): Promise<void> {
        this.audioBlobs.set(url, blob);
    }

    async getChapterContent(storyId: string, chapterNumber: number): Promise<ChapterContent | null> {
        return this.chapters.find((c) => c.storyId === storyId && c.chapterNumber === chapterNumber) || null;
    }

    async saveChapterContent(content: ChapterContent): Promise<void> {
        const existingIndex = this.chapters.findIndex((c) => c.storyId === content.storyId && c.chapterNumber === content.chapterNumber);
        if (existingIndex > -1) {
          this.chapters[existingIndex] = content;
        } else {
          this.chapters.push(content);
        }
    }
}
