# Persistence and Media Foundation

> **Historical Phase 1 document.** PR #173 established this foundation. The
> application cutover described in
> [`PERSISTENCE_MEDIA_CUTOVER.md`](./PERSISTENCE_MEDIA_CUTOVER.md) supersedes
> the integration guidance below: PostgreSQL/Data Connect and R2 are now the
> active persistence paths, while Firestore and Firebase Storage have been
> retired from application persistence.

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

The current Phase 2 cutover uses Vercel OIDC and Google Workload Identity
Federation instead of a downloadable Firebase service-account key. The active
configuration and one-time setup command are documented in
[`PERSISTENCE_MEDIA_CUTOVER.md`](./PERSISTENCE_MEDIA_CUTOVER.md).

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
  duration, lifecycle state, and object location. Signed delivery URLs are
  generated only when needed.
- The current default per-owner quota is 500 MiB and 5,000 committed assets.
- `MediaUploadReceipt` makes repeated upload requests idempotent. A reused key
  with a different request hash is rejected.
- Cleanup workers claim tasks with leases, exponential backoff, and a maximum
  retry count. Stale `RUNNING` tasks can be reclaimed after lease expiry.
- Storage reports aggregate by owner, story, media type, and status without
  scanning R2 object bodies.

## IndexedDB cache and outbox

The cache is explicitly non-authoritative. Its stores are owner-scoped and its
records carry update/expiry metadata. The current defaults are 24-hour stale
revalidation, 30-day hard retention, 100 MiB, and 5,000 entries, additionally
capped at 80% of the browser-reported quota. Pruning removes hard-expired data
first, then least-recently-used records and media until all configured bounds are
met. Account cleanup removes records, media, outbox entries, and recovery state
without affecting another owner.

The mutation outbox provides:

- deterministic item identity and idempotency keys;
- pending/processing/failed/succeeded state;
- leases and stale-lease recovery;
- bounded exponential backoff;
- duplicate-enqueue convergence;
- durable recovery checkpoints; and
- per-owner processing isolation.

The outbox is not evidence that a remote write committed. Callers must reconcile
against PostgreSQL after reconnecting or recovering from an unknown outcome.

## Deployment and operations

### Firebase configuration

Phase one keeps the current Firebase application configuration. Data Connect
configuration lives in `dataconnect/` and is compiled separately. Emulator
configuration is isolated in `firebase.dataconnect-ci.json`; it does not alter
production resources.

### Cloudflare R2

Production private media uses `celestial-library-private-media`, with public
access and `r2.dev` disabled. Public/catalog content remains in the separate
existing namespace. The private bucket CORS policy allows signed browser
`GET`/`HEAD` requests from the known app origins; CORS is not authorization.

### Maintenance

Run:

```sh
npm run foundation:media:maintenance
```

The command recovers stale uploads, reconciles emergency cleanup markers,
processes due cleanup tasks, releases expired quota reservations, and emits a
storage report. It exits nonzero when any stage fails but attempts every stage.

### Verification

The foundation acceptance suite covers two distinct Firebase users, round-trip
persistence, cross-account denial, browser denial of `NO_ACCESS` operations,
retention, permanent purge, media ownership, cleanup recovery, and cache/outbox
isolation. Phase 2 adds the full product cutover validation documented in
`PERSISTENCE_MEDIA_CUTOVER.md`.

## Security and rotation

No private Firebase service-account key is required by the active Phase 2
Vercel deployment. Google credentials are short-lived and issued through
Workload Identity Federation. R2 credentials remain protected server-only
secrets and follow the rotation procedure in `SECRET_ROTATION.md`.
