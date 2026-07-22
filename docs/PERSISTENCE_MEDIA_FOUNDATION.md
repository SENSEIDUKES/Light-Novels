# Persistence and Media Foundation

## Phase-one scope

This foundation adds a production-shaped PostgreSQL/Data Connect model, a
server-owned R2 media pipeline, and an owner-scoped IndexedDB cache contract.
It is intentionally isolated from the application's active persistence paths.

**There is no persistence cutover in this phase.** Existing stories, chapters,
profiles, reader state, generated images, and audio continue to use the current
Firestore/Firebase Storage and catalog code. Nothing in `src/lib/firebase.ts`
imports or initializes Data Connect. The new browser client must be constructed
explicitly by a future integration point.

The phase-one boundary consists of:

- `dataconnect/`: relational schema plus user and server connector operations.
- `src/generated/dataconnect`: generated browser SDK.
- `src/generated/dataconnect-admin`: generated server-only Admin SDK.
- `src/lib/foundation/sqlConnectFoundation.ts`: opt-in browser facade.
- `src/server/media/`: validation, R2, repository, lifecycle, recovery, and
  reporting services.
- `src/server/routes/mediaAssetRouter.ts`: Firebase-ID-token-protected media API.
- `src/lib/foundation/cache/`: disposable IndexedDB cache and recovery contracts.

## PostgreSQL and Data Connect

The production service is deployed as `celestial-library` in `us-west2`, backed
by Cloud SQL instance `celestial-library-sql`, PostgreSQL database
`celestial_library`, and connector `celestial-library`. The deployed schema
matches the checked-in foundation schema. Schema validation remains
`COMPATIBLE`, so future deployments do not opt into destructive migration
behavior. The initial database is PostgreSQL 18 on the Data Connect no-cost
trial configuration (`db-f1-micro`, 10 GB); billing alerts and an explicit
capacity/cost review are required before that trial or workload assumptions
change.

### Relational model

The schema separates independently queried or independently updated data rather
than copying the current story world into one JSON document.

| Area | Principal tables | Boundary |
| --- | --- | --- |
| Accounts | `UserAccount`, `UserProfile`, `UserPreference` | Firebase Auth UID is the account key. Profile and preference rows are separate one-to-one records. |
| Progress | `UserProgressEvent`, `UserInventoryItem`, `Bookmark`, `ReadingProgress` | User-owned event and reading state remain independently queryable. |
| Story intake | `StorySeed`, `StorySeedField` | Seed fields are addressable rows, including repeated list positions. |
| Stories | `Story`, `StoryMember`, `StoryPreference`, `StoryReaderPreference`, `StoryRule` | Internal IDs are UUIDs. Legacy IDs are compatibility fields and are scoped by ownership instead of assumed globally unique. |
| Structure | `StoryArc`, `Chapter`, `ChapterContent`, `ChapterBlock`, `ChapterBlockAttribute`, `ChapterTranslation` | Chapter scaffold reads do not hydrate full generated prose. Chapter number is unique inside a story. |
| Continuity | `StoryMemoryState`, `StoryMemoryWarning`, `ChapterSceneFingerprint`, `ChapterFact`, `ChapterFactSupersession`, `GlossaryTerm` | Memory, warnings, facts, and supersession are explicit records. |
| Codex | `CodexEntity`, `CodexAlias`, `CodexEntityAttribute`, `CodexRelationship`, `PlotThread`, `KarmaNode`, `TimelineEvent`, `AbilityProgressionEvent`, `CodexThreadLink` | `contextPriority` and `authorContextNote` retain their exact contract names. Aliases remain explicit author-controlled rows. |
| Generation | `GenerationJob`, `GenerationEvent` | Long-running work and its event history have durable status records. |
| Media | `MediaAsset`, `MediaUploadAttempt`, `MediaAttachment`, `MediaDerivative`, `MediaCleanupTask`, `UserPortrait` | PostgreSQL stores compact metadata and lifecycle state, never permanent file bodies. |
| Future catalog import | `MediaCatalogEntry` | Available for a later migration; the current checked-in audio catalog remains authoritative in phase one. |

Compatibility uniqueness is relationally scoped: seed and story legacy IDs are
unique per owner, chapter legacy IDs are unique per story, and generation
idempotency keys are unique per owner. `FoundationProbe` is intentionally
limited to one row per Firebase UID. Soft-deleted stories are excluded from
story and chapter reads, and cannot accept new chapters.

Story forks use a nullable parent reference. Deleting or archiving a parent must
not implicitly erase a child fork. Media is associated through
`MediaAttachment`, which allows a ready immutable object to be replaced without
mutating the old object in place.

### Authorization model

Firebase Auth is the identity boundary for both Data Connect and the media API.

- Browser operations use `@auth(level: USER)` and derive ownership from
  `auth.uid`. Reads and writes include an owner predicate; caller-supplied UIDs
  are not trusted.
- Story creation also creates the owner membership in one transaction. Chapter
  creation checks that the authenticated UID owns the story.
- The browser facade exposes only account, story, chapter, and owned-media
  operations.
- Media lifecycle and cleanup operations use `@auth(level: NO_ACCESS)`. They are
  callable through the generated Admin SDK on the server, but not through a
  browser SDK even if a client discovers an operation name.
- Every media HTTP route verifies a non-revoked Firebase ID token with the Admin
  SDK. The repository then verifies that the requested story, chapter, entity,
  profile, account, and optional generation job belong to the decoded UID and
  story scope.

Production validation exposed an important Data Connect boundary: a
`UserAccount.uid` schema default of `auth.uid` is incompatible with trusted
Admin SDK mutations because those operations intentionally have no end-user
Auth expression context, even when they supply a verified owner UID. The schema
therefore has no UID default. User operations continue to assign
`uid_expr: "auth.uid"` explicitly, while `@auth(level: NO_ACCESS)` Admin media
operations pass the UID obtained from the already verified Firebase ID token.
This preserves browser ownership enforcement while allowing server-owned media
transactions to create or update the corresponding account row.

The facade in `src/lib/foundation/sqlConnectFoundation.ts` receives a
`FirebaseApp`; it does not initialize an app and does not import the current
Firestore module. Data Connect automatically uses the Auth session belonging to
that supplied app. Emulator routing is also explicit in the constructor.

## Media service

### HTTP surface

All endpoints require `Authorization: Bearer <Firebase ID token>`.
Authentication runs before either route-scoped body parser, so unauthenticated
requests are rejected without parsing a potentially large body. The raw route
also receives `application/json` exports as bytes rather than losing them to the
application-wide JSON parser.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/foundation/media-assets` | Ingest a strict data URL or an allowlisted temporary HTTPS URL. |
| `POST` | `/api/foundation/media-assets/upload` | Ingest raw request bytes with metadata in query parameters. The HTTP body limit is 100 MB. |
| `GET` | `/api/foundation/media-assets/:assetId` | Return an owned `READY` descriptor and delivery URL. |
| `DELETE` | `/api/foundation/media-assets/:assetId` | Mark deletion pending, remove and verify the R2 object, then complete the lifecycle tombstone. |

Internal callers can also supply `Blob` or `Uint8Array` sources directly to the
service. A temporary provider URL is fetched only when its host is present in
`MEDIA_REMOTE_SOURCE_HOSTS`. A plain entry matches only that exact host;
`*.example.com` matches subdomains but not the apex. Every redirect repeats the
allowlist and DNS checks, and any private or reserved answer rejects the request.
Production HTTPS connects to one validated address while preserving the original
hostname for TLS/SNI, closing the DNS-rebinding window between validation and
connection.

### Save transaction boundary

The save coordinator performs these steps in order:

1. Verify the Firebase-derived owner, relational target shape, target ownership,
   and optional generation-job owner/story scope.
2. Verify that the requested visibility has a configured, correctly separated
   delivery bucket before any SQL reservation or R2 write.
3. Decode or fetch the transient source with a timeout and byte ceiling.
4. Sniff the file signature, compare it to the claimed type, enforce the
   asset-type MIME allowlist and size limit, calculate SHA-256, and extract image
   dimensions where supported.
5. Reserve a `MediaAsset` and `MediaUploadAttempt` in PostgreSQL.
6. Upload an immutable object to the visibility-specific R2 bucket.
7. `HEAD` the object and require its byte size and SHA-256 metadata to match.
8. Transactionally mark the asset `READY` and attach it to its target.
9. Return a compact descriptor. Private objects use short-lived signed URLs;
   public objects use `R2_PUBLIC_BASE_URL`.

No response reports success before both R2 confirmation and the PostgreSQL
`READY` commit. The permanent-record guard rejects buffers, blobs, typed arrays,
data/blob URLs, recognized base64-encoded media even when short or unpadded, and
arbitrary canonical base64-like payloads at 1,024 or more characters before
they can enter a metadata record.

A replacement must match exactly one current attachment with the same target
kind, key, purpose, story, chapter, and entity scope. Shared assets require an
explicit detach workflow; the service will not guess which attachment to switch.

### Object and lifecycle model

R2 keys are immutable and versioned:

```text
user-media/<private-or-public>/<owner-hash>/<story-or-_account>/<type>/<yyyy>/<mm>/<asset-id>/v<version>-<checksum-prefix>.<ext>
```

Private foundation objects live in the dedicated
`celestial-library-private-media` bucket, whose public development URL and
custom-domain access are disabled. Public foundation objects use the separate
configured public bucket. The object store rejects a bucket/key visibility
mismatch. Emergency cleanup markers live in the private bucket under
`user-media/_cleanup/`. This isolates the new pipeline from existing `DEFAULT/`,
`AUDIO/`, and other catalog objects.

Lifecycle states are `GENERATING`, `PROCESSING`, `UPLOADING`, `READY`, `FAILED`,
`ARCHIVED`, `DELETED`, `ORPHANED`, and `PENDING_CLEANUP`.

- Upload failure without an observed object records `FAILED`.
- If object presence is possible, the row becomes `PENDING_CLEANUP`.
- A definite upload failure may attempt immediate object cleanup. An ambiguous
  database-commit response first rereads SQL; a `READY` row is success. If SQL
  cannot confirm the outcome, the service writes a `commit-outcome-unknown` R2
  marker and does not immediately delete the possibly authoritative object.
- Stale `UPLOADING` reservations are swept after one hour by default into
  `FAILED` or retryable cleanup. Emergency markers wait a 15-minute grace
  period, reread SQL, preserve `READY` objects, and reconcile only unresolved
  non-ready objects.
- Deletion is retryable. A failed delete keeps a cleanup task with exponential
  backoff instead of claiming the bytes are gone.
- Replacement uploads a new immutable version first. Only the final database
  transaction switches the attachment and archives the prior asset. A failed
  replacement therefore leaves the old `READY` asset untouched.

`scripts/run-media-foundation-maintenance.ts` runs four failure-isolated stages:
stale-upload recovery, emergency-marker reconciliation, SQL cleanup tasks, and
the storage report. Errors are sanitized and any failed stage makes the process
nonzero without preventing later stages from running. These operations are not
exposed as unauthenticated HTTP routes. A production scheduler/worker binding is
a phase-two integration task.

### Server environment

These values must remain server-only. Do not create `VITE_` variants for
credentials.

| Variable | Required | Meaning |
| --- | --- | --- |
| `FIREBASE_PROJECT_ID` | Hosted server | Firebase project used by Admin Auth and Data Connect. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Hosted server unless ADC is configured | Single-line service-account JSON. Prefer the platform secret store. |
| `R2_ACCESS_KEY_ID` | Yes for media writes | R2 S3-compatible credential. |
| `R2_SECRET_ACCESS_KEY` | Yes for media writes | R2 secret credential. |
| `R2_PRIVATE_BUCKET_NAME` | Yes for media writes | Dedicated non-public bucket for private foundation assets and cleanup markers. Production is `celestial-library-private-media`. |
| `R2_PUBLIC_BUCKET_NAME` | Public assets | Separate public foundation/catalog bucket. `R2_BUCKET_NAME` is accepted as a compatibility fallback. |
| `R2_BUCKET_NAME` | Legacy compatibility | Existing catalog bucket name; not used for private foundation objects. |
| `R2_ENDPOINT_URL` | Yes for media writes | HTTPS S3 API endpoint with no embedded credentials. |
| `AWS_REGION` | No | Defaults to `auto`. |
| `R2_PUBLIC_BASE_URL` | Only for public assets | HTTPS public/CDN origin for the separate public bucket. Without it public saves are rejected before persistence. |
| `MEDIA_REMOTE_SOURCE_HOSTS` | For remote ingestion | Comma-separated exact hosts or explicit `*.` subdomain patterns, including every allowed redirect destination. |
| `MEDIA_CLEANUP_BATCH_SIZE` | No | Per-stage maintenance limit; defaults to 100 and is capped at 1,000. |

The older `R2_PUBLIC_LIBRARY_URL`, `R2_PUBLIC_AUDIO_URL`,
`R2_PUBLIC_IMAGES_URL`, `R2_PUBLIC_VIDEOS_URL`, and `R2_PUBLIC_DEV_URL`
settings remain for existing catalog paths; the new service does not reinterpret
them.

`npm run foundation:r2:provision` creates the private bucket and applies its
browser CORS policy when run with the explicit opt-in and an account-level R2
credential. Production was provisioned through the Cloudflare dashboard because
the current object credential correctly lacks bucket-administration permission.
The private bucket allows browser `GET`/`HEAD` CORS for signed URLs; CORS does not
grant object access, and both public access mechanisms remain disabled.

```powershell
$env:R2_PRIVATE_BUCKET_NAME='celestial-library-private-media'
$env:FOUNDATION_PROVISION_R2='I_UNDERSTAND_THIS_CREATES_OR_UPDATES_PRODUCTION_R2'
npm run foundation:r2:provision
```

### Cost and storage controls

- Per-type byte limits are applied while ingesting, including streamed remote
  responses. The JSON data-URL request and raw upload route have additional
  transport limits.
- R2 stores the body once; PostgreSQL stores size, checksum, MIME, dimensions,
  duration, lifecycle, attachment, and audit metadata only.
- Immutable public objects receive a one-year cache policy. Private descriptors
  use signed URLs and private/no-store object metadata.
- `inspectStorage()` aggregates active SQL-recorded byte metadata, up to its
  query limit, by owner, story, type, and status and lists failed, orphaned,
  pending-cleanup, and unusually large assets. It is not an R2 bucket inventory
  or a billable-byte report. `DELETED` tombstones remain in SQL but are excluded
  from active storage totals.
- Cleanup tasks and R2 emergency markers make leaked-object inspection explicit.
  They do not replace Cloudflare bucket lifecycle rules, spend alerts, or a
  scheduled cleanup worker, which must be configured operationally.

## IndexedDB cache and offline recovery

`IndexedDbFoundationCache` uses a separate
`seihouse-foundation-cache-v1` database. Its public contract hard-codes
`authoritative: false` and `sourceOfTruth: "remote"`.

The stores are owner-scoped and include:

- remote record replicas with TTL, server version, checksum, serialized UTF-8
  byte size, and last-access time;
- media blobs keyed by asset ID and validated against both immutable version and
  checksum;
- an idempotent mutation outbox with leases, attempts, retry time, and failure
  detail;
- recovery checkpoints for resumable client workflows.

Record, outbox, and checkpoint values are strict JSON only and are snapshotted
before asynchronous IndexedDB writes. Binary values, `Map`, non-plain objects,
sparse or augmented arrays, cycles, symbols, and non-finite numbers are rejected
outside the dedicated media store. Retry timestamps must also be finite.

Pruning removes expired entries first and then least-recently-used record/media
entries until configured entry, byte, and browser-quota-fraction limits are met.
Signing out must call `clearOwner()` and `close()` for the previous UID. A cache
write never means a server mutation committed, and the outbox must replay only
through authenticated, idempotent server operations.

## Build, emulators, and deployment

Compile and regenerate both SDKs after any schema or connector edit:

```bash
npm run dataconnect:compile
```

The compile script uses `firebase.dataconnect-ci.json`, the
`demo-seihouse-foundation` project ID, and a local `STRICT` validation mirror so
CI can validate the schema and regenerate code without production credentials
or a production database. The deployment config remains `COMPATIBLE`. Both
configs read the same schema and connector sources; the generated connector
remains `celestial-library` in `us-west2`. CI regenerates both SDK surfaces and
fails if code generation leaves either tracked modifications or untracked SDK
files.

Run the isolated two-user ownership suite against Auth and Data Connect
emulators:

```bash
npm run test:foundation:e2e
```

The runner refuses to start without both emulator host variables. It creates two
authenticated users, checks cross-user read/write denial, checks browser denial
for a `NO_ACCESS` operation, enforces one probe per owner, creates a story and
two chapters, denies chapter reads/writes after soft deletion, and cleans up its
records through the Admin SDK. The runner reports eight acceptance checks.

Deploy Data Connect separately from the application cutover:

```bash
npx --yes firebase-tools@latest deploy --only dataconnect --project seihouse-moduel
```

Initial production provisioning and deployment completed successfully: the
service, connector, Cloud SQL instance, database, and schema all match the
identifiers above. Continue to review SQL migration diffs and Cloud SQL
cost/region settings before every later deployment. The deployment did not
route any existing application read or write to PostgreSQL.

The final production migration replaced the global generation-job idempotency
index with the intended owner-scoped index and added the other scoped uniqueness
and stale-upload indexes. A post-deployment `dataconnect:sql:diff` reported an
exact schema match.

The live R2 smoke test is intentionally opt-in and invokes the production
server services directly:

```powershell
$env:FOUNDATION_RUN_LIVE_R2_TEST='I_UNDERSTAND_THIS_WRITES_AND_DELETES_PRODUCTION_MEDIA'
$env:FIREBASE_PROJECT_ID='seihouse-moduel'
$env:GOOGLE_APPLICATION_CREDENTIALS='C:\path\to\application-default-or-service-account.json'
$env:R2_PRIVATE_BUCKET_NAME='celestial-library-private-media'
npm run test:foundation:r2:live
```

It refuses emulator hosts, requires explicit Firebase Admin credentials, creates
and deletes its own temporary Firebase Auth user, and never prints credentials.
The completed production run normalized the one-pixel PNG data URL, uploaded it
to R2, confirmed it with `HEAD`, committed and reread the SQL `READY` row, then
fetched the signed URL from a newly launched browser context on a separate local
origin and matched the exact bytes through the production CORS policy. The run
also proved that both the unsigned S3 endpoint and configured public origin deny
the private object. Deletion committed the SQL `DELETED` tombstone, confirmed
the R2 object was absent, and confirmed the stale signed URL failed. The owner
account row and deleted media tombstone remain intentionally for lifecycle
auditability.

## Verification ledger

This table records completed production acceptance evidence and any explicitly
identified verification still in progress. Results are not inferred from
adjacent checks.

| Check | Command or evidence | Result |
| --- | --- | --- |
| Data Connect schema and SDK generation | `npm run dataconnect:compile` | PASSED - schema compiled and both generated SDK surfaces were present |
| Full test suite | `npm test` | PASSED - 170 test files; 1,215 passed, 44 skipped, 1,259 total. Vitest is capped at four workers for stable whole-repository execution, and the two existing `CreationPortal` cases have explicit 30-second integration budgets. |
| Firestore and Storage security rules with coverage | `firebase emulators:exec --only firestore,storage --project demo-seihouse-foundation "npm run test:coverage"` | PASSED - 1,259/1,259 tests; 59.90% statements, 46.57% branches, 56.41% functions, and 62.87% lines |
| Full lint and TypeScript | `npm run lint` | PASSED - no errors; one existing `App.tsx` React hook dependency warning remains |
| Production bundle | `npm run build` | PASSED |
| Two-user Auth/Data Connect ownership denial | `npm run test:foundation:e2e` | PASSED - eight checks covered one probe per owner, cross-user probe/story/chapter denial, `NO_ACCESS` browser denial, owned story/two-chapter creation, and soft-deleted-story chapter read/write denial |
| Data Connect deployment and SQL provisioning | Firebase deployment output plus `dataconnect:sql:diff` | PASSED - service and connector `celestial-library`, region `us-west2`, Cloud SQL `celestial-library-sql`, database `celestial_library`; final SQL diff reported an exact match |
| Live R2 upload, `HEAD`, PostgreSQL `READY`, fresh-browser fetch, and delete | `npm run test:foundation:r2:live` plus production provider state | PASSED - temporary Auth user; data-URL normalization; private-bucket `PUT`/`HEAD`; SQL `READY`; exact signed bytes from fresh Chromium through CORS; unsigned S3 and public-origin access denied; SQL `DELETED`; R2 absent; stale URL failed |
| Private/public R2 isolation and public-delivery preflight | media service and object-store tests plus Cloudflare bucket state | PASSED - distinct bucket/key namespaces are enforced, same-bucket configuration is rejected, PRIVATE uses the non-public production bucket, and incomplete PUBLIC delivery configuration fails before SQL or R2 writes |
| Remote-source boundary | media ingress tests and pinned HTTPS smoke | PASSED - exact and wildcard host semantics, redirect revalidation, rejection on any private/reserved DNS answer, and production DNS-pinned TLS/SNI behavior are covered |
| Relational target and replacement boundary | media service/repository tests | PASSED - generation-job owner/story scope, target shape, exact current-attachment replacement matching, and explicit shared-asset detach requirements are covered |
| Upload/commit/delete partial-failure paths | media service and router tests | PASSED - definitive cleanup, lost-commit `READY` preservation, unreadable commit markers, stale `UPLOADING` recovery, retryable deletion, and four-stage failure-isolated maintenance are covered |
| Media payload and HTTP parsing boundary | ingress and router tests | PASSED - recognized short encoded media and canonical base64-like persistence are rejected, authentication precedes body parsing, oversized/malformed errors are sanitized, and raw `application/json` exports preserve their bytes |
| IndexedDB strict snapshot and recovery contracts | cache tests | PASSED - pre-await JSON snapshots, UTF-8 byte accounting, unsupported-value rejection, finite retry timestamps, owner isolation, pruning, and checksum/version checks are covered |
| Existing audio catalog and atmosphere behavior | existing targeted audio tests plus catalog diff | Existing catalog remains authoritative and outside the new `user-media/` namespace; no cutover occurred |
| Current Firestore/Storage behavior remains active | application persistence/import audit | CONFIRMED - the legacy application remains on Firestore/Firebase Storage; Data Connect and R2 foundation routes are isolated and no persistence cutover occurred |

## Phase-two integration points

Phase two should be a deliberate migration, not an incidental import of the new
facade.

1. Add a read-through adapter at a single story repository boundary. Start with
   shadow reads and compare normalized results to Firestore without changing the
   visible result.
2. Backfill accounts, stories, chapters, Codex rows, settings, jobs, and media
   metadata with idempotent checkpoints and per-owner reconciliation reports.
3. Move one bounded write path to dual-write, record divergence, and define the
   rollback owner before expanding scope.
4. Wire `IndexedDbFoundationCache` only beneath the new remote repository. Clear
   owner data on auth changes and never use cache presence as commit evidence.
5. Connect generated/uploaded image producers to the server media endpoint.
   Retain old URLs until each replacement reaches `READY` and the UI confirms
   the new descriptor.
6. Add the protected scheduled cleanup worker, Cloudflare lifecycle rules,
   storage budgets, alert thresholds, and recurring storage report review.
7. Migrate the curated audio catalog separately. Preserve current IDs, paths,
   role separation, and the exact atmosphere categories `wind`, `crowd`,
   `waves`, `rain`, `combat`, and `noise` until an explicit catalog migration is
   designed and verified.
8. Cut reads over by cohort only after ownership, rollback, clean-session media,
   and consistency metrics meet agreed gates. Remove legacy persistence only in
   a later explicitly approved phase.
