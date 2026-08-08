## 2024-07-24 - Accessibility labels on Voice generation buttons
**Learning:** Icon-only buttons and state-toggling buttons (e.g., Play/Stop voice, generate actions) across components often lack `aria-label` attributes. When multiple characters are listed, their 'Play Voice' actions are indistinguishable for screen readers without a descriptive `aria-label` providing context (e.g., character name).
**Action:** Always ensure descriptive, context-aware `aria-label`s (e.g., including the entity's name) are included to help screen reader users distinguish between multiple similar actions on a page.

## 2024-08-08 - Popover click-outside dismissal
**Learning:** The ImmersionSettings popover (and potentially others) lacked a standard click-outside dismissal handler, forcing users to explicitly toggle the button again to close it.
**Action:** Standardize on implementing a click-outside dismissal handler using useRef for the container and a useEffect document event listener (mousedown and touchstart) on custom dropdowns and popovers.
