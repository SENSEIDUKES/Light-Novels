## Performance Optimizations
- **storage/persistentStorageManager.ts**: Optimized sequential image dataURL compression inside `compressDataUrls`. Rather than `await compress()` sequentially on large arrays of images in histories/entities, we now build a `Promise.all` array of compress calls so they occur concurrently, bringing a substantial speedup when syncing/saving.
