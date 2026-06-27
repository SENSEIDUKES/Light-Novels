import { useAppStore } from '../store/useAppStore';
import { retrieveRelevantContext, generateEmbedding } from '../lib/rag';
import { StoryWorld } from '../types';
import { storyStorage } from '../lib/storage';
import { awardQi } from '../lib/qi';
import { unlockCosmicArtifact } from '../lib/artifacts';
import { getApiHeaders, extractJsonBlocks } from './storyEngineHelpers';
import { useSaveStory } from './useStoryQueries';

/**
 * Hook responsible for streaming generation of an individual chapter.
 * Handles pacing logic, RAG history fetching, memory updating, and UI stream coordination.
 */
export const useChapterGeneration = () => {
  const store = useAppStore();
  const saveStoryMutation = useSaveStory();

  /**
   * Generates content and metadata for a specific chapter within the active story.
   * Leverages streaming from the backend to provide real-time reader feedback.
   * @param {number} chapterNumber - The index of the chapter to generate.
   */
  const handleGenerateChapter = async (chapterNumber: number) => {
    const currentStoreState = useAppStore.getState();
    if (currentStoreState.isGenerating) {
      console.warn("Generation already in progress. Ignoring duplicate click.");
      return;
    }
    // Synchronously set generating state on the global store before any async operations
    currentStoreState.setIsGenerating(true);
    currentStoreState.setGeneratingChapterNum(chapterNumber);

    const activeStoryId = currentStoreState.activeStoryId;
    if (!activeStoryId) {
      currentStoreState.setIsGenerating(false);
      currentStoreState.setGeneratingChapterNum(null);
      return;
    }
    const activeStory = await storyStorage.getStory(activeStoryId);
    if (!activeStory) {
      currentStoreState.setIsGenerating(false);
      currentStoreState.setGeneratingChapterNum(null);
      return;
    }
    
    currentStoreState.setGenerationPhase('chapter');
    currentStoreState.setAppError(null);

    const selectedArcIndex = activeStory.arcs.findIndex(arc => arc.chapters.some(c => c.number === chapterNumber));
    if (selectedArcIndex === -1) {
      currentStoreState.setIsGenerating(false);
      currentStoreState.setGeneratingChapterNum(null);
      return;
    }

    const currentArc = activeStory.arcs[selectedArcIndex];
    const targetChapter = currentArc.chapters.find(c => c.number === chapterNumber);
    if (!targetChapter) {
      currentStoreState.setIsGenerating(false);
      currentStoreState.setGeneratingChapterNum(null);
      return;
    }

    try {
      store.setActiveAgentId('scout');
      const apiHeaders = await getApiHeaders();

      const pastSummaries = await retrieveRelevantContext(
        targetChapter.premise || activeStory.customPremise,
        chapterNumber,
        activeStory,
        apiHeaders,
        5
      );

      store.setActiveAgentId('versa');
      const response = await fetch('/api/orchestrate-chapter', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          activeStory,
          chapterNumber,
          apiHeaders,
          routingConfig: store.routingConfig.storyMaker,
          pastSummaries
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Meridian clash in chapter generation. Status: ${response.status}`);
      }

      if (!response.body) throw new Error("No streaming body available.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let accumulatedRaw = "";
      let buffer = "";
      let streamError: Error | null = null;
      let finalStory: StoryWorld | null = null;
      let chapterData: any = null;

      const textHeader = "---CHAPTER_BLOCKS---";

      while(true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const parsed = JSON.parse(line.substring(6));
              if (parsed.error) {
                streamError = new Error(parsed.error);
                throw streamError;
              }
              if (parsed.type === 'complete') {
                finalStory = parsed.story;
                chapterData = parsed.chapterData;
              } else if (parsed.chunk) {
                accumulatedRaw += parsed.chunk;
                
                let currentChapterText = "";
                let blocksData: any[] = [];
                let rawBlocksStr = accumulatedRaw;

                if (accumulatedRaw.includes(textHeader)) {
                  const startIndex = accumulatedRaw.indexOf(textHeader) + textHeader.length;
                  rawBlocksStr = accumulatedRaw.substring(startIndex).trim();
                }

                blocksData = extractJsonBlocks(rawBlocksStr);
                
                if (blocksData.length > 0) {
                   currentChapterText = blocksData.map(b => b.text).join('\n\n');
                } else {
                   // Keep the text empty to show the fallback loading message instead of raw JSON
                   currentChapterText = "";
                }

                // Push real-time stream state to the UI store
                currentStoreState.setStreamingChapter({
                  number: chapterNumber,
                  content: currentChapterText || accumulatedRaw,
                  blocks: blocksData
                });
              }
            } catch (e: any) {
              if (streamError) {
                throw streamError;
              }
              if (e.message && e.message !== "Unexpected end of JSON input") {
                console.error("Stream parse error:", e);
              }
            }
          }
        }
      }

      if (streamError) throw streamError;

      if (!finalStory) {
        throw new Error("Backend stream ended prematurely before returning the updated story. Data might be incomplete.");
      }

      // Generate embedding for the new chapter (we do this client-side to keep RAG local)
      if (chapterData?.summary) {
        const newChapterEmbedding = await generateEmbedding(chapterData.summary, apiHeaders);
        const selectedArcIndex = finalStory.arcs.findIndex(arc => arc.chapters.some(c => c.number === chapterNumber));
        if (selectedArcIndex !== -1) {
           const chIndex = finalStory.arcs[selectedArcIndex].chapters.findIndex(c => c.number === chapterNumber);
           if (chIndex !== -1) {
              finalStory.arcs[selectedArcIndex].chapters[chIndex].embedding = newChapterEmbedding;
           }
        }
      }

      // Atomically save the updated story state returned by the backend
      await saveStoryMutation.mutateAsync(finalStory);
      awardQi('chapter_generated');
      
      // Scan chapter content for epic story-event artifacts
      import('../lib/artifacts').then(({ scanChapterForArtifacts }) => {
        const fullText = (chapterData?.chapterText || "") + " " + (chapterData?.blocks || []).map((b: any) => b.text).join(" ");
        scanChapterForArtifacts(finalStory!.id, finalStory!.title, chapterNumber, fullText, chapterData).catch((err) => {
          console.error("Failed to scan chapter for artifacts:", err);
        });
      });
      
      // Award Compass of Pathless Destinies on reaching Chapter 5
      if (chapterNumber === 5) {
        unlockCosmicArtifact('chapter_5', finalStory.id, finalStory.title).catch((err) => {
          console.error('Failed to unlock Chapter 5 artifact:', err);
        });
      }

    } catch (err: any) {
      console.error(err);
      store.setAppError(err.message || "Celestial feedback received. Chapter generation failed.");
    } finally {
      store.setIsGenerating(false);
      store.setGenerationPhase(null);
      store.setGeneratingChapterNum(null);
      store.setActiveAgentId(null);
      store.setStreamingChapter(null);
    }
  };

  return { handleGenerateChapter };
};
