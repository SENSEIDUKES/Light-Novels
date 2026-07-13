import { StoryWorld, ChapterContent } from "../../types";

/**
 * StorageAdapter defines the contract for persistent story memory.
 * This separates the storage logic from UI/logic components,
 * enabling easy drop-in cloud synchronization in the future.
 */
export interface StorageAdapter {
    name: string;
    init(): Promise<void>;
    /**
     * Select the Firebase account whose local records are visible.
     *
     * - A user id exposes that account plus unowned legacy records so they can
     *   be claimed once.
     * - `null` is the signed-out privacy scope and exposes only unowned data.
     * - Adapters that have not been scoped retain the legacy/local-only view.
     */
    setAccountScope?(userId: string | null | undefined): void | Promise<void>;
    getStories(): Promise<StoryWorld[]>;
    getStory(id: string): Promise<StoryWorld | null>;
    saveStory(story: StoryWorld): Promise<void>;
    deleteStory(id: string): Promise<void>;
    clearAll?(): Promise<void>;
    getChapterContent(storyId: string, chapterNumber: number): Promise<ChapterContent | null>;
    saveChapterContent(content: ChapterContent): Promise<void>;
    /** Complete owner-tagged chapter enumeration used only for adapter migration. */
    getAllChapterContents?(): Promise<AccountScopedChapterContent[]>;
    getAudioBlob?(url: string): Promise<Blob | null>;
    saveAudioBlob?(url: string, blob: Blob): Promise<void>;
}

export interface SyncTask {
    type: 'story' | 'chapter' | 'delete_story';
    storyId: string;
    chapterNumber?: number;
    timestamp: number;
    /** Auth account that owns this outbox entry. Unowned legacy entries are claimed once. */
    userId?: string;
    /** Immutable enqueue version used to avoid acknowledging a newer in-flight save. */
    generation?: number;
    /** Number of failed cloud-sync attempts; retained for diagnostics and retry visibility. */
    attempts?: number;
    /**
     * A chapter body was queued with this story. Keep the story task until a
     * fresh parent write has notified other devices after the chapter upload.
     */
    requiresPostChapterHeartbeat?: boolean;
}

export interface AccountScopedChapterContent {
    userId?: string;
    content: ChapterContent;
    /** Ownership could not be inferred safely from legacy storage. Do not auto-claim. */
    ambiguousOwner?: boolean;
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export type SyncProgressPhase =
  | 'initializing'
  | 'cataloguing'
  | 'downloading'
  | 'harmonizing-stories'
  | 'harmonizing-chapters'
  | 'sealing'
  | 'complete'
  | 'error';

export interface SyncProgress {
  phase: SyncProgressPhase;
  completed: number;
  total: number;
}
