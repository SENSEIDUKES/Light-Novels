const { performance } = require('perf_hooks');

const arcs = Array.from({ length: 50 }, () => ({
  chapters: Array.from({ length: 50 }, (_, i) => ({
    status: i % 2 === 0 ? 'read' : 'unread',
    hasContent: i % 3 === 0,
    generatedContent: i % 4 === 0 ? 'test' : ''
  }))
}));

function oldWay() {
  const totalChapters = arcs.reduce((sum, a) => sum + a.chapters.length, 0);
  const readChapters = arcs.reduce((sum, a) => sum + a.chapters.filter(c => c.status === 'read').length, 0);
  const generated = arcs.reduce((sum, a) => sum + a.chapters.filter(c => c.hasContent || !!c.generatedContent).length, 0);
  return { totalChapters, readChapters, generated };
}

function newWay() {
  let totalChapters = 0;
  let readChapters = 0;
  let generated = 0;

  for (let i = 0; i < arcs.length; i++) {
    const chapters = arcs[i].chapters;
    totalChapters += chapters.length;
    for (let j = 0; j < chapters.length; j++) {
      const c = chapters[j];
      if (c.status === 'read') readChapters++;
      if (c.hasContent || !!c.generatedContent) generated++;
    }
  }
  return { totalChapters, readChapters, generated };
}

let start = performance.now();
for (let i = 0; i < 1000; i++) {
  oldWay();
}
console.log('Old way:', performance.now() - start);

start = performance.now();
for (let i = 0; i < 1000; i++) {
  newWay();
}
console.log('New way:', performance.now() - start);
