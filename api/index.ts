// Vercel serverless entry point for the backend.
//
// vercel.json rewrites every /api/* request to this concrete function and
// carries the original suffix in __seihouse_api_path. A concrete function
// avoids relying on framework-specific catch-all filename routing. The
// generated bundle restores the original URL before Express dispatches it.
import app, { restoreForwardedApiUrl } from "../server-bundle/index.js";

export default function handler(
  request: Parameters<typeof app>[0] & {
    query?: Record<string, string | string[] | undefined>;
  },
  response: Parameters<typeof app>[1],
) {
  restoreForwardedApiUrl(request);
  return app(request, response);
}
