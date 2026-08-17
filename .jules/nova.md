## 2024-07-24 - Accessibility labels on Voice generation buttons
**Learning:** Icon-only buttons and state-toggling buttons (e.g., Play/Stop voice, generate actions) across components often lack `aria-label` attributes. When multiple characters are listed, their 'Play Voice' actions are indistinguishable for screen readers without a descriptive `aria-label` providing context (e.g., character name).
**Action:** Always ensure descriptive, context-aware `aria-label`s (e.g., including the entity's name) are included to help screen reader users distinguish between multiple similar actions on a page.

## 2024-08-09 - Support touch events for click-outside handlers
**Learning:** Custom popovers and dropdown menus typically use a `mousedown` listener to detect clicks outside the element. However, relying solely on `mousedown` can cause issues on mobile devices where tap events aren't consistently translated to `mousedown` before the default touch behavior triggers.
**Action:** Always include `touchstart` alongside `mousedown` (with corresponding cleanup in `useEffect`) when implementing click-outside dismissal handlers to ensure reliable interaction on mobile touch screens.
## 2026-08-17 - Missing Keyboard Submit in Confirmation Modals
**Learning:** Text-input confirmation dialogs for destructive actions (like 'DELETE' inputs) must include an `onKeyDown` handler to explicitly check for the 'Enter' key and trigger submission. Without it, these critical dialogs become inaccessible and fail to respond to standard keyboard submission patterns expected by users.
**Action:** Always verify that confirmation `<input>` elements are wired to submit the action via the Enter key in addition to providing a clickable 'Confirm' button.
