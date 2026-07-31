# Sentinel Learnings

*   **Centralized Logging:** Replaced raw `console.error`, `console.warn`, and `console.log` calls in backend modules (e.g., `src/aiRouter.ts`) with a structured Pino logger (`src/server/logger.ts`).
*   **Error Object Sanitization:** When logging errors with Pino, pass the error under Pino's standard `err` key (for example, `logger.error({ err: error }, "msg")`). This activates Pino's built-in error serializer so message and stack details are preserved while configured redaction rules continue to protect authorization headers and custom API keys.
*   **Test Mocking:** When refactoring from global `console` to an imported `logger`, ensure all test suites that previously spied on or mocked `console.warn` or `console.error` are updated to mock the new logger module (e.g., `vi.spyOn(logger, 'warn')`).
