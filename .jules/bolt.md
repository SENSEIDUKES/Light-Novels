## 2024-05-18 - [Optimizing Multiple Filters in Render Cycles]
**Learning:** Found multiple `array.filter(condition).length` calls and `array.filter()` assignments over the same array within the render cycle of `LivingCodexDashboards.tsx`. This causes multiple O(N) passes and redundant memory allocations for the intermediate arrays.
**Action:** Replaced these consecutive filters with a single O(N) `for` loop that accumulates all necessary state metrics simultaneously. This is a very effective micro-optimization for React components dealing with moderate-to-large datasets.

## 2024-05-18 - [Optimizing `.reduce` + `.filter(...).length` in Render Cycles]
**Learning:** Found multiple `array.reduce()` loops coupled with `.filter(condition).length` calls over the same elements within the render cycle of `LibraryScreen.tsx`. This causes multiple O(N) passes and redundant memory allocations for the intermediate arrays.
**Action:** Replaced these consecutive filters inside map/reduce chains with a single O(N) `for` loop that accumulates all necessary state metrics (`totalChapters`, `readChapters`, `generated`) simultaneously via a helper function. This is a very effective optimization for React components mapping over data objects.
