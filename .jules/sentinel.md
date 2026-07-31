# Sentinel Learnings

*   **Centralized Logging:** Replaced raw `console.error`, `console.warn`, and `console.log` calls in backend modules (e.g., `src/aiRouter.ts`) with a structured Pino logger (`src/server/logger.ts`).
*   **Error Object Sanitization:** When logging errors with Pino, it's crucial to pass the error object within a structured payload (e.g., `logger.error({ error }, "msg")`). This allows Pino's configured serializers and redact rules (such as stripping standard authorization or custom API key headers) to function correctly and prevent sensitive data leakage.
*   **Test Mocking:** When refactoring from global `console` to an imported `logger`, ensure all test suites that previously spied on or mocked `console.warn` or `console.error` are updated to mock the new logger module (e.g., `vi.spyOn(logger, 'warn')`).
