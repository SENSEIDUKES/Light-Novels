## 2025-03-09 - [Logging Custom Headers Data Exposure]
**Vulnerability:** pino-http logger exposed sensitive BYOK (Bring Your Own Key) credentials (e.g. x-gemini-key, x-openrouter-key, x-deepinfra-key) and authorization headers in plaintext.
**Learning:** Default pino-http logs all `req.headers`. In this application, API keys are passed dynamically from the client in specific headers. These custom headers bypass standard security filters since they are not just standard 'authorization' cookies or bearer tokens.
**Prevention:** Explicitly use pino's `redact` feature array to target and redact any custom sensitive headers that the application accepts.
