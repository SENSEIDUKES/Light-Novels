# Test Coverage Audit & Action Plan

## Current Coverage Snapshot
- **Overall Coverage**: ~55% Lines, 55% Functions, 36% Branches
- **Story Engine (`useStoryEngine.ts`)**: ~33% Lines (Critical Deficit)
- **State Store (`useAppStore.ts`)**: ~61% Lines
- **Storage Adapter (`storage.ts`)**: ~41% Lines
- **Story Exporter (`useStoryExporter.ts`)**: ~86% Lines
- **Chapter Translator (`useChapterTranslation.ts`)**: ~75% Lines

## Untested Critical Paths in Story Generation Flow

### 1. `useStoryEngine.ts` (Story Generation Engine)
- [ ] **Stream Parsing & Hydration**: Test parsing logic for the streaming response (e.g., extracting title, premise, content, and memory blocks from raw text).
- [ ] **Novelty Block Excision**: Verify that system tags (like `[Audio: ...]`, `[System Alert: ...]`) are properly extracted and stripped from the readable chapter content.
- [ ] **State Updates Upon Completion**: Ensure that upon generation completion, memory, characters, stats, and chapter texts are properly committed to the store.
- [ ] **Error Handling & Fallbacks**: Test behavior when the LLM stream is aborted, errors mid-generation, or returns malformed JSON/XML schema responses.
- [ ] **Steering Actions**: Test `processSteerAction` and ensuring that custom user directions successfully alter the generation prompt state.

### 2. `useAppStore.ts` (Global State)
- [ ] **Memory Operations**: Test adding/editing memory items (Codex characters, factions, artifacts) independently.
- [ ] **Complex Deletions**: Test logic for deleting an entire story and triggering cleanup of associated decoupled chapter content.

### 3. `storage.ts` (Persistence Layer)
- [ ] **IndexedDB Fallbacks**: Test behavior when IndexedDB is unavailable (current emulator fallback issues).
- [ ] **Chapter Decoupling**: Test that large chapter content is successfully decoupled into separate records during `saveStory` to prevent bloat.
- [ ] **Data Migration**: Test schema migration logic and recovery methods for broken or legacy `StoryWorld` object shapes.

### 4. End-to-End Tests (Playwright)
- [ ] **E2E Toolchain Initialization**: Ensure Playwright browser binaries are correctly installed (`npx playwright install`).
- [ ] **App Bootstrapping**: Test that the app loads the global header and home screen without crashing.
- [ ] **Generation Flow Walkthrough**: Automate clicking "New Story", entering a prompt, mocking the LLM API response, and asserting that a new chapter card appears.
- [ ] **Codex View Assertion**: Automate clicking the Living Codex and verifying that memory elements render correctly based on a pre-loaded local storage state.
