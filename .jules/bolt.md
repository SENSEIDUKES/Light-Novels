## Performance Optimizations - Bolt Learnings

### PersistentStorageManager - Batched Sync

*   **What:** The `performSync` method in `PersistentStorageManager` was processing stories sequentially. It has been optimized to use `Promise.all` with a configurable concurrency limit (e.g., batches of 10), allowing parallelized network and async execution.
*   **Why:** `performSync` executes `reconcileStory` over every local story. Doing this sequentially for a large library can block the pipeline heavily. Parallelizing it improves sync speed significantly, especially over I/O bound adapters (cloud APIs, etc).
*   **Measurements:** Benchmarks with 50 mocked items showed a drop from ~2500ms (50 * 50ms I/O) to ~250ms with a `BATCH_SIZE` of 10.
