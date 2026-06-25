# Error Tracking and Observability

This document details how SEIHOUSE integrates error tracking and observability into the frontend and backend architectures to maintain high reliability and user experience.

## Sentry Integration

We use [Sentry](https://sentry.io/) (`@sentry/react` for the frontend client) to log exceptions, unhandled promise rejections, and monitor performance. 

### Implementation Guide

1. **Installation**: We have already added `@sentry/react` to our project dependencies.
   \`\`\`bash
   npm install @sentry/react
   \`\`\`

2. **Configuration**: 
   Sentry configuration is environment-gated to avoid polluting the workspace during active local development.
   
   To enable Sentry, set your DSN in the `.env` file:
   \`\`\`env
   VITE_SENTRY_DSN=your_sentry_dsn_here
   \`\`\`

3. **Usage**:
   Initialize Sentry early in the application lifecycle, typically in `src/main.tsx` or `src/App.tsx`.
   
   \`\`\`typescript
   import * as Sentry from "@sentry/react";

   if (import.meta.env.VITE_SENTRY_DSN && import.meta.env.PROD) {
     Sentry.init({
       dsn: import.meta.env.VITE_SENTRY_DSN,
       integrations: [
         new Sentry.BrowserTracing(),
         new Sentry.Replay(),
       ],
       tracesSampleRate: 1.0,
       replaysSessionSampleRate: 0.1,
       replaysOnErrorSampleRate: 1.0,
     });
   }
   \`\`\`

4. **Error Boundary Capture**:
   Wrap your main React app with `Sentry.ErrorBoundary` or integrate it into an existing `ErrorBoundary` to capture component tree crashes gracefully.

## Backend Logging

In `src/server.ts`, we currently handle errors via `console.error()`. For production environments, these standard out streams should be aggregated using a logging provider (e.g., Datadog, Google Cloud Logging, or Sentry Node SDK).
