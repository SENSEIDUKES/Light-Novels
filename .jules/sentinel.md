## 2025-02-27 - Remove insecure PRNG usage for sync revisions
**Vulnerability:** Found `Math.random().toString(36)` being used to generate revision IDs in `persistentStorageManager.ts` and `firebaseStorage.ts`, posing a security risk as `Math.random` is cryptographically insecure.
**Learning:** Even though `Math.random` was used only as a fallback for missing `crypto.randomUUID`, falling back to an insecure algorithm provides a weak link. Modern browsers all have `crypto.getRandomValues`. The codebase already has robust fallback handling in `src/lib/id.ts`.
**Prevention:** Always use the dedicated cryptographically secure utilities in `src/lib/id.ts` for any ID generation rather than implementing ad-hoc fallbacks.
