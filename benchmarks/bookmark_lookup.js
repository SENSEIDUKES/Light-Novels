const BOOKMARK_COUNT = 1000;
const PARAGRAPH_COUNT = 1000;
const CHAPTER_NUMBER = 5;

const activeBookmarks = [];
for (let i = 0; i < BOOKMARK_COUNT; i++) {
  activeBookmarks.push({
    id: `b-${i}`,
    chapterNumber: Math.floor(Math.random() * 10),
    paragraphIndex: Math.floor(Math.random() * PARAGRAPH_COUNT),
    paragraphExcerpt: '...',
    createdAt: new Date().toISOString()
  });
}

function oldLookup(activeBookmarks, chapterNumber, paragraphIndex) {
  return activeBookmarks.find(
    (b) =>
      b.chapterNumber === chapterNumber &&
      b.paragraphIndex === paragraphIndex,
  );
}

function benchmarkOld() {
  const start = performance.now();
  for (let i = 0; i < PARAGRAPH_COUNT; i++) {
    oldLookup(activeBookmarks, CHAPTER_NUMBER, i);
  }
  const end = performance.now();
  return end - start;
}

function benchmarkNew() {
  const start = performance.now();
  // Pre-computing Map (this is what I will implement in the component)
  const bookmarkMap = new Map();
  activeBookmarks.forEach(b => {
    if (b.chapterNumber === CHAPTER_NUMBER) {
      bookmarkMap.set(b.paragraphIndex, b);
    }
  });

  for (let i = 0; i < PARAGRAPH_COUNT; i++) {
    bookmarkMap.get(i);
  }
  const end = performance.now();
  return end - start;
}

console.log('Running benchmarks...');
const oldTime = benchmarkOld();
console.log(`Old lookup time: ${oldTime.toFixed(4)}ms`);

const newTime = benchmarkNew();
console.log(`New lookup time: ${newTime.toFixed(4)}ms`);

console.log(`Improvement: ${((oldTime - newTime) / oldTime * 100).toFixed(2)}%`);
