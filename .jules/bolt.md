## 2024-05-18 - [Optimizing Multiple Filters in Render Cycles]
**Learning:** Found multiple `array.filter(condition).length` calls and `array.filter()` assignments over the same array within the render cycle of `LibraryScreen.tsx`. This causes multiple O(N) passes and redundant memory allocations for the intermediate arrays.
**Action:** Replaced these consecutive filters with a single O(N) `for` loop that accumulates all necessary state metrics simultaneously. This is a very effective micro-optimization for React components dealing with moderate-to-large datasets.
