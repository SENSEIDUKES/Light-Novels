import express from "express";
import dotenv from "dotenv";
import pinoHttp from "pino-http";
import { logger } from "../src/server/logger";
import { apiRouter } from "../src/server/routes";

// This is the Vercel serverless entry point for the backend. Vercel treats any file under
// `api/` as its own function; the `[...path]` catch-all name maps every `/api/*` request here
// (see vercel.json for the matching rewrite). It mirrors the JSON/logging setup in
// `src/server.ts`, but WITHOUT the Vite dev middleware or static file serving — on Vercel the
// built frontend in `dist/` is served directly by the platform's CDN, not by this function.
//
// Exporting the Express `app` instance directly works because Vercel's Node.js runtime accepts
// any `(req, res) => void` handler, and an Express app is exactly that.
dotenv.config();

const app = express();
app.use(pinoHttp({ logger }));
app.use(express.json({ limit: "20mb" }));
app.use(apiRouter);

export default app;
