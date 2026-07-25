# Celestial Library — Persistence & Synchronization Audit

> **Historical incident audit — July 24, 2026.** The priority outbox defect
> documented here was fixed and merged in PR #191 on July 25, 2026. The fix
> makes the IndexedDB JSON guard match `JSON.stringify` for object properties
> set to `undefined`, strips undefined task fields before enqueueing, and adds
> regression coverage. This file preserves the investigation and reproduction;
> it is not a statement that story persistence is currently blocked.

Scope: repository-wide audit of user-data create/save/reload/sync/restore after the
Data Connect / Postgres cutover. At the time of the audit, no fixes had yet been
applied. Every Critical/Confirmed finding below was proven by code inspection and,
for the priority error, by an executed reproduction against the real
`IndexedDbFoundationCache`.

Historical priority: the **Accept Blueprint & Start Matrix** "Celestial Disruption" error.

---

## 1. Critical blockers

### C1 — Outbox enqueue rejects every story/chapter/delete write (`$.requiresPostChapterHeartbeat`)

**This is the priority error and it is a total outage of the durable story/chapter
persistence layer in production, not a single-screen bug.**

- **Complete error message:** `outbox payload contains a non-JSON value at $.requiresPostChapterHeartbeat`
  (a `TypeError`), surfaced under the generic "Celestial Disruption" toast title
  (`src/components/ModalsAndToasts.tsx:823`). The store catch that shows it:
  `src/hooks/useStoryGeneration.ts:232` (`store_setAppError(err.message …)`).
- **Field involved:** `requiresPostChapterHeartbeat` (a `SyncTask`/outbox field), defined
  at [types.ts:61](../src/lib/storage/types.ts#L61).
- **Where the bad value is created:** [persistentStorageManager.ts:623](../src/lib/storage/persistentStorageManager.ts#L623)
  and [:629](../src/lib/storage/persistentStorageManager.ts#L629). `enqueueTask` builds
  the queued task with `requiresPostChapterHeartbeat: requiresPostChapterHeartbeat || undefined`.
  For any non-heartbeat write (every fresh story save, chapter save, edit, and delete) the
  left side is `false`, so the property is set to the literal value **`undefined`** — an
  explicit own-property, not an absent key.
- **What "validates" the payload:** not a Zod schema. It is a structural JSON-compat guard,
  `assertJsonCompatible` inside `snapshotJsonValue`, called by the real outbox store:
  [indexedDbFoundationCache.ts:270](../src/lib/foundation/cache/indexedDbFoundationCache.ts#L270)
  → `snapshotJsonValue(input.payload, "outbox payload")` → [assertJsonCompatible:864-907](../src/lib/foundation/cache/indexedDbFoundationCache.ts#L864).
  It walks `Object.entries(value)`; the entry `["requiresPostChapterHeartbeat", undefined]`
  is neither null/string/boolean/number nor an object, so it throws `contains a non-JSON
  value at $.requiresPostChapterHeartbeat`.
- **Nature of the defect:** the field is **sent with a non-serializable value (`undefined`)**.
  It is not missing, renamed, or wrongly typed at rest — it is an explicit-undefined property
  that the strict guard forbids even though the guard's very next line
  (`JSON.stringify`, [:857](../src/lib/foundation/cache/indexedDbFoundationCache.ts#L857))
  would have silently dropped it. The guard is stricter than its own serializer.
- **Why it slipped past tests / why it is a producer↔consumer mismatch:** the strict
  `assertJsonCompatible` guard lives only in the **real** cache. Both the in-tab fallback
  `VolatileSyncOutboxCache.enqueueOutbox` ([persistentStorageManager.ts:79](../src/lib/storage/persistentStorageManager.ts#L79))
  and the unit-test mock ([persistentStorageManager.sync.test.ts:79](../src/lib/storage/persistentStorageManager.sync.test.ts#L79))
  persist via lenient `JSON.parse(JSON.stringify(input.payload))`, which drops `undefined`.
  So the producer emits `undefined`, the strict consumer rejects it, and every test path uses
  a lenient consumer that hides it. The persistence PR that added the strict guard did **not**
  update the producer to stop emitting `undefined`, so producer and consumer are inconsistent.
- **Blast radius (all via `enqueueTask` → `persistTask` → `enqueueOutbox`):**
  - Fresh story creation / Accept Blueprint — [saveStory:2645](../src/lib/storage/persistentStorageManager.ts#L2645)
  - Chapter 1 + additional chapter writes — `saveChapterContent` path (same enqueue)
  - Story edits, arc steering, image manifests, bookmarks, read/unread, reading progress,
    Fate/Alter-Fate state (`hardcoreFateMode`/`fatePressure`/`karmaNodes` on `StoryWorld`),
    Living Codex, manifestations, covers — **all of these are fields of the `StoryWorld`
    document persisted through `saveStories`/`updateStory`** (`src/hooks/*` all call
    `store.saveStories`), so they all ride this one broken write.
  - **NOT in this blast radius** (they use the immediate-`fetch` authority, not the outbox):
    cultivation currency (`qi`/`heavenly_qi`/`sect_qi`/`demonic_qi`), Dao progress, rewards,
    and **inventory/relics** (`cosmicInventory`) — these are **account-scoped `UserProfile`**
    fields written via `saveUserProfile` (`src/lib/qi.ts:22` → `persistenceRequest`). See §4.
  - Story deletion — [deleteStory:2691](../src/lib/storage/persistentStorageManager.ts#L2691)
    (`delete_story` task also gets `requiresPostChapterHeartbeat: undefined`).
- **Secondary latent variant:** for a signed-out/unowned save, `userId` also becomes an
  explicit `undefined` in the same task object, so the guard would throw at `$.userId`
  first. The reported `$.requiresPostChapterHeartbeat` confirms the failing user was signed in.
  Both are the same root cause and both are fixed by the same guard change (R1).

**Reproduction (executed, passing):** enqueuing the exact `durableTaskPayload`
(`{type:'story', storyId, timestamp, userId, generation, idempotencyKey, requiresPostChapterHeartbeat: undefined}`)
through a real `IndexedDbFoundationCache` (memory IDB) rejects with
`/outbox payload contains a non-JSON value at \$\.requiresPostChapterHeartbeat/`; omitting the
key resolves successfully. (Temp repro file was removed; see R4 for the durable test to add.)

Answers to the specific priority questions:

| Question | Finding |
|---|---|
| Field missing / wrong type / unsupported / renamed / stripped / wrong operation? | Present but carries an **unsupported `undefined` value**; correct operation. |
| Browser holding an old queued entry under a previous schema? | **No.** The strict guard throws *before* writing, so a poisoned row can never be persisted. Each attempt is a fresh enqueue failure. |
| Can current code safely process/migrate older queued operations? | **Yes.** `loadQueueForScope` validates each row with `isSyncTask` and discards/`completeOutbox`es unrecognized rows ([:477-516](../src/lib/storage/persistentStorageManager.ts#L477)); legacy localStorage queue is JSON (cannot carry `undefined`) and is validated in `migrateLegacyQueue`. |
| Does accepting a blueprint partially create story/seed before failing? | **Yes, both.** (a) The **source Seed** is saved first via the *immediate-fetch* authority (`persistSeed` → `saveStorySeed`, [CreationPortal.tsx:221](../src/components/CreationPortal.tsx#L221)) before `onStartStory`. (b) The **story shell** is written to the local adapter ([:2639](../src/lib/storage/persistentStorageManager.ts#L2639)) *before* the enqueue throws ([:2645](../src/lib/storage/persistentStorageManager.ts#L2645)). Result: cloud has the seed, local disk has an orphan story shell, cloud has no story, and the in-memory store never commits it (`set({stories})` never runs). |
| Does retrying create duplicates/conflicts? | Each retry mints a new `generateUUID()` story id ([useStoryGeneration.ts:182](../src/hooks/useStoryGeneration.ts#L182)) → a new local-only shell each time. No cloud duplicates (nothing reaches cloud); the seed is reused, not duplicated. Orphan local shells accumulate. |
| Did the latest persistence PR change producer and consumer consistently? | **No.** Strict consumer guard added; producer still emits `undefined`; volatile fallback + test mock stayed lenient and masked it. |
| Local cache making a failed remote write look successful? | **Yes.** The local shell is written before the throw, so on reload `getStories()` shows the story even though it never synced and will re-throw on every subsequent save. |

---

## 2. Confirmed broken paths

All are the same root cause (C1) — durable outbox enqueue. Listed to make the blast radius explicit for verification after the fix.

| Path | Entry point | Note |
|---|---|---|
| Accept blueprint / fresh story creation | `handleStartStory` → `saveStories` → `saveStory` | Throws at commit. Local shell + cloud seed orphaned. |
| Chapter 1 creation + loading | `useChapterGeneration` → `saveStories` | Chapter body write enqueue throws; content never durably stored. |
| Additional chapter generation | `useChapterGeneration.ts:155` | Same. |
| Story edits | `updateStory`/`saveStories` | Same. |
| Story deletion (cloud tombstone) | `deleteStory:2691` | `delete_story` enqueue throws; deletion never propagates cross-device. |
| Bookmarks | `useCosmicBookmarking` → `updateStory` | Story-doc field; blocked. |
| Reading progress / resume / read-unread | chapter `status` via `saveStories` | Story-doc field; blocked. |
| Fate / Alter Fate state | `hardcoreFateMode`/`fatePressure`/`karmaNodes` on `StoryWorld` via `saveStories` | Blocked. |
| Living Codex / manifestations | story-doc + `useImageManifest` → `saveStories` | Blocked. |
| Covers / story-scoped R2 media manifest | `useImageManifest`/`useVisualAssets` → `saveStories` | Manifest write blocked (R2 upload itself is a separate immediate path — see H2). |
| Library restoration (2nd browser / clean cache) | cloud read | Because nothing was ever queued/synced, cloud has no story → nothing to restore. |

---

## 3. High-risk paths (not the blocker; verify after C1 is fixed)

- **H1 — Two independent write authorities, no cross-authority atomicity.**
  Seeds/profile/username/glossary/portraits/image-quota write **immediately** over
  `fetch` (`src/lib/persistence/persistenceClient.ts`, `persistenceRequest`), while
  stories/chapters/deletes go through the **durable outbox**. Accept-blueprint already
  demonstrates the split-brain: seed committed to cloud, story not. After C1 is fixed,
  confirm the intended ordering (story before seed-linkage, or tolerate a dangling
  `sourceSeedId`). No transaction spans the two authorities.

- **H2 — Story media manifest vs R2 object lifetime.** R2 uploads happen via the media
  service (immediate), but the *reference* to them lives in the `StoryWorld` manifest saved
  through the blocked outbox. Until C1 is fixed, images can exist in R2 with no durable
  cloud manifest pointing at them (orphaned objects). `permanentMediaGuard`
  ([src/server/media/permanentMediaGuard.ts:36-51](../src/server/media/permanentMediaGuard.ts#L36))
  correctly rejects `blob:`/`data:`/raw-base64 media on save, so temp URLs cannot be
  persisted as canonical references — but that guard is server-side and currently unreachable
  because story writes never reach the server.

- **H3 — Optimistic-concurrency `expected` semantics.** `valueMutationExpectation`
  ([persistenceRouter.ts:191](../src/server/routes/persistenceRouter.ts#L191)) documents a
  prior regression where a fabricated `{exists:false}` rejected every second profile/seed
  update. Re-verify username/profile edits and seed edits actually round-trip now
  (create + update), and that a stale local `expectedSyncRevision` cannot silently clobber a
  newer remote value. Not independently exercised in this audit.

- **H4 — Local-only shell divergence after a failed sync.** Because `saveStory` writes the
  local adapter before enqueuing, any enqueue failure (today: always; tomorrow: transient
  IndexedDB errors) leaves a local record that reads back as "saved" but is not in the
  outbox. Consider making the local write + enqueue atomic (enqueue first, or roll back the
  local write if enqueue throws) so "saved locally, never queued" cannot occur.

---

## 4. Working paths verified (by inspection)

- **Legacy queue rehydration is safe.** `migrateLegacyQueue` quarantines unreadable/malformed
  queues and validates entries with `isSyncTask`; `loadQueueForScope` discards non-conforming
  rows and dedupes by generation/timestamp. No poisoned-schema row can survive.
- **No stale poisoned outbox rows.** The strict guard prevents `undefined`-bearing rows from
  ever being written, so there is nothing to migrate away.
- **Media temp-URL guard is correct** (`permanentMediaGuard`, H2) — blocks `blob:`/`data:`/base64
  from being persisted as permanent metadata.
- **API owner-scoping is enforced** — `authenticate` + `assertOwnerField`
  (`persistenceRouter.ts`) reject payloads whose `uid`/`userId`/`ownerUid` != token uid.
- **Immediate-fetch authority is unaffected by C1** — profile, username, seeds, glossary,
  portraits, image quota, and **account-scoped cultivation** (Qi currencies, Dao progress,
  rewards, `cosmicInventory` = inventory/relics; `UserProfile` fields written by
  `src/lib/qi.ts:22` → `saveUserProfile` → `persistenceRequest`) persist over `fetch` and do
  not touch the broken outbox. (Unaffected by the blocker; not independently exercised
  end-to-end here — see H3 for the concurrency caveat on these debounced profile writes.)

> Not independently verified end-to-end (would need the live stack with C1 fixed):
> sign-in canonical profile provisioning, second-browser restoration, offline retry drain.

---

## 5. Legacy code safe to remove (conservative)

- **No active Firestore / Supabase data path exists in `src`.** No `getFirestore`,
  `onSnapshot`, or `collection()` data usage was found; `firebase` is used only for Auth and
  Data Connect. No client migration is required — just confirm no dead Firestore imports remain.
- **Dev/debug artifacts** (not code): `firestore-debug.log`, `pglite-debug.log`,
  `dataconnect-debug.log`, `emulators.log`, root `fix_*.py`, `pr51.json`, `test_api.js` —
  safe to delete; verify none are referenced by scripts first.
- **Do NOT remove yet:** `migrateLegacyQueue` / `@seihouse/sync-queue` handling and
  `VolatileSyncOutboxCache` — still needed for users mid-migration and IndexedDB-less browsers.

---

## 6. Exact recommended repairs

**R1 (primary, smallest durable fix for C1).** Make the JSON guard consistent with its own
serializer: in `assertJsonCompatible`, skip object properties whose value is `undefined`
(the `JSON.stringify` on the next line already drops them, and the volatile/mocked caches
already tolerate them). One change at
[indexedDbFoundationCache.ts:903](../src/lib/foundation/cache/indexedDbFoundationCache.ts#L903):
```ts
for (const [key, entry] of Object.entries(value)) {
  if (entry === undefined) continue; // JSON.stringify drops these; stay consistent
  assertJsonCompatible(entry, label, `${path}.${key}`, seen);
}
```
This fixes the entire class at once (also the latent `$.userId` variant) for records, outbox,
and recovery checkpoints.

**R2 (defense-in-depth producer fix).** Stop emitting explicit `undefined` from the producer:
in `durableTaskPayload` ([persistentStorageManager.ts:361](../src/lib/storage/persistentStorageManager.ts#L361))
strip keys whose value is `undefined` before enqueue, or build the queued task in `enqueueTask`
([:615-632](../src/lib/storage/persistentStorageManager.ts#L615)) so `requiresPostChapterHeartbeat`
is only set when true. Keeps stored payloads minimal even after R1.

**R3 (parity fix so it can't regress via mocks).** Update the test mock
([persistentStorageManager.sync.test.ts:69-90](../src/lib/storage/persistentStorageManager.sync.test.ts#L69))
to mirror the real cache's strict `snapshotJsonValue`/`assertJsonCompatible` behavior instead
of lenient `JSON.parse(JSON.stringify())`, so producer↔consumer mismatches surface in unit tests.

**R4 (durable regression test).** Add a non-mocked test that drives
`PersistentStorageManager.saveStory` (or `enqueueTask`) through the **real**
`IndexedDbFoundationCache` (memory IDB, as in `indexedDbFoundationCache.test.ts`) and asserts a
non-heartbeat story save enqueues successfully. This is the test that would have caught C1.

**R5 (partial-create hardening — H1/H4).** After R1, decide ordering/atomicity between the two
write authorities (seed-immediate vs story-outbox) and make the local write + enqueue atomic so
a story cannot exist locally without a queued sync.

---

## 7. Files and tests involved

**Root cause / repair sites**
- `src/lib/foundation/cache/indexedDbFoundationCache.ts` — `assertJsonCompatible` (864-907),
  `snapshotJsonValue` (855), `enqueueOutbox` (265-315) ← **R1**
- `src/lib/storage/persistentStorageManager.ts` — `enqueueTask` (601-651, esp. 623/629),
  `durableTaskPayload` (361-364), `persistTask` (366-376), `saveStory` (2539-2652),
  `deleteStory` (2691), `VolatileSyncOutboxCache.enqueueOutbox` (67-90) ← **R2**
- `src/lib/storage/types.ts` — `SyncTask.requiresPostChapterHeartbeat` (61)

**Surfacing / callers**
- `src/hooks/useStoryGeneration.ts` — `handleStartStory` (129-239), error catch (232)
- `src/components/CreationPortal.tsx` — `persistSeed` + accept flow (152, 221-224)
- `src/features/creation/components/BlueprintReview.tsx` — button (346-360)
- `src/store/useStoryStore.ts` — `performSaveStories` transaction (96-191)
- `src/components/ModalsAndToasts.tsx` — "Celestial Disruption" toast (823)

**Tests to change/add**
- `src/lib/storage/persistentStorageManager.sync.test.ts` — mock parity ← **R3**
- `src/lib/foundation/cache/indexedDbFoundationCache.test.ts` — add real-cache regression ← **R4**

**Downstream (unreached by C1; verify after fix)**
- `src/lib/storage/dataConnectStorageAdapter.ts`, `src/lib/persistence/persistenceClient.ts`,
  `src/server/routes/persistenceRouter.ts`, `src/server/persistence/dataConnectApplicationRepository.ts`,
  `src/server/persistence/graphMapper.ts`, `src/server/media/permanentMediaGuard.ts`
