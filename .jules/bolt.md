## 2024-05-24 - [Intl.DateTimeFormat Optimization]\n**Learning:** Re-instantiating date formatters inside loops or component render methods is a hidden performance bottleneck.\n**Action:** Use a memoized or module-level `Intl.DateTimeFormat` instance instead of repeated `toLocaleDateString()` calls.
## 2024-06-25 - [useReaderPlayback Refactoring]
**Learning:** Monolithic hooks managing numerous domain concerns (settings, preferences, playback, generation) are difficult to maintain and test.
**Action:** Extract domain-specific state logic into modular sub-hooks (e.g. `useAudioSettings`, `useVoicePreferences`) to improve maintainability and decouple side effects.
