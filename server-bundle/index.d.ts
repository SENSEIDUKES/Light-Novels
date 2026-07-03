// Type stub for the esbuild-generated bundle (server-bundle/index.js), which does not exist
// at typecheck time. It mirrors the default export of entry.ts so that api/[...path].ts can
// import "../server-bundle/index.js" without a "cannot find module" error under tsc.
import type { Express } from "express";

declare const app: Express;
export default app;
