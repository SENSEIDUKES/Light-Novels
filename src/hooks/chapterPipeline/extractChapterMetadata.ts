import { isPlaceholderSummary } from '../../lib/summaryIntegrity';
import {
  sanitizeChapterHandoff,
  sanitizeContractReport,
} from '../../lib/chapterHandoff';
import { ChapterContract } from '../../types';

const buildChapterTextFallbackSummary = (chapterText: string | undefined | null) => {
  if (!chapterText) return "";
  let fallbackSummary = chapterText.substring(0, 300).trim() + "...";
  if (fallbackSummary.includes('\n')) {
    fallbackSummary = fallbackSummary.split('\n')[0];
  }
  return fallbackSummary;
};

export const extractChapterMetadata = async (
  targetChapter: any,
  finalRawBlocksStr: string,
  routingConfig: any,
  apiHeaders: any,
  data: any,
  contract?: ChapterContract,
) => {
  let finalData = { ...data };

  try {
    const extractResponse = await fetch('/api/extract-chapter-metadata', {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify({
        chapterNumber: targetChapter.number,
        title: targetChapter.title,
        chapterText: finalRawBlocksStr,
        routingConfig,
        contract,
      })
    });

    if (!extractResponse.ok) {
       console.warn("Failed to extract chapter metadata explicitly. Setting defaults.");
       finalData.summary = buildChapterTextFallbackSummary(data.chapterText);
    } else {
       const extractedData = await extractResponse.json();
       finalData = { ...finalData, ...extractedData };
    }
  } catch (err) {
    console.warn("Error during metadata extraction", err);
    finalData.summary = buildChapterTextFallbackSummary(data.chapterText);
  }

  // Never let an empty or placeholder summary become chapter memory —
  // fall back to the chapter text excerpt instead.
  if (isPlaceholderSummary(finalData.summary)) {
    finalData.summary = buildChapterTextFallbackSummary(data.chapterText);
  }

  // Canonical handoff (Context Engine 2.5): clamp LLM output to the typed
  // shape; a malformed or absent handoff degrades to plain V2 behavior.
  finalData.handoff = sanitizeChapterHandoff(finalData.handoff, targetChapter.number);
  finalData.contractReport = sanitizeContractReport(finalData.contractReport);

  return finalData;
};
