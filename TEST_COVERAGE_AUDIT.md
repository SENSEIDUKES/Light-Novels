# Test Coverage Audit

This is the current testing map for Light-Novels. It is intended to answer “what should be tested next?” without relying on an old percentage snapshot.

## Current baseline

Measured on 2026-07-11 from the current branch with:

```bash
npx vitest run --coverage --maxWorkers=1 --reporter=dot
```

- 113 unit-test files under `src/`
- 2 Playwright specs under `e2e/`
- 649 tests passed, 14 skipped
- 47.62% lines, 45.20% statements, 41.74% functions, 30.88% branches
- Vitest thresholds are 30% lines, 25% functions, 20% branches, and 30% statements

The run still reports known test-environment noise: jsdom does not implement canvas, several existing component tests emit React `act()` warnings, and Firestore rules tests skip when the emulator is not running. These do not change the coverage numbers above.

## What is already well covered

| Area | Lines | Branches | Notes |
| --- | ---: | ---: | --- |
| `useStoryEngine.ts` | 94.59% | 68.75% | Generation orchestration and completion paths have direct hook coverage. |
| `useChapterGeneration.ts` | 81.33% | 59.09% | Stream failures, malformed responses, continuity repair, and persistence are covered. |
| `src/hooks/chapterPipeline/` | 82.39% | 65.27% | Parsing, metadata, continuity, repair, and block streaming are covered. |
| `src/lib/cinematicScroll/` | 99.02% | 87.20% | Scroll state, anchors, and surface behavior have focused tests. |
| `useReadingPosition.ts` | 92.13% | 63.15% | Semantic restoration and persistence paths are covered. |
| `useChapterTranslation.ts` | 100% | 86.66% | Success and error behavior are covered. |
| `useCodexDeletions.ts` | 100% | 50% | Faction, artifact, location, relationship, and fate-node deletion are covered. |
| `src/lib/glossary/` | 94.53% | 80% | Retrieval, projection, registry, and prompt formatting are covered. |
| `src/lib/voice/` | 96.82% | 90.14% | Voice resolution and speech estimation are covered. |
| `src/lib/audio/musicResolver.ts` | 98.55% | 84.14% | Resolver behavior is covered. |
| `useStoryExporter.ts` | 86.27% | 36.11% | JSON, HTML, and EPUB export paths are covered. |

## Highest-value gaps

These are the best next targets, ordered by risk and current coverage rather than by file count.

### P0 — Server route behavior is effectively untested

The following production routes are at 0% lines and have no route-level test suite:

- `src/server/routes/storyRouter.ts`
- `src/server/routes/codexRouter.ts`
- `src/server/routes/mediaRouter.ts`
- `src/server/routes/systemRouter.ts`
- `src/server/routes/index.ts`

`src/aiRouter.ts` is only 18.15% covered. Add request-level tests around validation, credential/header selection, provider failures, streaming errors, and safe error responses. Keep provider calls mocked; these should not require live API keys.

### P1 — Persistence and cloud-sync failure modes

| File | Lines | Why it matters |
| --- | ---: | --- |
| `src/lib/firebaseStorage.ts` | 6.66% | Cloud reads/writes, chapter storage, deletion, and auth boundaries are nearly untested. |
| `src/lib/storage/inMemoryAdapter.ts` | 0% | This is the final fallback when IndexedDB and LocalStorage are unavailable. |
| `src/lib/storage/localStorageAdapter.ts` | 42.04% | Quota errors, malformed legacy data, and audio/blob behavior remain lightly covered. |
| `src/lib/storage/persistentStorageManager.ts` | 52.00% | Migration is covered, but auth transitions, queue flushing, retries, deletes, and cloud-read caching need tests. |
| `src/store/useStoryStore.ts` | 62.16% | Story update/import/export and conflict-resolution branches remain the main store deficit. |

Use fake adapters and fake auth/cloud clients. Prioritize tests that prove no data loss: retryable failures stay queued, permanent failures are dropped, and local data remains available when cloud sync fails.

### P1 — Reader visual and media flows

| File | Lines | Next test focus |
| --- | ---: | --- |
| `src/hooks/useImageManifest.ts` | 7.14% | Image quota checks, generation guards, fallback URLs, and story updates. |
| `src/hooks/useVisualAssets.ts` | 22.00% | Cover prompt construction, API response normalization, error recovery, and applying image history. |
| `src/components/ReaderViewport.tsx` | 18.04% | Reveal interactions, media loading states, narrative cue wiring, and accessibility behavior. |
| `src/components/ReaderHeader.tsx` | 33.33% | Chapter navigation, playback controls, and reader settings handoff. |
| `src/hooks/useReaderVisuals.ts` | 46.66% | Momentous-chapter scoring, hero-generation limits, and IntersectionObserver cue filtering. |

The existing Playwright coverage is limited to `critical-paths.spec.ts` and `cinematic-scroll.spec.ts`; it does not yet cover generation, image manifests, or Codex navigation.

### P1 — Profile, creation, and Codex UI surfaces

- `src/hooks/useUserProfile.ts` — 24.29% lines
- `src/components/UserProfileAdminPanel.tsx` — 8.33% lines
- `src/components/UserProfileInventoryPanel.tsx` — 15.46% lines
- `src/components/UserProfilePortraitModal.tsx` — 3.33% lines
- `src/components/UserProfileSettingsPanel.tsx` — 18.75% lines
- `src/features/creation/components/CustomCharactersForm.tsx` — 5.40% lines
- `src/features/creation/components/CustomFactionsForm.tsx` — 7.14% lines
- `src/features/creation/components/ImportPanel.tsx` — 5.82% lines
- `src/components/codex/character-cards/CharacterCard.tsx` — 8.33% lines
- `src/components/codex/location-cards/LocationCard.tsx` — 10.00% lines

Add interaction tests for validation, save/cancel behavior, import rejection, profile updates, and keyboard/accessibility paths. These are better candidates for Testing Library than broad snapshot tests.

### P2 — Small utilities and fallback-only code

- `src/utils/textUtils.ts` — 8.33% lines
- `src/lib/storage/inMemoryAdapter.ts` — 0% lines
- `src/components/AetherialSystemLegend.tsx`, `ChallengeScreen.tsx`, `IdleCultivationModal.tsx`, `RankUpCelebration.tsx`, and `SectsScreen.tsx` — 0% lines
- `src/components/codex/character-profiles/CharacterProfile.tsx` and `location-profiles/LocationProfile.tsx` — 20% lines each

Cover pure utility contracts first. Defer decorative components until their interaction behavior becomes part of a critical path.

## End-to-end test map

Covered today:

- App bootstrapping and critical navigation (`e2e/critical-paths.spec.ts`)
- Cinematic scroll, narration timing, and semantic restoration (`e2e/cinematic-scroll.spec.ts`)

Still missing:

1. New-story generation with mocked `/api/generate-blueprint` and `/api/generate-initial-arc`, asserting the created chapter appears.
2. Translation failure visibility in the reader, including the server error shown to the user.
3. Living Codex navigation from a seeded local story, asserting characters, factions, locations, and relationships render.
4. Reader bookmark creation and resume-position restoration after navigation.

## Recommended next sequence

1. Add mocked route tests for `storyRouter`, `codexRouter`, and `systemRouter`.
2. Add cloud/local persistence failure tests, starting with `firebaseStorage.ts` and `inMemoryAdapter.ts`.
3. Add `useImageManifest` and `useVisualAssets` hook tests, then one reader-level integration test for reveal generation.
4. Add the generation and Codex Playwright flows.
5. Expand profile and creation-form interaction tests.

After each batch, rerun the baseline command above and update this file’s date and numbers. Do not copy the old audit percentages forward without a fresh coverage run.
