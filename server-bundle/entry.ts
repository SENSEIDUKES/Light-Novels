import express from "express";
import pinoHttp from "pino-http";
import { logger } from "../src/server/logger";
import { apiRouter } from "../src/server/routes";

// Source for the Vercel serverless backend. esbuild bundles THIS file (and everything it
// imports from src/) into a single self-contained ../server-bundle/index.js at build time
// (see vercel.json buildCommand), leaving only bare node_modules imports for the runtime.
//
// It's a minimal Express app: JSON body parsing + request logging + all API routes. Unlike
// src/server.ts it has no Vite dev middleware or static file serving — on Vercel the built
// frontend in dist/ is served by the platform CDN, not by this function.
const app = express();
app.use(pinoHttp({ logger }));
app.use(express.json({ limit: "20mb" }));
app.use(apiRouter);

// Global error handler: turn malformed-JSON body errors and any unhandled route errors into
// clean JSON instead of Express's default HTML error page (which can leak stack traces).
// If a streaming response already started (headers sent), delegate to Express's default
// handler so we don't try to rewrite a response that's mid-flight.
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) return next(err);
  logger.error(err);
  res.status(err.status || err.statusCode || 500).json({
    error: err.message || "Internal Server Error",
  });
});

export default app;
