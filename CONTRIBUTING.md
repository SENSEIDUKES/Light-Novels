# Contributing to SEIHOUSE / Celestial Library

Celestial Library is a React/Vite client with an Express API, Firebase
Authentication, Firebase Data Connect/PostgreSQL persistence, private
Cloudflare R2 media, and an IndexedDB offline cache/outbox. Read the
[README](README.md) and [persistence/media cutover guide](docs/PERSISTENCE_MEDIA_CUTOVER.md)
before changing a user-data or media flow.

## Repository map

- `src/components/` — reader, library, creation, profile, and Living Codex UI.
- `src/features/creation/` — Story Seed and story-intake forms.
- `src/hooks/` — client orchestration for generation, reader behavior, Codex,
  media, and profile actions.
- `src/lib/` — shared contracts, audio catalogs, persistence client/cache,
  storage adapters, and browser helpers.
- `src/server/` — Express routes, prompts, auth/admin setup, persistence
  repositories, R2 media services, and validation schemas.
- `dataconnect/` — Data Connect schema and operations. Generated client and
  Admin SDK output lives under `src/generated/`.
- `server-bundle/entry.ts` — Vercel serverless entrypoint. `src/server.ts` is
  the local development/production Node entrypoint.
- `e2e/` — Playwright critical-path tests.

## Local setup

```bash
npm ci
cp .env.example .env
npm run dev
```

On PowerShell, use `Copy-Item .env.example .env` before starting the app.

Keep provider keys, R2 secrets, and deployment credentials out of source
control. `.env.example` documents the required variable groups. Firebase
Authentication is active, but Firestore and Firebase Storage are not active
application persistence services; use Data Connect and the server persistence
API for structured data, and the media API for permanent user media.

## Working conventions

1. Start with the relevant types and existing contract/tests. A story or Codex
   change often touches `src/types.ts`, graph mapping, persistence, and the UI.
2. Keep business logic in hooks/lib/server modules; keep components focused on
   presentation and interaction.
3. Do not write directly to Data Connect from a new browser feature unless the
   existing authorization pattern explicitly calls for it. Product persistence
   flows use authenticated server routes, owner checks, revisions, and
   idempotency.
4. Send permanent generated/uploaded media through the media service. Persist
   the asset ID and metadata, not a provider URL, base64 payload, or R2 secret.
5. Preserve the curated audio contract: model output is semantic; catalog IDs,
   URLs, and playback resolution stay client-side.
6. Keep accessibility intentional: use native controls where possible, label
   icon-only controls, preserve keyboard paths, and test mobile layouts.

## Checks before review

Run the smallest relevant tests while iterating, then run the appropriate
repository checks:

```bash
npm run lint
npm test
npm run build
npm run dataconnect:compile        # when schema/operations/generated SDKs change
npm run test:foundation:e2e        # when Auth/Data Connect ownership or persistence changes
npm run test:e2e                   # when a critical browser path changes
```

Live R2 tests and maintenance commands affect real infrastructure. Use only
the documented protected environment and disposable records; never use them as
a shortcut for broad production cleanup.
