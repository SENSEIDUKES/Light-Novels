import { useAppStore } from '../store/useAppStore';
import { retrieveRelevantContext } from '../lib/rag';
import { Chapter, StoryArc, StoryWorld } from '../types';
import { storyStorage } from '../lib/storage';
import { awardQi } from '../lib/qi';
import { getApiHeaders } from './storyEngineHelpers';

export const useArcSteering = () => {
  const store = useAppStore();

  const handleSteerArc = async (direction: string, customPrompt: string) => {
    const activeStory = store.stories.find(s => s.id === store.activeStoryId);
    if (!activeStory) return;
    store.setGenerationPhase('steer');
    store.setIsGenerating(true);
    store.setAppError(null);

    const totalPreviousChapters = activeStory.arcs.reduce((acc, arc) => acc + arc.chapters.length, 0);
    const queryIntent = `Overall Arc Direction: ${direction}. Extra Context: ${customPrompt || ''}`;
    const nextChapterNumber = totalPreviousChapters + 1;
    
    try {
      store.setActiveAgentId('scout');
      const apiHeaders = await getApiHeaders();

      const pastSummaries = await retrieveRelevantContext(
        queryIntent,
        nextChapterNumber,
        activeStory,
        apiHeaders,
        10 
      );

      store.setActiveAgentId('versa');
      const response = await fetch('/api/steer-arc', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          mcName: activeStory.mcName,
          genre: activeStory.genre,
          customPremise: activeStory.customPremise,
          memory: activeStory.memory,
          pastSummaries,
          currentArcCount: totalPreviousChapters,
          steerDirection: direction,
          userCustomDirections: customPrompt,
          routingConfig: store.routingConfig.storyMaker
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Story steering broke with status: ${response.status}`);
      }

      const data = await response.json();

      const nextChapters: Chapter[] = data.chapters.map((ch: any) => ({
        number: ch.number,
        title: ch.title,
        premise: ch.premise,
        status: 'unread'
      }));

      const newArc: StoryArc = {
        title: data.title || `Volume ${activeStory.arcs.length + 1}`,
        chapters: nextChapters,
        isCompleted: false
      };

      const freshStories = await storyStorage.getStories();
      const updatedStories = freshStories.map(s => {
        if (s.id !== activeStory.id) return s;

        const nextStoriesMemory = { ...s.memory };

        if (data.newCharacters && data.newCharacters.length > 0) {
          const verified = data.newCharacters.map((c: any) => ({
            id: `char-${Math.random().toString(36).substr(2, 9)}`,
            ...c,
            status: c.status || 'alive'
          }));
          nextStoriesMemory.characters = [...(nextStoriesMemory.characters || []), ...verified];
        }

        if (data.newUnresolvedPlotThreads && data.newUnresolvedPlotThreads.length > 0) {
          const newThreads = data.newUnresolvedPlotThreads.map((t: string) => ({
            id: `thread-${Math.random().toString(36).substr(2, 9)}`,
            description: t,
            status: 'active',
            originChapter: nextChapters[0]?.number || activeStory.currentChapterNumber
          }));
          nextStoriesMemory.unresolvedPlotThreads = [...(nextStoriesMemory.unresolvedPlotThreads || []), ...newThreads];
        }

        return {
          ...s,
          arcs: [...s.arcs, newArc],
          memory: nextStoriesMemory,
          updatedAt: new Date().toISOString()
        };
      });

      await store.saveStories(updatedStories);
      store.setSelectedChapterNum(nextChapters[0].number);
    } catch (err: any) {
      console.error(err);
      store.setAppError(err.message || "Failed to steer next story arc successfully.");
    } finally {
      store.setIsGenerating(false);
      store.setGenerationPhase(null);
      store.setActiveAgentId(null);
    }
  };

  const handleAlterFate = async (chapterNumber: number, direction: string, customPrompt: string) => {
    const activeStory = store.stories.find(s => s.id === store.activeStoryId);
    if (!activeStory) return;
    
    const clonedArcsRaw = await Promise.all(activeStory.arcs.map(async arc => {
      const slicedChapters = arc.chapters.filter(ch => ch.number <= chapterNumber);
      const hydratedChapters = await Promise.all(slicedChapters.map(async ch => {
        if (ch.hasContent || ch.generatedContent) {
          const content = await storyStorage.getChapterContent(activeStory.id, ch.number);
          if (content) {
            return {
              ...ch,
              generatedContent: content.generatedContent,
              blocks: content.blocks,
              summary: content.summary,
              statsChangeMessage: content.statsChangeMessage,
              cuePayload: content.cuePayload,
              _isNewContent: true
            };
          }
        }
        return ch;
      }));
      return { ...arc, chapters: hydratedChapters };
    }));
    
    const clonedArcs = clonedArcsRaw.filter(arc => arc.chapters.length > 0);

    const clonedBookmarks = (activeStory.bookmarks || []).filter(b => b.chapterNumber <= chapterNumber);

    const newStoryId = `story-${Date.now()}-fork`;
    const newStory: StoryWorld = {
      ...activeStory,
      id: newStoryId,
      parentStoryId: activeStory.id,
      forkChapterNumber: chapterNumber,
      title: `[Fate Fork] ${activeStory.title}`,
      arcs: clonedArcs,
      bookmarks: clonedBookmarks,
      updatedAt: new Date().toISOString()
    };

    const updated = [newStory, ...store.stories];
    await store.saveStories(updated);
    store.setActiveStoryId(newStory.id);
    
    store.setGenerationPhase('steer');
    store.setIsGenerating(true);
    store.setAppError(null);

    const totalPreviousChapters = clonedArcs.reduce((acc, arc) => acc + arc.chapters.length, 0);
    const queryIntent = `Overall Arc Direction: ${direction}. Extra Context: ${customPrompt || ''}`;
    const nextChapterNumber = totalPreviousChapters + 1;
    
    try {
      store.setActiveAgentId('scout');
      const apiHeaders = await getApiHeaders();

      const pastSummaries = await retrieveRelevantContext(
        queryIntent,
        nextChapterNumber,
        newStory,
        apiHeaders,
        10 
      );

      store.setActiveAgentId('versa');
      const response = await fetch('/api/steer-arc', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          mcName: newStory.mcName,
          genre: newStory.genre,
          customPremise: newStory.customPremise,
          memory: newStory.memory,
          pastSummaries,
          currentArcCount: clonedArcs.length,
          steerDirection: direction,
          userCustomDirections: customPrompt,
          routingConfig: store.routingConfig.storyMaker
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Story fork broke with status: ${response.status}`);
      }

      const data = await response.json();

      const nextChapters: Chapter[] = data.chapters.map((ch: any) => ({
        number: ch.number,
        title: ch.title,
        premise: ch.premise,
        status: 'unread'
      }));

      const newArc: StoryArc = {
        title: data.title || `Vivergence Path`,
        chapters: nextChapters,
        isCompleted: false
      };

      const freshStories = await storyStorage.getStories();
      const updatedStories = freshStories.map((s: StoryWorld) => {
        if (s.id !== newStory.id) return s;

        const nextStoriesMemory = { ...s.memory };

        if (data.newCharacters && data.newCharacters.length > 0) {
          const verified = data.newCharacters.map((c: any) => ({
            id: `char-${Math.random().toString(36).substr(2, 9)}`,
            ...c,
            status: c.status || 'alive'
          }));
          nextStoriesMemory.characters = [...(nextStoriesMemory.characters || []), ...verified];
        }

        if (data.newUnresolvedPlotThreads && data.newUnresolvedPlotThreads.length > 0) {
          const newThreads = data.newUnresolvedPlotThreads.map((t: string) => ({
            id: `thread-${Math.random().toString(36).substr(2, 9)}`,
            description: t,
            status: 'active',
            originChapter: nextChapters[0]?.number || chapterNumber
          }));
          nextStoriesMemory.unresolvedPlotThreads = [...(nextStoriesMemory.unresolvedPlotThreads || []), ...newThreads];
        }

        return {
          ...s,
          arcs: [...s.arcs, newArc],
          memory: nextStoriesMemory,
          updatedAt: new Date().toISOString()
        };
      });

      await store.saveStories(updatedStories);
      store.setSelectedChapterNum(nextChapters[0].number);
      awardQi('branch_created');
    } catch (err: any) {
      console.error(err);
      store.setAppError(err.message || "Failed to alter fate successfully.");
    } finally {
      store.setIsGenerating(false);
      store.setGenerationPhase(null);
      store.setActiveAgentId(null);
    }
  };

  return { handleSteerArc, handleAlterFate };
};
