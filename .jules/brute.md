## 2026-07-25 - Guard against stale state writes during async generation
**Learning:** Concurrent state updates triggered by UI actions (like toggling read status or sealing chapters) can overwrite or be overwritten by ongoing async generation processes (e.g., chapter creation). `isGenerating` checks are required to synchronize state mutation.
**Action:** When creating new actions that modify `activeStory`, always include an early exit `if (useAppStore.getState().isGenerating) return;` block to prevent data-loss or state corruption.
