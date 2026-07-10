## Performance Optimizations - Bolt Learnings

### PersistentStorageManager - Batched Sync

*   **What:** The `performSync` method in `PersistentStorageManager` was processing stories sequentially. It has been optimized to use `Promise.all` with a configurable concurrency limit (e.g., batches of 10), allowing parallelized network and async execution.
*   **Why:** `performSync` executes `reconcileStory` over every local story. Doing this sequentially for a large library can block the pipeline heavily. Parallelizing it improves sync speed significantly, especially over I/O bound adapters (cloud APIs, etc).
*   **Measurements:** Benchmarks with 50 mocked items showed a drop from ~2500ms (50 * 50ms I/O) to ~250ms with a `BATCH_SIZE` of 10.

## 2026-07-10 - [Word Count Processing]

**Learning:** For high-frequency word count calculations in string processing blocks (e.g. `useReaderPlayback.ts` calculating narrative durations per chunk), `.split(/\s+/).filter(Boolean).length` has high string allocation and regex compilation overhead. A fast single-pass string traversal using `charCodeAt` yields an over 6x speedup.
**Action:** Extract fast single-pass counting logic into `src/utils/textUtils.ts` and replace `.split`-based counting globally across the reader loop and TTS chunking mechanisms.
