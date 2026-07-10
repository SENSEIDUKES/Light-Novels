/**
 * Shared IndexedDB seed for reader e2e tests: enables local-only mode and
 * inserts a story whose first chapter has enough paragraphs to scroll.
 */
export const PARAGRAPH_COUNT = 30;

export const seedScript = `
  localStorage.setItem('seihouse_local_only_mode', 'true');
  (() => {
    const paragraphs = [];
    for (let i = 0; i < ${PARAGRAPH_COUNT}; i++) {
      paragraphs.push(
        'Paragraph ' + i + ': The azure gate hummed with ancient power as the disciple ' +
        'walked the thousand steps, reciting the mantra of the everlasting dao and ' +
        'watching the clouds coil like dragons above the summit shrine.'
      );
    }
    const story = {
      id: 'e2e-scroll-story',
      title: 'E2E Scroll Chronicle',
      genre: 'Cultivation',
      mcName: 'Test Cultivator',
      customPremise: 'A story used to verify cinematic scrolling.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentChapterNumber: 1,
      memory: {
        powerSystem: 'Qi Condensation',
        currentPowerStage: 'Mortal',
        worldRules: [],
        characters: [],
        unresolvedPlotThreads: [],
        resolvedPlotThreads: []
      },
      arcs: [
        {
          title: 'Act I',
          isCompleted: false,
          chapters: [
            {
              number: 1,
              title: 'The Thousand Steps',
              premise: 'The disciple climbs.',
              status: 'unread',
              // Content lives in the chapter_contents store (the persistent
              // storage manager's normal split shape).
              hasContent: true,
              summary: 'The disciple climbs the mountain.'
            },
            { number: 2, title: 'The Summit', premise: 'The disciple arrives.', status: 'unread' }
          ]
        }
      ]
    };
    const request = indexedDB.open('seihouse_story_world_db', 3);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('stories')) {
        db.createObjectStore('stories', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('chapter_contents')) {
        db.createObjectStore('chapter_contents', { keyPath: ['storyId', 'chapterNumber'] });
      }
      if (!db.objectStoreNames.contains('audio_cache')) {
        db.createObjectStore('audio_cache', { keyPath: 'url' });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(['stories', 'chapter_contents'], 'readwrite');
      // Write-once: the init script runs on every navigation, and a plain
      // put() would wipe state the app saved (e.g. the reading anchor).
      // add() fails silently when the story already exists.
      const addReq = tx.objectStore('stories').add(story);
      addReq.onerror = (e) => { e.preventDefault(); };
      const contentReq = tx.objectStore('chapter_contents').add({
        storyId: story.id,
        chapterNumber: 1,
        generatedContent: paragraphs.join('\\n\\n'),
        summary: 'The disciple climbs the mountain.'
      });
      contentReq.onerror = (e) => { e.preventDefault(); };
      tx.onabort = () => db.close();
      tx.oncomplete = () => db.close();
    };
  })();
`;
