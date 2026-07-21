## 2025-02-20 - Adding Rate Limiting to Express API
**Vulnerability:** The Express API in `src/server.ts` lacked rate limiting on its `/api` endpoints, making it vulnerable to brute-force and Denial of Service (DoS) attacks.
**Learning:** Adding rate limiting using `express-rate-limit` is a safe, standard defense-in-depth measure that avoids breaking functionality, unlike adding `helmet` with default configurations, which was found to break the Vite frontend's HMR due to strict default Content Security Policies (CSP). Additionally, using `Math.random()` for non-cryptographic seeds (like image generation) isn't a true security vulnerability and shouldn't be "fixed" with crypto functions if it doesn't serve a real security purpose.
**Prevention:** Apply `express-rate-limit` to API routes. Be cautious with `helmet` when serving a Vite frontend from the same Express app, as specific CSP configurations are required. Only apply cryptographic randomness where security genuinely depends on unpredictability (like tokens or IDs).

## 2025-02-27 - Preventing Reverse Tabnabbing in File Downloads
**Vulnerability:** The client-side download utility in `src/utils/downloadUtils.ts` used a fallback mechanism that opened URLs in a new tab (`target="_blank"`) without setting `rel="noopener noreferrer"`. This could allow the newly opened tab to potentially hijack the original page (reverse tabnabbing).
**Learning:** Even fallback logic for simple file downloads must adhere to secure `<a>` tag configuration.
**Prevention:** Always ensure `rel="noopener noreferrer"` is explicitly applied when dynamically generating `<a>` elements with `target="_blank"`.
