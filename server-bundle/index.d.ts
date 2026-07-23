// Type stub for the esbuild-generated bundle (server-bundle/index.js), which does not exist
// at typecheck time. It mirrors the exports used by api/index.ts so TypeScript can validate
// the thin Vercel request adapter.
import type { Express } from "express";

export function restoreForwardedApiUrl(request: {
  url?: string;
  query?: Record<string, string | string[] | undefined>;
}): void;

declare const app: Express;
export default app;
