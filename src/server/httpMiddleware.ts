import type { ErrorRequestHandler } from "express";
import rateLimit from "express-rate-limit";
import { logger } from "./logger";

export function createApiRateLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: "Too many requests, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });
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
