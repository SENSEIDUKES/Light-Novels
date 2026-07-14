Recording learnings... Added exhaustive-deps rule enforcement and fixed App.tsx.
## 2024-05-19 - [Optimize LivingCodexFactions filtering]
**Learning:** Found an anti-pattern in `LivingCodexFactions` where multiple `Array.some()` and `Array.filter()` calls with expensive `toLowerCase()` and `.includes()` substring matching were repeated over the same dataset during a render loop.
**Action:** Replaced sequential O(N*k) passes and redundant intermediate arrays with a single O(N) `for` loop pass using pre-categorized arrays. This improves rendering performance and minimizes GC thrashing for characters with frequent faction associations.
