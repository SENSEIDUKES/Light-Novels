import express from "express";
import pinoHttp from "pino-http";
import { logger } from "../src/server/logger";
import { apiRouter } from "../src/server/routes";
import { createApiRateLimiter, sanitizedGlobalErrorHandler } from "../src/server/httpMiddleware";
import { mediaAssetRouter } from "../src/server/routes/mediaAssetRouter";
import { persistenceRouter } from "../src/server/routes/persistenceRouter";

// Source for the Vercel serverless backend. esbuild bundles THIS file (and everything it
// imports from src/) into a single self-contained ../api/index.js at build time
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
  const incomingUrl = new URL(request.url ?? "/api", "http://serverless.local");
  const forwardedValue =
    incomingUrl.searchParams.get(FORWARDED_API_PATH_QUERY)
    ?? request.query?.[FORWARDED_API_PATH_QUERY];
  const forwardedPath = (Array.isArray(forwardedValue)
    ? forwardedValue.join("/")
    : forwardedValue ?? "")
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  incomingUrl.searchParams.delete(FORWARDED_API_PATH_QUERY);
  const remainingQuery = incomingUrl.searchParams.toString();
  request.url = `/api${forwardedPath ? `/${forwardedPath}` : ""}${
    remainingQuery ? `?${remainingQuery}` : ""
  }`;
}

const app = createServerlessApp();
export default function handler(
  request: Parameters<typeof app>[0] & {
    query?: Record<string, string | string[] | undefined>;
  },
  response: Parameters<typeof app>[1],
) {
  try {
    restoreForwardedApiUrl(request);
    return app(request, response);
  } catch (error) {
    logger.error({ err: error }, "Vercel serverless request bootstrap failed");
    if (!response.headersSent) {
      response.status(500).json({
        error: {
          code: "serverless_bootstrap_failed",
          reason:
            error && typeof error === "object" && "code" in error
              ? String(error.code)
              : error instanceof Error
                ? error.name
                : "UnknownError",
        },
      });
      return;
    }
    throw error;
  }
}
