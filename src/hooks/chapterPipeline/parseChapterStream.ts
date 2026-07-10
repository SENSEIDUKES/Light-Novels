import { extractJsonBlocks } from '../storyEngineHelpers';

export const parseChapterStream = (accumulatedRaw: string) => {
  const data: any = { chapterText: "", blocks: [], summary: "", statsChangeMessage: "None", memoryUpdates: {} };
  
  const textHeader = "---CHAPTER_BLOCKS---";
  let rawBlocksStr = accumulatedRaw;

  if (accumulatedRaw.includes(textHeader)) {
    const startIndex = accumulatedRaw.indexOf(textHeader) + textHeader.length;
    rawBlocksStr = accumulatedRaw.substring(startIndex).trim();
  }

  const parsedBlocks = extractJsonBlocks(rawBlocksStr);
  data.blocks = parsedBlocks;
  
  if (parsedBlocks.length > 0) {
    data.chapterText = parsedBlocks.map((b: any) => b.text).join('\n\n');
  } else {
    data.chapterText = rawBlocksStr.replace(/```json/gi, '').replace(/```/g, '').trim();
  }
  
  if (!data.chapterText) {
    data.chapterText = accumulatedRaw;
  }

  // Safeguard against missing/abruptly cut stream content to avoid silent incomplete saves
  if (!data.chapterText || data.chapterText.trim().length < 150) {
    throw new Error("Celestial stream dissipated prematurely. Chapter content is incomplete; creation has been safeguarded.");
  }

  return { data, finalRawBlocksStr: rawBlocksStr };
};
