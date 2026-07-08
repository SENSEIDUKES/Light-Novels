## 2024-05-24 - [Intl.DateTimeFormat Optimization]
**Learning:** Re-instantiating date formatters inside loops or component render methods is a hidden performance bottleneck.
**Action:** Use a memoized or module-level `Intl.DateTimeFormat` instance instead of repeated `toLocaleDateString()` calls.
## 2024-06-25 - [useReaderPlayback Refactoring]
**Learning:** Monolithic hooks managing numerous domain concerns (settings, preferences, playback, generation) are difficult to maintain and test.
**Action:** Extract domain-specific state logic into modular sub-hooks (e.g. `useAudioSettings`, `useVoicePreferences`) to improve maintainability and decouple side effects.## 2026-07-08 - [Form Field Extraction]\n**Learning:** Extracted reusable FormInput and FormTextarea fields from components like CoreSeedForm to improve reusability and maintainability.\n**Action:** Replaced repetitive textarea and input definitions in forms to keep components cleaner.
