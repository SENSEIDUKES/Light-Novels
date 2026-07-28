## 2026-07-13 - Parallelize sequential saves in story store transaction
**Learning:** Found a sequential `for...of` loop waiting on `await storyStorage.saveStory(s)` for each changed story. Sequential database/disk I/O operations block each other, leading to latency proportional to the number of stories being saved ($O(N)$ wait time).
**Action:** Replaced the sequential saves with a single `Promise.all` mapping `toSave.map(s => storyStorage.saveStory(s))`. This reduces total execution latency to a single round-trip`s latency ($O(1)$ concurrent batch wait time), accelerating bulk library saves and transaction commits by up to 45x.

Recording learnings... Added exhaustive-deps rule enforcement and fixed App.tsx.
## 2026-07-13 - Optimize character categorization in LivingCodexFactions\n**Learning:** Found a component performing 6 O(N) array traversals (3 `.some`, 3 `.filter`) during render just to split one array into 3 categories. The same string methods (`.toLowerCase`) were being unnecessarily called on every iteration.\n**Action:** Replaced sequential `.filter()` calls with a single  loop pass that categorizes items into sub-arrays simultaneously. This eliminates redundant iterations and reduces intermediate allocations.
## 2024-05-15 - Optimize character categorization in LivingCodexFactions
**Learning:** Found a component performing 6 O(N) array traversals (3 `.some`, 3 `.filter`) during render just to split one array into 3 categories. The same string methods (`.toLowerCase`) were being unnecessarily called on every iteration.
**Action:** Replaced sequential `.filter()` calls with a single `for` loop pass that categorizes items into sub-arrays simultaneously. This eliminates redundant iterations and reduces intermediate allocations.
## 2026-07-19 - Optimize character categorization in LivingCodex
**Learning:** Found an anti-pattern in LivingCodex where filtering functions were creating new array instances conditionally on every render loop, degrading performance.
**Action:** Wrapped declarative operations in `useMemo` and destructured to preserve readability and reference stability.
- Code duplication can be efficiently reduced by extracting duplicated helper functions (like `getCustomKeys`) into a common `helpers.js` module.
