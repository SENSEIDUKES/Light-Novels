import { useAppStore } from '../store/useAppStore';
import { storyStorage } from '../lib/storage';
import { Story } from '../types';
import JSZip from 'jszip';

export const useStoryExporter = () => {
  const store = useAppStore();

  const cleanNovelProse = (text: string): string => {
    if (!text) return "";
    // 1. Remove curl-braced JSON-style signatures/metadata blocks
    let clean = text.replace(/\{[^{}]*?"(?:sceneType|intensity|tension|danger|mysticism|emotion|audioSignature|beastEvent|summary|statsChangeMessage|memoryUpdates)"[^{}]*?\}/gi, '');
    
    // Clean raw JSON configurations in brackets
    clean = clean.replace(/\[\s*\{[\s\S]*?\}\s*\]/g, '');

    // 2. Erase any hidden system tags
    const hiddenTagsRegex = /\[(?:SFX|Audio|Sound|Beat|Timing|Time|Duration|Trigger|SAP|Audio-Metadata|Metadata|Intensity|Tension|Danger|Mood|Emotion|Narrative):\s*([^\]]+)\]/gi;
    clean = clean.replace(hiddenTagsRegex, '');

    // 3. Remove other system messages
    clean = clean.replace(/\[System Alert:[^\]]+\]/gi, '');
    clean = clean.replace(/\[System Breakthrough:[^\]]+\]/gi, '');
    clean = clean.replace(/\[System Notification:[^\]]+\]/gi, '');
    clean = clean.replace(/\[Aura[^\]]+\]/gi, '');

    // 4. Clean empty brackets
    clean = clean.replace(/\[\s*\]/g, '');

    return clean.trim();
  };

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
      store.setAppError("Failed to transcribe story ledger to output: " + err.message);
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
            text = cleanNovelProse(text).replace(/\\n/g, "</p><p>");
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

  const handleExportEPUB = async (story: Story) => {
    try {
      const zip = new JSZip();

      // Mimetype
      zip.file("mimetype", "application/epub+zip");

      // META-INF
      const metaInf = zip.folder("META-INF");
      metaInf?.file("container.xml", `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

      // OEBPS
      const oebps = zip.folder("OEBPS");
      const textFolder = oebps?.folder("Text");

      // Generate Chapters
      let manifestItems = '';
      let spineItems = '';
      let navPoints = '';

      let chapterCount = 0;

      if (story.arcs) {
        for (const arc of story.arcs) {
          for (const ch of arc.chapters) {
            if (ch.hasContent || ch.generatedContent) {
              chapterCount++;
              
              let text = ch.generatedContent || "";
              // if missing, try to fetch it
              if (!text && ch.hasContent) {
                 const content = await storyStorage.getChapterContent(story.id, ch.number);
                 if (content) text = content.generatedContent;
              }

              text = cleanNovelProse(text).replace(/\\n/g, "</p><p>");
              
              const chFileName = `chapter${ch.number}.html`;
              const chId = `chapter${ch.number}`;
              
              const xhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<title>Chapter ${ch.number}: ${ch.title.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</title>
</head>
<body>
<h1>Chapter ${ch.number}: ${ch.title.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</h1>
<div><p>${text}</p></div>
</body>
</html>`;

              textFolder?.file(chFileName, xhtml);

              manifestItems += `<item id="${chId}" href="Text/${chFileName}" media-type="application/xhtml+xml"/>\n`;
              spineItems += `<itemref idref="${chId}"/>\n`;
              navPoints += `<navPoint id="navPoint-${chapterCount}" playOrder="${chapterCount}">
  <navLabel><text>Chapter ${ch.number}: ${ch.title.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text></navLabel>
  <content src="Text/${chFileName}"/>
</navPoint>\n`;
            }
          }
        }
      }

      // UUID
      const uuid = "urn:uuid:" + crypto.randomUUID();

      // content.opf
      const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${story.title.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</dc:title>
    <dc:language>en</dc:language>
    <dc:identifier id="BookId">${uuid}</dc:identifier>
    <dc:creator>Aetherial Resonance</dc:creator>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    ${manifestItems}
  </manifest>
  <spine toc="ncx">
    ${spineItems}
  </spine>
</package>`;

      oebps?.file("content.opf", opf);

      // toc.ncx
      const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${uuid}"/>
  </head>
  <docTitle>
    <text>${story.title.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>
  </docTitle>
  <navMap>
    ${navPoints}
  </navMap>
</ncx>`;

      oebps?.file("toc.ncx", ncx);

      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);

      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", url);
      downloadAnchor.setAttribute("download", `TOME_${story.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.epub`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      store.setAppError("Failed to forge EPUB Tome: " + err.message);
    }
  };

  return { handleExportSingleStory, handleExportFullTome, handleExportEPUB };
};
