# Test Coverage and Verification Map

**Updated: July 25, 2026.** This replaces the pre-cutover Firestore-era
snapshot. It records the current verification surfaces rather than preserving
stale file percentages.

## Current local baseline

`npm test` completed on July 25, 2026 with **179 test files and 1,297 passing
tests**. The normal suite uses Vitest with jsdom. Some test-environment notices
(for example, unimplemented jsdom media/canvas APIs) may appear after a passing
run; they are not test failures.

Coverage thresholds remain configured in `vitest.config.ts` at 30% lines, 25%
functions, 20% branches, and 30% statements. Run `npm run test:coverage` when
a current coverage percentage is needed; do not quote the removed July 11
percentages as a current baseline.

## Verification surfaces

| Surface | Primary command | What it covers |
| --- | --- | --- |
| Unit and component behavior | `npm test` | Reader, creation, Story Seeds, generation pipeline, Codex, audio, storage, server services/routes, and persistence regression tests. |
| Critical user journeys | `npx vitest run src/test/journeys` | End-to-end journeys over the real persistence stack — see below. |
| Static checks | `npm run lint` | ESLint and `tsc --noEmit`. |
| Production bundle | `npm run build` | Vite client plus bundled Node server. |
| Data Connect contracts | `npm run dataconnect:compile` | Schema compilation and generated browser/Admin SDK verification against the isolated emulator config. |
| Persistence ownership | `npm run test:foundation:e2e` | Firebase Auth/Data Connect emulator ownership, cross-account denial, round-trip persistence, tombstones, and purge behavior. |
| Browser critical paths | `npm run test:e2e` | Playwright critical-path and cinematic-scroll specifications. |
| Real private-media integration | `npm run test:foundation:r2:live` | Explicit, protected-environment R2 smoke test; use disposable records only. |

## Critical journey suite (`src/test/journeys`)

These tests prove the product works as a product, not that a mock was called.
They run the real `PersistentStorageManager`, the real IndexedDB story adapter,
the real `IndexedDbFoundationCache` outbox, the real `DataConnectStorageAdapter`
(permanent-media guard, patch diffing, idempotency keys, revision
expectations), a real Express server running the real `persistenceRouter`, the
real `DataConnectApplicationRepository` and the whole `graphMapper`, plus the
real browser media resolver (descriptor fetch, blob download, checksum
verification, object URLs).

Only two things are substituted, both in `src/test/support`:

- **Firebase Auth** (`testAuth.ts`) — an external identity service. The ID
  token it mints is still verified server-side, so the owner uid is always
  derived from the presented token.
- **The PostgreSQL engine** (`inMemoryDataConnect.ts`) — it applies the exact
  row manifests `graphMapper` emits and enforces the same ownership,
  compare-and-swap and idempotency-receipt rules, so a write the real schema
  would reject fails here too.

Covered journeys: Library load and cover art, opening a story to the correct
chapter, chapter generation and edits surviving reload, Living Codex entries and
manifested imagery, profile/portrait/reading-progress/reader settings, Reader
Chamber immersion rendering (colored Codex names, system palettes, world cards,
audio mix state), and reload / sign-out / sign-in continuity.

When touching persistence, media or the reader, run this suite. A failure here
is a user-visible product failure, not a fixture drift.

## High-value review guidance

- For a persistence or media change, prove owner isolation, idempotency,
  revision/conflict behavior, offline outbox recovery, and cleanup behavior as
  applicable. A successful unauthenticated route match is not a persistence
  smoke test.
- For a generation or reader change, test both the API contract and the
  rendered output/fallback path. A nominal provider response is insufficient
  if the UI can silently degrade.
- For audio changes, keep scene score, atmosphere, and one-shot cards/cues
  separate and test catalog resolution rather than provider-generated asset
  identifiers.
- For accessibility changes, test keyboard and labelled-control behavior in
  addition to visual layout.

See [the README](README.md) for setup and [the cutover guide](docs/PERSISTENCE_MEDIA_CUTOVER.md)
for the current persistence/media verification procedure.
