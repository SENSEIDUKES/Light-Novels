## 2024-05-18 - [Optimizing Multiple Filters in Render Cycles]
**Learning:** Found multiple `array.filter(condition).length` calls and `array.filter()` assignments over the same array within the render cycle of `LibraryScreen.tsx`. This causes multiple O(N) passes and redundant memory allocations for the intermediate arrays.
**Action:** Replaced these consecutive filters with a single O(N) `for` loop that accumulates all necessary state metrics simultaneously. This is a very effective micro-optimization for React components dealing with moderate-to-large datasets.

## 2024-05-18 - [Optimizing `.reduce` + `.filter(...).length` in Render Cycles]
**Learning:** Found multiple `array.reduce()` loops coupled with `.filter(condition).length` calls over the same elements within the render cycle of `LibraryScreen.tsx`. This causes multiple O(N) passes and redundant memory allocations for the intermediate arrays.
**Action:** Replaced these consecutive filters inside map/reduce chains with a single O(N) `for` loop that accumulates all necessary state metrics (`totalChapters`, `readChapters`, `generated`) simultaneously via a helper function. This is a very effective optimization for React components mapping over data objects.
## 2024-06-25 - [Optimizing `.filter(...).length` in Render Cycles]
**Learning:** Found `.filter(...).length` calls embedded directly inside JSX templates (e.g. `memories.filter(m => m.type === 'scene').length`), which forces an O(N) array traversal on every single React render pass.
**Action:** Consolidate these repeated filters into a single O(N) pass inside a `useMemo` block to calculate all necessary counts simultaneously, then bind the variables to JSX. This reduces redundant N-passes on component updates.
## 2024-07-28 - [Optimizing Word Counting in Text Chunking]
**Learning:** Found a regex array splitting operation (`spacedText.trim().split(/\s+/).filter(Boolean).length`) inside `estimateChunkDurationMs` in `src/lib/voice/webSpeechCast.ts`, which is a hot path during TTS text processing.
**Action:** Replaced the operation with a fast single-pass string scan via `countWords` from `src/utils/textUtils.ts`. This avoids the unnecessary allocation of strings/booleans arrays and overhead from regex execution for counting spaces.
## 2024-07-29 - [Optimizing Multiple Filters in Render Cycles for Hierarchy Traversal]
**Learning:** Found multiple `.some()` and `.filter()` operations iterating over the same `mates` array using identical string matching rules (e.g. `c.role.toLowerCase().includes('leader')`) inside the render block of `LivingCodexFactions.tsx`. This causes O(N*k) passes and redundant array allocations during React render cycles.
**Action:** Combined these into a single O(N) `for` loop to categorize the items into `leaders`, `elders`, and `disciples` simultaneously. This significantly decreases computational overhead during rendering of hierarchical data.
