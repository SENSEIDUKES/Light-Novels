## 2024-07-24 - Accessibility labels on Voice generation buttons

**Learning:** Icon-only buttons and state-toggling buttons (e.g., Play/Stop voice, generate actions) across components often lack `aria-label` attributes. When multiple characters are listed, their 'Play Voice' actions are indistinguishable for screen readers without a descriptive `aria-label` providing context (e.g., character name).

**Action:** Always ensure descriptive, context-aware `aria-label`s (e.g., including the entity's name) are included to help screen reader users distinguish between multiple similar actions on a page.

## 2026-07-31 - Focus States

**Learning:** Icon-only buttons often lack keyboard accessibility focus states. The theme-agnostic pattern for dynamically themed reader surfaces is `focus-visible:ring-2 focus-visible:ring-portal outline-none`.

**Action:** In future UX refinement tasks, actively check floating widget and header buttons for correct focus classes without hardcoding a ring-offset background color.
