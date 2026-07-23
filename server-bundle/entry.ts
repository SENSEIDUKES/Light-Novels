import express from "express";
import pinoHttp from "pino-http";
import { logger } from "../src/server/logger";
import { apiRouter } from "../src/server/routes";
import { createApiRateLimiter, sanitizedGlobalErrorHandler } from "../src/server/httpMiddleware";
import { mediaAssetRouter } from "../src/server/routes/mediaAssetRouter";
import { persistenceRouter } from "../src/server/routes/persistenceRouter";

// Source for the Vercel serverless backend. esbuild bundles THIS file (and everything it
// imports from src/) into a single self-contained ../server-bundle/index.js at build time
// (see vercel.json buildCommand), leaving only bare node_modules imports for the runtime.
//
// It's a minimal Express app: JSON body parsing + request logging + all API routes. Unlike
// src/server.ts it has no Vite dev middleware or static file serving — on Vercel the built
// frontend in dist/ is served by the platform CDN, not by this function.
export function createServerlessApp() {
  const app = express();
  app.use(pinoHttp({ logger }));
  app.use("/api", createApiRateLimiter());
  app.use(mediaAssetRouter);
  app.use(express.json({ limit: "20mb" }));
  app.use(persistenceRouter);
  app.use(apiRouter);
  app.use(sanitizedGlobalErrorHandler);

  return app;
}

const FORWARDED_API_PATH_QUERY = "__seihouse_api_path";

export function restoreForwardedApiUrl(request: {
  url?: string;
  query?: Record<string, string | string[] | undefined>;
}) {
  const forwardedValue = request.query?.[FORWARDED_API_PATH_QUERY];
  const forwardedPath = (Array.isArray(forwardedValue)
    ? forwardedValue.join("/")
    : forwardedValue ?? "")
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const incomingUrl = new URL(request.url ?? "/api", "http://serverless.local");
  incomingUrl.searchParams.delete(FORWARDED_API_PATH_QUERY);
  const remainingQuery = incomingUrl.searchParams.toString();
  request.url = `/api${forwardedPath ? `/${forwardedPath}` : ""}${
    remainingQuery ? `?${remainingQuery}` : ""
  }`;
}

const app = createServerlessApp();
export default app;
