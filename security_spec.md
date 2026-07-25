# Security Spec

**Current persistence boundary: Firebase Authentication + server-owned Firebase
Data Connect/PostgreSQL + private Cloudflare R2.** Firestore rules and Firebase
Storage rules are not part of the active application persistence path.

## Data invariants

- A server route verifies the Firebase ID token before accessing account data.
- Owner identity comes from the verified token, never a client-supplied `userId`.
- Data Connect user operations retain owner predicates; privileged Admin
  operations are server-only (`@auth(level: NO_ACCESS)`) and are preceded by
  server-side ownership checks.
- Story, chapter, media, profile, seed, and Codex mutations use revisions and
  idempotency keys where the operation can be retried.
- Permanent media is private, associated with an owner and target slot, and
  delivered through expiring URLs. R2 credentials remain server-only.

## Adversarial cases to preserve in tests

1. An unauthenticated request cannot read or mutate persistence/media routes.
2. One authenticated user cannot read, change, deliver, replace, or delete
   another user's story, profile, seed, or media.
3. A client cannot assign ownership, bypass a revision guard, or reuse an
   idempotency key with a different payload.
4. Media upload validation rejects unsafe remote sources, invalid types, and
   writes that exceed the account quota.
5. A signed private-media URL is not treated as a durable identifier and does
   not grant access after expiry.
6. Malformed or non-JSON-safe offline outbox work cannot silently claim a
   successful remote commit.

## Verification

Run `npm run test:foundation:e2e` for Auth/Data Connect owner isolation and
round-trip coverage, then use the focused persistence/media route and service
tests. See [`docs/PERSISTENCE_MEDIA_CUTOVER.md`](docs/PERSISTENCE_MEDIA_CUTOVER.md)
for the current authorization, deletion, and live-verification procedure.
