## 2025-03-09 - [Logging Custom Headers Data Exposure]
**Vulnerability:** pino-http logger exposed sensitive BYOK (Bring Your Own Key) credentials (e.g. x-gemini-key, x-openrouter-key, x-deepinfra-key) and authorization headers in plaintext.
**Learning:** Default pino-http logs all `req.headers`. In this application, API keys are passed dynamically from the client in specific headers. These custom headers bypass standard security filters since they are not just standard 'authorization' cookies or bearer tokens.
**Prevention:** Explicitly use pino's `redact` feature array to target and redact any custom sensitive headers that the application accepts.
## 2025-03-09 - [Insecure Math.random Fallback for UUIDs and IDs]
**Vulnerability:** Insecure `Math.random` fallback mechanism used to generate UUIDs and IDs (`src/lib/id.ts`) if `crypto.getRandomValues` was unavailable.
**Learning:** While cryptographically secure PRNGs are standard in Node and modern browsers, fallback mechanisms meant for legacy support can act as a security downgrade attack vector if an environment accidentally lacks the API or it gets mocked poorly.
**Prevention:** Explicitly enforce the availability of cryptographic PRNGs. Rather than providing an insecure `Math.random` fallback, the application should throw a hard error and fail securely if `crypto.getRandomValues` is not found.
## 2026-07-12 - [XSS via Insecure URL in Download Fallback]
**Vulnerability:** The `handleDownload` function in `src/utils/downloadUtils.ts` lacked URL protocol validation. If a malicious URL (like `javascript:alert(1)`) was passed and the CORS `fetch` failed, it would fall back to creating an anchor tag with the malicious URL and clicking it, resulting in XSS.
**Learning:** Functions that accept URLs and use them in DOM elements (like `<a>` tags) or `fetch` calls must validate the protocol to prevent script execution. This is a common pattern in fallback mechanisms.
**Prevention:** Always parse untrusted URLs using `new URL(url)` and validate that the `.protocol` is strictly in an allowed list (e.g., `http:`, `https:`, `blob:`, `data:`) before usage.
## 2024-11-20 - [Fix weak RNG in sync revision generation]
**Vulnerability:** Found `Math.random().toString(36)` being used as a fallback for generating synchronization revisions (`syncRevision`) across local and firebase storage managers when `crypto.randomUUID` was unavailable.
**Learning:** `Math.random()` should never be used for generating sensitive/unique IDs even as a fallback, as it is predictable and can lead to collision vulnerabilities or state tracking issues during cloud synchronization.
**Prevention:** Always rely on a central, secure utility like `generateUUID` in `src/lib/id.ts` that enforces Cryptographically Secure Pseudo-Random Number Generators (CSPRNG) via `crypto.randomUUID` or `crypto.getRandomValues`, and fails safely if they are completely unavailable.
