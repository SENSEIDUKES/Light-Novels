// Vercel serverless entry point for the backend.
//
// The whole Express app (and all of src/server/*) is pre-bundled by esbuild into
// ../server-bundle/index.js during the build (see vercel.json buildCommand). We import that
// single self-contained bundle here rather than importing src/* directly.
//
// Why: this project is ESM ("type": "module"), and Vercel transpiles each file under api/
// WITHOUT bundling its imports. That left the src/* relative imports as extensionless ESM
// specifiers, which Node's ESM loader rejects at runtime with ERR_MODULE_NOT_FOUND (that was
// the "Status: 500" on every generation call). Bundling first collapses all of src/ into one
// file, so the only imports remaining at runtime are bare node_modules packages (which Vercel
// installs and traces normally).
//
// The `[...path]` catch-all filename maps every /api/* request to this one function; Express's
// own router (mounted inside the bundle) handles the individual routes.
import app from "../server-bundle/index.js";

export default app;
