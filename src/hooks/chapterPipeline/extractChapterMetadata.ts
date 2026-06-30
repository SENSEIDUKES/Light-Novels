export const extractChapterMetadata = async (
  targetChapter: any,
  finalRawBlocksStr: string,
  routingConfig: any,
  apiHeaders: any,
  data: any
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
        routingConfig
      })
    });

    if (!extractResponse.ok) {
       console.warn("Failed to extract chapter metadata explicitly. Setting defaults.");
       let fallbackSummary = data.chapterText.substring(0, 300).trim() + "...";
       if (fallbackSummary.includes('\n')) {
           fallbackSummary = fallbackSummary.split('\n')[0];
       }
       finalData.summary = fallbackSummary;
    } else {
       const extractedData = await extractResponse.json();
       finalData = { ...finalData, ...extractedData };
    }
  } catch (err) {
    console.warn("Error during metadata extraction", err);
    let fallbackSummary = data.chapterText.substring(0, 300).trim() + "...";
    if (fallbackSummary.includes('\n')) {
        fallbackSummary = fallbackSummary.split('\n')[0];
    }
    finalData.summary = fallbackSummary;
  }

  return finalData;
};
