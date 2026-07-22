## 2025-02-20 - Adding Rate Limiting to Express API
**Vulnerability:** The Express API in `src/server.ts` lacked rate limiting on its `/api` endpoints, making it vulnerable to brute-force and Denial of Service (DoS) attacks.
**Learning:** Adding rate limiting using `express-rate-limit` is a safe, standard defense-in-depth measure that avoids breaking functionality, unlike adding `helmet` with default configurations, which was found to break the Vite frontend's HMR due to strict default Content Security Policies (CSP). Additionally, using `Math.random()` for non-cryptographic seeds (like image generation) isn't a true security vulnerability and shouldn't be "fixed" with crypto functions if it doesn't serve a real security purpose.
**Prevention:** Apply `express-rate-limit` to API routes. Be cautious with `helmet` when serving a Vite frontend from the same Express app, as specific CSP configurations are required. Only apply cryptographic randomness where security genuinely depends on unpredictability (like tokens or IDs).

## 2025-02-20 - Fixed reverse tabnabbing vulnerability
**Vulnerability:** When downloading files in `src/utils/downloadUtils.ts` via the fallback branch, `link.target = '_blank'` was used without `rel="noopener noreferrer"`. This allowed the newly opened tab to potentially have access to the original tab's `window` object via `window.opener`, opening it up to reverse tabnabbing vulnerabilities.
**Learning:** Always use `rel="noopener noreferrer"` when setting `target="_blank"`, especially when handling external or generated URLs that open in new tabs to prevent XSS via window objects.
**Prevention:** Always pair `target="_blank"` with `rel="noopener noreferrer"` when interacting with the DOM.
