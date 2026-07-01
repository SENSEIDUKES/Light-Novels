import { StorageAdapter } from "./types";
import { StoryWorld, ChapterContent } from "../../types";

/**
 * Resilient LocalStorage fallback adapter used when IndexedDB is restricted inside frames
 * or private browsing.
 */
export class LocalStorageFallbackAdapter implements StorageAdapter {
    name = 'LocalStorage';
    private storageKey = '@seihouse/fiction-generator-stories-v2';
    private chaptersStorageKey = '@seihouse/fiction-generator-chapters-v2';

    async init(): Promise<void> {
        try {
          localStorage.setItem('__test_ls_availability__', 'test');
          localStorage.removeItem('__test_ls_availability__');
        } catch (e) {
          throw new Error('LocalStorage is not available');
        }

        return Promise.resolve();
    }

    async getStories(): Promise<StoryWorld[]> {
        try {
          const saved = localStorage.getItem(this.storageKey);
          if (saved) {
            const stories = JSON.parse(saved) as StoryWorld[];
            stories.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            return stories;
          }
        } catch (e) {
          console.error('LocalStorage fallback read error:', e);
        }

        return [];
    }

    async getStory(id: string): Promise<StoryWorld | null> {
        const stories = await this.getStories();
        return stories.find((s) => s.id === id) || null;
    }

    async saveStory(story: StoryWorld): Promise<void> {
        const stories = await this.getStories();
        const existingIndex = stories.findIndex((s) => s.id === story.id);
        if (existingIndex > -1) {
          stories[existingIndex] = story;
        } else {
          stories.push(story);
        }

        try {
          localStorage.setItem(this.storageKey, JSON.stringify(stories));
        } catch (e: any) {
          console.warn('LocalStorage Quota exceeded, stripping large fields...', e);
          // Fallback: strip images to save space
          const stripped = stories.map(s => {
             const copy = JSON.parse(JSON.stringify(s));
             delete copy.imageUrl;
             delete copy.imageHistory;
             if (copy.memory) {
                if (copy.memory.characters) copy.memory.characters.forEach((c: any) => { delete c.imageUrl; delete c.imageHistory; });
                if (copy.memory.locations) copy.memory.locations.forEach((l: any) => { delete l.imageUrl; delete l.imageHistory; });
                if (copy.memory.artifacts) copy.memory.artifacts.forEach((a: any) => { delete a.imageUrl; delete a.imageHistory; });
             }
             if (copy.arcs) {
               copy.arcs.forEach((arc: any) => {
                 if (arc.chapters) {
                   arc.chapters.forEach((ch: any) => {
                     if (ch.assetManifest) delete ch.assetManifest.heroImage;
                   });
                 }
               });
             }
             return copy;
          });
          
          try {
            localStorage.setItem(this.storageKey, JSON.stringify(stripped));
          } catch (err2) {
            console.error('Even stripped stories exceeded quota. Removing older stories...');
            // If still exceeding, keep only the most recent 2 stories
            stripped.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            const reduced = stripped.slice(0, 2);
            try {
              localStorage.setItem(this.storageKey, JSON.stringify(reduced));
            } catch (err3) {
              console.error('Completely out of local storage space!', err3);
            }
          }
        }
    }

    async deleteStory(id: string): Promise<void> {
        const stories = await this.getStories();
        const updated = stories.filter((s) => s.id !== id);
        try {
          localStorage.setItem(this.storageKey, JSON.stringify(updated));
        } catch (e) {
          console.error('LocalStorage fallback delete error:', e);
        }

        try {
          const chaptersStr = localStorage.getItem(this.chaptersStorageKey);
          if (chaptersStr) {
            let chapters = JSON.parse(chaptersStr) as ChapterContent[];
            chapters = chapters.filter(c => c.storyId !== id);
            localStorage.setItem(this.chaptersStorageKey, JSON.stringify(chapters));
          }
        } catch (e) {
          console.error('LocalStorage chapters delete error:', e);
        }
    }

    async clearAll(): Promise<void> {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.chaptersStorageKey);
    }

    async getAudioBlob(_url: string): Promise<Blob | null> {
        return null;
    }

    async saveAudioBlob(_url: string, _blob: Blob): Promise<void> {
    }

    async getChapterContent(storyId: string, chapterNumber: number): Promise<ChapterContent | null> {
        try {
          const saved = localStorage.getItem(this.chaptersStorageKey);
          if (saved) {
            const chapters = JSON.parse(saved) as ChapterContent[];
            return chapters.find((c: ChapterContent) => c.storyId === storyId && c.chapterNumber === chapterNumber) || null;
          }
        } catch (e) {
          console.error('LocalStorage fallback read error:', e);
        }

        return null;
    }

    async saveChapterContent(content: ChapterContent): Promise<void> {
        try {
          const saved = localStorage.getItem(this.chaptersStorageKey);
          let chapters: ChapterContent[] = [];
          if (saved) {
            chapters = JSON.parse(saved) as ChapterContent[];
          }
          const existingIndex = chapters.findIndex((c: ChapterContent) => c.storyId === content.storyId && c.chapterNumber === content.chapterNumber);
          if (existingIndex > -1) {
            chapters[existingIndex] = content;
          } else {
            chapters.push(content);
          }
          
          try {
              localStorage.setItem(this.chaptersStorageKey, JSON.stringify(chapters));
          } catch (e: any) {
              console.warn('LocalStorage chapters quota exceeded, removing older chapters...', e);
              // Keep only the most recent 5 chapters for this fallback
              chapters.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
              const reduced = chapters.slice(0, 5);
              try {
                  localStorage.setItem(this.chaptersStorageKey, JSON.stringify(reduced));
              } catch (err2) {
                  console.error('Reduced chapters still exceed quota!', err2);
              }
          }
        } catch (e) {
          console.error('LocalStorage save error:', e);
        }
    }
}
