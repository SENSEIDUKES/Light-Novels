# Test Coverage Audit & Action Plan

## Current Coverage Snapshot (Updated)
- **Overall Coverage**: ~43% Lines, 37% Functions, 28% Branches
- **Story Engine Pipeline (`useStoryEngine.ts`, `useChapterGeneration.ts`)**: ~81-94% Lines (Massive Improvement)
- **State Store (`useAppStore.ts`)**: 100% Lines
- **Story Store (`useStoryStore.ts`)**: ~47% Lines (New Deficit Area)
- **Storage Adapters (`indexedDBAdapter`, `persistentStorageManager`)**: ~44-92% Lines
- **Story Exporter (`useStoryExporter.ts`)**: ~86% Lines
- **Chapter Translator (`useChapterTranslation.ts`)**: 100% Lines

## Progress on Critical Paths

### 1. `useStoryEngine.ts` & Chapter Pipeline
- [x] **Stream Parsing & Hydration**: Tested heavily in `parseChapterStream.test.ts`.
- [x] **Error Handling & Fallbacks**: Tested in `useChapterGeneration.test.ts` (handling malformed responses, network errors, stream dissipation).
- [x] **Steering Actions**: Tested in `useArcSteering.test.ts`.
- [ ] **Novelty Block Excision**: Basic extraction works, but specific system tags like `[Audio: ...]` excision need more robust edge-case testing.
- [ ] **State Updates Upon Completion**: Partly covered, but deep integration tests verifying final store state commits still need expansion.

### 2. State & Codex Operations (Specialized Hooks/Stores)
- [ ] **Memory Operations (`useCodexEditing.ts`)**: Currently at ~70% coverage. Missing robust test suites for isolated character/faction edit commits.
- [ ] **Complex Deletions (`useCodexDeletions.ts`)**: Only ~26% coverage. Needs tests for deleting entire stories and triggering cleanup of decoupled chapter content.

### 3. `storage.ts` (Persistence Layer)
- [x] **IndexedDB Fallbacks**: Tested in `storage.test.ts` (fallback to LocalStorage).
- [x] **Chapter Decoupling**: Tested in `storage.test.ts` (split generated content out of main story).
- [x] **Cloud Write Coalescing**: Tested in `storage.test.ts` (circuit breakers & quota limits).
- [ ] **Data Migration**: `persistentStorageManager.ts` is only at ~44% coverage. Needs tests for schema migration logic and legacy `StoryWorld` recovery.

### 4. End-to-End Tests (Playwright)
- [x] **E2E Toolchain Initialization**: Playwright config and critical path tests exist.
- [x] **App Bootstrapping**: Tested in `critical-paths.spec.ts`.
- [ ] **Generation Flow Walkthrough**: Needs automation for clicking "New Story", entering a prompt, mocking the LLM API, and asserting chapter creation.
- [ ] **Codex View Assertion**: Needs automation for clicking Living Codex and verifying memory elements render correctly based on local storage state.
