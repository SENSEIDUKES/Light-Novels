import { StoryWorld } from '../types';
import { StorageAdapter } from './storage';
import { supabase } from './supabase';

export class SupabaseStorageAdapter implements StorageAdapter {
  name = 'Supabase';
  private collectionName = 'stories';

  async init(): Promise<void> {
    return Promise.resolve();
  }

  private async getUserId(): Promise<string | null> {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  }

  async getStories(): Promise<StoryWorld[]> {
    if (!supabase) return [];
    const userId = await this.getUserId();
    if (!userId) return [];
    
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('payload')
        .eq('user_id', userId);

      if (error) throw error;

      const stories = (data || []).map(row => row.payload as StoryWorld);
      stories.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      return stories;
    } catch (error) {
      console.error('Supabase list stories error:', error);
      return [];
    }
  }

  async getStory(id: string): Promise<StoryWorld | null> {
    if (!supabase) return null;
    const userId = await this.getUserId();
    if (!userId) return null;
    
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('payload')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') return null; // not found
        throw error;
      }

      return data?.payload as StoryWorld;
    } catch (error) {
       console.error(`Supabase get story error [${id}]:`, error);
       return null;
    }
  }

  async saveStory(story: StoryWorld): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');
    const userId = await this.getUserId();
    if (!userId) throw new Error('Cannot save to Supabase without authentication');
    
    try {
      const payload = {
        ...story,
        deleted: story.deleted || false,
      };
      
      const { error } = await supabase
        .from('stories')
        .upsert({
          id: story.id,
          user_id: userId,
          payload: payload,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (error) throw error;
    } catch (error) {
      console.error(`Supabase save story error [${story.id}]:`, error);
    }
  }

  async deleteStory(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');
    const userId = await this.getUserId();
    if (!userId) throw new Error('Cannot delete from Supabase without authentication');
    
    try {
      // Delete chapters first
      await supabase
        .from('chapters')
        .delete()
        .eq('story_id', id)
        .eq('user_id', userId);

      // Delete story
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error(`Supabase delete story error [${id}]:`, error);
    }
  }

  async getChapterContent(storyId: string, chapterNumber: number): Promise<any | null> {
    if (!supabase) return null;
    const userId = await this.getUserId();
    if (!userId) return null;
    
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('payload')
        .eq('story_id', storyId)
        .eq('chapter_number', chapterNumber)
        .eq('user_id', userId)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data?.payload;
    } catch (error) {
       console.error(`Supabase get chapter error [${storyId}/${chapterNumber}]:`, error);
       return null;
    }
  }

  async saveChapterContent(content: any): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');
    const userId = await this.getUserId();
    if (!userId) throw new Error('Cannot save to Supabase without authentication');
    
    try {
      const { error } = await supabase
        .from('chapters')
        .upsert({
          story_id: content.storyId,
          chapter_number: content.chapterNumber,
          user_id: userId,
          payload: content,
          updated_at: new Date().toISOString()
        }, { onConflict: 'story_id, chapter_number' });

      if (error) throw error;
    } catch (error) {
      console.error(`Supabase save chapter error [${content.storyId}/${content.chapterNumber}]:`, error);
    }
  }

  async wipeMyCloudData(): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');
    const userId = await this.getUserId();
    if (!userId) throw new Error('Cannot wipe data without authentication');
    
    try {
      // Because we have ON DELETE CASCADE or just delete everything for the user
      await supabase.from('chapters').delete().eq('user_id', userId);
      const { error } = await supabase.from('stories').delete().eq('user_id', userId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Supabase wipe cloud data error:', error);
    }
  }

  async clearAll(): Promise<void> {
    throw new Error("clearAll not supported on Supabase adapter directly for safety");
  }
}

export const supabaseStorage = new SupabaseStorageAdapter();
