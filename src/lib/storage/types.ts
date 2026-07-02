import { StoryWorld, ChapterContent } from "../../types";

/**
 * StorageAdapter defines the contract for persistent story memory.
 * This separates the storage logic from UI/logic components,
 * enabling easy drop-in cloud synchronization in the future.
 */
export interface StorageAdapter {
    name: string;
    init(): Promise<void>;
    getStories(): Promise<StoryWorld[]>;
    getStory(id: string): Promise<StoryWorld | null>;
    saveStory(story: StoryWorld): Promise<void>;
    deleteStory(id: string): Promise<void>;
    clearAll(): Promise<void>;
    getChapterContent(storyId: string, chapterNumber: number): Promise<ChapterContent | null>;
    saveChapterContent(content: ChapterContent): Promise<void>;
    getAudioBlob?(url: string): Promise<Blob | null>;
    saveAudioBlob?(url: string, blob: Blob): Promise<void>;
}

export interface SyncTask {
    type: 'story' | 'chapter' | 'delete_story';
    storyId: string;
    chapterNumber?: number;
    timestamp: number;
    /** Number of failed cloud-sync attempts; used to give up on a permanently-failing task. */
    attempts?: number;
}

export interface SyncAuditResult {
    localStories: number;
    cloudStories: number;
    mismatches: string[];
    missingChapters: string[];
    pendingWrites: number;
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
