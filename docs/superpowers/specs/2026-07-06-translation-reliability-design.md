# Translation Reliability Fix

## Problem

Chapter translation falls back from DeepL to the configured story model, but the client request does not forward the user's stored provider credentials or model-routing configuration. When no server-managed key exists, the endpoint returns an error. The reader stores that error in hook state without rendering it, making the failure appear to do nothing. In local development, the translation router also reads the DeepL key before `.env` is loaded.

## Design

The translation hook will use the existing `getApiHeaders` helper so translation requests carry the same user-configured credentials as other AI operations. It will accept the current routing configuration and include it in the request body. `ReaderChamber` will obtain that configuration from the application store and pass it to the hook.

The DeepL translator will be initialized lazily when a translation request is handled. This ensures `.env` has already been loaded in the development server while continuing to support environment variables injected by production platforms.

`translationError` will be passed to the reader viewport and displayed as an accessible error message after translation finishes. Existing English chapter content remains visible so a provider outage does not make the chapter unreadable.

## Error Handling

The server continues returning its existing JSON error response. The hook converts unsuccessful responses into `translationError`, and the reader presents that message without replacing or clearing the source chapter.

## Testing

Regression tests will verify that:

- stored credential headers and routing configuration are sent by the translation hook;
- server errors remain available through hook state;
- the reader viewport renders a translation error while preserving source content;
- DeepL initialization reads the environment at request time.

Existing translation, reader, type-checking, and build checks will be run after the focused tests pass.
