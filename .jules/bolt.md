## 2024-05-24 - [Intl.DateTimeFormat Optimization]
**Learning:** Re-instantiating date formatters inside loops or component render methods is a hidden performance bottleneck.
**Action:** Use a memoized or module-level `Intl.DateTimeFormat` instance instead of repeated `toLocaleDateString()` calls.

## 2024-06-25 - [useReaderPlayback Refactoring]
**Learning:** Monolithic hooks managing numerous domain concerns (settings, preferences, playback, generation) are difficult to maintain and test.
**Action:** Extract domain-specific state logic into modular sub-hooks (e.g. `useAudioSettings`, `useVoicePreferences`) to improve maintainability and decouple side effects.

## 2026-07-08 - [Form Field Extraction]
**Learning:** Extracted reusable FormInput and FormTextarea fields from components like CoreSeedForm to improve reusability and maintainability.
**Action:** Replaced repetitive textarea and input definitions in forms to keep components cleaner.

## 2026-07-08 - [AkashaRecord Refactoring]
**Learning:** Monolithic components like `AkashaRecord.tsx` with complex internal conditional rendering logic can be cleanly refactored into smaller, dedicated panel components (e.g., `RealmPanel`, `CharactersPanel`).
**Action:** Extract specific tab functionality into separate child components to improve code readability, maintainability, and ease of future updates, while keeping high-level shared logic (like delete confirmations) in the parent container.

## 2026-07-08 - [LivingCodexCharacters Refactoring]
**Learning:** Monolithic components like `LivingCodexCharacters` can be effectively refactored into modular components.
**Action:** Extracted `CharacterCard`, `CharacterEditCard`, `LocationCard`, `CharacterProfile`, and `LocationProfile` to cleanly encapsulate logic.
