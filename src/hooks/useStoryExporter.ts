import { useAppStore } from '../store/useAppStore';
import { storyStorage } from '../lib/storage';
import { Story } from '../types';

export const useStoryExporter = () => {
  const store = useAppStore();

  const handleExportSingleStory = async (story: Story) => {
    try {
      const exportData = JSON.parse(JSON.stringify(story));
      
      if (exportData.arcs) {
        for (const arc of exportData.arcs) {
          for (const chapter of arc.chapters) {
            if (chapter.hasContent && (!chapter.generatedContent && (!chapter.blocks || chapter.blocks.length === 0))) {
               const content = await storyStorage.getChapterContent(story.id, chapter.number);
               if (content) {
                 chapter.generatedContent = content.generatedContent;
                 chapter.blocks = content.blocks;
                 chapter.summary = content.summary;
                 chapter.statsChangeMessage = content.statsChangeMessage;
                 chapter.cuePayload = content.cuePayload;
               }
            }
          }
        }
      }

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `story_world_${story.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err: any) {
      store.setAppError("Failed to transcribe story ledger to outward scrolls: " + err.message);
    }
  };

  const handleExportFullTome = (story: Story) => {
    let htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${story.title}</title>
  <style>
    :root {
      --bg: #111;
      --text: #dfd8cf;
      --accent: #d4a373;
    }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: Georgia, serif;
      line-height: 1.8;
      max-w-3xl: 800px;
      margin: 0 auto;
      padding: 2rem 1rem;
    }
    h1, h2, h3 { color: var(--accent); text-align: center; }
    h1 { font-size: 2.5rem; margin-bottom: 0.5rem; border-bottom: 1px solid #333; padding-bottom: 1rem; }
    h2 { margin-top: 3rem; font-size: 2rem; border-bottom: 1px dashed #333; padding-bottom: 0.5rem; }
    h3 { margin-top: 2rem; }
    .author-note { text-align: center; font-style: italic; color: #888; margin-bottom: 3rem; }
    .chapter-content { margin-top: 1.5rem; font-size: 1.1rem; }
    .chapter-content p { margin-bottom: 1.5em; text-indent: 1.5em; }
    .stats-msg { display: block; text-align: center; font-family: monospace; font-size: 0.9em; color: #a4b0c2; margin-top: 2rem; padding: 1rem; border: 1px solid #333; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>${story.title}</h1>
  <div class="author-note">Generated via SEIHouse Engine</div>
`;

    if (story.arcs) {
      story.arcs.forEach(arc => {
        htmlContent += `<h2>${arc.title}</h2>\n`;
        arc.chapters.forEach(ch => {
          if (ch.hasContent || ch.generatedContent) {
            htmlContent += `<h3>Chapter ${ch.number}: ${ch.title}</h3>\n`;
            
            let text = ch.generatedContent || "";
            text = text.replace(/\\n/g, "</p><p>");
            htmlContent += `<div class="chapter-content"><p>${text}</p></div>\n`;
            if (ch.statsChangeMessage) {
              htmlContent += `<div class="stats-msg">${ch.statsChangeMessage}</div>\n`;
            }
          }
        });
      });
    }

    htmlContent += `</body></html>`;
    const dataStr = "data:text/html;charset=utf-8," + encodeURIComponent(htmlContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `TOME_${story.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.html`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return { handleExportSingleStory, handleExportFullTome };
};
