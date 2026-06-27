import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storyStorage } from '../lib/storage';
import { Story, StoryWorld } from '../types';
import { useAppStore } from '../store/useAppStore';

export const storyKeys = {
  all: ['stories'] as const,
  detail: (id: string) => ['story', id] as const,
};

export function useStories() {
  return useQuery({
    queryKey: storyKeys.all,
    queryFn: async () => {
      const stories = await storyStorage.getStories();
      return stories;
    },
  });
}

export function useStory(storyId: string | null) {
  return useQuery({
    queryKey: storyKeys.detail(storyId || ''),
    queryFn: async () => {
      if (!storyId) return null;
      const story = await storyStorage.getStory(storyId);
      return story;
    },
    enabled: !!storyId,
  });
}

export function useActiveStory() {
  const activeStoryId = useAppStore(state => state.activeStoryId);
  return useStory(activeStoryId);
}

export function useSaveStories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updatedStories: StoryWorld[]) => {
      storyStorage.startTransaction();
      try {
        for (const s of updatedStories) {
          await storyStorage.saveStory(s);
        }
        await storyStorage.commitTransaction();
      } catch (e) {
        storyStorage.rollbackTransaction();
        throw e;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storyKeys.all });
    },
  });
}

export function useSaveStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (story: StoryWorld) => {
      await storyStorage.saveStory(story);
    },
    onSuccess: (_, story) => {
      queryClient.invalidateQueries({ queryKey: storyKeys.all });
      queryClient.invalidateQueries({ queryKey: storyKeys.detail(story.id) });
    },
  });
}

export function useDeleteStory() {
  const queryClient = useQueryClient();
  const setActiveStoryId = useAppStore(state => state.setActiveStoryId);
  const activeStoryId = useAppStore(state => state.activeStoryId);

  return useMutation({
    mutationFn: async (id: string) => {
      await storyStorage.deleteStory(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: storyKeys.all });
      if (activeStoryId === id) {
        setActiveStoryId(null);
      }
    },
  });
}

export function useUpdateChapter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ storyId, chapterNumber, updates }: { storyId: string; chapterNumber: number; updates: any }) => {
      const story = await storyStorage.getStory(storyId);
      if (!story) throw new Error("Story not found");

      if (story.arcs) {
        story.arcs = story.arcs.map((a: any) => {
          return {
            ...a,
            chapters: a.chapters.map((c: any) => {
              if (c.number === chapterNumber) {
                return { ...c, ...updates };
              }
              return c;
            }),
          };
        });
      }

      await storyStorage.saveStory(story);
    },
    onSuccess: (_, { storyId }) => {
      queryClient.invalidateQueries({ queryKey: storyKeys.all });
      queryClient.invalidateQueries({ queryKey: storyKeys.detail(storyId) });
    },
  });
}
