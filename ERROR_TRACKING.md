# Error Tracking and Observability

This document records the current observability boundary for SEIHOUSE / Celestial Library.

## Current status

`@sentry/react` is installed, but the application does **not** currently import,
initialize, or configure Sentry. There is no active `VITE_SENTRY_DSN` handling
in `src/`. Do not treat the package dependency as deployed error tracking.

The active server-side observability is structured request/error logging through
`pino` and `pino-http` in the Express server and Vercel serverless entrypoint.
The client has application error boundaries and user-facing error states, but
those are not a hosted exception-reporting service.

## If Sentry is added later

Adding Sentry requires an explicit product/operations decision and implementation:

1. Initialize the browser SDK in the real client entrypoint and document the
   chosen privacy, replay, and sampling policy.
2. Add only public browser configuration with a `VITE_` prefix; keep server
   credentials server-side.
3. Add a server SDK separately if server exception reporting is wanted.
4. Update `.env.example`, tests, and this document in the same change.
