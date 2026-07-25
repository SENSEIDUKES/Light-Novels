import { StoryWorld, ChapterContent } from "../../types";

/** Exact remote version observed by a synchronization read. */
export interface CloudRevisionExpectation {
    exists: boolean;
    updatedAt: string | null;
    /** Optional only while legacy records without app revisions still exist. */
    syncRevision?: string | null;
}

/**
 * Parent-story revision reported by a chapter write. The PostgreSQL chapter
 * mutation advances the Story aggregate in the same transaction, so the local
 * replica must adopt the new revision instead of silently falling behind it.
 */
export interface ParentStoryRevision {
    updatedAt: string;
    syncRevision: string | null;
}

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
    /**
     * Remove a single chapter body. Used to roll a local write back when its
     * durable outbox enqueue fails, so a chapter can never persist locally
     * without a queued sync. Optional: adapters that predate this stay usable.
     */
    deleteChapterContent?(storyId: string, chapterNumber: number): Promise<void>;
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
    /**
     * Stable identity for this exact mutation generation. Retries reuse it;
     * coalescing a newer local edit creates a new key.
     */
    idempotencyKey?: string;
    /** Number of failed cloud-sync attempts; retained for diagnostics and retry visibility. */
    attempts?: number;
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
