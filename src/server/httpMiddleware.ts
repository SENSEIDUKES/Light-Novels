import type { ErrorRequestHandler } from "express";
import rateLimit from "express-rate-limit";
import { logger } from "./logger";

/**
 * Abuse guard for the model-backed endpoints.
 *
 * This deliberately does NOT cover /api/persistence or /api/foundation. Those
 * carry the replica's ordinary sync traffic — catalog reads, chapter bodies,
 * profile reads, media uploads — which a single reading session fires hundreds
 * of times. Counting them against one shared per-IP budget exhausted it during
 * normal use and then failed the expensive, user-initiated work the budget
 * exists to protect: generating a portrait returned 429 because syncing had
 * already spent the allowance. Persistence has its own protections (auth,
 * per-account ownership checks, idempotency keys, the client's write budget).
 */
export function createApiRateLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: "Too many requests, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
    skip: (request) => isUnmeteredApiPath(request.originalUrl ?? request.url ?? ""),
  });
}

const UNMETERED_API_PREFIXES = ["/api/persistence", "/api/foundation"] as const;

export function isUnmeteredApiPath(url: string): boolean {
  const path = url.split("?")[0];
  return UNMETERED_API_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export const sanitizedGlobalErrorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  next,
) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  logger.error(error);
  const candidateStatus =
    typeof error === "object" && error !== null
      ? Reflect.get(error, "status") ?? Reflect.get(error, "statusCode")
      : undefined;
  const status =
    typeof candidateStatus === "number" && candidateStatus >= 400 && candidateStatus < 600
      ? candidateStatus
      : 500;
  const publicMessage =
    status < 500 && typeof error === "object" && error !== null
      ? Reflect.get(error, "message")
      : undefined;

  response.status(status).json({
    error: typeof publicMessage === "string" && publicMessage ? publicMessage : "Internal Server Error",
  });
};
