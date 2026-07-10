const { performance } = require('perf_hooks');

const nodes = Array.from({ length: 100000 }, (_, i) => ({
  relevanceState: ['dormant', 'archived', 'active', 'warm', 'reactivated'][i % 5]
}));
const showDeepMemory = false;

function oldWay() {
  const allChars = nodes;
  const dormantChars = allChars.filter(c => c.relevanceState === 'dormant' || c.relevanceState === 'archived');
  const charsToRender = showDeepMemory ? allChars : allChars.filter(c => !c.relevanceState || c.relevanceState === 'active' || c.relevanceState === 'warm' || c.relevanceState === 'reactivated');
  return { dormantChars, charsToRender };
}

function newWay() {
  const allChars = nodes;
  let dormantChars = [];
  let charsToRender = [];

  if (showDeepMemory) {
    charsToRender = allChars;
    for (let i = 0; i < allChars.length; i++) {
      const state = allChars[i].relevanceState;
      if (state === 'dormant' || state === 'archived') {
        dormantChars.push(allChars[i]);
      }
    }
  } else {
    for (let i = 0; i < allChars.length; i++) {
      const state = allChars[i].relevanceState;
      if (state === 'dormant' || state === 'archived') {
        dormantChars.push(allChars[i]);
      } else if (!state || state === 'active' || state === 'warm' || state === 'reactivated') {
        charsToRender.push(allChars[i]);
      }
    }
  }
  return { dormantChars, charsToRender };
}

let start = performance.now();
for (let i = 0; i < 100; i++) {
  oldWay();
}
console.log('Old way:', performance.now() - start);

start = performance.now();
for (let i = 0; i < 100; i++) {
  newWay();
}
console.log('New way:', performance.now() - start);
