## 2025-03-09 - [Logging Custom Headers Data Exposure]
**Vulnerability:** pino-http logger exposed sensitive BYOK (Bring Your Own Key) credentials (e.g. x-gemini-key, x-openrouter-key, x-deepinfra-key) and authorization headers in plaintext.
**Learning:** Default pino-http logs all `req.headers`. In this application, API keys are passed dynamically from the client in specific headers. These custom headers bypass standard security filters since they are not just standard 'authorization' cookies or bearer tokens.
**Prevention:** Explicitly use pino's `redact` feature array to target and redact any custom sensitive headers that the application accepts.
## 2025-03-09 - [Insecure Math.random Fallback for UUIDs and IDs]
**Vulnerability:** Insecure `Math.random` fallback mechanism used to generate UUIDs and IDs (`src/lib/id.ts`) if `crypto.getRandomValues` was unavailable.
**Learning:** While cryptographically secure PRNGs are standard in Node and modern browsers, fallback mechanisms meant for legacy support can act as a security downgrade attack vector if an environment accidentally lacks the API or it gets mocked poorly.
**Prevention:** Explicitly enforce the availability of cryptographic PRNGs. Rather than providing an insecure `Math.random` fallback, the application should throw a hard error and fail securely if `crypto.getRandomValues` is not found.
