import { Story, Chapter, ContextBlock, ContextManifest } from '../../types';
import { extractJsonBlocks } from '../storyEngineHelpers';
import { slimMemoryForRequest } from '../../lib/slimMemoryForRequest';
import { ACTIVE_CONTEXT_ENGINE } from '../../lib/contextBlocks';

export const streamChapterBlocks = async (
  activeStory: Story,
  targetChapter: Chapter,
  pastSummaries: ContextBlock[],
  pacingDirective: string,
  routingConfig: any,
  apiHeaders: any,
  onStreamProgress: (currentChapterText: string, blocksData: any[], accumulatedRaw: string) => void
) => {
  const response = await fetch('/api/generate-chapter-stream', {
    method: 'POST',
    headers: apiHeaders,
    body: JSON.stringify({
      mcName: activeStory.mcName,
      genre: activeStory.genre,
      customPremise: activeStory.customPremise,
      // Strip base64 media / embeddings so the body stays under the hosting edge's
      // ~4.5 MB request cap — the prompt is text-only. (Fixes HTTP 413 on generation.)
      memory: slimMemoryForRequest(activeStory.memory),
      pastSummaries,
      contextEngine: ACTIVE_CONTEXT_ENGINE,
      hardcoreFateMode: activeStory.hardcoreFateMode,
      fatePressure: activeStory.fatePressure,
      pacingDirective,
      currentChapter: {
        number: targetChapter.number,
        title: targetChapter.title,
        premise: targetChapter.premise
      },
      routingConfig,
      styleBible: activeStory.blueprint?.styleBible,
      tropeRules: activeStory.blueprint?.tropeRules,
      storyTags: activeStory.intake?.storyTags
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Meridian clash in chapter generation. Status: ${response.status}`);
  }

  if (!response.body) throw new Error("No streaming body available.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let accumulatedRaw = "";
  let buffer = "";
  let streamError: Error | null = null;
  let contextManifest: ContextManifest | undefined;

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
          if (parsed.contextManifest) {
            contextManifest = parsed.contextManifest as ContextManifest;
          }
          if (parsed.chunk) {
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
               currentChapterText = blocksData.map((b: any) => b.text).join('\n\n');
            } else {
               currentChapterText = "";
            }

            onStreamProgress(currentChapterText, blocksData, accumulatedRaw);
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

  return { accumulatedRaw, contextManifest };
};
