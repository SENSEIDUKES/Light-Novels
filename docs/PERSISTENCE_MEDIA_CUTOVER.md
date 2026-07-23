# PostgreSQL and R2 Application Cutover

## Production authority

Phase 2 connects the Celestial Library to the foundation delivered by PR #173.
There is one permanent authority for each data class:

| Data | Authority | Browser role |
| --- | --- | --- |
| Identity and sessions | Firebase Authentication | Supplies the ID token used by every private request. |
| Stories, chapters, Codex, seeds, profiles, progress, jobs, and media metadata | PostgreSQL through Firebase Data Connect | Reads and mutations go through the authenticated persistence API. |
| Generated and uploaded media bodies | Cloudflare R2 | The browser receives short-lived delivery URLs and keeps canonical asset IDs. |
| Offline replicas and pending mutations | IndexedDB | Disposable owner-scoped cache and outbox; never commit evidence or a source of truth. |
| Curated audio catalog | Existing checked-in catalog and public R2 namespaces | Remains separate from user-owned media and keeps its existing IDs and playback behavior. |

Firebase Authentication remains in use. Firestore and Firebase Storage are no
longer initialized or used by an active application persistence path.

## Relational application model

The Data Connect schema uses independently addressable rows instead of copying
an entire story into a single JSON document. Its main relationships are:

- `UserAccount` owns profiles, preferences, progress, inventory, story seeds,
  stories, generation jobs, quota records, and user media.
- `Story` owns memberships, preferences, rules, arcs, chapters, memory,
  continuity records, Codex entities and relationships, generation state,
  reading state, glossary entries, media attachments, and deletion jobs.
- `Chapter` owns content, ordered blocks and attributes, translations, facts,
  entity mentions, voice/audio metadata, and generation-batch state.
- `CodexEntity` owns explicit aliases and attributes; relationships, threads,
  karma nodes, timeline events, and ability progression remain normalized.
- `MediaAsset` contains immutable R2 object metadata. `MediaAttachment` records
  history and `MediaSlot` identifies the current asset for a target and purpose.
- `PersistenceAggregateVersion`, `PersistenceReceipt`, and `StoryChange` support
  compare-and-swap updates, idempotent retries, and incremental reconciliation.
- `StoryDeletionJob`, `StoryDeletionStage`, `MediaDeletionIntent`, and
  `MediaCleanupTask` make multi-system deletion recoverable.

JSON remains only for bounded values whose internal keys are not independently
queried. PostgreSQL never stores permanent image, audio, video, archive, or
other binary bodies.

## Ownership and authorization

Every `/api/persistence/*` and `/api/foundation/media-assets*` request requires
`Authorization: Bearer <Firebase ID token>`. The server verifies the token and
uses its UID as the owner; payload owner fields and route IDs cannot select a
different account.

Data Connect browser operations retain `@auth(level: USER)` owner predicates.
The richer graph and media lifecycle mutations are `@auth(level: NO_ACCESS)`
and are invoked only by the trusted server after token verification. Story,
chapter, seed, Codex, profile, portrait, and media lookups all include the
verified owner or an owner-scoped story relationship. Administrative routes
also require the account role check performed by the repository.

Application mutations use UUID idempotency keys. Story, chapter, seed, and
profile writes use aggregate versions and expected revisions to reject stale
overwrites with HTTP 409. A retry with the same owner, operation, payload hash,
and key returns the stored result; reusing a key for a different request is a
conflict.

## Structured persistence lifecycle

`DataConnectStorageAdapter` is the single remote adapter used by the existing
storage manager. It maps the application model to normalized graph mutations
and hydrates the same product-facing types on reads. The active flows include:

- complete story list, story graph, and chapter-content reads;
- story and chapter create/update with compare-and-swap protection;
- atomic story-seed single and batch persistence;
- glossary single and batch changes;
- user profile, Celestial Portrait, and image-quota changes;
- owner and administrator story deletion; and
- administrator account/usage views and access changes.

Story payload validation rejects permanent embedded data URLs, blobs, binary
signatures, and temporary provider URLs. Canonical media asset IDs and compact
metadata are retained; delivery URLs are hydrated only for a response.

## Media lifecycle

Generated and uploaded covers, manifestation images, chapter images, quote
cards, retained reference images, and Celestial Portraits use the same service:

1. The UI may show a temporary preview but submits the bytes, data URL, or an
   allowlisted temporary HTTPS source to the authenticated server.
2. The server validates target ownership, MIME type, decoded size, remote host,
   visibility, purpose, rate limit, and quota.
3. A quota reservation and upload receipt make retries idempotent.
4. The server writes an immutable key under the private `user-media/` R2
   namespace and verifies the object before committing `MediaAsset` as `READY`.
5. `MediaAttachment` preserves history and `MediaSlot` switches the current
   pointer atomically. A failed replacement leaves the previous slot active.
6. Private delivery uses a short-lived signed URL. The canonical asset ID,
   version, checksum, and R2 key remain durable; the signed URL does not.
7. Deletion detaches current slots, records an intent, updates quota ledgers,
   and queues an idempotent R2 cleanup task. Failed cleanup is retried.

The curated audio catalog stays in its existing public R2 namespaces and is
never treated as user-owned deletion work.

## Offline synchronization

`IndexedDbFoundationCache` maintains four owner-keyed stores: remote records,
media blobs, mutation outbox items, and recovery checkpoints. Online reads are
revalidated after 24 hours by default; stale synchronized records can still be
read offline until the 30-day hard-retention boundary. Automatic pruning uses
the lower of 100 MiB, 5,000 entries, or 80% of the browser-reported quota.

The storage manager writes remote mutations with stable idempotency keys. When
the network is unavailable or a retryable request fails, it stores the exact
mutation in the durable outbox. Reconnection claims an item with a lease,
replays it through the same remote adapter, and either completes it or records
bounded exponential-backoff state. Duplicate enqueue attempts converge on the
same deterministic item. Successful server reads refresh the cache; cached
presence is never interpreted as a successful PostgreSQL commit.

Authentication changes close the previous cache and instantiate an owner-scoped
cache for the new UID. Logout and permanent story deletion remove matching
records, media cache entries, recovery checkpoints, and pending outbox items so
stale content cannot reappear for the next session.

## Deletion and cleanup

Permanent story deletion first tombstones the story so all normal owner reads
and writes stop immediately. The tombstone is the current structured-data
recovery policy: normalized descendants remain attached to that known,
inaccessible story until a future retention purge, rather than becoming
unscoped records. A staged deletion job then removes user-owned media, confirms
local-cache reconciliation, and finalizes. Each stage has a lease, retry state,
and recorded error; an expired `RUNNING` lease can be reclaimed. Curated catalog
objects are outside the user-media candidate query and are never selected.

The media maintenance command recovers stale uploads, processes due cleanup
tasks, reconciles deletion intents, releases expired quota reservations, and
reports partial failures without discarding the remaining work:

```sh
npm run foundation:media:maintenance
```

Disposable legacy test records were not migrated. No automation in this change
deletes Firebase Authentication users or curated R2 catalog objects.

## Cost and quota controls

- User media defaults to 500 MiB and 5,000 committed assets.
- Non-privileged accounts default to 30 upload attempts per minute.
- Input-specific decoded-size and MIME allowlists run before permanent commit.
- PostgreSQL quota reservations prevent concurrent uploads from overspending a
  user's or story's remaining allocation and expire safely after interruption.
- IndexedDB pruning is bounded by bytes, entry count, hard retention, and the
  browser's storage estimate.
- Storage reports expose total bytes and assets, breakdowns by owner, story,
  type, and status, failed/pending/orphaned assets, and unusually large files.

## Environment requirements

The server requires the following protected values. Only placeholders belong in
tracked files:

- `FIREBASE_PROJECT_ID` and `FIREBASE_SERVICE_ACCOUNT_JSON`
- `R2_ENDPOINT_URL`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY`
- `R2_PRIVATE_BUCKET_NAME` for private user media
- `R2_PUBLIC_BUCKET_NAME` and `R2_PUBLIC_BASE_URL` only when trusted public
  publishing is enabled
- `MEDIA_REMOTE_SOURCE_HOSTS` for temporary provider ingestion allowlisting
- `MEDIA_CLEANUP_BATCH_SIZE` for a maintenance-run work bound

`R2_BUCKET_NAME` remains a public-bucket compatibility fallback. Credentials
must never use a `VITE_` prefix or enter a browser bundle. The Firebase client
configuration still supplies Authentication; Firestore and Storage identifiers
are not application persistence configuration.

## Legacy paths removed

- Firestore story, chapter, Codex, seed, profile, quota, glossary, artifact, and
  translation reads/writes
- Firebase Storage portrait and permanent-media writes
- Firestore and Storage rules, emulator tests, and CI emulator dependencies
- permanent base64/blob/provider URL persistence
- duplicate legacy storage adapters and full-story overwrite queues

The `firebase` web dependency remains because Firebase Authentication is still
the login boundary; transitive Firestore/Storage packages in that distribution
do not represent an active import or configured service.

## Verification

The completed local verification is:

| Gate | Result |
| --- | --- |
| `npm test` | Passed: 170 files, 1,235 tests. |
| `npm run test:coverage` | Passed: 170 files, 1,235 tests; report generated. |
| `npm run lint` | Passed ESLint and `tsc --noEmit`; one existing React dependency warning remains. |
| `npm run build` | Passed the production Vite client and bundled server build. |
| `npm run dataconnect:compile` | Passed schema compilation and generated browser/Admin SDK verification. |
| `npm run test:foundation:e2e` | Passed two-user Auth/Data Connect ownership, cross-account denial, round-trip, `NO_ACCESS`, and tombstone checks. |
| `git diff --check` | Passed. |

Focused tests cover graph mapping, owner isolation, revisions and idempotency,
story seeds, offline outbox replay, cache isolation/pruning, media
upload/replacement/delivery/deletion, quota accounting, cleanup recovery, and
the migrated product hooks.

Live R2 and deployed-preview verification require the protected environment and
must use only disposable user-media records. Those checks must not delete Auth
users, existing secrets, or curated catalog assets.
